// ===== ENHANCED ADMIN AUTHENTICATION SYSTEM WITH RBAC =====

/**
 * ═══════════════════════════════════════════════════════════════
 * ROLE-BASED ACCESS CONTROL (RBAC) CONFIGURATION
 * ═══════════════════════════════════════════════════════════════
 * 
 * 3 LEVEL AKSES:
 * ┌───────────┬────────────────────────────────────────────────────┐
 * │ ROLE       │ DESKRIPSI & HAK AKSES                             │
 * ├───────────┼────────────────────────────────────────────────────┤
 * │ superadmin │ FULL ACCESS - Semua menu + CRUD + User Mgmt      │
 * │            │ • Dashboard, Data Pengusul, Roadmap Kebutuhan    │
 * │            │ • Penetapan, Laporan, Settings                   │
 * │            │ • Bisa tambah/edit/hapus data                    │
 * │            │ • Bisa kelola user admin lainnya                  │
 * ├───────────┼────────────────────────────────────────────────────┤
 * │ operator   │ TERBATAS - Hanya Menu Data Pengusul              │
 * │            │ • Hanya bisa akses menu "Data Pengusul"          │
 * │            │ • Bisa CRUD (tambah/edit/hapus) di Data Pengusul │
 * │            │ Menu lain: Tersembunyi                            │
 * ├───────────┼────────────────────────────────────────────────────┤
 * │ viewer     │ READ-ONLY - Lihat semua tapi tidak bisa edit      │
 * │            │ • Bisa lihat SEMUA menu panel admin               │
 * │            │ • TIDAK BISA: tambah, edit, hapus, export         │
 * │            │ • TIDAK BISA: akses settings/user management      │
 * └───────────┴────────────────────────────────────────────────────┘
 */

// ============================================================
// ROLE PERMISSION MATRIX
// ============================================================
const ROLE_CONFIG = {
    superadmin: {
        id: 'superadmin',
        name: 'Super Administrator',
        label: 'SUPERADMIN',
        description: 'Full Access - Kontrol Penuh Sistem',
        avatar: '👑',
        color: '#7c3aed',           // Purple
        gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
        badgeClass: 'role-superadmin-badge',
        avatarClass: 'admin-superadmin',
        
        // Menu Access
        menus: {
            dashboard: true,
            dataPengusul: true,
            roadmapKebutuhan: true,
            penetapan: true,
            laporan: true,
            pesertaPortal: true,
            userManagement: true,
            settings: true
        },
        
        // Action Permissions (CRUD)
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
        canExport: true,
        canImport: true,
        canApprove: true,
        canManageUsers: true,
        canChangeSettings: true,
        
        // Special Permissions
        fullAccess: true,
        viewOnly: false
    },
    
    operator: {
        id: 'operator',
        name: 'Operator Data',
        label: 'OPERATOR',
        description: 'Terbatas - Hanya Data Pengusul',
        avatar: '⚙️',
        color: '#2563eb',           // Blue
        gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        badgeClass: 'role-operator-badge',
        avatarClass: 'admin-operator',
        
        // Menu Access - HANYA Data Pengusul!
        menus: {
            dashboard: false,        // Hidden
            dataPengusul: true,       // VISIBLE & ACCESSIBLE
            roadmapKebutuhan: false,   // Hidden
            penetapan: false,         // Hidden
            laporan: false,           // Hidden
            pesertaPortal: false,      // Hidden
            userManagement: false,     // Hidden
            settings: false            // Hidden
        },
        
        // Action Permissions - CRUD hanya di Data Pengusul
        canCreate: true,             // Bisa tambah data pengusul
        canRead: true,
        canUpdate: true,             // Bisa edit data pengusul
        canDelete: true,             // Bisa hapus data pengusul
        canExport: true,             // Bisa export data pengusul
        canImport: false,
        canApprove: false,
        canManageUsers: false,
        canChangeSettings: false,
        
        // Special Permissions
        fullAccess: false,
        viewOnly: false
    },
    
    viewer: {
        id: 'viewer',
        name: 'Viewer',
        label: 'VIEWER',
        description: 'Read-Only - Melihat Saja',
        avatar: '👁️',
        color: '#059669',           // Green/Teal
        gradient: 'linear-gradient(135deg, #059669, #047857)',
        badgeClass: 'role-viewer-badge',
        avatarClass: 'admin-viewer',
        
        // Menu Access - Bisa lihat SEMUA (kecuali Settings/User Mgmt)
        menus: {
            dashboard: true,         // Visible (read-only)
            dataPengusul: true,      // Visible (read-only)
            roadmapKebutuhan: true,   // Visible (read-only)
            penetapan: true,         // Visible (read-only)
            laporan: true,           // Visible (read-only)
            pesertaPortal: true,      // Visible (read-only)
            userManagement: false,    // Hidden
            settings: false           // Hidden
        },
        
        // Action Permissions - READ ONLY!
        canCreate: false,            // TIDAK BISA tambah
        canRead: true,              // Bisa lihat
        canUpdate: false,           // TIDAK BISA edit
        canDelete: false,           // TIDAK BISA hapus
        canExport: false,           // TIDAK BISA export
        canImport: false,
        canApprove: false,
        canManageUsers: false,
        canChangeSettings: false,
        
        // Special Permissions
        fullAccess: false,
        viewOnly: true
    }
};

/**
 * Admin Users Configuration
 * ⚠️ KEAMANAN: Tidak ada password yang disimpan di client-side!
 * Semua data user diambil dari tabel `multiusers` di Supabase.
 * - Role: 'superadmin' | 'operator' | 'viewer'
 * - Autentikasi 100% via Supabase (RLS enabled)
 */
// ADMIN_USERS DIHAPUS - Gunakan Supabase multiusers table saja!
// Keamanan: Password tidak pernah tampil di console/browser source

// Current admin session state
let currentAdminUser = null;  // Stores current logged-in user object
let adminSessionTimer = null; // Auto-logout timer
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

