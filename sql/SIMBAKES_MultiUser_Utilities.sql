-- =====================================================
-- SIMBAKES MULTI-USER LOGIN - UTILITY QUERIES
-- File Tambahan: Query Maintenance & Troubleshooting
-- =====================================================

-- =====================================================
-- 1. QUERY CEPAT - CEK STATUS SISTEM
-- =====================================================

-- 1.1 Cek semua user dengan role info
SELECT 
    u.id,
    u.email,
    u.nama_lengkap,
    u.nik,
    r.role_name AS role,
    r.display_name AS role_display,
    r.access_level,
    CASE 
        WHEN u.is_active = false THEN '🔴 Non-Aktif'
        WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN '🔒 Terkunci'
        ELSE '✅ Aktif'
    END AS status_akun,
    u.last_login,
    u.login_attempts AS percobaan_gagal,
    CASE 
        WHEN u.locked_until IS NOT NULL AND u.locked_until > NOW() THEN
            'Terlock ' || EXTRACT(EPOCH FROM (u.locked_until - NOW()))::int || ' detik lagi'
        ELSE NULL
    END AS lock_info
FROM users u
JOIN roles r ON u.role_id = r.id
ORDER BY r.access_level DESC, u.nama_lengkap;

-- 1.2 Ringkasan jumlah user per role
SELECT 
    r.role_name,
    r.display_name,
    COUNT(u.id) AS jumlah_user,
    SUM(CASE WHEN u.is_active THEN 1 ELSE 0 END) AS aktif,
    SUM(CASE WHEN NOT u.is_active OR (u.locked_until IS NOT NULL AND u.locked_until > NOW()) THEN 1 ELSE 0 END) AS non_aktif_terkunci
FROM roles r
LEFT JOIN users u ON r.id = u.role_id
GROUP BY r.id, r.role_name, r.display_name
ORDER BY r.access_level DESC;

-- 1.3 Session aktif saat ini
SELECT 
    s.id,
    u.email,
    u.nama_lengkap,
    r.role_name,
    s.ip_address,
    s.created_at AS login_at,
    s.last_accessed_at,
    s.expires_at,
    CASE 
        WHEN NOW() > s.expires_at THEN '⏰ Expired'
        WHEN s.is_active THEN '🟢 Aktif'
        ELSE '⚫ Non-Aktif'
    END AS session_status,
    EXTRACT(EPOCH FROM (s.expires_at - NOW()))::int AS sisa_detik
FROM user_sessions s
JOIN users u ON s.user_id = u.id
JOIN roles r ON u.role_id = r.id
WHERE s.is_active = TRUE
ORDER BY s.last_accessed_at DESC;

-- =====================================================
-- 2. MAINTENANCE USER
-- =====================================================

-- 2.1 Reset password user (generate hash baru)
-- Jalankan ini untuk reset password user tertentu
UPDATE users 
SET 
    password_hash = crypt('PasswordBaru123!', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'user@email.com'
RETURNING email, nama_lengkap, 'Password berhasil direset' AS status;

-- 2.2 Unlock akun yang terkunci
UPDATE users 
SET 
    locked_until = NULL,
    login_attempts = 0,
    updated_at = NOW()
WHERE locked_until IS NOT NULL
RETURNING email, nama_lengkap, 'Akun berhasil di-unlock' AS status;

-- 2.3 Unlock akun spesifik
UPDATE users 
SET 
    locked_until = NULL,
    login_attempts = 0,
    updated_at = NOW()
WHERE email = 'user@email.com';

-- 2.4 Deactivate user (soft delete)
UPDATE users 
SET is_active = false, updated_at = NOW()
WHERE email = 'user@email.com';

-- 2.5 Reactivate user
UPDATE users 
SET is_active = true, updated_at = NOW()
WHERE email = 'user@email.com';

-- 2.6 Ganti role user
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE role_name = 'operator'),
    updated_at = NOW()
WHERE email = 'user@email.com';

