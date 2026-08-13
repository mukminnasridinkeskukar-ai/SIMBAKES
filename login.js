/**
 * =====================================================
 * SIMBAKES - LOGIN & AUTHENTICATION MODULE
 * =====================================================
 * 
 * Fitur:
 * - Login dengan Username/Email + Password
 * - Registrasi User Baru
 * - Validasi Form Lengkap
 * - Session Management dengan Supabase
 * - Password Strength Checker
 * - Auto-redirect ke Dashboard User
 */

// =====================================================
// GLOBAL STATE
// =====================================================

const AuthState = {
    currentUser: null,
    isLoggedIn: false,
    isLoading: false,
    loginAttempts: 0,
    maxAttempts: 5,
    lockoutTime: null
};

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[SIMBAKES-AUTH] Initializing authentication module...');
    
    // Check if already logged in
    await checkExistingSession();
    
    // Initialize Supabase if available
    if (typeof simbakesDB !== 'undefined') {
        try {
            await simbakesDB.init();
            console.log('[SIMBAKES-AUTH] ✅ Supabase client ready');
        } catch (error) {
            console.warn('[SIMBAKES-AUTH] ⚠️ Supabase init failed:', error.message);
        }
    }
});

/**
 * Check for existing session and redirect if logged in
 */
async function checkExistingSession() {
    const storedUser = localStorage.getItem('simbakes_user');
    
    if (storedUser) {
        try {
            AuthState.currentUser = JSON.parse(storedUser);
            AuthState.isLoggedIn = true;
            
            console.log('[SIMBAKES-AUTH] ✅ Existing session found:', AuthState.currentUser.username);
            
            // Optional: Verify session with Supabase
            if (typeof simbakesDB !== 'undefined' && simbakesDB.isInitialized) {
                // Could verify token here if using Supabase Auth
            }
            
            // Redirect to dashboard after short delay
            showLoading('Mengalihkan ke Dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard-user.html';
            }, 1000);
            
        } catch (e) {
            console.warn('[SIMBAKES-AUTH] Invalid session, clearing...');
            localStorage.removeItem('simbakes_user');
        }
    }
}

// =====================================================
// TAB SWITCHING
// =====================================================

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update forms
    document.querySelectorAll('.form-container').forEach(form => {
        form.classList.toggle('active', form.id === tabName + 'Form');
    });
    
    // Clear alerts
    hideAlert();
    
    // Scroll to top of card
    document.querySelector('.auth-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =====================================================
// ALERT SYSTEM
// =====================================================

function showAlert(message, type = 'error') {
    const container = document.getElementById('alertContainer');
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    container.innerHTML = `
        <div class="alert alert-${type} show">
            <i class="${icons[type]}"></i>
            <span>${message}</span>
        </div>
    `;
}

function hideAlert() {
    const container = document.getElementById('alertContainer');
    container.innerHTML = '';
}

function showSuccessAlert(message) {
    showAlert(message, 'success');
}

function showErrorAlert(message) {
    showAlert(message, 'error');
}

function showWarningAlert(message) {
    showAlert(message, 'warning');
}

// =====================================================
// PASSWORD UTILITIES
// =====================================================

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function checkPasswordStrength(password) {
    const strengthContainer = document.getElementById('passwordStrength');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthContainer || !strengthFill || !strengthText) return;
    
    // Show strength indicator
    strengthContainer.style.display = 'block';
    
    let strength = 0;
    let text = '';
    let className = '';
    
    // Check length
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Check for lowercase
    if (/[a-z]/.test(password)) strength++;
    
    // Check for uppercase
    if (/[A-Z]/.test(password)) strength++;
    
    // Check for numbers
    if (/[0-9]/.test(password)) strength++;
    
    // Check for special characters
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    // Determine strength level
    if (password.length === 0) {
        strengthContainer.style.display = 'none';
        return;
    } else if (strength <= 2) {
        text = 'Lemah - Tambahkan huruf besar, angka, dan simbol';
        className = 'strength-weak';
    } else if (strength <= 4) {
        text = 'Sedang - Bisa lebih kuat lagi';
        className = 'strength-medium';
    } else {
        text = 'Kuat - Password aman!';
        className = 'strength-strong';
    }
    
    // Update UI
    strengthFill.className = 'strength-fill ' + className;
    strengthText.textContent = text;
    strengthText.style.color = className.includes('weak') ? '#ef4444' : 
                                  className.includes('medium') ? '#f59e0b' : '#10b981';
}

// =====================================================
// ROLE PREVIEW
// =====================================================

const roleConfig = {
    peserta: { icon: 'fa-user-graduate', label: 'Peserta' },
    admin_sekolah: { icon: 'fa-school', label: 'Admin Sekolah' },
    admin_dinkes: { icon: 'fa-hospital', label: 'Admin Dinkes' },
    reviewer: { icon: 'fa-clipboard-check', label: 'Reviewer' }
};

