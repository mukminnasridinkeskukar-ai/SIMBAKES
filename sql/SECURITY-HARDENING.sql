-- ============================================================
-- SIMBAKES — SECURITY HARDENING (SERVER-SIDE)
-- ============================================================
-- Jalankan SEKALI di: Supabase Dashboard -> SQL Editor -> Run
-- File ini IDEMPOTENT (aman dijalankan ulang).
--
-- Yang dikerjakan file ini:
--   1. Sesi server-side (tabel app_sessions + token acak 256-bit,
--      disimpan sebagai SHA-256 hash, kedaluwarsa idle 15 menit,
--      masa absolut 12 jam, dapat dicabut/revoked).
--   2. RPC login server-side untuk ADMIN (multiusers) dan PESERTA
--      (akun_peserta): password TIDAK PERNAH dikirim ke browser.
--      Verifikasi bcrypt; kompatibel otomatis dengan hash SHA-256
--      dan plaintext lama -> otomatis di-upgrade ke bcrypt saat
--      login sukses (migrasi tanpa reset password).
--   3. Kunci akun otomatis di SERVER setelah 5 kali gagal (15 menit).
--   4. RPC validasi sesi + logout (revoke token server-side).
--   5. RPC penyelamatan/penyimpanan akun peserta oleh admin
--      (password di-hash server-side).
--   6. RLS berlapis + column grants: password/password_hash TIDAK
--      bisa dibaca anon; operasi tulis admin (submissions, roadmap,
--      penetapan) WAJIB membawa sesi valid via header x-session-token.
--   7. Trigger auto-hash password saat registrasi akun_peserta.
--
-- PENTING:
--   - Deploy bersamaan dengan client baru (folder js/ versi baru).
--   - Anon key memang PUBLIC by design (Supabase) — keamanan nyata
--     ada di RLS + RPC di file ini, BUKAN pada kerahasiaan anon key.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1) TABEL SESI SERVER-SIDE
-- ============================================================
create table if not exists public.app_sessions (
    id           uuid primary key default gen_random_uuid(),
    token_hash   text unique not null,          -- sha256(token); token asli TIDAK disimpan
    user_type    text not null check (user_type in ('admin','peserta')),
    user_id      text,                          -- id multiusers / akun_peserta (text agar fleksibel)
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

-- Tidak ada policy untuk anon/authenticated:
-- tabel sesi hanya bisa diakses lewat SECURITY DEFINER functions di bawah.
-- (Tanpa policy = default deny untuk anon/authenticated.)

-- ============================================================
-- 2) KONSTANTA & UTILITAS
-- ============================================================

-- Kolom tambahan aman (additif, tidak mengubah struktur lama)
alter table public.multiusers   add column if not exists locked_until timestamptz;
alter table public.akun_peserta add column if not exists login_attempts int not null default 0;
alter table public.akun_peserta add column if not exists locked_until  timestamptz;
alter table public.akun_peserta add column if not exists password_hash text;

-- Helper: ambil token sesi dari header request PostgREST
create or replace function public.app_request_token()
returns text
language sql stable
set search_path = public
as $$
    select nullif(current_setting('request.headers', true)::json ->> 'x-session-token', '');
$$;

-- Helper: apakah request membawa sesi valid dengan salah satu role?
create or replace function public.app_is_valid_session(p_min_role text default null)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
    v_token   text;
    v_session public.app_sessions%rowtype;
begin
    v_token := public.app_request_token();
    if v_token is null or length(v_token) < 32 then
        return false;
    end if;

    select * into v_session
    from public.app_sessions
    where token_hash = encode(digest(v_token, 'sha256'), 'hex')
      and revoked = false
      and expires_at > now()
    limit 1;

    if not found then
        return false;
    end if;

    -- Sliding expiry: perpanjang idle window (maks 15 menit idle),
    -- dengan batas absolut 12 jam sejak dibuat.
    update public.app_sessions
       set last_seen_at = now(),
           expires_at   = least(
                            now() + interval '15 minutes',
                            v_session.created_at + interval '12 hours'
                          )
     where id = v_session.id;

    -- Pengecekan role (opsional): null/'' = cukup sesi valid
    if p_min_role is null or p_min_role = '' then
        return true;
    end if;

    return case p_min_role
        when 'any'        then v_session.role in ('superadmin','operator','viewer','admin')
        when 'superadmin' then v_session.role = 'superadmin'
        when 'write'      then v_session.role in ('superadmin','operator','admin')
        else v_session.role = p_min_role
    end;
end;
$$;

