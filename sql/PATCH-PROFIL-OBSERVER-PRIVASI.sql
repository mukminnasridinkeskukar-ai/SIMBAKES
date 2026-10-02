-- ============================================================
-- SIMBAKES — PATCH: PRIVASI NIK + PROFIL PESERTA + ROLE OBSERVER
-- ============================================================
-- Jalankan SATU kali di Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Patch ini AMAN dijalankan ulang (idempotent) dan tidak mengubah data lama.
--
-- Isi:
--   1)  PRIVASI NIK  : RPC app_get_lulus_tes() — data "Lulus Tes Masuk PT"
--                      untuk PUBLIK tanpa kolom NIK/KTP/kontak.
--   2)  PRIVASI NIK  : RPC app_check_registrasi() — cek duplikat pendaftaran
--                      tanpa membuka baris data pengguna lain.
--   3)  PROFIL       : kolom akun_peserta.foto_url + grant kolom aman.
--   4)  PROFIL       : RPC peserta_update_profile() & peserta_change_password()
--                      (hanya pemilik akun, lewat token sesi peserta).
--   5)  PROFIL       : app_peserta_login & app_validate_session kini
--                      mengirim foto_url pada profil sesi.
--   6)  OBSERVER     : role 'observer' dikenali di tangga sesi server
--                      ('any'); akses tulis TETAP otomatis ditolak karena
--                      'observer' tidak termasuk ladder 'write'.
--   7)  STORAGE      : bucket "profil-foto" (baca publik, tulis hanya
--                      folder profil/, maks 2MB, tipe gambar).
--
-- Setelah patch dijalankan, semua fitur web aktif tanpa perubahan lain.
-- ============================================================

-- ============================================================
-- 1) RPC PUBLIK: DATA LULUS TES TANPA NIK
--    Halaman "Lulus Tes Masuk PT" dapat diakses pembaca umum —
--    server HANYA mengirim kolom publik; NIK/kontak tidak pernah keluar.
-- ============================================================
create or replace function public.app_get_lulus_tes()
returns setof jsonb
language sql
security definer
set search_path = public, extensions
as $$
    select to_jsonb(a) - array[
        'nik','no_ktp','noKtp','password','password_hash',
        'email','no_hp','no_wa','alamat_ktp','alamat_domisili'
    ]
    from public.penetapan a
    order by a.nama_lengkap asc nulls last;
$$;

grant execute on function public.app_get_lulus_tes() to anon;

-- ============================================================
-- 2) RPC PUBLIK: CEK DUPlikat REGISTRASI (tanpa membocorkan data)
--    Mengembalikan hanya penanda true/false — TIDAK mengirim baris data
--    sehingga pendaftar tidak dapat menelusuri data orang lain.
-- ============================================================
create or replace function public.app_check_registrasi(
    p_username text,
    p_email    text,
    p_nik      text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_username text := lower(coalesce(nullif(trim(p_username), ''), '#tidakada#'));
    v_email    text := lower(coalesce(nullif(trim(p_email), ''),    '#tidakada#'));
    v_nik      text := coalesce(nullif(trim(p_nik), ''),            '#tidakada#');
begin
    return jsonb_build_object(
        'username_taken',
            exists (select 1 from public.akun_peserta
                    where lower(username) = v_username limit 1),
        'email_taken',
            exists (select 1 from public.akun_peserta
                    where lower(email) = v_email limit 1),
        'nik_taken',
            exists (select 1 from public.akun_peserta
                    where nik = v_nik limit 1)
    );
end;
$$;

grant execute on function public.app_check_registrasi(text, text, text) to anon;

-- ============================================================
-- 3) KOLOM FOTO PROFIL AKUN PESERTA + GRANT KOLOM AMAN
-- ============================================================
alter table public.akun_peserta add column if not exists foto_url text;

-- Perbarui grant kolom SELECT anon: tambahkan foto_url, tetap tanpa password.
do $$
declare
    safe_cols text;
