-- ============================================================
-- SIMBAKES — Task 9i: Catatan Penetapan + Status Lengkap
-- ============================================================
-- Tujuan:
--   1. Menambah kolom `catatan_penetapan` pada tabel `penetapan`
--      (catatan admin yang tampil di halaman "Cek Status Penetapan"
--      peserta setelah login).
--   2. Melebarkan constraint status penetapan. Sebelumnya hanya
--      'Pending' / 'Aktif' yang diterima database, padahal form admin
--      menyediakan 5 status: Pending, Aktif, Dalam Proses, Lulus,
--      Ditolak — sehingga simpanan dengan 3 status terakhir ditolak
--      database (error 23514).
--
-- Cara pakai : Supabase Dashboard → SQL Editor → New query →
--              paste seluruh isi file ini → Run.
-- Idempotent : aman dijalankan berulang kali.
-- ============================================================

-- ---------- 1. Kolom catatan_penetapan ----------
ALTER TABLE public.penetapan
    ADD COLUMN IF NOT EXISTS catatan_penetapan text;

COMMENT ON COLUMN public.penetapan.catatan_penetapan IS
    'Catatan admin untuk peserta, tampil di Cek Status Penetapan (boleh kosong)';

-- ---------- 2. Lebarkan check constraint status ----------
-- Hapus constraint lama bila ada, lalu buat ulang dengan 5 status.
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

-- ---------- 3. Verifikasi cepat ----------
-- Jalankan manual bila ingin memastikan:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'penetapan' AND column_name = 'catatan_penetapan';
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conname = 'penetapan_status_check';
--
-- Catatan RLS: SELECT/INSERT/UPDATE yang sudah ada di tabel penetapan
-- otomatis mencakup kolom baru; tidak perlu policy tambahan.
-- Catatan data: nilai status lama ('Pending'/'Aktif') tetap valid
-- dengan constraint baru — tidak ada migrasi data yang diperlukan.
