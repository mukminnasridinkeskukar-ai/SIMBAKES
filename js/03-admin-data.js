// ===== LULUS TES MASUK PT - DATA LOADING =====

/**
 * Load data Lulus Tes Masuk PT dari Supabase tabel penetapan
 * Menampilkan dalam bentuk Kartu individual per peserta
 */
async function loadLulusTesData() {
    const container = document.getElementById('lulus-tes-container');
    const loading = document.getElementById('lulus-tes-loading');
    const error = document.getElementById('lulus-tes-error');
    const empty = document.getElementById('lulus-tes-empty');
    const stats = document.getElementById('lulus-tes-stats');
    
    // Reset states
    container.innerHTML = '';
    loading.style.display = 'block';
    error.style.display = 'none';
    empty.style.display = 'none';
    stats.style.display = 'flex';
    
    // Update stats to loading state
    document.getElementById('lulus-total-peserta').textContent = '...';
    document.getElementById('lulus-total-jurusan').textContent = '...';
    
    try {
        console.log('📡 Mengambil data penetapan dari Supabase...');
        
        // Fetch ALL data from penetapan table via Supabase
        const { data: penetapanData, error: supabaseError } = await supabaseClient
            .from('penetapan')
            .select('*')
            .order('nama_lengkap', { ascending: true });
        
        // Hide loading
        loading.style.display = 'none';
        
        if (supabaseError) {
            throw new Error(supabaseError.message || 'Gagal mengambil data dari server');
        }
        
        console.log('✅ Data penetapan diterima:', penetapanData?.length, 'records');
        
        // Check if data exists
        if (!penetapanData || penetapanData.length === 0) {
            empty.style.display = 'block';
            stats.style.display = 'none';
            return;
        }
        
        // Calculate unique jurusan for stats
        const uniqueJurusan = [...new Set(penetapanData.map(item => 
            item.jurusan_tujuan || item.jurusanTujuan || '-'
        ))];
        
        // Update stats
        document.getElementById('lulus-total-peserta').textContent = penetapanData.length;
        document.getElementById('lulus-total-jurusan').textContent = uniqueJurusan.length;
        
        // Render individual cards for each peserta
        renderPesertaCards(penetapanData);
        
    } catch (err) {
        console.error('❌ Error loading Lulus Tes data:', err);
        loading.style.display = 'none';
        error.style.display = 'block';
        document.getElementById('lulus-tes-error-msg').textContent = err.message || 'Terjadi kesalahan saat memuat data';
        stats.style.display = 'none';
    }
}

/**
 * Render Individual Cards untuk setiap Peserta
 * Setiap kartu menampilkan foto dan info singkat dengan warna berbeda
 * @param {Array} data - Array of peserta records from penetapan table
 */