begin
    revoke all on public.akun_peserta from anon;

    safe_cols := 'id,nama,email,username,jurusan_tujuan,status,status_note,approved_at,last_login_at,created_at,foto_url';

    -- Saring kolom yang benar-benar ada di tabel (NIK SENGAJA TIDAK DIKIRIM ke anon)
    safe_cols := (
        select string_agg(c, ',' order by ord) from (
            select trim(x) c, ord
            from unnest(string_to_array(safe_cols, ',')) with ordinality as t(x, ord)
        ) s
        where exists (select 1 from information_schema.columns
                      where table_schema='public' and table_name='akun_peserta' and column_name=c)
    );

    execute format('grant select (%s) on public.akun_peserta to anon', safe_cols);
    -- Registrasi publik tetap boleh INSERT (pendaftar memasukkan NIK-nya sendiri;
    -- yang diblokir adalah MEMBACA NIK via anon select)
    execute 'grant insert (nama, nik, email, username, jurusan_tujuan, status, status_note, password) on public.akun_peserta to anon';
end $$;

-- ============================================================
-- 4) RPC PESERTA: PERBARUI PROFIL SENDIRI
--    Validasi: token sesi peserta + pemilik akun. NIK/status/jurusan
--    TIDAK dapat diubah lewat sini (hanya admin/operator).
-- ============================================================
create or replace function public.peserta_update_profile(p_token text, p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_session public.app_sessions%rowtype;
    v_rec     jsonb := p_record;
    v_owner   text;
    v_username text;
    v_email    text;
    v_foto     text;
    v_out      record;
begin
    if p_token is null or length(p_token) < 32 then
        raise exception 'Akses ditolak: sesi tidak valid';
    end if;

    select * into v_session
    from public.app_sessions
    where token_hash = encode(digest(p_token, 'sha256'), 'hex')
      and revoked = false and expires_at > now()
    limit 1;

    if not found or v_session.user_type <> 'peserta' then
        raise exception 'Akses ditolak: sesi peserta tidak valid';
    end if;

    -- HANYA pemilik akun boleh menyunting profilnya
    v_owner := coalesce(v_rec->>'id', '');
    if v_owner is distinct from v_session.user_id then
        raise exception 'Akses ditolak: Anda hanya dapat menyunting akun sendiri';
    end if;

    v_username := lower(nullif(trim(coalesce(v_rec->>'username', '')), ''));
    v_email    := lower(nullif(trim(coalesce(v_rec->>'email', '')), ''));
    v_foto     := v_rec->>'foto_url';

    if v_username is not null and v_username !~ '^[a-z0-9_.]{4,40}$' then
        raise exception 'Username 4-40 karakter (huruf kecil, angka, titik, garis bawah)';
    end if;
    if v_username is not null and exists (
        select 1 from public.akun_peserta
        where lower(username) = v_username and id::text <> v_owner limit 1
    ) then
        raise exception 'Username sudah dipakai akun lain. Gunakan yang lain.';
    end if;
    if v_email is not null and exists (
        select 1 from public.akun_peserta
        where lower(email) = v_email and id::text <> v_owner limit 1
    ) then
        raise exception 'Email sudah dipakai akun lain. Gunakan yang lain.';
    end if;
    if v_foto is not null and length(v_foto) > 600 then
        raise exception 'URL foto tidak valid';
    end if;

    update public.akun_peserta set
        nama     = coalesce(nullif(trim(coalesce(v_rec->>'nama', '')), ''), nama),
        username = coalesce(v_username, username),
        email    = coalesce(v_email, email),
        foto_url = coalesce(v_foto, foto_url),
        updated_at = now()
    where id::text = v_owner
    returning * into v_out;

    if not found then
        raise exception 'Akun tidak ditemukan';
    end if;

    return jsonb_build_object(
        'ok', true,
        'profile', jsonb_build_object(
            'id',       v_out.id::text,
            'nama',     coalesce(nullif(v_out.nama, ''), v_out.username),
            'nik',      v_out.nik,
            'email',    v_out.email,
            'username', v_out.username,
            'foto_url', v_out.foto_url,
            'status',   v_out.status,
            'user_type','peserta'
        )
    );
end;
$$;

grant execute on function public.peserta_update_profile(text, jsonb) to anon;

-- ============================================================
-- 5) RPC PESERTA: GANTI PASSWORD SENDIRI
--    Password lama diverifikasi di server; hash bcrypt dibuat di server.
--    Setelah berhasil, SEMUA sesi lain milik akun ini dicabut.
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
        password_hash = crypt(p_new, gen_salt('bf', 10)),
        password      = '',
        updated_at    = now()
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

grant execute on function public.peserta_change_password(text, text, text) to anon;

