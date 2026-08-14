-- =====================================================
-- SIMBAKES v4.0 - SQL SCHEMA FOR SUPABASE
-- =====================================================
-- 
-- 📊 SOURCE: template_simbakes versi supabase (4).xlsx
-- ✅ 100% PRESISI SESUAI HEADER EXCEL
--
-- SHEETS & COLUMNS:
--   1. data_pengusulan   → 21 columns
--   2. data_penetapan    → 13 columns  
--   3. multiusers        → 6 columns
--   4. roadmap_kebutuhan → 9 columns
--
-- TOTAL: 4 TABLES | 49 COLUMNS | BASED ON EXCEL HEADERS
--
-- Created: 2026-08-14
-- For: Supabase PostgreSQL Database
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE 1: multiusers
-- =====================================================
-- Source Sheet: "multiusers"
-- Total Columns: 6
-- Total Rows (Sample): 3
-- -----------------------------------------------------
-- Mapping:
--   Excel Column #1  → nama_lengkap
--   Excel Column #2  → username
--   Excel Column #3  → password
--   Excel Column #4  → email
--   Excel Column #5  → status
--   Excel Column #6  → role
-- =====================================================

CREATE TABLE IF NOT EXISTS public.multiusers (
    -- Auto-generated ID (not in Excel, but needed for DB)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Excel Column #1: nama_lengkap
    -- Type: VARCHAR/TEXT
    -- Sample: 'Mukmin Nasri', 'Eta', 'Syarifah Putri'
    -- Required: YES (all 3 rows have values)
    nama_lengkap VARCHAR(255) NOT NULL,
    
    -- Excel Column #2: username
    -- Type: VARCHAR/TEXT
    -- Sample: 'superadmin', 'operator2', 'operator1'
    -- Required: YES (unique identifier for login)
    username VARCHAR(100) NOT NULL UNIQUE,
    
    -- Excel Column #3: password
    -- Type: VARCHAR/TEXT (hashed in production)
    -- Sample: 'Aida2007###', 'EtaSDMK2024@', 'Puput2026##'
    -- Note: Store as hash, not plaintext in production
    password VARCHAR(255) NOT NULL,
    
    -- Excel Column #4: email
    -- Type: VARCHAR/TEXT
    -- Sample: 'mukminnasri.dinkeskukar@gmail.com', NULL, NULL
    -- Required: NO (only 1 of 3 rows has value)
    email VARCHAR(255),
    
    -- Excel Column #5: status
    -- Type: VARCHAR/TEXT
    -- Sample: 'aktif' (all rows)
    -- Values expected: 'aktif', 'non-aktif', 'blocked'
    status VARCHAR(50) DEFAULT 'aktif',
    
    -- Excel Column #6: role
    -- Type: VARCHAR/TEXT
    -- Sample: 'superadmin', 'admin', 'operator'
    -- Values expected: 'superadmin', 'admin', 'operator', 'Pendaftar'
    role VARCHAR(50) DEFAULT 'Pendaftar',
    
    -- Metadata (not in Excel)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for multiusers
CREATE INDEX IF NOT EXISTS idx_multiusers_username ON public.multiusers(username);
CREATE INDEX IF NOT EXISTS idx_multiusers_role ON public.multiusers(role);
CREATE INDEX IF NOT EXISTS idx_multiusers_status ON public.multiusers(status);

COMMENT ON TABLE public.multiusers IS 'User accounts - from Excel sheet "multiusers" (6 columns)';
COMMENT ON COLUMN public.multiusers.nama_lengkap IS 'Excel Col #1: Full name';
COMMENT ON COLUMN public.multiusers.username IS 'Excel Col #2: Login username (unique)';
COMMENT ON COLUMN public.multiusers.password IS 'Excel Col #3: Password (hash this in production)';
COMMENT ON COLUMN public.multiusers.email IS 'Excel Col #4: Email address (optional)';
COMMENT ON COLUMN public.multiusers.status IS 'Excel Col #5: Account status (aktif/non-aktif)';
COMMENT ON COLUMN public.multiusers.role IS 'Excel Col #6: User role (superadmin/admin/operator/Pendaftar)';


-- =====================================================
-- TABLE 2: data_pengusulan
-- =====================================================
-- Source Sheet: "data_pengusulan"
-- Total Columns: 21
-- Total Rows (Sample): 95
-- -----------------------------------------------------
-- Mapping:
--   Excel Column #1  → nik
--   Excel Column #2  → nama_lengkap
--   Excel Column #3  → tempat_lahir
--   Excel Column #4  → tanggal_lahir
--   Excel Column #5  → alamat_ktp
--   Excel Column #6  → alamat_domisili
--   Excel Column #7  → lama_domisili_tahun
--   Excel Column #8  → pekerjaan
--   Excel Column #9  → posisi_jabatan
--   Excel Column #10 → unit_kerja
--   Excel Column #11 → penjelasan_narasi
--   Excel Column #12 → jurusan_tujuan
--   Excel Column #13 → jenjang_pendidikan
--   Excel Column #14 → unit_tujuan_pemanfaatan
--   Excel Column #15 → rencana_tahun_studi
--   Excel Column #16 → no_hp
--   Excel Column #17 → no_whatsapp
--   Excel Column #18 → email
--   Excel Column #19 → status
--   Excel Column #20 → pasfoto
--   Excel Column #21 → dokumen
-- =====================================================

CREATE TABLE IF NOT EXISTS public.data_pengusulan (
    -- Auto-generated ID (not in Excel, but needed for DB)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to multiusers table (for auth relationship)
    user_id UUID REFERENCES public.multiusers(id) ON DELETE SET NULL,
    
    -- Auto-generated application number (format: SIM-YYYY-XXXXXX)
    nomor_pengajuan VARCHAR(30) UNIQUE,
    
    -- ============================================
    -- DATA PRIBADI (Personal Data)
    -- Excel Columns: #1 - #4
    -- ============================================
    
    -- Excel Column #1: nik
    -- Type: NUMERIC stored as VARCHAR (16 digits)
    -- Sample: '6402137101990001', '6402061211970002', '6402061708900003'
    -- Format: Indonesian NIK (Nomor Induk Kependudukan) - exactly 16 digits
    -- Required: YES (95/95 rows have values)
    nik VARCHAR(16) NOT NULL,
    
    -- Excel Column #2: nama_lengkap
    -- Type: VARCHAR/TEXT
    -- Sample: 'Devi Nilam Laila Safitri', 'Dani Alfian', 'Salsabila Azzahra'
    -- Required: YES (95/95 rows have values)
    nama_lengkap VARCHAR(255) NOT NULL,
    
    -- Excel Column #3: tempat_lahir
    -- Type: VARCHAR/TEXT
    -- Sample: 'Tenggarong', 'Blitar', 'Tenggarong'
    -- Required: YES (95/95 rows have values)
    tempat_lahir VARCHAR(100) NOT NULL,
    
    -- Excel Column #4: tanggal_lahir
    -- Type: DATE (stored as TIMESTAMP in Excel)
    -- Sample: '1999-01-31', '1997-11-12', '1999-08-17'
    -- Required: NO (93/95 rows have values, 2 null)
    tanggal_lahir DATE,
    
    -- ============================================
    -- ALAMAT (Address)
    -- Excel Columns: #5 - #7
    -- ============================================
    
    -- Excel Column #5: alamat_ktp
    -- Type: TEXT (long address)
    -- Sample: 'JL BPPN Handil II RT001/RW000, Sungai Seluang, samboja, kalimantan timur'
    -- Required: YES (95/95 rows have values)
    alamat_ktp TEXT NOT NULL,
    
    -- Excel Column #6: alamat_domisili
    -- Type: TEXT (long address)
    -- Sample: Same as alamat_ktp or different current address
    -- Required: NO (93/95 rows have values, 2 null)
    alamat_domisili TEXT,
    
    -- Excel Column #7: lama_domisili_tahun
    -- Type: INTEGER/NUMERIC
    -- Sample: 5, 4, 5 (years)
    -- Required: YES (95/95 rows have values)
    lama_domisili_tahun INTEGER DEFAULT 0,
    
    -- ============================================
    -- DATA PEKERJAAN (Employment Data)
    -- Excel Columns: #8 - #11
    -- ============================================
    
    -- Excel Column #8: pekerjaan
    -- Type: VARCHAR/TEXT
    -- Sample: 'Belum Bekerja', 'Bekerja', NULL
    -- Required: NO (77/95 rows have values, 18 null)
    pekerjaan VARCHAR(100),
    
    -- Excel Column #9: posisi_jabatan
    -- Type: VARCHAR/TEXT
    -- Sample: 'Belum Bekerja', 'Bekerja', NULL
    -- Required: NO (77/95 rows have values, 18 null)
    posisi_jabatan VARCHAR(100),
    
    -- Excel Column #10: unit_kerja
    -- Type: VARCHAR/TEXT
    -- Sample: 'Puskesmas Samboja', 'Klinik Satelit 2 Bengalon', '-'
    -- Required: NO (69/95 rows have values, 26 null)
    unit_kerja VARCHAR(255),
    
    -- Excel Column #11: penjelasan_narasi
    -- Type: TEXT (narrative/explanation)
    -- Sample: 'Sudah selesai pendidikan S1 Psikolog Umum', 'Sudah punya ijazah S1 Farmasi...'
    -- Required: NO (42/95 rows have values, 53 null)
    penjelasan_narasi TEXT,
    
    -- ============================================
    -- DATA PENDIDIKAN TUJUAN (Target Education)
    -- Excel Columns: #12 - #15
    -- ============================================
    
    -- Excel Column #12: jurusan_tujuan
    -- Type: VARCHAR/TEXT
    -- Sample: 'spesialis_radiologi', 'spesialis_anak', 'spesialis_bedah'
    -- Also: 'bidan', 'dokter_umum', 'magister_farmasi_klinik'
    -- Required: YES (95/95 rows have values)
    jurusan_tujuan VARCHAR(255) NOT NULL,
    
    -- Excel Column #13: jenjang_pendidikan
    -- Type: VARCHAR/TEXT
    -- Sample: 'Sp1', 'Sp2', 'S1 + Profesi', 's1_profesi_unmul', 's2_ugm'
    -- Required: YES (95/95 rows have values)
    jenjang_pendidikan VARCHAR(50) NOT NULL,
    
    -- Excel Column #14: unit_tujuan_pemanfaatan
    -- Type: VARCHAR/TEXT
    -- Sample: 'RSUD Aji Muhammad Idris', 'RSUD Aji Batara Agung Dewa Sakti', 'puskesmas_kahala'
    -- Required: YES (95/95 rows have values)
    unit_tujuan_pemanfaatan VARCHAR(255) NOT NULL,
    
    -- Excel Column #15: rencana_tahun_studi
    -- Type: INTEGER/NUMERIC
    -- Sample: 2026, 2027
    -- Required: NO (93/95 rows have values, 2 null)
    rencana_tahun_studi INTEGER,
    
    -- ============================================
    -- KONTAK (Contact Information)
    -- Excel Columns: #16 - #18
    -- ============================================
    
    -- Excel Column #16: no_hp
    -- Type: NUMERIC stored as VARCHAR (phone number)
    -- Sample: '895342049731', '81350012810', '82225564499'
    -- Format: Indonesian phone number (10-13 digits)
    -- Required: YES (95/95 rows have values)
    no_hp VARCHAR(20) NOT NULL,
    
    -- Excel Column #17: no_whatsapp
    -- Type: NUMERIC stored as VARCHAR (WhatsApp number)
    -- Sample: '895342049731', '81350012810', '82225564499'
    -- Note: Often same as no_hp
    -- Required: NO (93/95 rows have values, 2 null)
    no_whatsapp VARCHAR(20),
    
    -- Excel Column #18: email
    -- Type: VARCHAR/TEXT
    -- Sample: 'Nilamlaila31@gmail.com', 'danyalfian1@gmail.com', 'Ikhsanhanafi99@gmail.com'
    -- Required: NO (92/95 rows have values, 3 null)
    email VARCHAR(255),
    
    -- ============================================
    -- STATUS & DOKUMEN
    -- Excel Columns: #19 - #21
    -- ============================================
    
    -- Excel Column #19: status
    -- Type: VARCHAR/TEXT
    -- Sample: All NULL in Excel data (status tracked separately)
    -- Expected values: 'Sedang Diproses', 'Diterima (Penetapan)', 'Ditolak', 'Ditarik'
    -- Default: 'Sedang Diproses'
    status VARCHAR(50) DEFAULT 'Sedang Diproses',
    
    -- Excel Column #20: pasfoto
    -- Type: TEXT (URL link)
    -- Sample: 'https://drive.google.com/file/d/.../view?usp=drivesdk'
    -- Contains: Google Drive link to passport photo
    -- Required: NO (78/95 rows have values, 17 null)
    pasfoto TEXT,
    
    -- Excel Column #21: dokumen
    -- Type: TEXT (URL link)
    -- Sample: 'https://drive.google.com/drive/folders/...?usp=sharing'
    -- Contains: Google Drive folder link with all documents
    -- Required: NO (94/95 rows have values, 1 null)
    dokumen TEXT,
    
    -- ============================================
    -- METADATA (Not in Excel, required for DB operations)
    -- ============================================
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data_pengusulan
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_user_id ON public.data_pengusulan(user_id);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_nomor_pengajuan ON public.data_pengusulan(nomor_pengajuan);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_nik ON public.data_pengusulan(nik);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_status ON public.data_pengusulan(status);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_jurusan_tujuan ON public.data_pengusulan(jurusan_tujuan);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_jenjang_pendidikan ON public.data_pengusulan(jenjang_pendidikan);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_unit_tujuan ON public.data_pengusulan(unit_tujuan_pemanfaatan);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_email ON public.data_pengusulan(email);

-- Table comment
COMMENT ON TABLE public.data_pengusulan IS 'Scholarship applications - from Excel sheet "data_pengusulan" (21 columns, 95 sample rows)';

-- Column comments with Excel mapping
COMMENT ON COLUMN public.data_pengusulan.nik IS 'Excel Col #1: NIK (16 digit Nomor Induk Kependudukan)';
COMMENT ON COLUMN public.data_pengusulan.nama_lengkap IS 'Excel Col #2: Full name as per KTP';
COMMENT ON COLUMN public.data_pengusulan.tempat_lahir IS 'Excel Col #3: Place of birth';
COMMENT ON COLUMN public.data_pengusulan.tanggal_lahir IS 'Excel Col #4: Date of birth (DATE type)';
COMMENT ON COLUMN public.data_pengusulan.alamat_ktp IS 'Excel Col #5: Full address per KTP (TEXT for long addresses)';
COMMENT ON COLUMN public.data_pengusulan.alamat_domisili IS 'Excel Col #6: Current domicile address';
COMMENT ON COLUMN public.data_pengusulan.lama_domisili_tahun IS 'Excel Col #7: Years of residence at domicile (INTEGER)';
COMMENT ON COLUMN public.data_pengusulan.pekerjaan IS 'Excel Col #8: Occupation status';
COMMENT ON COLUMN public.data_pengusulan.posisi_jabatan IS 'Excel Col #9: Position/job title';
COMMENT ON COLUMN public.data_pengusulan.unit_kerja IS 'Excel Col #10: Work unit/institution';
COMMENT ON COLUMN public.data_pengusulan.penjelasan_narasi IS 'Excel Col #11: Narrative explanation for scholarship application';
COMMENT ON COLUMN public.data_pengusulan.jurusan_tujuan IS 'Excel Col #12: Target major/specialization (e.g., spesialis_radiologi)';
COMMENT ON COLUMN public.data_pengusulan.jenjang_pendidikan IS 'Excel Col #13: Education level (Sp1, Sp2, S1+Profesi, etc.)';
COMMENT ON COLUMN public.data_pengusulan.unit_tujuan_pemanfaatan IS 'Excel Col #14: Target placement unit after study';
COMMENT ON COLUMN public.data_pengusulan.rencana_tahun_studi IS 'Excel Col #15: Planned year to start studies (INTEGER)';
COMMENT ON COLUMN public.data_pengusulan.no_hp IS 'Excel Col #16: Phone number (VARCHAR for leading zeros)';
COMMENT ON COLUMN public.data_pengusulan.no_whatsapp IS 'Excel Col #17: WhatsApp number';
COMMENT ON COLUMN public.data_pengusulan.email IS 'Excel Col #18: Email address';
COMMENT ON COLUMN public.data_pengusulan.status IS 'Excel Col #19: Application status (NULL in Excel data, managed via system)';
COMMENT ON COLUMN public.data_pengusulan.pasfoto IS 'Excel Col #20: URL to passport photo (Google Drive link)';
COMMENT ON COLUMN public.data_pengusulan.dokumen IS 'Excel Col #21: URL to documents folder (Google Drive link)';


-- =====================================================
-- TABLE 3: data_penetapan
-- =====================================================
-- Source Sheet: "data_penetapan"
-- Total Columns: 13
-- Total Rows (Sample): 18
-- -----------------------------------------------------
-- Mapping:
--   Excel Column #1  → nik
--   Excel Column #2  → nama_lengkap
--   Excel Column #3  → jurusan_tujuan
--   Excel Column #4  → jenjang_pendidikan
--   Excel Column #5  → unit_tujuan_pemanfaatan
--   Excel Column #6  → rencana_tahun_studi
--   Excel Column #7  → no_sk_penetapan
--   Excel Column #8  → tanggal_penetapan
--   Excel Column #9  → status_penetapan
--   Excel Column #10 → catatan_penetapan
--   Excel Column #11 → link_foto_pasfoto
--   Excel Column #12 → link_dokumen_pdf
--   Excel Column #13 → periode_pemberian
-- =====================================================

CREATE TABLE IF NOT EXISTS public.data_penetapan (
    -- Auto-generated ID (not in Excel, but needed for DB)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to pengusulan table (original application)
    pengusulan_id UUID REFERENCES public.data_pengusulan(id) ON DELETE SET NULL,
    
    -- Link to multiusers table (recipient user)
    user_id UUID REFERENCES public.multiusers(id) ON DELETE SET NULL,
    
    -- ============================================
    -- CORE DATA (from original application)
    -- Excel Columns: #1 - #6
    -- ============================================
    
    -- Excel Column #1: nik
    -- Type: NUMERIC stored as VARCHAR (16 digits)
    -- Sample: '6402144203080002', '6402060309080002', '6402146910010001'
    -- Required: YES (18/18 rows have values)
    nik VARCHAR(16) NOT NULL,
    
    -- Excel Column #2: nama_lengkap
    -- Type: VARCHAR/TEXT
    -- Sample: 'Siti Patimah', 'Rizqullah Zaidan Fallah', 'Salsabila Azzahra'
    -- Required: YES (18/18 rows have values)
    nama_lengkap VARCHAR(255) NOT NULL,
    
    -- Excel Column #3: jurusan_tujuan
    -- Type: VARCHAR/TEXT
    -- Sample: 'bidan', 'dokter_umum', 'magister_farmasi_klinik'
    -- Note: lowercase format in this sheet vs lowercase in pengusulan
    -- Required: YES (18/18 rows have values)
    jurusan_tujuan VARCHAR(255) NOT NULL,
    
    -- Excel Column #4: jenjang_pendidikan
    -- Type: VARCHAR/TEXT
    -- Sample: 'S1 + Profesi', 's1_profesi_unmul', 's2_ugm'
    -- Required: YES (18/18 rows have values)
    jenjang_pendidikan VARCHAR(50) NOT NULL,
    
    -- Excel Column #5: unit_tujuan_pemanfaatan
    -- Type: VARCHAR/TEXT
    -- Sample: 'RSUD Aji Batara Agung Dewa Sakti', 'puskesmas_kahala', 'rsud_aji_batara_agung_dewa_sakti'
    -- Note: Some use underscores instead of spaces
    -- Required: YES (18/18 rows have values)
    unit_tujuan_pemanfaatan VARCHAR(255) NOT NULL,
    
    -- Excel Column #6: rencana_tahun_studi
    -- Type: INTEGER/NUMERIC
    -- Sample: 2026 (all rows)
    -- Required: YES (18/18 rows have values)
    rencana_tahun_studi INTEGER NOT NULL,
    
    -- ============================================
    -- SK PENETAPAN (Determination Letter Data)
    -- Excel Columns: #7 - #10
    -- ============================================
    
    -- Excel Column #7: no_sk_penetapan
    -- Type: VARCHAR/TEXT
    -- Sample: All NULL in Excel (to be generated upon approval)
    -- Format expected: 'SK-SIMBAKES-2026-XXX'
    -- Required: NO (0/18 rows have values - generated by system)
    no_sk_penetapan VARCHAR(50),
    
    -- Excel Column #8: tanggal_penetapan
    -- Type: DATE
    -- Sample: All NULL in Excel (to be set upon approval)
    -- Required: NO (0/18 rows have values)
    tanggal_penetapan DATE,
    
    -- Excel Column #9: status_penetapan
    -- Type: VARCHAR/TEXT
    -- Sample: All NULL in Excel
    -- Expected values: 'Aktif', 'Selesai', 'Dicabut'
    -- Required: NO (0/18 rows have values)
    status_penetapan VARCHAR(50),
    
    -- Excel Column #10: catatan_penetapan
    -- Type: TEXT
    -- Sample: All NULL in Excel
    -- For admin notes/comments on the determination
    -- Required: NO (0/18 rows have values)
    catatan_penetapan TEXT,
    
    -- ============================================
    -- DOCUMENT LINKS
    -- Excel Columns: #11 - #12
    -- ============================================
    
    -- Excel Column #11: link_foto_pasfoto
    -- Type: TEXT (URL)
    -- Sample: 'https://drive.google.com/file/d/1QoFj-J_D-RCZk5d89dxGB3DHz2lB-KF2/view?usp=sharing'
    -- Direct link to recipient's photo
    -- Required: YES (18/18 rows have values)
    link_foto_pasfoto TEXT,
    
    -- Excel Column #12: link_dokumen_pdf
    -- Type: TEXT (URL)
    -- Sample: 'https://drive.google.com/file/d/10Z2KskCwR0_1Us8fwu-ydRV4tNWN4SNT/view?usp=sharing'
    -- Direct link to PDF documents
    -- Required: YES (18/18 rows have values)
    link_dokumen_pdf TEXT,
    
    -- ============================================
    -- PERIOD INFO
    -- Excel Column #13
    -- ============================================
    
    -- Excel Column #13: periode_pemberian
    -- Type: VARCHAR/TEXT
    -- Sample: All NULL in Excel
    -- Expected: '2026', '2026/2027', etc.
    -- Required: NO (0/18 rows have values)
    periode_pemberian VARCHAR(50),
    
    -- ============================================
    -- METADATA (Not in Excel, required for DB operations)
    -- ============================================
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data_penetapan
CREATE INDEX IF NOT EXISTS idx_data_penetapan_pengusulan_id ON public.data_penetapan(pengusulan_id);
CREATE INDEX IF NOT EXISTS idx_data_penetapan_user_id ON public.data_penetapan(user_id);
CREATE INDEX IF NOT EXISTS idx_data_penetapan_nik ON public.data_penetapan(nik);
CREATE INDEX IF NOT EXISTS idx_data_penetapan_no_sk ON public.data_penetapan(no_sk_penetapan);
CREATE INDEX IF NOT EXISTS idx_data_penetapan_status ON public.data_penetapan(status_penetapan);
CREATE INDEX IF NOT EXISTS idx_data_penetapan_periode ON public.data_penetapan(periode_pemberian);

-- Table comment
COMMENT ON TABLE public.data_penetapan IS 'Scholarship recipients determination - from Excel sheet "data_penetapan" (13 columns, 18 sample rows)';

-- Column comments with Excel mapping
COMMENT ON COLUMN public.data_penetapan.nik IS 'Excel Col #1: NIK of recipient';
COMMENT ON COLUMN public.data_penetapan.nama_lengkap IS 'Excel Col #2: Recipient full name';
COMMENT ON COLUMN public.data_penetapan.jurusan_tujuan IS 'Excel Col #3: Major/specialization (lowercase format)';
COMMENT ON COLUMN public.data_penetapan.jenjang_pendidikan IS 'Excel Col #4: Education level';
COMMENT ON COLUMN public.data_penetapan.unit_tujuan_pemanfaatan IS 'Excel Col #5: Placement unit';
COMMENT ON COLUMN public.data_penetapan.rencana_tahun_studi IS 'Excel Col #6: Study year (INTEGER)';
COMMENT ON COLUMN public.data_penetapan.no_sk_penetapan IS 'Excel Col #7: SK determination number (generated by system)';
COMMENT ON COLUMN public.data_penetapan.tanggal_penetapan IS 'Excel Col #8: Determination date (set upon approval)';
COMMENT ON COLUMN public.data_penetapan.status_penetapan IS 'Excel Col #9: Determination status';
COMMENT ON COLUMN public.data_penetapan.catatan_penetapan IS 'Excel Col #10: Admin notes on determination';
COMMENT ON COLUMN public.data_penetapan.link_foto_pasfoto IS 'Excel Col #11: Google Drive URL to photo';
COMMENT ON COLUMN public.data_penetapan.link_dokumen_pdf IS 'Excel Col #12: Google Drive URL to PDF documents';
COMMENT ON COLUMN public.data_penetapan.periode_pemberian IS 'Excel Col #13: Scholarship period (e.g., 2026)';


-- =====================================================
-- TABLE 4: roadmap_kebutuhan
-- =====================================================
-- Source Sheet: "roadmap_kebutuhan"
-- Total Columns: 9
-- Total Rows (Sample): 384
-- -----------------------------------------------------
-- Mapping:
--   Excel Column #1  → jurusan
--   Excel Column #2  → kualifikasi_awal
--   Excel Column #3  → jenis_pendidikan
--   Excel Column #4  → perguruan_tinggi
--   Excel Column #5  → pekerjaan
--   Excel Column #6  → tahun_mulai_studi
--   Excel Column #7  → unit_pendayaguna
--   Excel Column #8  → status
--   Excel Column #9  → nama_penerima
-- =====================================================

CREATE TABLE IF NOT EXISTS public.roadmap_kebutuhan (
    -- Auto-generated ID (not in Excel, but needed for DB)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- ============================================
    -- EDUCATION REQUIREMENT DETAILS
    -- Excel Columns: #1 - #4
    -- ============================================
    
    -- Excel Column #1: jurusan
    -- Type: VARCHAR/TEXT
    -- Sample: 'Spesialis Jantung dan Pembuluh Darah', 'Spesialis Jantung - Intervensi'
    --         'Spesialis Anak', 'Spesialis Bedah', 'Bidan', 'Dokter Umum'
    -- Required: YES (384/384 rows have values)
    jurusan VARCHAR(255) NOT NULL,
    
    -- Excel Column #2: kualifikasi_awal
    -- Type: VARCHAR/TEXT
    -- Sample: 'Dokter Umum', 'Dokter Spesialis Jantung', NULL
    -- Initial qualification required before this program
    -- Required: NO (165/384 rows have values, 219 null)
    kualifikasi_awal VARCHAR(255),
    
    -- Excel Column #3: jenis_pendidikan
    -- Type: VARCHAR/TEXT
    -- Sample: 'Sp1', 'Sp2', 'S1 + Profesi', 'S2', 'S3'
    -- Education type/level code
    -- Required: YES (384/384 rows have values)
    jenis_pendidikan VARCHAR(50) NOT NULL,
    
    -- Excel Column #4: perguruan_tinggi
    -- Type: VARCHAR/TEXT
    -- Sample: 'Universitas Hasanuddin', 'Universitas Airlangga'
    --         'Universitas Gadjah Mada / RSUP Dr. Sardjito'
    -- University/Institution name
    -- Required: NO (378/384 rows have values, 6 null)
    perguruan_tinggi VARCHAR(255),
    
    -- ============================================
    -- EMPLOYMENT & PLACEMENT
    -- Excel Columns: #5 - #7
    -- ============================================
    
    -- Excel Column #5: pekerjaan
    -- Type: VARCHAR/TEXT
    -- Sample: 'Non ASN', 'ASN' (mostly Non ASN)
    -- Employment type
    -- Required: NO (377/384 rows have values, 7 null)
    pekerjaan VARCHAR(100),
    
    -- Excel Column #6: tahun_mulai_studi
    -- Type: INTEGER/NUMERIC
    -- Sample: 2026, 2027, 2028, 2029
    -- Year when study program starts
    -- Required: YES (384/384 rows have values)
    tahun_mulai_studi INTEGER NOT NULL,
    
    -- Excel Column #7: unit_pendayaguna
    -- Type: VARCHAR/TEXT
    -- Sample: 'RSUD Aji Muhammad Parikesit', 'RSUD Aji Muhammad Idris'
    --         'Puskesmas [various]', 'Klinik [various]'
    -- Target unit where graduate will be placed
    -- Required: YES (384/384 rows have values)
    unit_pendayaguna VARCHAR(255) NOT NULL,
    
    -- ============================================
    -- STATUS & RECIPIENT
    -- Excel Columns: #8 - #9
    -- ============================================
    
    -- Excel Column #8: status
    -- Type: VARCHAR/TEXT
    -- Sample: 'Terisi', 'Kosong' (also possibly 'Proses')
    -- Whether position is filled or vacant
    -- Required: NO (85/384 rows have values, 299 null)
    status VARCHAR(50) DEFAULT 'Kosong',
    
    -- Excel Column #9: nama_penerima
    -- Type: VARCHAR/TEXT
    -- Sample: 'dr. Cassandra Savira Alisa', 'dr. Yoga Alfian Noor, SpJP, FIHA'
    -- Name of person filling this position (if any)
    -- Required: NO (35/384 rows have values, 349 null)
    nama_penerima VARCHAR(255),
    
    -- ============================================
    -- METADATA (Not in Excel, required for DB operations)
    -- ============================================
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for roadmap_kebutuhan
CREATE INDEX IF NOT EXISTS idx_roadmap_jurusan ON public.roadmap_kebutuhan(jurusan);
CREATE INDEX IF NOT EXISTS idx_roadmap_jenis_pendidikan ON public.roadmap_kebutuhan(jenis_pendidikan);
CREATE INDEX IF NOT EXISTS idx_roadmap_unit_pendayaguna ON public.roadmap_kebutuhan(unit_pendayaguna);
CREATE INDEX IF NOT EXISTS idx_roadmap_status ON public.roadmap_kebutuhan(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_tahun_mulai ON public.roadmap_kebutuhan(tahun_mulai_studi);
CREATE INDEX IF NOT EXISTS idx_roadmap_perguruan ON public.roadmap_kebutuhan(perguruan_tinggi);

-- Table comment
COMMENT ON TABLE public.roadmap_kebutuhan IS 'Healthcare HR needs roadmap - from Excel sheet "roadmap_kebutuhan" (9 columns, 384 sample rows)';

-- Column comments with Excel mapping
COMMENT ON COLUMN public.roadmap_kebutuhan.jurusan IS 'Excel Col #1: Major/specialization needed';
COMMENT ON COLUMN public.roadmap_kebutuhan.kualifikasi_awal IS 'Excel Col #2: Initial qualification required';
COMMENT ON COLUMN public.roadmap_kebutuhan.jenis_pendidikan IS 'Excel Col #3: Education type (Sp1, Sp2, S1, S2, etc.)';
COMMENT ON COLUMN public.roadmap_kebutuhan.perguruan_tinggi IS 'Excel Col #4: University/Institution';
COMMENT ON COLUMN public.roadmap_kebutuhan.pekerjaan IS 'Excel Col #5: Employment type (ASN/Non ASN)';
COMMENT ON COLUMN public.roadmap_kebutuhan.tahun_mulai_studi IS 'Excel Col #6: Start year of study program';
COMMENT ON COLUMN public.roadmap_kebutuhan.unit_pendayaguna IS 'Excel Col #7: Target placement unit';
COMMENT ON COLUMN public.roadmap_kebutuhan.status IS 'Excel Col #8: Filling status (Terisi/Kosong/Proses)';
COMMENT ON COLUMN public.roadmap_kebutuhan.nama_penerima IS 'Excel Col #9: Name of recipient (if filled)';


-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================
-- Create bucket for document uploads

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON storage.buckets.documents IS 'Storage bucket for scholarship application documents (pasfoto, ktp, ktm, transkrip)';


-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.multiusers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pengusulan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_penetapan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_kebutuhan ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- POLICIES FOR: multiusers
-- ----------------------------------------

-- Users can view their own profile
CREATE POLICY "multiusers_select_own" ON public.multiusers
    FOR SELECT USING (auth.uid()::text = id::text);

-- Admins can view all users
CREATE POLICY "multiusers_select_admin" ON public.multiusers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.multiusers 
            WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
        )
    );

-- Users can update their own profile
CREATE POLICY "multiusers_update_own" ON public.multiusers
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Only superadmin can insert new users
CREATE POLICY "multiusers_insert_admin" ON public.multiusers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.multiusers 
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );

-- ----------------------------------------
-- POLICIES FOR: data_pengusulan
-- ----------------------------------------

-- Users can view their own submissions
CREATE POLICY "pengusulan_select_own" ON public.data_pengusulan
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.multiusers 
            WHERE id = auth.uid() AND role IN ('superadmin', 'admin', 'operator')
        )
    );

