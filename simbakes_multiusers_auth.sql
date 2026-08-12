-- ============================================================================
-- SIMBAKES - Multiuser Authentication Schema Update
-- Beasiswa Tematik Bidang Kesehatan
-- ============================================================================
-- Deskripsi: 
--   SQL tambahan untuk integrasi Supabase Auth dengan tabel multiusers
--   Menggunakan Opsi B: Supabase Auth (kolom password = null)
--
-- Catatan Penting:
--   - File ini adalah SUPLEMEN dari simbakes_database.sql
--   - Jalankan file ini SETELAH simbakes_database.sql
--   - Kolom password akan berisi NULL (menggunakan Supabase Auth)
-- ============================================================================


-- ============================================================================
-- BAGIAN 1: UPDATE STRUKTUR TABEL MULTIUSERS
-- ============================================================================

-- Tambahkan CHECK constraint untuk kolom status
ALTER TABLE multiusers 
DROP CONSTRAINT IF EXISTS chk_multiusers_status;

ALTER TABLE multiusers 
ADD CONSTRAINT chk_multiusers_status 
CHECK (status IN ('aktif', 'non-aktif', 'blokir'));

-- Tambahkan CHECK constraint untuk kolom role
ALTER TABLE multiusers 
DROP CONSTRAINT IF EXISTS chk_multiusers_role;

ALTER TABLE multiusers 
ADD CONSTRAINT chk_multiusers_role 
CHECK (role IN ('super_admin', 'admin', 'approver', 'operator', 'viewer'));

-- Set default value untuk status
ALTER TABLE multiusers 
ALTER COLUMN status SET DEFAULT 'aktif';

-- Set default value untuk role
ALTER TABLE multiusers 
ALTER COLUMN role SET DEFAULT 'viewer';

-- Update komentar kolom password
COMMENT ON COLUMN multiusers.password IS 
    'Kolom ini BERISI NULL - Password dikelola oleh Supabase Auth (auth.users)';

COMMENT ON COLUMN multiusers.id IS 
    'UUID yang terhubung dengan auth.users.id (Supabase Auth)';


-- ============================================================================
-- BAGIAN 2: FUNGSI TRIGGER UNTUK SYNC DARI AUTH.USERS
-- ============================================================================

-- Fungsi handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert ke multiusers saat user baru dibuat di auth.users
    INSERT INTO public.multiusers (
        id,
        nama_lengkap,
        username,
        password,  -- NULL karena menggunakan Supabase Auth
        email,
        status,
        role
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', ''),
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        NULL,  -- Password tidak disimpan di sini
        NEW.email,
        'aktif',
        COALESCE(NEW.raw_user_meta_data->>'role', 'viewer')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk auto-insert ke multiusers saat registrasi
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- BAGIAN 3: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Aktifkan RLS pada tabel multiusers
ALTER TABLE multiusers ENABLE ROW LEVEL SECURITY;

-- Policy: Semua user terautentikasi bisa membaca data user
CREATE POLICY "Authenticated users can view all users"
    ON multiusers FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Hanya super_admin dan admin yang bisa insert user baru
CREATE POLICY "Admins can insert users"
    ON multiusers FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM multiusers 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

-- Policy: Hanya super_admin dan admin yang bisa update user
CREATE POLICY "Admins can update users"
    ON multiusers FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM multiusers 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

-- Policy: Hanya super_admin yang bisa delete user
CREATE POLICY "Super admin can delete users"
    ON multiusers FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM multiusers 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Policy: User bisa update data diri sendiri (kecuali role & status)
CREATE POLICY "Users can update own profile"
    ON multiusers FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role IS NOT DISTINCT FROM role  -- Tidak boleh ubah role
        AND status IS NOT DISTINCT FROM status  -- Tidak boleh ubah status
    );


-- ============================================================================
-- BAGIAN 4: INDEX UNTUK PERFORMA
-- ============================================================================

-- Index untuk pencarian berdasarkan nama
CREATE INDEX IF NOT EXISTS idx_multiusers_nama_lengkap 
    ON multiusers(nama_lengkap);

-- Index composite untuk filter status + role
CREATE INDEX IF NOT EXISTS idx_multiusers_status_role 
    ON multiusers(status, role);


-- ============================================================================
-- BAGIAN 5: DATA CONTOH (OPTIONAL - UNTUK TESTING)
-- ============================================================================

-- CATATAN: Data contoh ini hanya untuk development/testing
-- Jangan jalankan di production!

