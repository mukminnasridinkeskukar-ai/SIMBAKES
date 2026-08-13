-- =====================================================
-- SIMBAKES - Beasiswa Tematik Bidang Kesehatan
-- Supabase Database Schema
-- Based on: template_simbakes versi supabase (3).xlsx
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABLE: multiusers (User Management)
-- Source: Sheet "multiusers" - 6 columns
-- =====================================================
CREATE TABLE IF NOT EXISTS public.multiusers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_lengkap VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- hashed password (bcrypt)
    email VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif', 'blocked')),
    role VARCHAR(50) DEFAULT 'operator' CHECK (role IN ('superadmin', 'admin', 'operator')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Create index for login queries
CREATE INDEX idx_multiusers_username ON public.multiusers(username);
CREATE INDEX idx_multiusers_email ON public.multiusers(email);
CREATE INDEX idx_multiusers_role ON public.multiusers(role);

-- Insert default users from Excel data
INSERT INTO public.multiusers (nama_lengkap, username, password, email, status, role) VALUES
('Mukmin Nasri', 'superadmin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.H0RqVfIHLg7XCa', 'mukminnasri.dinkeskukar@gmail.com', 'aktif', 'superadmin'),
('Eta', 'operator2', '$2a$12$ExampleHashedPasswordHereForEtaSDMK2024', NULL, 'aktif', 'admin')
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- 2. TABLE: data_pengusulan (Proposal/Submission Data)
-- Source: Sheet "data_pengusulan" - 21 columns, 97 rows
-- =====================================================
CREATE TABLE IF NOT EXISTS public.data_pengusulan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Personal Identity
    nik VARCHAR(20) UNIQUE NOT NULL, -- Nomor Induk Kependudukan
    nama_lengkap VARCHAR(255) NOT NULL,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat_ktp TEXT,
    alamat_domisili TEXT,
    lama_domisili_tahun INTEGER,
    
    -- Employment Info
    pekerjaan VARCHAR(100),
    posisi_jabatan VARCHAR(150),
    unit_kerja VARCHAR(200),
    penjelasan_narasi TEXT, -- Explanation/narrative
    
    -- Education Plan
    jurusan_tujuan VARCHAR(150), -- Target major/specialization
    jenjang_pendidikan VARCHAR(50), -- Education level (S1, Sp1, Profesi, etc.)
    unit_tujuan_pemanfaatan VARCHAR(200), -- Target placement unit
    rencana_tahun_studi INTEGER, -- Planned study year
    
    -- Contact Information
    no_hp VARCHAR(20),
    no_whatsapp VARCHAR(20),
    email VARCHAR(255),
    
    -- Status & Documents
    status VARCHAR(50) DEFAULT 'diajukan' CHECK (status IN ('diajukan', 'diproses', 'diterima', 'ditolak', 'direvisi')),
    pasfoto TEXT, -- URL to photo
    dokumen TEXT, -- URL to documents folder
    
    -- Metadata
    created_by UUID REFERENCES public.multiusers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_data_pengusulan_nik ON public.data_pengusulan(nik);
CREATE INDEX idx_data_pengusulan_status ON public.data_pengusulan(status);
CREATE INDEX idx_data_pengusulan_jurusan ON public.data_pengusulan(jurusan_tujuan);
CREATE INDEX idx_data_pengusulan_jenjang ON public.data_pengusulan(jenjang_pendidikan);
CREATE INDEX idx_data_pengusulan_unit ON public.data_pengusulan(unit_tujuan_pemanfaatan);

-- Comment for documentation
COMMENT ON TABLE public.data_pengusulan IS 'Data pengusulan beasiswa - proposal submissions from applicants';
COMMENT ON COLUMN public.data_pengusulan.nik IS 'Nomor Induk Kependudukan (unique identifier)';
COMMENT ON COLUMN public.data_pengusulan.jurusan_tujuan IS 'Program studi/jurusan yang dituju';
COMMENT ON COLUMN public.data_pengusulan.jenjang_pendidikan IS 'Jenjang: S1, Sp1, Sp2, Profesi, S2, S3';

-- =====================================================
-- 3. TABLE: data_penetapan (Selection/Approval Data)
-- Source: Sheet "data_penetapan" - 13 columns, 18 rows
-- =====================================================
CREATE TABLE IF NOT EXISTS public.data_penetapan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference to pengusulan
    nik VARCHAR(20) NOT NULL REFERENCES public.data_pengusulan(nik),
    nama_lengkap VARCHAR(255) NOT NULL,
    jurusan_tujuan VARCHAR(150),
    jenjang_pendidikan VARCHAR(50),
    unit_tujuan_pemanfaatan VARCHAR(200),
    rencana_tahun_studi INTEGER,
    
    -- Approval Details
    no_sk_penetapan VARCHAR(100) UNIQUE, -- Nomor SK Penetapan
    tanggal_penetapan DATE,
    status_penetapan VARCHAR(50) DEFAULT 'pending' CHECK (status_penetapan IN ('pending', 'disetujui', 'ditolak', 'dicabut')),
    catatan_penetapan TEXT,
    
    -- Document Links
    link_foto_pasfoto TEXT,
    link_dokumen_pdf TEXT,
    
    -- Period
    periode_pemberian VARCHAR(50), -- e.g., "2026", "2026/2027"
    
    -- Metadata
    approved_by UUID REFERENCES public.multiusers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_data_penetapan_nik ON public.data_penetapan(nik);
CREATE INDEX idx_data_penetapan_status ON public.data_penetapan(status_penetapan);
CREATE INDEX idx_data_penetapan_sk ON public.data_penetapan(no_sk_penetapan);
CREATE INDEX idx_data_penetapan_periode ON public.data_penetapan(periode_pemberian);

-- Comment for documentation
COMMENT ON TABLE public.data_penetapan IS 'Data penetapan penerima beasiswa - approval/selection decisions';

-- =====================================================
-- 4. TABLE: roadmap_kebutuhan (Needs Roadmap)
-- Source: Sheet "roadmap_kebutuhan" - 10 columns (template)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.roadmap_kebutuhan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    kode VARCHAR(50) UNIQUE NOT NULL, -- Unique code for roadmap entry
    jurusan VARCHAR(150) NOT NULL, -- Major/specialization needed
    kualifikasi_awal VARCHAR(100), -- Initial qualification required
    jenis_pendidikan VARCHAR(100), -- Type of education
    perguruan_tinggi VARCHAR(200), -- University/institution
    pekerjaan VARCHAR(100), -- Target position/job
    tahun_mulai_studi INTEGER, -- Start year of study
    unit_pendayaguna VARCHAR(200), -- Utilization unit
    status VARCHAR(50) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif', 'terpenuhi', 'dicabut')),
    nama_penerima VARCHAR(255), -- Recipient name (linked to pengusulan)
    
    -- Link to pengusulan (optional)
    pengusulan_id UUID REFERENCES public.data_pengusulan(id),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_roadmap_kode ON public.roadmap_kebutuhan(kode);
CREATE INDEX idx_roadmap_jurusan ON public.roadmap_kebutuhan(jurusan);
CREATE INDEX idx_roadmap_status ON public.roadmap_kebutuhan(status);
CREATE INDEX idx_roadmap_unit ON public.roadmap_kebutuhan(unit_pendayaguna);

-- Comment for documentation
COMMENT ON TABLE public.roadmap_kebutuhan IS 'Roadmap kebutuhan SDM kesehatan - workforce needs planning';

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.multiusers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pengusulan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_penetapan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_kebutuhan ENABLE ROW LEVEL SECURITY;

-- Policy: multiusers - Superadmin can do everything, others read only their own
CREATE POLICY "Superadmin full access to multiusers" ON public.multiusers
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role = 'superadmin'
        )
    );

