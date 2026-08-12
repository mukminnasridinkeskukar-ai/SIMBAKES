/**
 * SIMBAKES - Authentication Module
 * Beasiswa Tematik Bidang Kesehatan
 * 
 * Modul ini menyediakan:
 * - Login / Logout functions
 * - Session management
 * - Role-based access control (RBAC)
 * - Auth state listener
 */

// ============================================================
// AUTHENTICATION CONSTANTS
// ============================================================

const AUTH_CONFIG = {
    // Session storage keys
    STORAGE_KEYS: {
        USER: 'simbakes_user',
        TOKEN: 'simbases_auth_token'
    },
    
    // Role definitions with permissions
    ROLES: {
        super_admin: {
            label: 'Super Admin',
            level: 5,
            redirect: 'modules/multiusers.html',
            permissions: ['read', 'write', 'delete', 'manage_users', 'approve']
        },
        admin: {
            label: 'Admin',
            level: 4,
            redirect: 'modules/multiusers.html',
            permissions: ['read', 'write', 'delete', 'approve']
        },
        approver: {
            label: 'Approver',
            level: 3,
            redirect: 'modules/data_penetapan.html',
            permissions: ['read', 'approve']
        },
        operator: {
            label: 'Operator',
            level: 2,
            redirect: 'modules/data_pengusulan.html',
            permissions: ['read_own', 'write_own']
        },
        viewer: {
            label: 'Viewer',
            level: 1,
            redirect: 'modules/roadmap_kebutuhan.html',
            permissions: ['read']
        }
    },
    
    // Status definitions
    STATUS: {
        AKTIF: 'aktif',
        NON_AKTIF: 'non-aktif',
        BLOKIR: 'blokir'
    }
};


// ============================================================
// AUTHENTICATION CLASS
// ============================================================

