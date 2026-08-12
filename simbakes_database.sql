-- ============================================================================
-- SIMBAKES (Beasiswa Tematik Bidang Kesehatan)
-- Database Schema for Supabase / PostgreSQL
-- ============================================================================
-- Sumber: template_simbakes versi supabase (2).xlsx
-- Dibuat: 2025-01-09
-- ============================================================================

-- ============================================================================
-- BAGIAN 0: PREPARATION (Opsional - untuk clean re-run)
-- ============================================================================
-- Hapus komentar di bawah ini jika ingin reset database dari awal
-- WARNING: Ini akan MENGHAPUS SEMUA DATA yang ada!
--
-- DROP TABLE IF EXISTS data_penetapan CASCADE;
-- DROP TABLE IF EXISTS data_pengusulan CASCADE;
-- DROP TABLE IF EXISTS roadmap_kebutuhan CASCADE;
-- DROP TABLE IF EXISTS multiusers CASCADE;


-- ============================================================================
-- TABEL 1: roadmap_kebutuhan
-- ============================================================================
-- Deskripsi: Master data kebutuhan beasiswa tematik bidang kesehatan.
-- Berisi daftar slot/kuota program beasiswa yang tersedia.

CREATE TABLE IF NOT EXISTS roadmap_kebutuhan (
    -- Primary Key Kandidat (lihat catatan di bawah)
    kode VARCHAR(50),
    
    -- Data Program Beasiswa
    jurusan VARCHAR(255),
    kualifikasi_awal VARCHAR(255),
    jenis_pendidikan VARCHAR(255),
    perguruan_tinggi VARCHAR(255),
    pekerjaan VARCHAR(255),
    
    -- Field Tahun (Angka)
    tahun_mulai_studi INTEGER,
    
    -- Unit Penempatan
    unit_pendayaguna VARCHAR(255),
    
    -- Status Kebutuhan
    status VARCHAR(50),
    
    -- Penerima (jika sudah ada)
    nama_penerima VARCHAR(255)
);

-- COMMENT ON TABLE dan kolom untuk dokumentasi
COMMENT ON TABLE roadmap_kebutuhan IS 'Master data kebutuhan beasiswa tematik bidang kesehatan';
COMMENT ON COLUMN roadmap_kebutuhan.kode IS 'Kode unik identifikasi kebutuhan beasiswa [KANDIDAT PRIMARY KEY]';
COMMENT ON COLUMN roadmap_kebutuhan.jurusan IS 'Jurusan/program studi yang dibutuhkan';
COMMENT ON COLUMN roadmap_kebutuhan.kualifikasi_awal IS 'Kualifikasi awal yang dipersyaratkan';
COMMENT ON COLUMN roadmap_kebutuhan.jenis_pendidikan IS 'Jenis pendidikan (D3, S1, S2, S3, Spesialis, dll)';
COMMENT ON COLUMN roadmap_kebutuhan.perguruan_tinggi IS 'Nama perguruan tinggi tujuan';
COMMENT ON COLUMN roadmap_kebutuhan.pekerjaan IS 'Jenis pekerjaan/posisi setelah lulus';
COMMENT ON COLUMN roadmap_kebutuhan.tahun_mulai_studi IS 'Tahun dimulainya program studi (contoh: 2025)';
COMMENT ON COLUMN roadmap_kebutuhan.unit_pendayaguna IS 'Unit kerja yang akan mendayagunakan penerima beasiswa';
COMMENT ON COLUMN roadmap_kebutuhan.status IS 'Status kebutuhan (aktif/non-aktif/terpenuhi/dibatalkan)';
COMMENT ON COLUMN roadmap_kebutuhan.nama_penerima IS 'Nama penerima beasiswa (jika sudah ditetapkan)';


-- ============================================================================
-- TABEL 2: data_pengusulan
-- ============================================================================
-- Deskripsi: Data usulan/pengajuan beasiswa dari calon penerima.
-- Berisi informasi lengkap pelamar beserta dokumen pendukung.

