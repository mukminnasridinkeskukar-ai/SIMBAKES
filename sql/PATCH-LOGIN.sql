-- ============================================================
-- SIMBAKES — PATCH LOGIN CEPAT (perbaiki "gagal login")
-- ============================================================
-- MASALAH: frontend baru memanggil RPC app_login / app_peserta_login,
--          tetapi fungsi itu belum ada di Supabase (HTTP 404), sehingga
--          login admin maupun peserta gagal.
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
-- 2) RPC LOGIN ADMIN (multiusers)
--    Verifikasi bcrypt -> SHA-256 -> plaintext (auto-upgrade bcrypt)
-- ============================================================
create or replace function public.app_login(p_username text, p_password text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
    v_user     record;
    v_ok       boolean := false;
    v_token    text;
    v_expires  timestamptz;
    v_name     text;
begin
    if p_username is null or p_password is null
       or length(trim(p_username)) = 0 or length(p_password) = 0 then
        raise exception 'Username dan password wajib diisi';
    end if;

    select * into v_user
    from public.multiusers
    where lower(username) = lower(trim(p_username))
       or lower(email)    = lower(trim(p_username))
    limit 1;

    if found then
        if v_user.is_active = false then
            raise exception 'Akun Anda telah dinonaktifkan. Hubungi administrator.';
        end if;

        if v_user.locked_until is not null and v_user.locked_until > now() then
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;
        if coalesce(v_user.login_attempts, 0) >= 5 then
            update public.multiusers set locked_until = now() + interval '15 minutes' where id = v_user.id;
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;

        if v_user.status = 'Suspended' then
            if v_user.suspended_until is null or v_user.suspended_until > now() then
                raise exception 'Akun Anda sedang diblokir. Hubungi administrator.';
            end if;
        end if;

        -- ---- Verifikasi password (multi-skema, upgrade ke bcrypt) ----
        if v_user.password_hash is not null then
            if v_user.password_hash like '$2%' then
                v_ok := crypt(p_password, v_user.password_hash) = v_user.password_hash;
            elsif length(v_user.password_hash) = 64 and v_user.password_hash ~ '^[a-f0-9]{64}$' then
                v_ok := encode(digest(p_password, 'sha256'), 'hex') = lower(v_user.password_hash);
            else
                v_ok := p_password = v_user.password_hash;   -- legacy plaintext
            end if;
        end if;

        if v_ok then
            if v_user.password_hash is null or v_user.password_hash not like '$2%' then
                update public.multiusers
                   set password_hash = crypt(p_password, gen_salt('bf', 10))
                 where id = v_user.id;
            end if;

            update public.multiusers
               set login_attempts = 0,
                   locked_until   = null,
                   last_login     = now(),
                   updated_at     = now()
             where id = v_user.id;
        else
            update public.multiusers
               set login_attempts = coalesce(login_attempts,0) + 1,
                   locked_until   = case when coalesce(login_attempts,0) + 1 >= 5
                                         then now() + interval '15 minutes' else locked_until end,
                   updated_at     = now()
             where id = v_user.id;
            raise exception 'Username atau password salah';
        end if;
    else
        raise exception 'Username atau password salah';
    end if;

    -- Normalisasi role (map legacy -> standar)
    v_name := coalesce(v_user.nama_lengkap, v_user.username);
    if v_user.role in ('administrator','super_admin','super-admin','admin') then
        v_user.role := 'superadmin';
    elsif v_user.role in ('op','data_entry') then
        v_user.role := 'operator';
    elsif v_user.role in ('read_only','read-only','user') then
        v_user.role := 'viewer';
    end if;
    v_user.role := lower(coalesce(v_user.role, 'viewer'));

    -- Buat sesi server-side
    v_token   := encode(gen_random_bytes(32), 'hex');
    v_expires := now() + interval '15 minutes';

    insert into public.app_sessions (token_hash, user_type, user_id, username, role, expires_at, user_agent)
    values (
        encode(digest(v_token, 'sha256'), 'hex'),
        'admin',
        v_user.id::text,
        v_user.username,
        v_user.role,
        v_expires,
        nullif(current_setting('request.headers', true)::json ->> 'user-agent', '')
    );

    return jsonb_build_object(
        'token',      v_token,
        'expires_at', v_expires,
        'profile', jsonb_build_object(
            'id',        v_user.id,
            'username',  v_user.username,
            'email',     v_user.email,
            'name',      v_name,
            'role',      v_user.role,
            'institusi', v_user.institusi,
            'user_type', 'admin'
        )
    );
end;
$$;

-- ============================================================
-- 3) RPC LOGIN PESERTA (akun_peserta)
-- ============================================================
create or replace function public.app_peserta_login(p_username text, p_password text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
    v_user    record;
    v_ok      boolean := false;
    v_token   text;
    v_expires timestamptz;
begin
    if p_username is null or p_password is null
       or length(trim(p_username)) = 0 or length(p_password) = 0 then
        raise exception 'Username dan password wajib diisi';
    end if;

    select id, username, password, password_hash, nik, email, nama,
           status, locked_until, login_attempts
    into v_user
    from public.akun_peserta
    where lower(username) = lower(trim(p_username))
       or lower(email)    = lower(trim(p_username))
    limit 1;

    if found then
        if v_user.locked_until is not null and v_user.locked_until > now() then
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;
        if coalesce(v_user.login_attempts, 0) >= 5 then
            update public.akun_peserta set locked_until = now() + interval '15 minutes' where id = v_user.id;
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;

        if v_user.status = 'pending' then
            raise exception 'Akun Anda masih MENUNGGU PERSETUJUAN admin. Silakan tunggu 1-2 hari kerja.';
        elsif v_user.status = 'rejected' then
            raise exception 'Akun Anda DITOLAK. Hubungi admin.';
        elsif v_user.status = 'suspended' then
            raise exception 'Akun Anda DITANGGUHKAN. Hubungi admin.';
        elsif v_user.status is not null and v_user.status <> 'approved' then
            raise exception 'Akun Anda belum aktif. Hubungi admin.';
        end if;

        -- ---- Verifikasi password (bcrypt -> plaintext, auto-upgrade) ----
        if v_user.password_hash is not null then
            if v_user.password_hash like '$2%' then
                v_ok := crypt(p_password, v_user.password_hash) = v_user.password_hash;
            else
                v_ok := p_password = v_user.password_hash;   -- legacy
            end if;
        elsif v_user.password is not null then
            v_ok := p_password = v_user.password;            -- kolom lama (akan dipensiunkan)
        end if;

        if v_ok then
            if coalesce(v_user.password_hash, '') not like '$2%' then
                update public.akun_peserta
                   set password_hash = crypt(p_password, gen_salt('bf', 10)),
                       password      = null
                 where id = v_user.id;
            end if;

            update public.akun_peserta
               set login_attempts = 0,
                   locked_until   = null,
                   last_login_at  = now()
             where id = v_user.id;
        else
            update public.akun_peserta
               set login_attempts = coalesce(login_attempts,0) + 1,
                   locked_until   = case when coalesce(login_attempts,0) + 1 >= 5
                                         then now() + interval '15 minutes' else locked_until end
             where id = v_user.id;
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
        v_user.id::text,
        v_user.username,
        'peserta',
        v_expires,
        nullif(current_setting('request.headers', true)::json ->> 'user-agent', '')
    );

    return jsonb_build_object(
        'token',      v_token,
        'expires_at', v_expires,
        'profile', jsonb_build_object(
            'id',       v_user.id,
            'nama',     coalesce(nullif(v_user.nama, ''), v_user.username),
            'nik',      v_user.nik,
            'email',    v_user.email,
            'username', v_user.username,
            'status',   v_user.status,
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
        select id, username, email, nama_lengkap, institusi, is_active
        into v_profile
        from public.multiusers where id::text = v_session.user_id;
        if found and v_profile.is_active = false then
            update public.app_sessions set revoked = true where id = v_session.id;
            return null;
        end if;
        return jsonb_build_object(
            'valid', true,
            'user_type', 'admin',
            'role', v_session.role,
            'expires_at', v_session.expires_at,
            'profile', jsonb_build_object(
                'id',       v_profile.id,
                'username', v_profile.username,
                'email',    v_profile.email,
                'name',     coalesce(v_profile.nama_lengkap, v_profile.username),
                'role',     v_session.role,
                'institusi',v_profile.institusi
            )
        );
    else
        select id, username, nik, email, nama, status
        into v_profile
        from public.akun_peserta where id::text = v_session.user_id;
        if found and v_profile.status <> 'approved' then
            update public.app_sessions set revoked = true where id = v_session.id;
            return null;
        end if;
        return jsonb_build_object(
            'valid', true,
            'user_type', 'peserta',
            'role', 'peserta',
            'expires_at', v_session.expires_at,
            'profile', jsonb_build_object(
                'id',       v_profile.id,
                'nama',     coalesce(nullif(v_profile.nama, ''), v_profile.username),
                'nik',      v_profile.nik,
                'email',    v_profile.email,
                'username', v_profile.username,
                'status',   v_profile.status
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
       pg_get_function_identity_arguments(p.oid) as parameter
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('app_login','app_peserta_login','app_validate_session','app_logout')
order by 1;