-- ============================================================
-- 6) LOGIN & VALIDASI SESI PESERTA: kirim foto_url pada profil
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

        v_hash := v_rec->>'password_hash';
        if v_hash is not null then
            if v_hash like '$2%' then
                v_ok := crypt(p_password, v_hash) = v_hash;
            else
                v_ok := p_password = v_hash;
            end if;
        elsif v_rec->>'password' is not null then
            v_ok := p_password = (v_rec->>'password');
        end if;

        if v_ok then
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
            'foto_url', coalesce(v_rec->>'foto_url', ''),
            'status',   v_rec->>'status',
            'user_type','peserta'
        )
    );
end;
$$;

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
        return null;
    end if;

    update public.app_sessions
       set last_seen_at = now(),
           expires_at   = least(now() + interval '15 minutes', v_session.created_at + interval '12 hours')
     where id = v_session.id;

    if v_session.user_type = 'admin' then
        select * into v_profile
        from public.multiusers where id::text = v_session.user_id;
        v_rec := to_jsonb(v_profile);
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
                'foto_url', coalesce(v_rec->>'foto_url', ''),
                'status',   v_rec->>'status'
            )
        );
    end if;
end;
$$;

-- ============================================================
-- 7) OBSERVER: kenali role di tangga sesi server
--    'observer' masuk ladder 'any' (baca), TIDAK masuk 'write'
--    sehingga seluruh INSERT/UPDATE/DELETE server otomatis menolaknya.
-- ============================================================
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

    update public.app_sessions
       set last_seen_at = now(),
           expires_at   = least(
                            now() + interval '15 minutes',
                            v_session.created_at + interval '12 hours'
                          )
     where id = v_session.id;

    if p_min_role is null or p_min_role = '' then
        return true;
    end if;

    return case p_min_role
        when 'any'        then v_session.role in ('superadmin','operator','viewer','admin','observer')
        when 'superadmin' then v_session.role = 'superadmin'
        when 'write'      then v_session.role in ('superadmin','operator','admin')
        else v_session.role = p_min_role
    end;
end;
$$;

-- ============================================================
-- 8) STORAGE: bucket "profil-foto" (foto profil akun peserta)
--    Baca publik (avatar), tulis hanya di folder profil/ (maks 2MB).
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profil-foto', 'profil-foto', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
    set public = true,
        file_size_limit = 2097152,
        allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "profil_foto_public_read" on storage.objects;
create policy "profil_foto_public_read"
    on storage.objects for select to anon
    using (bucket_id = 'profil-foto');

drop policy if exists "profil_foto_anon_insert" on storage.objects;
create policy "profil_foto_anon_insert"
    on storage.objects for insert to anon
    with check (
        bucket_id = 'profil-foto'
        and (storage.foldername(name))[1] = 'profil'
    );

drop policy if exists "profil_foto_anon_update" on storage.objects;
create policy "profil_foto_anon_update"
    on storage.objects for update to anon
    using (bucket_id = 'profil-foto' and (storage.foldername(name))[1] = 'profil')
    with check (bucket_id = 'profil-foto' and (storage.foldername(name))[1] = 'profil');

-- ============================================================
-- 9) MEMBUAT AKUN OBSERVER (contoh — sesuaikan username/password)
--    Hapus tanda komentar dua baris di bawah lalu ganti nilainya.
--    Password akan otomatis di-hash bcrypt oleh trigger/ kolom hash.
-- ============================================================
-- insert into public.multiusers (username, password, nama_lengkap, email, role, is_active)
-- values ('observer', 'GantiPasswordAnda123', 'Pengamat SIMBAKES', 'observer@example.com', 'observer', true)
-- on conflict do nothing;

-- ============================================================
-- VERIFIKASI RINGKAS (hasil muncul setelah Run)
-- ============================================================
select 'app_get_lulus_tes'        as objek, 'RPC data Lulus Tes publik TANPA NIK'   as keterangan
union all select 'app_check_registrasi',           'RPC cek duplikat registrasi (tanpa data)'
union all select 'peserta_update_profile',         'RPC peserta sunting profil sendiri'
union all select 'peserta_change_password',        'RPC peserta ganti password sendiri'
union all select 'akun_peserta.foto_url',          'kolom foto profil + grant aman'
union all select 'storage.profil-foto',            'bucket foto profil (2MB, gambar)'
union all select 'app_is_valid_session observer',  'role observer dikenali server (baca saja)';

-- ============================================================
-- SELESAI
-- ============================================================