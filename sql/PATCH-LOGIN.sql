-- ============================================================
-- SIMBAKES — PATCH LOGIN CEPAT v2 (perbaiki "gagal login")
-- ============================================================
-- MASALAH: frontend baru memanggil RPC app_login / app_peserta_login,
--          tetapi fungsi itu belum ada di Supabase (HTTP 404), sehingga
--          login admin maupun peserta gagal. Bila fungsi sudah ada tapi
--          masih gagal, versi ini juga MEMBUAT RPC KEBAL SKEMA:
--          kolom opsional yang tidak ada tidak lagi memicu error —
--          profil tetap dibangun (field kosong -> null).
--
-- File ini VERSI MINIMAL dari SECURITY-HARDENING.sql:
--   - HANYA membuat tabel sesi + 4 fungsi RPC login/validasi/logout
--   - ADITIF: tidak mengubah tabel lama, tidak mengunci apa pun,
--     tidak mengubah RLS tabel aplikasi -> nol risiko fitur lain
--   - IDEMPOTENT: aman dijalankan berulang
--
-- CARA PAKAI:
--   Supabase Dashboard -> SQL Editor -> New query
--   -> Paste SELURUH isi file ini -> Run
--   -> Di akhir harus muncul tabel berisi 4 fungsi (verifikasi).
--
-- Setelah login normal kembali, jalankan SECURITY-HARDENING.sql
-- (versi lengkap: RLS, kolom grants, trigger, RPC admin) untuk
-- hardening penuh — file itu juga idempotent.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1) TABEL SESI SERVER-SIDE
-- ============================================================
create table if not exists public.app_sessions (
    id           uuid primary key default gen_random_uuid(),
    token_hash   text unique not null,          -- sha256(token); token asli TIDAK disimpan
    user_type    text not null check (user_type in ('admin','peserta')),
    user_id      text,
    username     text not null,
    role         text not null default 'user',
    created_at   timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    expires_at   timestamptz not null,
    revoked      boolean not null default false,
    user_agent   text
);

create index if not exists app_sessions_token_hash_idx on public.app_sessions (token_hash);
create index if not exists app_sessions_expires_idx    on public.app_sessions (expires_at);

alter table public.app_sessions enable row level security;
-- (tanpa policy = default deny untuk anon/authenticated; akses hanya
--  lewat fungsi SECURITY DEFINER di bawah)

-- Kolom pendukung (aditif, aman bila sudah ada)
alter table public.multiusers   add column if not exists login_attempts int not null default 0;
alter table public.multiusers   add column if not exists locked_until   timestamptz;
alter table public.akun_peserta add column if not exists login_attempts int not null default 0;
alter table public.akun_peserta add column if not exists locked_until   timestamptz;
alter table public.akun_peserta add column if not exists password_hash  text;
alter table public.akun_peserta add column if not exists last_login_at  timestamptz;

