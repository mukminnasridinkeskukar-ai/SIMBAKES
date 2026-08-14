-- =====================================================
-- FIX RLS MULTIUSERS - Izinkan Registrasi Publik
-- =====================================================
-- 
-- ERROR: "new row violates row-level security policy for table 'multiusers'"
--
-- PENYEBAB:
-- 1. Policy INSERT masih memerlukan autentikasi
-- 2. Atau policy belum ter-update dengan benar
--
-- CARA PAKAI:
-- 1. Copy seluruh isi file ini
-- 2. Paste di Supabase SQL Editor
-- 3. Klik "Run"
-- 4. Coba daftar akun lagi
--
-- =====================================================

-- =====================================================
-- LANGKAH 1: Hapus SEMUA policy lama untuk multiusers
-- =====================================================

DROP POLICY IF EXISTS "multiusers_select_authenticated" ON public.multiusers;
DROP POLICY IF EXISTS "multiusers_insert_superadmin" ON public.multiusers;
DROP POLICY IF EXISTS "multiusers_insert_public" ON public.multiusers;
DROP POLICY IF EXISTS "multiusers_update_authenticated" ON public.multiusers;
DROP POLICY IF EXISTS "multiusers_delete_authenticated" ON public.multiusers;

-- =====================================================
-- LANGKAH 2: Buat policy BARU yang benar
-- =====================================================

-- Policy SELECT: Hanya user login yang bisa lihat data user
CREATE POLICY "multiusers_select_authenticated" ON public.multiusers
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy INSERT: IZINKAN SEMUA ORANG (untuk registrasi publik)
-- ⚠️ Ini WAJIB agar form registrasi bisa berfungsi!
CREATE POLICY "multiusers_insert_public" ON public.multiusers
    FOR INSERT
    WITH CHECK (true);

-- Policy UPDATE: Hanya user login yang bisa update
CREATE POLICY "multiusers_update_authenticated" ON public.multiusers
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Policy DELETE: Hanya user login yang bisa delete (admin only)
CREATE POLICY "multiusers_delete_authenticated" ON public.multiusers
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- =====================================================
-- LANGKAH 3: Verifikasi policy sudah benar
-- =====================================================

-- Cek policy yang aktif saat ini
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'multiusers';

-- =====================================================
-- HASIL YANG DIHARAPKAN:
-- =====================================================
--
-- Seharusnya muncul 4 baris:
-- 1. multiusers_insert_public        | INSERT | true (WITH CHECK)
-- 2. multiusers_select_authenticated | SELECT | auth.role() = 'authenticated'
-- 3. multiusers_update_authenticated | UPDATE | auth.role() = 'authenticated'
-- 4. multiusers_delete_authenticated | DELETE | auth.role() = 'authenticated'
--
-- Jika hasilnya sudah seperti di atas = ✅ BERHASIL!
-- Silakan coba daftar akun lagi.
--

-- =====================================================
-- TROUBLESHOOTING (jika masih error)
-- =====================================================

/*
-- Jika masih gagal, cek apakah ada trigger atau constraint yang bermasalah:

-- 1. Cek constraint pada tabel
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.multiusers'::regclass;

-- 2. Cek trigger
SELECT tgname, proname 
FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid 
WHERE tgrelid = 'public.multiusers'::regclass;

-- 3. Cek data existing (apakah ada duplikat?)
SELECT email, username, COUNT(*) 
FROM public.multiusers 
GROUP BY email, username 
HAVING COUNT(*) > 1;

-- 4. Test insert langsung (debug)
INSERT INTO public.multiusers (
    email, password_hash, username, nama_lengkap, role, is_active
) VALUES (
    'test@test.com', 'test123', 'testuser', 'Test User', 'admin', true
);
*/

-- =====================================================
-- END OF FIX
-- =====================================================
