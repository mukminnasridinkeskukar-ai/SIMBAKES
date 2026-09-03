// ===== DEBUG & TESTING FUNCTIONS FOR CRUD =====

/**
 * Debug function - Test all CRUD functionality
 * Call from console: debugCRUD()
 */
window.debugCRUD = async function() {
    console.log('=== SIMBAKES CRUD DEBUG ===');
    console.log('1. Checking Supabase client:', !!supabaseClient);
    console.log('2. Current user:', currentAdminUser);
    console.log('3. Table body exists:', !!document.getElementById('pengusul-table-body'));
    console.log('4. Rows in table:', document.querySelectorAll('#pengusul-table-body tr[data-id]').length);
    console.log('5. CRUD buttons:', document.querySelectorAll('.btn-crud').length);
    console.log('6. Event listeners attached:', typeof handlePengusulTableClick === 'function');
    
    // Test fetch data
    try {
        const { count } = await supabaseClient.from('submissions').select('*', { count: 'exact', head: true });
        console.log('7. Total records in submissions:', count || 0);
    } catch (e) {
        console.error('   Fetch error:', e);
    }
    
    // List all available functions
    console.log('8. Available functions:');
    console.log('   - viewDetailPengusul(id):', typeof viewDetailPengusul === 'function');
    console.log('   - openPengusulEditModal(id):', typeof openPengusulEditModal === 'function');
    console.log('   - confirmDeletePengusul(id, nama):', typeof confirmDeletePengusul === 'function');
    console.log('   - openStatusModal(id, status):', typeof openStatusModal === 'function');
    console.log('=== END DEBUG ===');
};

/**
 * Force re-attach event handlers to table
 * Call from console: refreshCRUDEvents()
 */
window.refreshCRUDEvents = function() {
    const tbody = document.getElementById('pengusul-table-body');
    if (tbody && typeof setupPengusulTableEvents === 'function') {
        setupPengusulTableEvents(tbody);
        console.log('[DEBUG] ✅ Event handlers re-attached to pengusulan table');
        
        if (typeof addRowClickHandlers === 'function') {
            addRowClickHandlers('pengusul-table-body', viewDetailPengusul);
            console.log('[DEBUG] ✅ Row click handlers re-attached');
        }
        return true;
    }
    console.error('[DEBUG] ❌ Failed to attach events');
    return false;
};

/**
 * Test modal popup - call from console: testModal()
 */
window.testModal = function() {
    console.log('[TEST] Opening detail modal with test data...');
    showDetailModal({
        id: 'test-id-123',
        noRegister: 'TEST-001',
        namaLengkap: 'Test User',
        nik: '1234567890123456',
        status: 'Proses Verifikasi',
        email: 'test@example.com'
    });
};

console.log('%c✅ SIMBAKES Panel Admin Loaded!', 'color: green; font-size: 16px; font-weight: bold;');
console.log('%cDebug: debugCRUD() | refreshCRUDEvents() | testModal()', 'color: blue;');


// ===== LOGIN PAGE HELPER =====
/**
 * Tutup login page dan kembali ke halaman sebelumnya
 * Dipanggil jika user ingin batal login
 */
function closeLoginPage() {
    const loginPage = document.getElementById('login-page');
    if (loginPage) loginPage.classList.add('hidden');
    
    // Kembali ke dashboard
    showPage('dashboard');
}

/**
 * Buka login page (dipanggil saat klik menu admin tanpa login)
 */
function showLoginPage() {
    const loginPage = document.getElementById('login-page');
    if (loginPage) loginPage.classList.remove('hidden');
}




// ===== TOPBAR LOGIN SYSTEM =====

/**
 * Open login modal/page from topbar button
 */
function openTopbarLogin() {
    // Option 1: Show login page overlay
    const loginPage = document.getElementById('login-page');
    if (loginPage) {
        loginPage.classList.remove('hidden');
        
        // Focus on username field
        setTimeout(() => {
            const usernameField = document.getElementById('login-username');
            if (usernameField) usernameField.focus();
        }, 300);
    }
}

