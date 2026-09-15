-- ============================================================
-- SIMBAKES — PATCH FIX SESSION & AKUN PESERTA (v4)
-- ============================================================
-- Perbaikan atas 3 laporan:
--
-- 1) LOGIN PESERTA GAGAL:
--    "null value in column "password" of relation "akun_peserta"
--     violates not-null constraint" (HTTP 400 / kode 23502)
--    SEBAB : kolom `password` di tabel akun_peserta Anda NOT NULL,
--            sementara 3 titik di SQL sebelumnya mencoba mengosongkan
--            plaintext dengan mengisi NULL (upgrade bcrypt saat login,
--            trigger hash registrasi, dan edit password oleh admin).
--    FIX   : isi dengan string kosong '' (sah untuk NOT NULL), bukan NULL.
--
-- 2) PANEL ADMIN "DATA AKUN PESERTA" 401:
--    "permission denied for table akun_peserta" (HTTP 401 / 42501)
--    SEBAB : SECURITY-HARDENING.sql mencabut hak SELECT penuh anon dan
--            hanya memberi grant KOLOM aman (tanpa password). Frontend
--            lama membaca dengan select(*) -> pasti ditolak.
--    FIX   : pembacaan panel kini lewat RPC baru admin_list_akun_peserta
--            (validasi sesi admin di server; kolom password TIDAK pernah
--            dikirim ke browser).
--
-- 3) app_validate_session 400:
--    "UPDATE is not allowed in a non-volatile function"
--    SEBAB : fungsi dideklarasikan STABLE padahal melakukan UPDATE
--            (sliding expiry sesi). PostgreSQL melarang UPDATE di
--            fungsi STABLE. Bug yang sama ada di app_is_valid_session
--            (dipakai policy RLS tulis & RPC admin).
--    FIX   : keduanya diubah menjadi VOLATILE.
--
-- IDEMPOTENT: aman dijalankan berulang. TIDAK mengubah RLS/tabel.
--
-- CARA PAKAI:
--   Supabase Dashboard -> SQL Editor -> New query
--   -> Paste SELURUH isi file ini -> Run
--   -> Verifikasi di bawah harus menampilkan daftar fungsi.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1) app_validate_session — VOLATILE (fix "non-volatile function")
--    Isi sama dengan PATCH-LOGIN v3 (model blokir status peserta),
--    hanya deklarasi volatility yang diperbaiki.
-- ============================================================
create or replace function public.app_validate_session(p_token text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions
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
        -- Model blokir: hanya status bermasalah yang membatalkan sesi
        if lower(coalesce(v_rec->>'status', 'approved')) in
           ('pending','menunggu','waiting','review','verifikasi',
            'rejected','ditolak','suspended','ditangguhkan','blocked',
            'diblokir','banned','inactive','nonaktif','disabled',
            'dinonaktifkan') then
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

-- ============================================================
-- 2) app_is_valid_session — VOLATILE (bug "stable" yang sama;
--    dipakai policy RLS tulis submissions/roadmap & RPC admin)
-- ============================================================
create or replace function public.app_request_token()
returns text
language sql stable
set search_path = public, extensions
as $$
    select nullif(current_setting('request.headers', true)::json ->> 'x-session-token', '');
$$;

create or replace function public.app_is_valid_session(p_min_role text default null)
returns boolean
language plpgsql volatile security definer
set search_path = public, extensions
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

-- ============================================================
-- 3) app_peserta_login — FIX 23502 (password '' bukan NULL)
--    + tangga verifikasi lengkap (bcrypt/SHA-256/MD5/plaintext)
--    + model blokir status
-- ============================================================
create or replace function public.app_peserta_login(p_username text, p_password text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
    v_user    record;
    v_rec     jsonb;
    v_hash    text;
    v_status  text;
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

        -- Status akun — MODEL BLOKIR: hanya status bermasalah yang ditolak;
        -- nilai lain (approved/Aktif/active/disetujui/dll) boleh masuk.
        v_status := lower(coalesce(v_rec->>'status', 'approved'));
        if v_status in ('pending','menunggu','waiting','review','verifikasi') then
            raise exception 'Akun Anda masih MENUNGGU PERSETUJUAN admin. Silakan tunggu 1-2 hari kerja.';
        elsif v_status in ('rejected','ditolak') then
            raise exception 'Akun Anda DITOLAK. Hubungi admin.';
        elsif v_status in ('suspended','ditangguhkan','blocked','diblokir','banned') then
            raise exception 'Akun Anda DITANGGUHKAN. Hubungi admin.';
        elsif v_status in ('inactive','nonaktif','disabled','dinonaktifkan') then
            raise exception 'Akun Anda dinonaktifkan. Hubungi administrator.';
        end if;

        -- ---- Verifikasi password (multi-skema) ----
        v_hash := coalesce(v_rec->>'password_hash', v_rec->>'password');
        if v_hash is not null then
            if v_hash like '$2%' then
                v_ok := crypt(p_password, v_hash) = v_hash;
            elsif length(v_hash) = 64 and lower(v_hash) ~ '^[a-f0-9]{64}$' then
                v_ok := encode(digest(p_password, 'sha256'), 'hex') = lower(v_hash);
            elsif length(v_hash) = 32 and lower(v_hash) ~ '^[a-f0-9]{32}$' then
                v_ok := encode(digest(p_password, 'md5'), 'hex') = lower(v_hash);
            else
                v_ok := p_password = v_hash;   -- legacy plaintext
            end if;
        end if;

        if v_ok then
            -- Upgrade ke bcrypt bila masih skema lama.
            -- PENTING: kolom password di skema ini NOT NULL -> isi ''
            -- (bukan NULL) agar plaintext tak tersimpan tanpa error 23502.
            if coalesce(v_hash, '') not like '$2%' then
                update public.akun_peserta
                   set password_hash = crypt(p_password, gen_salt('bf', 10)),
                       password      = ''
                 where id::text = v_rec->>'id';
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
-- 4) TRIGGER registrasi — FIX 23502 (password '' bukan NULL)
--    Registrasi peserta (daftar-peserta.html) insert plaintext ->
--    di-hash bcrypt di server -> kolom password diisi ''.
-- ============================================================
create or replace function public.trg_akun_peserta_hash_password()
returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
begin
    if NEW.password is not null and NEW.password <> '' then
        if NEW.password_hash is null or NEW.password_hash not like '$2%' then
            NEW.password_hash := crypt(NEW.password, gen_salt('bf', 10));
        end if;
        NEW.password := '';   -- '' sah untuk kolom NOT NULL; jangan NULL
    end if;
    return NEW;