/*
-- Insert user contoh (hanya jika sudah ada record di auth.users)
-- Ganti UUID dengan UUID yang valid dari tabel auth.users

INSERT INTO multiusers (id, nama_lengkap, username, password, email, status, role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Administrator Utama', 'admin', NULL, 'admin@simbakes.id', 'aktif', 'super_admin'),
    ('00000000-0000-0000-0000-000000000002', 'Operator Data', 'operator1', NULL, 'operator@simbakes.id', 'aktif', 'operator'),
    ('00000000-0000-0000-0000-000000000003', 'Pemantau Sistem', 'viewer1', NULL, 'viewer@simbakes.id', 'aktif', 'viewer'),
    ('00000000-0000-0000-0000-000000000004', 'Penyetuju Beasiswa', 'approver1', NULL, 'approver@simbakes.id', 'aktif', 'approver');
*/


-- ============================================================================
-- BAGIAN 6: DOKUMENTASI ROLE & PERMISSIONS
-- ============================================================================

/*
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    SIMBAKES - MATRIX ROLE & PERMISSIONS                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────┬──────────┬──────────┬──────────┬─────────┬────────┬───────┐ ║
║  │ FITUR       │ SUPER_   │ ADMIN    │ APPROVER │ OPERATOR│ VIEWER│       ║
║  │             │ ADMIN    │          │          │         │        │       ║
║  ├─────────────┼──────────┼──────────┼──────────┼─────────┼────────┼───────┤ ║
║  │ Dashboard   │ ✅ Full  │ ✅ Full  │ ✅ Read  │ ❌      │ ✅ Read│       ║
║  ├─────────────┼──────────┼──────────┼──────────┼─────────┼────────┼───────┤ ║
║  │ Roadmap     │ ✅ CRUD  │ ✅ CRUD  │ ✅ Read  │ ✅ Read │ ✅ Read│       ║
║  │ Kebutuhan   │          │          │          │         │        │       ║
║  ├─────────────┼──────────┼──────────┼──────────┼─────────┼────────┼───────┤ ║
║  │ Pengusulan  │ ✅ CRUD  │ ✅ CRUD  │ ✅ Read  │ ✅ Create│✅ Read │       ║
║  │             │          │          │          │ ✅ Own  │        │       ║
║  ├─────────────┼──────────┼──────────┼──────────┼─────────┼────────┼───────┤ ║
║  │ Penetapan   │ ✅ CRUD  │ ✅ CRUD  │ ✅ Approve│❌       │✅ Read │       ║
║  │             │          │          │ ✅ Reject│         │        │       ║
║  ├─────────────┼──────────┼──────────┼──────────┼─────────┼────────┼───────┤ ║
║  │ Multiuser   │ ✅ CRUD  │ ✅ Read  │ ❌       │ ❌      │ ❌     │       ║
║  │ Management  │          │          │          │         │        │       ║
║  ├─────────────┼──────────┼──────────┼──────────┼─────────┼────────┼───────┤ ║
║  │ Laporan     │ ✅ Full  │ ✅ Full  │ ✅ Own   │ ✅ Own  │ ❌     │       ║
║  └─────────────┴──────────┴──────────┴──────────┴─────────┴────────┴───────┘ ║
║                                                                               ║
║  KETERANGAN:                                                                  ║
║  ✅ = Diizinkan    ❌ = Tidak diizinkan                                       ║
║  CRUD = Create, Read, Update, Delete                                          ║
║  Own = Hanya data milik sendiri                                               ║
║  Approve/Reject = Menyetujui atau menolak                                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
*/


-- ============================================================================
-- BAGIAN AKHIR: CATATAN PENTING
-- ============================================================================
--
-- 1. CARA REGISTRASI USER BARU:
--    ---------------------------
--    Gunakan Supabase Client (JavaScript):
--    
//    const { data, error } = await supabase.auth.signUp({
//      email: 'user@example.com',
//      password: 'securepassword123',
//      options: {
//        data: {
//          nama_lengkap: 'Nama Lengkap User',
//          username: 'username123',
//          role: 'operator'  // default: viewer
//        }
//      }
//    });
//
--    Trigger akan otomatis membuat record di tabel multiusers
--
-- 2. CARA LOGIN:
--    -----------
//    const { data, error } = await supabase.auth.signInWithPassword({
//      email: 'user@example.com',
//      password: 'securepassword123'
//    });
--
-- 3. PASSWORD:
--    --------
--    - TIDAK PERNAH disimpan di tabel multiusers (selalu NULL)
--    - Dikelola sepenuhnya oleh Supabase Auth (auth.users)
--    - Sudah di-hash menggunakan bcrypt (standar industri)
--
-- 4. KEAMANAN TAMBAHAN:
--    ------------------
--    - RLS aktif: hanya user terautentikasi yang bisa akses
--    - Constraint: status dan role hanya nilai yang valid
--    - Trigger: sinkronisasi otomatis dari auth.users
--
-- ============================================================================