function updateRolePreview(role) {
    const preview = document.getElementById('rolePreview');
    const institusiGroup = document.getElementById('institusiGroup');
    
    if (role && roleConfig[role]) {
        preview.innerHTML = `<i class="fas ${roleConfig[role].icon}"></i> ${roleConfig[role].label}`;
        
        // Show institusi field for certain roles
        if (['admin_sekolah', 'admin_dinkes'].includes(role)) {
            institusiGroup.style.display = 'block';
            document.getElementById('regInstitusi').required = true;
        } else {
            institusiGroup.style.display = 'none';
            document.getElementById('regInstitusi').required = false;
        }
    } else {
        preview.innerHTML = '<i class="fas fa-user-graduate"></i> Peserta';
        institusiGroup.style.display = 'none';
    }
}

// =====================================================
// FORM VALIDATION
// =====================================================

function validateLoginForm() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    let errors = [];
    
    if (!username) errors.push('Username/email harus diisi');
    if (!password) errors.push('Password harus diisi');
    if (password.length < 6) errors.push('Password minimal 6 karakter');
    
    return { valid: errors.length === 0, errors };
}

function validateRegisterForm() {
    const nama = document.getElementById('regNamaLengkap').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const role = document.getElementById('regRole').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    let errors = [];
    
    // Nama validasi
    if (!nama) errors.push('Nama lengkap harus diisi');
    else if (nama.length < 3) errors.push('Nama minimal 3 karakter');
    
    // Email validasi
    if (!email) errors.push('Email harus diisi');
    else if (!isValidEmail(email)) errors.push('Format email tidak valid');
    
    // Username validasi
    if (!username) errors.push('Username harus diisi');
    else if (username.length < 4) errors.push('Username minimal 4 karakter');
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.push('Username hanya boleh huruf, angka, dan underscore');
    
    // Password validasi
    if (!password) errors.push('Password harus diisi');
    else if (password.length < 8) errors.push('Password minimal 8 karakter');
    
    // Confirm password
    if (password !== confirmPassword) errors.push('Konfirmasi password tidak cocok');
    
    // Role validasi
    if (!role) errors.push('Pilih peran akun');
    
    // Terms agreement
    if (!agreeTerms) errors.push('Anda harus menyetujui syarat dan ketentuan');
    
    return { valid: errors.length === 0, errors };
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// =====================================================
// LOADING STATES
// =====================================================

function showLoading(text = 'Memproses...') {
    const overlay = document.getElementById('loadingOverlay');
    overlay.querySelector('.loading-text').textContent = text;
    overlay.classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function setButtonLoading(buttonId, loading = true) {
    const btn = document.getElementById(buttonId);
    if (loading) {
        btn.disabled = true;
        btn.classList.add('loading');
        btn.innerHTML = '<div class="spinner"></div><span>Memproses...</span>';
    } else {
        btn.disabled = false;
        btn.classList.remove('loading');
        // Restore original content based on button
        if (buttonId === 'loginBtn') {
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Masuk ke Akun</span>';
        } else if (buttonId === 'registerBtn') {
            btn.innerHTML = '<i class="fas fa-user-plus"></i><span>Buat Akun Baru</span>';
        }
    }
}

// =====================================================
// LOGIN HANDLER
// =====================================================

async function handleLogin(event) {
    event.preventDefault();
    
    // Check lockout
    if (isLockedOut()) {
        const remaining = getLockoutRemaining();
        showErrorAlert(`Akun terkunci. Coba lagi dalam ${remaining} menit`);
        return;
    }
    
    // Validate form
    const validation = validateLoginForm();
    if (!validation.valid) {
        showErrorAlert(validation.errors[0]);
        return;
    }
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Set loading state
    setButtonLoading('loginBtn', true);
    hideAlert();
    
    try {
        console.log('[SIMBAKES-AUTH] Attempting login for:', username);
        
        // Attempt login via Supabase
        let result;
        
        if (typeof simbakesDB !== 'undefined' && simbakesDB.isInitialized) {
            result = await simbakesDB.login(username, password);
        } else {
            // Fallback to direct API call
            result = await loginViaAPI(username, password);
        }
        
        if (result.success) {
            // Login successful
            AuthState.currentUser = result.user;
            AuthState.isLoggedIn = true;
            AuthState.loginAttempts = 0; // Reset attempts
            
            // Store session
            const sessionData = {
                id: result.user.id,
                nama_lengkap: result.user.nama_lengkap,
                username: result.user.username,
                email: result.user.email,
                role: result.user.role,
                institusi: result.user.institusi || '',
                loginTime: new Date().toISOString(),
                rememberMe: rememberMe
            };
            
            localStorage.setItem('simbakes_user', JSON.stringify(sessionData));
            
            console.log('[SIMBAKES-AUTH] ✅ Login successful:', result.user.username);
            
            // Show success message
            showSuccessAlert('Login berhasil! Mengalihkan ke Dashboard...');
            
            // Redirect based on role
            setTimeout(() => {
                redirectToDashboard(result.user.role);
            }, 1500);
            
        } else {
            // Login failed
            handleFailedLogin(result.error);
        }
        
    } catch (error) {
        console.error('[SIMBAKES-AUTH] Login error:', error);
        handleFailedLogin('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
        setButtonLoading('loginBtn', false);
    }
}

/**
 * Fallback login via direct Supabase query
 * FIXED: Use dynamic client resolution
 */
async function loginViaAPI(username, password) {
    try {
        // Get Supabase client dynamically
        const client = getSupabaseClientSafe();
        if (!client) {
            throw new Error('Koneksi database tidak tersedia. Pastikan konfigurasi Supabase benar.');
        }
        
        // Check if it's an email or username
        const isEmail = isValidEmail(username);
        
        let query;
        if (isEmail) {
            query = client
                .from('multiusers')
                .select('*')
                .eq('email', username)
                .eq('status', 'aktif');
        } else {
            query = client
                .from('multiusers')
                .select('*')
                .eq('username', username)
                .eq('status', 'aktif');
        }
        
        const { data, error } = await query.single();
        
        if (error) throw error;
        
        if (!data) {
            return { success: false, error: 'Username/email atau password salah' };
        }
        
        // Note: In production, use proper password hashing comparison
        if (data.password !== password) {
            return { success: false, error: 'Username/email atau password salah' };
        }
        
        // Update last_login
        await client
            .from('multiusers')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.id);
        
        return { success: true, user: data };
        
    } catch (error) {
        console.error('[SIMBAKES-AUTH] API login error:', error);
        return { success: false, error: error.message || 'Terjadi kesalahan koneksi database' };
    }
}

/**
 * Get Supabase client safely from multiple sources
 */
function getSupabaseClientSafe() {
    // Priority 1: simbakesDB.client (from supabase-client.js)
    if (typeof simbakesDB !== 'undefined' && simbakesDB.isInitialized && simbakesDB.client) {
        return simbakesDB.client;
    }
    
    // Priority 2: Global supabaseClient variable
    if (typeof supabaseClient !== 'undefined') {
        return supabaseClient;
    }
    
    // Priority 3: Create new client from config
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined') {
        if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL') {
            return window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        }
    }
    
    return null;
}

