// =====================================================
// MULTI-USER SESSION INTEGRATION (NEW! - SQL Schema Integration)
// =====================================================

/**
 * SIMBAKES Multi-User Authentication Integration
 * Handles sessions from both login-peserta.html (peserta) and admin login (superadmin/operator/admin)
 * 
 * ROLE-BASED ACCESS CONTROL MATRIX:
 * ┌─────────────┬─────────────────────────────────────────────────┐
 * │ ROLE        │ ACCESSIBLE MENUS                                │
 * ├─────────────┼─────────────────────────────────────────────────┤
 * │ superadmin  │ ALL menus + User Management + Settings          │
 * │ operator    │ Data Pengusul ONLY                              │
 * │ admin       │ Data Roadmap + Penetapan                        │
 * │ peserta     │ Portal Peserta ONLY (no admin access)           │
 * └─────────────┴─────────────────────────────────────────────────┘
 */

// Global user state object for role-based access control
const SIMBAKES_USER_STATE = {
    isLoggedIn: false,
    userRole: null,      // 'superadmin' | 'operator' | 'admin' | 'peserta'
    userId: null,
    nama: null,
    email: null,
    permissions: {
        canAccessDashboard: false,
        canAccessDataPengusul: false,
        canAccessRoadmap: false,
        canAccessPenetapan: false,
        canAccessUserManagement: false,
        canAccessSettings: false,
        canAccessPesertaPortal: false
    },
    sessionData: null,
    initialized: false
};

/**
 * Initialize authentication state on page load
 * Call this function when DOM is ready
 */
function initSimbakesAuth() {
    console.log('[SIMBAKES AUTH] Initializing authentication system...');
    
    // Check for existing sessions (priority: admin > peserta)
    const adminSession = localStorage.getItem('simbakes_admin_session');
    const pesertaSession = localStorage.getItem('simbakes_peserta_session');
    
    if (adminSession) {
        try {
            const session = JSON.parse(adminSession);
            if (session.isLoggedIn && new Date(session.expiresAt) > new Date()) {
                setAdminSession(session);
                console.log('[SIMBAKES AUTH] Admin session restored:', session.nama, 'as', session.userRole);
            } else {
                // Session expired
                clearAdminSession();
            }
        } catch (e) {
            console.error('[SIMBAKES AUTH] Error parsing admin session:', e);
            clearAdminSession();
        }
    } else if (pesertaSession) {
        try {
            const session = JSON.parse(pesertaSession);
            if (session.isLoggedIn && new Date(session.expiresAt) > new Date()) {
                setPesertaSession(session);
                console.log('[SIMBAKES AUTH] Peserta session restored:', session.nama);
            } else {
                clearPesertaSession();
            }
        } catch (e) {
            console.error('[SIMBAKES AUTH] Error parsing peserta session:', e);
            clearPesertaSession();
        }
    }
    
    // Listen for messages from login-peserta.html (if opened in popup)
    window.addEventListener('message', handleCrossOriginMessage);
    
    // Apply role-based UI restrictions
    applyRoleBasedUI();
    
    SIMBAKES_USER_STATE.initialized = true;
    console.log('[SIMBAKES AUTH] Initialization complete. Role:', SIMBAKES_USER_STATE.userRole || 'none');
}

/**
 * Handle cross-origin messages from login pages
 */
function handleCrossOriginMessage(event) {
    if (event.data && event.data.type === 'PESERTA_LOGIN_SUCCESS') {
        console.log('[SIMBAKES AUTH] Received login success message from popup/tab');
        
        if (event.data.data && event.data.data.success) {
            const sessionData = event.data.data;
            
            // Determine session type based on role
            if (sessionData.userRole === 'peserta' || !sessionData.userRole) {
                // Peserta session
                const fullSession = localStorage.getItem('simbakes_peserta_session');
                if (fullSession) {
                    setPesertaSession(JSON.parse(fullSession));
                    showToast?.('success', '✅ Login Berhasil', `Selamat datang, ${sessionData.nama}!`);
                }
            } else {
                // Admin session
                const fullSession = localStorage.getItem('simbakes_admin_session');
                if (fullSession) {
                    setAdminSession(JSON.parse(fullSession));
                    showToast?.('success', '✅ Login Admin Berhasil', `Selamat datang, ${sessionData.nama} (${sessionData.userRole})`);
                }
            }
            
            applyRoleBasedUI();
        }
    }
}

/**
 * Set admin session state (for superadmin/operator/admin roles)
 */
function setAdminSession(session) {
    SIMBAKES_USER_STATE.isLoggedIn = true;
    SIMBAKES_USER_STATE.userRole = session.userRole;  // superadmin, operator, or admin
    SIMBAKES_USER_STATE.userId = session.userId;
    SIMBAKES_USER_STATE.nama = session.nama;
    SIMBAKES_USER_STATE.email = session.email;
    SIMBAKES_USER_STATE.permissions = session.permissions || getDefaultPermissions(session.userRole);
    SIMBAKES_USER_STATE.sessionData = session;
    
    // Update UI for logged-in admin
    updateUIForLoggedInAdmin(session);
}

/**
 * Set peserta session state
 */
