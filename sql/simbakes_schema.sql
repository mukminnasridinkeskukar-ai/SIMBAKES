-- =====================================================
-- SIMBAKES (Sistem Informasi Beasiswa Kesehatan)
-- Database Schema for Supabase
-- Based on Excel Template: template_simbakes versi supabase (4).xlsx
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILES TABLE (User data from multiusers sheet)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- From multiusers sheet columns
  nama_lengkap VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE,
  email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'aktif', -- aktif, non-aktif
  role VARCHAR(50) DEFAULT 'Pendaftar', -- superadmin, admin, operator, Pendaftar
  
  -- Additional profile fields
  nik VARCHAR(16) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_nik ON public.profiles(nik);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =====================================================
-- 2. DATA_PENGUSULAN TABLE (Application Form - 21 fields)
-- Based on: data_pengusulan sheet from Excel
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pengusulan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nomor_pengajuan VARCHAR(30) UNIQUE, -- Format: SIM-YYYY-XXXXXX
  
  -- Data Pribadi (Personal Data)
  nik VARCHAR(16) NOT NULL,
  nama_lengkap VARCHAR(255) NOT NULL,
  tempat_lahir VARCHAR(100),
  tanggal_lahir DATE,
  
  -- Alamat (Address)
  alamat_ktp TEXT NOT NULL,
  alamat_domisili TEXT,
  lama_domisili_tahun INTEGER DEFAULT 0, -- Years of residence
  
  -- Data Pekerjaan (Employment Data)
  pekerjaan VARCHAR(100), -- Occupation
  posisi_jabatan VARCHAR(100), -- Position/Title
  unit_kerja VARCHAR(255), -- Work Unit
  
  -- Narasi (Narrative)
  penjelasan_narasi TEXT, -- Explanation/Narrative
  
  -- Data Pendidikan Tujuan (Target Education)
  jurusan_tujuan VARCHAR(255) NOT NULL, -- Target Major/Specialization
  jenjang_pendidikan VARCHAR(50) NOT NULL, -- Sp1, S1+Profesi, S2, etc.
  unit_tujuan_pemanfaatan VARCHAR(255) NOT NULL, -- Target Placement Unit
  rencana_tahun_studi INTEGER NOT NULL, -- Planned Study Year (2026, 2027, etc.)
  
  -- Kontak (Contact)
  no_hp VARCHAR(20) NOT NULL, -- Phone number
  no_whatsapp VARCHAR(20), -- WhatsApp
  email VARCHAR(255) NOT NULL,
  
  -- Status & Dokumen
  status VARCHAR(50) DEFAULT 'Sedang Diproses', 
  -- Values: 'Sedang Diproses', 'Diterima (Penetapan)', 'Ditolak', 'Ditarik'
  
  pasfoto TEXT, -- URL to passport photo (Supabase Storage or external link)
  dokumen TEXT, -- URL to documents folder (Google Drive, etc.)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for pengusulan table
CREATE INDEX IF NOT EXISTS idx_pengusulan_user_id ON public.pengusulan(user_id);
CREATE INDEX IF NOT EXISTS idx_pengusulan_nik ON public.pengusulan(nik);
CREATE INDEX IF NOT EXISTS idx_pengusulan_status ON public.pengusulan(status);
CREATE INDEX IF NOT EXISTS idx_pengusulan_jurusan ON public.pengusulan(jurusan_tujuan);
CREATE INDEX IF NOT EXISTS idx_pengusulan_nomor ON public.pengusulan(nomor_pengajuan);