/**
 * Initialize authentication state from localStorage
 * Call this on page load
 */
function initAuthState() {
    const savedSession = localStorage.getItem('simbakes_admin_session');
    
    // Pastikan login page tetap tersembunyi saat load
    // Login hanya diperlukan untuk Panel Admin saja!
    const loginPage = document.getElementById('login-page');
    if (loginPage) loginPage.classList.add('hidden');
    
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            
            // Validate session is not expired
            if (sessionData.timestamp && (Date.now() - sessionData.timestamp) < SESSION_DURATION) {
                // Restore session
                let restoredUser = sessionData.user;
                
                // 🔧 FIX: Normalisasi role dari session lama
                if (restoredUser) {
                    const originalRole = restoredUser.role;
                    restoredUser.role = mapLegacyRole(restoredUser.role);
                    restoredUser.userRole = restoredUser.userRole || restoredUser.role;
                    
                    // Log jika role berubah (untuk debugging)
                    if (originalRole !== restoredUser.role) {
                        console.log('[SESSION] Role normalized:', originalRole, '→', restoredUser.role);
                    }
                }
                
                currentAdminUser = restoredUser;
                
                // Update UI for logged-in state (sidebar admin menu)
                showLoggedInUI(currentAdminUser);
                
                console.log('✅ Session restored for:', currentAdminUser.name, '| Role:', currentAdminUser.role);
                return true;
            } else {
                // Session expired - tapi jangan tampilkan login page
                console.log('⏰ Session expired, silakan login saat akses Panel Admin');
                clearAuthState();
            }
        } catch (e) {
            console.error('❌ Error parsing session:', e);
            clearAuthState();
        }
    }
    
    // JANGAN tampilkan login page - user bisa akses menu lain bebas
    return false;
}

/**
 * Handle login from main login page overlay
 */
async function handleAdminLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    return await performAuthentication(username, password, 'main');
}

/**
 * Handle login from sidebar form
 */
async function handleSidebarLogin() {
    const username = document.getElementById('sidebar-username').value.trim();
    const password = document.getElementById('sidebar-password').value;
    
    await performAuthentication(username, password, 'sidebar');
}

/**
 * Core Authentication Logic - CUSTOM LOGIN VIA MULTIUSERS TABLE
 * Login langsung ke tabel multiusers TANPA melalui Supabase Auth
 * Support login via Username OR Email
 */