end;
$$;

drop trigger if exists trg_akun_peserta_hash_password on public.akun_peserta;
create trigger trg_akun_peserta_hash_password
    before insert or update of password on public.akun_peserta
    for each row execute function public.trg_akun_peserta_hash_password();

-- ============================================================
-- 5) RPC BARU: admin_list_akun_peserta — baca daftar akun utk panel
--    Menggantikan select(*) langsung yang diblokir grant kolom (401).
--    Kolom password/password_hash TIDAK PERNAH dikirim ke browser.
-- ============================================================
create or replace function public.admin_list_akun_peserta(p_token text)
returns setof jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
    v_role text;
begin
    if p_token is null or length(p_token) < 32 then
        raise exception 'Akses ditolak: sesi tidak valid';
    end if;

    select role into v_role
    from public.app_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and revoked = false and expires_at > now()
    limit 1;

    if v_role is null then
        raise exception 'Akses ditolak: sesi tidak valid';
    end if;
    if v_role not in ('superadmin','admin','operator') then
        raise exception 'Akses ditolak: role tidak berwenang';
    end if;

    return query
    select jsonb_build_object(
        'id',             a.id::text,
        'nama',           a.nama,
        'nik',            a.nik,
        'email',          a.email,
        'username',       a.username,
        'jurusan_tujuan', a.jurusan_tujuan,
        'status',         a.status,
        'status_note',    a.status_note,
        'approved_at',    a.approved_at,
        'last_login_at',  a.last_login_at,
        'created_at',     a.created_at
    )
    from public.akun_peserta a
    order by a.created_at desc nulls last;
end;
$$;

-- ============================================================
-- 6) admin_save_akun_peserta — FIX 23502
--    INSERT kini mengisi kolom password (''); UPDATE mengganti
--    password lama dengan '' (bukan NULL) saat password diganti.
-- ============================================================
create or replace function public.admin_save_akun_peserta(p_token text, p_record jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
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
            (nama, nik, email, username, jurusan_tujuan, status, status_note,
             approved_at, password, password_hash)
        values (
            v_rec->>'nama', v_rec->>'nik', lower(v_rec->>'email'), lower(v_rec->>'username'),
            v_rec->>'jurusan_tujuan',
            coalesce(v_rec->>'status', 'pending'),
            v_rec->>'status_note',
            case when coalesce(v_rec->>'status','pending') = 'approved' then now() else null end,
            '',                                        -- '' sah utk NOT NULL
            crypt(v_pass, gen_salt('bf', 10))          -- hash dibuat server
        )
        returning * into v_out;
    else
        -- UPDATE akun (password opsional: kosong = tidak diubah)
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
            password        = case when v_pass is not null then '' else password end
        where id::text = v_id
        returning * into v_out;

        if not found then
            raise exception 'Akun tidak ditemukan';
        end if;
    end if;

    return jsonb_build_object('ok', true, 'id', v_out.id::text);
end;
$$;

-- ============================================================
-- 7) IZIN EKSEKUSI (defensif: fungsi yang belum ada dilewati saja,
--    jadi patch ini aman dijalankan sebelum/sesudah HARDENING)
-- ============================================================
do $$
declare
    r record;
begin
    for r in
        select unnest(array[
            'app_login(text)',
            'app_peserta_login(text, text)',
            'app_validate_session(text)',
            'app_logout(text)',
            'app_is_valid_session(text)',
            'admin_list_akun_peserta(text)',
            'admin_save_akun_peserta(text, jsonb)',
            'admin_delete_akun_peserta(text, text)'
        ]) as fn
    loop
        begin
            execute format('grant execute on function public.%s to anon, authenticated', r.fn);
        exception when undefined_function or undefined_object then
            null;   -- fungsi belum terpasang (HARDENING belum dijalankan)
        end;
    end loop;
end $$;

-- ============================================================
-- 8) VERIFIKASI — harus tampil daftar fungsi dengan volatility "v"
-- ============================================================
select p.proname as fungsi,
       case when p.provolatile = 'v' then 'VOLATILE (benar)'
            else 'STABLE/IMMUTABLE (SALAH!)' end as volatility,
       has_function_privilege('anon', p.oid, 'execute') as anon_boleh_eksekusi
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('app_validate_session','app_is_valid_session',
                    'app_peserta_login','admin_list_akun_peserta',
                    'admin_save_akun_peserta')
order by 1;