-- Users can insert their own submissions
CREATE POLICY "pengusulan_insert_auth" ON public.data_pengusulan
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own submissions (before approval)
CREATE POLICY "pengusulan_update_own" ON public.data_pengusulan
    FOR UPDATE USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.multiusers 
            WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
        )
    );

-- ----------------------------------------
-- POLICIES FOR: data_penetapan
-- ----------------------------------------

-- Admins and operators can view all determinations
CREATE POLICY "penetapan_select_admin" ON public.data_penetapan
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.multiusers 
            WHERE id = auth.uid() AND role IN ('superadmin', 'admin', 'operator')
        ) OR
        user_id = auth.uid()
    );

-- Only admins can manage determinations
CREATE POLICY "penetapan_manage_admin" ON public.data_penetapan
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.multiusers 
            WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
        )
    );

-- ----------------------------------------
-- POLICIES FOR: roadmap_kebutuhan
-- ----------------------------------------

-- Public read access (this is reference data)
CREATE POLICY "roadmap_select_public" ON public.roadmap_kebutuhan
    FOR SELECT USING (true);

-- Only admins can manage roadmap
CREATE POLICY "roadmap_manage_admin" ON public.roadmap_kebutuhan
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.multiusers 
            WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
        )
    );


-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- ----------------------------------------
-- FUNCTION: Generate nomor_pengajuan
-- Format: SIM-YYYY-XXXXXX
-- ----------------------------------------
CREATE OR REPLACE FUNCTION generate_nomor_pengajuan()
RETURNS TRIGGER AS $$
DECLARE
    year_text TEXT;
    sequence_num INTEGER;
    nomor TEXT;