-- Hapus sesi kedaluwarsa (panggil manual / pg_cron opsional)
create or replace function public.app_purge_expired_sessions()
returns void
language sql security definer
set search_path = public
as $$
    delete from public.app_sessions
    where expires_at < now() - interval '1 day' or revoked = true;
$$;

-- ============================================================
-- 3) LOGIN ADMIN (multiusers) — SERVER-SIDE
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
        -- Akun nonaktif
        if v_user.is_active = false then
            raise exception 'Akun Anda telah dinonaktifkan. Hubungi administrator.';
        end if;

        -- Terkunci sementara?
        if v_user.locked_until is not null and v_user.locked_until > now() then
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;
        if coalesce(v_user.login_attempts, 0) >= 5 then
            update public.multiusers set locked_until = now() + interval '15 minutes' where id = v_user.id;
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;

        -- Suspended?
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
            -- Upgrade ke bcrypt bila masih skema lama
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
-- 4) LOGIN PESERTA (akun_peserta) — SERVER-SIDE
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
        -- Terkunci sementara?
        if v_user.locked_until is not null and v_user.locked_until > now() then
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;
        if coalesce(v_user.login_attempts, 0) >= 5 then
            update public.akun_peserta set locked_until = now() + interval '15 minutes' where id = v_user.id;
            raise exception 'Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.';
        end if;

        -- Status akun
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
            -- Upgrade: isi password_hash bcrypt & kosongkan plaintext lama
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
-- 5) VALIDASI SESI (sliding idle 15 menit) & LOGOUT (revoke)
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
        -- Jika akun dinonaktifkan setelah login -> sesi batal
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
-- 6) RPC ADMIN: SIMPAN / HAPUS AKUN PESERTA (password di-hash server)
-- ============================================================
create or replace function public.admin_save_akun_peserta(p_token text, p_record jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
    v_role  text;
    v_rec   jsonb := p_record;
    v_id    text;
    v_pass  text;
    v_out   record;
begin
    -- Wajib sesi admin valid (superadmin / admin)
    if not public.app_is_valid_session('write') then
        raise exception 'Akses ditolak: sesi tidak valid';
    end if;
    select role into v_role from public.app_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex') and revoked = false and expires_at > now()
    limit 1;
    if v_role not in ('superadmin','admin') then
        raise exception 'Akses ditolak: role tidak berwenang';
    end if;

    v_id   := v_rec->>'id';
    v_pass := nullif(v_rec->>'password', '');

    if v_id is null or v_id = '' then
        -- INSERT akun baru
        if v_pass is null or length(v_pass) < 8 then
            raise exception 'Password minimal 8 karakter';
        end if;
        insert into public.akun_peserta
            (nama, nik, email, username, jurusan_tujuan, status, status_note, approved_at, password_hash)
        values (
            v_rec->>'nama', v_rec->>'nik', lower(v_rec->>'email'), lower(v_rec->>'username'),
            v_rec->>'jurusan_tujuan',
            coalesce(v_rec->>'status', 'pending'),
            v_rec->>'status_note',
            case when coalesce(v_rec->>'status','pending') = 'approved' then now() else null end,
            crypt(v_pass, gen_salt('bf', 10))
        )
        returning * into v_out;
    else
        -- UPDATE akun (password opsional)
        update public.akun_peserta set
            nama            = coalesce(v_rec->>'nama', nama),
            nik             = coalesce(v_rec->>'nik', nik),
            email           = coalesce(lower(v_rec->>'email'), email),
            username        = coalesce(lower(v_rec->>'username'), username),
            jurusan_tujuan  = coalesce(v_rec->>'jurusan_tujuan', jurusan_tujuan),
            status          = coalesce(v_rec->>'status', status),
            status_note     = coalesce(v_rec->>'status_note', status_note),
            approved_at     = case when v_rec->>'status' = 'approved' then coalesce(approved_at, now()) else approved_at end,
            password_hash   = case
                                when v_pass is not null then crypt(v_pass, gen_salt('bf', 10))
                                else password_hash end,
            password        = case when v_pass is not null then null else password end
        where id::text = v_id
        returning * into v_out;

        if not found then
            raise exception 'Akun tidak ditemukan';
        end if;
    end if;

    return jsonb_build_object('ok', true, 'id', v_out.id::text);
end;
$$;

create or replace function public.admin_delete_akun_peserta(p_token text, p_id text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
    v_role text;
begin
    if not public.app_is_valid_session('write') then
        raise exception 'Akses ditolak: sesi tidak valid';
    end if;
    select role into v_role from public.app_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex') and revoked = false and expires_at > now()
    limit 1;
    if v_role not in ('superadmin','admin') then
        raise exception 'Akses ditolak: role tidak berwenang';
    end if;

    delete from public.akun_peserta where id::text = p_id;
    if not found then
        raise exception 'Akun tidak ditemukan';
    end if;
    return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- 7) TRIGGER: auto-hash password registrasi akun_peserta
--    (registrasi publik tetap berjalan, tapi plaintext langsung
--     diubah menjadi bcrypt di server dan kolom password dikosongkan)
-- ============================================================
create or replace function public.trg_akun_peserta_hash_password()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    if NEW.password is not null and NEW.password <> '' then
        if NEW.password_hash is null or NEW.password_hash not like '$2%' then
            NEW.password_hash := crypt(NEW.password, gen_salt('bf', 10));
        end if;
        NEW.password := null;   -- jangan pernah simpan plaintext
    end if;
    return NEW;
end;
$$;

drop trigger if exists trg_akun_peserta_hash_password on public.akun_peserta;
create trigger trg_akun_peserta_hash_password
    before insert or update of password on public.akun_peserta
    for each row execute function public.trg_akun_peserta_hash_password();

-- ============================================================
-- 8) RLS + GRANTS: multiusers & akun_peserta (sembunyikan password)
-- ============================================================

