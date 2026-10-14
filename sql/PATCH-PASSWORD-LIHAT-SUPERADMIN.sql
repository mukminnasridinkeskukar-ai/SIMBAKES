-- ============================================================
-- SIMBAKES — PASSWORD TERLIHAT UNTUK SUPERADMIN (akun_peserta)
-- ============================================================
-- Jalankan SEKALI di: Supabase Dashboard -> SQL Editor -> Run
-- File ini IDEMPOTENT (aman dijalankan ulang).
--
-- Tujuan:
--   Akun SUPERADMIN dapat melihat USERNAME & PASSWORD ASLI (bukan hash)
--   seluruh akun peserta dari menu "Data Akun Peserta".
--
-- Cara kerja (4 titik perekaman otomatis — tanpa reset password):
--   1. Registrasi publik        : plaintext yang dikirim pendaftar
--                                 langsung dicatat ke kolom
--                                 password_visible oleh trigger,
--                                 lalu tetap di-hash bcrypt utk login.
--   2. Login peserta            : password yang diketik peserta saat
--                                 login dicatat (migrasi akun LAMA
--                                 otomatis pada login pertama).
--   3. Admin tambah/ubah akun   : password yang diisi admin dicatat.
--   4. Peserta ganti password   : password baru dicatat.
--
--   Catatan penting: hash bcrypt TIDAK BISA dibalik. Akun lama yang
--   belum pernah login lagi setelah patch ini akan berstatus
--   "belum terekam" (tampil "-") sampai peserta login sekali lagi,
--   ATAU superadmin mengatur password baru lewat Edit Akun.
--
-- Keamanan:
--   * Kolom password_visible TIDAK diberi grant ke anon -> tidak bisa
--     dibaca langsung dari tabel (hanya via RPC di bawah).
--   * RPC baca password HANYA untuk role 'superadmin' (operator,
--     admin, viewer ditolak di server).
--   * Verifikasi login TETAP memakai hash bcrypt (tidak berubah).
-- ============================================================

-- ============================================================
-- 1) KOLOM BARU: password_visible
-- ============================================================
alter table public.akun_peserta
    add column if not exists password_visible text;

-- ============================================================
-- 2) TRIGGER: catat plaintext SEBELUM di-hash (registrasi publik
--    & segala INSERT/UPDATE yang mengisi kolom `password`)
-- ============================================================
create or replace function public.trg_akun_peserta_hash_password()
returns trigger
language plpgsql security definer
set search_path = public, extensions
as $$
begin
    if NEW.password is not null and NEW.password <> '' then
        -- Catat password asli untuk Superadmin (bukan hash)
        NEW.password_visible := NEW.password;

        -- Hash bcrypt untuk verifikasi login (perilaku lama dipertahankan)
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
-- 3) BACKFILL AKUN LAMA: akun yang kolom `password`-nya masih
--    berisi plaintext legacy (belum ter-hash) langsung dicatat
--    & di-upgrade ke bcrypt.
--    (trik: update kolom password ke nilai yang sama -> trigger aktif)
-- ============================================================
update public.akun_peserta
   set password = password
 where coalesce(password, '') <> ''
   and password_visible is null;

-- ============================================================
-- 4) LOGIN PESERTA: catat password yang berhasil diverifikasi
--    (migrasi otomatis akun lama pada login pertama)
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

        -- ---- Verifikasi password (bcrypt -> plaintext legacy) ----
        v_hash := v_rec->>'password_hash';
        if v_hash is not null then
            if v_hash like '$2%' then
                v_ok := crypt(p_password, v_hash) = v_hash;
            else
                v_ok := p_password = v_hash;   -- legacy
            end if;
        elsif v_rec->>'password' is not null then
            v_ok := p_password = (v_rec->>'password');   -- kolom lama
        end if;

        if v_ok then
            -- Upgrade ke bcrypt bila masih skema lama
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

            -- >>> BARU: catat password asli utk Superadmin (bukan hash).
            --     Ini perekaman otomatis akun lama pada login pertama.
            update public.akun_peserta
               set password_visible = p_password
             where id::text = v_rec->>'id'
               and password_visible is distinct from p_password;
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
            'foto_url', coalesce(v_rec->>'foto_url', ''),
            'status',   v_rec->>'status',
            'user_type','peserta'
        )
    );
end;
$$;