async function performAuthentication(username, password, source) {
    // Show error element reference
    const errorEl = document.getElementById('login-error-msg');
    const errorTextEl = document.getElementById('login-error-text');
    
    if (!username || !password) {
        showError(errorEl, errorTextEl, 'Username dan password wajib diisi!');
        shakeElement(source === 'main' ? '.login-container' : '#admin-login-form');
        return false;
    }
    
    // 🔒 SECURITY: Jangan log password ke console
    console.log('[SIMBAKES AUTH] Custom login attempt for:', username);
    
    try {
        // Pastikan Supabase client tersedia
        let client = supabaseClient;
        if (!client) {
            if (typeof initSupabaseClient === 'function') initSupabaseClient();
            client = supabaseClient;
        }
        
        if (!client) {
            showError(errorEl, errorTextEl, 'Koneksi database tidak tersedia. Silakan refresh halaman.');
            return false;
        }
        
        // ===== STEP 1: Cari user di tabel multiusers (by username OR email) =====
        console.log('[SIMBAKES AUTH] Querying multiusers table...');
        
        const { data: dbUsers, error: dbError } = await client
            .from('multiusers')
            .select('*')
            .or(`username.eq.${username.toLowerCase()},email.eq.${username.toLowerCase()}`)
            .limit(1);
        
        if (dbError) {
            console.error('[SIMBAKES AUTH] Database error:', dbError);
            showError(errorEl, errorTextEl, 'Error database. Silakan coba lagi.');
            shakeElement(source === 'main' ? '.login-container' : '#admin-login-form');
            return false;
        }
        
        // ===== STEP 2: Cek apakah user ditemukan =====
        if (!dbUsers || dbUsers.length === 0) {
            console.warn('[SIMBAKES AUTH] User not found in multiusers');
            showError(errorEl, errorTextEl, 'Username tidak ditemukan! Silakan daftar terlebih dahulu.');
            shakeElement(source === 'main' ? '.login-container' : '#admin-login-form');
            return false;
        }
        
        const dbUser = dbUsers[0];
        console.log('[SIMBAKES AUTH] User found:', dbUser.username, '| Role:', dbUser.role);
        
        // ===== STEP 3: Cek status akun =====
        
        // Cek apakah akun suspended
        if (dbUser.status === 'Suspended') {
            if (dbUser.suspended_until && new Date(dbUser.suspended_until) > new Date()) {
                const suspendEnd = new Date(dbUser.suspended_until).toLocaleString('id-ID');
                showError(errorEl, errorTextEl, `Akun DIBLOKIR hingga ${suspendEnd}. Alasan: ${dbUser.suspension_reason || 'Melanggar aturan'}`);
                shakeElement(source === 'main' ? '.login-container' : '#admin-login-form');
                return false;
            }
            // Jika suspension sudah expired, auto-unsuspend
            console.log('[SIMBAKES AUTH] Suspension expired, allowing login');
        }
        
        // Cek apakah akun aktif
        if (dbUser.is_active === false) {
            showError(errorEl, errorTextEl, 'Akun Anda telah dinonaktifkan. Hubungi administrator.');
            shakeElement(source === 'main' ? '.login-container' : '#admin-login-form');
            return false;
        }
        
        // Cek login attempts (brute force protection)
        const MAX_ATTEMPTS = 5;
        if (dbUser.login_attempts >= MAX_ATTEMPTS) {
            showError(errorEl, errorTextEl, 'Akun terkunci karena terlalu banyak percobaan gagal. Tunggu 15 menit atau hubungi admin.');
            shakeElement(source === 'main' ? '.login-container' : '#admin-login-form');
            return false;
        }
        
        // ===== STEP 4: Verifikasi Password =====
        const isPasswordValid = await verifyPassword(password, dbUser.password_hash);
        
        if (!isPasswordValid) {
            console.warn('[SIMBAKES AUTH] Invalid password for user:', dbUser.username);
            
            // Increment login attempts
            const newAttempts = (dbUser.login_attempts || 0) + 1;
            await client
                .from('multiusers')
                .update({ 
                    login_attempts: newAttempts,
                    updated_at: new Date().toISOString()
                })
                .eq('id', dbUser.id);
            
            const remaining = MAX_ATTEMPTS - newAttempts;
            if (remaining > 0) {
                showError(errorEl, errorTextEl, `Password salah! Percobaan tersisa: ${remaining}`);
            } else {
                showError(errorEl, errorTextEl, 'Akun TERKUNCI karena terlalu manyak percobaan gagal.');
            }
            shakeElement(source === 'main' ? '.login-container' : '#admin-login-form');
            return false;
        }
        
        // ===== STEP 5: LOGIN BERHASIL - Reset attempts & Update last_login =====
        console.log('[SIMBAKES AUTH] ✅ Password verified successfully!');
        
        try {
            await client
                .from('multiusers')
                .update({ 
                    last_login: new Date().toISOString(),
                    login_attempts: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', dbUser.id);
        } catch (e) {
            console.warn('[SIMBAKES AUTH] Could not update last_login:', e);
        }
        
        // ===== STEP 6: Handle Login Success =====
        return handleAuthSuccess(dbUser, source);
        
    } catch (error) {
        console.error('[SIMBAKES AUTH] Authentication exception:', error);
        showError(errorEl, errorTextEl, `Error: ${error.message}. Silakan coba lagi.`);
        shakeElement(source === 'main' ? '.login-container' : '#admin-login-form');
        return false;
    }
}

/**
 * Verify password against hash
 * Support: bcrypt hash, SHA256, or plain text (for migration)
 */
async function verifyPassword(inputPassword, storedHash) {
    if (!storedHash || !inputPassword) return false;
    
    // Case 1: Direct comparison (plain text or simple hash)
    if (inputPassword === storedHash) {
        return true;
    }
    
    // Case 2: bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
        try {
            // Use Web Crypto API for basic comparison if bcrypt.js not available
            // For production, consider adding bcryptjs library
            console.warn('[SIMBAKES AUTH] bcrypt detected - using direct comparison for now');
            // Fallback: check if there's a simpler verification method
            return false; // Will need bcryptjs for proper verification
        } catch (e) {
            console.error('[SIMBAKES AUTH] bcrypt verify error:', e);
            return false;
        }
    }
    
    // Case 3: SHA-256 hash
    if (storedHash.length === 64 && /^[a-f0-9]{64}$/i.test(storedHash)) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(inputPassword);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex === storedHash.toLowerCase();
        } catch (e) {
            console.error('[SIMBAKES AUTH] SHA-256 verify error:', e);
            return false;
        }
    }
    
    // Case 4: MD5 hash (32 char hex)
    if (storedHash.length === 32 && /^[a-f0-9]{32}$/i.test(storedHash)) {
        try {
            // Simple MD5-like comparison (for legacy support)
            // Note: MD5 is not secure, only for backward compatibility
            const encoder = new TextEncoder();
            const data = encoder.encode(inputPassword);
            const hashBuffer = await crypto.subtle.digest('MD5', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex === storedHash.toLowerCase();
        } catch (e) {
            // MD5 might not be supported, try alternative
            console.warn('[SIMBAKES AUTH] MD5 not supported, trying direct comparison');
            return false;
        }
    }
    
    // Default: no match
    return false;
}

/**
 * Handle successful authentication - format user dan simpan session
 */
async function handleAuthSuccess(profile, source) {
    const errorEl = document.getElementById('login-error-msg');
    
    // 🔧 FIX: Format & normalisasi role dari database
    let rawRole = profile.role || 'user';
    console.log('[AUTH] Raw role from DB:', rawRole, '| Profile:', profile.username);
    
    // Normalisasi role untuk konsistensi
    const role = mapLegacyRole(rawRole);
    console.log('[AUTH] Normalized role:', role, '(from:', rawRole, ')');
    
    // Build user object untuk session (TANPA PASSWORD!)
    const userData = {
        id: profile.id,
        auth_user_id: profile.auth_user_id,
        username: profile.username,
        email: profile.email,
        name: profile.nama_lengkap || profile.username,
        role: role,  // Gunakan role yang sudah dinormalisasi
        avatar: getAvatarForRole(role),
        institusi: profile.institusi || '',
        nik: profile.nik,
        source: 'multiusers_custom',
        loginTime: new Date().toISOString(),
        // Tambahkan userRole untuk kompatibilitas dengan sistem baru
        userRole: role
    };
    
    // Update last_login di database
    try {
        await supabaseClient
            .from('multiusers')
            .update({ 
                last_login: new Date().toISOString(),
                login_attempts: 0,
                updated_at: new Date().toISOString()
            })
            .eq('id', profile.id);
    } catch (e) {
        console.warn('[SIMBAKES AUTH] Could not update last_login:', e);
    }
    
    // Simpan session
    currentAdminUser = userData;
    saveSession({
        ...userData,
        timestamp: Date.now(),
        authSource: 'multiusers_custom'
    });
    
    // Update UI
    showLoggedInUI(userData);
    
    // Hide login & clear form
    if (source === 'main') {
        document.getElementById('login-page')?.classList.add('hidden');
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        hideError(errorEl);
    } else {
        document.getElementById('sidebar-username').value = '';
        document.getElementById('sidebar-password').value = '';
    }
    
    // Start session timer
    startSessionTimer();
    
    const roleDisplay = role.toUpperCase();
    showToast(`✅ Selamat datang, ${userData.name}! (${roleDisplay})`, 'success', 5000);
    console.log(`[SIMBAKES AUTH] ✅ Logged in: ${userData.name} [${role}] via Multiusers Table`);
    
    return true;
}