CREATE POLICY "Users can view own profile" ON public.multiusers
    FOR SELECT USING (
        auth.uid() = id OR 
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role IN ('superadmin', 'admin')
        )
    );

-- Policy: data_pengusulan
CREATE POLICY "Superadmin full access to pengusulan" ON public.data_pengusulan
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role = 'superadmin'
        )
    );

CREATE POLICY "Admin can read/write pengusulan" ON public.data_pengusulan
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role = 'admin'
        )
    );

CREATE POLICY "Operator can read pengusulan" ON public.data_pengusulan
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role IN ('admin', 'operator', 'superadmin')
        )
    );

CREATE POLICY "Operator can insert pengusulan" ON public.data_pengusulan
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role IN ('admin', 'operator', 'superadmin')
        )
    );

-- Policy: data_penetapan
CREATE POLICY "Superadmin full access to penetapan" ON public.data_penetapan
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role = 'superadmin'
        )
    );

CREATE POLICY "Admin can manage penetapan" ON public.data_penetapan
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "All authenticated users can view penetapan" ON public.data_penetapan
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

-- Policy: roadmap_kebutuhan
CREATE POLICY "Superadmin full access to roadmap" ON public.roadmap_kebutuhan
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role = 'superadmin'
        )
    );

CREATE POLICY "Admin/operator can read roadmap" ON public.roadmap_kebutuhan
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role IN ('admin', 'operator', 'superadmin')
        )
    );