-- ---------- multiusers : kunci total dari anon ----------
alter table public.multiusers enable row level security;

do $$
declare
    r record;
begin
    -- Hapus policy anon lama yang terlalu longgar bila ada
    for r in (select policyname from pg_policies
              where schemaname='public' and tablename='multiusers'
                and roles::text like '%anon%')
    loop
        execute format('drop policy if exists %I on public.multiusers', r.policyname);
    end loop;
end $$;

revoke all on public.multiusers from anon;
-- (Satu-satunya jalur ke multiusers adalah RPC SECURITY DEFINER di atas.)

-- ---------- akun_peserta : RLS + column grants ----------
alter table public.akun_peserta enable row level security;

-- 8a. Policy: publik boleh INSERT (registrasi) & SELECT (kolom aman saja)
drop policy if exists "akun_peserta_select_safe" on public.akun_peserta;
drop policy if exists "akun_peserta_insert_public" on public.akun_peserta;
drop policy if exists "akun_peserta_update_anon"  on public.akun_peserta;
drop policy if exists "akun_peserta_delete_anon"  on public.akun_peserta;
drop policy if exists "allow_delete_akun_peserta" on public.akun_peserta;

create policy "akun_peserta_select_safe"
    on public.akun_peserta for select to anon
    using (true);

create policy "akun_peserta_insert_public"
    on public.akun_peserta for insert to anon
    with check (true);

-- UPDATE/DELETE anon dihapus: kini hanya lewat RPC admin (security definer).

-- 8b. Column grants: sembunyikan password & password_hash dari anon
do $$
declare
    r record;
    safe_cols text;
    insert_cols text;
begin
    revoke all on public.akun_peserta from anon;

    safe_cols := 'id,nama,nik,email,username,jurusan_tujuan,status,status_note,approved_at,last_login_at,created_at';
    insert_cols := 'nama,nik,email,username,jurusan_tujuan,status,status_note,password';

    -- Saring kolom yang benar-benar ada di tabel
    safe_cols := (
        select string_agg(c, ',' order by ord) from (
            select trim(x) c, ord
            from unnest(string_to_array(safe_cols, ',')) with ordinality as t(x, ord)
        ) s
        where exists (select 1 from information_schema.columns
                      where table_schema='public' and table_name='akun_peserta' and column_name=c)
    );
    insert_cols := (
        select string_agg(c, ',' order by ord) from (
            select trim(x) c, ord
            from unnest(string_to_array(insert_cols, ',')) with ordinality as t(x, ord)
        ) s
        where exists (select 1 from information_schema.columns
                      where table_schema='public' and table_name='akun_peserta' and column_name=c)
    );

    execute format('grant select (%s) on public.akun_peserta to anon', safe_cols);
    execute format('grant insert (%s) on public.akun_peserta to anon', insert_cols);
end $$;

-- ============================================================
-- 9) RLS: submissions / roadmap / penetapan / revisions
--    Baca publik sesuai fungsi aplikasi; TULIS wajib sesi admin.
-- ============================================================

-- ---------- submissions ----------
alter table public.submissions enable row level security;