-- =====================================================
-- 3. DATA_PENETAPAN TABLE (Determination/Selection - 13 fields)
-- Based on: data_penetapan sheet from Excel
-- =====================================================
CREATE TABLE IF NOT EXISTS public.penetaan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pengusulan_id UUID REFERENCES public.pengusulan(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core Data (linked to pengusulan)
  nik VARCHAR(16) NOT NULL,
  nama_lengkap VARCHAR(255) NOT NULL,
  jurusan_tujuan VARCHAR(255) NOT NULL,
  jenjang_pendidikan VARCHAR(50) NOT NULL,
  unit_tujuan_pemanfaatan VARCHAR(255) NOT NULL,
  rencana_tahun_studi INTEGER NOT NULL,
  
  -- SK Penetapan (Determination Letter)
  no_sk_penetapan VARCHAR(50) UNIQUE, -- SK Number: SK-SIMBAKES-YYYY-XXX
  tanggal_penetapan DATE,
  status_penetapan VARCHAR(50), -- Final determination status
  catatan_penetapan TEXT, -- Notes/comments
  
  -- Document Links
  link_foto_pasfoto TEXT, -- Passport photo URL
  link_dokumen_pdf TEXT, -- Documents PDF URL
  
  -- Period
  periode_pemberian VARCHAR(50), -- Scholarship period
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for penetapan table
CREATE INDEX IF NOT EXISTS idx_penetapan_pengusulan_id ON public.penetaan(pengusulan_id);
CREATE INDEX IF NOT EXISTS idx_penetapan_user_id ON public.penetaan(user_id);
CREATE INDEX IF NOT EXISTS idx_penetapan_nik ON public.penetaan(nik);
CREATE INDEX IF NOT EXISTS idx_penetapan_sk ON public.penetaan(no_sk_penetapan);

-- =====================================================
-- 4. ROADMAP_KEBUTUHAN TABLE (Requirements Roadmap - 9 fields)
-- Based on: roadmap_kebutuhan sheet from Excel
-- =====================================================
CREATE TABLE IF NOT EXISTS public.roadmap_kebutuhan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- From roadmap_kebutuhan sheet columns
  jurusan VARCHAR(255) NOT NULL, -- Major/Specialization needed
  kualifikasi_awal VARCHAR(255), -- Initial qualification required
  jenis_pendidikan VARCHAR(50), -- Education type: Sp1, Sp2, S1, S2, etc.
  perguruan_tinggi VARCHAR(255), -- University/Institution
  pekerjaan VARCHAR(100), -- Job type: ASN, Non ASN
  tahun_mulai_studi INTEGER, -- Start year
  unit_pendayaguna VARCHAR(255), -- Target utilization unit
  status VARCHAR(50) DEFAULT 'Kosong', -- Kosong, Terisi, Proses
  nama_penerima VARCHAR(255), -- Recipient name (when filled)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for roadmap_kebutuhan
CREATE INDEX IF NOT EXISTS idx_roadmap_jurusan ON public.roadmap_kebutuhan(jurusan);
CREATE INDEX IF NOT EXISTS idx_roadmap_status ON public.roadmap_kebutuhan(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_unit ON public.roadmap_kebutuhan(unit_pendayaguna);

-- =====================================================
-- 5. STORAGE BUCKETS SETUP
-- =====================================================

-- Create bucket for documents (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for documents bucket
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (metadata->>'user_id'));

-- Allow admins to read all files
CREATE POLICY "Admins can read all files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

-- Allow users to update their own files
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND auth.uid()::text = (metadata->>'user_id'))
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (metadata->>'user_id'));

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (metadata->>'user_id'));

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengusulan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penetaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_kebutuhan ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

-- Pengusulan Policies
CREATE POLICY "Users can view own submissions"
  ON public.pengusulan FOR SELECT
  USING (auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin', 'operator')));

CREATE POLICY "Users can insert own submissions"
  ON public.pengusulan FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON public.pengusulan FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update status"
  ON public.pengusulan FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

-- Penetapan Policies
CREATE POLICY "Admins can manage penetapan"
  ON public.penetaan FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

CREATE POLICY "Users can view own penetapan"
  ON public.penetaan FOR SELECT
  USING (auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin', 'operator')));

-- Roadmap Kebutuhan Policies (Public view for reference, Admin manage)
CREATE POLICY "Anyone can view roadmap"
  ON public.roadmap_kebutuhan FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage roadmap"
  ON public.roadmap_kebutuhan FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'superadmin')));

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to auto-generate nomor_pengajuan
CREATE OR REPLACE FUNCTION generate_nomor_pengajuan()
RETURNS TRIGGER AS $$
DECLARE
  year_text TEXT;
  sequence_num INTEGER;
  nomor TEXT;