CREATE POLICY "Admin can modify roadmap" ON public.roadmap_kebutuhan
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.multiusers WHERE role IN ('admin', 'superadmin')
        )
    );

-- =====================================================
-- 6. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_multiusers_updated_at BEFORE UPDATE ON public.multiusers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_pengusulan_updated_at BEFORE UPDATE ON public.data_pengusulan
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_penetapan_updated_at BEFORE UPDATE ON public.data_penetapan
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roadmap_kebutuhan_updated_at BEFORE UPDATE ON public.roadmap_kebutuhan
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Combined pengusulan with penetapan status
CREATE OR REPLACE VIEW v_pengusulan_full AS
SELECT 
    p.*,
    COALESCE(pt.status_penetapan, 'belum_ditetapkan') as status_penetapan_view,
    pt.no_sk_penetapan,
    pt.tanggal_penetapan as tgl_sk,
    pt.periode_pemberian
FROM public.data_pengusulan p
LEFT JOIN public.data_penetapan pt ON p.nik = pt.nik;

-- View: Dashboard statistics
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM public.data_pengusulan) as total_pengusulan,
    (SELECT COUNT(*) FROM public.data_pengusulan WHERE status = 'diajukan') as pengusulan_baru,
    (SELECT COUNT(*) FROM public.data_pengusulan WHERE status = 'diproses') as sedang_diproses,
    (SELECT COUNT(*) FROM public.data_penetapan WHERE status_penetapan = 'disetujui') as total_diterima,
    (SELECT COUNT(*) FROM public.data_penetapan WHERE status_penetapan = 'ditolak') as total_ditolak,
    (SELECT COUNT(*) FROM public.roadmap_kebutuhan WHERE status = 'aktif') as roadmap_aktif;

-- =====================================================
-- 8. CORS CONFIGURATION (for GitHub Pages frontend)
-- =====================================================

-- Note: CORS is configured in Supabase Dashboard > API > URL Configuration
-- Add your GitHub Pages URL there:
-- - https://yourusername.github.io
-- - http://localhost:3000 (for development)

-- For SQL-based CORS (if using PostgREST directly):
-- This is typically handled in supabase.toml or dashboard settings

-- =====================================================
-- 9. SAMPLE DATA INSERTION (from Excel)
-- =====================================================