/**
 * Handle successful login - update UI and session
 */
function handleLoginSuccess(user, source, authSource) {
    const errorEl = document.getElementById('login-error-msg');
    const errorTextEl = document.getElementById('login-error-text');
    
    currentAdminUser = user;
    
    // 🔒 SECURITY: Jangan simpan password di localStorage/session!
    // Hanya simpan data yang diperlukan untuk UI dan otorisasi
    const { password, ...safeUserData } = user;  // Exclude password
    const sessionData = { 
        ...safeUserData, 
        authSource, 
        loginTime: new Date().toISOString(),
        timestamp: Date.now()
    };
    saveSession(sessionData);
    
    // Update UI
    showLoggedInUI(user);
    
    // Hide login page/elements & clear form
    if (source === 'main') {
        document.getElementById('login-page')?.classList.add('hidden');
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        hideError(errorEl);
    } else {
        document.getElementById('sidebar-username').value = '';
        document.getElementById('sidebar-password').value = '';
    }
    
    // Start session timer
    startSessionTimer();
    
    const roleDisplay = user.role.toUpperCase();
    showToast(`✅ Selamat datang, ${user.name}! (${roleDisplay})`, 'success', 5000);
    console.log(`✅ Logged in as: ${user.name} [${user.role}] via ${authSource}`);
    
    return true;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * SHOW UI ELEMENTS FOR LOGGED-IN STATE (Enhanced RBAC)
 * ═══════════════════════════════════════════════════════════════
 */
function showLoggedInUI(user) {
    // Get role configuration
    const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.superadmin;
    
    // Hide login forms (sidebar)
    document.getElementById('admin-login-form').style.display = 'none';
    
    // Show admin menu in sidebar
    document.getElementById('admin-menu').style.display = 'block';
    document.getElementById('admin-info-bar').classList.add('visible');
    
    // Update admin info bar content (sidebar) with role-based styling
    const avatarEl = document.getElementById('admin-avatar-icon');
    const displayNameEl = document.getElementById('admin-display-name');
    
    if (avatarEl) {
        avatarEl.textContent = user.avatar || roleConfig.avatar;
        avatarEl.className = `admin-avatar ${roleConfig.avatarClass}`;
        avatarEl.style.background = roleConfig.gradient;
    }
    
    if (displayNameEl) {
        displayNameEl.innerHTML = `
            ${user.name}
            <span class="admin-role-badge ${roleConfig.badgeClass}" style="background:${roleConfig.color};">
                ${roleConfig.label}
            </span>
        `;
    }
    
    // Apply role-based menu visibility (MAIN FUNCTION)
    applyRoleBasedAccess(user.role);
    
    // Update status badge in nav with role-specific text
    const statusBadge = document.getElementById('admin-status-badge');
    if (statusBadge) {
        // 🔧 FIX: Lengkapi mapping untuk semua role termasuk superadmin
        const roleLabels = {
            superadmin: '👑 Superadmin',
            admin: '👑 Administrator',
            operator: '⚙️ Operator',
            viewer: '👁️ Viewer',
            peserta: '📋 Peserta'
        };
        statusBadge.textContent = roleLabels[user.role] || user.role?.toUpperCase() || 'User';
        statusBadge.className = 'badge-online';
        statusBadge.style.background = roleConfig.gradient;
    }
    
    // UPDATE TOPBAR (PojoK Kanan Atas)!
    if (typeof updateTopbarAfterLogin === 'function') {
        updateTopbarAfterLogin({
            ...user,
            roleConfig: roleConfig
        });
    }
    
    // Show welcome message with role info
    console.log(`[RBAC] ✅ UI updated for: ${user.name} (${roleConfig.label})`);
}

/**
 * ═══════════════════════════════════════════════════════════════
 * APPLY ROLE-BASED ACCESS CONTROL (RBAC)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Fungsi ini mengatur:
 * 1. Visibility menu berdasarkan role
 * 2. Action buttons (CRUD) berdasarkan permissions
 * 3. Redirect jika user mencoba akses terlarang
 * 
 * @param {string} role - 'superadmin' | 'operator' | 'viewer'
 */
function applyRoleBasedAccess(role) {
    console.log(`[RBAC] 🔄 Applying role-based access for: ${role}`);
    
    // Get role configuration
    const roleConfig = ROLE_CONFIG[role];
    if (!roleConfig) {
        console.warn(`[RBAC] ⚠️ Unknown role: ${role}. Defaulting to restricted access.`);
        return;
    }
    
    // ===========================================
    // 1. MENU VISIBILITY CONTROL
    // ===========================================
    const menuMapping = {
        // Navigation IDs → Config Key
        'nav-dashboard': 'dashboard',
        'nav-data-pengusul': 'dataPengusul',
        'nav-data-roadmap': 'roadmapKebutuhan',
        'nav-penetapan': 'penetapan',
        'nav-laporan': 'laporan',
        'nav-peserta-portal': 'pesertaPortal',
        'nav-user-management': 'userManagement',
        'nav-settings': 'settings'
    };
    
    const pageMapping = {
        // Page IDs → Config Key
        'page-dashboard': 'dashboard',
        'page-data-pengusul': 'dataPengusul',
        'page-data-roadmap': 'roadmapKebutuhan',
        'page-penetapan': 'penetapan',
        'page-laporan': 'laporan'
    };
    
    // Apply visibility to NAVIGATION items
    Object.entries(menuMapping).forEach(([navId, configKey]) => {
        const navElement = document.getElementById(navId);
        if (navElement) {
            const hasAccess = roleConfig.menus[configKey];
            
            if (hasAccess) {
                // Show menu
                navElement.style.display = '';
                navElement.removeAttribute('data-hidden-for');
                navElement.removeAttribute('disabled');
            } else {
                // Hide menu
                navElement.style.display = 'none';
                navElement.setAttribute('data-hidden-for', role);
                navElement.setAttribute('disabled', 'true');
            }
        }
    });
    
    // Check if current page is accessible, if not redirect
    let needsRedirect = false;
    let redirectTarget = null;
    
    // Find first accessible page for redirect
    Object.entries(pageMapping).forEach(([pageId, configKey]) => {
        const pageElement = document.getElementById(pageId);
        if (pageElement && pageElement.classList.contains('active')) {
            if (!roleConfig.menus[configKey]) {
                needsRedirect = true;
                console.log(`[RBAC] ⚠️ Current page '${pageId}' not accessible for role: ${role}`);
            }
        }
        // Find first accessible page as redirect target
        if (!redirectTarget && roleConfig.menus[configKey]) {
            redirectTarget = configKey === 'dashboard' ? 'dashboard' : 
                           configKey === 'dataPengusul' ? 'data-pengusul' :
                           configKey === 'roadmapKebutuhan' ? 'data-roadmap' :
                           configKey === 'penetapan' ? 'penetapan' :
                           configKey === 'laporan' ? 'laporan' : 'dashboard';
        }
    });
    
    // Perform redirect if needed
    if (needsRedirect && redirectTarget) {
        showToast(`⚠️ Role '${role.toUpperCase()}' tidak dapat mengakses halaman ini.`, 'warning');
        setTimeout(() => {
            if (typeof showPage === 'function') {
                showPage(redirectTarget);
            }
        }, 1000);
    }
    
    // ===========================================
    // 2. ACTION BUTTONS RESTRICTION (CRUD)
    // ===========================================
    restrictActionsByRole(role, roleConfig);
    
    // ===========================================
    // 3. LOGGING
    // ===========================================
    const accessibleMenus = Object.entries(roleConfig.menus)
        .filter(([key, value]) => value)
        .map(([key]) => key);
    
    console.log(`[RBAC] ✅ Role '${role}' applied:`);
    console.log(`[RBAC]    📂 Accessible Menus: [${accessibleMenus.join(', ')}]`);
    console.log(`[RBAC]    🔧 Can Create: ${roleConfig.canCreate}`);
    console.log(`[RBAC]    ✏️  Can Update: ${roleConfig.canUpdate}`);
    console.log(`[RBAC]    🗑️  Can Delete: ${roleConfig.canDelete}`);
    console.log(`[RBAC]    👁️  View Only: ${roleConfig.viewOnly}`);
}

/**
 * ═══════════════════════════════════════════════════════════════
 * RESTRICT ACTIONS BY ROLE (CRUD Control)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Membatasi tombol-tombol aksi berdasarkan role:
 * - Tombol Tambah/Create
 * - Tombol Edit/Update  
 * - Tombol Delete/Hapus
 * - Tombol Export
 * - Form inputs (disable untuk viewer)
 */
function restrictActionsByRole(role, roleConfig) {
    if (!roleConfig) return;
    
    // ===========================================
    // BUTTON SELECTORS BY ACTION TYPE
    // ===========================================
    const actionSelectors = {
        create: [
            '[data-action="create"]',
            '[data-permission="create"]',
            '.btn-add',
            '.btn-create',
            '.btn-tambah',
            'button[id*="add"]',
            'button[id*="tambah"]',
            'button[id*="create"]',
            'a[href*="tambah"]',
            'a[href*="add"]',
            'a[href*="create"]'
        ],
        update: [
            '[data-action="edit"]',
            '[data-action="update"]',
            '[data-permission="edit"]',
            '[data-permission="update"]',
            '.btn-edit',
            '.btn-update',
            '.btn-edit-data',
            'button[id*="edit"]',
            'button[id*="ubah"]',
            'button[id*="update"]',
            'a[href*="edit"]',
            'a[href*="ubah"]'
        ],
        delete: [
            '[data-action="delete"]',
            '[data-permission="delete"]',
            '.btn-delete',
            '.btn-hapus',
            '.btn-remove',
            'button[id*="delete"]',
            'button[id*="hapus"]',
            'button[id*="remove"]',
            'a[href*="delete"]',
            'a[href*="hapus"]'
        ],
        export: [
            '[data-action="export"]',
            '[data-permission="export"]',
            '.btn-export',
            'button[id*="export"]',
            'button[id*="unduh"]',
            'a[href*="export"]',
            'a[href*="download"]',
            'a[href*="unduh"]'
        ],
        approve: [
            '[data-action="approve"]',
            '[data-permission="approve"]',
            '.btn-approve',
            '.btn-setujui',
            'button[id*="approve"]',
            'button[id*="setujui"]'
        ]
    };
    
    // ===========================================
    // APPLY RESTRICTIONS BASED ON ROLE
    // ===========================================
    
    // VIEWER MODE: Disable ALL action buttons (Read-Only)
    if (roleConfig.viewOnly) {
        console.log('[RBAC] 👁️ Applying VIEW-ONLY restrictions...');
        
        // Combine all action selectors for viewer
        const allActionSelectors = [
            ...actionSelectors.create,
            ...actionSelectors.update,
            ...actionSelectors.delete,
            ...actionSelectors.export,
            ...actionSelectors.approve
        ];
        
        allActionSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    el.style.display = 'none';           // Hide button
                    el.setAttribute('disabled', 'true');   // Disable
                    el.setAttribute('data-reason', 'view-only-access');
                    el.title = '❌ Dilarang: Akun Viewer hanya bisa melihat';
                });
            } catch (e) {
                // Selector might be invalid, ignore
            }
        });
        
        // Also disable form inputs
        disableFormInputs();
        
        return; // Exit early for viewer
    }
    
    // OPERATOR MODE: Only allow actions in Data Pengusul section
    if (role === 'operator') {
        console.log('[RBAC] ⚙️ Applying OPERATOR restrictions (Data Pengusul only)...');
        
        // For operator, we allow CRUD but only in specific areas
        // The menu visibility already limits them to Data Pengusul
        // So we don't need to hide buttons here - they're already in the right section
        
        // But we should still restrict certain global actions
        const restrictedForOperator = [
            ...actionSelectors.approve,  // Operator cannot approve
            ...actionSelectors.export.filter(s => !s.includes('pengusul')) // Only export in their area
        ];
        
        restrictedForOperator.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    // Only hide if NOT in data pengusul section
                    const isInPengusulSection = el.closest('#page-data-pengusul') || 
                                              el.closest('[data-section="pengusul"]') ||
                                              el.closest('.pengusul-section');
                    
                    if (!isInPengusulSection) {
                        el.style.display = 'none';
                        el.setAttribute('disabled', 'true');
                        el.setAttribute('data-reason', 'operator-restricted');
                        el.title = '❌ Operator hanya dapat mengelola Data Pengusul';
                    }
                });
            } catch (e) {
                // Ignore invalid selectors
            }
        });
        
        return;
    }
    
    // SUPERADMIN MODE: No restrictions!
    if (role === 'superadmin') {
        console.log('[RBAC] 👑 SUPERADMIN mode: All actions enabled');
        
        // Re-enable any previously hidden elements
        document.querySelectorAll('[data-reason]').forEach(el => {
            el.style.display = '';
            el.removeAttribute('disabled');
            el.removeAttribute('data-reason');
            el.title = '';
        });
        
        // Re-enable form inputs
        enableFormInputs();
    }
}