BEGIN
    year_text := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get next sequence number for current year
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(nomor_pengajuan FROM 10 FOR 6) AS INTEGER)), 
        0
    ) + 1
    INTO sequence_num
    FROM public.data_pengusulan
    WHERE nomor_pengajuan LIKE 'SIM-' || year_text || '-%';
    
    nomor := 'SIM-' || year_name || '-' || LPAD(sequence_num::TEXT, 6, '0');
    NEW.nomor_pengajuan := nomor;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-generating nomor_pengajuan
DROP TRIGGER IF EXISTS trigger_generate_nomor_pengajuan ON public.data_pengusulan;
CREATE TRIGGER trigger_generate_nomor_pengajuan
    BEFORE INSERT ON public.data_pengusulan
    FOR EACH ROW
    EXECUTE FUNCTION generate_nomor_pengajuan();

-- ----------------------------------------
-- FUNCTION: Update updated_at timestamp
-- ----------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at on all tables
DROP TRIGGER IF EXISTS trigger_multiusers_updated_at ON public.multiusers;
CREATE TRIGGER trigger_multiusers_updated_at
    BEFORE UPDATE ON public.multiusers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_pengusulan_updated_at ON public.data_pengusulan;
CREATE TRIGGER trigger_pengusulan_updated_at
    BEFORE UPDATE ON public.data_pengusulan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_penetapan_updated_at ON public.data_penetapan;