function renderPesertaCards(data) {
    const container = document.getElementById('lulus-tes-container');
    container.innerHTML = '';
    
    // Color palette for individual cards (10 colors, cycling)
    const cardColors = [
        'card-color-1',   // Merah
        'card-color-2',   // Biru
        'card-color-3',   // Hijau
        'card-color-4',   // Ungu
        'card-color-5',   // Oranye
        'card-color-6',   // Pink
        'card-color-7',   // Cyan
        'card-color-8',   // Kuning
        'card-color-9',   // Indigo
        'card-color-10'   // Teal
    ];

    // Field mapping helper (snake_case from Supabase -> display)
    const getField = (item, ...keys) => {
        for (const key of keys) {
            if (item[key]) return item[key];
        }
        return '-';
    };

    data.forEach((peserta, index) => {
        const colorClass = cardColors[index % cardColors.length];
        
        // Extract fields with fallback mapping
        const namaLengkap = getField(peserta, 'nama_lengkap', 'namaLengkap');
        const jurusan = getField(peserta, 'jurusan_tujuan', 'jurusanTujuan', 'jurusan');
        const jenjang = getField(peserta, 'jenjang_pendidikan', 'jenjangPendidikan', 'jenjang');
        const perguruanTinggi = getField(peserta, 'perguruan_tinggi', 'perguruanTinggi', 'pt');
        const unitPendayaguna = getField(peserta, 'unit_kerja', 'unitKerja', 'unit_tujuan', 'unitTujuan', 'unit_pendayaguna', 'unit_pendayagunaan');
        const linkFoto = getField(peserta, 'link_foto', 'linkFoto', 'foto', 'photo');
        const statusPenetapan = getField(peserta, 'status_penetapan', 'statusPenetapan', 'status', 'Lulus');

        // Generate SMART PHOTO HTML dengan multi-fallback support
        const safeNama = escapeHtml(namaLengkap);
        const photoHtml = generateSmartPhotoHtml(linkFoto, safeNama, 'medium');

        // Create card element
        const card = document.createElement('div');
        card.className = `peserta-card ${colorClass}`;
        card.onclick = () => showPesertaDetailModal(peserta);
        
        card.innerHTML = `
            <div class="peserta-card-photo-wrapper">
                ${photoHtml || `<div style="width:100%;height:100%;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);display:flex;align-items:center;justify-content:center;font-size:5rem;">👤</div>`}
                <div class="peserta-card-overlay"></div>
                <div class="peserta-card-name-badge">
                    <h4>${safeNama}</h4>
                </div>
            </div>
            <div class="peserta-card-body">
                <div class="peserta-card-info">
                    <div class="peserta-card-info-item">
                        <span class="peserta-card-info-icon">🎓</span>
                        <span class="peserta-card-info-text">
                            <strong>Jurusan</strong>
                            ${escapeHtml(jurusan)}
                        </span>
                    </div>
                    <div class="peserta-card-info-item">
                        <span class="peserta-card-info-icon">📚</span>
                        <span class="peserta-card-info-text">
                            <strong>Jenjang</strong>
                            ${escapeHtml(jenjang)}
                        </span>
                    </div>
                    <div class="peserta-card-info-item">
                        <span class="peserta-card-info-icon">🏛️</span>
                        <span class="peserta-card-info-text">
                            <strong>Perguruan Tinggi</strong>
                            ${escapeHtml(perguruanTinggi)}
                        </span>
                    </div>
                    <div class="peserta-card-info-item">
                        <span class="peserta-card-info-icon">🏢</span>
                        <span class="peserta-card-info-text">
                            <strong>Unit Pendayaguna</strong>
                            ${escapeHtml(unitPendayaguna)}
                        </span>
                    </div>
                </div>
                <button class="peserta-card-view-btn" onclick="event.stopPropagation(); showPesertaDetailModal(${JSON.stringify(peserta).replace(/"/g, '&quot;')})">
                    👁️ Lihat Detail
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    console.log(`✅ Rendered ${data.length} kartu peserta untuk Lulus Tes Masuk PT`);
}

/**
 * Show Popup Modal with Photo and Complete Data
 * @param {Object} peserta - Single peserta record from penetapan table
 */
function showPesertaDetailModal(peserta) {
    // Remove existing modal if any
    const existingModal = document.getElementById('peserta-detail-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Field mapping helper
    const getField = (item, ...keys) => {
        for (const key of keys) {
            if (item[key]) return item[key];
        }
        return '-';
    };

    // Extract all fields
    const namaLengkap = getField(peserta, 'nama_lengkap', 'namaLengkap');
    const nik = getField(peserta, 'nik', 'no_ktp');
    const jurusan = getField(peserta, 'jurusan_tujuan', 'jurusanTujuan', 'jurusan');
    const jenjang = getField(peserta, 'jenjang_pendidikan', 'jenjangPendidikan', 'jenjang');
    const perguruanTinggi = getField(peserta, 'perguruan_tinggi', 'perguruanTinggi', 'pt');
    const unitKerja = getField(peserta, 'unit_kerja', 'unitKerja', 'unit_tujuan', 'unitTujuan', 'unit_pendayagunaan');
    const linkFoto = getField(peserta, 'link_foto', 'linkFoto', 'foto', 'photo');
    const noSK = getField(peserta, 'no_sk_penetapan', 'noSKPenetapan', 'no_sk');
    const tanggalPenetapan = getField(peserta, 'tanggal_penetapan', 'tanggalPenetapan', 'tanggal');
    const statusPenetapan = getField(peserta, 'status_penetapan', 'statusPenetapan', 'status', 'Lulus');

    // Generate SMART PHOTO HTML dengan resolusi MAX untuk modal
    const safeNama = escapeHtml(namaLengkap);
    const modalPhotoHtml = generateSmartPhotoHtml(linkFoto, safeNama, 'large');
    
    // Get best URL for click-to-zoom functionality
    const bestPhotoUrl = getBestImageUrl(linkFoto, 'max');

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'peserta-detail-modal';
    modalOverlay.className = 'peserta-modal-overlay';
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) closePesertaDetailModal();
    };

    modalOverlay.innerHTML = `
        <div class="peserta-modal">
            <div class="peserta-modal-photo-section" style="cursor:pointer;" onclick="if('${bestPhotoUrl}' && '${bestPhotoUrl}'.length > 10) openPhotoModal('${bestPhotoUrl}', '${safeNama}', '${escapeHtml(linkFoto)}')">
                ${modalPhotoHtml || `<div style="width:100%;height:100%;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);display:flex;align-items:center;justify-content:center;font-size:6rem;">👤</div>`}
                <div class="peserta-modal-photo-gradient"></div>
                <button class="peserta-modal-close" onclick="event.stopPropagation();closePesertaDetailModal()">✕</button>
                ${linkFoto && linkFoto !== '-' ? `<div class="peserta-modal-zoom-hint" style="position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,0.6);color:white;padding:6px 12px;border-radius:20px;font-size:0.75rem;display:flex;align-items:center;gap:4px;">🔍 Klik untuk perbesar</div>` : ''}
            </div>
            <div class="peserta-modal-body">
                <h2 class="peserta-modal-name">${escapeHtml(namaLengkap)}</h2>
                <div class="peserta-modal-status">
                    ✅ ${escapeHtml(statusPenetapan)}
                </div>
                <div class="peserta-modal-grid">
                    <div class="peserta-modal-field">
                        <span class="peserta-modal-field-label">Nama Lengkap</span>
                        <div class="peserta-modal-field-value">
                            <span class="peserta-modal-field-icon">👤</span>
                            ${escapeHtml(namaLengkap)}
                        </div>
                    </div>
                    <div class="peserta-modal-field">
                        <span class="peserta-modal-field-label">NIK</span>
                        <div class="peserta-modal-field-value">
                            <span class="peserta-modal-field-icon">🆔</span>
                            <span style="font-family:monospace;">${escapeHtml(nik)}</span>
                        </div>
                    </div>
                    <div class="peserta-modal-field">
                        <span class="peserta-modal-field-label">Jurusan</span>
                        <div class="peserta-modal-field-value">
                            <span class="peserta-modal-field-icon">🎓</span>
                            ${escapeHtml(jurusan)}
                        </div>
                    </div>
                    <div class="peserta-modal-field">
                        <span class="peserta-modal-field-label">Jenjang Pendidikan</span>
                        <div class="peserta-modal-field-value">
                            <span class="peserta-modal-field-icon">📚</span>
                            ${escapeHtml(jenjang)}
                        </div>
                    </div>
                    <div class="peserta-modal-field">
                        <span class="peserta-modal-field-label">Perguruan Tinggi</span>
                        <div class="peserta-modal-field-value">
                            <span class="peserta-modal-field-icon">🏛️</span>
                            ${escapeHtml(perguruanTinggi)}
                        </div>
                    </div>
                    <div class="peserta-modal-field">
                        <span class="peserta-modal-field-label">Unit Pendayaguna</span>
                        <div class="peserta-modal-field-value">
                            <span class="peserta-modal-field-icon">🏢</span>
                            ${escapeHtml(unitPendayaguna)}
                        </div>
                    </div>
                    ${noSK && noSK !== '-' ? `
                    <div class="peserta-modal-field">
                        <span class="peserta-modal-field-label">No SK Penetapan</span>
                        <div class="peserta-modal-field-value">
                            <span class="peserta-modal-field-icon">📄</span>
                            ${escapeHtml(noSK)}
                        </div>
                    </div>
                    ` : ''}
                    ${tanggalPenetapan && tanggalPenetapan !== '-' ? `
                    <div class="peserta-modal-field">
                        <span class="peserta-modal-field-label">Tanggal Penetapan</span>
                        <div class="peserta-modal-field-value">
                            <span class="peserta-modal-field-icon">📅</span>
                            ${escapeHtml(tanggalPenetapan)}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    // Trigger animation
    requestAnimationFrame(() => {
        modalOverlay.classList.add('active');
    });

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    console.log('📋 Menampilkan detail peserta:', namaLengkap);
}

/**
 * Close Peserta Detail Modal
 */
function closePesertaDetailModal() {
    const modal = document.getElementById('peserta-detail-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// ===== DATA PENETAPAN ADMIN - FULL CRUD FUNCTIONS =====

// Global variables for Penetapan Admin
let penetapanAllData = [];           // Store ALL data from Supabase
let penetapanFilteredData = [];      // Store filtered data for display
let penetapanCurrentPage = 1;
let penetapanPageSize = 10;
let penetapanEditingId = null;       // Track which record is being edited

/**
 * Initialize and Load Data Penetapan when page is shown
 */
function initPenetapanAdmin() {
    console.log('🔄 Initializing Data Penetapan Admin...');
    
    // Initialize pagination
    PaginationManager.init('penetapan', penetapanPageSize);
    
    // Load data from Supabase
    refreshDataPenetapan();
}

/**
 * PERMISSION GUARD: Cek akses sebelum operasi Penetapan
 * Mencegah operator mengakses via console/URL langsung
 */
function checkPenetapanPermission() {
    console.log('=== PENETAPAN PERMISSION CHECK ===');
    
    // Jika tidak login, tolak
    if (!isAdminAuthenticated()) {
        console.warn('[PENETAPAN] ❌ Not authenticated');
        showToast('🔐 Silakan login terlebih dahulu', 'error', 3000);
        return false;
    }
    
    // Jika role operator, tolak akses penetapan
    const userRole = getCurrentUserRole();
    console.log('[PENETAPAN] Current role:', userRole, '| Type:', typeof userRole);
    
    // 🔧 FIX: Superadmin SELALU diizinkan!
    if (userRole === 'superadmin' || userRole === 'admin') {
        console.log('[PENETAPAN] ✅ GRANTED - Superadmin/Admin access');
        return true;
    }
    
    if (userRole === 'operator') {
        showToast('🚫 Akses ditolak. Operator tidak memiliki izin untuk mengakses Data Penetapan.', 'error', 4000);
        console.error('[SECURITY] 🔒 Operator attempted Penetapan access - BLOCKED');
        return false;
    }
    
    // Cek permission tambahan
    const hasPerm = hasPermission('penetapan');
    console.log('[PENETAPAN] hasPermission("penetapan"):', hasPerm);
    
    if (!hasPerm) {
        showToast('🚫 Anda tidak memiliki izin untuk mengakses Data Penetapan.', 'error', 4000);
        return false;
    }
    
    console.log('[PENETAPAN] ✅ ACCESS GRANTED');
    return true;
}

/**
 * Refresh/Reload Data from Supabase
 */
async function refreshDataPenetapan() {
    // SECURITY: Check permission before loading penetapan data
    if (!checkPenetapanPermission()) {
        return; // Access denied, stop execution
    }
    
    const loadingEl = document.getElementById('penetapan-loading-state');
    const errorEl = document.getElementById('penetapan-error-state');
    const emptyEl = document.getElementById('penetapan-empty-state');
    const tableContainer = document.getElementById('penetapan-table-container');
    
    // Show loading state
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    emptyEl.style.display = 'none';
    tableContainer.style.display = 'none';
    
    try {
        console.log('📡 Fetching data penetapan from Supabase...');
        
        // Fetch ALL records from penetapan table
        const { data: penetapanData, error: supabaseError } = await supabaseClient
            .from('penetapan')
            .select('*')
            .order('created_at', { ascending: false })
            .order('nama_lengkap', { ascending: true });
        
        if (supabaseError) {
            throw new Error(supabaseError.message || 'Gagal mengambil data dari server');
        }
        
        console.log(`✅ Received ${penetapanData?.length || 0} records from Supabase`);
        
        // Store all data globally
        penetapanAllData = penetapanData || [];
        penetapanFilteredData = [...penetapanAllData];
        
        // Hide loading
        loadingEl.style.display = 'none';
        
        // Check if empty
        if (penetapanAllData.length === 0) {
            emptyEl.style.display = 'block';
            updatePenetapanStats();
            return;
        }
        
        // Update stats
        updatePenetapanStats();
        
        // Populate jurusan filter dropdown
        populateJurusanFilter();
        
        // Render table with pagination
        renderPenetapanTable();
        
        // Show table container
        tableContainer.style.display = 'block';
        
    } catch (err) {
        console.error('❌ Error loading data penetapan:', err);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        document.getElementById('penetapan-error-message').textContent = err.message || 'Terjadi kesalahan saat memuat data';
    }
}

/**
 * Update Statistics Cards
 */
function updatePenetapanStats() {
    const total = penetapanAllData.length;
    
    // Count by status
    const lulusCount = penetapanAllData.filter(item => {
        const status = (item.status_penetapan || item.statusPenetapan || item.status || '').toLowerCase();
        return status.includes('lulus') || status.includes('approve') || status.includes('diterima');
    }).length;
    
    const pendingCount = penetapanAllData.filter(item => {
        const status = (item.status_penetapan || item.statusPenetapan || item.status || '').toLowerCase();
        return status.includes('pending') || status.includes('proses') || status === '' || status === '-';
    }).length;
    
    const ditolakCount = penetapanAllData.filter(item => {
        const status = (item.status_penetapan || item.statusPenetapan || item.status || '').toLowerCase();
        return status.includes('tolak') || status.includes('reject') || status.includes('ditolak');
    }).length;
    
    // Update DOM with animation
    animateValue('stat-total-penetapan', total);
    animateValue('stat-lulus-penetapan', lulusCount);
    animateValue('stat-pending-penetapan', pendingCount);
    animateValue('stat-ditolak-penetapan', ditolakCount);
}

/**
 * Animate number value change
 */
function animateValue(elementId, endValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const startValue = parseInt(el.textContent) || 0;
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);
        el.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Populate Jurusan Filter Dropdown
 */
function populateJurusanFilter() {
    const select = document.getElementById('penetapan-filter-jurusan');
    if (!select) return;
    
    // Get unique jurusan values
    const jurusanSet = new Set();
    penetapanAllData.forEach(item => {
        const jurusan = item.jurusan_tujuan || item.jurusanTujuan || item.jurusan || '';
        if (jurusan && jurusan !== '-') {
            jurusanSet.add(jurusan);
        }
    });
    
    // Clear existing options except first
    select.innerHTML = '<option value="">Semua Jurusan</option>';
    
    // Add options sorted alphabetically
    Array.from(jurusanSet).sort().forEach(jurusan => {
        const option = document.createElement('option');
        option.value = jurusan;
        option.textContent = jurusan;
        select.appendChild(option);
    });
}

/**
 * Filter Data based on search input and dropdowns
 */
function filterPenetapanData() {
    const searchTerm = (document.getElementById('penetapan-search-input')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('penetapan-filter-status')?.value || '';
    const jurusanFilter = document.getElementById('penetapan-filter-jurusan')?.value || '';
    
    console.log('🔍 Filtering data...', { searchTerm, statusFilter, jurusanFilter });
    
    // Filter from all data
    penetapanFilteredData = penetapanAllData.filter(item => {
        // Search term filter (search in nama, NIK, jurusan)
        const namaLengkap = (item.nama_lengkap || item.namaLengkap || '').toLowerCase();
        const nik = (item.nik || item.no_ktp || '').toLowerCase();
        const jurusan = (item.jurusan_tujuan || item.jurusanTujuan || item.jurusan || '').toLowerCase();
        const pt = (item.perguruan_tinggi || item.perguruanTinggi || '').toLowerCase();
        
        const matchesSearch = !searchTerm || 
            namaLengkap.includes(searchTerm) || 
            nik.includes(searchTerm) ||
            jurusan.includes(searchTerm) ||
            pt.includes(searchTerm);
        
        // Status filter
        const status = (item.status_penetapan || item.statusPenetapan || item.status || '').toLowerCase();
        const matchesStatus = !statusFilter || 
            status === statusFilter.toLowerCase() ||
            (statusFilter === 'Proses' && (status.includes('proses') || status === '' || status === '-'));
        
        // Jurusan filter
        const itemJurusan = item.jurusan_tujuan || item.jurusanTujuan || item.jurusan || '';
        const matchesJurusan = !jurusanFilter || itemJurusan === jurusanFilter;
        
        return matchesSearch && matchesStatus && matchesJurusan;
    });
    
    // Reset to page 1 and re-render
    penetapanCurrentPage = 1;
    renderPenetapanTable();
}

/**
 * Render Table with Pagination
 */
function renderPenetapanTable() {
    const tbody = document.getElementById('penetapan-tbody');
    if (!tbody) return;
    
    // Calculate pagination
    const totalRecords = penetapanFilteredData.length;
    const totalPages = Math.ceil(totalRecords / penetapanPageSize);
    
    // Ensure current page is valid
    if (penetapanCurrentPage > totalPages) penetapanCurrentPage = Math.max(1, totalPages);
    
    // Slice data for current page
    const startIndex = (penetapanCurrentPage - 1) * penetapanPageSize;
    const endIndex = Math.min(startIndex + penetapanPageSize, totalRecords);
    const pageData = penetapanFilteredData.slice(startIndex, endIndex);
    
    // Clear and render rows
    tbody.innerHTML = '';
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center;padding:3rem;color:#64748b;">
                    <div style="font-size:2rem;margin-bottom:0.5rem;">🔍</div>
                    <p>Tidak ada data yang cocok dengan filter</p>
                </td>
            </tr>
        `;
    } else {
        pageData.forEach((item, index) => {
            const row = createPenetapanRow(item, startIndex + index + 1);
            tbody.appendChild(row);
        });
    }
    
    // Update pagination info
    updatePenetPaginationInfo(totalRecords, startIndex, endIndex, totalPages);
}

/**
 * Create Table Row for each record - WITH PERFECT PHOTO DISPLAY
 */
function createPenetapanRow(item, rowNum) {
    const row = document.createElement('tr');
    
    // Field mapping helper
    const getField = (obj, ...keys) => {
        for (const key of keys) {
            if (obj[key]) return obj[key];
        }
        return '-';
    };
    
    // Extract fields
    const id = item.id;
    const namaLengkap = getField(item, 'nama_lengkap', 'namaLengkap');
    const nik = getField(item, 'nik', 'no_ktp');
    const jurusan = getField(item, 'jurusan_tujuan', 'jurusanTujuan', 'jurusan');
    const jenjang = getField(item, 'jenjang_pendidikan', 'jenjangPendidikan', 'jenjang');
    const perguruanTinggi = getField(item, 'perguruan_tinggi', 'perguruanTinggi', 'pt');
    const unitKerja = getField(item, 'unit_kerja', 'unitKerja', 'unit_tujuan', 'unitTujuan', 'unit_pendayagunaan');
    const linkFoto = getField(item, 'link_foto', 'linkFoto', 'foto', 'photo');
    const statusPenetapan = getField(item, 'status_penetapan', 'statusPenetapan', 'status', 'Pending');
    
    // Generate SMART PHOTO HTML dengan multi-fallback support
    const safeNama = escapeHtml(namaLengkap);
    const photoCellHtml = generateSmartPhotoHtml(linkFoto, `Foto ${safeNama}`, 'small');
    
    // Status badge class
    const statusLower = statusPenetapan.toLowerCase();
    let statusClass = 'status-pending';
    let statusIcon = '⏳';
    
    if (statusLower.includes('lulus') || statusLower.includes('approve')) {
        statusClass = 'status-lulus';
        statusIcon = '✅';
    } else if (statusLower.includes('tolak') || statusLower.includes('reject')) {
        statusClass = 'status-ditolak';
        statusIcon = '❌';
    } else if (statusLower.includes('proses')) {
        statusClass = 'status-proses';
        statusIcon = '🔄';
    }
    
    row.innerHTML = `
        <td style="font-weight:600;color:#7c3aed;">${rowNum}</td>
        <td class="penetapan-photo-cell">
            ${photoCellHtml}
        </td>
        <td style="font-weight:600;color:#1e293b;">${escapeHtml(namaLengkap)}</td>
        <td><span style="font-family:monospace;background:#f1f5f9;padding:0.25rem 0.5rem;border-radius:6px;font-size:0.8rem;">${escapeHtml(nik)}</span></td>
        <td>${escapeHtml(jurusan)}</td>
        <td><span style="background:#ede9fe;color:#7c3aed;padding:0.25rem 0.65rem;border-radius:8px;font-size:0.8rem;font-weight:600;">${escapeHtml(jenjang)}</span></td>
        <td>${escapeHtml(perguruanTinggi)}</td>
        <td>${escapeHtml(unitKerja)}</td>
        <td>
            <span class="status-badge-penetapan ${statusClass}">
                ${statusIcon} ${escapeHtml(statusPenetapan)}
            </span>
        </td>
        <td>
            <div class="action-buttons-container">
                <button type="button" class="btn-action btn-view" 
                        data-action="view" data-id="${id}" title="Lihat Detail">
                    👁️ Lihat
                </button>
                <button type="button" class="btn-action btn-edit" 
                        data-action="edit" data-id="${id}" title="Edit Data">
                    ✏️ Edit
                </button>
                <button type="button" class="btn-action btn-delete" 
                        data-action="delete" data-id="${id}" data-nama="${escapeHtml(namaLengkap)}" title="Hapus Data">
                    🗑️ Hapus
                </button>
            </div>
        </td>
    `;
    
    // ===== EVENT DELEGATION untuk Penetapan Row =====
    row.classList.add('clickable-row');
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-action')) {
            viewPenetapanDetail(id);
        }
    });
    
    return row;
}