CREATE TABLE IF NOT EXISTS data_pengusulan (
    -- Primary Key Kandidat (lihat catatan di bawah)
    nik VARCHAR(50),
    
    -- Data Pribadi Pelamar
    nama_lengkap VARCHAR(255),
    tempat_lahir VARCHAR(255),
    
    -- Field Tanggal
    tanggal_lahir DATE,
    
    -- Alamat
    alamat_ktp TEXT,
    alamat_domisili TEXT,
    
    -- Field Angka (Durasi)
    lama_domisili_tahun INTEGER,
    
    -- Data Pekerjaan Saat Ini
    pekerjaan VARCHAR(255),
    posisi_jabatan VARCHAR(255),
    unit_kerja VARCHAR(255),
    
    -- Narasi Pengusulan
    penjelasan_narasi TEXT,
    
    -- Data Pendidikan Tujuan
    jurusan_tujuan VARCHAR(255),
    jenjang_pendidikan VARCHAR(255),
    unit_tujuan_pemanfaatan VARCHAR(255),
    
    -- Field Tahun/Angka
    rencana_tahun_studi INTEGER,
    
    -- Kontak
    no_hp VARCHAR(20),
    no_whatsapp VARCHAR(20),
    email VARCHAR(255),
    
    -- Status Pengusulan
    status VARCHAR(50),
    
    -- File/Link Dokumen (BINARY DILARANG - simpan link/path saja)
    pasfoto TEXT,
    dokumen TEXT
);

COMMENT ON TABLE data_pengusulan IS 'Data pengajuan/usulan beasiswa dari calon penerima';
COMMENT ON COLUMN data_pengusulan.nik IS 'Nomor Induk Kependudukan [KANDIDAT PRIMARY KEY]';
COMMENT ON COLUMN data_pengusulan.nama_lengkap IS 'Nama lengkap pelamar sesuai KTP';
COMMENT ON COLUMN data_pengusulan.tempat_lahir IS 'Tempat lahir pelamar';
COMMENT ON COLUMN data_pengusulan.tanggal_lahir IS 'Tanggal lahir pelamar (format: YYYY-MM-DD)';
COMMENT ON COLUMN data_pengusulan.alamat_ktp IS 'Alamat lengkap sesuai KTP';
COMMENT ON COLUMN data_pengusulan.alamat_domisili IS 'Alamat domisili saat ini';
COMMENT ON COLUMN data_pengusulan.lama_domisili_tahun IS 'Lama tinggal di alamat domisili (dalam tahun)';
COMMENT ON COLUMN data_pengusulan.pekerjaan IS 'Pekerjaan saat ini';
COMMENT ON COLUMN data_pengusulan.posisi_jabatan IS 'Posisi/jabatan saat ini';
COMMENT ON COLUMN data_pengusulan.unit_kerja IS 'Unit kerja instansi saat ini';
COMMENT ON COLUMN data_pengusulan.penjelasan_narasi IS 'Penjelasan/narasi alasan mengajukan beasiswa';
COMMENT ON COLUMN data_pengusulan.jurusan_tujuan IS 'Jurusan/program studi yang dituju';
COMMENT ON COLUMN data_pengusulan.jenjang_pendidikan IS 'Jenjang pendidikan yang diajukan (S1/S2/S3/Spesialis)';
COMMENT ON COLUMN data_pengusulan.unit_tujuan_pemanfaatan IS 'Unit kerja yang akan mendayagunakan setelah lulus';
COMMENT ON COLUMN data_pengusulan.rencana_tahun_studi IS 'Rencana durasi studi dalam tahun';
COMMENT ON COLUMN data_pengusulan.no_hp IS 'Nomor handphone aktif';
COMMENT ON COLUMN data_pengusulan.no_whatsapp IS 'Nomor WhatsApp aktif';
COMMENT ON COLUMN data_pengusulan.email IS 'Email aktif pelamar';
COMMENT ON COLUMN data_pengusulan.status IS 'Status pengusulan (draft/diajukan/diproses/diterima/ditolak)';
COMMENT ON COLUMN data_pengusulan.pasfoto IS 'Link/URL/path file pasfoto pelamar (JANGAN simpan binary)';
COMMENT ON COLUMN data_pengusulan.dokumen IS 'Link/URL/path dokumen pendukung pelamar (JANGAN simpan binary)';


-- ============================================================================
-- TABEL 3: data_penetapan
-- ============================================================================
-- Deskripsi: Data penetapan/beasiswa yang sudah disetujui dengan SK resmi.
-- Merupakan kelanjutan dari data_pengusulan yang lolos seleksi.