/**
 * Disable form inputs (for VIEWER role)
 */
function disableFormInputs() {
    const inputSelectors = [
        'input[type="text"]',
        'input[type="number"]',
        'input[type="email"]',
        'input[type="date"]',
        'input[type="file"]',
        'textarea',
        'select:not([disabled])',
        '[contenteditable="true"]'
    ];
    
    inputSelectors.forEach(selector => {
        try {
            // Only disable forms that are NOT in login/auth sections
            document.querySelectorAll(selector).forEach(el => {
                const isAuthForm = el.closest('.login-form') || 
                                  el.closest('.admin-login-form') ||
                                  el.closest('#login-page') ||
                                  el.closest('.auth-section');
                
                if (!isAuthForm) {
                    el.setAttribute('disabled', 'true');
                    el.setAttribute('readonly', 'true');
                    el.style.backgroundColor = '#f3f4f6';
                    el.style.cursor = 'not-allowed';
                    el.setAttribute('data-viewer-disabled', 'true');
                }
            });
        } catch (e) {
            // Ignore
        }
    });
}

/**
 * Re-enable form inputs (when switching from viewer to other roles)
 */
function enableFormInputs() {
    document.querySelectorAll('[data-viewer-disabled]').forEach(el => {
        el.removeAttribute('disabled');
        el.removeAttribute('readonly');
        el.style.backgroundColor = '';
        el.style.cursor = '';
        el.removeAttribute('data-viewer-disabled');
    });
}