/**
 * Setup Event Delegation for Penetapan Table
 * Sesuai PROMPT MASTER section Y
 */
function setupPenetapanTableEvents(tbody) {
    if (!tbody) return;
    
    // Hapus listener lama
    tbody.removeEventListener('click', handlePenetapanTableClick);
    
    // Tambah event delegation
    tbody.addEventListener('click', handlePenetapanTableClick);
}

/**
 * Event Handler untuk Penetapan Table - Event Delegation
 * Menangani semua klik tombol CRUD di tabel penetapan
 */
async function handlePenetapanTableClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    
    const id = button.dataset.id;
    const action = button.dataset.action;
    
    if (!id) {
        console.error('[PENETAPAN] ID tidak ditemukan');
        showToast('❌ Error: ID tidak ditemukan', 'error');
        return;
    }
    
    console.log(`[PENETAPAN CRUD] Action: ${action} | ID: ${id}`);
    
    // Disable tombol sementara
    button.disabled = true;
    button.style.opacity = '0.6';
    
    try {
        switch (action) {
            case 'view':
                await viewPenetapanDetail(id);
                break;
            case 'edit':
                await openEditPenetapanModal(id);
                break;
            case 'delete':
                const nama = button.dataset.nama || '';
                confirmDeletePenetapan(id, nama);
                break;
            default:
                console.warn('[PENETAPAN] Unknown action:', action);
        }
    } catch (error) {
        console.error('[PENETAPAN] Error handling action:', error);
        showToast(`❌ Gagal: ${error.message}`, 'error', 5000);
    } finally {
        button.disabled = false;
        button.style.opacity = '1';
    }
}