CREATE TABLE IF NOT EXISTS data_penetapan (
    -- Foreign Key / Primary Key Kandidat (lihat catatan di bawah)
    nik VARCHAR(50),
    
    -- Data Pendidikan (copy/denormalized dari pengusulan)
    nama_lengkap VARCHAR(255),
    jurusan_tujuan VARCHAR(255),
    jenjang_pendidikan VARCHAR(255),
    unit_tujuan_pemanfaatan VARCHAR(255),
    rencana_tahun_studi INTEGER,
    
    -- Data SK Penetapan
    no_sk_penetapan VARCHAR(50),
    
    -- Field Tanggal
    tanggal_penetapan DATE,
    
    -- Status Penetapan
    status_penetapan VARCHAR(50),
    
    -- Catatan
    catatan_penetapan TEXT,
    
    -- File/Link Dokumen Penetapan (BINARY DILARANG)
    link_foto_pasfoto TEXT,
    link_dokumen_pdf TEXT,
    
    -- Periode Pemberian
    periode_pemberian VARCHAR(255)
);

COMMENT ON TABLE data_penetapan IS 'Data penetapan beasiswa yang telah disetujui dengan SK resmi';
COMMENT ON COLUMN data_penetapan.nik IS 'NIK penerima beasiswa [KANDIDAT PK/FK ke data_pengusulan]';
COMMENT ON COLUMN data_penetapan.nama_lengkap IS 'Nama lengkap penerima (denormalized dari pengusulan)';
COMMENT ON COLUMN data_penetapan.jurusan_tujuan IS 'Jurusan yang ditetapkan';
COMMENT ON COLUMN data_penetapan.jenjang_pendidikan IS 'Jenjang pendidikan yang ditetapkan';
COMMENT ON COLUMN data_penetapan.unit_tujuan_pemanfaatan IS 'Unit pemanfaatan yang ditetapkan';
COMMENT ON COLUMN data_penetapan.rencana_tahun_studi IS 'Rencana durasi studi yang disetujui';
COMMENT ON COLUMN data_penetapan.no_sk_penetapan IS 'Nomor Surat Keputusan penetapan [ALTERNATIF PRIMARY KEY]';
COMMENT ON COLUMN data_penetapan.tanggal_penetapan IS 'Tanggal diterbitkannya SK (format: YYYY-MM-DD)';
COMMENT ON COLUMN data_penetapan.status_penetapan IS 'Status penetapan (aktif/selesai/dibatalkan/ditunda)';
COMMENT ON COLUMN data_penetapan.catatan_penetapan IS 'Catatan tambahan terkait penetapan';
COMMENT ON COLUMN data_penetapan.link_foto_pasfoto IS 'URL link foto pasfoto resmi penerima';
COMMENT ON COLUMN data_penetapan.link_dokumen_pdf IS 'URL link dokumen PDF SK penetapan';
COMMENT ON COLUMN data_penetapan.periodeode_pemberian IS 'Periode pemberian beasiswa (contoh: 2025-2028)';


-- ============================================================================
-- TABEL 4: multiusers
-- ============================================================================
-- Deskripsi: Tabel user untuk autentikasi dan manajemen akses sistem SIMBAKES.
-- Terintegrasi dengan Supabase Auth.

CREATE TABLE IF NOT EXISTS multiusers (
    -- Primary Key Kandidat (lihat catatan di bawah)
    -- Catatan: Jika menggunakan Supabase Auth, sebaiknya gunakan UUID dari auth.users
    
    id UUID DEFAULT gen_random_uuid(),  -- Auto-generated ID untuk integrasi Supabase Auth
    nama_lengkap VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    password VARCHAR(255),  -- Akan digantikan oleh Supabase Auth jika menggunakan auth
    email VARCHAR(255),
    status VARCHAR(50),
    role VARCHAR(50)
);

COMMENT ON TABLE multiusers IS 'Tabel user untuk autentikasi dan manajemen akses SIMBAKES';
COMMENT ON COLUMN multiusers.id IS 'Auto-generated UUID [REKOMENDASI PRIMARY KEY untuk integrasi Supabase Auth]';
COMMENT ON COLUMN multiusers.nama_lengkap IS 'Nama lengkap user';
COMMENT ON COLUMN multiusers.username IS 'Username login [UNIQUE - KANDIDAT PRIMARY KEY alternatif]';
COMMENT ON COLUMN multiusers.password IS 'Password hash (hanya jika tidak menggunakan Supabase Auth)';
COMMENT ON COLUMN multiusers.email IS 'Email user [KANDIDAT UNIQUE/PK alternatif]';
COMMENT ON COLUMN multiusers.status IS 'Status user (aktif/non-aktif/blokir)';
COMMENT ON COLUMN multiusers.role IS 'Role/hak akses (admin/operator/viewer/dll)';