-- Function to safely insert pengusulan data
CREATE OR REPLACE FUNCTION insert_pengusulan_safe(
    p_nik VARCHAR,
    p_nama VARCHAR,
    p_tempat_lahir VARCHAR,
    p_tanggal_lahir DATE,
    p_alamat_ktp TEXT,
    p_alamat_domisili TEXT,
    p_lama_domisili INTEGER,
    p_pekerjaan VARCHAR,
    p_posisi VARCHAR,
    p_unit_kerja VARCHAR,
    p_narasi TEXT,
    p_jurusan VARCHAR,
    p_jenjang VARCHAR,
    p_unit_tujuan VARCHAR,
    p_tahun_studi INTEGER,
    p_no_hp VARCHAR,
    p_wa VARCHAR,
    p_email VARCHAR,
    p_foto TEXT,
    p_dokumen TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.data_pengusulan (
        nik, nama_lengkap, tempat_lahir, tanggal_lahir,
        alamat_ktp, alamat_domisili, lama_domisili_tahun,
        pekerjaan, posisi_jabatan, unit_kerja,
        penjelasan_narasi, jurusan_tujuan, jenjang_pendidikan,
        unit_tujuan_pemanfaatan, rencana_tahun_studi,
        no_hp, no_whatsapp, email, pasfoto, dokumen
    ) VALUES (
        p_nik, p_nama, p_tempat_lahir, p_tanggal_lahir,
        p_alamat_ktp, p_alamat_domisili, p_lama_domisili,
        p_pekerjaan, p_posisi, p_unit_kerja,
        p_narasi, p_jurusan, p_jenjang,
        p_unit_tujuan, p_tahun_studi,
        p_no_hp, p_wa, p_email, p_foto, p_dokumen
    ) ON CONFLICT (nik) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. GRANTS & PERMISSIONS
-- =====================================================

-- Grant usage to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant view permissions
GRANT SELECT ON v_pengusulan_full TO authenticated, anon;
GRANT SELECT ON v_dashboard_stats TO authenticated, anon;

-- =====================================================
-- 5. TABLE: data_sanggahan (Appeal/Dispute Data)
-- For handling user appeals against rejected/cancelled submissions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.data_sanggahan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_sanggahan VARCHAR(50) UNIQUE NOT NULL, -- Format: SG-timestamp
    
    -- User Reference
    user_id UUID REFERENCES public.multiusers(id),
    
    -- Pengusulan Reference
    nik VARCHAR(20) REFERENCES public.data_pengusulan(nik),
    no_register VARCHAR(50),
    
    -- Original Status & Reason
    status_asal VARCHAR(50), -- Status sebelum sanggah (ditolak/dibatalkan)
    alasan_penolakan TEXT, -- Alasan penolakan dari reviewer/admin
    
    -- Sanggahan Details
    jenis_sanggahan VARCHAR(50) NOT NULL CHECK (jenis_sanggahan IN (
        'kesalahan_data', 'dokumen_kurang', 'penilaian_salah', 'ketentuan_baru', 'lainnya'
    )),
    alasan_sanggahan TEXT NOT NULL,
    bukti_pendukung TEXT, -- Description of supporting evidence
    
    -- Review Process
    status_sanggahan VARCHAR(50) DEFAULT 'menunggu_review' CHECK (status_sanggahan IN (
        'menunggu_review', 'direview', 'diterima', 'ditolak'
    )),
    catatan_reviewer TEXT,
    reviewed_by UUID REFERENCES public.multiusers(id),
    reviewed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for sanggahan queries
CREATE INDEX idx_sanggahan_user_id ON public.data_sanggahan(user_id);
CREATE INDEX idx_sanggahan_nik ON public.data_sanggahan(nik);
CREATE INDEX idx_sanggahan_status ON public.data_sanggahan(status_sanggahan);
CREATE INDEX idx_sanggahan_created ON public.data_sanggahan(created_at);

-- Add comment
COMMENT ON TABLE public.data_sanggahan IS 'Tabel untuk menyimpan data sanggahan/banding pengguna terhadap keputusan penolakan/pembatalan';

-- =====================================================
-- UPDATE: Extend multiusers roles for new user types
-- =====================================================

-- Alter role constraint to include new user types
ALTER TABLE public.multiusers DROP CONSTRAINT IF EXISTS multiusers_role_check;
ALTER TABLE public.multiusers ADD CONSTRAINT multiusers_role_check 
CHECK (role IN ('superadmin', 'admin', 'operator', 'peserta', 'admin_sekolah', 'admin_dinkes', 'reviewer'));

-- Add institusi field for certain roles
ALTER TABLE public.multiusers ADD COLUMN IF NOT EXISTS institusi VARCHAR(255);

-- Create index on new column
CREATE INDEX IF NOT EXISTS idx_multiusers_institusi ON public.multiusers(institusi);

-- =====================================================
-- UPDATE: Add alasan_penolakan to data_pengusulan if not exists
-- =====================================================

ALTER TABLE public.data_pengusulan ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT;
ALTER TABLE public.data_pengusulan ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.data_pengusulan ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.multiusers(id);
ALTER TABLE public.data_pengusulan ADD COLUMN IF NOT EXISTS no_register VARCHAR(50);
ALTER TABLE public.data_pengusulan ADD COLUMN IF NOT EXISTS judul_proposal VARCHAR(500);

-- Update status to include new values
ALTER TABLE public.data_pengusulan DROP CONSTRAINT IF EXISTS data_pengusulan_status_check;
ALTER TABLE public.data_pengusulan ADD CONSTRAINT data_pengusulan_status_check 
CHECK (status IN ('diajukan', 'diproses', 'diterima', 'ditolak', 'direvisi', 'dibatalkan', 'disanggah'));

-- =====================================================
-- 11. RLS POLICIES FOR data_sanggahan
-- =====================================================

ALTER TABLE public.data_sanggahan ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own sanggahan
CREATE POLICY "Users can read own sanggahan" ON public.data_sanggahan
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own sanggahan
CREATE POLICY "Users can insert own sanggahan" ON public.data_sanggahan
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can read all sanggahan
CREATE POLICY "Admins can read all sanggahan" ON public.data_sanggahan
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.multiusers WHERE id = auth.uid() AND role IN ('superadmin', 'admin'))
    );