CREATE TRIGGER trigger_penetapan_updated_at
    BEFORE UPDATE ON public.data_penetapan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_roadmap_updated_at ON public.roadmap_kebutuhan;
CREATE TRIGGER trigger_roadmap_updated_at
    BEFORE UPDATE ON public.roadmap_kebutuhan
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------
-- FUNCTION: Auto-sync to penetapan when accepted
-- ----------------------------------------
CREATE OR REPLACE FUNCTION sync_to_penetapan()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if status changed to 'Diterima (Penetapan)'
    IF OLD.status IS DISTINCT FROM 'Diterima (Penetapan)' 
       AND NEW.status = 'Diterima (Penetapan)' THEN
        
        -- Insert into penetapan table
        INSERT INTO public.data_penetapan (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-sync
DROP TRIGGER IF EXISTS trigger_sync_to_penetapan ON public.data_pengusulan;
CREATE TRIGGER trigger_sync_to_penetapan
    AFTER UPDATE OF status ON public.data_pengusulan
    FOR EACH ROW
    WHEN (NEW.status = 'Diterima (Penetapan)')
    EXECUTE FUNCTION sync_to_penetapan();


-- =====================================================
-- STORAGE POLICIES FOR DOCUMENTS BUCKET
-- =====================================================

-- Authenticated users can upload
CREATE POLICY "documents_upload_authenticated" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND 
        auth.role() = 'authenticated'
    );