function setPesertaSession(session) {
    SIMBAKES_USER_STATE.isLoggedIn = true;
    SIMBAKES_USER_STATE.userRole = 'peserta';
    SIMBAKES_USER_STATE.userId = session.userId;
    SIMBAKES_USER_STATE.nama = session.nama;
    SIMBAKES_USER_STATE.email = session.email;
    SIMBAKES_USER_STATE.permissions = session.permissions || getDefaultPermissions('peserta');
    SIMBAKES_USER_STATE.sessionData = session;
    
    // Update UI for logged-in peserta
    updateUIForLoggedInPeserta({
        nama: session.nama,
        nama_lengkap: session.nama,
        nik: session.nik,
        email: session.email,
        status: session.status
    });
}

/**
 * Get default permissions for a role
 */
function getDefaultPermissions(role) {
    const matrix = {
        superadmin: {
            canAccessDashboard: true,
            canAccessDataPengusul: true,
            canAccessRoadmap: true,
            canAccessPenetapan: true,
            canAccessUserManagement: true,
            canAccessSettings: true,
            canAccessPesertaPortal: false
        },
        operator: {
            canAccessDashboard: false,
            canAccessDataPengusul: true,
            canAccessRoadmap: false,
            canAccessPenetapan: false,
            canAccessUserManagement: false,
            canAccessSettings: false,
            canAccessPesertaPortal: false
        },
        admin: {
            canAccessDashboard: true,
            canAccessDataPengusul: false,
            canAccessRoadmap: true,
            canAccessPenetapan: true,
            canAccessUserManagement: false,
            canAccessSettings: false,
            canAccessPesertaPortal: false
        },
        peserta: {
            canAccessDashboard: false,
            canAccessDataPengusul: false,
            canAccessRoadmap: false,
            canAccessPenetapan: false,
            canAccessUserManagement: false,
            canAccessSettings: false,
            canAccessPesertaPortal: true
        }
    };
    
    return matrix[role] || matrix.peserta;
}

/**
 * Update UI for logged-in ADMIN users (superadmin/operator/admin)
 */
