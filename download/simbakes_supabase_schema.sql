-- =====================================================
-- SIMBAKES (Beasiswa Tematik Bidang Kesehatan)
-- Supabase Database Schema
-- Based on template_simbakes versi supabase (1).xlsx
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLE: multiusers (Admin & User Management)
-- =====================================================
CREATE TABLE IF NOT EXISTS multiusers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_lengkap VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- hashed password
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'aktif', -- aktif/non-aktif
    role VARCHAR(50) DEFAULT 'admin', -- admin/operator/viewer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_multiusers_username ON multiusers(username);
CREATE INDEX idx_multiusers_email ON multiusers(email);
CREATE INDEX idx_multiusers_status ON multiusers(status);

-- Insert default admin user (password: admin123 - should be hashed in production)
INSERT INTO multiusers (nama_lengkap, username, password, email, status, role) VALUES 
('Administrator', 'admin', '$2b$10$hash_placeholder_admin123', 'admin@simbakes.id', 'aktif', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- 2. TABLE: roadmap_kebutuhan (Roadmap Kebutuhan Beasiswa)
-- =====================================================
CREATE TABLE IF NOT EXISTS roadmap_kebutuhan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    jurusan VARCHAR(255) NOT NULL,
    kualifikasi_awal TEXT,
    jenis_pendidikan VARCHAR(100), -- S1/S2/S3/Spesialis/Diploma
    perguruan_tinggi VARCHAR(255),
    pekerjaan VARCHAR(255),
    tahun_mulai_studi INTEGER,
    unit_pendayaguna VARCHAR(255),
    status VARCHAR(50), -- tersedia/dipenuhi/ditangguhkan
    nama_penerima VARCHAR(255), -- diisi jika sudah ada penerima
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES multiusers(id),
    updated_by UUID REFERENCES multiusers(id)
);

CREATE INDEX idx_roadmap_kode ON roadmap_kebutuhan(kode);
CREATE INDEX idx_roadmap_status ON roadmap_kebutuhan(status);
CREATE INDEX idx_roadmap_jurusan ON roadmap_kebutuhan(jurusan);

-- =====================================================
-- 3. TABLE: data_pengusulan (Data Pengusulan Beasiswa)
-- SENSITIVE DATA: NIK, alamat, no_hp, no_whatsapp, dll.
-- =====================================================
CREATE TABLE IF NOT EXISTS data_pengusulan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- DATA PRIBADI (SENSITIVE)
    nik VARCHAR(16) UNIQUE NOT NULL, -- Nomor Induk Kependudukan
    nama_lengkap VARCHAR(255) NOT NULL,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat_ktp TEXT,
    alamat_domisili TEXT,
    lama_domisili_tahun INTEGER,
    
    -- DATA PEKERJAAN
    pekerjaan VARCHAR(255),
    posisi_jabatan VARCHAR(255),
    unit_kerja VARCHAR(255),
    penjelasan_narasi TEXT,
    
    -- DATA PENDIDIKAN TUJUAN
    jurusan_tujuan VARCHAR(255) NOT NULL,
    jenjang_pendidikan VARCHAR(100), -- S1/S2/S3/Spesialis/Diploma
    unit_tujuan_pemanfaatan VARCHAR(255),
    rencana_tahun_studi INTEGER,
    
    -- KONTAK (SENSITIVE)
    no_hp VARCHAR(15),
    no_whatsapp VARCHAR(15),
    email VARCHAR(255),
    
    -- STATUS & DOKUMEN
    status VARCHAR(50) DEFAULT 'diajukan', -- diajukan/ditinjau/diterima/ditolak
    pasfoto TEXT, -- URL or base64
    dokumen TEXT, -- URL or base64
    
    -- METADATA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES multiusers(id),
    updated_by UUID REFERENCES multiusers(id)
);

CREATE INDEX idx_pengusulan_nik ON data_pengusulan(nik);
CREATE INDEX idx_pengusulan_nama ON data_pengusulan(nama_lengkap);
CREATE INDEX idx_pengusulan_status ON data_pengusulan(status);
CREATE INDEX idx_pengusulan_jurusan ON data_pengusulan(jurusan_tujuan);

-- =====================================================
-- 4. TABLE: data_penetapan (Data Penetapan Penerima Beasiswa)
-- SENSITIVE DATA: NIK
-- =====================================================
CREATE TABLE IF NOT EXISTS data_penetapan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- DATA PENERIMA (LINK TO PENGUSULAN)
    nik VARCHAR(16) REFERENCES data_pengusulan(nik),
    nama_lengkap VARCHAR(255) NOT NULL,
    jurusan_tujuan VARCHAR(255) NOT NULL,
    jenjang_pendidikan VARCHAR(100),
    unit_tujuan_pemanfaatan VARCHAR(255),
    rencana_tahun_studi INTEGER,
    
    -- DATA PENETAPAN
    no_sk_penetapan VARCHAR(100) UNIQUE,
    tanggal_penetapan DATE,
    status_penetapan VARCHAR(50) DEFAULT 'ditetapkan', -- ditetapkan/dibatalkan/direvisi
    catatan_penetapan TEXT,
    
    -- DOKUMEN
    link_foto_pasfoto TEXT,
    link_dokumen_pdf TEXT,
    periode_pemberian VARCHAR(100), -- e.g., "2024-2027"
    
    -- METADATA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES multiusers(id),
    updated_by UUID REFERENCES multiusers(id)
);