// Expose functions
window.setupPenetapanTableEvents = setupPenetapanTableEvents;
window.handlePenetapanTableClick = handlePenetapanTableClick;

/**
 * Update Pagination Controls Info
 */
function updatePenetPaginationInfo(total, start, end, pages) {
    // Update showing text
    const showingEl = document.getElementById('penetapan-showing');
    const totalEl = document.getElementById('penetapan-total');
    const currentPageEl = document.getElementById('penetapan-current-page');
    const totalPagesEl = document.getElementById('penetapan-total-pages');
    
    if (showingEl) showingEl.textContent = total > 0 ? `${start}-${end}` : '0-0';
    if (totalEl) totalEl.textContent = total;
    if (currentPageEl) currentPageEl.textContent = penetapanCurrentPage;
    if (totalPagesEl) totalPagesEl.textContent = pages || 1;
    
    // Update button states
    const btnFirst = document.getElementById('penetapan-btn-first');
    const btnPrev = document.getElementById('penetapan-btn-prev');
    const btnNext = document.getElementById('penetapan-btn-next');
    const btnLast = document.getElementById('penetapan-btn-last');
    
    if (btnFirst) btnFirst.disabled = penetapanCurrentPage <= 1;
    if (btnPrev) btnPrev.disabled = penetapanCurrentPage <= 1;
    if (btnNext) btnNext.disabled = penetapanCurrentPage >= pages;
    if (btnLast) btnLast.disabled = penetapanCurrentPage >= pages;
}