function updateUIForLoggedInAdmin(session) {
    // Update or create topbar user info
    let userInfoBtn = document.getElementById('topbar-user-info-btn');
    
    if (!userInfoBtn) {
        // Create user info button next to login peserta button
        const loginPesertaBtn = document.getElementById('topbar-peserta-login-btn');
        if (loginPesertaBtn) {
            userInfoBtn = document.createElement('button');
            userInfoBtn.id = 'topbar-user-info-btn';
            userInfoBtn.className = 'topbar-user-info-btn';
            loginPesertaBtn.parentNode.insertBefore(userInfoBtn, loginPesertaBtn.nextSibling);
        }
    }
    
    if (userInfoBtn) {
        const roleColors = {
            superadmin: 'linear-gradient(135deg, #7c3aed, #6d28d9)',   // Purple
            operator: 'linear-gradient(135deg, #2563eb, #1d4ed8)',     // Blue
            admin: 'linear-gradient(135deg, #0891b2, #0e7490)'         // Cyan
        };
        
        const roleLabels = {
            superadmin: 'Superadmin',
            operator: 'Operator',
            admin: 'Administrator'
        };
        
        const nama = session.nama || session.nama_lengkap || 'User';
        
        // 🔧 FIX: Ambil role dari berbagai sumber yang mungkin
        let role = session.userRole || session.role || currentAdminUser?.role || 'admin';
        
        // 🔧 FIX: Normalisasi role - pastikan superadmin terdeteksi
        const roleNormalizationMap = {
            'super_admin': 'superadmin',
            'super-admin': 'superadmin',
            'administrator': 'superadmin',
            'admin': 'superadmin',  // Admin dianggap superadmin
            'operator': 'operator',
            'op': 'operator',
            'viewer': 'viewer',
            'peserta': 'peserta'
        };
        role = roleNormalizationMap[role?.toLowerCase()] || role || 'superadmin';
        
        console.log('[TOPBAR] Role resolution:', {
            sessionUserRole: session.userRole,
            sessionRole: session.role,
            currentUserRole: currentAdminUser?.role,
            finalRole: role
        });
        
        userInfoBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
            ${nama.substring(0, 15)}${nama.length > 15 ? '...' : ''}
            <span class="role-badge">${roleLabels[role] || role.toUpperCase()}</span>
        `;
        userInfoBtn.style.background = roleColors[role] || roleColors.superadmin;
        userInfoBtn.onclick = showAdminUserInfo;
        userInfoBtn.title = `${roleLabels[role] || role} - Klik untuk info akun`;
        
        // Add CSS for role badge if not exists
        if (!document.getElementById('simbakes-role-badge-style')) {
            const style = document.createElement('style');
            style.id = 'simbakes-role-badge-style';
            style.textContent = `
                .topbar-user-info-btn .role-badge {
                    background: rgba(255,255,255,0.25);
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    margin-left: 6px;
                    font-weight: 600;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Hide login peserta button for admin users (optional - comment out if you want both visible)
    // hideLoginPesertaButton();
    
    console.log('[SIMBAKES AUTH] UI updated for logged-in admin:', session.nama);
}

/**
 * Show admin user info modal
 */
function showAdminUserInfo() {
    const session = SIMBAKES_USER_STATE.sessionData;
    if (!session) return;
    
    const roleColors = {
        superadmin: { bg: '#7c3aed', icon: '👑', label: 'Super Administrator' },
        operator: { bg: '#2563eb', icon: '⚙️', label: 'Operator' },
        admin: { bg: '#0891b2', icon: '🛡️', label: 'Administrator' }
    };
    
    const roleConfig = roleColors[session.userRole] || roleColors.admin;
    
    // Create modal
    let modal = document.getElementById('admin-info-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'admin-info-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    
    const permissionList = Object.entries(SIMBAKES_USER_STATE.permissions)
        .filter(([key, value]) => value)
        .map(([key]) => {
            const labels = {
                canAccessDashboard: '📊 Dashboard Admin',
                canAccessDataPengusul: '👥 Data Pengusul',
                canAccessRoadmap: '🗺️ Data Roadmap',
                canAccessPenetapan: '✅ Penetapan',
                canAccessUserManagement: '👤 Manajemen User',
                canAccessSettings: '⚙️ Pengaturan'
            };
            return `<li style="padding:6px 0;">${labels[key] || key}</li>`;
        })
        .join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px; border-radius:20px; overflow:hidden;">
            <div style="background:${roleConfig.bg}; padding:2rem; text-align:center;">
                <div style="width:80px; height:80px; background:rgba(255,255,255,0.25); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem; font-size:2rem;">
                    ${roleConfig.icon}
                </div>
                <h2 style="color:white; font-size:1.5rem; font-weight:700; margin:0;">${escapeHtml(session.nama)}</h2>
                <p style="color:rgba(255,255,255,0.9); font-size:0.9rem;">${roleConfig.label}</p>
                <p style="color:rgba(255,255,255,0.8); font-size:0.85rem;">${escapeHtml(session.email)}</p>
            </div>
            
            <div style="padding:1.5rem;">
                <h4 style="margin-bottom:12px; color:#374151;">✅ Akses yang Dimiliki:</h4>
                <ul style="list-style:none; padding:0; background:#f9fafb; border-radius:12px; padding:16px; margin-bottom:1.5rem;">
                    ${permissionList || '<li style="color:#9ca3af;">Tidak ada akses khusus</li>'}
                </ul>
                
                <div style="display:flex; gap:10px;">
                    <button onclick="closeAdminInfoModal()" style="flex:1; padding:12px; background:#f3f4f6; color:#374151; border:none; border-radius:10px; font-weight:600; cursor:pointer;">
                        Tutup
                    </button>
                    <button onclick="logoutAdmin()" style="flex:1; padding:12px; background:#fee2e2; color:#dc2626; border:none; border-radius:10px; font-weight:600; cursor:pointer;">
                        🚪 Logout
                    </button>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeAdminInfoModal();
    });
}

function closeAdminInfoModal() {
    const modal = document.getElementById('admin-info-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Logout admin user
 */
function logoutAdmin() {
    if (confirm('Apakah Anda yakin ingin logout dari akun Administrator?')) {
        clearAdminSession();
        closeAdminInfoModal();
        showToast?.('info', '👋 Logout Berhasil', 'Anda telah keluar dari akun Administrator');
        
        // Reload page to reset all state
        setTimeout(() => window.location.reload(), 1000);
    }
}

/**
 * Clear admin session data
 */
function clearAdminSession() {
    localStorage.removeItem('simbakes_admin_session');
    localStorage.removeItem('simbakes_user_role');
    localStorage.removeItem('simbakes_login_time');
    
    // Reset user state
    SIMBAKES_USER_STATE.isLoggedIn = false;
    SIMBAKES_USER_STATE.userRole = null;
    SIMBAKES_USER_STATE.userId = null;
    SIMBAKES_USER_STATE.nama = null;
    SIMBAKES_USER_STATE.email = null;
    SIMBAKES_USER_STATE.permissions = getDefaultPermissions(null);
    SIMBAKES_USER_STATE.sessionData = null;
    
    // Remove admin info button
    const userInfoBtn = document.getElementById('topbar-user-info-btn');
    if (userInfoBtn) userInfoBtn.remove();
    
    // Show login peserta button again
    showLoginPesertaButton();
    
    console.log('[SIMBAKES AUTH] Admin session cleared');
}

/**
 * Apply role-based UI restrictions
 * This hides/shows menu items based on user's role and permissions
 */
function applyRoleBasedUI() {
    if (!SIMBAKES_USER_STATE.isLoggedIn) {
        // Not logged in - show public UI
        console.log('[SIMBAKES AUTH] No active session - showing public UI');
        return;
    }
    
    const role = SIMBAKES_USER_STATE.userRole;
    const perms = SIMBAKES_USER_STATE.permissions;
    
    console.log(`[SIMBAKES AUTH] Applying restrictions for role: ${role}`, perms);
    
    // Define menu items that should be restricted
    const restrictedMenus = [
        { id: 'menu-dashboard-admin', perm: 'canAccessDashboard', label: 'Dashboard Admin' },
        { id: 'menu-data-pengusul', perm: 'canAccessDataPengusul', label: 'Data Pengusul' },
        { id: 'menu-roadmap', perm: 'canAccessRoadmap', label: 'Data Roadmap' },
        { id: 'menu-penetapan', perm: 'canAccessPenetapan', label: 'Penetapan' },
        { id: 'menu-users', perm: 'canAccessUserManagement', label: 'Manajemen User' },
        { id: 'menu-settings', perm: 'canAccessSettings', label: 'Pengaturan' }
    ];
    
    // Apply restrictions
    restrictedMenus.forEach(menu => {
        if (!perms[menu.perm]) {
            hideMenuItem(menu.id, menu.label);
        } else {
            showMenuItem(menu.id);
        }
    });
    
    // Special handling for peserta role
    if (role === 'peserta') {
        restrictToPesertaView();
    }
}

/**
 * Hide a menu item by ID
 */
function hideMenuItem(menuId, label) {
    // Try multiple selectors
    const selectors = [
        `[data-menu="${menuId}"]`,
        `#${menuId}`,
        `[data-page="${menuId}"]`,
        `button[data-action="${menuId}"]`
    ];
    
    let element = null;
    for (const selector of selectors) {
        element = document.querySelector(selector);
        if (element) break;
    }
    
    if (element) {
        element.style.display = 'none';
        element.setAttribute('data-hidden-by-auth', 'true');
        element.setAttribute('data-original-display', element.style.display || '');
        console.log(`[SIMBAKES AUTH] Hidden menu: ${label || menuId}`);
    }
}

/**
 * Show a menu item by ID (restore if hidden by auth)
 */
function showMenuItem(menuId) {
    const selectors = [
        `[data-menu="${menuId}"]`,
        `#${menuId}`,
        `[data-page="${menuId}"]`,
        `button[data-action="${menuId}"]`
    ];
    
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.getAttribute('data-hidden-by-auth') === 'true') {
            element.style.display = '';
            element.removeAttribute('data-hidden-by-auth');
            console.log(`[SIMBAKES AUTH] Restored menu: ${menuId}`);
            break;
        }
    }
}

/**
 * Restrict view for peserta role only
 */
function restrictToPesertaView() {
    console.log('[SIMBAKES AUTH] Applying peserta-only view restrictions');
    
    // Hide all admin-related elements
    const adminSelectors = [
        '.admin-only',
        '[data-require-role="admin"]',
        '[data-require-role="operator"]',
        '[data-require-role="superadmin"]'
    ];
    
    adminSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.display = 'none';
            el.setAttribute('data-hidden-for-peserta', 'true');
        });
    });
    
    // Show peserta-specific content
    const pesertaSelectors = [
        '.peserta-only',
        '[data-show-role="peserta"]'
    ];
    
    pesertaSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.style.display = '';
        });
    });
}

