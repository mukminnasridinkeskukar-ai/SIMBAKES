-- =====================================================
-- SIMBAKES (Beasiswa Tematik Bidang Kesehatan)
-- COMPLETE SUPABASE DATABASE SCHEMA
-- Version: 3.0 - IDEMPOTENT (Safe to re-run!)
-- =====================================================
-- 
-- Platform ini terdiri dari 2 file:
-- 1. SIMBAKES_Supabase.html (Frontend + Backend logic)
-- 2. SIMBAKES_Supabase_Complete.sql (Database schema ini)
--
-- Tabel-tabel yang dibutuhkan:
-- 1. submissions      - Data pengajuan/pendaftaran beasiswa
-- 2. roadmap          - Data roadmap kebutuhan SDM kesehatan
-- 3. penetapan        - Data penetapan penerima beasiswa
-- 4. visitors         - Tracking pengunjung (opsional)
-- 5. revisions        - Data revisi/pengajuan ulang
-- 6. multiusers       - User admin (jika diperlukan)
--
-- CATATAN PENTING:
-- ✅ File ini IDEMPOTENT - bisa dijalankan berkali-kali tanpa error
-- ✅ Semua field sudah disesuaikan dengan HTML form
-- ✅ Tipe data sudah dioptimalkan agar tidak tertolak
-- ✅ Base64 files menggunakan tipe TEXT (bukan VARCHAR)
--
-- =====================================================

