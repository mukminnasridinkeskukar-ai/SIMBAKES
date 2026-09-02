-- ============================================================
-- SIMBAKES: AKTIFKAN POLICY DELETE UNTUK TABEL akun_peserta
-- ============================================================
-- Kebutuhan  : fitur "Data Akun Peserta" di Panel Admin (tombol hapus)
-- Cara pakai : buka Supabase Dashboard -> SQL Editor -> tempel
--              seluruh isi file ini -> Run
-- ============================================================
--
-- Latar belakang (kondisi yang sudah ada di database Anda):
--   ✅ SELECT  : sudah diizinkan untuk anon
--   ✅ INSERT  : sudah diizinkan untuk anon (dipakai registrasi peserta)
--   ✅ UPDATE  : sudah diizinkan untuk anon (dipakai login/last_login_at)
--   ❌ DELETE  : BELUM ada policy  ->  tombol hapus di panel admin terblokir
--
-- Catatan keamanan: model keamanan template SIMBAKES saat ini memang
-- menyerahkan CRUD ke klien via anon key (tanpa Supabase Auth), sama seperti
-- tabel submissions/roadmap. Policy di bawah mengikuti model yang sama.
-- Jika ingin lebih ketat, konsultasikan penggunaan Supabase Auth + service
-- role di sisi server sebelum menerapkan.
-- ============================================================

-- 1) Aktifkan DELETE untuk anon (dipakai tombol Hapus di Panel Admin)
DROP POLICY IF EXISTS "allow_delete_akun_peserta" ON akun_peserta;
CREATE POLICY "allow_delete_akun_peserta"
    ON akun_peserta
    FOR DELETE
    TO anon
    USING (true);

-- ============================================================
-- VERIFIKASI: cek daftar policy tabel akun_peserta
-- ============================================================
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'akun_peserta';

-- Selesai. Kembali ke Panel Admin -> Data Akun Peserta -> tombol 🗑️ Hapus
-- kini berfungsi. Baris uji bernama "ZZ-TEST CRUD (hapus akun ini)"
-- boleh dihapus lewat panel setelah skrip ini dijalankan.