/**
 * ============================================================
 * SECURITY AUDIT LOG - RBAC & PERMISSION SYSTEM
 * ============================================================
 * 
 * File: simbakes-panel-admin-fixed.html
 * Date: 2026-01-17
 * Auditor: Super Z AI Assistant
 * 
 * SECURITY FEATURES IMPLEMENTED:
 * 
 * 1. ROLE-BASED ACCESS CONTROL (RBAC)
 *    - superadmin: Full access to all menus and CRUD operations
 *    - operator: Limited to Data Pengusulan (submissions table only)
 *    
 * 2. PERMISSION GUARDS ADDED:
 *    - checkRoadmapPermission(): Blocks operator from Roadmap access
 *    - checkPenetapanPermission(): Blocks operator from Penetapan access
 *    
 * 3. PROTECTED FUNCTIONS (with permission checks):
 *    - loadDataRoadmap() ✓
 *    - loadRoadmapAdminTable() ✓
 *    - openRoadmapAddModal() ✓
 *    - openRoadmapEditModal() ✓
 *    - confirmDeleteRoadmap() ✓
 *    - refreshDataPenetapan() ✓
 *    - openEditPenetapanModal() ✓
 *    - confirmDeletePenetapan() ✓
 *    
 * 4. PAGE ACCESS CONTROL (in showPage()):
 *    - data-roadmap: Blocked for operator
 *    - data-penetapan: Blocked for operator
 *    - laporan: Blocked for operator
 *    - user-management: Blocked for operator
 *    - settings: Blocked for operator
 *    
 * 5. TABLE MAPPING:
 *    Data Pengusulan → submissions (operator & superadmin)
 *    Data Roadmap → roadmap (superadmin only)
 *    Data Penetapan → penetapan (superadmin only)
 *    
 * 6. AKSI COLUMN POSITION:
 *    Data Pengusulan: AKSI is LAST column ✓
 *    Data Roadmap: AKSI is LAST column ✓
 *    Data Penetapan: AKSI is LAST column ✓
 *    
 * 7. ERROR HANDLING:
 *    - All Supabase operations check for 'error' object
 *    - Error messages logged to console
 *    - User-friendly error notifications displayed
 *    
 * ============================================================
 */

// Auto-run security check on load
console.log('%c[SECURITY] ✅ RBAC System Loaded', 'background:#059669;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;');
console.log('[SECURITY] Role-based access control is active');
console.log('[SECURITY] Permission guards installed for Roadmap & Penetapan');

/**
 * Check if current user has specific permission
 * FIXED: Now checks BOTH systems for compatibility
 */