-- ============================================================================
-- BAGIAN TAMBAHAN: INDEX (Untuk Performa Query)
-- ============================================================================
-- Index membantu mempercepat pencarian dan join antar tabel

-- Index untuk roadmap_kebutuhan
CREATE INDEX IF NOT EXISTS idx_roadmap_kebutuhan_kode ON roadmap_kebutuhan(kode);
CREATE INDEX IF NOT EXISTS idx_roadmap_kebutuhan_jurusan ON roadmap_kebutuhan(jurusan);
CREATE INDEX IF NOT EXISTS idx_roadmap_kebutuhan_status ON roadmap_kebutuhan(status);

-- Index untuk data_pengusulan
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_nik ON data_pengusulan(nik);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_status ON data_pengusulan(status);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_jurusan_tujuan ON data_pengusulan(jurusan_tujuan);
CREATE INDEX IF NOT EXISTS idx_data_pengusulan_email ON data_pengusulan(email);

-- Index untuk data_penetapan
CREATE INDEX IF NOT EXISTS idx_data_penetapan_nik ON data_penetapan(nik);
CREATE INDEX IF NOT EXISTS idx_data_penetapan_no_sk ON data_penetapan(no_sk_penetapan);
CREATE INDEX IF NOT EXISTS idx_data_penetapan_status ON data_penetapan(status_penetapan);

-- Index untuk multiusers
CREATE INDEX IF NOT EXISTS idx_multiusers_username ON multiusers(username);
CREATE INDEX IF NOT EXISTS idx_multiusers_email ON multiusers(email);
CREATE INDEX IF NOT EXISTS idx_multiusers_role ON multiusers(role);


-- ============================================================================
-- BAGIAN AKHIR: CATATAN PENTING
-- ============================================================================
-- 
-- 1. PRIMARY KEY BELUM DITENTUKAN
--    ----------------------------
--    SQL ini sengaja TIDAK membuat PRIMARY KEY constraint karena menunggu
--    persetujuan Anda. Berikut rekomendasi:
--
--    a) roadmap_kebutuhan:
--       - REKOMENDASI: kode sebagai PRIMARY KEY
--       - ALASAN: Setiap kebutuhan beasiswa seharusnya memiliki kode unik
--
--    b) data_pengusulan:
--       - REKOMENDASI: nik sebagai PRIMARY KEY  
--       - ALASAN: NIK adalah identitas unik per warga negara Indonesia
--       - CATATAN: Pastikan 1 NIK hanya boleh 1 pengusulan, atau gunakan surrogate key
--
--    c) data_penetapan:
--       - REKOMENDASI A: nik + no_sk_penetapan sebagai COMPOSITE PRIMARY KEY
--       - REKOMENDASI B: Buat id UUID auto-generated sebagai PRIMARY KEY
--       - ALASAN: Memungkinkan 1 NIK memiliki lebih dari 1 penetapan (revisi)
--
--    d) multiusers:
--       - REKOMENDASI: id (UUID) sebagai PRIMARY KEY
--       - ALASAN: Integrasi yang lebih baik dengan Supabase Auth
--       - ALTERNATIF: username atau email (jika tidak menggunakan Supabase Auth)
--
-- 2. FOREIGN KEY BELUM DIBUAT
--    -------------------------
--    Relasi antar tabel belum dibuat sebagai constraint karena menunggu:
--    - Konfirmasi primary key setiap tabel
--    - Konfirmasi kardinalitas relasi (1:1 atau 1:N)
--    - Persetujuan Anda untuk implementasi foreign key
--
-- 3. FILE/BINARY STORAGE
--    --------------------
--    Kolom pasfoto, dokumen, link_foto_pasfoto, link_dokumen_pdf menggunakan
--    tipe TEXT untuk menyimpan URL/path file, BUKAN binary data.
--    Untuk penyimpanan file aktual, gunakan Supabase Storage.
--
-- 4. SUPABASE AUTH INTEGRASI
--    ------------------------
--    Tabel multiusers dapat diintegrasikan dengan Supabase Auth.
--    Jika menggunakan Supabase Auth, field password tidak diperlukan
--    dan sebaiknya dihapus dari struktur tabel.
--
-- ============================================================================