BEGIN
  year_text := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_pengajuan FROM 10 FOR 6) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM pengusulan
  WHERE nomor_pengajuan LIKE 'SIM-' || year_text || '-%';
  
  nomor := 'SIM-' || year_text || '-' || LPAD(sequence_num::TEXT, 6, '0');
  NEW.nomor_pengajuan := nomor;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating nomor_pengajuan
CREATE TRIGGER trigger_nomor_pengajuan
  BEFORE INSERT ON public.pengusulan
  FOR EACH ROW
  EXECUTE FUNCTION generate_nomor_pengajuan();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_pengusulan_updated_at
  BEFORE UPDATE ON public.pengusulan
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_penetapan_updated_at
  BEFORE UPDATE ON public.penetaan
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_roadmap_updated_at
  BEFORE UPDATE ON public.roadmap_kebutuhan
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create penetapan when pengusulan is accepted
CREATE OR REPLACE FUNCTION handle_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to 'Diterima (Penetapan)', create penetapan record
  IF OLD.status != 'Diterima (Penetapan)' AND NEW.status = 'Diterima (Penetapan)' THEN
    INSERT INTO public.penetaan (
      pengusulan_id,
      user_id,
      nik,
      nama_lengkap,
      jurusan_tujuan,
      jenjang_pendidikan,
      unit_tujuan_pemanfaatan,
      rencana_tahun_studi,
      link_foto_pasfoto,
      link_dokumen_pdf
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NEW.nik,
      NEW.nama_lengkap,
      NEW.jurusan_tujuan,
      NEW.jenjang_pendidikan,
      NEW.unit_tujuan_pemanfaatan,
      NEW.rencana_tahun_studi,
      NEW.pasfoto,
      NEW.dokumen
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-sync to penetapan
CREATE TRIGGER trigger_sync_to_penetapan
  AFTER UPDATE OF status ON public.pengusulan
  FOR EACH ROW
  WHEN (NEW.status = 'Diterima (Penetapan)')
  EXECUTE FUNCTION handle_status_change();

-- =====================================================
-- 8. SAMPLE REFERENCE DATA
-- =====================================================

-- Jenjang Pendidikan options (from Excel data)
-- VALUES: 'Sp1', 'S1 + Profesi', 'S2', 'Sp2', 's1_profesi_unmul', 's2_ugm', etc.

-- Jurusan Tujuan options (from roadmap_kebutuhan):
-- Examples:
-- - spesialis_radiologi
-- - spesialis_anak
-- - spesialis_bedah
-- - bidan
-- - dokter_umum
-- - magister_farmasi_klinik
-- - Spesialis Jantung dan Pembuluh Darah
-- - Spesialis Jantung - Intervensi
-- - etc.

-- Unit Tujuan Pemanfaatan options:
-- - RSUD Aji Muhammad Idris
-- - RSUD Aji Batara Agung Dewa Sakti
-- - RSUD Aji Muhammad Parikesit
-- - Puskesmas [various]
-- - Klinik Satelit [various]

-- Status options:
-- For pengusulan: 'Sedang Diproses', 'Diterima (Penetapan)', 'Ditolak', 'Ditarik'
-- For roadmap: 'Kosong', 'Terisi', 'Proses'
-- For penetapan: Various final statuses

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- Comments for documentation
COMMENT ON TABLE public.profiles IS 'User profiles - based on multiusers sheet';
COMMENT ON TABLE public.pengusulan IS 'Scholarship applications - based on data_pengusulan sheet (21 columns)';
COMMENT ON TABLE public.penetaan IS 'Scholarship determinations - based on data_penetapan sheet (13 columns)';
COMMENT ON TABLE public.roadmap_kebutuhan IS 'Requirements roadmap - based on roadmap_kebutuhan sheet (9 columns)';
