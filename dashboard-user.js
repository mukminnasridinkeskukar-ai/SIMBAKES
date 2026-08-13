/**
 * =====================================================
 * SIMBAKES - DASHBOARD USER MODULE
 * =====================================================
 * 
 * Fitur:
 * - Load & tampilkan data pengusulan dari Supabase
 * - Fungsi SANGGAH/BANDING jika ditolak/dibatalkan
 * - Ajukan pengusulan beasiswa baru
 * - Filter, search, dan pagination
 * - Profil management
 */

// =====================================================
// GLOBAL STATE
// =====================================================

const DashboardState = {
    currentUser: null,
    pengusulanData: [],
    sanggahanData: [],
    currentSection: 'dashboard',
    selectedPengusulan: null,
    filters: {
        search: '',
        status: ''
    },
    pagination: {
        page: 1,
        pageSize: 10,
        total: 0
    }
};

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[SIMBAKES-DASHBOARD] Initializing user dashboard...');
    
    // Check authentication
    const sessionValid = await checkAuthSession();
    
    if (!sessionValid) {
        window.location.href = 'login.html';
        return;
    }
    
    // Initialize Supabase if needed
    if (typeof simbakesDB !== 'undefined' && !simbakesDB.isInitialized) {
        try {
            await simbakesDB.init();
            console.log('[SIMBAKES-DASHBOARD] ✅ Supabase initialized');
        } catch (error) {
            console.warn('[SIMBAKES-DASHBOARD] ⚠️ Supabase init failed:', error.message);
        }
    }
    
    // Load user profile
    loadUserProfile();
    
    // Load dashboard data
    await loadDashboardData();
    
    console.log('[SIMBAKES-DASHBOARD] ✅ Dashboard ready');
});

/**
 * Check if user is authenticated
 */
async function checkAuthSession() {
    const storedUser = localStorage.getItem('simbakes_user');
    
    if (!storedUser) {
        console.warn('[SIMBAKES-DASHBOARD] No session found');
        return false;
    }
    
    try {
        DashboardState.currentUser = JSON.parse(storedUser);
        
        // Update UI with user info
        updateUserUI(DashboardState.currentUser);
        
        return true;
    } catch (e) {
        console.error('[SIMBAKES-DASHBOARD] Invalid session:', e);
        localStorage.removeItem('simbakes_user');
        return false;
    }
}

/**
 * Update sidebar with user info
 */
function updateUserUI(user) {
    // Avatar (first letter of name)
    const initial = user.nama_lengkap ? user.nama_lengkap.charAt(0).toUpperCase() : 'U';
    document.getElementById('userAvatar').textContent = initial;
    
    // Name
    document.getElementById('userName').textContent = user.nama_lengkap || 'User';
    
    // Role badge
    const roleConfig = {
        peserta: { icon: 'fa-user-graduate', label: 'Peserta' },
        admin_sekolah: { icon: 'fa-school', label: 'Admin Sekolah' },
        admin_dinkes: { icon: 'fa-hospital', label: 'Admin Dinkes' },
        reviewer: { icon: 'fa-clipboard-check', label: 'Reviewer' },
        admin: { icon: 'fa-shield-alt', label: 'Administrator' }
    };
    
    const role = roleConfig[user.role] || roleConfig.peserta;
    document.getElementById('userRoleBadge').innerHTML = `
        <i class="fas ${role.icon}"></i>
        <span>${role.label}</span>
    `;
    
    // Page subtitle
    document.getElementById('pageSubtitle').textContent = `Selamat datang, ${user.nama_lengkap || 'User'}!`;
}

// =====================================================
// NAVIGATION
// =====================================================