CREATE INDEX idx_penetapan_nik ON data_penetapan(nik);
CREATE INDEX idx_penetapan_no_sk ON data_penetapan(no_sk_penetapan);
CREATE INDEX idx_penetapan_status ON data_penetapan(status_penetapan);

-- =====================================================
-- 5. TABLE: informasi (Untuk halaman Informasi Penting)
-- =====================================================
CREATE TABLE IF NOT EXISTS informasi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR(255) NOT NULL,
    isi TEXT NOT NULL,
    kategori VARCHAR(100), -- pengumuman/panduan/faq/berita
    status VARCHAR(50) DEFAULT 'aktif', -- aktif/non-aktif
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES multiusers(id)
);

CREATE INDEX idx_informasi_kategori ON informasi(kategori);
CREATE INDEX idx_informasi_status ON informasi(status);

-- =====================================================
-- 6. TABLE: customer_service (Data Layanan CS)
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_service (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_lengkap VARCHAR(255) NOT NULL,
    jabatan VARCHAR(100),
    no_hp VARCHAR(15),
    no_whatsapp VARCHAR(15),
    email VARCHAR(255),
    jam_operasional VARCHAR(100), -- "Senin-Jumat, 08:00-16:00"
    status VARCHAR(50) DEFAULT 'aktif',
    urutan INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE multiusers ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_kebutuhan ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_pengusulan ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_penetapan ENABLE ROW LEVEL SECURITY;
ALTER TABLE informasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_service ENABLE ROW LEVEL SECURITY;

-- Policy: Public users can READ roadmap_kebutuhan (non-sensitive columns only via view)
CREATE POLICY "Public can view roadmap" ON roadmap_kebutuhan
    FOR SELECT USING (true);

-- Policy: Public can VIEW limited data_pengusulan (no sensitive info - use view instead)
-- We'll create a public view for this

-- Policy: Admins can do everything on all tables
CREATE POLICY "Admins full access multiusers" ON multiusers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM multiusers WHERE multiusers.id = auth.uid() AND multiusers.role = 'superadmin')
    );

CREATE POLICY "Admins full access roadmap" ON roadmap_kebutuhan
    FOR ALL USING (
        EXISTS (SELECT 1 FROM multiusers WHERE multiusers.id = auth.uid() AND multiusers.role IN ('superadmin', 'admin'))
    );

CREATE POLICY "Admins full access pengusulan" ON data_pengusulan
    FOR ALL USING (
        EXISTS (SELECT 1 FROM multiusers WHERE multiusers.id = auth.uid() AND multiusers.role IN ('superadmin', 'admin'))
    );

CREATE POLICY "Admins full access penetapan" ON data_penetapan
    FOR ALL USING (
        EXISTS (SELECT 1 FROM multiusers WHERE multiusers.id = auth.uid() AND multiusers.role IN ('superadmin', 'admin'))
    );

-- =====================================================
-- PUBLIC VIEWS (For non-authenticated/public access)
-- These views EXCLUDE sensitive data
-- =====================================================

-- View: Public Roadmap Data (all columns are safe)
CREATE OR REPLACE VIEW v_public_roadmap AS
SELECT 
    id,
    kode,
    jurusan,
    kualifikasi_awal,
    jenis_pendidikan,
    perguruan_tinggi,
    pekerjaan,
    tahun_mulai_studi,
    unit_pendayaguna,
    status,
    nama_penerima
FROM roadmap_kebutuhan
WHERE status = 'tersedia' OR status IS NOT NULL;

-- View: Public Pengusulan Data (EXCLUDES sensitive data)
CREATE OR REPLACE VIEW v_public_pengusulan AS
SELECT 
    id,
    -- EXCLUDED: nik (SENSITIVE)
    nama_lengkap, -- Only name is shown
    -- EXCLUDED: tempat_lahir, tanggal_lahir (SENSITIVE)
    -- EXCLUDED: alamat_ktp, alamat_domisili (SENSITIVE)
    -- EXCLUDED: lama_domisili_tahun (SENSITIVE)
    pekerjaan,
    posisi_jabatan,
    unit_kerja,
    penjelasan_narasi,
    jurusan_tujuan,
    jenjang_pendidikan,
    unit_tujuan_pemanfaatan,
    rencana_tahun_studi,
    -- EXCLUDED: no_hp, no_whatsapp (SENSITIVE)
    -- EXCLUDED: email (SENSITIVE)
    status,
    -- EXCLUDED: pasfoto, dokumen (SENSITIVE)
    created_at