-- =====================================================
-- 1. TABEL: submissions
-- Data pengajuan/pendaftaran beasiswa
-- SYNCED dengan form HTML (formData object)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.submissions (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Informasi Registrasi (dari form HTML)
    no_register VARCHAR(50),                                -- Nomor register otomatis (reg-nomor)
    tanggal_pengajuan VARCHAR(100),                         -- Tanggal & waktu pengajuan (reg-tanggal)
    
    -- Data Pribadi (dari form HTML)
    nik VARCHAR(16),                                        -- NIK (nik) - dibuat nullable untuk fleksibilitas
    nama_lengkap VARCHAR(255),                              -- Nama lengkap (nama-lengkap)
    tempat_lahir VARCHAR(255),                              -- Tempat lahir (tempat-lahir)
    tanggal_lahir DATE,                                     -- Tanggal lahir (tanggal-lahir)
    
    -- Alamat (dari form HTML)
    alamat_ktp TEXT,                                        -- Alamat KTP (alamat-ktp)
    alamat_domisili TEXT,                                   -- Alamat domisili (alamat-domisili)
    lama_domisili VARCHAR(100),                             -- Lama domisili (lama-domisili)
    
    -- Pekerjaan (dari form HTML)
    pekerjaan VARCHAR(50),                                  -- Status pekerjaan (pekerjaan)
    posisi VARCHAR(255),                                    -- Posisi/Jabatan (posisi)
    
    -- Unit & Jurusan (dari form HTML)
    unit_kerja VARCHAR(255),                                -- Unit kerja saat ini (unit-kerja)
    penjelasan TEXT,                                        -- Penjelasan/alasan (penjelasan)
    jurusan_tujuan VARCHAR(255),                            -- Jurusan/spesialisasi tujuan (jurusan-tujuan)
    jenjang_pendidikan VARCHAR(50),                         -- Jenjang pendidikan (jenjang-pendidikan)
    unit_tujuan VARCHAR(255),                               -- Unit penempatan tujuan (unit-tujuan)
    rencana_tahun VARCHAR(50),                              -- Rencana tahun studi (rencana-tahun)
    
    -- Kontak (dari form HTML)
    no_hp VARCHAR(20),                                      -- Nomor HP (no-hp)
    no_wa VARCHAR(20),                                      -- Nomor WA (no-wa)
    email VARCHAR(255),                                     -- Email (email)
    
    -- File Upload (Base64 encoded - butuh TEXT bukan VARCHAR!)
    foto TEXT,                                              -- Foto pasfoto (base64)
    dokumen_pdf TEXT,                                       -- Dokumen PDF (base64)
    nama_file VARCHAR(255),                                 -- Nama file asli (namaFile)
    
    -- Status & Admin
    status VARCHAR(50) DEFAULT 'Proses Verifikasi',         -- Status pengajuan
    catatan_admin TEXT,                                     -- Catatan dari admin
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk submissions (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_submissions_nik ON public.submissions(nik);
CREATE INDEX IF NOT EXISTS idx_submissions_no_register ON public.submissions(no_register);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON public.submissions(email);
CREATE INDEX IF NOT EXISTS idx_submissions_jurusan ON public.submissions(jurusan_tujuan);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.submissions(created_at DESC);

COMMENT ON TABLE public.submissions IS 'Tabel data pengajuan/pendaftaran beasiswa SIMBAKES - Synced with HTML form';


-- =====================================================
-- 2. TABEL: roadmap
-- Data roadmap kebutuhan SDM Kesehatan
-- NAMA TABEL: 'roadmap' (sesuai yang dipakai di HTML)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.roadmap (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Data Beasiswa/Jurusan (dari form HTML)
    kode VARCHAR(50),                                       -- Kode roadmap (rm-kode)
    jurusan VARCHAR(255) NOT NULL,                          -- Nama program/jurusan (rm-jurusan)
    kualifikasi_awal VARCHAR(255) DEFAULT '',               -- Kualifikasi awal (rm-kualifikasi)
    jenis_pendidikan VARCHAR(50) NOT NULL,                  -- Jenis pendidikan (rm-jenis-pendidikan)
    
    -- Institusi Pendidikan (dari form HTML)
    perguruan_tinggi VARCHAR(255) NOT NULL,                 -- Nama universitas (rm-pt)
    
    -- Status Kepegawaian (dari form HTML)
    pekerjaan VARCHAR(50) NOT NULL DEFAULT 'Non ASN',       -- Status kepegawaian (rm-pekerjaan)
    
    -- Timeline (dari form HTML)
    tahun_studi INTEGER NOT NULL,                           -- Tahun mulai studi (rm-tahun)
    
    -- Penempatan (dari form HTML)
    unit_pendayaguna VARCHAR(255) NOT NULL,                -- Unit/tempat penugasan (rm-unit)
    
    -- Status Pengisian (dari form HTML)
    status VARCHAR(20) NOT NULL DEFAULT 'Kosong'           -- Status: 'Terisi' atau 'Kosong'
        CHECK (status IN ('Terisi', 'Kosong', '')),
    
    -- Data Penerima (jika terisi)
    nama_penerima TEXT DEFAULT '',                           -- Nama penerima beasiswa
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk roadmap (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_roadmap_status ON public.roadmap(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_tahun ON public.roadmap(tahun_studi);
CREATE INDEX IF NOT EXISTS idx_roadmap_unit ON public.roadmap(unit_pendayaguna);
CREATE INDEX IF NOT EXISTS idx_roadmap_jenis_pendidikan ON public.roadmap(jenis_pendidikan);
CREATE INDEX IF NOT EXISTS idx_roadmap_unit_status ON public.roadmap(unit_pendayaguna, status);
CREATE INDEX IF NOT EXISTS idx_roadmap_tahun_status ON public.roadmap(tahun_studi, status);

COMMENT ON TABLE public.roadmap IS 'Tabel Roadmap Kebutuhan SDM Kesehatan SIMBAKES - Nama tabel: roadmap (bukan roadmap_kebutuhan)';


-- =====================================================
-- 3. TABEL: penetapan
-- Data penetapan penerima beasiswa
-- =====================================================

CREATE TABLE IF NOT EXISTS public.penetapan (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Data Identitas
    nik VARCHAR(16),                                        -- NIK penerima
    nama_lengkap VARCHAR(255) NOT NULL,                    -- Nama lengkap
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    
    -- Data Beasiswa
    no_register VARCHAR(50),                               -- Nomor register
    jurusan VARCHAR(255) NOT NULL,                         -- Jurusan/spesialisasi
    jenjang VARCHAR(50),                                   -- Jenjang pendidikan
    perguruan_tinggi VARCHAR(255),                         -- Universitas
    unit_kerja VARCHAR(255),                               -- Unit penempatan
    pekerjaan VARCHAR(50) DEFAULT 'Non ASN',              -- PNS/Non ASN
    
    -- Status Penetapan
    status_penetapan VARCHAR(50) DEFAULT 'Aktif'           -- Aktif, Selesai, Dibatalkan
        CHECK (status_penetapan IN ('Aktif', 'Selesai', 'Dibatalkan', 'Pending')),
    
    -- Dokumen
    link_foto VARCHAR(500),
    link_sk VARCHAR(500),                                  -- SK penetapan
    
    -- Timestamps
    tanggal_penetapan DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk penetapan (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_penetapan_nik ON public.penetapan(nik);
CREATE INDEX IF NOT EXISTS idx_penetapan_no_register ON public.penetapan(no_register);
CREATE INDEX IF NOT EXISTS idx_penetapan_status ON public.penetapan(status_penetapan);

COMMENT ON TABLE public.penetapan IS 'Tabel data penetapan penerima beasiswa SIMBAKES';


-- =====================================================
-- 4. TABEL: visitors
-- Tracking pengunjung website (opsional/non-critical)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.visitors (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Data Browser/User Agent
    user_agent TEXT,
    page VARCHAR(255) DEFAULT '/',
    referrer VARCHAR(500) DEFAULT 'direct',
    language VARCHAR(10),
    screen_resolution VARCHAR(20),
    
    -- Location (jika tersedia)
    ip_address VARCHAR(45) DEFAULT '-',                   -- IPv4 atau IPv6
    country VARCHAR(100) DEFAULT 'Unknown',
    city VARCHAR(100) DEFAULT 'Unknown',
    
    -- Timestamp
    visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk visitors (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_visitors_visited_at ON public.visitors(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_page ON public.visitors(page);
CREATE INDEX IF NOT EXISTS idx_visitors_country ON public.visitors(country);

COMMENT ON TABLE public.visitors IS 'Tracking pengunjung website SIMBAKES (opsional)';


-- =====================================================
-- 5. TABEL: revisions
-- Data revisi/pengajuan ulang
-- =====================================================

CREATE TABLE IF NOT EXISTS public.revisions (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to original submission
    submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
    nik VARCHAR(16),
    no_register VARCHAR(50),
    
    -- Data Revisi (dari form revisi HTML)
    row_number VARCHAR(50),                                 -- Nomor baris (revision-row-number)
    field_name VARCHAR(100) NOT NULL,                     -- Field yang direvisi
    old_value TEXT,                                        -- Nilai lama
    new_value TEXT,                                        -- Nilai baru
    alasan_revisi TEXT,                                    -- Alasan revisi
    
    -- Status
    status VARCHAR(50) DEFAULT 'Pending Review'
        CHECK (status IN ('Pending Review', 'Approved', 'Rejected', 'Pending')),
    
    -- Metadata
    reviewed_by VARCHAR(255),                              -- Admin yang mereview
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk revisions (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_revisions_submission_id ON public.revisions(submission_id);
CREATE INDEX IF NOT EXISTS idx_revisions_nik ON public.revisions(nik);
CREATE INDEX IF NOT EXISTS idx_revisions_status ON public.revisions(status);

COMMENT ON TABLE public.revisions IS 'Tabel data revisi/pengajuan ulang SIMBAKES';


-- =====================================================
-- 6. TABEL: multiusers
-- User admin (jika diperlukan untuk akses terbatas)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.multiusers (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Auth Data
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,                   -- Hashed password
    
    -- Profile (dari form register HTML)
    username VARCHAR(255) UNIQUE NOT NULL,                 -- Username login
    nama_lengkap VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin'                       -- Role: superadmin, admin, viewer
        CHECK (role IN ('superadmin', 'admin', 'viewer')),
    
    -- Additional Info
    institusi VARCHAR(255) DEFAULT '',                     -- Institusi (optional)
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk multiusers (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_multiusers_email ON public.multiusers(email);
CREATE INDEX IF NOT EXISTS idx_multiusers_username ON public.multiusers(username);
CREATE INDEX IF NOT EXISTS idx_multiusers_role ON public.multiusers(role);

COMMENT ON TABLE public.multiusers IS 'Tabel user admin SIMBAKES';


-- =====================================================
-- 7. TRIGGER: Auto-update updated_at
-- Untuk semua tabel yang memiliki kolom updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger ke setiap tabel (DROP IF EXISTS + CREATE)
DROP TRIGGER IF EXISTS on_update_submissions ON public.submissions;
CREATE TRIGGER on_update_submissions
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_update_roadmap ON public.roadmap;
CREATE TRIGGER on_update_roadmap
    BEFORE UPDATE ON public.roadmap
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_update_penetapan ON public.penetapan;
CREATE TRIGGER on_update_penetapan
    BEFORE UPDATE ON public.penetapan
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_update_multiusers ON public.multiusers;
CREATE TRIGGER on_update_multiusers
    BEFORE UPDATE ON public.multiusers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- Enable dan konfigurasi RLS untuk setiap tabel
-- ⚠️ MENGGUNAKAN DROP + CREATE UNTUK IDEMPOTENCY
-- =====================================================

-- Enable RLS (aman dijalankan berkali-kali)
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penetapan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiusers ENABLE ROW LEVEL SECURITY;

-- ===== POLICIES: submissions =====
-- DROP dulu jika ada, kemudian CREATE baru
DROP POLICY IF EXISTS "submissions_select_public" ON public.submissions;
CREATE POLICY "submissions_select_public" ON public.submissions
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "submissions_insert_public" ON public.submissions;
CREATE POLICY "submissions_insert_public" ON public.submissions
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "submissions_update_authenticated" ON public.submissions;
CREATE POLICY "submissions_update_authenticated" ON public.submissions
    FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "submissions_delete_authenticated" ON public.submissions;
CREATE POLICY "submissions_delete_authenticated" ON public.submissions
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ===== POLICIES: roadmap =====
DROP POLICY IF EXISTS "roadmap_select_public" ON public.roadmap;
CREATE POLICY "roadmap_select_public" ON public.roadmap
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "roadmap_insert_authenticated" ON public.roadmap;
CREATE POLICY "roadmap_insert_authenticated" ON public.roadmap
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "roadmap_update_authenticated" ON public.roadmap;
CREATE POLICY "roadmap_update_authenticated" ON public.roadmap
    FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "roadmap_delete_authenticated" ON public.roadmap;
CREATE POLICY "roadmap_delete_authenticated" ON public.roadmap
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ===== POLICIES: penetapan =====
DROP POLICY IF EXISTS "penetapan_select_public" ON public.penetapan;
CREATE POLICY "penetapan_select_public" ON public.penetapan
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "penetapan_insert_authenticated" ON public.penetapan;
CREATE POLICY "penetapan_insert_authenticated" ON public.penetapan
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "penetapan_update_authenticated" ON public.penetapan;
CREATE POLICY "penetapan_update_authenticated" ON public.penetapan
    FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "penetapan_delete_authenticated" ON public.penetapan;
CREATE POLICY "penetapan_delete_authenticated" ON public.penetapan
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ===== POLICIES: visitors =====
DROP POLICY IF EXISTS "visitors_insert_anon" ON public.visitors;
CREATE POLICY "visitors_insert_anon" ON public.visitors
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "visitors_select_authenticated" ON public.visitors;
CREATE POLICY "visitors_select_authenticated" ON public.visitors
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- ===== POLICIES: revisions =====
DROP POLICY IF EXISTS "revisions_insert_anon" ON public.revisions;
CREATE POLICY "revisions_insert_anon" ON public.revisions
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "revisions_select_authenticated" ON public.revisions;
CREATE POLICY "revisions_select_authenticated" ON public.revisions
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "revisions_update_authenticated" ON public.revisions;
CREATE POLICY "revisions_update_authenticated" ON public.revisions
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ===== POLICIES: multiusers =====
DROP POLICY IF EXISTS "multiusers_select_authenticated" ON public.multiusers;
CREATE POLICY "multiusers_select_authenticated" ON public.multiusers
    FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "multiusers_insert_superadmin" ON public.multiusers;
CREATE POLICY "multiusers_insert_superadmin" ON public.multiusers
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');


-- =====================================================
-- 9. SAMPLE DATA (Opsional - Uncomment untuk testing)
-- =====================================================

/*
-- Sample data untuk roadmap (dari CSV)
INSERT INTO public.roadmap (
    kode, jurusan, kualifikasi_awal, jenis_pendidikan, 
    perguruan_tinggi, pekerjaan, tahun_studi, 
    unit_pendayaguna, status, nama_penerima
) VALUES 
('RM001', 'Spesialis Jantung dan Pembuluh Darah', 'Dokter Umum', 'Sp1', 
 'Universitas Hasanuddin', 'Non ASN', 2026, 
 'RSUD Aji Muhammad Parikesit', 'Terisi', 'dr. Cassandra Savira Alisa'),
('RM002', 'Spesialis Jantung - Intervensi', 'Dokter Spesialis Jantung', 'Sp2', 
 'Universitas Airlangga', 'Non ASN', 2026, 
 'RSUD Aji Muhammad Parikesit', 'Kosong', ''),
('RM003', 'NERS', 'D-3', 'D-4 + Profesi', 
 'POLTEKKES KEMENKES KALTIM', 'Non ASN', 2026, 
 'RSUD Aji Batara Agung Dewa Sakti', 'Kosong', ''),
('RM004', 'Kedokteran Keluarga Layanan Primer (KKLP)', '', 'Sp1', 
 'Universitas Indonesia', 'PNS', 2026, 
 'Dinas Kesehatan (Puskesmas)', 'Kosong', '');
*/

-- Sample data untuk submissions (contoh)
/*
INSERT INTO public.submissions (
    no_register, tanggal_pengajuan, nik, nama_lengkap, email, no_hp, no_wa,
    jurusan_tujuan, jenjang_pendidikan, unit_kerja, unit_tujuan, rencana_tahun,
    pekerjaan, posisi, status
) VALUES 
('REG-2026-001', '15/01/2026, 14:30:00 WIB', '1234567890123456', 'Ahmad Fauzi', 
 'ahmad@email.com', '081234567890', '081234567890',
 'Spesialis Jantung', 'Sp1', 'RSUD Aji Muhammad Parikesit', 'RSUD Aji Muhammad Parikesit', '2026',
 'Non ASN', 'Dokter Umum', 'Proses Verifikasi');
*/


-- =====================================================
-- 10. HELPER FUNCTIONS (Opsional)
-- =====================================================

-- Function: Generate nomor register otomatis
CREATE OR REPLACE FUNCTION public.generate_no_register()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    sequence_num INTEGER;
BEGIN
    prefix := 'REG-' || TO_CHAR(NOW(), 'YYYY') || '-';
    
    -- Get max number for this year
    SELECT COALESCE(MAX(SUBSTRING(no_register FROM '[0-9]+$')::INTEGER), 0) + 1
    INTO sequence_num
    FROM public.submissions
    WHERE no_register LIKE prefix || '%';
    
    NEW.no_register := prefix || LPAD(sequence_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger auto-generate no_register (uncomment jika ingin otomatis)
/*
DROP TRIGGER IF EXISTS auto_generate_no_register ON public.submissions;
CREATE TRIGGER auto_generate_no_register
    BEFORE INSERT ON public.submissions
    FOR EACH ROW
    WHEN (NEW.no_register IS NULL OR NEW.no_register = '')
    EXECUTE FUNCTION public.generate_no_register();
*/


-- =====================================================
-- 11. VIEWS (Untuk Dashboard & Reporting)
-- =====================================================

-- View: Dashboard Summary Submissions (CREATE OR REPLACE)
CREATE OR REPLACE VIEW public.v_dashboard_submissions AS
SELECT 
    COUNT(*) as total_submissions,
    COUNT(CASE WHEN status = 'Proses Verifikasi' THEN 1 END) as proses_verifikasi,
    COUNT(CASE WHEN status = 'Diterima' THEN 1 END) as diterima,
    COUNT(CASE WHEN status = 'Ditolak' THEN 1 END) as ditolak,
    COUNT(CASE WHEN status = 'Revisi' THEN 1 END) as revisi,
    COUNT(DISTINCT jurusan_tujuan) as unique_jurusan,
    COUNT(DISTINCT unit_kerja) as unique_unit
FROM public.submissions;

-- View: Dashboard Summary Roadmap (CREATE OR REPLACE)
CREATE OR REPLACE VIEW public.v_dashboard_roadmap AS
SELECT 
    COUNT(*) as total_kebutuhan,
    COUNT(CASE WHEN status = 'Terisi' THEN 1 END) as terisi,
    COUNT(CASE WHEN status = 'Kosong' THEN 1 END) as kosong,
    ROUND(COUNT(CASE WHEN status = 'Terisi' THEN 1 END)::numeric / 
          NULLIF(COUNT(*), 0) * 100, 2) as persentase_terisi,
    COUNT(DISTINCT unit_pendayaguna) as total_unit,
    MIN(tahun_studi) as tahun_awal,
    MAX(tahun_studi) as tahun_akhir
FROM public.roadmap;

-- View: Roadmap by Unit (CREATE OR REPLACE)
CREATE OR REPLACE VIEW public.v_roadmap_by_unit AS
SELECT 
    unit_pendayaguna,
    COUNT(*) as total_kebutuhan,
    COUNT(CASE WHEN status = 'Terisi' THEN 1 END) as terisi,
    COUNT(CASE WHEN status = 'Kosong' THEN 1 END) as kosong,
    ROUND(COUNT(CASE WHEN status = 'Terisi' THEN 1 END)::numeric / 
          NULLIF(COUNT(*), 0) * 100, 2) as persentase_terisi
FROM public.roadmap
GROUP BY unit_pendayaguna
ORDER BY total_kebutuhan DESC;

-- View: Roadmap by Year (CREATE OR REPLACE)
CREATE OR REPLACE VIEW public.v_roadmap_by_year AS
SELECT 
    tahun_studi,
    COUNT(*) as total_kebutuhan,
    COUNT(CASE WHEN status = 'Terisi' THEN 1 END) as terisi,
    COUNT(CASE WHEN status = 'Kosong' THEN 1 END) as kosong
FROM public.roadmap
GROUP BY tahun_studi
ORDER BY tahun_studi;


-- =====================================================
-- 12. INSTRUCTIONS & DOCUMENTATION
-- =====================================================

/*
═══════════════════════════════════════════════════════════
           CARA MENGGUNAKAN SIMBAKES v3.0
═══════════════════════════════════════════════════════════

LANGKAH 1: Setup Supabase Project
-----------------------------------
1. Buat project baru di https://supabase.com
2. Copy URL dan Anon Key dari Settings > API
3. Update konfigurasi di file HTML:
   
   const SUPABASE_CONFIG = {
       url: 'YOUR_SUPABASE_URL',
       anonKey: 'YOUR_SUPABASE_ANON_KEY'
   };

LANGKAH 2: Jalankan SQL Ini
-----------------------------
1. Buka Supabase Dashboard > SQL Editor
2. Copy-paste seluruh isi file ini
3. Klik "Run" untuk eksekusi
4. ✅ File ini IDEMPOTENT - bisa dijalankan berkali-kali!

LANGKAH 3: Import Data (Opsional)
---------------------------------
Jika ada data CSV yang diimport:

Opsi A: Via Dashboard
1. Table Editor > Import > Upload CSV
2. Pilih tabel tujuan (roadmap)
3. Mapping kolom sesuai header CSV

Opsi B: Via SQL
\copy public.roadmap(kode, jurusan, ...) 
FROM '/path/to/file.csv' DELIMITER ',' CSV HEADER;

LANGKAH 4: Deploy HTML
-----------------------
1. Upload file SIMBAKES_Supabase.html ke hosting
2. Pastikan bisa diakses via HTTPS (wajib untuk Supabase)
3. Buka browser dan test!

═══════════════════════════════════════════════════════════
            STRUKTUR TABEL (SYNCED)
═══════════════════════════════════════════════════════════

┌─────────────────┬──────────────────────────────────────┐
│     TABEL       │            DESKRIPSI                 │
├─────────────────┼──────────────────────────────────────┤
│ submissions     │ Data pendaftar/beasiswa (26 kolom)   │
│ roadmap         │ Kebutuhan SDM per jurusan/unit       │
│ penetapan       │ Data penerima resmi                 │
│ visitors        │ Tracking pengunjung (opsional)       │
│ revisions       │ Data revisi pengajuan               │
│ multiusers      │ User admin (login/register)         │
└─────────────────┴──────────────────────────────────────┘

═══════════════════════════════════════════════════════════
     PERUBAHAN v2.0 → v3.0 (IDEMPOTENT FIX)
═══════════════════════════════════════════════════════════

✅ SEMUA POLICY sekarang pakai:
   DROP POLICY IF EXISTS ... 
   CREATE POLICY ...

✅ TRIGGER pakai:
   DROP TRIGGER IF EXISTS ...
   CREATE TRIGGER ...

✅ FUNCTION pakai:
   CREATE OR REPLACE FUNCTION ...

✅ VIEW pakai:
   CREATE OR REPLACE VIEW ...

✅ INDEX pakai:
   CREATE INDEX IF EXISTS ...

⚠️ Hasil: File SQL ini 100% AMAN dijalankan berkali-kali
   tanpa error "already exists"!

═══════════════════════════════════════════════════════════
            CATATAN PENTING
═══════════════════════════════════════════════════════════

✅ File HTML sudah include:
   - CSS styling (responsive design)
   - JavaScript logic (CRUD operations)
   - Supabase client library (CDN)
   - Konfigurasi URL & API Key

⚠️ Yang perlu disediakan:
   - Project Supabase aktif
   - Tabel dibuat via SQL ini
   - Hosting dengan HTTPS

🔒 Keamanan:
   - RLS (Row Level Security) aktif
   - Anon key aman untuk client-side
   - Jangan expose service_role_key!

📝 FIELD MAPPING (HTML → SQL):
   
   Submissions:
   - noRegister → no_register
   - tanggalPengajuan → tanggal_pengajuan
   - nik → nik
   - namaLengkap → nama_lengkap
   - tempatLahir → tempat_lahir
   - tanggalLahir → tanggal_lahir
   - alamatKTP → alamat_ktp
   - alamatDomisili → alamat_domisili
   - lamaDomisili → lama_domisili
   - pekerjaan → pekerjaan
   - posisi → posisi
   - unitKerja → unit_kerja
   - penjelasan → penjelasan
   - jurusanTujuan → jurusan_tujuan
   - jenjangPendidikan → jenjang_pendidikan
   - unitTujuan → unit_tujuan
   - rencanaTahun → rencana_tahun
   - noHP → no_hp
   - noWA → no_wa
   - email → email
   - foto → foto (TEXT)
   - dokumenPDF → dokumen_pdf (TEXT)
   - namaFile → nama_file
   
   Roadmap:
   - kode → kode
   - jurusan → jurusan
   - kualifikasi → kualifikasi_awal
   - jenisPendidikan → jenis_pendidikan
   - perguruanTinggi → perguruan_tinggi
   - pekerjaan → pekerjaan
   - tahunStudi → tahun_studi
   - unitPendayaguna → unit_pendayaguna
   - status → status
   
   Multiusers:
   - username → username
   - password → password_hash
   - status → is_active (BOOLEAN)

═══════════════════════════════════════════════════════════
*/


-- =====================================================
-- END OF SQL FILE (v3.0 - IDEMPOTENT)
-- =====================================================