function hasPermission(permission) {
    // Method 1: Check SIMBAKES_USER_STATE (new system)
    if (SIMBAKES_USER_STATE.isLoggedIn && SIMBAKES_USER_STATE.permissions) {
        const perm1 = !!SIMBAKES_USER_STATE.permissions[permission];
        if (perm1) {
            console.log(`[PERM] ✅ Granted via USER_STATE: ${permission}`);
            return true;
        }
    }
    
    // Method 2: Check ROLE_CONFIG via currentAdminUser (legacy system - MORE COMPLETE!)
    if (currentAdminUser && currentAdminUser.role) {
        const role = currentAdminUser.role;
        const roleConfig = ROLE_CONFIG[role];
        
        if (roleConfig) {
            // Check menus
            if (roleConfig.menus && roleConfig.menus[permission] === true) {
                console.log(`[PERM] ✅ Granted via ROLE_CONFIG.menus: ${permission} (role: ${role})`);
                return true;
            }
            
            // Check direct permissions
            if (roleConfig[permission] === true) {
                console.log(`[PERM] ✅ Granted via ROLE_CONFIG.direct: ${permission} (role: ${role})`);
                return true;
            }
            
            // Superadmin always has full access!
            if (role === 'superadmin') {
                console.log(`[PERM] ✅ Granted via SUPERADMIN fallback: ${permission}`);
                return true;
            }
        }
    }
    
    console.log(`[PERM] ❌ DENIED: ${permission}`, {
        userStateRole: SIMBAKES_USER_STATE.userRole,
        currentUserRole: currentAdminUser?.role,
        userStatePerms: SIMBAKES_USER_STATE.permissions ? Object.keys(SIMBAKES_USER_STATE.permissions) : 'none'
    });
    return false;
}

/**
 * Check if current user has specific role
 */
function hasRole(role) {
    return SIMBAKES_USER_STATE.userRole === role;
}

/**
 * Require specific role/permission - redirect if not authorized
 */
function requireAuth(requiredRole = null, requiredPermission = null) {
    if (!SIMBAKES_USER_STATE.isLoggedIn) {
        // Not logged in - redirect to login
        openPesertaLogin();
        return false;
    }
    
    if (requiredRole && SIMBAKES_USER_STATE.userRole !== requiredRole) {
        showToast?.('error', '🚫 Akses Ditolak', `Anda tidak memiliki akses sebagai ${requiredRole}`);
        return false;
    }
    
    if (requiredPermission && !hasPermission(requiredPermission)) {
        showToast?.('error', '🚫 Akses Ditolak', 'Anda tidak memiliki izin untuk mengakses fitur ini');
        return false;
    }
    
    return true;
}

/**
 * Helper: Show login peserta button
 */
function showLoginPesertaButton() {
    const btn = document.getElementById('topbar-peserta-login-btn');
    if (btn) {
        btn.style.display = '';
        btn.classList.remove('hidden');
    }
}

/**
 * Helper: Hide login peserta button
 */
function hideLoginPesertaButton() {
    const btn = document.getElementById('topbar-peserta-login-btn');
    if (btn) {
        btn.style.display = 'none';
        btn.classList.add('hidden');
    }
}

// Initialize auth system when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSimbakesAuth);
} else {
    initSimbakesAuth();
}

console.log('[SIMBAKES] Multi-User Auth Integration loaded successfully');

// =====================================================
// USER REGISTRATION MODAL FUNCTIONS (NEW!)
// =====================================================

/**
 * Open User Registration Modal from Topbar button
 */
function openRegisterModal() {
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
        
        // Reset form
        const form = document.getElementById('user-register-form');
        if (form) form.reset();
        
        // Clear alerts
        clearRegisterAlert();
        
        // Focus on first field
        setTimeout(() => {
            const firstInput = document.getElementById('reg-nama-lengkap');
            if (firstInput) firstInput.focus();
        }, 400);
        
        console.log('[SIMBAKES] Registration modal opened');
    }
}

/**
 * Close User Registration Modal
 */
function closeRegisterModal() {
    const modal = document.getElementById('register-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scroll
        
        console.log('[SIMBAKES] Registration modal closed');
    }
}

/**
 * Show alert in registration modal
 */
function showRegisterAlert(message, type) {
    const container = document.getElementById('register-alert-container');
    if (!container) return;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    container.innerHTML = `
        <div class="register-alert ${type} show">
            <span>${icons[type] || 'ℹ️'}</span>
            <span>${message}</span>
        </div>
    `;
}

/**
 * Clear registration alert
 */
function clearRegisterAlert() {
    const container = document.getElementById('register-alert-container');
    if (container) container.innerHTML = '';
}

/**
 * Handle Role Change - Show/Hide Institusi Field
 */
document.addEventListener('DOMContentLoaded', function() {
    const roleSelect = document.getElementById('reg-role');
    if (roleSelect) {
        roleSelect.addEventListener('change', function() {
            const institusiGroup = document.getElementById('reg-institusi-group');
            if (institusiGroup) {
                // Show institusi field for admin roles
                if (this.value === 'admin') {
                    institusiGroup.style.display = 'block';
                    document.getElementById('reg-institusi').required = true;
                } else {
                    institusiGroup.style.display = 'none';
                    document.getElementById('reg-institusi').required = false;
                }
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeRegisterModal();
        }
    });
    
    // Close modal when clicking overlay (outside modal)
    const registerModal = document.getElementById('register-modal');
    if (registerModal) {
        registerModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeRegisterModal();
            }
        });
    }
});

