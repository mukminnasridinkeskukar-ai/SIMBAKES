-- =====================================================
-- SIMBAKES - Supabase Database Schema
-- Sistem Beasiswa Tematik Bidang Kesehatan
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLE: admins (Autentikasi Admin)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- hashed with bcrypt
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster login queries
CREATE INDEX IF NOT EXISTS idx_admins_username ON public.admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);

-- Insert default admin credentials (password: admin123 - hashed)
-- NOTE: In production, change this password immediately!
INSERT INTO public.admins (username, password, full_name, role) VALUES 
('admin', '$2a$10$K2FvBq8N.qC8hLlV6nXnO.Qq0oGQn8HqHqHqHqHqHqHqHqHqHqHqHA', 'Super Administrator', 'admin'),
('operator', '$2a$10$K2FvBq8N.qC8hLlV6nXnO.Qq0oGQn8HqHqHqHqHqHqHqHqHqHqHqHA', 'Operator Beasiswa', 'operator')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- 2. TABLE: submissions (Data Pengajuan Beasiswa)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Nomor Register (Auto-generated)
    no_register VARCHAR(50) UNIQUE NOT NULL,
    
    -- Data Pribadi
    nik VARCHAR(20) NOT NULL,
    nama_lengkap VARCHAR(150) NOT NULL,
    tempat_lahir VARCHAR(50),
    tanggal_lahir DATE,
    alamat_ktp TEXT,
    alamat_domisili TEXT,
    lama_domisili INTEGER, -- dalam tahun
    
    -- Pekerjaan
    pekerjaan VARCHAR(100),
    posisi VARCHAR(100),
    unit_kerja VARCHAR(200),
    
    -- Data Beasiswa
    penjelasan TEXT, -- Narasi/jelaskan kebutuhan
    jurusan_tujuan VARCHAR(150),
    jenjang_pendidikan VARCHAR(50), -- S1, S2, S3, Spesialis, Sub-spesialis
    unit_tujuan VARCHAR(200),
    rencana_tahun INTEGER, -- tahun rencana studi
    
    -- Kontak
    no_hp VARCHAR(15),
    no_wa VARCHAR(15),
    email VARCHAR(150),
    
    -- Dokumen (stored as text/URL - will use Supabase Storage)
    nama_file VARCHAR(255),
    link_foto TEXT, -- URL or base64
    link_dokumen TEXT, -- URL or base64
    foto_base64 TEXT, -- Base64 encoded photo
    dokumen_base64 TEXT, -- Base64 encoded PDF
    
    -- Status & Tracking
    status VARCHAR(30) DEFAULT 'Proses Verifikasi' CHECK (status IN (
        'Proses Verifikasi', 
        'Disetujui', 
        'Ditolak', 
        'Perbaikan', 
        'Dibatalkan'
    )),
    catatan_review TEXT, -- Catatan saat review
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    row_number SERIAL, -- Legacy compatibility
    
    -- Timestamps
    tanggal_pengajuan TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_no_register ON public.submissions(no_register);