-- ============================================================
-- 2) RPC LOGIN ADMIN (multiusers) — KEBAL SKEMA
--    Verifikasi bcrypt -> SHA-256 -> plaintext (auto-upgrade bcrypt)
-- ============================================================
create or replace function public.app_login(p_username text, p_password text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
    v_user     record;
    v_rec      jsonb;
    v_hash     text;
    v_role     text;
    v_ok       boolean := false;
    v_token    text;
    v_expires  timestamptz;
begin
    if p_username is null or p_password is null
       or length(trim(p_username)) = 0 or length(p_password) = 0 then
        raise exception 'Username dan password wajib diisi';
    end if;

    select * into v_user
    from public.multiusers
    where lower(username) = lower(trim(p_username))
    limit 1;

    if v_user.id is null then
        -- Coba lagi via email HANYA bila kolom email ada
        if exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name='multiusers' and column_name='email') then
            select * into v_user
            from public.multiusers
            where lower(email) = lower(trim(p_username))
            limit 1;
        end if;
    end if;

    if v_user.id is not null then
        v_rec := to_jsonb(v_user);

        -- Akun nonaktif (kolom opsional: absen = dianggap aktif)
        if coalesce(v_rec->>'is_active', 'true') = 'false' then
            raise exception 'Akun Anda telah dinonaktifkan. Hubungi administrator.';
        end if;

        -- Terkunci sementara?
        if v_rec->>'locked_until' is not null
           and (v_rec->>'locked_until')::timestamptz > now() then
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;
        if coalesce((v_rec->>'login_attempts')::int, 0) >= 5 then
            update public.multiusers
               set locked_until = now() + interval '15 minutes'
             where id::text = v_rec->>'id';
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;

        -- Suspended (kolom opsional)
        if v_rec->>'status' = 'Suspended' then
            if v_rec->>'suspended_until' is null
               or (v_rec->>'suspended_until')::timestamptz > now() then
                raise exception 'Akun Anda sedang diblokir. Hubungi administrator.';
            end if;
        end if;

        -- ---- Verifikasi password (multi-skema, upgrade ke bcrypt) ----
        v_hash := v_rec->>'password_hash';
        if v_hash is not null then
            if v_hash like '$2%' then
                v_ok := crypt(p_password, v_hash) = v_hash;
            elsif length(v_hash) = 64 and v_hash ~ '^[a-f0-9]{64}$' then
                v_ok := encode(digest(p_password, 'sha256'), 'hex') = lower(v_hash);
            else
                v_ok := p_password = v_hash;   -- legacy plaintext
            end if;
        end if;

        if v_ok then
            -- Upgrade ke bcrypt bila masih skema lama
            if v_hash is null or v_hash not like '$2%' then
                update public.multiusers
                   set password_hash = crypt(p_password, gen_salt('bf', 10))
                 where id::text = v_rec->>'id';
            end if;

            update public.multiusers
               set login_attempts = 0,
                   locked_until   = null
             where id::text = v_rec->>'id';

            -- last_login hanya bila kolomnya ada (opsional)
            if exists (select 1 from information_schema.columns
                       where table_schema='public' and table_name='multiusers' and column_name='last_login') then
                update public.multiusers set last_login = now() where id::text = v_rec->>'id';
            end if;
        else
            update public.multiusers
               set login_attempts = coalesce(login_attempts, 0) + 1,
                   locked_until   = case when coalesce(login_attempts, 0) + 1 >= 5
                                         then now() + interval '15 minutes' else locked_until end
             where id::text = v_rec->>'id';
            raise exception 'Username atau password salah';
        end if;
    else
        raise exception 'Username atau password salah';
    end if;

    -- Normalisasi role (map legacy -> standar; kolom opsional)
    v_role := lower(coalesce(v_rec->>'role', 'viewer'));
    if v_role in ('administrator','super_admin','super-admin','admin') then
        v_role := 'superadmin';
    elsif v_role in ('op','data_entry') then
        v_role := 'operator';
    elsif v_role in ('read_only','read-only','user') then
        v_role := 'viewer';
    end if;

    -- Buat sesi server-side
    v_token   := encode(gen_random_bytes(32), 'hex');
    v_expires := now() + interval '15 minutes';

    insert into public.app_sessions (token_hash, user_type, user_id, username, role, expires_at, user_agent)
    values (
        encode(digest(v_token, 'sha256'), 'hex'),
        'admin',
        v_rec->>'id',
        v_rec->>'username',
        v_role,
        v_expires,
        nullif(current_setting('request.headers', true)::json ->> 'user-agent', '')
    );

    return jsonb_build_object(
        'token',      v_token,
        'expires_at', v_expires,
        'profile', jsonb_build_object(
            'id',        v_rec->>'id',
            'username',  v_rec->>'username',
            'email',     v_rec->>'email',
            'name',      coalesce(nullif(v_rec->>'nama_lengkap', ''), v_rec->>'username'),
            'role',      v_role,
            'institusi', coalesce(v_rec->>'institusi', ''),
            'user_type', 'admin'
        )
    );
end;
$$;