/**
 * Pagination Navigation Functions
 */
function goToPenetapanPage(page) {
    penetapanCurrentPage = page;
    renderPenetapanTable();
}

function goToPenetapanPrevPage() {
    if (penetapanCurrentPage > 1) {
        penetapanCurrentPage--;
        renderPenetapanTable();
    }
}

function goToPenetapanNextPage() {
    const totalPages = Math.ceil(penetapanFilteredData.length / penetapanPageSize);
    if (penetapanCurrentPage < totalPages) {
        penetapanCurrentPage++;
        renderPenetapanTable();
    }
}

function goToPenetapanLastPage() {
    const totalPages = Math.ceil(penetapanFilteredData.length / penetapanPageSize);
    penetapanCurrentPage = totalPages;
    renderPenetapanTable();
}

function changePenetapanPageSize() {
    const select = document.getElementById('penetapan-page-size');
    penetapanPageSize = parseInt(select?.value) || 10;
    penetapanCurrentPage = 1;
    renderPenetapanTable();
}

/**
 * ===== PHOTO MODAL FUNCTIONALITY =====
 * Display full-size photo in modal overlay
 */
function showPhotoModal(photoSrc, nama) {
    // Remove existing modal
    const existingModal = document.getElementById('photo-modal-overlay');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'photo-modal-overlay';
    modal.className = 'photo-modal-overlay';
    modal.onclick = (e) => {
        if (e.target === modal) closePhotoModal();
    };
    
    modal.innerHTML = `
        <div class="photo-modal-content">
            <img src="${escapeHtml(photoSrc)}" alt="Foto ${escapeHtml(nama)}" class="photo-modal-img" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👤</text></svg>'">
            <button class="photo-modal-close" onclick="closePhotoModal()">✕</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Trigger animation
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
}

function closePhotoModal() {
    const modal = document.getElementById('photo-modal-overlay');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

/**
 * ===== VIEW DETAIL FUNCTIONALITY =====
 * View complete detail in a read-only modal
 */
async function viewPenetapanDetail(recordId) {
    try {
        // Find the record from cached data
        const record = penetapanAllData.find(item => item.id === recordId);
        if (!record) throw new Error('Data tidak ditemukan');
        
        // Reuse peserta detail modal but with admin view
        showPesertaDetailModal(record);
        
    } catch (err) {
        console.error('Error viewing detail:', err);
        showToast('❌ Gagal menampilkan detail: ' + err.message, 'error');
    }
}

/**
 * ===== EDIT FUNCTIONALITY =====
 * Open edit modal with form pre-filled with existing data
 */
async function openEditPenetapanModal(recordId) {
    // SECURITY: Check permission before editing penetapan
    if (!checkPenetapanPermission()) {
        return; // Access denied
    }
    
    try {
        // Find the record
        const record = penetapanAllData.find(item => item.id === recordId);
        if (!record) throw new Error('Data tidak ditemukan');
        
        penetapanEditingId = recordId;
        
        // Field mapping helper
        const getField = (obj, ...keys) => {
            for (const key of keys) {
                if (obj[key]) return obj[key];
            }
            return '';
        };
        
        // Remove existing edit modal
        const existingModal = document.getElementById('edit-penetapan-modal');
        if (existingModal) existingModal.remove();
        
        // Create edit modal
        const modal = document.createElement('div');
        modal.id = 'edit-penetapan-modal';
        modal.className = 'edit-modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) closeEditPenetapanModal();
        };
        
        modal.innerHTML = `
            <div class="edit-modal" onclick="event.stopPropagation()">
                <div class="edit-modal-header">
                    <h2 class="edit-modal-title">✏️ Edit Data Penetapan</h2>
                    <p class="edit-modal-subtitle">Perbaiki data untuk ${escapeHtml(getField(record, 'nama_lengkap', 'namaLengkap'))}</p>
                    <button class="photo-modal-close" onclick="closeEditPenetapanModal()" style="top:1rem;right:1rem;">✕</button>
                </div>
                
                <form id="edit-penetapan-form" onsubmit="event.preventDefault(); savePenetapanChanges();" class="edit-modal-body">
                    <div class="edit-form-grid">
                        <div class="form-group-edit">
                            <label class="form-label-edit">Nama Lengkap *</label>
                            <input type="text" name="nama_lengkap" class="form-input-edit" 
                                   value="${escapeHtml(getField(record, 'nama_lengkap', 'namaLengkap'))}" required>
                        </div>
                        
                        <div class="form-group-edit">
                            <label class="form-label-edit">NIK *</label>
                            <input type="text" name="nik" class="form-input-edit" 
                                   value="${escapeHtml(getField(record, 'nik', 'no_ktp'))}" 
                                   maxlength="16" pattern="[0-9]*" required>
                        </div>
                        
                        <div class="form-group-edit">
                            <label class="form-label-edit">Jurusan Tujuan *</label>
                            <input type="text" name="jurusan_tujuan" class="form-input-edit" 
                                   value="${escapeHtml(getField(record, 'jurusan_tujuan', 'jurusanTujuan', 'jurusan'))}" required>
                        </div>
                        
                        <div class="form-group-edit">
                            <label class="form-label-edit">Jenjang Pendidikan *</label>
                            <select name="jenjang_pendidikan" class="form-input-edit" required>
                                <option value="">Pilih Jenjang</option>
                                <option value="D3" ${getField(record, 'jenjang_pendidikan', 'jenjangPendidikan') === 'D3' ? 'selected' : ''}>D3 (Diploma)</option>
                                <option value="D4" ${getField(record, 'jenjang_pendidikan', 'jenjangPendidikan') === 'D4' ? 'selected' : ''}>D4 (Diploma Terapan)</option>
                                <option value "S1" ${getField(record, 'jenjang_pendidikan', 'jenjangPendidikan') === 'S1' ? 'selected' : ''}>S1 (Sarjana)</option>
                                <option value="S2" ${getField(record, 'jenjang_pendidikan', 'jenjangPendidikan') === 'S2' ? 'selected' : ''}>S2 (Magister)</option>
                                <option value="S3" ${getField(record, 'jenjang_pendidikan', 'jenjangPendidikan') === 'S3' ? 'selected' : ''}>S3 (Doktor)</option>
                                <option value="Spesialis" ${getField(record, 'jenjang_pendidikan', 'jenjangPendidikan').includes('Spesialis') ? 'selected' : ''}>Spesialis</option>
                            </select>
                        </div>
                        
                        <div class="form-group-edit">
                            <label class="form-label-edit">Perguruan Tinggi *</label>
                            <input type="text" name="perguruan_tinggi" class="form-input-edit" 
                                   value="${escapeHtml(getField(record, 'perguruan_tinggi', 'perguruanTinggi', 'pt'))}" required>
                        </div>
                        
                        <div class="form-group-edit">
                            <label class="form-label-edit">Unit Kerja / Pendayagunaan *</label>
                            <input type="text" name="unit_kerja" class="form-input-edit" 
                                   value="${escapeHtml(getField(record, 'unit_kerja', 'unitKerja', 'unit_tujuan', 'unitTujuan', 'unit_pendayagunaan'))}" required>
                        </div>
                        
                        <div class="form-group-edit">
                            <label class="form-label-edit">No SK Penetapan</label>
                            <input type="text" name="no_sk_penetapan" class="form-input-edit" 
                                   value="${escapeHtml(getField(record, 'no_sk_penetapan', 'noSKPenetapan', 'no_sk'))}">
                        </div>
                        
                        <div class="form-group-edit">
                            <label class="form-label-edit">Tanggal Penetapan</label>
                            <input type="text" name="tanggal_penetapan" class="form-input-edit" 
                                   value="${escapeHtml(getField(record, 'tanggal_penetapan', 'tanggalPenetapan', 'tanggal'))}"
                                   placeholder="Format: DD Month YYYY (contoh: 15 Januari 2026)">
                        </div>
                        
                        <div class="form-group-edit">
                            <label class="form-label-edit">Status Penetapan *</label>
                            <select name="status_penetapan" class="form-input-edit" required>
                                <option value="Pending" ${(getField(record, 'status_penetapan', 'statusPenetapan', 'status') || 'Pending').includes('Pending') || (getField(record, 'status_penetapan', 'statusPenetapan', 'status') || '') === '-' ? 'selected' : ''}>Pending</option>
                                <option value="Dalam Proses" ${getField(record, 'status_penetapan', 'statusPenetapan', 'status').includes('Proses') ? 'selected' : ''}>Dalam Proses</option>
                                <option value="Lulus" ${getField(record, 'status_penetapan', 'statusPenetapan', 'status').includes('Lulus') ? 'selected' : ''}>Lulus</option>
                                <option value="Ditolak" ${getField(record, 'status_penetapan', 'statusPenetapan', 'status').includes('Tolak') ? 'selected' : ''}>Ditolak</option>
                            </select>
                        </div>
                        
                        <div class="form-group-edit">
                            <label class="form-label-edit">Link Foto (URL)</label>
                            <input type="url" name="link_foto" class="form-input-edit" 
                                   value="${escapeHtml(getField(record, 'link_foto', 'linkFoto', 'foto', 'photo'))}"
                                   placeholder="https://example.com/foto.jpg">
                        </div>
                        
                        <div class="form-group-edit" style="grid-column: span 2;">
                            <label class="form-label-edit">Catatan Penetapan</label>
                            <textarea name="catatan_penetapan" class="form-input-edit" rows="3"
                                      placeholder="Tambahkan catatan jika diperlukan...">${escapeHtml(getField(record, 'catatan_penetapan', 'catatanPenetapan'))}</textarea>
                        </div>
                    </div>
                    
                    <div class="edit-modal-footer">
                        <button type="button" class="btn-cancel-edit" onclick="closeEditPenetapanModal()">
                            ✕ Batal
                        </button>
                        <button type="submit" class="btn-save-edit">
                            💾 Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Trigger animation
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        
        console.log('📝 Opening edit modal for record ID:', recordId);
        
    } catch (err) {
        console.error('Error opening edit modal:', err);
        showToast('❌ Gagal membuka form edit: ' + err.message, 'error');
    }
}

