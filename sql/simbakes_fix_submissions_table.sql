-- =====================================================
-- SIMBAKES: Fix Submissions Table Structure
-- Run this script in Supabase SQL Editor
-- This script ensures all required columns exist
-- =====================================================

-- 1. First, check current table structure (uncomment to run)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'submissions' 
-- ORDER BY ordinal_position;

-- =====================================================
-- 2. Add missing columns for Google Drive Links
-- =====================================================

-- Google Drive Link Fields (replacing base64 file storage)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS foto_drive_link TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS dokumen_drive_link TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS surat_pernyataan_link TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS template_drive_link TEXT;

-- Submission metadata
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_method TEXT DEFAULT 'google_drive_links';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;

-- Education fields
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS jurusan_tujuan TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS jenjang_pendidikan TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS unit_tujuan TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS rencana_tahun TEXT;

-- Work/Position fields
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS posisi TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS unit_kerja TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS penjelasan TEXT;

-- Address fields
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS alamat_domisili TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS lama_domisili TEXT;

-- Contact fields
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS no_wa TEXT;

-- =====================================================
-- 3. Set default values for existing rows (optional)
-- =====================================================

UPDATE submissions 
SET submission_method = COALESCE(submission_method, 'google_drive_links'),
    status = COALESCE(status, 'Proses Verifikasi')
WHERE submission_method IS NULL OR status IS NULL;

-- =====================================================
-- 4. Create indexes for better query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_submissions_nik ON submissions(nik);
CREATE INDEX IF NOT EXISTS idx_submissions_no_register ON submissions(no_register);
CREATE INDEX IF NOT EXISTS idx_submissions_nama_lengkap ON submissions(nama_lengkap);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);

-- =====================================================
-- 5. Verify the table structure after changes
-- =====================================================

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'submissions' 
ORDER BY ordinal_position;

-- =====================================================
-- 6. Test insert with minimal data (uncomment to test)
-- =====================================================
/*
INSERT INTO submissions (
    no_register, 
    nik, 
    nama_lengkap, 
    status, 
    submission_method,
    created_at,
    updated_at
) VALUES (
    'TEST-001',
    '1234567890123456',
    'Test User',
    'Test Entry',
    'google_drive_links',
    NOW(),
    NOW()
);

-- Clean up test entry
DELETE FROM submissions WHERE no_register = 'TEST-001';
*/

-- =====================================================
-- TROUBLESHOOTING GUIDE
-- =====================================================
/*
If you still get errors after running this script:

1. CHECK RLS POLICIES:
   - Go to Authentication > Policies in Supabase Dashboard
   - Ensure INSERT policy allows authenticated/anonymous users
   
2. CHECK REQUIRED FIELDS:
   - Some columns might have NOT NULL constraints
   - Run: SELECT * FROM information_schema.columns 
          WHERE table_name = 'submissions' AND is_nullable = 'NO';

3. CHECK DATA TYPES:
   - Make sure text fields are TEXT or VARCHAR
   - Date fields should be DATE or TIMESTAMPTZ

4. COMMON ERROR CODES:
   - 23505 = Unique violation (duplicate no_register or nik)
   - 42703 = Column does not exist
   - 23502 = Not-null violation
   - 42601 = Syntax error
   - 23514 = Check constraint violation
*/