-- ============================================================
-- 5) ADMIN SIMPAN AKUN: catat password yang diisi admin
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
             approved_at, password, password_hash, password_visible)
        values (
            v_rec->>'nama', v_rec->>'nik', lower(v_rec->>'email'), lower(v_rec->>'username'),
            v_rec->>'jurusan_tujuan',
            coalesce(v_rec->>'status', 'pending'),
            v_rec->>'status_note',
            case when coalesce(v_rec->>'status','pending') = 'approved' then now() else null end,
            '',                                        -- kolom password NOT NULL: isi ''
            crypt(v_pass, gen_salt('bf', 10)),         -- hash dibuat di server
            v_pass                                     -- catat password asli utk Superadmin
        )
        returning * into v_out;
    else
        -- UPDATE akun (password opsional)
        update public.akun_peserta set
            nama             = coalesce(v_rec->>'nama', nama),
            nik              = coalesce(v_rec->>'nik', nik),
            email            = coalesce(lower(v_rec->>'email'), email),
            username         = coalesce(lower(v_rec->>'username'), username),
            jurusan_tujuan   = coalesce(v_rec->>'jurusan_tujuan', jurusan_tujuan),
            status           = coalesce(v_rec->>'status', status),
            status_note      = coalesce(v_rec->>'status_note', status_note),
            approved_at      = case when v_rec->>'status' = 'approved' then coalesce(approved_at, now()) else approved_at end,
            password_hash    = case
                                 when v_pass is not null then crypt(v_pass, gen_salt('bf', 10))
                                 else password_hash end,
            password_visible = case
                                 when v_pass is not null then v_pass
                                 else password_visible end,
            password         = case when v_pass is not null then '' else password end
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
-- 6) PESERTA GANTI PASSWORD SENDIRI: catat password baru
-- ============================================================
create or replace function public.peserta_change_password(p_token text, p_old text, p_new text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_session public.app_sessions%rowtype;
    v_rec     jsonb;
    v_hash    text;
    v_ok      boolean := false;
    v_current_token_hash text;
begin
    if p_token is null or length(p_token) < 32 then
        raise exception 'Akses ditolak: sesi tidak valid';
    end if;
    if p_new is null or length(p_new) < 8 then
        raise exception 'Password baru minimal 8 karakter';
    end if;

    select * into v_session
    from public.app_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and revoked = false and expires_at > now()
    limit 1;

    if not found or v_session.user_type <> 'peserta' then
        raise exception 'Akses ditolak: sesi peserta tidak valid';
    end if;
    v_current_token_hash := v_session.token_hash;

    select to_jsonb(a) into v_rec
    from public.akun_peserta a
    where id::text = v_session.user_id;

    if v_rec is null then
        raise exception 'Akun tidak ditemukan';
    end if;

    -- Verifikasi password lama (bcrypt -> plaintext legacy)
    v_hash := v_rec->>'password_hash';
    if v_hash is not null then
        if v_hash like '$2%' then
            v_ok := crypt(p_old, v_hash) = v_hash;
        else
            v_ok := p_old = v_hash;
        end if;
    elsif v_rec->>'password' is not null then
        v_ok := p_old = (v_rec->>'password');
    end if;

    if not v_ok then
        raise exception 'Password saat ini salah';
    end if;

    update public.akun_peserta set
        password_hash    = crypt(p_new, gen_salt('bf', 10)),
        password_visible = p_new,   -- catat password baru utk Superadmin
        password         = '',
        updated_at       = now()
    where id::text = v_session.user_id;

    -- Keamanan: cabut semua sesi LAIN milik akun ini (sisakan sesi aktif)
    update public.app_sessions
       set revoked = true
     where user_type = 'peserta'
       and user_id = v_session.user_id
       and token_hash <> v_current_token_hash
       and revoked = false;

    return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================
-- 7) RPC BARU (KHUSUS SUPERADMIN): daftar username + password asli
--    Role lain (admin/operator/viewer/peserta) DITOLAK di server.
--    Kolom password_visible tidak pernah bisa dibaca langsung
--    dari tabel karena tidak diberi grant ke anon.
-- ============================================================
create or replace function public.superadmin_list_password_akun_peserta(p_token text)
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
    if v_role <> 'superadmin' then
        raise exception 'Akses ditolak: hanya Superadmin yang dapat melihat password';
    end if;

    return query
    select jsonb_build_object(
        'id',               a.id::text,
        'username',         a.username,
        'password_visible', a.password_visible,
        'updated_at',       a.updated_at
    )
    from public.akun_peserta a
    order by a.created_at desc nulls last;
end;
$$;

-- ============================================================
-- 8) GRANT EKSEKUSI (pola sama dgn RPC lain; validasi role
--    dilakukan DI DALAM fungsi)
-- ============================================================
grant execute on function public.app_peserta_login(text, text)                  to anon;
grant execute on function public.admin_save_akun_peserta(text, jsonb)           to anon;
grant execute on function public.peserta_change_password(text, text, text)      to anon;
grant execute on function public.superadmin_list_password_akun_peserta(text)    to anon;

-- ============================================================
-- 9) VERIFIKASI RINGKAS (hasil muncul setelah Run)
-- ============================================================
select 'password_visible'                          as objek,
       'kolom password asli di akun_peserta'       as keterangan
union all select 'trg_akun_peserta_hash_password', 'trigger catat plaintext saat registrasi'
union all select 'app_peserta_login (+rekam)',     'login peserta merekam password'
union all select 'admin_save_akun_peserta (+rekam)','simpan akun admin merekam password'
union all select 'peserta_change_password (+rekam)','ganti password merekam password baru'
union all select 'superadmin_list_password_akun_peserta', 'RPC baca password (superadmin saja)';

-- Cek berapa akun yang sudah/belum terekam (informasi):
--   select
--     count(*) filter (where password_visible is not null and password_visible <> '') as sudah_terekam,
--     count(*) filter (where coalesce(password_visible,'') = '')                      as belum_terekam
--   from public.akun_peserta;

-- ============================================================
-- SELESAI. Buka menu "Data Akun Peserta" sebagai SUPERADMIN:
--   kolom "🔑 Password" akan muncul dengan tombol 👁 (lihat) dan
--   📋 (salin). Baris bertanda "- (belum terekam)" akan terisi
--   otomatis setelah peserta bersangkutan login sekali lagi,
--   atau atur password baru lewat tombol ✏️ Edit Akun.
-- ============================================================