-- Policy: Admins/reviewers can update sanggahan status
CREATE POLICY "Admins can update sanggahan" ON public.data_sanggahan
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.multiusers WHERE id = auth.uid() AND role IN ('superadmin', 'admin', 'reviewer'))
    );

-- =====================================================
-- 12. FUNCTION: Auto-generate no_register trigger
-- =====================================================

CREATE OR REPLACE FUNCTION generate_no_register()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.no_register IS NULL OR NEW.no_register = '' THEN
        NEW.no_register := 'REG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to data_pengusulan
DROP TRIGGER IF EXISTS trg_generate_no_register ON public.data_pengusulan;
CREATE TRIGGER trg_generate_no_register
    BEFORE INSERT ON public.data_pengusulan
    FOR EACH ROW EXECUTE FUNCTION generate_no_register();

-- =====================================================
-- 13. GRANTS & PERMISSIONS (Updated)
-- =====================================================

-- Grant usage to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant view permissions
GRANT SELECT ON v_pengusulan_full TO authenticated, anon;
GRANT SELECT ON v_dashboard_stats TO authenticated, anon;

-- Grant sanggahan table permissions
GRANT ALL ON public.data_sanggahan TO authenticated;
GRANT SELECT ON public.data_sanggahan TO anon;

-- =====================================================
-- END OF SCHEMA (Updated v2.0 - with Sanggahan System)
-- =====================================================

-- Documentation:
-- ================================
-- TABLE RELATIONSHIPS:
-- 1. multiusers (1) ---> (N) data_pengusulan (user_id / created_by)
-- 2. data_pengusulan (1) ---> (1) data_penetapan (nik)
-- 3. data_pengusulan (1) ---> (0..1) roadmap_kebutuhan (pengusulan_id)
-- 4. multiusers (1) ---> (N) data_sanggahan (user_id)
-- 5. data_pengusulan (1) ---> (0..N) data_sanggahan (nik)

-- STATUS VALUES:
-- data_pengusulan.status: diajukan | diproses | diterima | ditolak | direvisi | dibatalkan | disanggah
-- data_penetapan.status_penetapan: pending | disetujui | ditolak | dicabut
-- roadmap_kebutuhan.status: aktif | nonaktif | terpenuhi | dicabut
-- data_sanggahan.status_sanggahan: menunggu_review | direview | diterima | ditolak
-- multiusers.status: aktif | nonaktif | blocked
-- multiusers.role: superadmin | admin | operator | peserta | admin_sekolah | admin_dinkes | reviewer

-- JENJANG PENDIDIKAN values:
-- D3, D4, S1, S1 + Profesi, Sp1, Sp2, S2, S3, s1_profesi_unmul, etc.

-- JENIS_SANGGAH values:
-- kesalahan_data | dokumen_kurang | penilaian_salah | ketentuan_baru | lainnya