class SimbakesAuth {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.initialized = false;
    }
    
    /**
     * Initialize auth module
     */
    async init() {
        if (this.initialized) return this;
        
        try {
            this.client = getSupabaseClient();
            
            // Check existing session
            const { data: { session }, error } = await this.client.auth.getSession();
            
            if (session) {
                await this.loadUserData(session.user);
            }
            
            // Setup auth state change listener
            this.setupAuthListener();
            
            this.initialized = true;
            console.log('✅ Auth module initialized');
            
            return this;
        } catch (error) {
            console.error('❌ Auth init error:', error);
            throw error;
        }
    }
    
    /**
     * Setup auth state change listener
     */
    setupAuthListener() {
        if (!this.client) return;
        
        this.client.auth.onAuthStateChange((event, session) => {
            console.log(`🔐 Auth event: ${event}`);
            
            switch (event) {
                case 'SIGNED_IN':
                    if (session) {
                        this.loadUserData(session.user);
                    }
                    break;
                    
                case 'SIGNED_OUT':
                    this.clearSession();
                    window.location.href = '../login.html';
                    break;
                    
                case 'TOKEN_REFRESHED':
                    console.log('🔄 Token refreshed');
                    break;
                    
                default:
                    console.log(`Unhandled auth event: ${event}`);
            }
        });
    }
    
    /**
     * Load user data from multiusers table
     */
    async loadUserData(authUser) {
        try {
            const { data: userData, error } = await Multiusers.getById(authUser.id);
            
            if (error || !userData) {
                console.warn('User not found in multiusers table');
                // Use basic info from auth
                this.currentUser = {
                    id: authUser.id,
                    email: authUser.email,
                    nama_lengkap: authUser.user_metadata?.nama_lengkap || '',
                    username: authUser.user_metadata?.username || '',
                    role: 'viewer',
                    status: 'aktif'
                };
            } else {
                this.currentUser = {
                    id: userData.id,
                    email: authUser.email,
                    nama_lengkap: userData.nama_lengkap,
                    username: userData.username,
                    role: userData.role || 'viewer',
                    status: userData.status || 'aktif'
                };
            }
            
            // Save to sessionStorage
            this.saveSession();
            
            return this.currentUser;
        } catch (error) {
            console.error('Error loading user data:', error);
            throw error;
        }
    }
    
    /**
     * Save current user to session storage
     */
    saveSession() {
        if (this.currentUser) {
            sessionStorage.setItem(AUTH_CONFIG.STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
        }
    }
    
    /**
     * Clear session data
     */
    clearSession() {
        sessionStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.USER);
        sessionStorage.removeItem(AUTH_CONFIG.STORAGE_KEYS.TOKEN);
        this.currentUser = null;
    }
    
    /**
     * Get current user from storage or memory
     */
    getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }
        
        // Try to get from storage
        const stored = sessionStorage.getItem(AUTH_CONFIG.STORAGE_KEYS.USER);
        if (stored) {
            try {
                this.currentUser = JSON.parse(stored);
                return this.currentUser;
            } catch (e) {
                console.error('Error parsing stored user:', e);
            }
        }
        
        return null;
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const user = this.getCurrentUser();
        return user !== null && user.status === AUTH_CONFIG.STATUS.AKTIF;
    }
    
    /**
     * Get current user's role config
     */
    getRoleConfig() {
        const user = this.getCurrentUser();
        if (!user || !user.role) return null;
        return AUTH_CONFIG.ROLES[user.role] || AUTH_CONFIG.ROLES.viewer;
    }
    
    /**
     * Check if user has specific permission
     */
    hasPermission(permission) {
        const roleConfig = this.getRoleConfig();
        if (!roleConfig) return false;
        
        // Super admin has all permissions
        if (roleConfig.level >= 5) return true;
        
        return roleConfig.permissions.includes(permission);
    }
    
    /**
     * Check if user has at least the specified role level
     */
    hasMinRoleLevel(minLevel) {
        const roleConfig = this.getRoleConfig();
        if (!roleConfig) return false;
        return roleConfig.level >= minLevel;
    }
    
    /**
     * Login with email and password
     */
    async login(email, password) {
        if (!this.client) {
            this.client = getSupabaseClient();
        }
        
        const { data, error } = await this.client.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        if (data.user) {
            // Load full user data from multiusers
            const userData = await this.loadUserData(data.user);
            
            // Check account status
            if (userData.status === AUTH_CONFIG.STATUS.BLOKIR) {
                await this.logout();
                throw new Error('Akun Anda telah diblokir. Hubungi administrator.');
            }
            
            if (userData.status === AUTH_CONFIG.STATUS.NON_AKTIF) {
                await this.logout();
                throw new Error('Akun Anda tidak aktif. Hubungi administrator.');
            }
        }
        
        return data;
    }
    
    /**
     * Register new user (Sign Up)
     */
    async register(email, password, metadata = {}) {
        if (!this.client) {
            this.client = getSupabaseClient();
        }
        
        const { data, error } = await this.client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nama_lengkap: metadata.nama_lengkap || '',
                    username: metadata.username || '',
                    role: metadata.role || 'viewer'
                }
            }
        });
        
        if (error) throw error;
        
        return data;
    }
    
    /**
     * Logout current user
     */
    async logout() {
        if (!this.client) {
            this.client = getSupabaseClient();
        }
        
        try {
            await this.client.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearSession();
        }
    }
    
    /**
     * Redirect to appropriate page based on role
     */
    redirectToDashboard() {
        const roleConfig = this.getRoleConfig();
        if (roleConfig && roleConfig.redirect) {
            window.location.href = roleConfig.redirect;
        } else {
            window.location.href = 'modules/roadmap_kebutuhan.html';
        }
    }
    
    /**
     * Require authentication (redirect to login if not authenticated)
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '../login.html';
            return false;
        }
        return true;
    }
    
    /**
     * Require specific role level
     */
    requireRole(minRole) {
        if (!this.requireAuth()) return false;
        
        const requiredLevel = typeof minRole === 'string' 
            ? (AUTH_CONFIG.ROLES[minRole]?.level || 0)
            : minRole;
        
        if (!this.hasMinRoleLevel(requiredLevel)) {
            alert('Anda tidak memiliki akses ke halaman ini.');
            window.location.href = this.getRoleConfig()?.redirect || 'modules/roadmap_kebutuhan.html';
            return false;
        }
        
        return true;
    }
    
    /**
     * Get role label
     */
    getRoleLabel(role) {
        const roleConfig = AUTH_CONFIG.ROLES[role];
        return roleConfig ? roleConfig.label : role || 'Unknown';
    }
    
    /**
     * Get status label
     */
    getStatusLabel(status) {
        const labels = {
            'aktif': 'Aktif',
            'non-aktif': 'Non-Aktif',
            'blokir': 'Blokir'
        };
        return labels[status] || status || 'Unknown';
    }
}


// ============================================================
// CREATE GLOBAL INSTANCE
// ============================================================

const simbakesAuth = new SimbakesAuth();

// Export to global scope
window.simbakesAuth = simbakesAuth;
window.AUTH_CONFIG = AUTH_CONFIG;
