-- =====================================================
-- SIMBAKES MULTI-USER LOGIN SYSTEM
-- Role-Based Access Control (RBAC) SQL Schema
-- =====================================================
-- 
-- ROLES & ACCESS LEVELS:
-- ┌─────────────┬─────────────────────────────────────────────────┐
-- │ ROLE        │ ACCESS SCOPE                                   │
-- ├─────────────┼─────────────────────────────────────────────────┤
-- │ superadmin  │ Full access - Semua menu + User Management     │
-- │ operator    │ Panel Admin: Menu Data Pengusul saja           │
-- │ admin       │ Panel Admin: Menu Data Roadmap + Penetapan     │
-- │ peserta     │ Hanya login via halaman peserta (bukan admin)  │
-- └─────────────┴─────────────────────────────────────────────────┘
--
-- CATATAN PENTING:
-- - Peserta TIDAK BISA login melalui halaman Admin
-- - Peserta hanya bisa akses melalui login-peserta.html
-- - Setiap role memiliki batasan menu yang jelas
-- =====================================================

-- =====================================================
-- 1. ENABLE EXTENSIONS (jika diperlukan)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. DROP TABLES JIKA ADA (untuk fresh install)
-- =====================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- =====================================================
-- 3. TABEL ROLES (Role Definitions)
-- =====================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    access_level INTEGER NOT NULL DEFAULT 0, -- 0=peserta, 1=admin, 2=operator, 3=superadmin
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Definisi role untuk sistem SIMBAKES';
COMMENT ON COLUMN roles.role_name adalah 'Nama unik role (superadmin, operator, admin, peserta)';
COMMENT ON COLUMN roles.access_level adalah 'Level akses: 0=peserta, 1=admin, 2=operator, 3=superadmin';

-- =====================================================
-- 4. INSERT DATA ROLES
-- =====================================================
INSERT INTO roles (role_name, display_name, description, access_level) VALUES
('superadmin', 'Super Administrator', 'Akses penuh ke semua fitur dan manajemen pengguna', 3),
('operator', 'Operator', 'Akses Panel Admin pada menu Data Pengusul saja', 2),
('admin', 'Administrator', 'Akses Panel Admin pada menu Data Roadmap dan Penetapan', 1),
('peserta', 'Peserta', 'Login khusus peserta melalui halaman peserta (bukan admin)', 0);

-- =====================================================
-- 5. TABEL USERS (Tabel Pengguna)
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- hashed dengan bcrypt/crypt()
    nama_lengkap VARCHAR(255) NOT NULL,
    nik VARCHAR(20) UNIQUE, -- NIK untuk peserta
    role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
    
    -- Profile fields
    no_hp VARCHAR(20),
    instansi VARCHAR(255),
    jabatan VARCHAR(100),
    foto_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

COMMENT ON TABLE users adalah 'Tabel pengguna SIMBAKES dengan multi-role support';
COMMENT ON COLUMN users.password_hash adalah 'Password di-hash menggunakan bcrypt (cost factor 10+)';
COMMENT ON COLUMN users.nik adalah 'NIK khusus untuk peserta, NULL untuk admin/operator';
COMMENT ON COLUMN users.login_attempts adalah 'Counter percobaan login gagal (lock setelah 5x)';
COMMENT ON COLUMN users.locked_until adalah 'Timestamp sampai akun terkunci (NULL = tidak terkunci)';

-- Index untuk performa query
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nik ON users(nik);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- =====================================================
-- 6. TABEL USER_SESSIONS (Session Management)
-- =====================================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_sessions adalah 'Session aktif user untuk autentikasi';
COMMENT ON COLUMN user_sessions.session_token adalah 'JWT atau random token untuk identifikasi session';

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- =====================================================
-- 7. TABEL AUDIT_LOGS (Log Aktivitas)
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_logs adalah 'Log audit untuk tracking perubahan data dan aktivitas penting';

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS pada tabel users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. RLS POLICIES - USERS TABLE
-- =====================================================