-- =====================================================
-- 3. MANAJEMEN SESSION
-- =====================================================

-- 3.1 Hapus semua session expired
DELETE FROM user_sessions 
WHERE expires_at < NOW() OR is_active = FALSE
RETURNING COUNT(*) AS session_dihapus;

-- 3.2 Force logout user (hapus semua session)
DELETE FROM user_sessions 
WHERE user_id = (SELECT id FROM users WHERE email = 'user@email.com')
RETURNING 'Semua session user dihapus' AS status;

-- 3.3 Force logout semua user (maintenance mode)
UPDATE user_sessions SET is_active = FALSE
RETURNING COUNT(*) AS total_session_di-nonaktifkan;

-- 3.4 Cleanup session lama (lebih dari 24 jam)
DELETE FROM user_sessions 
WHERE created_at < NOW() - INTERVAL '24 hours'
RETURNING COUNT(*) AS session_lama_dihapus;

-- =====================================================
-- 4. AUDIT LOG QUERIES
-- =====================================================

-- 4.1 Log aktivitas terakhir (100 record)
SELECT 
    al.created_at,
    u.email,
    u.nama_lengkap,
    al.action,
    al.table_name,
    al.ip_address,
    CASE al.action
        WHEN 'INSERT' THEN '➕ Tambah'
        WHEN 'UPDATE' THEN '✏️ Edit'
        WHEN 'DELETE' THEN '🗑️ Hapus'
        ELSE al.action
    END AS action_display
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 100;

-- 4.2 Log aktivitas user spesifik
SELECT 
    al.created_at,
    al.action,
    al.table_name,
    al.ip_address
FROM audit_logs al
WHERE al.user_id = (SELECT id FROM users WHERE email = 'user@email.com')
ORDER BY al.created_at DESC
LIMIT 50;

-- 4.3 Statistik aktivitas per hari (7 hari terakhir)
SELECT 
    DATE(created_at) AS tanggal,
    COUNT(*) AS total_aktivitas,
    SUM(CASE WHEN action = 'INSERT' THEN 1 ELSE 0 END) AS insert_count,
    SUM(CASE WHEN action = 'UPDATE' THEN 1 ELSE 0 END) AS update_count,
    SUM(CASE WHEN action = 'DELETE' THEN 1 ELSE 0 END) AS delete_count
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY tanggal DESC;

-- =====================================================
-- 5. BACKUP & RESTORE UTILITIES
-- =====================================================

-- 5.1 Export data users (untuk backup)
-- Copy output ini ke file SQL untuk backup
SELECT 
    'INSERT INTO users (id, email, password_hash, nama_lengkap, nik, role_id, no_hp, instansi, jabatan, foto_url, is_active, email_verified, created_at) VALUES (' ||
    '''' || id || ''', ' ||
    '''' || REPLACE(email, '''', '''''') || ''', ' ||
    '''' || password_hash || ''', ' ||
    '''' || REPLACE(nama_lengkap, '''', '''''') || ''', ' ||
    CASE WHEN nik IS NOT NULL THEN '''' || nik || '''' ELSE 'NULL' END || ', ' ||
    '''' || role_id || ''', ' ||
    CASE WHEN no_hp IS NOT NULL THEN '''' || no_hp || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN instansi IS NOT NULL THEN '''' || REPLACE(instansi, '''', '''''') || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN jabatan IS NOT NULL THEN '''' || REPLACE(jabatan, '''', '''''') || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN foto_url IS NOT NULL THEN '''' || REPLACE(foto_url, '''', '''''') || '''' ELSE 'NULL' END || ', ' ||
    CASE WHEN is_active THEN 'TRUE' ELSE 'FALSE' END || ', ' ||
    CASE WHEN email_verified THEN 'TRUE' ELSE 'FALSE' END || ', ' ||
    '''' || created_at::text || ''');' AS sql_statement
FROM users
ORDER BY created_at;