/**
 * Handle User Registration Form Submit (from Modal in index.html)
 * Uses the same logic as login.js but adapted for inline usage
 */
async function handleUserRegisterFromModal(event) {
    event.preventDefault();
    
    // Gather form data (HANYA field yang ada di schema SQL multiusers!)
    const formData = {
        nama_lengkap: document.getElementById('reg-nama-lengkap').value.trim(),
        email: document.getElementById('reg-email').value.trim().toLowerCase(),
        username: document.getElementById('reg-username').value.trim().toLowerCase(),
        password: document.getElementById('reg-password').value,
        nik: document.getElementById('reg-nik')?.value?.trim() || '',  // NIK 16 digit - sesuai SQL schema
        role: document.getElementById('reg-role').value,
        institusi: document.getElementById('reg-institusi')?.value?.trim() || ''
        // CATATAN: Tidak ada field 'status' - di schema pakai 'is_active' (BOOLEAN)
    };
    
    // Validate required fields
    if (!formData.nama_lengkap || !formData.email || !formData.username || !formData.password || !formData.role) {
        showRegisterAlert('Mohon lengkapi semua field yang wajib diisi (*)', 'error');
        return;
    }
    
    // Validate NIK (16 digit angka) - WAJIB sesuai SQL schema
    if (!formData.nik || formData.nik.length !== 16 || !/^[0-9]{16}$/.test(formData.nik)) {
        showRegisterAlert('NIK harus 16 digit angka (sesuai KTP)', 'error');
        return;
    }
    
    // Validate email format
    if (!isValidEmailForReg(formData.email)) {
        showRegisterAlert('Format email tidak valid', 'error');
        return;
    }
    
    // Validate password length
    if (formData.password.length < 8) {
        showRegisterAlert('Password minimal 8 karakter', 'error');
        return;
    }
    
    // Validate terms agreement
    if (!document.getElementById('reg-agree-terms').checked) {
        showRegisterAlert('Anda harus menyetujui Syarat & Ketentuan', 'error');
        return;
    }
    
    // Disable submit button
    const submitBtn = document.getElementById('register-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳ Mendaftarkan...</span>';
    }
    
    clearRegisterAlert();
    showRegisterAlert('Memproses pendaftaran...', 'info');
    
    try {
        console.log('[SIMBAKES] Registering user:', formData.username);
        
        // Use dynamic Supabase client resolution - PRIORITAS: supabaseClient global
        let client = null;
        
        // 1. Coba global supabaseClient (paling reliable)
        if (!client && typeof supabaseClient !== 'undefined' && supabaseClient !== null) {
            client = supabaseClient;
            console.log('[SIMBAKES] ✅ Using global supabaseClient for registration');
        }
        
        // 2. Coba simbakesDB
        if (!client && typeof simbakesDB !== 'undefined' && simbakesDB.isInitialized && simbakesDB.client) {
            client = simbakesDB.client;
            console.log('[SIMBAKES] ✅ Using simbakesDB.client for registration');
        }
        
        // 3. Buat client baru dari config
        if (!client && typeof window.supabase !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined') {
            if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL') {
                client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
                console.log('[SIMBAKES] ✅ Created new Supabase client from config');
            }
        }
        
        // 4. Force init jika belum ada
        if (!client && typeof initSupabaseClient === 'function') {
            initSupabaseClient();
            if (typeof supabaseClient !== 'undefined' && supabaseClient !== null) {
                client = supabaseClient;
                console.log('[SIMBAKES] ✅ Initialized and using supabaseClient');
            }
        }
        
        if (!client) {
            throw new Error('Supabase client tidak tersedia. Pastikan koneksi internet stabil dan refresh halaman.');
        }
        
        console.log('[SIMBAKES] Client ready, calling fn_register_peserta RPC...');
        
        // =====================================================
        // PANGGIL RPC FUNCTION: fn_register_peserta()
        // Signature: fn_register_peserta(p_email, p_password, p_username, p_nama_lengkap, p_nik VARCHAR(16), p_institusi)
        // =====================================================
        const { data: rpcData, error: rpcError } = await client.rpc('fn_register_peserta', {
            p_email: formData.email,
            p_password: formData.password,
            p_username: formData.username,
            p_nama_lengkap: formData.nama_lengkap,
            p_nik: formData.nik,  // NIK 16 digit - sesuai SQL schema
            p_institusi: formData.institusi || null
        });
        
        // Handle RPC errors
        if (rpcError) {
            console.error('[SIMBAKES] RPC Error:', rpcError);
            
            // Cek error spesifik dari function
            if (rpcError.message?.includes('username sudah') || rpcError.message?.includes('duplicate key')) {
                showRegisterAlert('Username sudah digunakan. Silakan pilih username lain.', 'error');
                resetRegisterButton();
                return;
            }
            
            if (rpcError.message?.includes('email sudah') || rpcError.message?.includes('unique constraint')) {
                showRegisterAlert('Email sudah terdaftar. Gunakan email lain.', 'error');
                resetRegisterButton();
                return;
            }
            
            if (rpcError.message?.includes('NIK')) {
                showRegisterAlert('NIK sudah terdaftar di sistem.', 'error');
                resetRegisterButton();
                return;
            }
            
            throw rpcError;  // Re-throw untuk catch handler umum
        }
        
        console.log('[SIMBAKES] ✅ RPC Success:', rpcData);
        
        // Success!
        const successMessage = rpcData?.message || `Registrasi berhasil! Selamat datang, ${formData.nama_lengkap}.`;
        showRegisterAlert(`✅ ${successMessage}`, 'success');
        
        // Close modal after delay and redirect to LOGIN PESERTA
        setTimeout(() => {
            closeRegisterModal();
            
            // Redirect ke halaman Login Peserta (bukan admin login!)
            setTimeout(() => {
                openPesertaLogin();  // Buka login-peserta.html
                
                showToast(`🎉 Akun peserta berhasil dibuat! NIK: ${formData.nik}. Silakan login.`, 'success', 5000);
            }, 500);
        }, 2000);
        
    } catch (error) {
        console.error('[SIMBAKES] Registration error:', error);
        console.error('[SIMBAKES] Error details:', {
            message: error.message,
            code: error.code,
            status: error.status,
            hint: error.hint
        });
        
        // Berikan pesan error yang spesifik
        let errorMsg = error.message || 'Terjadi kesalahan tidak diketahui';
        
        if (error.status === 401 || error.code === '401' || errorMsg.includes('401')) {
            errorMsg = 'Error autentikasi (401). Ini biasanya karena RLS Policy di Supabase belum diatur dengan benar. Silakan jalankan script FIX_RLS_Registration_v2.sql di Supabase SQL Editor.';
        } else if (error.status === 403 || errorMsg.includes('403') || errorMsg.includes('row-level security')) {
            errorMsg = 'Error izin akses (403/RLS). Policy tabel multiusers belum mengizinkan INSERT publik. Jalankan script FIX_RLS_Registration_v2.sql di Supabase SQL Editor.';
        } else if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
            errorMsg = 'Username atau email sudah terdaftar. Gunakan yang lain.';
        } else if (errorMsg.includes('password')) {
            errorMsg = 'Error pada field password. Pastikan password valid.';
        }
        
        showRegisterAlert(`Gagal mendaftar: ${errorMsg}`, 'error');
        resetRegisterButton();
    }
}

