-- ============================================
-- SIMBAKES - Supabase Database Schema
-- ============================================
-- 
-- File SQL ini berisi schema lengkap untuk
-- database SIMBAKES di Supabase (PostgreSQL).
--
-- Cara menjalankan:
-- 1. Buka Supabase Dashboard > SQL Editor
-- 2. Copy seluruh isi file ini
-- 3. Klik "Run" untuk mengeksekusi
-- ============================================

-- ============================================
-- 1. ENABLE EXTENSIONS (jika diperlukan)
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. TABEL: users (Data Pemohon/Pengguna)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    nik VARCHAR(16) UNIQUE,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    jenis_kelamin CHAR(1) CHECK (jenis_kelamin IN ('L', 'P')),
    agama VARCHAR(50),
    alamat TEXT,
    no_hp VARCHAR(20),
    foto_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    -- Auth relation (optional, jika menggunakan Supabase Auth)
    auth_id UUID REFERENCES auth.users(id)
);

-- Create index for faster search
CREATE INDEX IF NOT EXISTS idx_users_nik ON public.users(nik);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================
-- 3. TABEL: pengusulan (Data Pengusulan Beasiswa)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pengusulan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomor_usulan VARCHAR(20) UNIQUE NOT NULL,
    
    -- Foreign key ke users
    user_id UUID REFERENCES public.users(id),
    
    -- Data pribadi
    nama_lengkap VARCHAR(255) NOT NULL,
    nik VARCHAR(16) NOT NULL,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    jenis_kelamin CHAR(1),
    agama VARCHAR(50),
    alamat TEXT,
    no_hp VARCHAR(20),
    email VARCHAR(255),
    
    -- Data pendidikan
    pendidikan_terakhir VARCHAR(50),
    program_studi_dituju VARCHAR(100),
    nama_institusi VARCHAR(255),
    ipk DECIMAL(3,2),
    tahun_lulus VARCHAR(10),
    nomor_ijazah VARCHAR(50),
    
    -- Status & workflow
    status VARCHAR(20) DEFAULT 'draft' CHECK (
        status IN ('draft', 'submitted', 'review', 'approved', 'rejected', 'withdrawn')
    ),
    catatan_reviewer TEXT,
    reviewer_id UUID,
    tanggal_review DATE,
    
    -- Timestamps
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pengusulan_nomor ON public.pengusulan(nomor_usulan);
CREATE INDEX IF NOT EXISTS idx_pengusulan_nik ON public.pengusulan(nik);
CREATE INDEX IF NOT EXISTS idx_pengusulan_status ON public.pengusulan(status);
CREATE INDEX IF NOT EXISTS idx_pengusulan_email ON public.pengusulan(email);
CREATE INDEX IF NOT EXISTS idx_pengusulan_user ON public.pengusulan(user_id);

-- Auto-generate nomor_usulan
CREATE OR REPLACE FUNCTION generate_nomor_usulan()
RETURNS TRIGGER AS $$
BEGIN
    NEW.nomor_usulan := 'USL-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                         LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_nomor_usulan
    BEFORE INSERT ON public.pengusulan
    FOR EACH ROW
    WHEN (NEW.nomor_usulan IS NULL)
    EXECUTE FUNCTION generate_nomor_usulan();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_pengusulan_updated_at
    BEFORE UPDATE ON public.pengusulan
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. TABEL: penetapan (Data Penetapan Penerima)
-- ============================================
CREATE TABLE IF NOT EXISTS public.penetapan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nomor_penetapan VARCHAR(20) UNIQUE NOT NULL,
    nomor_pendaftar VARCHAR(20) UNIQUE,
    
    -- Relation to pengusulan
    pengusulan_id UUID REFERENCES public.pengusulan(id),
    user_id UUID REFERENCES public.users(id),
    
    -- Data penetapan
    nik VARCHAR(16),
    nama_lengkap VARCHAR(255) NOT NULL,
    program_studi VARCHAR(100),
    institusi VARCHAR(255),
    batch VARCHAR(20),
    tahun_anggaran INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    
    -- Status dana
    status_dana VARCHAR(20) DEFAULT 'pending' CHECK (
        status_dana IN ('pending', 'processing', 'disbursed', 'cancelled', 'suspended')
    ),
    nominal DECIMAL(12,2),
    nomor_rekening VARCHAR(30),
    nama_bank VARCHAR(50),
    
    -- Timestamps
    tanggal_penetapan DATE DEFAULT CURRENT_DATE,
    tanggal_cair DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_penetapan_nomor ON public.penetapan(nomor_penetapan);
