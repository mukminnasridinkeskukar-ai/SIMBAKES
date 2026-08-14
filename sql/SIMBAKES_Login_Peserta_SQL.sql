-- =====================================================
-- SIMBAKES PESERTA AUTHENTICATION - SECURE SQL
-- =====================================================
--
-- Fungsi ini untuk autentikasi peserta dengan aman:
-- 1. Menggunakan username + password
-- 2. Password diverifikasi via bcrypt (crypt())
-- 3. Cek role = 'peserta'
-- 4. Cek status akun (Aktif/Suspended)
-- 5. Return data minimal (tidak expose password_hash)
-- 6. Track login attempts & auto-suspend
--
-- CARA PENGGUNAAN:
-- CALL fn_authenticate_peserta('username', 'password');
-- =====================================================

-- =====================================================
-- 1. FUNCTION: Autentikasi Peserta (Secure RPC)
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_authenticate_peserta(
    p_username VARCHAR,
    p_password TEXT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_password_valid BOOLEAN;
    v_result JSON;
BEGIN
    -- ========================================
    -- VALIDASI INPUT
    -- ========================================
    IF p_username IS NULL OR TRIM(p_username) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_INPUT',
            'message', 'Username harus diisi',
            'code', 400
        );
    END IF;
    
    IF p_password IS NULL OR p_password = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_INPUT',
            'message', 'Password harus diisi',
            'code', 400
        );
    END IF;
    
    -- ========================================
    -- CARI USER BERDASARKAN USERNAME
    -- ========================================
    SELECT 
        id, 
        email, 
        username, 
        nama_lengkap, 
        nik, 
        role, 
        status,
        is_active,
        login_attempts,
        suspended_until,
        suspension_reason,
        created_at
    INTO v_user
    FROM public.multiusers
    WHERE username = TRIM(p_username)
      AND is_deleted = FALSE;  -- Soft delete check jika ada kolom ini
    
    -- Jika username tidak ditemukan
    IF NOT FOUND THEN
        -- Return generic error (jangan reveal username exists or not)
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Username atau password salah.',
            'code', 401
        );
    END IF;
    
    -- ========================================
    -- CEK STATUS AKUN
    -- ========================================
    
    -- Cek apakah akun Suspended
    IF v_user.status = 'Suspended' THEN
        -- Cek apakah suspend sementara sudah expired
        IF v_user.suspended_until IS NOT NULL AND v_user.suspended_until <= NOW() THEN
            -- Auto-reactivate
            UPDATE public.multiusers SET
                status = 'Aktif',
                suspended_until = NULL,
                suspension_reason = NULL,
                is_active = TRUE,
                login_attempts = 0,
                updated_at = NOW()
            WHERE id = v_user.id;
            
            -- Update local variable
            v_user.status := 'Aktif';
            v_user.is_active := TRUE;
            v_user.login_attempts := 0;
        ELSE
            -- Masih suspended - return error dengan detail
            RETURN json_build_object(
                'success', false,
                'error', 'ACCOUNT_SUSPENDED',
                'message', CASE
                    WHEN v_user.suspension_reason IS NOT NULL THEN
                        'Akun Anda telah diblokir. Alasan: ' || v_user.suspension_reason
                    ELSE
                        'Akun Anda telah diblokir. Hubungi administrator.'
                END,
                'suspended_until', v_user.suspended_until,
                'code', 403
            );
        END IF;
    END IF;
    
    -- ========================================
    -- CEK ROLE - HANYA PESERTA YANG BOLEH LOGIN DI SINI
    -- ========================================
    IF v_user.role != 'peserta' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'FORBIDDEN_ROLE',
            'message', 'Akun ini tidak memiliki hak akses sebagai Peserta. Gunakan halaman Login Admin.',
            'role', v_user.role,
            'code', 403
        );
    END IF;
    
    -- ========================================
    -- VERIFIKASI PASSWORD (bcrypt via crypt())
    -- ========================================
    BEGIN
        -- crypt() akan hash p_password dengan salt dari password_hash
        -- Jika hasilnya sama dengan password_hash, maka password benar
        v_password_valid = (v_user.password_hash = crypt(p_password, v_user.password_hash));
    EXCEPTION WHEN OTHERS THEN
        -- Error saat verifikasi password
        RETURN json_build_object(
            'success', false,
            'error', 'AUTH_ERROR',
            'message', 'Terjadi kesalahan saat verifikasi kredensial.',
            'code', 500
        );
    END;
    
    -- =================================-------
    -- HANDLE PASSWORD SALAH
    -- ========================================
    IF NOT v_password_valid THEN
        -- Increment login attempts
        UPDATE public.multiusers SET
            login_attempts = COALESCE(v_user.login_attempts, 0) + 1,
            updated_at = NOW()
        WHERE id = v_user.id;
        
        -- Ambil nilai terbaru
        v_user.login_attempts := COALESCE(v_user.login_attempts, 0) + 1;
        
        -- Auto-suspend setelah 5x gagal
        IF v_user.login_attempts >= 5 THEN
            -- Suspend selama 30 hari
            UPDATE public.multiusers SET
                status = 'Suspended',
                suspended_until = NOW() + INTERVAL '30 days',
                suspension_reason = 'Terlalu banyak percobaan login gagal (5x)',
                is_active = FALSE,
                updated_at = NOW()
            WHERE id = v_user.id;
            
            RETURN json_build_object(
                'success', false,
                'error', 'ACCOUNT_LOCKED',
                'message', 'Akun dikunci karena 5x percobaan login gagal. Coba lagi dalam 30 hari atau hubungi admin.',
                'attempts_remaining', 0,
                'code', 423
            );
        END IF;
        
        -- Return error dengan sisa percobaan
        RETURN json_build_object(
            'success', false,
            'error', 'INVALID_CREDENTIALS',
            'message', 'Username atau password salah.',
            'attempts_remaining', 5 - v_user.login_attempts,
            'code', 401
        );
    END IF;
    
    -- ========================================
    -- LOGIN BERHASIL
    -- ========================================
    
    -- Reset login attempts & update last_login
    UPDATE public.multiusers SET
        login_attempts = 0,
        last_login = NOW(),
        updated_at = NOW()
    WHERE id = v_user.id;
    
    -- Generate session token (simple UUID untuk tracking)
    -- Dalam production, gunakan Supabase Auth JWT
    DECLARE
        v_session_token UUID := gen_random_uuid();
        v_session_expires TIMESTAMPTZ := NOW() + INTERVAL '24 hours';
    BEGIN
        -- Simpan session ke tabel sessions jika ada
        INSERT INTO public.peserta_sessions (
            user_id,
            session_token,
            expires_at,
            ip_address,
            user_agent
        ) VALUES (
            v_user.id,
            v_session_token,
            v_session_expires,
            inet_client_addr(),
            current_setting('request.header.user-agent', true)
        ) ON CONFLICT (user_id) DO UPDATE SET
            session_token = v_session_token,
            expires_at = v_session_expires,
            updated_at = NOW();
            
        EXCEPTION WHEN undefined_table OR undefined_column
            -- Tabel sessions belum ada, lanjutkan tanpa simpan session ke DB
            -- Session akan disimpan di localStorage saja
            THEN NULL;
    END;
    
    -- Return success dengan data user (TANPA password_hash!)
    v_result := json_build_object(
        'success', true,
        'message', 'Login berhasil',
        'code', 200,
        'user', json_build_object(
            'id', v_user.id,
            'email', v_user.email,
            'username', v_user.username,
            'nama_lengkap', v_user.nama_lengkap,
            'nik', v_user.nik,
            'role', v_user.role,
            'status', v_user.status
        ),
        'session', json_build_object(
            'token', v_session_token,
            'expires_at', v_session_expires
        )
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 2. TABLE: Peserta Sessions (Opsional tapi direkomendasikan)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.peserta_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.multiusers(id) ON DELETE CASCADE,
    session_token UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_peserta_sessions_token 
ON public.peserta_sessions(session_token) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_peserta_sessions_user 
ON public.peserta_sessions(user_id) 
WHERE is_active = TRUE;

-- Index untuk cleanup expired sessions
CREATE INDEX IF NOT EXISTS idx_peserta_sessions_expires 
ON public.peserta_sessions(expires_at) 
WHERE is_active = TRUE;

COMMENT ON TABLE public.peserta_sessions IS '
Tabel session untuk tracking login peserta.
Session otomatis expire setelah 24 jam.
';

-- =====================================================
-- 3. FUNCTION: Validate Session (Cek session valid)
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_validate_peserta_session(
    p_session_token UUID
) RETURNS JSON AS $$
DECLARE
    v_session RECORD;
BEGIN
    -- Cari session yang masih aktif dan belum expired
    SELECT 
        s.id,
        s.user_id,
        s.session_token,
        s.expires_at,
        s.is_active,
        u.username,
        u.nama_lengkap,
        u.role,
        u.status,
        u.email,
        u.nik
    INTO v_session
    FROM public.peserta_sessions s
    INNER JOIN public.multiusers u ON u.id = s.user_id
    WHERE s.session_token = p_session_token
      AND s.is_active = TRUE
      AND s.expires_at > NOW()
      AND u.status = 'Aktif';
    
    IF NOT FOUND THEN
        -- Session tidak valid - nonaktifkan jika ada
        UPDATE public.peserta_sessions 
        SET is_active = FALSE, updated_at = NOW()
        WHERE session_token = p_session_token;
        
        RETURN json_build_object(
            'valid', false,
            'error', 'SESSION_INVALID',
            'message', 'Session tidak valid atau sudah expired'
        );
    END IF;
    
    -- Return session info
    RETURN json_build_object(
        'valid', true,
        'user', json_build_object(
            'id', v_session.user_id,
            'username', v_session.username,
            'nama_lengkap', v_session.nama_lengkap,
            'email', v_session.email,
            'nik', v_session.nik,
            'role', v_session.role,
            'status', v_session.status
        ),
        'expires_at', v_session.expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 4. FUNCTION: Logout / Invalidate Session
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_logout_peserta(
    p_session_token UUID
) RETURNS JSON AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    -- Nonaktifkan session
    UPDATE public.peserta_sessions 
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE session_token = p_session_token
      AND is_active = TRUE;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    IF v_rows_affected > 0 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Logout berhasil'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'NO_SESSION',
            'message', 'Tidak ada session aktif ditemukan'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 5. RLS POLICIES - Keamanan Data Peserta
-- =====================================================

-- Enable RLS pada tabel multiusers
ALTER TABLE public.multiusers ENABLE ROW LEVEL SECURITY;

-- Policy: Peserta hanya bisa lihat data sendiri
CREATE POLICY "peserta_view_own_data" ON public.multiusers
    FOR SELECT USING (
        auth.uid()::text = id::text  -- Supabase Auth user
        OR
        -- Alternatif: cek via session
        EXISTS (
            SELECT 1 FROM public.peserta_sessions ps
            WHERE ps.user_id = multiusers.id
              AND ps.session_token = current_setting('request.header.x-session-token', true)::uuid
              AND ps.is_active = TRUE
              AND ps.expires_at > NOW()
        )
    );

-- Policy: Peserta TIDAK BISA update/delete data (hanya baca)
CREATE POLICY "peserta_read_only" ON public.multiusers
    FOR ALL USING (FALSE);

-- Enable RLS pada tabel peserta_sessions
ALTER TABLE public.peserta_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa manage session sendiri
CREATE POLICY "users_own_sessions" ON public.peserta_sessions
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 6. CLEANUP FUNCTION (Untuk scheduled job)
-- =====================================================
CREATE OR REPLACE FUNCTION public.fn_cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Hapus session yang sudah expired (lebih dari 1 hari)
    DELETE FROM public.peserta_sessions
    WHERE expires_at < NOW() - INTERVAL '1 day'
      AND is_active = FALSE;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Nonaktifkan session yang expired tapi masih active
    UPDATE public.peserta_sessions
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE expires_at < NOW()
      AND is_active = TRUE;
    
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant execute pada functions ke anon dan authenticated
GRANT EXECUTE ON FUNCTION public.fn_authenticate_peserta(VARCHAR, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_validate_peserta_session(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_logout_peserta(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_expired_sessions() TO anon, authenticated;

-- Grant select pada view peserta
GRANT SELECT ON public.peserta_sessions TO anon, authenticated;

-- =====================================================
-- 8. TEST QUERY (Hapus setelah testing)
-- =====================================================
/*
-- Test authentication:
SELECT public.fn_authenticate_peserta('peserta1', 'Peserta2024!');

-- Test dengan password salah:
SELECT public.fn_authenticate_peserta('peserta1', 'wrong_password');

-- Test validate session (ganti UUID dengan token dari hasil login):
SELECT public.fn_validate_peserta_session('UUID_DARI_HASIL_LOGIN');

-- Test logout:
SELECT public.fn_logout_peserta('UUID_DARI_HASIL_LOGIN');
*/

-- =====================================================
-- DOCUMENTATION
-- =====================================================
/*
╔══════════════════════════════════════════════════════════════╗
║     PANDUAN AUTENTIKASI PESERTA SIMBAKES (SECURE)           ╠═════╗
║                                                              ║       ║
║  🔐 KEAMANAN YANG DITERAPKAN:                               ║       ║
║  ✓ Password hashing dengan bcrypt (crypt())                 ║       ║
║  ✓ Tidak ada plaintext password di response                 ║       ║
║  ✓ Auto-suspend setelah 5x gagal                            ║       ║
║  ✓ Session management dengan expiry                         ║       ║
║  ✓ RLS policies untuk batasi akses data                     ║       ║
║  ✓ Role-based access (hanya role=peserta)                   ║       ║
║                                                              ║       ║
║  📡 API ENDPOINTS (via Supabase RPC):                       ║       ║
║                                                              ║       ║
║  1. Login:                                                   ║       ║
║     POST /rest/v1/rpc/fn_authenticate_peserta               ║       ║
║     Body: { "p_username": "...", "p_password": "..." }      ║       ║
║                                                              ║       ║
║  2. Validate Session:                                        ║       ║
║     POST /rest/v1/rpc/fn_validate_peserta_session           ║       ║
║     Body: { "p_session_token": "uuid" }                      ║       ║
║                                                              ║       ║
║  3. Logout:                                                  ║       ║
║     POST /rest/v1/rpc/fn_logout_peserta                     ║       ║
║     Body: { "p_session_token": "uuid" }                      ║       ║
║                                                              ║       ║
║  🔄 RESPONSE FORMAT:                                         ║       ║
║  Success:                                                    ║       ║
║  {                                                           ║       ║
║    "success": true,                                          ║       ║
║    "user": { "id", "username", "nama_lengkap", ... },        ║       ║
║    "session": { "token", "expires_at" }                      ║       ║
║  }                                                           ║       ║
║                                                              ║       ║
║  Error:                                                      ║       ║
║  {                                                           ║       ║
║    "success": false,                                         ║       ║
║    "error": "ERROR_CODE",                                    ║       ║
║    "message": "Human readable message",                      ║       ║
║    "code": HTTP_STATUS                                       ║       ║
║  }                                                           ║       ║
║                                                              ║       ║
╚══════════════════════════════════════════════════════════════╝
*/