-- ============================================================
-- 3) RPC LOGIN PESERTA (akun_peserta) — KEBAL SKEMA
-- ============================================================
create or replace function public.app_peserta_login(p_username text, p_password text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
    v_user    record;
    v_rec     jsonb;
    v_hash    text;
    v_ok      boolean := false;
    v_token   text;
    v_expires timestamptz;
begin
    if p_username is null or p_password is null
       or length(trim(p_username)) = 0 or length(p_password) = 0 then
        raise exception 'Username dan password wajib diisi';
    end if;

    select * into v_user
    from public.akun_peserta
    where lower(username) = lower(trim(p_username))
    limit 1;

    if v_user.id is null then
        -- Coba lagi via email HANYA bila kolom email ada
        if exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name='akun_peserta' and column_name='email') then
            select * into v_user
            from public.akun_peserta
            where lower(email) = lower(trim(p_username))
            limit 1;
        end if;
    end if;

    if v_user.id is not null then
        v_rec := to_jsonb(v_user);

        -- Terkunci sementara?
        if v_rec->>'locked_until' is not null
           and (v_rec->>'locked_until')::timestamptz > now() then
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;
        if coalesce((v_rec->>'login_attempts')::int, 0) >= 5 then
            update public.akun_peserta
               set locked_until = now() + interval '15 minutes'
             where id::text = v_rec->>'id';
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;

        -- Status akun (kolom opsional: absen = dianggap approved)
        if v_rec->>'status' = 'pending' then
            raise exception 'Akun Anda masih MENUNGGU PERSETUJUAN admin. Silakan tunggu 1-2 hari kerja.';
        elsif v_rec->>'status' = 'rejected' then
            raise exception 'Akun Anda DITOLAK. Hubungi admin.';
        elsif v_rec->>'status' = 'suspended' then
            raise exception 'Akun Anda DITANGGUHKAN. Hubungi admin.';
        elsif v_rec->>'status' is not null
              and v_rec->>'status' <> '' and v_rec->>'status' <> 'approved' then
            raise exception 'Akun Anda belum aktif. Hubungi admin.';
        end if;

        -- ---- Verifikasi password (bcrypt -> plaintext, auto-upgrade) ----
        v_hash := v_rec->>'password_hash';
        if v_hash is not null then
            if v_hash like '$2%' then
                v_ok := crypt(p_password, v_hash) = v_hash;
            else
                v_ok := p_password = v_hash;   -- legacy
            end if;
        elsif v_rec->>'password' is not null then
            v_ok := p_password = (v_rec->>'password');   -- kolom lama (akan dipensiunkan)
        end if;

        if v_ok then
            -- Upgrade: isi password_hash bcrypt & kosongkan plaintext lama
            if coalesce(v_hash, '') not like '$2%' then
                if exists (select 1 from information_schema.columns
                           where table_schema='public' and table_name='akun_peserta' and column_name='password') then
                    update public.akun_peserta
                       set password_hash = crypt(p_password, gen_salt('bf', 10)),
                           password      = null
                     where id::text = v_rec->>'id';
                else
                    update public.akun_peserta
                       set password_hash = crypt(p_password, gen_salt('bf', 10))
                     where id::text = v_rec->>'id';
                end if;
            end if;

            update public.akun_peserta
               set login_attempts = 0,
                   locked_until   = null,
                   last_login_at  = now()
             where id::text = v_rec->>'id';
        else
            update public.akun_peserta
               set login_attempts = coalesce(login_attempts, 0) + 1,
                   locked_until   = case when coalesce(login_attempts, 0) + 1 >= 5
                                         then now() + interval '15 minutes' else locked_until end
             where id::text = v_rec->>'id';
            raise exception 'Username atau password salah';
        end if;
    else
        raise exception 'Username atau password salah';
    end if;

    v_token   := encode(gen_random_bytes(32), 'hex');
    v_expires := now() + interval '15 minutes';

    insert into public.app_sessions (token_hash, user_type, user_id, username, role, expires_at, user_agent)
    values (
        encode(digest(v_token, 'sha256'), 'hex'),
        'peserta',
        v_rec->>'id',
        v_rec->>'username',
        'peserta',
        v_expires,
        nullif(current_setting('request.headers', true)::json ->> 'user-agent', '')
    );

    return jsonb_build_object(
        'token',      v_token,
        'expires_at', v_expires,
        'profile', jsonb_build_object(
            'id',       v_rec->>'id',
            'nama',     coalesce(nullif(v_rec->>'nama', ''), v_rec->>'username'),
            'nik',      v_rec->>'nik',
            'email',    v_rec->>'email',
            'username', v_rec->>'username',
            'status',   v_rec->>'status',
            'user_type','peserta'
        )
    );