function handleFailedLogin(errorMessage) {
    AuthState.loginAttempts++;
    
    if (AuthState.loginAttempts >= AuthState.maxAttempts) {
        // Lock account
        AuthState.lockoutTime = Date.now() + (15 * 60 * 1000); // 15 minutes
        localStorage.setItem('simbakes_lockout', AuthState.lockoutTime);
        showErrorAlert(`Terlalu banyak percobaan. Akun dikunci selama 15 menit.`);
    } else {
        const remaining = AuthState.maxAttempts - AuthState.loginAttempts;
        showErrorAlert(`${errorMessage} (${remaining} percobaan tersisa)`);
    }
}

function isLockedOut() {
    const lockout = localStorage.getItem('simbakes_lockout');
    if (lockout && parseInt(lockout) > Date.now()) {
        return true;
    }
    return false;
}

function getLockoutRemaining() {
    const lockout = localStorage.getItem('simbakes_lockout');
    if (lockout) {
        const remaining = Math.ceil((parseInt(lockout) - Date.now()) / 60000);
        return remaining > 0 ? remaining : 0;
    }
    return 0;
}

// =====================================================
// REGISTER HANDLER
// =====================================================

async function handleRegister(event) {
    event.preventDefault();
    
    // Validate form
    const validation = validateRegisterForm();
    if (!validation.valid) {
        showErrorAlert(validation.errors[0]);
        return;
    }
    
    // Gather form data
    const formData = {
        nama_lengkap: document.getElementById('regNamaLengkap').value.trim(),
        email: document.getElementById('regEmail').value.trim().toLowerCase(),
        username: document.getElementById('regUsername').value.trim().toLowerCase(),
        password: document.getElementById('regPassword').value,
        role: document.getElementById('regRole').value,
        institusi: document.getElementById('regInstitusi')?.value?.trim() || '',
        status: 'aktif'
    };
    
    // Set loading state
    setButtonLoading('registerBtn', true);
    hideAlert();
    
    try {
        console.log('[SIMBAKES-AUTH] Registering new user:', formData.username);
        
        // Check if username or email already exists
        const existingCheck = await checkExistingUser(formData.username, formData.email);
        
        if (existingCheck.exists) {
            setButtonLoading('registerBtn', false);
            showErrorAlert(existingCheck.message);
            return;
        }
        
        // Create user in Supabase
        let result;
        
        if (typeof simbakesDB !== 'undefined' && simbakesDB.isInitialized) {
            result = await registerViaSupabase(formData);
        } else {
            result = await registerViaAPI(formData);
        }
        
        if (result.success) {
            console.log('[SIMBAKES-AUTH] ✅ Registration successful:', formData.username);
            
            // Show success and switch to login
            showSuccessAlert('Registrasi berhasil! Silakan login dengan akun Anda.');
            
            // Clear registration form
            document.getElementById('registerForm').querySelector('form').reset();
            document.getElementById('passwordStrength').style.display = 'none';
            
            // Switch to login tab after delay
            setTimeout(() => {
                switchTab('login');
                // Pre-fill username
                document.getElementById('loginUsername').value = formData.username;
                document.getElementById('loginPassword').focus();
            }, 2000);
            
        } else {
            showErrorAlert(result.error || 'Registrasi gagal. Silakan coba lagi.');
        }
        
    } catch (error) {
        console.error('[SIMBAKES-AUTH] Registration error:', error);
        showErrorAlert('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
        setButtonLoading('registerBtn', false);
    }
}

/**
 * Check if username or email already exists
 */
async function checkExistingUser(username, email) {
    try {
        if (typeof supabaseClient !== 'undefined') {
            const { data: usernameCheck } = await supabaseClient
                .from('multiusers')
                .select('id')
                .eq('username', username)
                .limit(1);
            
            if (usernameCheck && usernameCheck.length > 0) {
                return { exists: true, message: 'Username sudah digunakan. Pilih username lain.' };
            }
            
            const { data: emailCheck } = await supabaseClient
                .from('multiusers')
                .select('id')
                .eq('email', email)
                .limit(1);
            
            if (emailCheck && emailCheck.length > 0) {
                return { exists: true, message: 'Email sudah terdaftar. Gunakan email lain.' };
            }
        }
        
        return { exists: false };
        
    } catch (error) {
        console.warn('[SIMBAKES-AUTH] Error checking existing user:', error);
        return { exists: false }; // Continue with registration
    }
}

/**
 * Register via Supabase client library
 * FIXED: Use simbakesDB.client instead of undefined supabaseClient
 */
async function registerViaSupabase(userData) {
    try {
        // Get Supabase client from multiple sources
        let client = null;
        
        if (typeof simbakesDB !== 'undefined' && simbakesDB.isInitialized && simbakesDB.client) {
            client = simbakesDB.client;
            console.log('[SIMBAKES-AUTH] Using simbakesDB.client for registration');
        } else if (typeof supabaseClient !== 'undefined') {
            client = supabaseClient;
            console.log('[SIMBAKES-AUTH] Using global supabaseClient for registration');
        } else if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            // Create temporary client using config
            if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
                client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
                console.log('[SIMBAKES-AUTH] Created new Supabase client for registration');
            }
        }
        
        if (!client) {
            throw new Error('Supabase client tidak tersedia. Pastikan supabase-client.js sudah dimuat.');
        }
        
        const { data, error } = await client
            .from('multiusers')
            .insert([{
                id: generateUUID(),
                nama_lengkap: userData.nama_lengkap,
                email: userData.email,
                username: userData.username,
                password: userData.password, // In production, hash this!
                role: userData.role,
                institusi: userData.institusi || '',
                status: userData.status || 'aktif',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        return { success: true, user: data };
        
    } catch (error) {
        console.error('[SIMBAKES-AUTH] Supabase register error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Register via direct API call (fallback)
 */
async function registerViaAPI(userData) {
    // Same as registerViaSupabase but uses global supabaseClient
    return registerViaSupabase(userData);
}

// =====================================================
// REDIRECT LOGIC
// =====================================================

function redirectToDashboard(role) {
    // Different dashboards based on role
    const routes = {
        peserta: 'dashboard-user.html',
        admin_sekolah: 'index.html',      // Main dashboard
        admin_dinkes: 'index.html',       // Main dashboard
        reviewer: 'index.html',           // Main dashboard
        admin: 'index.html'               // Super admin
    };
    
    const targetRoute = routes[role] || 'dashboard-user.html';
    
    console.log('[SIMBAKES-AUTH] Redirecting to:', targetRoute);
    window.location.href = targetRoute;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function logout() {
    // Clear session
    localStorage.removeItem('simbakes_user');
    localStorage.removeItem('simbakes_lockout');
    
    // Reset state
    AuthState.currentUser = null;
    AuthState.isLoggedIn = false;
    
    // Redirect to login
    window.location.href = 'login.html';
}

// Make logout globally available
window.logout = logout;

// =====================================================
// EXPORT FOR MODULE USAGE
// =====================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AuthState,
        handleLogin,
        handleRegister,
        logout,
        checkExistingSession
    };
}