/**
 * Save Changes to Supabase
 */
async function savePenetapanChanges() {
    try {
        if (!penetapanEditingId) throw new Error('Tidak ada record yang sedang diedit');
        
        // Gather form data
        const form = document.getElementById('edit-penetapan-form');
        const formData = new FormData(form);
        
        const updateData = {
            nama_lengkap: formData.get('nama_lengkap'),
            nik: formData.get('nik'),
            jurusan_tujuan: formData.get('jurusan_tujuan'),
            jenjang_pendidikan: formData.get('jenjang_pendidikan'),
            perguruan_tinggi: formData.get('perguruan_tinggi'),
            unit_kerja: formData.get('unit_kerja'),
            no_sk_penetapan: formData.get('no_sk_penetapan') || null,
            tanggal_penetapan: formData.get('tanggal_penetapan') || null,
            status_penetapan: formData.get('status_penetapan'),
            link_foto: formData.get('link_foto') || null,
            catatan_penetapan: formData.get('catatan_penetapan') || null,
            updated_at: new Date().toISOString()
        };
        
        console.log('💾 Saving changes to Supabase:', updateData);
        
        // Show loading state on save button
        const saveBtn = document.querySelector('.btn-save-edit');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '⏳ Menyimpan...';
        saveBtn.disabled = true;
        
        // Update via Supabase - TANPA .single() ⭐
        console.log('[PENETAPAN] Updating record ID:', penetapanEditingId);
        
        const { data: updatedRecordArray, error: updateError } = await supabaseClient
            .from('penetapan')
            .update(updateData)
            .eq('id', penetapanEditingId)
            .select('*');  // TANPA .single()
        
        if (updateError) {
            console.error('[PENETAPAN] Update error:', updateError);
            throw new Error(updateError.message || 'Gagal menyimpan perubahan');
        }
        
        // Validasi hasil array
        if (!updatedRecordArray || !Array.isArray(updatedRecordArray) || updatedRecordArray.length === 0) {
            throw new Error('Update penetapan tidak menghasilkan data. Periksa ID atau RLS policy.');
        }
        
        const updatedRecord = updatedRecordArray[0];  // Ambil dari array
        
        console.log('[PENETAPAN] ✅ Successfully updated record:', updatedRecord);
        
        // Close modal
        closeEditPenetapanModal();
        
        // Refresh data
        await refreshDataPenetapan();
        
        // Show success toast
        showToast('✅ Data berhasil diperbarui!', 'success');
        
    } catch (err) {
        console.error('❌ Error saving changes:', err);
        showToast('❌ Gagal menyimpan: ' + err.message, 'error');
        
        // Reset button
        const saveBtn = document.querySelector('.btn-save-edit');
        if (saveBtn) {
            saveBtn.innerHTML = '💾 Simpan Perubahan';
            saveBtn.disabled = false;
        }
    }
}