-- Users can view their own files
CREATE POLICY "documents_view_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(metadata))[1]
    );

-- Admins can view all files
CREATE POLICY "documents_view_admin" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND
        EXISTS (
            SELECT 1 FROM public.multiusers 
            WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
        )
    );

-- Users can update their own files
CREATE POLICY "documents_update_own" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(metadata))[1]
    );

-- Users can delete their own files
CREATE POLICY "documents_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(metadata))[1]
    );


-- =====================================================
-- REFERENCE DATA / ENUM VALUES (from Excel samples)
-- =====================================================

-- These are the actual values found in the Excel file

/*
-- JENJANG PENDIDIKAN VALUES (from data_pengusulan & data_penetapan):
'Sp1'           -- Spesialis 1
'Sp2'           -- Spesialis 2
'S1 + Profesi'  -- Sarjana + Profesi
's1_profesi_unmul' -- S1 Profesi UNMUL
's2_ugm'        -- S2 UGM

-- STATUS VALUES:
'Sedang Diproses'      -- Default for new applications
'Diterima (Penetapan)' -- Approved
'Ditolak'              -- Rejected
'Ditarik'              -- Withdrawn by applicant

-- PEKERJAAN VALUES:
'Belum Bekerja'
'Bekerja'
'Non ASN'
'ASN'

-- ROADMAP STATUS VALUES:
'Terisi'   -- Position filled
'Kosong'   -- Position vacant
'Proses'   -- In process

-- MULTIUSER ROLE VALUES:
'superadmin' -- Full access
'admin'      -- Administrative access
'operator'   -- Limited operational access
'Pendaftar'  -- Applicant (default)
*/