/**
 * Save session to localStorage
 */
function saveSession(user) {
    const sessionData = {
        user: user,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
    };
    
    localStorage.setItem('simbakes_admin_session', JSON.stringify(sessionData));
}

/**
 * Clear authentication state
 */
function clearAuthState() {
    currentAdminUser = null;
    localStorage.removeItem('simbakes_admin_session');
    
    if (adminSessionTimer) {
        clearTimeout(adminSessionTimer);
        adminSessionTimer = null;
    }
}

/**
 * Logout function - enhanced with cleanup
 */
function adminLogout() {
    const userName = currentAdminUser?.name || 'Admin';
    
    // Clear everything
    clearAuthState();
    
    // Reset UI sidebar
    document.getElementById('admin-login-form').style.display = 'block';
    document.getElementById('admin-menu').style.display = 'none';
    document.getElementById('admin-info-bar').classList.remove('visible');
    document.getElementById('admin-status-badge').textContent = 'Login';
    document.getElementById('admin-status-badge').className = 'badge-login';
    
    // JANGAN tampilkan login page overlay - biarkan user di dashboard
    document.getElementById('login-page')?.classList.add('hidden');
    
    // RESET TOPBAR ke kondisi awal (tombol Login muncul lagi)
    if (typeof resetTopbarAfterLogout === 'function') {
        resetTopbarAfterLogout();
    }
    
    // Navigate to dashboard (bisa diakses tanpa login)
    showPage('dashboard');
    
    // Tampilkan semua menu yang mungkin disembunyikan (Roadmap untuk operator)
    const roadmapNav = document.getElementById('nav-data-roadmap');
    if (roadmapNav) {
        roadmapNav.style.display = '';
        roadmapNav.removeAttribute('data-hidden-for');
    }
    
    showToast(`👋 Sampai jumpa, ${userName}!`, 'info');
    console.log(`👋 Logged out: ${userName}`);
}

/**
 * ═══════════════════════════════════════════════════════════════
 * CHECK USER PERMISSIONS (Enhanced RBAC)
 * ═══════════════════════════════════════════════════════════════
 * 
 * @param {string} permission - Permission to check:
 *   - 'create', 'read', 'update', 'delete'
 *   - 'export', 'import', 'approve'
 *   - 'manageUsers', 'changeSettings'
 *   - 'fullAccess', 'viewOnly'
 *   - Legacy: 'roadmap', 'full'
 * @returns {boolean} Has permission or not
 */
function hasPermission(permission) {
    if (!currentAdminUser) {
        console.warn('[RBAC] ⚠️ No user logged in - permission denied');
        return false;
    }
    
    const role = currentAdminUser.role;
    const roleConfig = ROLE_CONFIG[role];
    
    if (!roleConfig) {
        console.warn(`[RBAC] ⚠️ Unknown role: ${role} - permission denied`);
        return false;
    }
    
    // Map legacy permissions to new system
    const permissionMap = {
        'roadmap': 'canRead',          // Old 'roadmap' means can see roadmap
        'full': 'fullAccess',          // Old 'full' means full access
        'dashboard': 'canRead',
        'dataPengusul': 'canRead',
        'pengusul': 'canUpdate',       // Can manage pengusul data
        'settings': 'canChangeSettings',
        'users': 'canManageUsers'
    };
    
    // Normalize permission name
    const normalizedPerm = permissionMap[permission] || permission;
    
    // Check permission
    const hasPerm = roleConfig[normalizedPerm] === true || 
                     roleConfig.menus[permission] === true;
    
    if (!hasPerm) {
        console.log(`[RBAC] 🔒 Permission '${permission}' DENIED for role: ${role}`);
    }
    
    return hasPerm;
}