-- 5.2 Generate password hash untuk user baru
-- Copy hasil hash ini ke INSERT statement
SELECT 
    'Email: ' || email AS info,
    crypt('DefaultPassword123!', gen_salt('bf')) AS new_hash
FROM (VALUES 
    ('newuser@email.com')
) AS temp(email);

-- =====================================================
-- 6. VALIDATION & INTEGRITY CHECKS
-- =====================================================

-- 6.1 Cek user tanpa role valid
SELECT u.id, u.email, u.nama_lengkap, u.role_id
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE r.id IS NULL;

-- 6.2 Cek duplicate email
SELECT email, COUNT(*) AS duplikat
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- 6.3 Cek duplicate NIK
SELECT nik, COUNT(*) AS duplikat
FROM users
WHERE nik IS NOT NULL
GROUP BY nik
HAVING COUNT(*) > 1;

-- 6.4 Cek user aktif tanpa verified email
SELECT id, email, nama_lengkap, created_at
FROM users
WHERE is_active = TRUE AND email_verified = FALSE
AND created_at < NOW() - INTERVAL '7 days'; -- Lebih 7 hari belum verify

-- 6.5 Cek session bermasalah (expired tapi masih active)
SELECT s.id, s.user_id, s.expires_at, NOW() AS now
FROM user_sessions s
WHERE s.is_active = TRUE AND s.expires_at < NOW();

-- =====================================================
-- 7. BULK OPERATIONS
-- =====================================================

-- 7.1 Buat user operator baru (template)
-- Edit nilai sebelum menjalankan
INSERT INTO users (
    email, 
    password_hash, 
    nama_lengkap, 
    role_id, 
    no_hp, 
    instansi, 
    jabatan, 
    is_active, 
    email_verified
) VALUES (
    'operator_baru@simbakes.go.id',
    crypt('PasswordBaru123!', gen_salt('bf')),
    'Nama Operator Baru',
    (SELECT id FROM roles WHERE role_name = 'operator'),
    '08xxxxxxxxx',
    'Nama Instansi',
    'Jabatan',
    TRUE,
    TRUE
) RETURNING *;

-- 7.2 Buat user admin baru (template)
INSERT INTO users (
    email, 
    password_hash, 
    nama_lengkap, 
    role_id, 
    no_hp, 
    instansi, 
    jabatan, 
    is_active, 
    email_verified
) VALUES (
    'admin_baru@simbakes.go.id',
    crypt('PasswordBaru123!', gen_salt('bf')),
    'Nama Admin Baru',
    (SELECT id FROM roles WHERE role_name = 'admin'),
    '08xxxxxxxxx',
    'Nama Instansi',
    'Jabatan',
    TRUE,
    TRUE
) RETURNING *;

-- 7.3 Import peserta bulk dari data existing
-- Sesuaikan query ini dengan struktur tabel submissions Anda
/*
INSERT INTO users (
    email, 
    password_hash, 
    nama_lengkap, 
    nik, 
    role_id, 
    no_hp, 
    instansi, 
    jabatan, 
    is_active, 
    email_verified
)
SELECT 
    s.email,
    crypt('Peserta2024!', gen_salt('bf')),  -- Default password
    s.nama_lengkap,
    s.nik,
    (SELECT id FROM roles WHERE role_name = 'peserta'),
    s.no_hp,
    s.instansi,
    s.jabatan,
    TRUE,
    FALSE
FROM submissions s
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.email = s.email OR u.nik = s.nik
);
*/

-- =====================================================
-- 8. REPORTING QUERIES
-- =====================================================

-- 8.1 Laporan user per role untuk admin
SELECT 
    r.role_name,
    r.display_name,
    COUNT(u.id) AS total_user,
    COUNT(u.id) FILTER (WHERE u.email_verified = TRUE) AS verified,
    COUNT(u.id) FILTER (WHERE u.last_login >= NOW() - INTERVAL '30 days') AS active_30_days,
    COUNT(u.id) FILTER (WHERE u.last_login >= NOW() - INTERVAL '7 days') AS active_7_days,
    COUNT(u.id) FILTER (WHERE u.locked_until IS NOT NULL AND u.locked_until > NOW()) AS locked_now,
    MAX(u.last_login) AS last_login_any