end;
$$;

-- ============================================================
-- 4) RPC VALIDASI SESI (sliding idle 15 menit) & LOGOUT (revoke)
-- ============================================================
create or replace function public.app_validate_session(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
    v_session public.app_sessions%rowtype;
    v_profile record;
    v_rec     jsonb;
begin
    if p_token is null or length(p_token) < 32 then
        return null;
    end if;

    select * into v_session
    from public.app_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and revoked = false
      and expires_at > now()
    limit 1;

    if not found then
        return null;   -- sesi tidak valid / sudah kedaluwarsa
    end if;

    -- Sliding expiry (idle 15 menit; absolut 12 jam)
    update public.app_sessions
       set last_seen_at = now(),
           expires_at   = least(now() + interval '15 minutes', v_session.created_at + interval '12 hours')
     where id = v_session.id;

    if v_session.user_type = 'admin' then
        select * into v_profile
        from public.multiusers where id::text = v_session.user_id;
        v_rec := to_jsonb(v_profile);
        -- Jika akun dinonaktifkan setelah login -> sesi batal
        if v_rec->>'is_active' = 'false' then
            update public.app_sessions set revoked = true where id = v_session.id;
            return null;
        end if;
        return jsonb_build_object(
            'valid', true,
            'user_type', 'admin',
            'role', v_session.role,
            'expires_at', v_session.expires_at,
            'profile', jsonb_build_object(
                'id',       v_rec->>'id',
                'username', v_rec->>'username',
                'email',    v_rec->>'email',
                'name',     coalesce(nullif(v_rec->>'nama_lengkap', ''), v_rec->>'username'),
                'role',     v_session.role,
                'institusi',coalesce(v_rec->>'institusi', '')
            )
        );
    else
        select * into v_profile
        from public.akun_peserta where id::text = v_session.user_id;
        v_rec := to_jsonb(v_profile);
        if coalesce(v_rec->>'status', 'approved') not in ('approved') then
            update public.app_sessions set revoked = true where id = v_session.id;
            return null;
        end if;
        return jsonb_build_object(
            'valid', true,
            'user_type', 'peserta',
            'role', 'peserta',
            'expires_at', v_session.expires_at,
            'profile', jsonb_build_object(
                'id',       v_rec->>'id',
                'nama',     coalesce(nullif(v_rec->>'nama', ''), v_rec->>'username'),
                'nik',      v_rec->>'nik',
                'email',    v_rec->>'email',
                'username', v_rec->>'username',
                'status',   v_rec->>'status'
            )
        );
    end if;
end;
$$;

create or replace function public.app_logout(p_token text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
    update public.app_sessions set revoked = true
    where token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex')
      and revoked = false;
    return true;
end;
$$;

-- ============================================================
-- 5) IZIN EKSEKUSI (wajib — tanpa ini PostgREST balas 404)
-- ============================================================
grant execute on function public.app_login(text, text)         to anon, authenticated;
grant execute on function public.app_peserta_login(text, text) to anon, authenticated;
grant execute on function public.app_validate_session(text)    to anon, authenticated;
grant execute on function public.app_logout(text)              to anon, authenticated;

-- ============================================================
-- 6) VERIFIKASI — harus muncul 4 baris di bawah ini
-- ============================================================
select p.proname as fungsi_rpc,
       pg_get_function_identity_arguments(p.oid) as parameter,
       has_function_privilege('anon', p.oid, 'execute') as anon_boleh_eksekusi
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('app_login','app_peserta_login','app_validate_session','app_logout')
order by 1;