-- =====================================================
-- SUMMARY / VERIFICATION
-- =====================================================

-- Run this query to verify all tables match Excel structure:

/*
SELECT 
    'multiusers' as table_name, 6 as excel_columns,
    COUNT(*) as actual_columns
FROM information_schema.columns 
WHERE table_name = 'multiusers' AND table_schema = 'public'
UNION ALL
SELECT 
    'data_pengusulan', 21, COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'data_pengusulan' AND table_schema = 'public'
UNION ALL
SELECT 
    'data_penetapan', 13, COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'data_penetapan' AND table_schema = 'public'
UNION ALL
SELECT 
    'roadmap_kebutuhan', 9, COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'roadmap_kebutuhan' AND table_schema = 'public';
*/

-- Expected result:
-- | table_name          | excel_columns | actual_columns |
-- |---------------------|---------------|----------------|
-- | multiusers          | 6             | 6 (+ metadata) |
-- | data_pengusulan     | 21            | 21 (+ metadata)|
-- | data_penetapan      | 13            | 13 (+ metadata)|
-- | roadmap_kebutuhan   | 9             | 9 (+ metadata) |

-- =====================================================
-- END OF SCHEMA
-- =====================================================
-- Total Tables: 4
-- Total Excel Columns Mapped: 49 (6 + 21 + 13 + 9)
-- Schema Version: 4.0 (Precise Match with Excel)
-- Compatible: Supabase PostgreSQL 15+
-- =====================================================
