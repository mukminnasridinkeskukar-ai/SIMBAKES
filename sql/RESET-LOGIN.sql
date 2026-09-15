-- ============================================================
-- SIMBAKES — RESET LOGIN (buka kunci akun + diagnostik)
-- ============================================================
-- Fungsi: melepas KUNCIAN akun (terlalu banyak percobaan gagal)
--         pada SEMUA akun admin & peserta, lalu menampilkan
--         kondisi akun agar penyebab gagal login terlihat jelas.
--
-- Aman dijalankan kapan saja, boleh berulang. TIDAK mengubah
-- password, TIDAK mengubah data aplikasi lain.
--
-- Cara pakai:
--   Supabase Dashboard -> SQL Editor -> New query
--   -> Paste SELURUH isi file ini -> Run
--   -> Lalu langsung coba login lagi di aplikasi.
-- ============================================================

-- 1) Buka kunci SEMUA akun admin & peserta (kalau sedang terkunci)
update public.multiusers
   set login_attempts = 0,
       locked_until   = null;

update public.akun_peserta
   set login_attempts = 0,
       locked_until   = null;

-- 2) Akun ADMIN — username yang benar & format password tersimpan
--    (hash TIDAK ditampilkan, hanya formatnya)
select username,
       email,
       is_active,
       status,
       case
         when password_hash is null then '(kosong)'
         when password_hash like '$2%' then 'bcrypt'
         when length(password_hash) = 64 and password_hash ~ '^[a-fA-F0-9]{64}$' then 'sha256'
         when length(password_hash) = 32 and password_hash ~ '^[a-fA-F0-9]{32}$' then 'md5'
         else 'plaintext'
       end as format_password,
       login_attempts,
       locked_until
from public.multiusers
order by username
limit 20;

-- 3) Akun PESERTA — username, status & format password tersimpan
select username,
       email,
       status,
       case
         when password_hash is not null and password_hash like '$2%' then 'bcrypt'
         when password_hash is not null
              and length(password_hash) = 64 and password_hash ~ '^[a-fA-F0-9]{64}$' then 'sha256'
         when password_hash is not null then 'teks-tertentu'
         when password is not null then 'plaintext-kolom-lama'
         else '(kosong)'
       end as format_password,
       login_attempts,
       locked_until
from public.akun_peserta
order by username
limit 20;

-- 4) Verifikasi: harus tampil 4 fungsi RPC dengan anon_boleh_eksekusi = true
select p.proname as fungsi_rpc,
       has_function_privilege('anon', p.oid, 'execute') as anon_boleh_eksekusi
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('app_login','app_peserta_login','app_validate_session','app_logout')
order by 1;