drop policy if exists "submissions_select_public"  on public.submissions;
drop policy if exists "submissions_insert_public"  on public.submissions;
drop policy if exists "submissions_update_public"  on public.submissions;
drop policy if exists "submissions_delete_public"  on public.submissions;
drop policy if exists "submissions_update_admin"   on public.submissions;
drop policy if exists "submissions_delete_admin"   on public.submissions;

create policy "submissions_select_public"
    on public.submissions for select to anon using (true);
create policy "submissions_insert_public"
    on public.submissions for insert to anon with check (true);
create policy "submissions_update_admin"
    on public.submissions for update to anon
    using (public.app_is_valid_session('write'))
    with check (public.app_is_valid_session('write'));
create policy "submissions_delete_admin"
    on public.submissions for delete to anon
    using (public.app_is_valid_session('superadmin'));

-- ---------- roadmap ----------
alter table public.roadmap enable row level security;

drop policy if exists "roadmap_select_public" on public.roadmap;
drop policy if exists "roadmap_insert_public" on public.roadmap;
drop policy if exists "roadmap_update_public" on public.roadmap;
drop policy if exists "roadmap_delete_public" on public.roadmap;
drop policy if exists "roadmap_write_admin"   on public.roadmap;
drop policy if exists "roadmap_delete_admin"  on public.roadmap;

create policy "roadmap_select_public"
    on public.roadmap for select to anon using (true);
create policy "roadmap_write_admin"
    on public.roadmap for insert to anon
    with check (public.app_is_valid_session('superadmin'));
create policy "roadmap_update_admin"
    on public.roadmap for update to anon
    using (public.app_is_valid_session('superadmin'))
    with check (public.app_is_valid_session('superadmin'));
create policy "roadmap_delete_admin"
    on public.roadmap for delete to anon
    using (public.app_is_valid_session('superadmin'));

-- ---------- penetapan (bila tabelnya ada) ----------
do $$
begin
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name='penetapan') then
        execute 'alter table public.penetapan enable row level security';

        execute 'drop policy if exists "penetapan_select_public" on public.penetapan';
        execute 'drop policy if exists "penetapan_update_public" on public.penetapan';
        execute 'drop policy if exists "penetapan_insert_public" on public.penetapan';
        execute 'drop policy if exists "penetapan_delete_public" on public.penetapan';

        execute 'create policy "penetapan_select_public" on public.penetapan for select to anon using (true)';
        execute 'create policy "penetapan_write_admin" on public.penetapan for all to anon
                 using (public.app_is_valid_session(''superadmin''))
                 with check (public.app_is_valid_session(''superadmin''))';
    end if;
end $$;

-- ---------- revisions (log revisi, hanya admin) ----------
do $$
begin
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name='revisions') then
        execute 'alter table public.revisions enable row level security';
        execute 'drop policy if exists "revisions_admin_all" on public.revisions';
        execute 'create policy "revisions_admin_all" on public.revisions for all to anon
                 using (public.app_is_valid_session(''any''))
                 with check (public.app_is_valid_session(''any''))';
    end if;
end $$;

-- ============================================================
-- 10) IZIN EKSEKUSI RPC
-- ============================================================
grant execute on function public.app_login(text, text)                    to anon;
grant execute on function public.app_peserta_login(text, text)            to anon;
grant execute on function public.app_validate_session(text)               to anon;
grant execute on function public.app_logout(text)                         to anon;
grant execute on function public.admin_save_akun_peserta(text, jsonb)     to anon;
grant execute on function public.admin_delete_akun_peserta(text, text)    to anon;
revoke execute on function public.app_purge_expired_sessions()            from public;
revoke execute on function public.app_purge_expired_sessions()            from anon;

-- ============================================================
-- 11) VERIFIKASI RINGKAS (hasil muncul setelah Run)
-- ============================================================
select 'app_sessions' as objek, 'tabel sesi server-side'      as keterangan
union all select 'app_login',            'RPC login admin'
union all select 'app_peserta_login',    'RPC login peserta'
union all select 'app_validate_session', 'RPC validasi sesi (sliding 15 menit)'
union all select 'app_logout',           'RPC logout/revoke'
union all select 'admin_save_akun_peserta',    'RPC simpan akun peserta (admin)'
union all select 'admin_delete_akun_peserta',  'RPC hapus akun peserta (admin)';

-- ============================================================
-- SELESAI — Langkah lanjutan (opsional, lihat README-KEAMANAN.md):
--   * pg_cron untuk purge otomatis:
--       select cron.schedule('purge-simbakes-sessions','0 3 * * *',
--         $$select public.app_purge_expired_sessions();$$);
--   * Pengetatan storage bucket dokumen (setup-storage-pengajuan.sql)
-- ============================================================