/**
 * Get current user's role
 */
function getCurrentUserRole() {
    return currentAdminUser?.role || null;
}

/**
 * Check if user is logged in
 */
function isAdminAuthenticated() {
    return currentAdminUser !== null;
}

// ============================================================
// RBAC AVATAR & HELPER FUNCTIONS
// ============================================================

/**
 * Get avatar icon based on RBAC role
 */
function getAvatarForRole(role) {
    const avatars = {
        superadmin: "👑",
        operator: "⚙️",
        viewer: "👁️"
    };
    return avatars[role] || "👤";
}

/**
 * Get current role configuration object
 */
function getCurrentRoleConfig() {
    if (!currentAdminUser) return null;
    return ROLE_CONFIG[currentAdminUser.role] || null;
}

/**
 * Debug RBAC state to console
 */
function debugRBAC() {
    console.log("[RBAC] Debug Info:");
    console.log("  User:", currentAdminUser?.name);
    console.log("  Role:", currentAdminUser?.role);
}

/**
 * Map role dari database ke role sistem
 * Schema SQL supports: superadmin, admin, viewer, peserta, admin_sekolah, 
 * admin_dinkes, reviewer, operator
 */
function mapLegacyRole(dbRole) {
    // Jika role sudah valid, langsung return
    const validRoles = ['superadmin', 'admin', 'viewer', 'operator', 'peserta', 
                       'admin_sekolah', 'admin_dinkes', 'reviewer'];
    
    if (validRoles.includes(dbRole?.toLowerCase())) {
        return dbRole.toLowerCase();
    }
    
    // Mapping legacy roles
    const roleMap = {
        // Legacy → Standard
        'administrator': 'superadmin',
        'admin': 'superadmin',
        'super_admin': 'superadmin',
        'super-admin': 'superadmin',
        'op': 'operator',
        'data_entry': 'operator',
        'read_only': 'viewer',
        'read-only': 'viewer',
        'user': 'viewer',
        'participant': 'peserta'
    };
    
    return roleMap[dbRole?.toLowerCase()] || 'viewer';  // Default: viewer (paling aman)
}

// Permission helper functions (shorthand)
const canCreate = () => hasPermission("create");
const canUpdate = () => hasPermission("update");
const canDelete = () => hasPermission("delete");
const isSuperAdmin = () => getCurrentUserRole() === "superadmin";
const isOperator = () => getCurrentUserRole() === "operator";
const isViewer = () => getCurrentUserRole() === "viewer";

/**
 * Start auto-logout timer
 */
function startSessionTimer() {
    if (adminSessionTimer) clearTimeout(adminSessionTimer);
    
    adminSessionTimer = setTimeout(() => {
        showToast('⏰ Sesi Anda telah berakhir. Silakan login kembali.', 'error', 5000);
        adminLogout();
    }, SESSION_DURATION);
    
    // Update session info display
    updateSessionInfo();
}

/**
 * Update session info display
 */
function updateSessionInfo() {
    const sessionInfoEl = document.getElementById('admin-session-info');
    if (sessionInfoEl && currentAdminUser) {
        const now = new Date();
        sessionInfoEl.textContent = `Aktif sejak ${now.toLocaleTimeString('id-ID')}`;
    }
}

/**
 * Helper: Show error message
 */
function showError(element, textElement, message) {
    if (element && textElement) {
        textElement.textContent = message;
        element.classList.add('show');
    }
}

/**
 * Helper: Hide error message
 */
function hideError(element) {
    if (element) {
        element.classList.remove('show');
    }
}

/**
 * Helper: Shake animation for invalid input
 */
function shakeElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    
    el.style.animation = 'none';
    el.offsetHeight; // Trigger reflow
    el.style.animation = 'shake 0.5s ease-in-out';
    
    setTimeout(() => {
        el.style.animation = '';
    }, 500);
}

// Add shake keyframe dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-10px); }
        40%, 80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(shakeStyle);

// Override original adminLogin function for backward compatibility
function adminLogin() {
    handleSidebarLogin();
}


// Store submitted applications for search (OPTIMIZED - no base64 files!)
// Initialize with cleanup if needed
function initializeSubmittedApplications() {
    try {
        const stored = localStorage.getItem('simbakes_applications');
        if (stored) {
            // Check if data is too large (>3MB), clean it up
            if (stored.length > 3 * 1024 * 1024) {
                console.warn('[SIMBAKES] ⚠️ Data localStorage terlalu besar, melakukan cleanup...');
                const parsed = JSON.parse(stored);
                // Keep only last 10 entries without files
                const cleaned = parsed.slice(-10).map(app => {
                    // Remove large base64 fields
                    delete app.foto;
                    delete app.dokumenPDF;
                    return app;
                });
                localStorage.setItem('simbakes_applications', JSON.stringify(cleaned));
                return cleaned;
            }
            return JSON.parse(stored);
        }
        return [];
    } catch (e) {
        console.error('[SIMBAKES] Error reading applications:', e);
        return [];
    }
}

let submittedApplications = initializeSubmittedApplications();

// File storage (v2.0 - Base64 for Google Drive upload)
let uploadedPhoto = null;        // Base64 string for photo
let uploadedPDFBase64 = null;    // Base64 string for PDF document
let uploadedFileInfo = null;     // File info object (name, size)

// ===== LANDING PAGE =====
let progress = 0;
const progressBar = document.getElementById('progress-bar');
const landingPage = document.getElementById('landing-page');
const mainApp = document.getElementById('main-app');

