-- =====================================================
-- SIMBAKES - Database Setup & Verification Script
-- Run this in Supabase SQL Editor to verify/create tables
-- URL: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =====================================================

-- =====================================================
-- PART 1: SUBMISSIONS TABLE (for Cek Status Pengajuan)
-- =====================================================

-- Check if submissions table exists, create if not
CREATE TABLE IF NOT EXISTS submissions (
    id BIGSERIAL PRIMARY KEY,
    no_register TEXT UNIQUE,
    tanggal_pengajuan DATE,
    
    -- Data Pribadi
    nik TEXT,
    nama_lengkap TEXT,
    tempat_lahir TEXT,
    tanggal_lahir DATE,
    
    -- Alamat
    alamat_ktp TEXT,
    alamat_domisili TEXT,
    lama_domisili TEXT,
    
    -- Pekerjaan
    pekerjaan TEXT,
    posisi TEXT,
    unit_kerja TEXT,
    penjelasan TEXT,
    
    -- Pendidikan
    jurusan_tujuan TEXT,
    jenjang_pendidikan TEXT,
    unit_tujuan TEXT,
    rencana_tahun TEXT,
    
    -- Kontak
    no_hp TEXT,
    no_wa TEXT,
    email TEXT,
    
    -- Google Drive Links (NEW - replacing base64 files)
    foto_drive_link TEXT,
    dokumen_drive_link TEXT,
    surat_pernyataan_link TEXT,
    template_drive_link TEXT,
    
    -- Legacy file fields (kept for compatibility, set to NULL)
    foto TEXT DEFAULT NULL,
    dokumen_pdf TEXT DEFAULT NULL,
    nama_file TEXT DEFAULT NULL,
    
    -- Status & Metadata
    status TEXT DEFAULT 'Proses Verifikasi',
    submission_method TEXT DEFAULT 'google_drive_links',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_no_register ON submissions(no_register);
CREATE INDEX IF NOT EXISTS idx_submissions_nik ON submissions(nik);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous read access (for status checking)
CREATE POLICY "Allow anonymous read access" ON submissions
    FOR SELECT USING (true);

-- Create policy for anonymous insert (for form submissions)
CREATE POLICY "Allow anonymous insert" ON submissions
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- PART 2: PENETAPAN TABLE (for Cek Status Penetapan)
-- =====================================================

-- Check if penetapan table exists, create if not
CREATE TABLE IF NOT EXISTS penetapan (
    id BIGSERIAL PRIMARY KEY,
    
    -- Data Pribadi
    nik TEXT UNIQUE,
    nama_lengkap TEXT,
    tempat_lahir TEXT,
    tanggal_lahir DATE,
    
    -- Informasi Register
    no_register TEXT,
    
    -- Data Penetapan
    no_sk_penetapan TEXT,
    tanggal_penetapan DATE,
    status_penetapan TEXT DEFAULT 'Pending',
    catatan_penetapan TEXT,
    
    -- Data Pendidikan
    jurusan_tujuan TEXT,
    jenjang_pendidikan TEXT,
    unit_tujuan TEXT,
    tahun_studi TEXT,
    
    -- Data Keuangan (jika ada)
    nilai TEXT,
    periode TEXT,
    nomor_rekening TEXT,
    nama_bank TEXT,
    atas_nama TEXT,
    
    -- Foto & Dokumen
    link_foto TEXT,
    link_dokumen TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for penetapan table
CREATE INDEX IF NOT EXISTS idx_penetapan_nik ON penetapan(nik);
CREATE INDEX IF NOT EXISTS idx_penetapan_no_register ON penetapan(no_register);
CREATE INDEX IF NOT EXISTS idx_penetapan_status ON penetapan(status_penetapan);
CREATE INDEX IF NOT EXISTS idx_penetapan_jurusan ON penetapan(jurusan_tujuan);

-- Enable Row Level Security (RLS) for penetapan
ALTER TABLE penetapan ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous read access (for status checking)
CREATE POLICY "Allow anonymous read access" ON penetapan
    FOR SELECT USING (true);

-- =====================================================
-- PART 3: VERIFICATION QUERIES
-- Run these to verify tables are set up correctly
-- =====================================================

-- Verify submissions table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'submissions' 
ORDER BY ordinal_position;

-- Verify penetapan table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'penetapan' 
ORDER BY ordinal_position;

-- Count records in each table
SELECT 'submissions' as table_name, COUNT(*) as record_count FROM submissions
UNION ALL
SELECT 'penetapan', COUNT(*) FROM penetapan;

-- Test insert into submissions (uncomment to test)
/*
INSERT INTO submissions (
    no_register,
    nik,
    nama_lengkap,
    email,
    jurusan_tujuan,
    status,
    foto_drive_link,
    dokumen_drive_link
) VALUES (
    'TEST-001',
    '1234567890123456',
    'Test User',
    'test@example.com',
    'Keperawatan',
    'Proses Verifikasi',
    'https://drive.google.com/file/test-foto',
    'https://drive.google.com/file/test-dokumen'
);

-- Clean up test data
DELETE FROM submissions WHERE no_register = 'TEST-001';
*/

-- Test insert into penetapan (uncomment to test)
/*
INSERT INTO penetapan (
    nik,
    nama_lengkap,
    no_register,
    jurusan_tujuan,
    status_penetapan
) VALUES (
    '1234567890123456',
    'Test User',
    'TEST-001',
    'Keperawatan',
    'Lulus'
);

-- Clean up test data
DELETE FROM penetapan WHERE nik = '1234567890123456';
*/

-- =====================================================
-- TROUBLESHOOTING GUIDE
-- =====================================================
--
-- If you get errors:
--
-- 1. "relation does not exist" → Table doesn't exist, run CREATE TABLE above
-- 2. "column does not exist" → Column missing, check table structure
-- 3. "permission denied" → RLS policy issue, check policies above
-- 4. "duplicate key value" → Unique constraint violation, check no_register/nik
-- 5. "Supabase client tidak tersedia" → JavaScript issue, check browser console
--
-- COMMON FIXES:
-- - Make sure Supabase URL and Anon Key are correct in HTML file
-- - Clear browser cache and reload
-- - Check browser console for detailed error messages
-- - Verify internet connection
--
-- =====================================================