function showSection(sectionName) {
    DashboardState.currentSection = sectionName;
    
    // Hide all sections
    document.querySelectorAll('main > section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show target section
    const targetSection = document.getElementById('section-' + sectionName);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate clicked nav item
    event.target.closest('.nav-item')?.classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: ['Dashboard Saya', 'Ringkasan data pengusulan Anda'],
        pengusulan: ['Data Pengusulan', 'Daftar lengkap pengajuan beasiswa'],
        sanggahan: ['Sanggahan', 'Riwayat dan form sanggahan'],
        profil: ['Profil Saya', 'Informasi akun dan pengaturan']
    };
    
    if (titles[sectionName]) {
        document.getElementById('pageTitle').textContent = titles[sectionName][0];
        document.getElementById('pageSubtitle').textContent = titles[sectionName][1];
    }
    
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// =====================================================
// DATA LOADING
// =====================================================

async function loadDashboardData() {
    showLoadingState(true);
    
    try {
        // Load pengusulan data for current user
        await loadPengusulanData();
        
        // Load sanggahan data
        await loadSanggahanData();
        
        // Update stats
        updateDashboardStats();
        
        // Render tables
        renderRecentSubmissions();
        renderAllPengusulan();
        renderSanggahanTable();
        
    } catch (error) {
        console.error('[SIMBAKES-DASHBOARD] Error loading data:', error);
        showToast('Gagal memuat data. Silakan refresh halaman.', 'error');
    } finally {
        showLoadingState(false);
    }
}

/**
 * Load pengusulan data from Supabase
 */
async function loadPengusulanData() {
    try {
        let result;
        
        if (typeof simbakesDB !== 'undefined' && simbakesDB.isInitialized) {
            result = await simbakesDB.getPengusulan({
                search: DashboardState.currentUser.email || DashboardState.currentUser.username
            });
        } else if (typeof supabaseClient !== 'undefined') {
            // Direct query fallback
            const { data, error } = await supabaseClient
                .from('data_pengusulan')
                .select('*')
                .or(`email.eq.${DashboardState.currentUser.email},username.eq.${DashboardState.currentUser.username}`)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            result = { success: true, data: data || [] };
        } else {
            // Demo mode - use mock data
            result = getMockPengusulanData();
        }
        
        if (result.success) {
            DashboardState.pengusulanData = result.data || [];
            console.log(`[SIMBAKES-DASHBOARD] Loaded ${DashboardState.pengusulanData.length} pengusulan records`);
        }
        
    } catch (error) {
        console.error('[SIMBAKES-DASHBOARD] Error loading pengusulan:', error);
        DashboardState.pengusulanData = [];
    }
}

/**
 * Load sanggahan data from Supabase
 */
async function loadSanggahanData() {
    try {
        if (typeof supabaseClient !== 'undefined') {
            const { data, error } = await supabaseClient
                .from('data_sanggahan')
                .select('*')
                .eq('user_id', DashboardState.currentUser.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            DashboardState.sanggahanData = data || [];
        } else {
            DashboardState.sanggahanData = [];
        }
        
    } catch (error) {
        console.error('[SIMBAKES-DASHBOARD] Error loading sanggahan:', error);
        DashboardState.sanggahanData = [];
    }
}

// =====================================================
// STATS & RENDERING
// =====================================================

function updateDashboardStats() {
    const data = DashboardState.pengusulanData;
    
    const total = data.length;
    const diproses = data.filter(d => d.status === 'diproses' || d.status === 'diajukan').length;
    const diterima = data.filter(d => d.status === 'diterima' || d.status === 'disetujui').length;
    const perluSanggah = data.filter(d => d.status === 'ditolak' || d.status === 'dibatalkan').length;
    
    // Animate numbers
    animateValue('statTotalPengusulan', 0, total, 500);
    animateValue('statDiproses', 0, diproses, 500);
    animateValue('statDiterima', 0, diterima, 500);
    animateValue('statPerluSanggah', 0, perluSanggah, 500);
    
    // Update badges
    document.getElementById('pengusulanCount').textContent = total;
    document.getElementById('sanggahanCount').textContent = DashboardState.sanggahanData.length;
}

function animateValue(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const range = end - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const value = Math.floor(start + (range * progress));
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function renderRecentSubmissions() {
    const tbody = document.getElementById('recentSubmissionsBody');
    const recentData = DashboardState.pengusulanData.slice(0, 5);
    
    if (recentData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>Belum ada data</h3>
                        <p>Mulai ajukan beasiswa Anda sekarang</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recentData.map((item, index) => `
        <tr>
            <td><strong>${item.no_register || '-'}</strong></td>
            <td>${item.nama_lengkap || '-'}</td>
            <td>${item.jurusan_tujuan || item.program_studi || '-'}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>${formatDate(item.created_at || item.tanggal_pengajuan)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" onclick="viewDetail('${item.nik || item.id}')" title="Lihat Detail">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${(item.status === 'ditolak' || item.status === 'dibatalkan') ? `
                        <button class="action-btn sanggah" onclick="openModalSanggahWithNIK('${item.nik || item.id}')" title="Ajukan Sanggahan">
                            <i class="fas fa-gavel"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function renderAllPengusulan() {
    const tbody = document.getElementById('allPengusulanBody');
    
    // Apply filters
    let filteredData = [...DashboardState.pengusulanData];
    
    if (DashboardState.filters.search) {
        const search = DashboardState.filters.search.toLowerCase();
        filteredData = filteredData.filter(item =>
            (item.nama_lengkap || '').toLowerCase().includes(search) ||
            (item.no_register || '').toLowerCase().includes(search) ||
            (item.jurusan_tujuan || '').toLowerCase().includes(search)
        );
    }
    
    if (DashboardState.filters.status) {
        filteredData = filteredData.filter(item => item.status === DashboardState.filters.status);
    }
    
    // Pagination
    DashboardState.pagination.total = filteredData.length;
    const start = (DashboardState.pagination.page - 1) * DashboardState.pagination.pageSize;
    const paginatedData = filteredData.slice(start, start + DashboardState.pagination.pageSize);
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <h3>Tidak ada data pengusulan</h3>
                        <p>Ajukan beasiswa baru untuk memulai</p>
                    </div>
                </td>
            </tr>
        `;
        renderPagination(1);
        return;
    }
    
    tbody.innerHTML = paginatedData.map(item => `
        <tr>
            <td><strong>${item.no_register || '-'}</strong></td>
            <td>${item.nama_lengkap || '-'}</td>
            <td>${item.institusi_asal || '-'}</td>
            <td>${item.jurusan_tujuan || item.program_studi || '-'}</td>
            <td>${getStatusBadge(item.status)}</td>
            <td>${formatDate(item.created_at || item.tanggal_pengajuan)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" onclick="viewDetail('${item.nik || item.id}')" title="Lihat Detail">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${(item.status === 'ditolak' || item.status === 'dibatalkan') ? `
                        <button class="action-btn sanggah" onclick="openModalSanggahWithNIK('${item.nik || item.id}')" title="Ajukan Sanggahan">
                            <i class="fas fa-gavel"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    renderPagination(Math.ceil(filteredData.length / DashboardState.pagination.pageSize));
}

function renderSanggahanTable() {
    const tbody = document.getElementById('sanggahanBody');
    const data = DashboardState.sanggahanData;
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-gavel"></i>
                        <h3>Belum ada sanggahan</h3>
                        <p>Riwayat sanggahan akan muncul di sini</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(item => `
        <tr>
            <td><strong>${item.id_sanggahan || item.id}</strong></td>
            <td>${item.no_register || '-'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${item.alasan_penolakan || '-'}">${item.alasan_penolakan || '-'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${item.alasan_sanggahan || '-'}">${item.alasan_sanggahan || '-'}</td>
            <td>${getSanggahStatusBadge(item.status_sanggahan || item.status)}</td>
            <td>${formatDate(item.created_at || item.tanggal_sanggah)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn view" onclick="viewSanggahDetail('${item.id}')" title="Lihat Detail">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button class="page-btn" onclick="goToPage(${DashboardState.pagination.page - 1})" ${DashboardState.pagination.page === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= DashboardState.pagination.page - 2 && i <= DashboardState.pagination.page + 2)) {
            html += `<button class="page-btn ${i === DashboardState.pagination.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === DashboardState.pagination.page - 3 || i === DashboardState.pagination.page + 3) {
            html += '<span style="padding:8px">...</span>';
        }
    }
    
    // Next button
    html += `<button class="page-btn" onclick="goToPage(${DashboardState.pagination.page + 1})" ${DashboardState.pagination.page === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    container.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil(DashboardState.pagination.total / DashboardState.pagination.pageSize);
    if (page < 1 || page > totalPages) return;
    
    DashboardState.pagination.page = page;
    renderAllPengusulan();
}

// =====================================================
// FILTERING
// =====================================================

function filterPengusulan(value) {
    DashboardState.filters.search = value;
    DashboardState.pagination.page = 1;
    renderAllPengusulan();
}

function filterByStatus(status) {
    DashboardState.filters.status = status;
    DashboardState.pagination.page = 1;
    renderAllPengusulan();
}

// =====================================================
// DETAIL VIEW
// =====================================================

function viewDetail(nikOrId) {
    const item = DashboardState.pengusulanData.find(d => d.nik === nikOrId || d.id === nikOrId);
    
    if (!item) {
        showToast('Data tidak ditemukan', 'error');
        return;
    }
    
    DashboardState.selectedPengusulan = item;
    
    const content = document.getElementById('detailPengusulanContent');
    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">No. Register</div>
                <div class="detail-value">${item.no_register || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Status</div>
                <div class="detail-value">${getStatusBadge(item.status)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">NIK</div>
                <div class="detail-value">${item.nik || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Nama Lengkap</div>
                <div class="detail-value">${item.nama_lengkap || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Tempat, Tanggal Lahir</div>
                <div class="detail-value">${item.tempat_lahir || '-'}, ${formatDate(item.tanggal_lahir)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Jenis Kelamin</div>
                <div class="detail-value">${item.jenis_kelamin || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">No. HP</div>
                <div class="detail-value">${item.no_hp || item.no_telepon || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Email</div>
                <div class="detail-value">${item.email || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Institusi Asal</div>
                <div class="detail-value">${item.institusi_asal || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Jurusan Tujuan</div>
                <div class="detail-value">${item.jurusan_tujuan || item.program_studi || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Jenjang Pendidikan</div>
                <div class="detail-value">${item.jenjang_pendidikan || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Universitas Tujuan</div>
                <div class="detail-value">${item.universitas_tujuan || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Periode Pemberian</div>
                <div class="detail-value">${item.periode_pemberian || '-'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Tanggal Pengajuan</div>
                <div class="detail-value">${formatDate(item.created_at || item.tanggal_pengajuan)}</div>
            </div>
        </div>
        
        <hr style="margin:24px 0;border:none;border-top:1px solid var(--border-color)">
        
        <h4 style="font-size:15px;font-weight:700;margin-bottom:12px;">Proposal/Deskripsi</h4>
        <div class="detail-item" style="grid-column: span 2;">
            <div class="detail-label">Judul Proposal</div>
            <div class="detail-value" style="font-weight:600;color:var(--primary);">${item.judul_proposal || item.judul || '-'}</div>
        </div>
        <div class="detail-item" style="grid-column: span 2;">
            <div class="detail-label">Penjelasan</div>
            <div class="detail-value" style="white-space:pre-wrap;">${item.penjelasan || item.deskripsi || '-'}</div>
        </div>
        
        ${item.catatan_reviewer ? `
        <hr style="margin:24px 0;border:none;border-top:1px solid var(--border-color)">
        <h4 style="font-size:15px;font-weight:700;margin-bottom:12px;">Catatan Reviewer</h4>
        <div class="alert alert-info" style="margin:0;">
            <i class="fas fa-comment-alt"></i>
            <span>${item.catatan_reviewer}</span>
        </div>
        ` : ''}
        
        ${item.alasan_penolakan ? `
        <hr style="margin:24px 0;border:none;border-top:1px solid var(--border-color)">
        <h4 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#dc2626;">Alasan Penolakan/Pembatalan</h4>
        <div class="alert alert-error" style="margin:0;">
            <i class="fas fa-exclamation-circle"></i>
            <span>${item.alasan_penolakan}</span>
        </div>
        ` : ''}
    `;
    
    // Show/hide sanggah button based on status
    const btnSanggah = document.getElementById('btnSanggahFromDetail');
    if (btnSanggah) {
        btnSanggah.style.display = (item.status === 'ditolak' || item.status === 'dibatalkan') ? 'inline-flex' : 'none';
    }
    
    openModal('modalDetailPengusulan');
}

// =====================================================
// SANGGAHAN FUNCTIONS
// =====================================================

function openModalSanggahWithNIK(nikOrId) {
    const item = DashboardState.pengusulanData.find(d => d.nik === nikOrId || d.id === nikOrId);
    
    if (!item) {
        showToast('Data pengusulan tidak ditemukan', 'error');
        return;
    }
    
    DashboardState.selectedPengusulan = item;
    openModalSanggah();
}

function openModalSanggah() {
    if (!DashboardState.selectedPengusulan) {
        showToast('Pilih pengusulan terlebih dahulu', 'warning');
        return;
    }
    
    const item = DashboardState.selectedPengusulan;
    
    // Pre-fill form
    document.getElementById('sanggahNik').value = item.nik || item.id;
    document.getElementById('sanggahNoRegister').value = item.no_register || '-';
    document.getElementById('sanggahStatus').value = getStatusText(item.status);
    
    // Reset other fields
    document.getElementById('sanggahJenis').value = '';
    document.getElementById('sanggahAlasan').value = '';
    document.getElementById('sanggahBukti').value = '';
    document.getElementById('sanggahSetuju').checked = false;
    
    closeModal('modalDetailPengusulan');
    openModal('modalFormSanggah');
}

async function submitSanggahan() {
    // Validate form
    const jenis = document.getElementById('sanggahJenis').value;
    const alasan = document.getElementById('sanggahAlasan').value.trim();
    const bukti = document.getElementById('sanggahBukti').value.trim();
    const setuju = document.getElementById('sanggahSetuju').checked;
    
    if (!jenis) {
        showToast('Pilih jenis sanggahan', 'error');
        return;
    }
    
    if (!alasan) {
        showToast('Isi alasan sanggahan', 'error');
        return;
    }
    
    if (!setuju) {
        showToast('Anda harus menyetujui pernyataan kebenaran data', 'error');
        return;
    }
    
    const item = DashboardState.selectedPengusulan;
    
    // Prepare sanggahan data
    const sanggahanData = {
        id_sanggahan: 'SG-' + Date.now(),
        user_id: DashboardState.currentUser.id,
        nik: item.nik || item.id,
        no_register: item.no_register,
        status_asal: item.status,
        alasan_penolakan: item.alasan_penolakan || '',
        jenis_sanggahan: jenis,
        alasan_sanggahan: alasan,
        bukti_pendukung: bukti,
        status_sanggahan: 'menunggu_review',
        created_at: new Date().toISOString()
    };
    
    try {
        // Save to Supabase
        if (typeof supabaseClient !== 'undefined') {
            const { data, error } = await supabaseClient
                .from('data_sanggahan')
                .insert([sanggahanData])
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('[SIMBAKES-DASHBOARD] Sanggahan submitted:', data);
        }
        
        // Update local state
        DashboardState.sanggahanData.unshift(sanggahanData);
        
        // Update pengusulan status to "disinggah"
        if (typeof supabaseClient !== 'undefined') {
            await supabaseClient
                .from('data_pengusulan')
                .update({ status: 'disanggah' })
                .eq('nik', item.nik || item.id);
        }
        
        // Refresh data
        await loadPengusulanData();
        renderAllPengusulan();
        renderRecentSubmissions();
        renderSanggahanTable();
        updateDashboardStats();
        
        closeModal('modalFormSanggah');
        showToast('Sanggahan berhasil dikirim! Menunggu review.', 'success');
        
    } catch (error) {
        console.error('[SIMBAKES-DASHBOARD] Error submitting sanggahan:', error);
        showToast('Gagal mengirim sanggahan. Silakan coba lagi.', 'error');
    }
}

// =====================================================
// NEW PENGUSULAN
// =====================================================

function openModalPengusulanBaru() {
    // Reset form
    document.getElementById('formPengusulanBaru').reset();
    openModal('modalPengusulanBaru');
}

async function submitPengusulanBaru(event) {
    event.preventDefault();
    
    // Gather form data
    const formData = {
        id: generateUUID(),
        nik: document.getElementById('newNik').value,
        nama_lengkap: document.getElementById('newNamaLengkap').value,
        tempat_lahir: document.getElementById('newTempatLahir').value,
        tanggal_lahir: document.getElementById('newTanggalLahir').value,
        jenis_kelamin: document.getElementById('newJenisKelamin').value,
        no_hp: document.getElementById('newNoHP').value,
        email: document.getElementById('newEmail').value,
        institusi_asal: document.getElementById('newInstitusiAsal').value,
        jurusan_tujuan: document.getElementById('newJurusanTujuan').value,
        jenjang_pendidikan: document.getElementById('newJenjangPendidikan').value,
        universitas_tujuan: document.getElementById('newUniversitasTujuan').value,
        periode_pemberian: document.getElementById('newPeriodePemberian').value,
        judul_proposal: document.getElementById('newJudulProposal').value,
        penjelasan: document.getElementById('newPenjelasan').value,
        username: DashboardState.currentUser.username,
        user_id: DashboardState.currentUser.id,
        status: 'diajukan',
        no_register: 'REG-' + Date.now(),
        created_at: new Date().toISOString()
    };
    
    try {
        // Save to Supabase
        if (typeof supabaseClient !== 'undefined') {
            const { data, error } = await supabaseClient
                .from('data_pengusulan')
                .insert([formData])
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('[SIMBAKES-DASHBOARD] Pengusulan submitted:', data);
        }
        
        // Refresh data
        await loadPengusulanData();
        renderRecentSubmissions();
        renderAllPengusulan();
        updateDashboardStats();
        
        closeModal('modalPengusulanBaru');
        showToast('Pengajuan beasiswa berhasil dikirim!', 'success');
        
    } catch (error) {
        console.error('[SIMBAKES-DASHBOARD] Error submitting pengusulan:', error);
        showToast('Gagal mengirim pengajuan. Silakan coba lagi.', 'error');
    }
}

// =====================================================
// PROFILE FUNCTIONS
// =====================================================

async function loadUserProfile() {
    const user = DashboardState.currentUser;
    
    if (!user) return;
    
    // Fill profile fields
    document.getElementById('profilNama').textContent = user.nama_lengkap || '-';
    document.getElementById('profilUsername').textContent = user.username || '-';
    document.getElementById('profilEmail').textContent = user.email || '-';
    document.getElementById('profilRole').textContent = user.role || '-';
    document.getElementById('profilInstitusi').textContent = user.institusi || '-';
    document.getElementById('profilTanggalDaftar').textContent = formatDate(user.loginTime) || '-';
    document.getElementById('profilLastLogin').textContent = new Date().toLocaleString('id-ID');
}

async function handleChangePassword(event) {
    event.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('Konfirmasi password tidak cocok', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showToast('Password minimal 8 karakter', 'error');
        return;
    }
    
    try {
        // In production, this should call an API/Edge Function to securely change password
        // For now, we'll update directly (NOT recommended for production!)
        
        if (typeof supabaseClient !== 'undefined') {
            const { error } = await supabaseClient
                .from('multiusers')
                .update({ password: newPassword }) // Hash in production!
                .eq('id', DashboardState.currentUser.id);
            
            if (error) throw error;
        }
        
        // Reset form
        event.target.reset();
        
        showToast('Password berhasil diubah!', 'success');
        
    } catch (error) {
        console.error('[SIMBAKES-DASHBOARD] Error changing password:', error);
        showToast('Gagal mengubah password. Silakan coba lagi.', 'error');
    }
}

// =====================================================
// LOGOUT
// =====================================================

function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        if (typeof logout === 'function') {
            logout();
        } else {
            localStorage.removeItem('simbakes_user');
            window.location.href = 'login.html';
        }
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function getStatusBadge(status) {
    const config = {
        diajukan: { class: 'status-diajukan', label: 'Diajukan', icon: 'fa-paper-plane' },
        diproses: { class: 'status-diproses', label: 'Diproses', icon: 'fa-clock' },
        diterima: { class: 'status-diterima', label: 'Diterima', icon: 'fa-check-circle' },
        disetujui: { class: 'status-diterima', label: 'Disetujui', icon: 'fa-check-double' },
        ditolak: { class: 'status-ditolak', label: 'Ditolak', icon: 'fa-times-circle' },
        dibatalkan: { class: 'status-dibatalkan', label: 'Dibatalkan', icon: 'fa-ban' },
        disanggah: { class: 'status-sanggah', label: 'Disanggah', icon: 'fa-gavel' }
    };
    
    const s = config[status] || { class: '', label: status || '-', icon: 'fa-question' };
    
    return `<span class="status-badge ${s.class}">
        <i class="fas ${s.icon}"></i> ${s.label}
    </span>`;
}

function getSanggahStatusBadge(status) {
    const config = {
        menunggu_review: { class: 'status-diproses', label: 'Menunggu Review' },
        direview: { class: 'status-diajukan', label: 'Sedang Direview' },
        diterima: { class: 'status-diterima', label: 'Sanggahan Diterima' },
        ditolak: { class: 'status-ditolak', label: 'Sanggahan Ditolak' }
    };
    
    const s = config[status] || { class: '', label: status || '-', icon: 'fa-question' };
    
    return `<span class="status-badge ${s.class}">${s.label}</span>`;
}

function getStatusText(status) {
    const map = {
        diajukan: 'Diajukan',
        diproses: 'Sedang Diproses',
        diterima: 'Diterima',
        disetujui: 'Disetujui',
        ditolak: 'Ditolak',
        dibatalkan: 'Dibatalkan'
    };
    return map[status] || status || '-';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return '-';
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('show');
    document.body.style.overflow = '';
}

function showLoadingState(show) {
    // Could add a loading overlay here
    console.log(show ? 'Loading...' : 'Done loading');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        success: 'fas fa-check-circle text-success',
        error: 'fas fa-exclamation-circle text-danger',
        warning: 'fas fa-exclamation-triangle text-warning',
        info: 'fas fa-info-circle text-secondary'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="${icons[type]} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Mock data for demo mode (when Supabase is not connected)
function getMockPengusulanData() {
    return {
        success: true,
        data: [
            {
                id: 'mock-1',
                nik: '1234567890123456',
                nama_lengkap: DashboardState.currentUser?.nama_lengkap || 'User Demo',
                email: DashboardState.currentUser?.email || 'user@demo.com',
                no_register: 'REG-DEMO-001',
                status: 'diterima',
                jurusan_tujuan: 'Keperawatan',
                jenjang_pendidikan: 'S1',
                universitas_tujuan: 'Universitas Indonesia',
                created_at: new Date().toISOString(),
                judul_proposal: 'Peningkatan Kualitas Pelayanan Keperawatan'
            },
            {
                id: 'mock-2',
                nik: '1234567890123457',
                nama_lengkap: DashboardState.currentUser?.nama_lengkap || 'User Demo',
                email: DashboardState.currentUser?.email || 'user@demo.com',
                no_register: 'REG-DEMO-002',
                status: 'ditolak',
                alasan_penolakan: 'Dokumen tidak lengkap - Kurang surat rekomendasi',
                jurusan_tujuan: 'Kesehatan Masyarakat',
                jenjang_pendidikan: 'S2',
                universitas_tujuan: 'Universitas Airlangga',
                created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                judul_proposal: 'Evaluasi Program Imunisasi Nasional'
            }
        ]
    };
}

// Make functions globally available
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.viewDetail = viewDetail;
window.openModalSanggah = openModalSanggah;
window.openModalSanggahWithNIK = openModalSanggahWithNIK;
window.submitSanggahan = submitSanggahan;
window.openModalPengusulanBaru = openModalPengusulanBaru;
window.submitPengusulanBaru = submitPengusulanBaru;
window.handleLogout = handleLogout;
window.filterPengusulan = filterPengusulan;
window.filterByStatus = filterByStatus;
window.goToPage = goToPage;