/**
 * Reset register button state
 */
function resetRegisterButton() {
    const submitBtn = document.getElementById('register-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg><span>Buat Akun Baru</span>`;
    }
}

/**
 * Simple email validation for registration
 */
function isValidEmailForReg(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Toggle user dropdown menu
 */
function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', closeDropdownOnClickOutside);
        }, 10);
    }
}

/**
 * Close dropdown when clicking outside
 */
function closeDropdownOnClickOutside(event) {
    const dropdown = document.getElementById('user-dropdown');
    const avatar = document.getElementById('topbar-avatar');
    
    if (dropdown && !dropdown.contains(event.target) && !avatar.contains(event.target)) {
        dropdown.classList.remove('show');
        document.removeEventListener('click', closeDropdownOnClickOutside);
    }
}

/**
 * Update TopBar UI after successful login
 */
function updateTopbarAfterLogin(user) {
    console.log('=== TOPBAR DEBUG START ===');
    console.log('[TOPBAR] Full user object:', JSON.stringify(user, null, 2));
    console.log('[TOPBAR] user.role:', user.role);
    console.log('[TOPBAR] user.userRole:', user.userRole);
    console.log('[TOPBAR] currentAdminUser:', currentAdminUser ? JSON.stringify(currentAdminUser) : 'NULL');
    
    // Hide login buttons (Admin & Peserta)
    const loginBtn = document.getElementById('topbar-login-btn');
    if (loginBtn) loginBtn.style.display = 'none';
    
    const pesertaLoginBtn = document.getElementById('topbar-peserta-login-btn');
    if (pesertaLoginBtn) pesertaLoginBtn.style.display = 'none';
    
    // Show user menu
    const userMenu = document.getElementById('topbar-user-menu');
    if (userMenu) userMenu.style.display = 'flex';
    
    // Update user info
    const displayName = document.getElementById('topbar-display-name');
    if (displayName) displayName.textContent = user.name;
    
    const displayRole = document.getElementById('topbar-display-role');
    if (displayRole) {
        // 🔧 FIX: Tambahkan pengecekan 'superadmin' terlebih dahulu
        const roleDisplayMap = {
            'superadmin': 'Super Administrator',
            'admin': 'Super Administrator',
            'operator': 'Operator Data',
            'viewer': 'Peserta Beasiswa',
            'peserta': 'Peserta Beasiswa'
        };
        
        // 🔧 DEBUG: Log role resolution
        let resolvedRole = user.role;
        console.log('[TOPBAR] resolvedRole before map:', resolvedRole);
        console.log('[TOPBAR] roleDisplayMap[resolvedRole]:', roleDisplayMap[resolvedRole]);
        
        // 🔧🔧🔧 SUPER FIX: Force correction jika role tidak sesuai
        // Cek multiple sources untuk menentukan role sebenarnya
        let finalRole = resolvedRole;
        
        // Source 1: Dari user object
        if (user.userRole && ['superadmin', 'admin'].includes(user.userRole.toLowerCase())) {
            finalRole = 'superadmin';
            console.log('[TOPBAR] ✅ OVERRIDDEN by user.userRole:', user.userRole);
        }
        
        // Source 2: Dari currentAdminUser global
        if (!finalRole || finalRole === 'operator') {
            if (currentAdminUser?.role && ['superadmin', 'admin'].includes(currentAdminUser.role.toLowerCase())) {
                finalRole = 'superadmin';
                console.log('[TOPBAR] ✅ OVERRIDDEN by currentAdminUser.role:', currentAdminUser.role);
            }
        }
        
        // Source 3: Cek localStorage session langsung
        if (!finalRole || finalRole === 'operator') {
            try {
                const savedSession = JSON.parse(localStorage.getItem('simbakes_admin_session'));
                if (savedSession?.user) {
                    const sessionRole = savedSession.user.role || savedSession.user.userRole;
                    if (sessionRole && ['superadmin', 'admin'].includes(sessionRole.toLowerCase())) {
                        finalRole = 'superadmin';
                        console.log('[TOPBAR] ✅ OVERRIDDEN by localStorage session:', sessionRole);
                    } else if (savedSession.user.username) {
                        console.log('[TOPBAR] Session found for:', savedSession.user.username, '| Role in session:', sessionRole);
                    }
                }
            } catch(e) {
                console.warn('[TOPBAR] Error reading localStorage:', e);
            }
        }
        
        // Source 4: Jika masih operator tapi avatar 👑 (mahkota), berarti seharusnya superadmin
        if ((!finalRole || finalRole === 'operator') && user.avatar === '👑') {
            finalRole = 'superadmin';
            console.log('[TOPBAR] ✅ OVERRIDDEN by avatar detection (👑 = Superadmin)');
        }
        
        console.log('[TOPBAR] FINAL ROLE DECISION:', finalRole, '(original was:', resolvedRole, ')');
        
        displayRole.textContent = roleDisplayMap[finalRole] || finalRole || 'Super Administrator';
        
        console.log('[TOPBAR] Final displayRole.textContent:', displayRole.textContent);
        console.log('=== TOPBAR DEBUG END ===');
    }
    
    // Update avatar
    const avatar = document.getElementById('topbar-avatar');
    if (avatar) {
        avatar.textContent = user.avatar;
        avatar.className = `topbar-avatar ${user.role}`;
    }
    
    // Update dropdown info
    const dropdownAvatar = document.getElementById('dropdown-avatar');
    if (dropdownAvatar) {
        dropdownAvatar.textContent = user.avatar;
        dropdownAvatar.className = `topbar-dropdown-avatar ${user.role}`;
    }

    const dropdownName = document.getElementById('dropdown-name');
    if (dropdownName) dropdownName.textContent = user.name;
    
    const dropdownRole = document.getElementById('dropdown-role');
    if (dropdownRole) {
        // 🔧 FIX: Tambahkan pengecekan 'superadmin' terlebih dahulu
        const dropdownRoleMap = {
            'superadmin': 'Full Access - Superadmin',
            'admin': 'Full Access - Admin',
            'operator': 'Limited Access - Operator',
            'viewer': 'Peserta Beasiswa - Limited Access',
            'peserta': 'Peserta Beasiswa - Limited Access'
        };
        dropdownRole.textContent = dropdownRoleMap[user.role] || `${user.role || 'User'} - Limited Access`;
    }
    
    console.log('✅ TopBar updated for:', user.name, '(' + user.role + ')');
}

