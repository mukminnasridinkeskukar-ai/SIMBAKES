-- =====================================================
-- SIMBAKES: KOMPREHENSIF FIX SEMUA MASALAH
-- Version: 3.0 - COMPLETE FIX
-- =====================================================
-- 
-- JALANKAN SCRIPT INI DI SUPABASE SQL EDITOR
-- Memperbaiki:
-- 1. Error 401 Unauthorized pada registrasi
-- 2. Error role_check constraint
-- 3. RLS Policy untuk semua tabel
--
-- CARA PAKAI:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy-paste SELURUH isi file ini
-- 3. Klik Run
-- 4. Tunggu hingga selesai
-- =====================================================

-- ===== STEP 1: FIX MULTIUSERS TABLE =====

-- 1a. Hapus constraint lama jika ada
ALTER TABLE public.multiusers DROP CONSTRAINT IF EXISTS multiusers_role_check;

-- 1b. Buat constraint baru yang lebih fleksibel (mendukung semua role)
ALTER TABLE public.multiusers ADD CONSTRAINT multiusers_role_check 
    CHECK (role IN ('superadmin', 'admin', 'viewer', 'peserta', 'admin_sekolah', 'admin_dinkes', 'reviewer'));

-- 1c. Disable RLS sementara
ALTER TABLE public.multiusers DISABLE ROW LEVEL SECURITY;

-- 1d. Hapus semua policy lama
DROP POLICY IF EXISTS "multiusers_select_public" ON public.multiusers;
DROP POLICY IF EXISTS "multiusers_select_authenticated" ON public.multiusers;
DROP POLICY IF EXISTS "multiusers_insert_public" ON public.multiusers;
DROP POLICY IF EXISTS "multiusers_update_authenticated" ON public.multiusers;
DROP POLICY IF EXISTS "multiusers_delete_authenticated" ON public.multiusers;

-- 1e. Enable RLS kembali
ALTER TABLE public.multiusers ENABLE ROW LEVEL SECURITY;

-- 1f. Buat policy baru YANG SANGAT PERMISSIVE
-- SELECT: Izinkan SEMUA orang (anonymous + authenticated) - penting untuk cek duplikat user
CREATE POLICY "multiusers_select_public" ON public.multiusers
    FOR SELECT
    USING (true);

-- INSERT: IZINKAN TANPA AUTHENTIKASI (form registrasi publik)
CREATE POLICY "multiusers_insert_public" ON public.multiusers
    FOR INSERT
    WITH CHECK (true);

-- UPDATE: Izinkan authenticated users
CREATE POLICY "multiusers_update_authenticated" ON public.multiusers
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- DELETE: Hanya superadmin atau authenticated
CREATE POLICY "multiusers_delete_authenticated" ON public.multiusers
    FOR DELETE
    USING (auth.role() = 'authenticated');


-- ===== STEP 2: FIX SUBMISSIONS TABLE (jika ada masalah) =====

ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions_select_public" ON public.submissions;
DROP POLICY IF EXISTS "submissions_insert_public" ON public.submissions;
DROP POLICY IF EXISTS "submissions_update_authenticated" ON public.submissions;
DROP POLICY IF EXISTS "submissions_delete_authenticated" ON public.submissions;

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_select_public" ON public.submissions
    FOR SELECT
    USING (true);

CREATE POLICY "submissions_insert_public" ON public.submissions
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "submissions_update_authenticated" ON public.submissions
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "submissions_delete_authenticated" ON public.submissions
    FOR DELETE
    USING (auth.role() = 'authenticated');


-- ===== STEP 3: FIX ROADMAP TABLE =====

ALTER TABLE public.roadmap DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roadmap_select_public" ON public.roadmap;
DROP POLICY IF EXISTS "roadmap_insert_public" ON public.roadmap;
DROP POLICY IF EXISTS "roadmap_update_authenticated" ON public.roadmap;
DROP POLICY IF EXISTS "roadmap_delete_authenticated" ON public.roadmap;