/**
 * Close Edit Modal
 */
function closeEditPenetapanModal() {
    const modal = document.getElementById('edit-penetapan-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
            penetapanEditingId = null;
        }, 300);
    }
}

/**
 * ===== ADD NEW PENETAPAN =====
 * Open modal untuk tambah data Penetapan baru
 */
function openPenetapanAddModal() {
    // SECURITY: Check permission before adding penetapan
    if (!checkPenetapanPermission()) {
        return; // Access denied
    }
    
    const modalId = 'penetapan-add-modal';
    
    // Remove existing modal
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();
    
    // Create new modal
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width:700px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;padding:1.25rem;">
                <h3 class="modal-title">➕ Tambah Data Penetapan Baru</h3>
                <button class="modal-close" onclick="closeModal('${modalId}')">×</button>
            </div>
            <div class="modal-body" style="padding:1.5rem;max-height:70vh;overflow-y:auto;">
                <form id="penetapan-add-form" onsubmit="return false;">
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
                        <div class="form-group">
                            <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Nama Lengkap *</label>
                            <input type="text" id="add-penetapan-nama" required placeholder="Nama lengkap penerima" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">NIK *</label>
                            <input type="text" id="add-penetapan-nik" required placeholder="16 digit NIK" maxlength="16" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;font-family:monospace;">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Jurusan Tujuan *</label>
                            <select id="add-penetapan-jurusan" required style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                <option value="">Pilih Jurusan</option>
                                <option value="Keperawatan">Keperawatan</option>
                                <option value="Kebidanan">Kebidanan</option>
                                <option value="Kesehatan Masyarakat">Kesehatan Masyarakat</option>
                                <option value="Gizi">Gizi</option>
                                <option value="Kesehatan Lingkungan">Kesehatan Lingkungan</option>
                                <option value="Epidemiologi">Epidemiologi</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Jenjang Pendidikan</label>
                            <select id="add-penetapan-jenjang" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                <option value="">Pilih Jenjang</option>
                                <option value="D3">Diploma (D3)</option>
                                <option value="D4">Diploma (D4)</option>
                                <option value="S1">Sarjana (S1)</option>
                                <option value="S2">Magister (S2)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Perguruan Tinggi</label>
                            <input type="text" id="add-penetapan-pt" placeholder="Nama PT" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                        </div>
                        <div class="form-group">
                            <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Unit Kerja / Tujuan</label>
                            <input type="text" id="add-penetapan-unit" placeholder="Unit penempatan" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                        </div>
                        <div class="form-group" style="grid-column: span 2;">
                            <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Link Foto (Google Drive URL)</label>
                            <input type="url" id="add-penetapan-foto" placeholder="https://drive.google.com/..." style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                        </div>
                        <div class="form-group" style="grid-column: span 2;">
                            <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Status Penetapan</label>
                            <select id="add-penetapan-status" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                <option value="Pending">⏳ Pending</option>
                                <option value="Proses">🔄 Sedang Diproses</option>
                                <option value="Lulus">✅ Lulus/Disetujui</option>
                                <option value="Ditolak">❌ Ditolak</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5e7eb;">
                        <button type="button" class="btn" style="background:#f1f5f9;color:#475569;" onclick="closeModal('${modalId}')">Batal</button>
                        <button type="button" class="btn" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;" onclick="saveNewPenetapan('${modalId}')">💾 Simpan Data</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
}

/**
 * Save new Penetapan data to Supabase
 */