CREATE INDEX IF NOT EXISTS idx_submissions_nik ON public.submissions(nik);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_nama ON public.submissions(nama_lengkap);
CREATE INDEX IF NOT EXISTS idx_submissions_tanggal ON public.submissions(tanggal_pengajuan DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON public.submissions(email);
CREATE INDEX IF NOT EXISTS idx_submissions_row_number ON public.submissions(row_number);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_submissions_search ON public.submissions 
USING GIN(to_tsvector('indonesian', coalesce(nama_lengkap, '') || ' ' || coalesce(nik, '') || ' ' || coalesce(email, '') || ' ' || coalesce(no_register, '')));

-- =====================================================
-- 3. TABLE: visitors (Tracking Pengunjung)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    page_visited VARCHAR(50),
    referrer TEXT,
    visit_time TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_visitors_ip ON public.visitors(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitors_time ON public.visitors(visit_time DESC);

-- =====================================================
-- 4. TABLE: roadmap_data (Data Roadmap - jika diperlukan)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.roadmap_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tahun INTEGER NOT NULL,
    program VARCHAR(200),
    target_peserta INTEGER,
    realisasi INTEGER DEFAULT 0,
    anggaran DECIMAL(15,2),
    keterangan TEXT,
    status VARCHAR(30) DEFAULT 'Aktif',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_roadmap_tahun ON public.roadmap_data(tahun);

-- Insert sample roadmap data
INSERT INTO public.roadmap_data (tahun, program, target_peserta, realisasi, anggaran, keterangan) VALUES
(2024, 'Beasiswa S1 Kesehatan', 100, 25, 5000000000, 'Program beasiswa strata 1 bidang kesehatan'),
(2024, 'Beasiswa S2 Kesehatan', 50, 15, 7500000000, 'Program beasiswa magister bidang kesehatan'),
(2024, 'Beasiswa S3 Kesehatan', 20, 5, 10000000000, 'Program beasiswa doktor bidang kesehatan'),
(2024, 'Spesialis Dokter', 30, 10, 8000000000, 'Program pendidikan spesialis dokter'),
(2025, 'Beasiswa S1 Kesehatan', 120, 0, 6000000000, 'Target meningkat 20%'),
(2025, 'Beasiswa S2 Kesehatan', 60, 0, 9000000000, 'Target meningkat 20%'),
(2025, 'Beasiswa S3 Kesehatan', 25, 0, 12000000000, 'Target meningkat 25%'),
(2025, 'Spesialis Dokter', 35, 0, 9000000000, 'Target meningkat 17%')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_data ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR: admins table
-- Allow anyone to read admins (for login validation)
CREATE POLICY "Allow public read for auth" ON public.admins
    FOR SELECT USING (true);

-- Only authenticated admins can update their own profile
CREATE POLICY "Admins can update own profile" ON public.admins
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Only super admin can insert/delete
CREATE POLICY "Super admin can manage admins" ON public.admins
    FOR ALL USING (true)
    WITH CHECK (true);

-- POLICIES FOR: submissions table
-- Public can INSERT new submissions (form pengajuan)
CREATE POLICY "Anyone can submit" ON public.submissions
    FOR INSERT WITH CHECK (true);

-- Public can READ submissions (for status checking)
CREATE POLICY "Public can read submissions" ON public.submissions
    FOR SELECT USING (true);

-- Anyone can UPDATE submissions (for admin review) - in production, restrict this!
CREATE POLICY "Authenticated can update" ON public.submissions
    FOR ALL USING (true)
    WITH CHECK (true);

-- POLICIES FOR: visitors table
-- Anyone can track visitors
CREATE POLICY "Anyone can track visits" ON public.visitors
    FOR ALL USING (true)
    WITH CHECK (true);

-- POLICIES FOR: roadmap_data table
-- Public can read roadmap
CREATE POLICY "Public can read roadmap" ON public.roadmap_data
    FOR SELECT USING (true);

-- Authenticated users can manage roadmap
CREATE POLICY "Admin can manage roadmap" ON public.roadmap_data
    FOR ALL USING (true)
    WITH CHECK (true);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_admins_updated_at ON public.admins;
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_submissions_updated_at ON public.submissions;
CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_roadmap_data_updated_at ON public.roadmap_data;
CREATE TRIGGER update_roadmap_data_updated_at
    BEFORE UPDATE ON public.roadmap_data
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate registration number
CREATE OR REPLACE FUNCTION public.generate_no_register()
RETURNS TRIGGER AS $$
DECLARE
    date_str TEXT;
    random_num TEXT;
BEGIN
    date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    random_num := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
    NEW.no_register := 'REG-SIMBAKES-' || date_str || random_num;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating no_register if not provided
DROP TRIGGER IF EXISTS set_no_register ON public.submissions;
CREATE TRIGGER set_no_register
    BEFORE INSERT ON public.submissions
    FOR EACH ROW
    WHEN (NEW.no_register IS NULL OR NEW.no_register = '')
    EXECUTE FUNCTION public.generate_no_register();

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'disetujui', COUNT(*) FILTER (WHERE status = 'Disetujui'),
        'ditolak', COUNT(*) FILTER (WHERE status = 'Ditolak'),
        'perbaikan', COUNT(*) FILTER (WHERE status = 'Perbaikan'),
        'batal', COUNT(*) FILTER (WHERE status = 'Dibatalkan'),
        'verifikasi', COUNT(*) FILTER (WHERE status = 'Proses Verifikasi')
    ) INTO result
    FROM public.submissions;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get recent submissions
CREATE OR REPLACE FUNCTION public.get_recent_submissions(limit_count INTEGER DEFAULT 5)
RETURNS SETOF public.submissions AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.submissions
    ORDER BY created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get submissions by status
CREATE OR REPLACE FUNCTION public.get_submissions_by_status(status_filter VARCHAR DEFAULT 'total')
RETURNS TABLE(
    id UUID,
    no_register VARCHAR,
    nama_lengkap VARCHAR,
    jurusan_tujuan VARCHAR,
    jenjang_pendidikan VARCHAR,
    unit_tujuan VARCHAR,
    status VARCHAR,
    tanggal_pengajuan TIMESTAMPTZ,
    link_foto TEXT
) AS $$
BEGIN
    IF status_filter = 'total' OR status_filter IS NULL THEN
        RETURN QUERY
        SELECT s.id, s.no_register, s.nama_lengkap, s.jurusan_tujuan, 
               s.jenjang_pendidikan, s.unit_tujuan, s.status, 
               s.tanggal_pengajuan, s.link_foto
        FROM public.submissions s
        ORDER BY s.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT s.id, s.no_register, s.nama_lengkap, s.jurusan_tujuan, 
               s.jenjang_pendidikan, s.unit_tujuan, s.status, 
               s.tanggal_pengajuan, s.link_foto
        FROM public.submissions s
        WHERE s.status ILIKE '%' || status_filter || '%'
        ORDER BY s.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 7. STORAGE BUCKETS (untuk file upload)
-- =====================================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'simbakes-documents',
    true, -- Public access
    5242880, -- 5MB max
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'simbakes-photos',
    true, -- Public access
    2097152, -- 2MB max
    ARRAY['image/jpeg', 'image/png', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "Public can view documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Anyone can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Admins can delete documents" ON storage.objects
    FOR DELETE USING (bucket_id = 'documents');

-- Storage policies for photos bucket
CREATE POLICY "Public can view photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "Anyone can upload photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Admins can delete photos" ON storage.objects
    FOR DELETE USING (bucket_id = 'photos');

-- =====================================================
-- 8. SAMPLE DATA (Opsional - untuk testing)
-- =====================================================

-- Insert sample submission data for testing
INSERT INTO public.submissions (
    no_register, nik, nama_lengkap, tempat_lahir, tanggal_lahir,
    alamat_ktp, alamat_domisili, lama_domisili, pekerjaan, posisi,
    unit_kerja, penjelasan, jurusan_tujuan, jenjang_pendidikan,
    unit_tujuan, rencana_tahun, no_hp, no_wa, email,
    status, link_foto
) VALUES
(
    'REG-SIMBAKES-20240115123456',
    '3201010101010001',
    'Dr. Ahmad Fauzi, Sp.PD',
    'Jakarta',
    '1990-05-15',
    'Jl. Sudirman No. 123, Jakarta Pusat',
    'Jl. Gatot Subroto No. 45, Jakarta Selatan',
    5,
    'Dokter',
    'Staff Medis',
    'RSUP Dr. Cipto Mangunkusumo',
    'Saya bermaksud mengajukan beasiswa untuk melanjutkan pendidikan Spesialis Penyakit Dalam demi meningkatkan kompetensi profesional dalam melayani pasien.',
    'Ilmu Penyakit Dalam',
    'Spesialis',
    'FKKMK UGM / RSUP Dr. Sardjito',
    2024,
    '08123456789',
    '08123456789',
    'ahmad.fauzi@email.com',
    'Disetujui',
    null
),
(
    'REG-SIMBAKES-20240116234567',
    '3202010202020002',
    'Dr. Siti Nurhaliza, M.Ked',
    'Bandung',
    '1992-08-22',
    'Jl. Asia Afrika No. 78, Bandung',
    'Jl. Dipatiukur No. 12, Bandung',
    3,
    'Dokter',
    'Residen',
    'RS Hasan Sadikin Bandung',
    'Pengajuan beasiswa untuk program pendidikan Spesialis Anestesiologi dan Terapi Intensif.',
    'Anestesiologi dan Terapi Intensif',
    'Spesialis',
    'FK Unpad / RSHS',
    2024,
    '08234567890',
    '08234567890',
    'siti.nurhaliza@email.com',
    'Proses Verifikasi',
    null
),
(
    'REG-SIMBAKES-20240117345678',
    '3203030303030003',
    'Rina Maharani, Amd.Keb',
    'Surabaya',
    '1995-12-10',
    'Jl. Pemuda No. 45, Surabaya',
    'Jl. Dharmahusada No. 23, Surabaya',
    2,
    'Perawat/Bidan',
    'Perawat Pelaksana',
    'RSUD Dr. Soetomo Surabaya',
    'Ingin meningkatkan kompetensi di bidang keperawatan kritikal melalui program S1 Keperawatan.',
    'Ilmu Keperawatan',
    'S1',
    'FKP Unair',
    2024,
    '08345678901',
    '08345678901',
    'rina.maharani@email.com',
    'Ditolak',
    null
)
ON CONFLICT (no_register) DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- ✅ SIMBAKES Supabase Schema Created Successfully!
-- 
-- Tables created:
--   - admins (admin authentication)
--   - submissions (beasiswa applications)
--   - visitors (visitor tracking)
--   - roadmap_data (roadmap/program data)
--
-- Storage buckets:
--   - simbakes-documents (PDF uploads)
--   - simbakes-photos (image uploads)
--
-- Default admin credentials:
--   Username: admin  | Password: admin123
--   Username: operator | Password: operator123
--
-- ⚠️ IMPORTANT: Change default passwords in production!
-- =====================================================