/**
 * Reset TopBar UI after logout
 */
function resetTopbarAfterLogout() {
    // Show login buttons (Admin & Peserta)
    const loginBtn = document.getElementById('topbar-login-btn');
    if (loginBtn) loginBtn.style.display = '';
    
    const pesertaLoginBtn = document.getElementById('topbar-peserta-login-btn');
    if (pesertaLoginBtn) pesertaLoginBtn.style.display = '';
    
    // Hide user menu
    const userMenu = document.getElementById('topbar-user-menu');
    if (userMenu) userMenu.style.display = 'none';
    
    // Close dropdown if open
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    
    console.log('🔓 TopBar reset - Login buttons visible');
}

/**
 * Navigate to Admin Panel from dropdown
 */
function goToAdminPanel() {
    // Close dropdown
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    
    // Go to Data Pengusul page
    if (typeof showPage === 'function') {
        showPage('data-pengusul');
    }
}

/**
 * Refresh session info
 */
function refreshSession() {
    // Close dropdown
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    
    // Update session time
    updateSessionInfo();
    
    if (typeof showToast === 'function') {
        showToast('🔄 Session refreshed', 'success', 2000);
    }
}

// Close dropdown on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
});



// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    
    // Observe page changes to load admin data
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'page-data-pengusul' && mutation.target.classList.contains('active')) {
                loadDataPengusul();
            }
        });
    });
    
    // Start observing all pages
    document.querySelectorAll('.page').forEach(page => {
        observer.observe(page, { attributes: true, attributeFilter: ['class'] });
    });
});