CREATE INDEX IF NOT EXISTS idx_penetapan_nik ON public.penetapan(nik);
CREATE INDEX IF NOT EXISTS idx_penetapan_batch ON public.penetapan(batch);
CREATE INDEX IF NOT EXISTS idx_penetapan_status ON public.penetapan(status_dana);
CREATE INDEX IF NOT EXISTS idx_penetapan_pengusulan ON public.penetapan(pengusulan_id);

-- Auto-generate nomor_penetapan
CREATE OR REPLACE FUNCTION generate_nomor_penetapan()
RETURNS TRIGGER AS $$
BEGIN
    NEW.nomor_penetapan := 'PNT-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                            LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_nomor_penetapan
    BEFORE INSERT ON public.penetapan
    FOR EACH ROW
    WHEN (NEW.nomor_penetapan IS NULL)
    EXECUTE FUNCTION generate_nomor_penetapan();

CREATE TRIGGER trigger_penetapan_updated_at
    BEFORE UPDATE ON public.penetapan
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. TABEL: roadmap_kebutuhan (Data Roadmap)
-- ============================================
CREATE TABLE IF NOT EXISTS public.roadmap_kebutuhan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Data program studi
    program_studi VARCHAR(100) NOT NULL,
    jenjang VARCHAR(50), -- S1, S2, Profesi, dll
    
    -- Kuota & pencapaian
    kuota INTEGER NOT NULL DEFAULT 0,
    terdaftar INTEGER DEFAULT 0,
    tersisa INTEGER GENERATED ALWAYS AS (kuota - terdaftar) STORED,
    persentase DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN kuota > 0 THEN ROUND((terdaftar::DECIMAL / kuota) * 100, 2) ELSE 0 END
    ) STORED,
    
    -- Budget
    budget DECIMAL(12,2) DEFAULT 0,
    mata_uang VARCHAR(10) DEFAULT 'IDR',
    
    -- Status & periode
    status VARCHAR(20) DEFAULT 'available' CHECK (
        status IN ('available', 'limited', 'full', 'closed')
    ),
    tahun INTEGER NOT NULL,
    
    -- Metadata
    deskripsi TEXT,
    prioritas INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roadmap_prodi ON public.roadmap_kebutuhan(program_studi);
CREATE INDEX IF NOT EXISTS idx_roadmap_tahun ON public.roadmap_kebutuhan(tahun);
CREATE INDEX IF NOT EXISTS idx_roadmap_status ON public.roadmap_kebutuhan(status);