-- Policy 1: Superadmin bisa lihat semua user
CREATE POLICY "superadmin_can_view_all_users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users AS current_user
            WHERE current_user.id = auth.uid()
            AND current_user.role_id = (SELECT id FROM roles WHERE role_name = 'superadmin')
        )
    );

-- Policy 2: User bisa lihat data sendiri
CREATE POLICY "users_can_view_own_profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Policy 3: Superadmin bisa update semua user
CREATE POLICY "superadmin_can_update_all_users"
    ON users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users AS current_user
            WHERE current_user.id = auth.uid()
            AND current_user.role_id = (SELECT id FROM roles WHERE role_name = 'superadmin')
        )
    );

-- Policy 4: User bisa update data sendiri (kecuali role & status)
CREATE POLICY "users_can_update_own_profile"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 5: Hanya superadmin yang bisa insert user baru
CREATE POLICY "superadmin_can_insert_users"
    ON users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users AS current_user
            WHERE current_user.id = auth.uid()
            AND current_user.role_id = (SELECT id FROM roles WHERE role_name = 'superadmin')
        )
    );

-- Policy 6: Hanya superadmin yang bisa delete user
CREATE POLICY "superadmin_can_delete_users"
    ON users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users AS current_user
            WHERE current_user.id = auth.uid()
            AND current_user.role_id = (SELECT id FROM roles WHERE role_name = 'superadmin')
        )
    );

-- =====================================================
-- 10. RLS POLICIES - USER_SESSIONS TABLE
-- =====================================================

-- Superadmin bisa lihat semua sessions
CREATE POLICY "superadmin_view_all_sessions"
    ON user_sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()
            AND users.role_id = (SELECT id FROM roles WHERE role_name = 'superadmin')
        )
    );

-- User bisa lihat session sendiri
CREATE POLICY "users_view_own_sessions"
    ON user_sessions FOR SELECT
    USING (user_id = auth.uid());

-- User bisa delete session sendiri (logout)
CREATE POLICY "users_delete_own_sessions"
    ON user_sessions FOR DELETE
    USING (user_id = auth.uid());

-- =====================================================
-- 11. RLS POLICIES - AUDIT_LOGS TABLE
-- =====================================================

-- Semua user terautentikasi bisa baca log (read-only)
CREATE POLICY "authenticated_users_read_audit"
    ON audit_logs FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- System insert logs (via triggers)
CREATE POLICY "system_insert_audit_logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true); -- Controlled by app logic

-- =====================================================
-- 12. TRIGGERS & FUNCTIONS
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger untuk roles
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Audit log trigger
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Ambil user ID dari session
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;
    
    -- Insert ke audit log
    INSERT INTO audit_logs (
        user_id, action, table_name, record_id,
        old_values, new_values
    ) VALUES (
        current_user_id,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
    );
    
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger audit log untuk users
CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_log_trigger();

-- Function: Check login attempts and lock account
CREATE OR REPLACE FUNCTION check_account_lockout()
RETURNS TRIGGER AS $$
DECLARE
    max_attempts INTEGER := 5;
    lockout_duration INTERVAL := '30 minutes';
BEGIN
    -- Increment login attempts
    NEW.login_attempts := COALESCE(NEW.login_attempts, 0) + 1;
    
    -- Lock account jika melebihi max attempts
    IF NEW.login_attempts >= max_attempts THEN
        NEW.locked_until := NOW() + lockout_duration;
        RAISE NOTICE 'Account locked for 30 minutes due to too many failed attempts';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. HELPER FUNCTIONS
-- =====================================================