async function saveNewPenetapan(modalId) {
    try {
        // Collect form data
        const newData = {
            nama_lengkap: document.getElementById('add-penetapan-nama').value.trim(),
            nik: document.getElementById('add-penetapan-nik').value.trim(),
            jurusan_tujuan: document.getElementById('add-penetapan-jurusan').value,
            jenjang_pendidikan: document.getElementById('add-penetapan-jenjang').value,
            perguruan_tinggi: document.getElementById('add-penetapan-pt').value.trim(),
            unit_kerja: document.getElementById('add-penetapan-unit').value.trim(),
            link_foto: document.getElementById('add-penetapan-foto').value.trim(),
            status_penetapan: document.getElementById('add-penetapan-status').value,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Validation
        if (!newData.nama_lengkap || !newData.nik || !newData.jurusan_tujuan) {
            showToast('❌ Nama, NIK, dan Jurusan wajib diisi!', 'error');
            return;
        }
        
        console.log('[PENETAPAN] Saving new data:', newData);
        
        // Insert ke Supabase
        const { data, error } = await supabaseClient
            .from('penetapan')
            .insert([newData])
            .select();
        
        if (error) throw error;
        
        console.log('[PENETAPAN] ✅ Data saved:', data);
        
        showToast(`✅ Data ${newData.nama_lengkap} berhasil ditambahkan!`, 'success');
        closeModal(modalId);
        
        // Refresh table
        if (typeof loadPenetapanData === 'function') {
            loadPenetapanData();
        }
        
    } catch (error) {
        console.error('[PENETAPAN] Error saving:', error);
        showToast('❌ Gagal menyimpan: ' + error.message, 'error', 5000);
    }
}

// Expose functions to global scope
window.openPenetapanAddModal = openPenetapanAddModal;
window.saveNewPenetapan = saveNewPenetapan;

/**
 * ===== DELETE FUNCTIONALITY =====
 * Show delete confirmation modal
 */
function confirmDeletePenetapan(recordId, nama) {
    // SECURITY: Check permission before deleting penetapan
    if (!checkPenetapanPermission()) {
        return; // Access denied
    }
    
    // Remove existing modal
    const existingModal = document.getElementById('delete-confirm-modal');
    if (existingModal) existingModal.remove();
    
    // Create confirmation modal
    const modal = document.createElement('div');
    modal.id = 'delete-confirm-modal';
    modal.className = 'delete-confirm-overlay';
    modal.onclick = (e) => {
        if (e.target === modal) closeDeleteConfirmModal();
    };
    
    modal.innerHTML = `
        <div class="delete-confirm-box" onclick="event.stopPropagation()">
            <div class="delete-icon-wrapper">🗑️</div>
            <h3 class="delete-confirm-title">Hapus Data Penetapan?</h3>
            <p class="delete-confirm-message">
                Anda akan menghapus data penetraran untuk:<br>
                <strong>${escapeHtml(nama)}</strong><br><br>
                <span style="color:#dc2626;font-weight:600;">⚠️ Tindakan ini tidak dapat dibatalkan!</span>
            </p>
            <div class="delete-confirm-actions">
                <button class="btn-cancel-delete" onclick="closeDeleteConfirmModal()">
                    ✕ Batal
                </button>
                <button class="btn-confirm-delete" onclick="executeDeletePenetapan(${recordId})">
                    🗑️ Ya, Hapus
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
}

/**
 * Execute Delete Operation
 */
async function executeDeletePenetapan(recordId) {
    try {
        console.log('🗑️ Deleting record ID:', recordId);
        
        // Close confirmation modal
        closeDeleteConfirmModal();
        
        // Delete from Supabase
        const { error: deleteError } = await supabaseClient
            .from('penetapan')
            .delete()
            .eq('id', recordId);
        
        if (deleteError) {
            throw new Error(deleteError.message || 'Gagal menghapus data');
        }
        
        console.log('✅ Successfully deleted record');
        
        // Refresh data
        await refreshDataPenetapan();
        
        // Show success toast
        showToast('🗑️ Data berhasil dihapus!', 'success');
        
    } catch (err) {
        console.error('❌ Error deleting record:', err);
        showToast('❌ Gagal menghapus: ' + err.message, 'error');
    }
}

/**
 * Close Delete Confirmation Modal
 */
function closeDeleteConfirmModal() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

/**
 * Export Data to CSV/Excel format
 */
function exportDataPenetapan() {
    try {
        if (penetapanFilteredData.length === 0) {
            showToast('⚠️ Tidak ada data untuk diekspor', 'warning');
            return;
        }
        
        console.log('📥 Exporting data penetapan...');
        
        // Define columns to export
        const columns = [
            { key: 'nama_lengkap', altKeys: ['namaLengkap'], header: 'Nama Lengkap' },
            { key: 'nik', altKeys: ['no_ktp'], header: 'NIK' },
            { key: 'jurusan_tujuan', altKeys: ['jurusanTujuan', 'jurusan'], header: 'Jurusan Tujuan' },
            { key: 'jenjang_pendidikan', altKeys: ['jenjangPendidikan', 'jenjang'], header: 'Jenjang Pendidikan' },
            { key: 'perguruan_tinggi', altKeys: ['perguruanTinggi', 'pt'], header: 'Perguruan Tinggi' },
            { key: 'unit_kerja', altKeys: ['unitKerja', 'unit_tujuan', 'unitTujuan', 'unit_pendayagunaan'], header: 'Unit Kerja' },
            { key: 'no_sk_penetapan', altKeys: ['noSKPenetapan', 'no_sk'], header: 'No SK Penetapan' },
            { key: 'tanggal_penetapan', altKeys: ['tanggalPenetapan', 'tanggal'], header: 'Tanggal Penetapan' },
            { key: 'status_penetapan', altKeys: ['statusPenetapan', 'status'], header: 'Status' },
            { key: 'link_foto', altKeys: ['linkFoto', 'foto', 'photo'], header: 'Link Foto' }
        ];
        
        // Create CSV content
        const headers = columns.map(col => col.header);
        const rows = penetapanFilteredData.map(item => {
            return columns.map(col => {
                let value = item[col.key] || '';
                // Try alternative keys
                if (!value && col.altKeys) {
                    for (const altKey of col.altKeys) {
                        if (item[altKey]) {
                            value = item[altKey];
                            break;
                        }
                    }
                }
                // Escape for CSV
                value = String(value).replace(/"/g, '""');
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = `"${value}"`;
                }
                return value;
            });
        });
        
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        
        // Create download link
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Data_Penetapan_SIMBAKES_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('📥 Data berhasil diekspor!', 'success');
        
    } catch (err) {
        console.error('❌ Error exporting data:', err);
        showToast('❌ Gagal mengekspor data: ' + err.message, 'error');
    }
}

// Auto-initialize when page is shown (hook into showPage)
const originalShowPage = window.showPage || function() {};
window.showPage = function(pageId) {
    originalShowPage(pageId);
    
    // Initialize penetapan admin when this page is shown
    if (pageId === 'data-penetapan') {
        // Small delay to ensure page transition completes
        setTimeout(() => {
            initPenetapanAdmin();
        }, 100);
    }
};

console.log('✅ Data Penetapan Admin Module Loaded Successfully');