CREATE TRIGGER trigger_roadmap_updated_at
    BEFORE UPDATE ON public.roadmap_kebutuhan
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. TABEL: dokumen (Upload Dokumen)
-- ============================================
CREATE TABLE IF NOT EXISTS public.dokumen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    pengusulan_id UUID REFERENCES public.pengusulan(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    
    -- Info dokumen
    jenis_dokumen VARCHAR(50) NOT NULL, -- KTP, Ijazah, Rekomendasi, dll
    nama_file VARCHAR(255) NOT NULL,
    ukuran_file INTEGER, -- dalam bytes
    mime_type VARCHAR(100),
    
    -- Storage (Supabase Storage)
    storage_path TEXT, -- path di Supabase Storage
    url TEXT, -- URL publik file
    
    -- Status verifikasi
    status VARCHAR(20) DEFAULT 'uploaded' CHECK (
        status IN ('uploaded', 'verified', 'rejected', 'missing')
    ),
    catatan_verifikasi TEXT,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    
    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dokumen_pengusulan ON public.dokumen(pengusulan_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_jenis ON public.dokumen(jenis_dokumen);
CREATE INDEX IF NOT EXISTS idx_dokumen_status ON public.dokumen(status);

-- ============================================
-- 7. TABEL: informasi_update (Berita/Pengumuman)
-- ============================================
CREATE TABLE IF NOT EXISTS public.informasi_update (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Konten
    judul VARCHAR(500) NOT NULL,
    slug VARCHAR(500),
    konten TEXT,
    excerpt TEXT,
    
    -- Kategori & tags
    kategori VARCHAR(50) DEFAULT 'umum', -- Berita Utama, Pengumuman, Tips, dll
    tags TEXT[],
    
    -- Status publish
    status VARCHAR(20) DEFAULT 'draft' CHECK (
        status IN ('draft', 'published', 'archived')
    ),
    featured BOOLEAN DEFAULT FALSE,
    urgent BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    author_id UUID REFERENCES public.users(id),
    views INTEGER DEFAULT 0,
    
    -- Media
    gambar_url TEXT,
    attachment_url TEXT,
    
    -- Timestamps
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_informasi_status ON public.informasi_update(status);
CREATE INDEX IF NOT EXISTS idx_informasi_kategori ON public.informasi_update(kategori);
CREATE INDEX IF NOT EXISTS idx_informasi_featured ON public.informasi_update(featured);
CREATE INDEX IF NOT EXISTS idx_informasi_slug ON public.informasi_update(slug);

-- Auto-generate slug from judul
CREATE OR REPLACE FUNCTION generate_slug()
RETURNS TRIGGER AS $$
BEGIN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.judul, '[^a-zA-Z0-9 ]', '', 'g'));
    NEW.slug := REPLACE(NEW.slug, ' ', '-');
    NEW.slug := SUBSTRING(NEW.slug, 1, 200) || '-' || EXTRACT(EPOCH FROM NOW())::VARCHAR;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_informasi_slug
    BEFORE INSERT OR UPDATE OF judul ON public.informasi_update
    FOR EACH ROW
    WHEN (NEW.slug IS NULL OR NEW.judul IS DISTINCT FROM OLD.judul)
    EXECUTE FUNCTION generate_slug();

CREATE TRIGGER trigger_informasi_updated_at
    BEFORE UPDATE ON public.informasi_update
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. TABEL: activity_log (Log Aktivitas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User & action
    user_id UUID REFERENCES public.users(id),
    action VARCHAR(100) NOT NULL, -- create, update, delete, submit, approve, reject
    entity_type VARCHAR(50) NOT NULL, -- pengusulan, penetapan, dokumen, dll
    entity_id UUID,
    
    -- Detail
    description TEXT,
    old_data JSONB,
    new_data JSONB,
    
    -- IP & metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON public.activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_log(created_at);

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengusulan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penetapan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_kebutuhan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dokumen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informasi_update ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id OR auth.uid() IS NOT NULL);

-- Policy: Users can insert own data
CREATE POLICY "Users can insert own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = auth.uid());

-- Policy: Users can update own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Anyone can read pengusulan (for admin review)
CREATE POLICY "Pengusulan is readable by authenticated users" ON public.pengusulan
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Users can insert own pengusulan
CREATE POLICY "Users can create own pengusulan" ON public.pengusulan
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Admin can update pengusulan
CREATE POLICY "Admin can update pengusulan" ON public.pengusulan
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Penetapan readable by authenticated users
CREATE POLICY "Penetapan is readable" ON public.penetapan
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Admin can manage penetapan
CREATE POLICY "Admin can manage penetapan" ON public.penetapan
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Policy: Roadmap is publicly readable
CREATE POLICY "Roadmap is publicly readable" ON public.roadmap_kebutuhan
    FOR SELECT USING (true);

-- Policy: Admin can manage roadmap
CREATE POLICY "Admin can manage roadmap" ON public.roadmap_kebutuhan
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Policy: Dokumen linked to pengusulan
CREATE POLICY "Dokumen readable with pengusulan" ON public.dokumen
    FOR SELECT USING (
        auth.role() = 'authenticated'
    );

-- Policy: Users can upload documents
CREATE POLICY "Users can upload documents" ON public.dokumen
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Informasi update publicly readable (published only)
CREATE POLICY "Published informasi is public" ON public.informasi_update
    FOR SELECT USING (status = 'published' OR auth.role() = 'authenticated');

-- Policy: Admin can manage informasi
CREATE POLICY "Admin can manage informasi" ON public.informasi_update
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Policy: Activity log insertable by system
CREATE POLICY "Activity log can be inserted" ON public.activity_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Activity log readable by admins
CREATE POLICY "Activity log readable by admins" ON public.activity_log
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 10. STORAGE BUCKETS (untuk upload file)
-- ============================================
-- Jalankan via Supabase Dashboard > Storage

-- Bucket: documents (untuk dokumen pengusulan)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Bucket: photos (untuk foto profil, dll)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- Storage Policies:
-- Policy: Authenticated users can upload to documents bucket
-- Policy: Users can read their own documents

-- ============================================
-- 11. SEED DATA (Data Awal untuk Testing)
-- ============================================

-- Insert sample roadmap data
INSERT INTO public.roadmap_kebutuhan (program_studi, jenjang, kuota, terdaftar, budget, status, tahun) VALUES
('Keperawatan', 'S1', 150, 142, 7500000, 'available', 2024),
('Kedokteran', 'Profesi', 100, 98, 10000000, 'limited', 2024),
('Kesehatan Masyarakat', 'S2', 80, 65, 5000000, 'available', 2024),
('Farmasi', 'S1', 90, 68, 4500000, 'available', 2024),
('Gizi', 'S1/S2', 80, 47, 3000000, 'available', 2024)
ON CONFLICT DO NOTHING;

-- Insert sample informasi
INSERT INTO public.informasi_update (judul, kategori, konten, status, featured, views, published_at) VALUES
(
    'Pendaftaran Beasiswa Tematik Kesehatan 2024 Resmi Dibuka',
    'Berita Utama',
    'Kementerian Kesehatan membuka pendaftaran beasiswa tematik bidang kesehatan tahun anggaran 2024. Kuota tersedia untuk 500 penerima dari berbagai program studi kesehatan.',
    'published',
    true,
    2534,
    NOW()
),
(
    'Perpanjangan Batas Waktu Pengusulan',
    'Pengumuman',
    'Batas waktu pengiriman usulan diperpanjang hingga 30 Juni 2024 karena tingginya antusiasme pendaftar.',
    'published',
    false,
    1523,
    NOW()
),
(
    'Fitur Baru: Tracking Real-time Status Usulan',
    'Update Sistem',
    'SIMBAKES kini dilengkapi fitur tracking real-time untuk memantau status pengusulan beasiswa secara langsung.',
    'published',
    false,
    876,
    NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 12. FUNCTIONS & TRIGGERS TAMBAHAN
-- ============================================

-- Function: Log activity automatically
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_text TEXT;
BEGIN
    CASE TG_OP
        WHEN 'INSERT' THEN action_text := 'create';
        WHEN 'UPDATE' THEN action_text := 'update';
        WHEN 'DELETE' THEN action_text := 'delete';
        ELSE action_text := TG_OP;
    END CASE;

    INSERT INTO public.activity_log (
        user_id,
        action,
        entity_type,
        entity_id,
        new_data
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
        action_text,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );

    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        UPDATE public.activity_log SET old_data = row_to_json(OLD)
        WHERE id = (
            SELECT id FROM public.activity_log 
            ORDER BY created_at DESC LIMIT 1
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply activity logging to main tables (optional - uncomment if needed)
/*
CREATE TRIGGER log_pengusulan_changes AFTER INSERT OR UPDATE OR DELETE ON public.pengusulan
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_penetapan_changes AFTER INSERT OR UPDATE OR DELETE ON public.penetapan
    FOR EACH ROW EXECUTE FUNCTION log_activity();
*/

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ SIMBAKES Database Schema berhasil dibuat!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tabel yang dibuat:';
    RAISE NOTICE '  - users';
    RAISE NOTICE '  - pengusulan';
    RAISE NOTICE '  - penetapan';
    RAISE NOTICE '  - roadmap_kebutuhan';
    RAISE NOTICE '  - dokumen';
    RAISE NOTICE '  - informasi_update';
    RAISE NOTICE '  - activity_log';
    RAISE NOTICE '';
    RAISE NOTICE 'Langkah selanjutnya:';
    RAISE NOTICE '  1. Update config/supabase-config.js dengan credentials Anda';
    RAISE NOTICE '  2. Setup Storage buckets di Supabase Dashboard';
    RAISE NOTICE '  3. Test koneksi dengan membuka aplikasi';
END $$;