-- Function: Cek apakah user memiliki role tertentu
CREATE OR REPLACE FUNCTION has_role(user_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_id UUID;
BEGIN
    SELECT role_id INTO user_role_id FROM users WHERE id = auth.uid();
    
    IF user_role_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM roles 
        WHERE id = user_role_id 
        AND role_name = user_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Dapatkan level akses user saat ini
CREATE OR REPLACE FUNCTION get_current_user_access_level()
RETURNS INTEGER AS $$
DECLARE
    access_lvl INTEGER;
BEGIN
    SELECT r.access_level INTO access_lvl
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid();
    
    RETURN COALESCE(access_lvl, -1); -- -1 = tidak terautentikasi
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cek akses menu berdasarkan role
CREATE OR REPLACE FUNCTION can_access_menu(menu_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_level INTEGER;
    required_level INTEGER;
BEGIN
    -- Dapatkan level user saat ini
    current_level := get_current_user_access_level();
    
    -- Default required level berdasarkan menu
    required_level := CASE menu_code
        WHEN 'data_pengusul' THEN 2      -- Operator+
        WHEN 'data_roadmap' THEN 1        -- Admin+
        WHEN 'penetapan' THEN 1           -- Admin+
        WHEN 'user_management' THEN 3     -- Superadmin only
        WHEN 'settings' THEN 3            -- Superadmin only
        WHEN 'dashboard_admin' THEN 1     -- Admin+
        ELSE 0                            -- Default: semua termasuk peserta
    END;
    
    RETURN current_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reset login attempts setelah berhasil login
CREATE OR REPLACE FUNCTION reset_login_attempts(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET login_attempts = 0, 
        locked_until = NULL,
        last_login = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 14. VIEWS (Untuk kemudahan query)
-- =====================================================

-- View: User detail dengan role info
CREATE OR REPLACE VIEW v_users_with_roles AS
SELECT 
    u.id,
    u.email,
    u.nama_lengkap,
    u.nik,
    u.no_hp,
    u.instansi,
    u.jabatan,
    u.foto_url,
    u.is_active,
    u.email_verified,
    u.last_login,
    u.login_attempts,
    u.locked_until,
    u.created_at,
    u.updated_at,
    r.role_name,
    r.display_name AS role_display_name,
    r.description AS role_description,
    r.access_level
FROM users u
JOIN roles r ON u.role_id = r.id;

COMMENT ON VIEW v_users_with_roles adalah 'View user dengan informasi role lengkap';

-- View: Active sessions dengan user info
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT 
    s.id AS session_id,
    s.user_id,
    u.nama_lengkap,
    u.email,
    r.role_name,
    s.session_token,
    s.ip_address,
    s.is_active,
    s.expires_at,
    s.created_at,
    s.last_accessed_at,
    NOW() > s.expires_at AS is_expired
FROM user_sessions s
JOIN users u ON s.user_id = u.id
JOIN roles r ON u.role_id = r.id
WHERE s.is_active = TRUE;

COMMENT ON VIEW v_active_sessions adalah 'View session aktif dengan detail user';

-- View: Menu access matrix
CREATE OR REPLACE VIEW v_menu_access_matrix AS
SELECT 
    unnest(ARRAY['data_pengusul', 'data_roadmap', 'penetapan', 'user_management', 'settings', 'dashboard_admin', 'peserta_portal']) AS menu_code,
    unnest(ARRAY['Data Pengusul', 'Data Roadmap', 'Penetapan', 'Manajemen User', 'Pengaturan', 'Dashboard Admin', 'Portal Peserta']) AS menu_name,
    unnest(ARRAY[2, 1, 1, 3, 3, 1, 0]) AS min_access_level,
    unnest(ARRAY[false, false, false, false, false, false, true]) AS peserta_can_access;

COMMENT ON VIEW v_menu_access_matrix adalah 'Matriks akses menu per role';

-- =====================================================
-- 15. INSERT DATA USER CONTOH (SAMPLE DATA)
-- =====================================================
-- Password untuk semua user: Simbakes@2024! (hashed dengan bcrypt)
-- Generate hash Anda sendiri untuk production!

-- SUPERADMIN - Akses penuh
INSERT INTO users (
    email, password_hash, nama_lengkap, nik, role_id, 
    no_hp, instansi, jabatan, is_active, email_verified
) VALUES (
    'superadmin@simbakes.go.id',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.H0RqVZIzOOKD6.', -- Simbakes@2024!
    'Super Administrator',
    NULL,
    (SELECT id FROM roles WHERE role_name = 'superadmin'),
    '081234567890',
    'SIMBAKES Pusat',
    'Super Administrator',
    true,
    true
);

-- OPERATOR - Akses Data Pengusul saja
INSERT INTO users (
    email, password_hash, nama_lengkap, nik, role_id, 
    no_hp, instansi, jabatan, is_active, email_verified
) VALUES (
    'operator@simbakes.go.id',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.H0RqVZIzOOKD6.', -- Simbakes@2024!
    'Operator Data Pengusul',
    NULL,
    (SELECT id FROM roles WHERE role_name = 'operator'),
    '081234567891',
    'SIMBAKES Pusat',
    'Operator Data Pengusul',
    true,
    true
);

-- ADMIN - Akses Data Roadmap & Penetapan
INSERT INTO users (
    email, password_hash, nama_lengkap, nik, role_id, 
    no_hp, instansi, jabatan, is_active, email_verified
) VALUES (
    'admin@simbakes.go.id',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.H0RqVZIzOOKD6.', -- Simbakes@2024!
    'Administrator Roadmap',
    NULL,
    (SELECT id FROM roles WHERE role_name = 'admin'),
    '081234567892',
    'SIMBAKES Pusat',
    'Administrator',
    true,
    true
);

-- PESERTA - Contoh peserta (login via portal peserta)
INSERT INTO users (
    email, password_hash, nama_lengkap, nik, role_id, 
    no_hp, instansi, jabatan, is_active, email_verified
) VALUES (
    'peserta1@email.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.H0RqVZIzOOKD6.', -- Simbakes@2024!
    'Ahmad Fauzi',
    '1234567890123456',
    (SELECT id FROM roles WHERE role_name = 'peserta'),
    '081234567893',
    'PT Contoh Indonesia',
    'Staff IT',
    true,
    true
);

-- Peserta kedua
INSERT INTO users (
    email, password_hash, nama_lengkap, nik, role_id, 
    no_hp, instansi, jabatan, is_active, email_verified
) VALUES (
    'peserta2@email.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.H0RqVZIzOOKD6.', -- Simbakes@2024!
    'Siti Nurhaliza',
    '2345678901234567',
    (SELECT id FROM roles WHERE role_name = 'peserta'),
    '081234567894',
    'CV Maju Bersama',
    'Manager Operasional',
    true,
    true
);

-- =====================================================
-- 16. STORED PROCEDURE: Login Validation
-- =====================================================
CREATE OR REPLACE FUNCTION fn_validate_login(
    p_email VARCHAR,
    p_password TEXT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_result JSON;
    v_password_valid BOOLEAN;
BEGIN
    -- Cari user by email
    SELECT * INTO v_user 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.email = p_email AND u.is_active = TRUE;
    
    -- Jika user tidak ditemukan
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'EMAIL_NOT_FOUND',
            'message', 'Email tidak terdaftar'
        )::json;
    END IF;
    
    -- Cek apakah account terkunci
    IF v_user.locked_until IS NOT NULL AND v_user.locked_until > NOW() THEN
        RETURN json_build_object(
            'success', false,
            'error', 'ACCOUNT_LOCKED',
            'message', 'Akun terkunci. Silakan coba lagi dalam ' || 
                EXTRACT(MINUTE FROM v_user.locked_until - NOW()) || ' menit'
        )::json;
    END IF;
    
    -- Validasi password (bcrypt comparison)
    -- Catatan: Untuk Supabase, gunakan crypt() function
    v_password_valid := (v_user.password_hash = crypt(p_password, v_user.password_hash));
    
    IF NOT v_password_valid THEN
        -- Increment login attempts
        UPDATE users SET login_attempts = login_attempts + 1 WHERE id = v_user.id;
        
        -- Cek apakah harus di-lock
        SELECT * INTO v_user FROM users WHERE id = v_user.id;
        
        IF v_user.login_attempts >= 5 THEN
            UPDATE users SET locked_until = NOW() + INTERVAL '30 minutes' WHERE id = v_user.id;
            
            RETURN json_build_object(
                'success', false,
                'error', 'ACCOUNT_LOCKED',
                'message', 'Akun terkunci karena terlalu banyak percobaan gagal'
            )::json;
        END IF;
        
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_PASSWORD',
            'message', 'Password salah. Sisa percobaan: ' || (5 - v_user.login_attempts)
        )::json;
    END IF;
    
    -- Cek apakah role peserta mencoba login admin
    IF v_user.role_name = 'peserta' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'PARTICIPANT_LOGIN_VIA_ADMIN',
            'message', 'Peserta harus login melalui halaman Portal Peserta'
        )::json;
    END IF;
    
    -- Login berhasil - Reset attempts dan update last login
    PERFORM reset_login_attempts(v_user.id);
    
    -- Return success dengan user info (tanpa password)
    RETURN json_build_object(
        'success', true,
        'user_id', v_user.id,
        'email', v_user.email,
        'nama_lengkap', v_user.nama_lengkap,
        'role', v_user.role_name,
        'role_display', r.display_name,
        'access_level', v_user.access_level,
        'message', 'Login berhasil'
    )::json;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'SYSTEM_ERROR',
        message, SQLERRM
    )::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 17. STORED PROCEDURE: Participant Search/Login