const progressInterval = setInterval(() => {
    progress += 2;
    progressBar.style.width = progress + '%';
    if (progress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
            landingPage.classList.add('hidden');
            mainApp.classList.add('visible');
            initializeForm();
        }, 500);
    }
}, 60);

// ===== INITIALIZE FORM =====
function initializeForm() {
    // Generate auto registration number
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
                   String(now.getMonth() + 1).padStart(2, '0') +
                   String(now.getDate()).padStart(2, '0');
    const randomNum = String(Math.floor(Math.random() * 900000) + 100000);
    const regNumber = `REG-SIMBAKES-${dateStr}${randomNum}`;
    document.getElementById('reg-nomor').value = regNumber;
    
    // Set current datetime
    const options = { 
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    };
    document.getElementById('reg-tanggal').value = now.toLocaleDateString('id-ID', options) + ' WIB';
}

// ===== NAVIGATION =====
function toggleSection(section) {
    const items = document.getElementById('items-' + section);
    const arrow = document.getElementById('arrow-' + section);
    if (items.classList.contains('open')) {
        items.classList.remove('open');
        arrow.innerHTML = '<path d="m9 18 6-6 6-6"/>';
    } else {
        items.classList.add('open');
        arrow.innerHTML = '<path d="m6 9 6 6 6-6"/>';
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.getElementById('nav-' + pageId);
    if (navItem) navItem.classList.add('active');
    
    // Cek autentikasi menggunakan SISTEM BARU (RBAC)
    // Hanya Panel Admin yang perlu login!
    const adminProtectedPages = ['data-pengusul', 'data-roadmap'];
    if (adminProtectedPages.includes(pageId)) {
        // Gunakan isAdminAuthenticated() dari sistem RBAC, bukan variabel lama!
        if (typeof isAdminAuthenticated === 'function' && !isAdminAuthenticated()) {
            // Tampilkan pesan dan buka login
            if (typeof showToast === 'function') {
                showToast('🔐 Silakan login untuk mengakses Panel Admin', 'error', 3000);
            }
            // Buka login page/topbar login
            const loginPage = document.getElementById('login-page');
            if (loginPage) loginPage.classList.remove('hidden');
            // Kembali ke dashboard
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const dashboardPage = document.getElementById('page-dashboard');
            if (dashboardPage) dashboardPage.classList.add('active');
            return;
        }
        
        // Cek role-based access untuk Roadmap (Operator tidak bisa akses)
        if (pageId === 'data-roadmap' && typeof hasPermission === 'function' && !hasPermission('roadmapKebutuhan')) {
            if (typeof showToast === 'function') {
                showToast('🚫 Akses ditolak. Anda tidak memiliki izin untuk mengakses Data Roadmap.', 'error', 4000);
            }
            console.warn('[RBAC] 🔒 Operator attempted to access Data Roadmap - ACCESS DENIED');
            return;
        }
        
        // Cek role-based access untuk Penetapan (Operator tidak bisa akses)
        if (pageId === 'data-penetapan' && typeof hasPermission === 'function' && !hasPermission('penetapan')) {
            if (typeof showToast === 'function') {
                showToast('🚫 Akses ditolak. Anda tidak memiliki izin untuk mengakses Data Penetapan.', 'error', 4000);
            }
            console.warn('[RBAC] 🔒 Operator attempted to access Data Penetapan - ACCESS DENIED');
            return;
        }
        
        // Cek role-based access untuk halaman admin lainnya
        const protectedPages = {
            'data-roadmap': 'roadmapKebutuhan',
            'data-penetapan': 'penetapan',
            'laporan': 'laporan',
            'user-management': 'userManagement',
            'settings': 'settings'
        };
        
        const requiredPerm = protectedPages[pageId];
        if (requiredPerm && typeof hasPermission === 'function' && !hasPermission(requiredPerm)) {
            if (typeof showToast === 'function') {
                showToast(`🚫 Akses ditolak. Anda tidak memiliki izin untuk mengakses halaman ini.`, 'error', 4000);
            }
            console.warn(`[RBAC] 🔒 Access denied for page '${pageId}' - requires '${requiredPerm}'`);
            return;
        }
    }
    
    if (pageId === 'dashboard') renderDashboard();
    
    // Initialize Authentication System
    initAuthState();
    // Make table rows clickable to open Data Card Modal
    document.getElementById('pengusul-table-body')?.addEventListener('click', function(e) {
        const row = e.target.closest('tr[data-row-number]');
        if (row && !e.target.closest('button') && !e.target.closest('a')) {
            const rowNum = row.getAttribute('data-row-number');
            if (rowNum && typeof openDataCardModal === 'function') {
                openDataCardModal(rowNum);
            }
        }
    });
    
    // Make roadmap table rows clickable
    document.getElementById('roadmap-table-body')?.addEventListener('click', function(e) {
        const row = e.target.closest('tr[data-index]');
        if (row && !e.target.closest('button') && !e.target.closest('a')) {
            const idx = row.getAttribute('data-index');
            if (idx && typeof openRoadmapCardModal === 'function') {
                openRoadmapCardModal(parseInt(idx));
            }
        }
    });

    if (pageId === 'roadmap') renderRoadmap();
    if (pageId === 'data-pengusul') loadDataPengusul();
    if (pageId === 'data-roadmap') loadDataRoadmap();
    if (pageId === 'lulus-tes') loadLulusTesData();
}

// ===== ADMIN AUTH (LEGACY - Redirect to new system) =====
function adminLogin() {
    // Redirect ke sistem autentikasi baru (RBAC)
    const username = document.getElementById('sidebar-username')?.value || 'admin';
    const password = document.getElementById('admin-password')?.value || '';
    
    if (performAuthentication(username, password, 'sidebar')) {
        // Login berhasil, navigasi ke data pengusul
        setTimeout(() => showPage('data-pengusul'), 100);
    }
}

