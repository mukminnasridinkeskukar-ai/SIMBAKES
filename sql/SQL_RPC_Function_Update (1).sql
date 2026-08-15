-- ============================================================================
-- SQL SCRIPT: UPDATE RPC FUNCTION UNTUK SUBMISSIONS DENGAN DRIVE LINKS
-- Dinas Kesehatan Kutai Kartanegara - SIMBAKES
-- ============================================================================ 
-- Deskripsi: Update fungsi RPC fn_submit_pengajuan untuk menerima Google Drive links
-- Catatan: Jalankan ini jika ada custom RPC function untuk insert submissions
-- ============================================================================

-- ============================================================
-- OPSIONAL 1: UPDATE RPC FUNCTION (JIK ADA)
-- ============================================================

-- Jika Anda memiliki custom RPC function seperti fn_submit_pengajuan,
-- update parameter dan INSERT statement untuk menyimpan drive links:

/*
CREATE OR REPLACE FUNCTION public.fn_submit_pengajuan(
    p_nama_lengkap TEXT,
    p_nik TEXT,
    -- ... parameter lainnya ...
    
    -- PARAMETER BARU - Google Drive Links (ganti base64)
    p_foto_drive_link TEXT DEFAULT NULL,
    p_dokumen_drive_link TEXT DEFAULT NULL,
    p_surat_pernyataan_link TEXT DEFAULT NULL,
    p_template_drive_link TEXT DEFAULT NULL,
    p_submission_method VARCHAR(50) DEFAULT 'google_drive_links'
    
    -- HAPUS PARAMETER LAMA (base64):
    -- p_foto BYTEA DEFAULT NULL,  -- ← Hapus ini
    -- p_dokumen_pdf BYTEA DEFAULT NULL  -- ← Hapus ini
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    submission_id BIGINT
) AS $$
DECLARE
    v_submission_id BIGINT;
    v_no_register TEXT;
BEGIN
    -- Generate nomor register
    v_no_register := 'REG-SIMBAKES-' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(
        (SELECT COUNT(*) + 1 FROM submissions WHERE DATE(created_at) = CURRENT_DATE)::TEXT, 
        3, 
        '0'
    );
    
    -- Insert ke tabel submissions dengan kolom baru
    INSERT INTO submissions (
        no_register,
        nama_lengkap,
        nik,
        -- ... kolom lainnya ...
        
        -- KOLOM BARU - Google Drive Links
        foto_drive_link,
        dokumen_drive_link,
        surat_pernyataan_link,
        template_drive_link,
        submission_method
        
        -- JANGAN INSERT KOLOM LAMA:
        -- foto,  -- ← Hapus ini
        -- dokumen_pdf  -- ← Hapus ini
    ) VALUES (
        v_no_register,
        p_nama_lengkap,
        p_nik,
        -- ... nilai lainnya ...
        
        -- NILAI BARU - Google Drive Links
        p_foto_drive_link,
        p_dokumen_drive_link,
        p_surat_pernyataan_link,
        p_template_drive_link,
        p_submission_method
    )
    RETURNING id INTO v_submission_id;
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE AS success,
        'Pengajuan berhasil disimpan dengan link Google Drive' AS message,
        v_submission_id AS submission_id;
        
RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/


-- ============================================================
-- OPSIONAL 2: CREATE TRIGGER UNTUK VALIDASI LINK (ADVANCED)
-- ============================================================

/*
-- Trigger function untuk validasi format Google Drive link
CREATE OR REPLACE FUNCTION public.validate_drive_links()
RETURNS TRIGGER AS $$
BEGIN
    -- Validasi foto_drive_link jika diisi
    IF NEW.foto_drive_link IS NOT NULL THEN
        IF NEW.foto_drive_link !~ '^https?://(www\.)?drive\.google\.com/' THEN
            RAISE EXCEPTION 'Format link foto Drive tidak valid. Gunakan link sharing Google Drive';
        END IF;
    END IF;
    
    -- Validasi dokumen_drive_link jika diisi
    IF NEW.dokumen_drive_link IS NOT NULL THEN
        IF NEW.dokumen_drive_link !~ '^https?://(www\.)?drive\.google\.com/' THEN
            RAISE EXCEPTION 'Format link dokumen Drive tidak valid. Gunakan link sharing Google Drive';
        END IF;
    END IF;
    
    -- Validasi surat_pernyataan_link jika diisi
    IF NEW.surat_pernyataan_link IS NOT NULL THEN
        IF NEW.surat_pernyataan_link !~ '^https?://(www\.)?drive\.google\.com/' THEN
            RAISE EXCEPTION 'Format link surat pernyataan Drive tidak valid';
        END IF;
    END IF;
    
    -- Set submission method otomatis
    IF NEW.foto_drive_link IS NOT NULL OR NEW.dokumen_drive_link IS NOT NULL THEN
        NEW.submission_method := 'google_drive_links';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger ke tabel submissions
DROP TRIGGER IF EXISTS trg_submissions_validate_drive_links ON submissions;
CREATE TRIGGER trg_submissions_validate_drive_links
    BEFORE INSERT OR UPDATE ON submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_drive_links();
*/


-- ============================================================
-- OPSIONAL 3: VIEW UNTUK MUDAH QUERY SUBMISSIONS
-- ============================================================

/*
-- Buat view yang menampilkan data dengan format yang mudah dibaca
CREATE OR REPLACE VIEW vw_submissions_with_links AS
SELECT 
    s.id,
    s.no_register,
    s.nama_lengkap,
    s.nik,
    s.email,
    s.jurusan_tujuan,
    s.jenjang_pendidikan,
    s.unit_tujuan,
    s.status,
    
    -- Link Google Drive (kolom baru)
    s.foto_drive_link,
    s.dokumen_drive_link,
    s.surat_pernyataan_link,
    s.template_drive_link,
    s.submission_method,
    
    -- Metadata
    s.created_at,
    s.updated_at
    
FROM submissions s;

COMMENT ON VIEW vw_submissions_with_links IS 
'View untuk menampilkan submissions dengan Google Drive links - SIMBAKES';
*/


-- ============================================================
-- VERIFIKASI: CEK STRUKTUR SETELAH UPDATE
-- ============================================================

-- Query untuk memastikan semua kolom sudah benar
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'submissions'
ORDER BY ordinal_position;


-- ============================================================
-- AKHIR SQL SCRIPT - RPC & TRIGGER UPDATE
-- ============================================================