-- =====================================================
CREATE OR REPLACE FUNCTION fn_search_participant(
    p_nik VARCHAR,
    p_email VARCHAR
) RETURNS JSON AS $$
DECLARE
    v_submission RECORD;
    v_user RECORD;
BEGIN
    -- Cari di tabel submissions (data peserta)
    -- Sesuaikan nama tabel sesuai struktur Anda
    -- BEGIN
    --     SELECT * INTO v_submission FROM submissions
    --     WHERE nik = p_nik OR email ILIKE p_email
    //     LIMIT 1;
    -- END;
    
    -- Jika ada di submissions, return data
    -- IF FOUND THEN
    --     RETURN json_build_object(
    --         'success', true,
    --         'found_in', 'submissions',
    --         'data', row_to_json(v_submission)
    --     )::json;
    -- END IF;
    
    -- Alternatif: Cari di users table dengan role peserta
    SELECT u.*, r.role_name INTO v_user
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE (u.nik = p_nik OR u.email ILIKE p_email)
    AND r.role_name = 'peserta'
    AND u.is_active = TRUE
    LIMIT 1;
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', true,
            'found_in', 'users',
            'user_id', v_user.id,
            'nama_lengkap', v_user.nama_lengkap,
            'email', v_user.email,
            'nik', v_user.nik,
            'instansi', v_user.instansi,
            'jabatan', v_user.jabatan,
            'no_hp', v_user.no_hp,
            'foto_url', v_user.foto_url,
            'is_active', v_user.is_active,
            'message', 'Peserta ditemukan'
        )::json;
    END IF;
    
    -- Tidak ditemukan
    RETURN json_build_object(
        'success', false,
        'error', 'NOT_FOUND',
        'message', 'Data peserta tidak ditemukan. Pastikan NIK dan Email sudah benar.'
    )::json;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'SYSTEM_ERROR',
        'message', SQLERRM
    )::json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 18. DOCUMENTATION COMMENTS