/**
 * Open Login Peserta - Tampilkan modal login di dalam index.html
 * (Tidak lagi redirect ke login-peserta.html)
 */
function openPesertaLogin() {
    console.log('[SIMBAKES] Membuka modal login peserta...');
    const overlay = document.getElementById('peserta-login-overlay');
    if (overlay) {
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            document.getElementById('peserta-login-username')?.focus();
        }, 300);
    }
}

/**
 * Close Peserta Login Modal
 */
function closePesertaLoginModal() {
    const overlay = document.getElementById('peserta-login-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
        // Reset form
        document.getElementById('peserta-login-username').value = '';
        document.getElementById('peserta-login-password').value = '';
        const alert = document.getElementById('peserta-login-alert');
        alert.className = 'peserta-login-alert';
        alert.innerHTML = '';
    }
}

/**
 * Handler Login Peserta di dalam modal (index.html)
 * Authenticate ke Supabase tabel akun_peserta
 */
let pesertaSessionData = null;

async function handlePesertaLoginInModal(event) {
    event.preventDefault();
    
    const username = document.getElementById('peserta-login-username').value.trim().toLowerCase();
    const password = document.getElementById('peserta-login-password').value;
    const alertEl = document.getElementById('peserta-login-alert');
    const btn = document.getElementById('peserta-login-btn');
    
    // Clear previous alert
    alertEl.className = 'peserta-login-alert';
    alertEl.innerHTML = '';
    
    if (!username || !password) {
        alertEl.className = 'peserta-login-alert error show';
        alertEl.innerHTML = '❌ Username dan password wajib diisi';
        return;
    }
    
    // Loading state
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Memproses...';
    alertEl.className = 'peserta-login-alert info show';
    alertEl.innerHTML = '⏳ Memproses login...';
    
    try {
        if (!supabaseClient) throw new Error('Koneksi database tidak tersedia.');
        
        console.log('[PESERTA LOGIN] Authenticating:', username);
        
        // Query ke tabel akun_peserta
        const { data: users, error: queryError } = await supabaseClient
            .from('akun_peserta')
            .select('*')
            .or(`username.eq.${username},email.eq.${username}`)
            .limit(1);
        
        if (queryError) throw new Error(queryError.message);
        
        if (!users || users.length === 0) {
            throw new Error('Username atau password tidak sesuai.');
        }
        
        const user = users[0];
        
        // Verifikasi password
        if (user.password !== password) {
            throw new Error('Username atau password tidak sesuai.');
        }
        
        // Cek status akun
        const userStatus = user.status || 'pending';
        if (userStatus !== 'approved') {
            let msg = '';
            switch (userStatus) {
                case 'pending':
                    msg = 'Akun Anda masih <strong>MENUNGGU PERSETUJUAN</strong> dari admin Dinkes. Silakan tunggu 1-2 hari kerja.';
                    break;
                case 'rejected':
                    msg = `Akun Anda <strong>DITOLAK</strong>. Alasan: ${user.status_note || 'Tidak ada catatan'}. Hubungi admin.`;
                    break;
                case 'suspended':
                    msg = `Akun Anda <strong>DITANGGUHKAN</strong>. Alasan: ${user.status_note || 'Tidak ada catatan'}. Hubungi admin.`;
                    break;
                default:
                    msg = `Akun dalam status <strong>${userStatus.toUpperCase()}</strong>. Hubungi admin.`;
            }
            alertEl.className = 'peserta-login-alert error show';
            alertEl.innerHTML = `⏳ ${msg}`;
            btn.disabled = false;
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg><span>MASUK</span>';
            document.getElementById('peserta-login-password').value = '';
            return;
        }
        
        console.log('[PESERTA LOGIN] ✅ Login successful! NIK:', user.nik);
        
        // Update last login
        await supabaseClient
            .from('akun_peserta')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', user.id);
        
        // Store session
        pesertaSessionData = {
            id: user.id,
            nama: user.nama || user.nama_lengkap || 'Peserta',
            nik: user.nik || '',
            email: user.email || '',
            username: user.username
        };
        
        // Update topbar button
        updateUIForLoggedInPeserta(pesertaSessionData);
        
        // Close login modal
        closePesertaLoginModal();
        
        // Show peserta dashboard with 2 cards
        showPesertaDashboard(pesertaSessionData);
        
    } catch (error) {
        console.error('[PESERTA LOGIN] Error:', error);
        alertEl.className = 'peserta-login-alert error show';
        alertEl.innerHTML = `❌ ${error.message || 'Terjadi kesalahan.'}`;
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg><span>MASUK</span>';
        document.getElementById('peserta-login-password').value = '';
        document.getElementById('peserta-login-password').focus();
    }
}

