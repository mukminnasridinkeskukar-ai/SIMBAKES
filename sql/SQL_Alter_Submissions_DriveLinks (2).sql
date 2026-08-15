-- ============================================================================
-- SQL SCRIPT: REVISI TABEL SUBMISSIONS - GOOGLE DRIVE LINKS
-- Dinas Kesehatan Kutai Kartanegara - SIMBAKES
-- ============================================================================ 
-- Deskripsi: Mengubah kolom penyimpanan file dari BASE64/BLOB menjadi TEXT (URL)
-- Tujuan: Menghindari QuotaExceededError dan mengoptimasi penyimpanan
-- Tanggal: 2026-08-15
-- ============================================================================

-- ============================================================
-- BAGIAN 1: TAMBAH KOLOM BARU UNTUK GOOGLE DRIVE LINKS
-- ============================================================

-- 1a. Kolom untuk Link Foto Pasfoto (Google Drive)
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS foto_drive_link TEXT;

COMMENT ON COLUMN submissions.foto_drive_link IS 'Link Google Drive foto pasfoto peserta (format: https://drive.google.com/file/d/...)';

-- 1b. Kolom untuk Link Dokumen PDF Lengkap (Google Drive)
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS dokumen_drive_link TEXT;

COMMENT ON COLUMN submissions.dokumen_drive_link IS 'Link Google Drive dokumen PDF lengkap (KTP, KK, Ijazah, Transkrip, STR, Surat Permohonan)';

-- 1c. Kolom untuk Link Surat Pernyataan (Google Drive)
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS surat_pernyataan_link TEXT;

COMMENT ON COLUMN submissions.surat_pernyataan_link IS 'Link Google Drive surat pernyataan yang sudah ditandatangani';

-- 1d. Kolom untuk Link Template (Opsional - dari admin)
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS template_drive_link TEXT;

COMMENT ON COLUMN submissions.template_drive_link IS 'Link custom template surat pernyataan dari admin (opsional)';

-- 1e. Kolom flag metode submission
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS submission_method VARCHAR(50) DEFAULT 'legacy';

COMMENT ON COLUMN submissions.submission_method IS 'Metode pengiriman: "google_drive_links" atau "legacy" (file upload)';


-- ============================================================
-- BAGIAN 2: UPDATE DATA EXISTING (MIGRATION)
-- ============================================================

-- Update existing records to mark as legacy method
UPDATE submissions 
SET submission_method = 'legacy' 
WHERE submission_method IS NULL OR submission_method = 'legacy';


-- ============================================================
-- BAGIAN 3: SET DEFAULT VALUES UNTUK KOLOM BARU
-- ============================================================

-- Set default values for new columns (optional, depending on your needs)
ALTER TABLE submissions 
ALTER COLUMN foto_drive_link SET DEFAULT NULL;

ALTER TABLE submissions 
ALTER COLUMN dokumen_drive_link SET DEFAULT NULL;

ALTER TABLE submissions 
ALTER COLUMN surat_pernyataan_link SET DEFAULT NULL;

ALTER TABLE submissions 
ALTER COLUMN template_drive_link SET DEFAULT NULL;

ALTER TABLE submissions 
ALTER COLUMN submission_method SET DEFAULT 'google_drive_links';


-- ============================================================
-- BAGIAN 4: BUAT INDEX UNTUK OPTIMASI QUERY (OPSIONAL)
-- ============================================================

-- Index untuk mempercepat pencarian berdasarkan link drive
CREATE INDEX IF NOT EXISTS idx_submissions_foto_drive_link 
ON submissions(foto_drive_link) 
WHERE foto_drive_link IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_dokumen_drive_link 
ON submissions(dokumen_drive_link) 
WHERE dokumen_drive_link IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_surat_pernyataan_link 
ON submissions(surat_pernyataan_link) 
WHERE surat_pernyataan_link IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_submissions_submission_method 
ON submissions(submission_method);


-- ============================================================
-- BAGIAN 5: VALIDASI STRUKTUR (VERIFIKASI)
-- ============================================================

-- Query ini untuk memverifikasi perubahan berhasil
-- Jalankan setelah ALTER TABLE selesai:

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'submissions' 
AND column_name IN (
    'foto_drive_link', 
    'dokumen_drive_link', 
    'surat_pernyataan_link', 
    'template_drive_link', 
    'submission_method'
)
ORDER BY ordinal_position;


-- ============================================================
-- BAGIAN 6: SAMPLE QUERY UNTUK MENGAMBIL DATA DENGAN LINKS
-- ============================================================

-- Contoh query untuk mengambil data submission dengan semua link drive:
SELECT 
    id,
    no_register,
    nama_lengkap,
    nik,
    -- Link Google Drive (FORMAT BARU)
    foto_drive_link AS "Link Foto Pasfoto",
    dokumen_drive_link AS "Link Dokumen PDF",
    surat_pernyataan_link AS "Link Surat Pernyataan",
    template_drive_link AS "Link Template",
    submission_method AS "Metode Pengiriman",
    status,
    created_at
FROM submissions 
WHERE submission_method = 'google_drive_links'
ORDER BY created_at DESC;


-- ============================================================
-- CATATAN PENTING:
-- ============================================================
--
-- 1. KOLOM LAMA (BASE64) TIDAK DIHAPUS:
--    - Kolom 'foto' dan 'dokumen_pdf' (jika ada) dibiarkan tetap ada
--    - Data lama tetap bisa diakses
--    - Hindari breaking change untuk data existing
--
-- 2. KOMPATIBILITAS HTML:
--    - Form HTML sudah menggunakan field berikut:
--      * #foto-drive-link → foto_drive_link
--      * #dokumen-drive-link → dokumen_drive_link  
--      * #surat-pernyataan-link → surat_pernyataan_link
--      * #template-drive-link → template_drive_link
--
-- 3. RLS (ROW LEVEL SECURITY):
--    - Pastikan policy RLS mengizinkan akses ke kolom baru
--    - Jika perlu, update policy dengan INCLUDE kolom baru
--
-- 4. BACKUP SEBELUM JALANKAN:
--    - Selalu backup tabel sebelum menjalankan ALTER TABLE
--    - Contoh: CREATE TABLE submissions_backup AS SELECT * FROM submissions;
--

-- ============================================================
-- AKHIR SQL SCRIPT
-- ============================================================