FROM roles r
LEFT JOIN users u ON r.id = u.role_id
GROUP BY r.id, r.role_name, r.display_name
ORDER BY r.access_level DESC;

-- 8.2 User yang belum login 90+ hari
SELECT 
    u.email,
    u.nama_lengkap,
    r.role_name,
    u.last_login,
    u.created_at AS registered_at,
    NOW()::date - u.last_login::date AS hari_sejak_login
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.last_login < NOW() - INTERVAL '90 days'
AND u.is_active = TRUE
ORDER BY u.last_login ASC;

-- 8.3 Statistik login per bulan (12 bulan terakhir)
SELECT 
    TO_CHAR(created_at, 'YYYY-MM') AS bulan,
    COUNT(*) AS total_logins
FROM audit_logs
WHERE action = 'LOGIN' -- atau sesuaikan dengan action login Anda
AND created_at >= NOW() - INTERVAL '12 months'
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY bulan DESC;

-- =====================================================
-- 9. SECURITY HARDENING
-- =====================================================

-- 9.1 Set password policy: Force reset untuk user baru
-- Tambahkan kolom jika belum ada
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- 9.2 Cek password yang belum diubah 90+ hari
SELECT 
    email,
    nama_lengkap,
    password_changed_at,
    NOW()::date - password_changed_at::date AS hari_sejak_ganti_password
FROM users
WHERE password_changed_at < NOW() - INTERVAL '90 days'
   OR password_changed_at IS NULL
AND is_active = TRUE
ORDER BY COALESCE(password_changed_at, created_at) ASC;

-- 9.3 Update password changed timestamp trigger
CREATE OR REPLACE FUNCTION update_password_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
        NEW.password_changed_at := NOW();
        NEW.must_change_password := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_password_timestamp ON users;
CREATE TRIGGER update_password_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_password_timestamp();

-- =====================================================
-- 10. QUICK REFERENCE CARD
-- =====================================================

/*
╔══════════════════════════════════════════════════════════════╗
║           SIMBAKES MULTI-USER QUICK REFERENCE               ╠═════════╗
║                                                              ║  ROLES   ║
║  📧 EMAILS:                                                  ╠═════════╣
║  • superadmin@simbakes.go.id  → Super Admin                 ║ super-  ║
║  • operator@simbakes.go.id    → Data Pengusul Only          ║ admin   ║
║  • admin@simbakes.go.id      → Roadmap + Penetapan         ║  Full   ║
║  • peserta1/2@email.com     → Portal Peserta              ║  Access ║
║                                                              ╠═════════╣
║  🔑 PASSWORD (default): Simbakes@2024!                      ║ operator║
║                                                              ║  Data   ║
║  ⚡ GENERATE HASH:                                           ║ Pengusul║
║  SELECT crypt('pass', gen_salt('bf'));                      ║  Only   ║
║                                                              ╠═════════╣
║  🔄 RESET PASSWORD:                                          ║ admin   ║
║  UPDATE users SET password_hash = crypt('new', gen_salt('bf'))║ Roadmap ║
║  WHERE email = '...';                                        ║ Penetap ║
║                                                              ║  Only   ║
║  🔓 UNLOCK ACCOUNT:                                          ╠═════════╣
║  UPDATE users SET locked_until=NULL, login_attempts=0       ║ peserta║
║  WHERE email = '...';                                        ║ Portal  ║
║                                                              ║ Only    ║
║  👤 CHANGE ROLE:                                             ║ (No    ║
║  UPDATE users SET role_id=(SELECT id FROM roles             ║ Admin)  ║
║  WHERE role_name='...') WHERE email='...';                   ╠═════════╩
╚══════════════════════════════════════════════════════════════╝
*/
