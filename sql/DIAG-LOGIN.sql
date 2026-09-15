-- ============================================================
-- SIMBAKES — DIAGNOSTIK LOGIN (read-only, aman dijalankan)
-- ============================================================
-- Tujuan: melihat FAKTA keadaan database yang menyebabkan login gagal.
-- TIDAK menampilkan password/hash (hanya formatnya).
--
-- Cara pakai:
--   1. Jalankan PATCH-LOGIN.sql dulu (sekali).
--   2. Jalankan SELURUH file ini di SQL Editor.
--   3. Screenshot / salin SEMUA hasilnya, kirim ke asisten.
-- ============================================================

-- 1) Apakah 4 RPC login sudah ada & boleh dieksekusi anon?
select p.proname as fungsi_rpc,
       pg_get_function_identity_arguments(p.oid) as parameter,
       has_function_privilege('anon', p.oid, 'execute') as anon_boleh_eksekusi
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('app_login','app_peserta_login','app_validate_session','app_logout')
order by 1;

-- 2) Status RLS kedua tabel login
select c.relname as tabel,
       c.relrowsecurity as rls_aktif,
       c.relforcerowsecurity as rls_paksa
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('multiusers','akun_peserta')
order by 1;

-- 3) Daftar policy RLS kedua tabel tersebut
select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('multiusers','akun_peserta')
order by tablename, policyname;

-- 4) Hak akses anon di kedua tabel (grants)
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('multiusers','akun_peserta')
  and grantee in ('anon','public')
order by table_name, privilege_type;

-- 5) Kondisi akun ADMIN (aman: hash tidak ditampilkan)
select username,
       email,
       is_active,
       status,
       login_attempts,
       locked_until,
       case
         when password_hash is null then '(kosong)'
         when password_hash like '$2%' then 'bcrypt'
         when length(password_hash) = 64 and password_hash ~ '^[a-f0-9]{64}$' then 'sha256'
         else 'plaintext'
       end as format_hash
from public.multiusers
order by username
limit 20;

-- 6) Kondisi akun PESERTA (aman: password tidak ditampilkan)
select username,
       email,
       status,
       login_attempts,
       locked_until,
       case
         when password_hash is not null and password_hash like '$2%' then 'bcrypt'
         when password_hash is not null then 'teks-tertentu'
         when password is not null then 'plaintext-kolom-lama'
         else '(kosong)'
       end as format_password
from public.akun_peserta
order by username
limit 20;

-- ============================================================
-- OPSIONAL — reset lockout akun (jalankan terpisah bila perlu):
-- Hapus tanda "--" di depan baris, ganti username, lalu Run.
--
-- update public.multiusers
--    set login_attempts = 0, locked_until = null
--  where lower(username) = lower('superadmin');
--
-- update public.akun_peserta
--    set login_attempts = 0, locked_until = null
--  where lower(username) = lower('USERNAME_PESERTA');
-- ============================================================