ALTER TABLE public.roadmap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap_select_public" ON public.roadmap
    FOR SELECT
    USING (true);

CREATE POLICY "roadmap_insert_public" ON public.roadmap
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "roadmap_update_authenticated" ON public.roadmap
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "roadmap_delete_authenticated" ON public.roadmap
    FOR DELETE
    USING (auth.role() = 'authenticated');


-- ===== STEP 4: FIX PENETAPAN TABLE =====

ALTER TABLE public.penetapan DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "penetapan_select_public" ON public.penetapan;
DROP POLICY IF EXISTS "penetapan_insert_public" ON public.penetapan;
DROP POLICY IF EXISTS "penetapan_update_authenticated" ON public.penetapan;
DROP POLICY IF EXISTS "penetapan_delete_authenticated" ON public.penetapan;

ALTER TABLE public.penetapan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "penetapan_select_public" ON public.penetapan
    FOR SELECT
    USING (true);

CREATE POLICY "penetapan_insert_public" ON public.penetapan
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "penetapan_update_authenticated" ON public.penetapan
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "penetapan_delete_authenticated" ON public.penetapan
    FOR DELETE
    USING (auth.role() = 'authenticated');


-- ===== STEP 5: FIX REVISIONS TABLE =====

ALTER TABLE public.revisions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "revisions_select_public" ON public.revisions;
DROP POLICY IF EXISTS "revisions_insert_public" ON public.revisions;
DROP POLICY IF EXISTS "revisions_update_authenticated" ON public.revisions;
DROP POLICY IF EXISTS "revisions_delete_authenticated" ON public.revisions;

ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revisions_select_public" ON public.revisions
    FOR SELECT
    USING (true);

CREATE POLICY "revisions_insert_public" ON public.revisions
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "revisions_update_authenticated" ON public.revisions
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "revisions_delete_authenticated" ON public.revisions
    FOR DELETE
    USING (auth.role() = 'authenticated');


-- ===== STEP 6: FIX VISITORS TABLE =====

ALTER TABLE public.visitors DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visitors_select_public" ON public.visitors;
DROP POLICY IF EXISTS "visitors_insert_public" ON public.visitors;

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitors_select_public" ON public.visitors
    FOR SELECT
    USING (true);

CREATE POLICY "visitors_insert_public" ON public.visitors
    FOR INSERT
    WITH CHECK (true);


-- ===== STEP 7: VERIFIKASI =====

-- Cek semua policy yang sudah dibuat
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'WITH CONDITION'
        ELSE 'NO CONDITION'
    END as condition_status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Cek constraint multiusers
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.multiusers'::regclass;


-- ===== STEP 8: TEST INSERT (optional - uncomment untuk test) =====
/*
-- Test insert ke multiusers
INSERT INTO public.multiusers (email, password_hash, username, nama_lengkap, role) 
VALUES ('test_fix@test.com', 'test123', 'testuser_fix', 'Test User Fix', 'viewer')
ON CONFLICT (email) DO NOTHING;

-- Verifikasi data masuk
SELECT id, email, username, nama_lengkap, role, is_active, created_at 
FROM public.multiusers 
WHERE email = 'test_fix@test.com';

-- Cleanup test data
DELETE FROM public.multiusers WHERE email = 'test_fix@test.com';
*/


-- ===== SELESAI =====
-- Jika berhasil, Anda akan melihat:
-- 1. Daftar policy untuk setiap tabel (SELECT, INSERT, UPDATE, DELETE)
-- 2. Constraint multiusers_role_check dengan semua role yang valid
--
-- Setelah ini:
-- 1. Refresh halaman SIMBAKES
-- 2. Coba Daftar Akun - harus berhasil!
-- 3. Buka Panel Admin → Data Roadmap - data harus tampil!
