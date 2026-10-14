-- ============================================================
-- SIMBAKES — PATCH: TOMBOL "TAMBAH DATA" DI MENU DATA PENETAPAN
-- (REVISI 15 OKT h)
-- ============================================================
-- Tujuan: memastikan tambah/edit/hapus data penetapan TERSIMPAN
-- dengan baik ke Supabase oleh admin (dan operator bila suatu saat
-- menu dibuka untuknya), tanpa terhalang grant/policy/kolom/constraint.
--
-- Isi patch:
--   1. GRANT DML tabel penetapan untuk role anon (jaga-jaga bila
--      default privileges Supabase berubah — tanpa grant ini semua
--      INSERT/UPDATE/DELETE dari aplikasi ditolak 401/42501 walau
--      RLS mengizinkan).
--   2. RLS penetapan tulis dinaikkan dari ladder 'superadmin' saja
--      menjadi ladder 'write' (= superadmin + operator + admin),
--      PERSIS seperti policy submissions_update_admin. Ini juga
--      menyembuhkan sesi lama ber-role 'admin' yang sebelumnya
--      ditolak policy 'superadmin'.
--   3. Kolom catatan_penetapan + constraint 5 status
--      (Pending/Aktif/Dalam Proses/Lulus/Ditolak) — sama dengan
--      sql/penetapan-catatan-status.sql; dimasukkan agar CUKUP
--      menjalankan SATU patch ini.
--
-- Cara pakai : Supabase Dashboard → SQL Editor → New query →
--              paste seluruh isi file ini → Run.
-- Idempotent : aman dijalankan berulang kali.
-- ============================================================

-- ---------- 1. GRANT tabel penetapan (role anon dipakai aplikasi) ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.penetapan TO anon;

-- ---------- 2. RLS: policy tulis penetapan memakai ladder 'write' ----------
ALTER TABLE public.penetapan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "penetapan_select_public" ON public.penetapan;
DROP POLICY IF EXISTS "penetapan_write_admin"   ON public.penetapan;

CREATE POLICY "penetapan_select_public"
    ON public.penetapan FOR SELECT TO anon
    USING (true);

-- Ladder 'write' = superadmin / operator / admin (admin dinormalisasi
-- menjadi superadmin saat login; sesi legacy 'admin' juga diterima).
-- Viewer/observer/peserta TETAP ditolak untuk semua operasi tulis.
CREATE POLICY "penetapan_write_admin"
    ON public.penetapan FOR ALL TO anon
    USING (public.app_is_valid_session('write'))
    WITH CHECK (public.app_is_valid_session('write'));

-- ---------- 3. Kolom catatan_penetapan + constraint 5 status ----------
ALTER TABLE public.penetapan
    ADD COLUMN IF NOT EXISTS catatan_penetapan text;

COMMENT ON COLUMN public.penetapan.catatan_penetapan IS
    'Catatan admin untuk peserta, tampil di Cek Status Penetapan (boleh kosong)';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'penetapan_status_check'
          AND conrelid = 'public.penetapan'::regclass
    ) THEN
        ALTER TABLE public.penetapan
            DROP CONSTRAINT penetapan_status_check;
    END IF;
END $$;

ALTER TABLE public.penetapan
    ADD CONSTRAINT penetapan_status_check
    CHECK (status_penetapan IN ('Pending', 'Aktif', 'Dalam Proses', 'Lulus', 'Ditolak'));

-- ---------- 4. Verifikasi cepat (opsional, lihat hasil di output) ----------
-- a) Policy aktif:
--    SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'penetapan';
-- b) Grant anon:
--    SELECT privilege_type FROM information_schema.role_table_grants
--      WHERE table_schema='public' AND table_name='penetapan' AND grantee='anon';
-- c) Constraint status:
--    SELECT pg_get_constraintdef(oid) FROM pg_constraint
--      WHERE conname = 'penetapan_status_check';
--
-- Catatan: jika status_penetapan lama berisi nilai di luar 5 nilai resmi,
-- pembuatan constraint akan gagal dengan pesan daftar baris pelanggar —
-- perbaiki nilainya dulu (UPDATE ... SET status_penetapan='Pending' WHERE ...).
-- ============================================================