// showPesertaDashboard is defined below (unified version)

/**
 * Close Peserta Dashboard
 */
function closePesertaDashboard() {
    const dashboard = document.getElementById('peserta-dashboard-overlay');
    if (dashboard) {
        dashboard.classList.remove('show');
        document.body.style.overflow = '';
    }
}

/**
 * Logout Peserta
 */
function pesertaLogout() {
    if (confirm('Apakah Anda yakin ingin logout?')) {
        pesertaSessionData = null;
        localStorage.removeItem('simbakes_peserta_session');
        
        // Close all peserta overlays
        closePesertaDashboard();
        closePesertaAjukan();
        closePesertaCekStatus();
        
        // Reset topbar button
        const loginBtn = document.getElementById('topbar-peserta-login-btn');
        if (loginBtn) {
            loginBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
                Login Peserta
            `;
            loginBtn.onclick = openPesertaLogin;
            loginBtn.style.background = '';
            loginBtn.title = '';
        }
        
        showToast?.('info', '👋 Logout Berhasil', 'Anda telah keluar dari akun peserta');
    }
}

/**
 * Open Ajukan Rekomendasi Popup
 * Memindahkan konten page-ajukan ke dalam popup full-screen
 */
function openPesertaAjukan() {
    const popup = document.getElementById('peserta-ajukan-popup');
    const body = document.getElementById('peserta-ajukan-body');
    const pageAjukan = document.getElementById('page-ajukan');
    
    if (!popup || !body || !pageAjukan) {
        console.error('[PESERTA] Elemen popup/page-ajukan tidak ditemukan');
        return;
    }
    
    // FIX: MOVE (bukan clone) node asli ke popup.
    // Clone menduplikasi semua id anak (nik, form-ajukan, dst) sehingga
    // validateForm/submitForm (getElementById) membaca form asli yg tersembunyi
    // -> pengajuan TIDAK PERNAH bisa dikirim dari popup.
    window.__ajukanOrigParent = pageAjukan.parentNode;
    window.__ajukanOrigNext = pageAjukan.nextSibling;
    
    body.innerHTML = '';
    pageAjukan.classList.add('active');
    pageAjukan.style.display = 'block';
    body.appendChild(pageAjukan); // pindahkan node asli
    
    // Initialize form if needed (generate nomor register & tanggal)
    if (typeof initializeForm === 'function') initializeForm();
    
    // Pre-fill NIK if available
    if (pesertaSessionData && pesertaSessionData.nik) {
        const nikInput = document.getElementById('nik');
        if (nikInput) nikInput.value = pesertaSessionData.nik;
    }
    
    // Override submitForm to close popup on success (hanya sekali, cegah nesting)
    if (!window.__ajukanSubmitWrapped) {
        window.__ajukanSubmitWrapped = true;
        const origSubmitForm = window.submitForm;
        window.submitForm = async function() {
            await origSubmitForm.call(this);
            // Check if success modal appeared, if so add close handler
            setTimeout(() => {
                const successModal = document.getElementById('success-modal');
                if (successModal && successModal.classList.contains('active')) {
                    // Modify the cek status button to close popup instead
                    const cekBtn = successModal.querySelector('button[onclick*="cek-status"]');
                    if (cekBtn) {
                        cekBtn.setAttribute('onclick', 'closePesertaAjukan(); openPesertaCekStatus();');
                    }
                }
            }, 500);
        };
    }
    
    // Show popup
    popup.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Close Ajukan Popup
 */
function closePesertaAjukan() {
    const popup = document.getElementById('peserta-ajukan-popup');
    const body = document.getElementById('peserta-ajukan-body');
    if (popup) {
        popup.classList.remove('show');
        
        // Kembalikan node page-ajukan ke posisi aslinya di main content
        const pageAjukan = document.getElementById('page-ajukan');
        if (pageAjukan && window.__ajukanOrigParent) {
            pageAjukan.classList.remove('active');
            pageAjukan.style.display = '';
            try {
                window.__ajukanOrigParent.insertBefore(pageAjukan, window.__ajukanOrigNext || null);
            } catch (e) {
                window.__ajukanOrigParent.appendChild(pageAjukan);
            }
            window.__ajukanOrigParent = null;
            window.__ajukanOrigNext = null;
        }
        if (body) body.innerHTML = ''; // bersihkan sisa konten
        document.body.style.overflow = '';
    }
}

/**
 * Open Cek Status Lightbox
 * Memindahkan konten page-cek-status ke dalam lightbox full-screen
 */
function openPesertaCekStatus() {
    const popup = document.getElementById('peserta-cekstatus-popup');
    const body = document.getElementById('peserta-cekstatus-body');
    const pageCekStatus = document.getElementById('page-cek-status');
    
    if (!popup || !body || !pageCekStatus) {
        console.error('[PESERTA] Elemen popup/page-cek-status tidak ditemukan');
        return;
    }
    
    // FIX: MOVE (bukan clone) node asli - sama dgn openPesertaAjukan.
    // Clone membuat id ganda (search-nik, result-container, dst) sehingga
    // searchSubmissionData (getElementById) membaca field asli yg tersembunyi
    // -> pencarian dari popup tidak pernah berfungsi.
    window.__cekstatusOrigParent = pageCekStatus.parentNode;
    window.__cekstatusOrigNext = pageCekStatus.nextSibling;
    
    body.innerHTML = '';
    pageCekStatus.classList.add('active');
    pageCekStatus.style.display = 'block';
    body.appendChild(pageCekStatus); // pindahkan node asli
    
    // Reset tampilan hasil sebelumnya
    const rc = document.getElementById('result-container');
    if (rc) rc.classList.remove('active');
    const nf = document.getElementById('not-found-container');
    if (nf) nf.style.display = 'none';
    
    // Pre-fill NIK if available from peserta session
    if (pesertaSessionData && pesertaSessionData.nik) {
        const nikInput = document.getElementById('search-nik');
        if (nikInput) nikInput.value = pesertaSessionData.nik;
    }
    
    // Show popup
    popup.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * Close Cek Status Lightbox
 */
function closePesertaCekStatus() {
    const popup = document.getElementById('peserta-cekstatus-popup');
    const body = document.getElementById('peserta-cekstatus-body');
    if (popup) {
        popup.classList.remove('show');
        
        // Kembalikan node page-cek-status ke posisi aslinya di main content
        const pageCekStatus = document.getElementById('page-cek-status');
        if (pageCekStatus && window.__cekstatusOrigParent) {
            pageCekStatus.classList.remove('active');
            pageCekStatus.style.display = '';
            try {
                window.__cekstatusOrigParent.insertBefore(pageCekStatus, window.__cekstatusOrigNext || null);
            } catch (e) {
                window.__cekstatusOrigParent.appendChild(pageCekStatus);
            }
            window.__cekstatusOrigParent = null;
            window.__cekstatusOrigNext = null;
        }
        if (body) body.innerHTML = '';
        document.body.style.overflow = '';
    }
}

// ESC key handler for peserta overlays
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('peserta-ajukan-popup')?.classList.contains('show')) {
            closePesertaAjukan();
        } else if (document.getElementById('peserta-cekstatus-popup')?.classList.contains('show')) {
            closePesertaCekStatus();
        } else if (document.getElementById('peserta-dashboard-overlay')?.classList.contains('show')) {
            pesertaLogout();
        } else if (document.getElementById('peserta-login-overlay')?.classList.contains('show')) {
            closePesertaLoginModal();
        }
    }
});

/**
 * Helper: Tentukan URL halaman login peserta
 * (Kept for backward compatibility)
 */
function getLoginPageUrl() {
    return './login-peserta.html';
}

/**
 * Helper: Dapatkan ID halaman saat ini untuk restore state
 */
function getCurrentPageId() {
    const activePage = document.querySelector('.page.active');
    if (activePage) return activePage.id;
    
    // Cek dari hash/URL
    if (window.location.hash) return window.location.hash.replace('#', '');
    
    return 'dashboard'; // Default
}

/**
 * Handle callback dari login-peserta.html (jika dibuka di popup/new tab)
 * Dipanggil via postMessage atau localStorage event
 */
function handlePesertaLoginCallback(loginData) {
    console.log('[SIMBAKES] Received login callback:', loginData);
    
    if (loginData && loginData.success) {
        // Set session data
        localStorage.setItem('simbakes_peserta_session', JSON.stringify({
            isLoggedIn: true,
            nama: loginData.nama || loginData.nama_lengkap || 'Peserta',
            nik: loginData.nik || '',
            email: loginData.email || '',
            status: loginData.status || '',
            loginTime: new Date().toISOString(),
            data: loginData.data || null
        }));
        
        // Update UI untuk menunjukkan status login peserta
        updateUIForLoggedInPeserta(loginData);
        
        // Tampilkan notifikasi sukses
        showToast?.('success', '✅ Login Berhasil', `Selamat datang, ${loginData.nama || 'Peserta'}!`);
        
        // Redirect ke halaman yang diminta (jika ada)
        const returnUrl = localStorage.getItem('simbakes_return_page');
        if (returnUrl && returnUrl !== 'dashboard') {
            showPage?.(returnUrl);
        }
    }
}

/**
 * Update UI setelah peserta berhasil login
 */
function updateUIForLoggedInPeserta(loginData) {
    // Update tombol login peserta menjadi info akun
    const loginBtn = document.getElementById('topbar-peserta-login-btn');
    if (loginBtn) {
        const nama = loginData?.nama || loginData?.nama_lengkap || 'Peserta';
        loginBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
            ${nama.substring(0, 15)}${nama.length > 15 ? '...' : ''}
        `;
        loginBtn.onclick = showPesertaDashboard;
        loginBtn.style.background = 'linear-gradient(135deg, #059669, #047857)';
        loginBtn.title = 'Klik untuk lihat dashboard peserta';
    }
    
    console.log('[SIMBAKES] UI updated for logged-in peserta');
}

function showPesertaDashboard(sessionOrUndefined) {
    const session = sessionOrUndefined || pesertaSessionData;
    if (session) {
        // Update dashboard UI
        const avatar = document.getElementById('peserta-dash-avatar');
        const username = document.getElementById('peserta-dash-username');
        if (avatar) avatar.textContent = (session.nama || 'P').charAt(0).toUpperCase();
        if (username) username.textContent = session.nama || 'Peserta';
        // Show dashboard overlay
        const dashboard = document.getElementById('peserta-dashboard-overlay');
        if (dashboard) {
            dashboard.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
        return;
    }
    // Fallback: Ambil data session dari localStorage
    const sessionData = localStorage.getItem('simbakes_peserta_session');
    if (!sessionData) {
        openPesertaLogin();
        return;
    }
    const stored = JSON.parse(sessionData);
    pesertaSessionData = stored;
    // Call self with session data
    const avatar = document.getElementById('peserta-dash-avatar');
    const username = document.getElementById('peserta-dash-username');
    if (avatar) avatar.textContent = (stored.nama || 'P').charAt(0).toUpperCase();
    if (username) username.textContent = stored.nama || 'Peserta';
    const dashboard = document.getElementById('peserta-dashboard-overlay');
    if (dashboard) {
        dashboard.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Modal info peserta yang sudah login
 */
function showModalPesertaInfo(session) {
    // Buat atau update modal info peserta
    let infoModal = document.getElementById('peserta-info-modal');
    
    if (!infoModal) {
        infoModal = document.createElement('div');
        infoModal.id = 'peserta-info-modal';
        infoModal.className = 'modal-overlay';
        document.body.appendChild(infoModal);
    }
    
    const statusConfig = getStatusBadgeConfig(session.status || '');
    
    infoModal.innerHTML = `
        <div class="modal-content" style="max-width:500px; border-radius:20px; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#059669,#047857); padding:2rem; text-align:center;">
                <div style="width:80px; height:80px; background:rgba(255,255,255,0.25); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem; font-size:2rem;">
                    👤
                </div>
                <h2 style="color:white; font-size:1.5rem; font-weight:700; margin:0;">${escapeHtml(session.nama)}</h2>
                <p style="color:rgba(255,255,255,0.9); font-size:0.9rem;">Status: ${statusConfig.text}</p>
            </div>
            
            <div style="padding:1.5rem;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:1.5rem;">
                    ${session.nik ? `<div style="background:#f9fafb; padding:12px; border-radius:10px;"><small style="color:#6b7280; display:block; margin-bottom:4px;">NIK</small><strong>${escapeHtml(session.nik)}</strong></div>` : ''}
                    ${session.email ? `<div style="background:#f9fafb; padding:12px; border-radius:10px;"><small style="color:#6b7280; display:block; margin-bottom:4px;">Email</small><strong>${escapeHtml(session.email)}</strong></div>` : ''}
                </div>
                
                <div style="text-align:center; margin-bottom:1rem;">
                    <span style="display:inline-flex; align-items:center; gap:8px; padding:10px 24px; border-radius:50px; background:${statusConfig.bg}; color:white; font-weight:700;">
                        ${statusConfig.icon} ${statusConfig.text}
                    </span>
                </div>
                
                <div style="display:flex; gap:10px;">
                    <button onclick="closePesertaInfoModal()" style="flex:1; padding:12px; background:#f3f4f6; color:#374151; border:none; border-radius:10px; font-weight:600; cursor:pointer;">
                        Tutup
                    </button>
                    <button onclick="logoutPeserta()" style="flex:1; padding:12px; background:#fee2e2; color:#dc2626; border:none; border-radius:10px; font-weight:600; cursor:pointer;">
                        🚪 Logout
                    </button>
                </div>
            </div>
        </div>
    `;
    
    infoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Close on backdrop click
    infoModal.addEventListener('click', function(e) {
        if (e.target === infoModal) closePesertaInfoModal();
    });
}

/**
 * Close modal info peserta
 */
function closePesertaInfoModal() {
    const modal = document.getElementById('peserta-info-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Logout peserta
 */
function logoutPeserta() {
    // Redirect to new pesertaLogout
    pesertaLogout();
}

/**
 * Helper: Get status badge config
 */
function getStatusBadgeConfig(status) {
    if (!status) return { icon: '⏳', text: 'Menunggu Proses', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' };
    
    const s = String(status).toLowerCase();
    
    if (s.includes('direkomendasikan') || s.includes('approved') || s.includes('lulus') || s.includes('aktif')) {
        return { icon: '✅', text: status, bg: 'linear-gradient(135deg, #22c55e, #16a34a)' };
    }
    if (s.includes('ditolak') || s.includes('rejected') || s.includes('gagal')) {
        return { icon: '❌', text: status, bg: 'linear-gradient(135deg, #ef4444, #dc2626)' };
    }
    
    return { icon: '⏳', text: status, bg: 'linear-gradient(135deg, #f59e0b, #d97706)' };
}