FROM data_pengusulan
WHERE status IN ('diterima', 'diumumkan');

-- View: Public Penetapan Data (EXCLUDES sensitive data)
CREATE OR REPLACE VIEW v_public_penetapan AS
SELECT 
    id,
    -- EXCLUDED: nik (SENSITIVE)
    nama_lengkap,
    jurusan_tujuan,
    jenjang_pendidikan,
    unit_tujuan_pemanfaatan,
    rencana_tahun_studi,
    no_sk_penetapan,
    tanggal_penetapan,
    status_penetapan,
    catatan_penetapan,
    -- EXCLUDED: link_foto_pasfoto (SENSITIVE)
    -- EXCLUDED: link_dokumen_pdf (SENSITIVE)
    periode_pemberian,
    created_at
FROM data_penetapan
WHERE status_penetapan = 'ditetapkan';

-- =====================================================
-- FUNCTIONS & TRIGGERS for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_multiusers_updated_at BEFORE UPDATE ON multiusers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roadmap_kebutuhan_updated_at BEFORE UPDATE ON roadmap_kebutuhan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_pengusulan_updated_at BEFORE UPDATE ON data_pengusulan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_penetapan_updated_at BEFORE UPDATE ON data_penetapan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_informasi_updated_at BEFORE UPDATE ON informasi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Sample Roadmap Data
INSERT INTO roadmap_kebutuhan (kode, jurusan, kualifikasi_awal, jenis_pendidikan, perguruan_tinggi, pekerjaan, tahun_mulai_studi, unit_pendayaguna, status) VALUES
('RM-001', 'Kedokteran Umum', 'Sarjana Kedokteran', 'Profesi', 'Universitas Indonesia', 'Dokter PTT', 2025, 'Dinas Kesehatan', 'tersedia'),
('RM-002', 'Keperawatan', 'D3/S1 Keperawatan', 'S1/S2', 'Universitas Airlangga', 'Perawat RS', 2025, 'RSUD Provinsi', 'tersedia'),
('RM-003', 'Kebidanan', 'D3 Kebidanan', 'S1', 'Universitas Gadjah Mada', 'Bidan Desa', 2025, 'Puskesmas', 'tersedia'),
('RM-004', 'Farmasi', 'S1 Farmasi', 'S2/S3', 'Institut Teknologi Bandung', 'Farmasis', 2026, 'Instalasi Farmasi', 'tersedia'),
('RM-005', 'Kesehatan Masyarakat', 'S1 KESMAS', 'S2/S3', 'Universitas Hasanuddin', 'Epidemiolog', 2026, 'Dinkes Provinsi', 'dipenuhi');

-- Sample CS Data
INSERT INTO customer_service (nama_lengkap, jabatan, no_whatsapp, email, jam_operasional, urutan) VALUES
('Dr. Siti Nurhaliza', 'Koordinator SIMBAKES', '+6281234567890', 'siti@simbakes.id', 'Senin-Jumat, 08:00-16:00 WIB', 1),
('Ahmad Fauzi, S.Km', 'Admin Layanan', '+6281234567891', 'ahmad@simbakes.id', 'Senin-Jumat, 08:00-16:00 WIB', 2),
('Rina Marlina, A.Md', 'Staff Pendukung', '+6281234567892', 'rina@simbakes.id', 'Senin-Kamis, 09:00-15:00 WIB', 3);

-- Sample Informasi
INSERT INTO informasi (judul, isi, kategori, status) VALUES
('Selamat Datang di SIMBAKES', 'SIMBAKES (Beasiswa Tematik Bidang Kesehatan) adalah program beasiswa dari pemerintah untuk meningkatkan sumber daya manusia di bidang kesehatan.', 'pengumuman', 'aktif'),
('Pendaftaran Periode 2025-2026 Dibuka', 'Pendaftaran beasiswa SIMBAKES untuk periode 2025-2026 telah dibuka. Silakan mengisi formulir pengusulan melalui menu yang tersedia.', 'pengumuman', 'aktif'),
('Cara Mengajukan Beasiswa', '1. Daftar akun\n2. Isi formulir pengusulan\n3. Upload dokumen pendukung\n4. Tunggu verifikasi\n5. Cek status pengusulan', 'panduan', 'aktif');

-- =====================================================
-- NOTES:
-- 1. Password hashing should use bcrypt or similar
-- 2. For production, use Supabase Auth for authentication
-- 3. Storage buckets needed for file uploads (pasfoto, dokumen)
-- 4. Consider adding rate limiting and audit logs
-- =====================================================