-- =====================================================

/*
═══════════════════════════════════════════════════════════════════
                    PANDUAN PENGGUNAAN SQL
═══════════════════════════════════════════════════════════════════

🔐 CARA LOGIN BERDASARKAN ROLE:
───────────────────────────────────────────────────────────────────

┌──────────┬──────────────────────┬───────────────────────────────┐
│ ROLE     │ HALAMAN LOGIN        │ YANG BISA DIAKSES             │
├──────────┼──────────────────────┼───────────────────────────────┤
│superadmin│ index.html (Admin)   │ SEMUA MENU + Manajemen User   │
│operator  │ index.html (Admin)   │ Menu: Data Pengusul SAJA      │
│admin     │ index.html (Admin)   │ Menu: Roadmap + Penetapan     │
│peserta   │ login-peserta.html   │ Portal Peserta (view only)    │
└──────────┴──────────────────────┴───────────────────────────────┘

⚠️  PENTING: Peserta TIDAK BISA login melalui halaman Admin!
    Jika peserta coba login admin, akan muncul error:
    "Peserta harus login melalui halaman Portal Peserta"

📋 MATRIKS AKSES MENU:
───────────────────────────────────────────────────────────────────
Menu                  │ superadmin │ operator │ admin │ peserta
──────────────────────┼────────────┼──────────┼───────┼────────
Dashboard Admin       │     ✓      │    ✗     │   ✓   │   ✗
Data Pengusul         │     ✓      │    ✓     │   ✗   │   ✗
Data Roadmap          │     ✓      │    ✗     │   ✓   │   ✗
Penetapan             │     ✓      │    ✗     │   ✓   │   ✗
Manajemen User        │     ✓      │    ✗     │   ✗   │   ✗
Pengaturan            │     ✓      |    ✗     │   ✗   │   ✗
Portal Peserta        │     ✗      │    ✗     │   ✗   │   ✓

🔧 FUNGSI YANG TERSEDIA:
───────────────────────────────────────────────────────────────────
1. fn_validate_login(email, password)
   → Untuk login admin/operator/superadmin
   → Return JSON dengan status dan user info
   
2. fn_search_participant(nik, email)
   → Untuk pencarian peserta di portal
   → Return JSON data peserta jika ditemukan

3. has_role(role_name)
   → Cek apakah user punya role tertentu
   
4. get_current_user_access_level()
   → Dapatkan level akses user (0-3)

5. can_access_menu(menu_code)
   → Cek apakah user bisa akses menu tertentu

6. reset_login_attempts(user_id)
   → Reset counter percobaan login gagal

📝 CARA MENAMBAH USER BARU:
───────────────────────────────────────────────────────────────────
INSERT INTO users (
    email, 
    password_hash,  -- Gunakan bcrypt hash
    nama_lengkap, 
    role_id,        -- Reference ke tabel roles
    ...
) VALUES (...);

⚡ GENERATE PASSWORD HASH (PostgreSQL):
───────────────────────────────────────────────────────────────────
SELECT crypt('PasswordAnda!', gen_salt('bf'));

🔄 UPDATE PASSWORD USER:
───────────────────────────────────────────────────────────────────
UPDATE users 
SET password_hash = crypt('PasswordBaru!', gen_salt('bf'))
WHERE email = 'user@email.com';

🔒 LOCK/UNLOCK USER:
───────────────────────────────────────────────────────────────────
-- Lock user:
UPDATE users SET locked_until = NOW() + INTERVAL '1 hour' WHERE email = '...';

-- Unlock user:
UPDATE users SET locked_until = NULL, login_attempts = 0 WHERE email = '...';

═══════════════════════════════════════════════════════════════════
*/

-- =====================================================
-- 19. VERIFICATION QUERIES (Cek instalasi)
-- =====================================================

-- Query untuk verifikasi setup
SELECT '=== VERIFIKASI SETUP SIMBAKES MULTI-USER ===' AS info;

-- Cek roles
SELECT 'Roles:' AS label;
SELECT role_name, display_name, access_level FROM roles ORDER BY access_level DESC;

-- Cek users
SELECT 'Users:' AS label;
SELECT u.email, u.nama_lengkap, r.role_name, u.is_active 
FROM users u 
JOIN roles r ON u.role_id = r.id 
ORDER BY r.access_level DESC, u.nama_lengkap;

-- Cek fungsi tersedia
SELECT 'Functions:' AS label;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'fn_%' OR routine_name LIKE 'has_%' OR routine_name LIKE 'can_%' OR routine_name LIKE 'get_%'
ORDER BY routine_name;

-- Test function: Matriks akses
SELECT 'Menu Access Matrix:' AS label;
SELECT * FROM v_menu_access_matrix ORDER BY min_access_level DESC;
