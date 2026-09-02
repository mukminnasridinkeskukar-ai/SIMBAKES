// ============================================================
// SIMBAKES - SUPABASE CONFIGURATION
// ============================================================
// Semua data sekarang diambil dari Supabase (bukan Google Sheets)
// Tabel yang dibutuhkan: submissions, roadmap, multiusers
// ============================================================

// ===== EARLY FUNCTION DEFINITIONS (Sebelum DOM ready) =====
// Fungsi ini dipanggil oleh elemen HTML via onerror attribute
// Harus didefinisikan SEBELUM elemen HTML dirender
function handlePreviewError(element) {
    console.warn('[DRIVE] Preview failed to load for:', element.src?.substring(0, 60));
    
    const container = element.closest('.drive-preview-content');
    if (container) {
        container.innerHTML = `
            <div class="pdf-fallback" style="text-align:center;padding:20px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48" style="color:#f59e0b;margin-bottom:12px;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style="font-weight:600;color:#92400e;margin-bottom:8px;">Preview tidak tersedia</p>
                <p style="font-size:0.85rem;color:#a16207;margin-bottom:16px;">File mungkin private atau format tidak didukung</p>
                <button onclick="this.closest('.drive-preview-container').previousElementSibling.querySelector('.btn-preview-drive').click()" 
                        class="btn-open-drive" style="cursor:pointer;">
                    Buka di Tab Baru →
                </button>
            </div>
        `;
        container.classList.add('loaded');
    }
}

// ===== DATA STORE (dari Supabase) =====
// Data tidak lagi hardcoded, diambil dari tabel Supabase:
// - submissions: data pengajuan/pendaftaran
// - roadmap: data roadmap beasiswa
let pengusulData = [];  // akan diisi dari fetchDashboardData()
let roadmapData = [];   // akan diisi dari fetchRoadmapData()

// ===== GLOBAL VARIABLES (Dideklarasikan di awal sebelum fungsi) =====
let roadmapCachedData = null;      // Cache untuk data roadmap kebutuhan
let roadmapFilterOptions = null;   // Options untuk filter dropdowns

// ===== PAGINATION MANAGER (Defined Early - digunakan oleh banyak fungsi) =====
/**
 * Universal Pagination Manager - Reusable for any table
 */
const PaginationManager = {
    // Store pagination state for each table
    states: {},
    
    /**
     * Initialize pagination state for a table
     * @param {string} tableId - Unique identifier for the table
     * @param {number} pageSize - Number of rows per page (default: 10)
     */
    init(tableId, pageSize = 10) {
        if (!this.states[tableId]) {
            this.states[tableId] = {
                currentPage: 1,
                pageSize: pageSize,
                totalRecords: 0,
                totalPages: 0,
                cachedData: []
            };
        }
        return this.states[tableId];
    },
    
    /**
     * Get state for a table
     */
    getState(tableId) {
        return this.states[tableId] || this.init(tableId);
    },
    
    /**
     * Set data and calculate pagination
     * @param {string} tableId - Table identifier
     * @param {Array} data - Full dataset
     * @returns {Object} Paginated result {data, pageInfo}
     */
    paginate(tableId, data) {
        const state = this.getState(tableId);
        state.cachedData = data;
        state.totalRecords = data.length;
        state.totalPages = Math.ceil(data.length / state.pageSize);
        
        // Ensure current page is valid
        if (state.currentPage > state.totalPages) {
            state.currentPage = Math.max(1, state.totalPages);
        }
        
        const startIndex = (state.currentPage - 1) * state.pageSize;
        const endIndex = Math.min(startIndex + state.pageSize, data.length);
        const paginatedData = data.slice(startIndex, endIndex);
        
        return {
            data: paginatedData,
            pageInfo: {
                currentPage: state.currentPage,
                totalPages: state.totalPages,
                totalRecords: state.totalRecords,
                pageSize: state.pageSize,
                startRecord: data.length > 0 ? startIndex + 1 : 0,
                endRecord: endIndex,
                hasNextPage: state.currentPage < state.totalPages,
                hasPrevPage: state.currentPage > 1
            }
        };
    },
    
    /**
     * Go to specific page
     */
    goToPage(tableId, page) {
        const state = this.getState(tableId);
        if (page >= 1 && page <= state.totalPages) {
            state.currentPage = page;
            return true;
        }
        return false;
    },
    
    /**
     * Next page
     */
    nextPage(tableId) {
        const state = this.getState(tableId);
        return this.goToPage(tableId, state.currentPage + 1);
    },
    
    /**
     * Previous page
     */
    prevPage(tableId) {
        const state = this.getState(tableId);
        return this.goToPage(tableId, state.currentPage - 1);
    },
    
    /**
     * First page
     */
    firstPage(tableId) {
        return this.goToPage(tableId, 1);
    },
    
    /**
     * Last page
     */
    lastPage(tableId) {
        const state = this.getState(tableId);
        return this.goToPage(tableId, state.totalPages);
    },
    
    /**
     * Change page size
     */
    setPageSize(tableId, newSize) {
        const state = this.getState(tableId);
        state.pageSize = parseInt(newSize);
        state.currentPage = 1;
    },
    
    /**
     * Reset to first page
     */
    reset(tableId) {
        const state = this.getState(tableId);
        state.currentPage = 1;
    },
    
    /**
     * Generate pagination controls HTML
     * @param {string} tableId - Table identifier
     * @returns {string} HTML string for pagination controls
     */
    renderControls(tableId) {
        const state = this.getState(tableId);
        const pageInfo = {
            currentPage: state.currentPage,
            totalPages: state.totalPages,
            totalRecords: state.totalRecords,
            hasNextPage: state.currentPage < state.totalPages,
            hasPrevPage: state.currentPage > 1
        };
        
        const startRecord = state.totalRecords > 0 ? (state.currentPage - 1) * state.pageSize + 1 : 0;
        const endRecord = Math.min(state.currentPage * state.pageSize, state.totalRecords);
        
        return `
            <div class="pagination-container" id="pagination-${tableId}">
                <div class="pagination-info">
                    Menampilkan <strong>${startRecord}-${endRecord}</strong> dari <strong>${pageInfo.totalRecords}</strong> data
                </div>
                <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
                    <div class="page-size-selector">
                        <label>Tampilkan:</label>
                        <select onchange="PaginationManager.handlePageSizeChange('${tableId}', this)" id="pagesize-${tableId}">
                            <option value="10" ${state.pageSize == 10 ? 'selected' : ''}>10</option>
                            <option value="25" ${state.pageSize == 25 ? 'selected' : ''}>25</option>
                            <option value="50" ${state.pageSize == 50 ? 'selected' : ''}>50</option>
                            <option value="100" ${state.pageSize == 100 ? 'selected' : ''}>100</option>
                        </select>
                    </div>
                    <div class="pagination-controls">
                        <button class="btn-pagination" onclick="PaginationManager.firstPage('${tableId}'); PaginationManager.refreshTable('${tableId}');" 
                            ${!pageInfo.hasPrevPage ? 'disabled' : ''} title="Halaman Pertama">⏮️</button>
                        <button class="btn-pagination" onclick="PaginationManager.prevPage('${tableId}'); PaginationManager.refreshTable('${tableId}');" 
                            ${!pageInfo.hasPrevPage ? 'disabled' : ''} title="Halaman Sebelumnya">◀️</button>
                        <button class="btn-pagination active">${pageInfo.currentPage} / ${pageInfo.totalPages || 1}</button>
                        <button class="btn-pagination" onclick="PaginationManager.nextPage('${tableId}'); PaginationManager.refreshTable('${tableId}');" 
                            ${!pageInfo.hasNextPage ? 'disabled' : ''} title="Halaman Selanjutnya">▶️</button>
                        <button class="btn-pagination" onclick="PaginationManager.lastPage('${tableId}'); PaginationManager.refreshTable('${tableId}');" 
                            ${!pageInfo.hasNextPage ? 'disabled' : ''} title="Halaman Terakhir">⏭️</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Handle page size change
     */
    handlePageSizeChange(tableId, selectElement) {
        this.setPageSize(tableId, selectElement.value);
        this.refreshTable(tableId);
    },
    
    /**
     * Refresh table data (to be called after page change)
     * This will trigger the appropriate render function based on table ID
     */
    refreshTable(tableId) {
        switch(tableId) {
            case 'recent-submissions':
                renderRecentSubmissions();
                break;
            case 'recent-visitors':
                renderRecentVisitors();
                break;
            case 'status-detail':
                if (typeof renderStatusDetailPaginated === 'function') {
                    renderStatusDetailPaginated();
                }
                break;
            case 'roadmap':
                loadRoadmapData();
                break;
            default:
                console.log(`Refresh handler not found for table: ${tableId}`);
        }
    }
};

// Initialize pagination for all tables (dipanggil setelah definisi)
PaginationManager.init('recent-submissions', 10);
PaginationManager.init('recent-visitors', 10);
PaginationManager.init('status-detail', 10);
PaginationManager.init('roadmap', 10);

// ===== ADMIN PAGINATION VARIABLES (Declared Early to avoid TDZ errors) =====
let adminCurrentPage = 1;
let adminPageSize = 10;
let adminTotalPages = 0;
let adminTotalRecords = 0;
let roadmapCurrentPage = 1;
let roadmapPageSize = 10;
let roadmapTotalPages = 0;
let roadmapTotalRecords = 0;

// ===== DEBOUNCE TIMEOUT VARIABLES =====
let adminSearchTimeout = null;
let roadmapSearchTimeout = null;

// ===== DASHBOARD CACHE VARIABLES (Declared Early to avoid TDZ errors) =====
let cachedRecentSubmissions = [];
let cachedStatusDetail = [];
let cachedRecentVisitors = [];

// ===== DEBOUNCE FUNCTIONS (Defined Early) =====



function debounceSearch() {
    clearTimeout(adminSearchTimeout);
    adminSearchTimeout = setTimeout(() => {
        if (typeof adminCurrentPage !== 'undefined') adminCurrentPage = 1;
        if (typeof fetchAdminData === 'function') fetchAdminData();
    }, 500);
}

function debounceSearchRoadmap() {
    clearTimeout(roadmapSearchTimeout);
    roadmapSearchTimeout = setTimeout(() => {
        if (typeof roadmapCurrentPage !== 'undefined') roadmapCurrentPage = 1;
        loadRoadmapAdminTable(); // FIXED: Call full admin table reload for search
    }, 500);
}

// ===== DATA CARD MODAL FUNCTIONS =====
let currentCardData = null;
let currentCardRowNumber = null;

/**
 * Open Data Card Modal for Pengusul (POPUP FOTO)
 * Displays photo area + all data fields + CRUD buttons at bottom
 */
function openDataCardModal(rowNumber) {
    currentCardRowNumber = rowNumber;
    
    // Get data from table row
    const rowElement = document.querySelector(`tr[data-row-number="${rowNumber}"]`);
    if (!rowElement) {
        showToast('❌ Data tidak ditemukan', 'error');
        return;
    }
    
    const cells = rowElement.querySelectorAll('td');
    if (cells.length < 10) {
        showToast('❌ Data tidak lengkap', 'error');
        return;
    }
    
    // Extract data from cells
    const data = {
        rowNumber: rowNumber,
        noRegister: cells[3]?.textContent?.trim() || '-',
        nik: cells[4]?.textContent?.trim() || '-',
        namaLengkap: cells[5]?.textContent?.trim() || '-',
        tempatLahir: cells[6]?.textContent?.trim() || '-',
        tanggalLahir: cells[7]?.textContent?.trim() || '-',
        alamatKTP: cells[8]?.textContent?.trim() || '-',
        alamatDomisili: cells[9]?.textContent?.trim() || '-',
        lamaDomisili: cells[10]?.textContent?.trim() || '-',
        pekerjaan: cells[11]?.textContent?.trim() || '-',
        posisiJabatan: cells[12]?.textContent?.trim() || '-',
        unitKerja: cells[13]?.textContent?.trim() || '-',
        penjelasan: cells[14]?.textContent?.trim() || '-',
        jurusanTujuan: cells[15]?.textContent?.trim() || '-',
        jenjangPendidikan: cells[16]?.textContent?.trim() || '-',
        unitTujuan: cells[17]?.textContent?.trim() || '-',
        rencanaTahun: cells[18]?.textContent?.trim() || '-',
        noHP: cells[19]?.textContent?.trim() || '-',
        noWhatsApp: cells[20]?.textContent?.trim() || '-',
        email: cells[21]?.textContent?.trim() || '-',
        namaFileDokumen: cells[22]?.textContent?.trim() || '-',
        status: cells[23]?.textContent?.trim() || '-',
        tanggalPengajuan: cells[24]?.textContent?.trim() || '-',
        linkFoto: cells[25]?.textContent?.trim() || '',
        linkDokumen: cells[26]?.textContent?.trim() || ''
    };
    
    currentCardData = data;
    
    // Build card HTML
    const photoHtml = buildPhotoSection(data.linkFoto, data.namaLengkap);
    const fieldsHtml = buildDataFields(data);
    const actionsHtml = buildCrudActions(data);
    
    document.getElementById('data-card-content').innerHTML = 
        photoHtml + fieldsHtml + actionsHtml;
    
    // Show modal
    document.getElementById('data-card-modal').classList.add('active');
}

/**
 * Open Data Card Modal for Roadmap - FIXED with better debugging
 */
function openRoadmapCardModal(index) {
    console.log('[DEBUG openRoadmapCardModal] Opening card for index:', index);
    console.log('[DEBUG openRoadmapCardModal] roadmapAdminData available:', typeof roadmapAdminData !== 'undefined');
    console.log('[DEBUG openRoadmapCardModal] roadmapAdminData length:', roadmapAdminData?.length || 0);
    
    const rowData = typeof roadmapAdminData !== 'undefined' ? roadmapAdminData[index] : null;
    if (!rowData) {
        console.error('[DEBUG openRoadmapCardModal] Data not found at index:', index);
        showToast('❌ Data roadmap tidak ditemukan', 'error');
        return;
    }
    
    console.log('[DEBUG openRoadmapCardModal] Row data:', rowData);
    console.log('[DEBUG openRoadmapCardModal] Row data keys:', Object.keys(rowData));
    
    currentCardData = { index, rowData };
    
    // Build roadmap card
    const cardHtml = buildRoadmapCard(rowData, index);
    document.getElementById('roadmap-card-content').innerHTML = cardHtml;
    document.getElementById('roadmap-card-modal').classList.add('active');
}

function buildPhotoSection(photoUrl, nama) {
    const hasPhoto = photoUrl && photoUrl !== '-' && photoUrl.trim() !== '';
    
    if (hasPhoto) {
        return `
        <div class="data-card-photo-section">
            <div class="data-card-photo-wrapper">
                <div class="data-card-photo">
                    <img src="${photoUrl}" alt="Foto ${nama}" onerror="this.parentElement.innerHTML='<div class=\'data-card-photo-placeholder\'>👤</div>'">
                </div>
                <div class="data-card-photo-label">Foto Pengusul</div>
            </div>
        </div>`;
    } else {
        return `
        <div class="data-card-photo-section">
            <div class="data-card-photo-wrapper">
                <div class="data-card-photo">
                    <div class="data-card-photo-placeholder">👤</div>
                </div>
                <div class="data-card-photo-label">Belum Ada Foto</div>
            </div>
        </div>`;
    }
}

function buildDataFields(data) {
    const statusClass = getStatusClassForCard(data.status);
    
    return `
    <div class="data-card-fields">
        <div class="data-card-field">
            <div class="data-card-field-label">Nomor Register</div>
            <div class="data-card-field-value"><strong>${data.noRegister}</strong></div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Status</div>
            <div class="data-card-field-value"><span class="data-card-status" style="${statusClass}">${data.status}</span></div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">NIK</div>
            <div class="data-card-field-value">${data.nik}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Nama Lengkap</div>
            <div class="data-card-field-value"><strong>${data.namaLengkap}</strong></div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Tempat, Tanggal Lahir</div>
            <div class="data-card-field-value">${data.tempatLahir}, ${data.tanggalLahir}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Pekerjaan / Jabatan</div>
            <div class="data-card-field-value">${data.pekerjaan}<br><small>${data.posisiJabatan}</small></div>
        </div>
        <div class="data-card-field full-width">
            <div class="data-card-field-label">Alamat KTP</div>
            <div class="data-card-field-value">${data.alamatKTP}</div>
        </div>
        <div class="data-card-field full-width">
            <div class="data-card-field-label">Alamat Domisili (Lama: ${data.lamaDomisili})</div>
            <div class="data-card-field-value">${data.alamatDomisili}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Unit Kerja</div>
            <div class="data-card-field-value">${data.unitKerja}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Jurusan Tujuan</div>
            <div class="data-card-field-value">${data.jurusanTujuan}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Jenjang Pendidikan</div>
            <div class="data-card-field-value">${data.jenjangPendidikan}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Unit Tujuan</div>
            <div class="data-card-field-value">${data.unitTujuan}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Rencana Tahun</div>
            <div class="data-card-field-value">${data.rencanaTahun}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Tanggal Pengajuan</div>
            <div class="data-card-field-value">${data.tanggalPengajuan}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">No. HP / WhatsApp</div>
            <div class="data-card-field-value">${data.noHP}<br>${data.noWhatsApp}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Email</div>
            <div class="data-card-field-value">${data.email}</div>
        </div>
        <div class="data-card-field full-width">
            <div class="data-card-field-label">Penjelasan / Narasi</div>
            <div class="data-card-field-value">${data.penjelasan}</div>
        </div>
    </div>`;
}

function buildCrudActions(data) {
    return `
    <div class="data-card-actions">
        <button class="btn btn-action-edit" onclick="editFromCard()">
            ✏️ Edit Data
        </button>
        <button class="btn btn-action-status" onclick="changeStatusFromCard()">
            🔄 Ubah Status
        </button>
        <button class="btn btn-action-delete" onclick="deleteFromCard()">
            🗑️ Hapus
        </button>
        <button class="btn btn-action-close" onclick="closeDataCardModal()">
            ✖ Tutup
        </button>
    </div>`;
}

/**
 * Build Roadmap Card - FIXED VERSION
 * Menggunakan OBJECT PROPERTY NAMES sesuai SQL schema tabel roadmap
 * 
 * STRUKTUR DATA YANG BENAR (dari Supabase):
 * - row.id (UUID)
 * - row.jurusan (text)
 * - row.kualifikasi_awal (text)
 * - row.jenis_pendidikan (text)
 * - row.perguruan_tinggi (text)
 * - row.pekerjaan (text)
 * - row.tahun_studi (integer)
 * - row.jumlah_kuota (integer)
 * - row.kuota_terisi (integer)
 * - row.sisa_kuota (generated)
 * - row.unit_pendayaguna (text)
 * - row.status (varchar)
 * - row.nama_penerima (text)
 */
function buildRoadmapCard(rowData, index) {
    // FIXED: Gunakan object properties, bukan array indexing
    console.log('[DEBUG buildRoadmapCard] Input data:', rowData);
    console.log('[DEBUG buildRoadmapCard] Available keys:', Object.keys(rowData || {}));
    
    const id = rowData?.id || '-';
    const jurusan = rowData?.jurusan || '-';
    const kualifikasiAwal = rowData?.kualifikasi_awal || '-';
    const jenisPendidikan = rowData?.jenis_pendidikan || '-';
    const perguruanTinggi = rowData?.perguruan_tinggi || '-';
    const pekerjaan = rowData?.pekerjaan || '-';
    const tahunStudi = rowData?.tahun_studi || '-';
    const jumlahKuota = rowData?.jumlah_kuota || 0;
    const kuotaTerisi = rowData?.kuota_terisi || 0;
    const sisaKuota = rowData?.sisa_kuota !== undefined ? rowData.sisa_kuota : (jumlahKuota - kuotaTerisi);
    const unitPendayaguna = rowData?.unit_pendayaguna || '-';
    const status = rowData?.status || 'Aktif';
    const namaPenerima = rowData?.nama_penerima || '-';
    
    const statusClass = getStatusClassForCard(status);
    
    return `
    <div class="data-card-photo-section" style="background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);">
        <div class="data-card-photo-wrapper">
            <div class="data-card-photo" style="background: white; width: 120px; height: 120px; font-size: 2.5rem;">
                🗺️
            </div>
            <div class="data-card-photo-label"><strong>${jurusan}</strong> - ${tahunStudi}</div>
        </div>
    </div>
    <div class="data-card-fields">
        <div class="data-card-field">
            <div class="data-card-field-label">Jurusan / Program Studi</div>
            <div class="data-card-field-value"><strong>${jurusan}</strong></div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Status</div>
            <div class="data-card-field-value"><span class="data-card-status" style="${statusClass}">${status}</span></div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Kualifikasi Awal</div>
            <div class="data-card-field-value">${kualifikasiAwal}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Jenis Pendidikan</div>
            <div class="data-card-field-value">${jenisPendidikan}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Perguruan Tinggi</div>
            <div class="data-card-field-value">${perguruanTinggi}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Pekerjaan</div>
            <div class="data-card-field-value">${pekerjaan}</div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Tahun Studi</div>
            <div class="data-card-field-value"><strong>${tahunStudi}</strong></div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Kuota</div>
            <div class="data-card-field-value">${kuotaTerisi} / ${jumlahKuota} <small>(Sisa: ${sisaKuota})</small></div>
        </div>
        <div class="data-card-field">
            <div class="data-card-field-label">Unit Pendayaguna</div>
            <div class="data-card-field-value">${unitPendayaguna}</div>
        </div>
        ${namaPenerima && namaPenerima !== '-' ? `
        <div class="data-card-field full-width">
            <div class="data-card-field-label">Nama Penerima</div>
            <div class="data-card-field-value"><em>${namaPenerima}</em></div>
        </div>
        ` : ''}
    </div>
    <div class="data-card-actions">
        <button class="btn btn-action-edit" onclick="editRoadmapFromCard(${index})">
            ✏️ Edit Roadmap
        </button>
        <button class="btn btn-action-status" onclick="changeRoadmapStatusFromCard(${index})">
            🔄 Ubah Status
        </button>
        <button class="btn btn-action-delete" onclick="deleteRoadmapFromCard(${index})">
            🗑️ Hapus
        </button>
        <button class="btn btn-action-close" onclick="closeRoadmapCardModal()">
            ✖ Tutup
        </button>
    </div>`;
}

function getStatusClassForCard(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('setujui') || s === 'aktif' || s === 'selesai') return 'background:#dcfce7;color:#166534;';
    if (s.includes('tolak') || s === 'non-aktif' || s === 'batal') return 'background:#fee2e2;color:#991b1b;';
    if (s.includes('perbaikan') || s === 'pending') return 'background:#fef3c7;color:#92400e;';
    if (s.includes('verifikasi')) return 'background:#dbeafe;color:#1e40af;';
    return 'background:#f1f5f9;color:#475569;';
}

// CRUD Actions from Data Card
function editFromCard() {
    if (!currentCardData) return;
    closeDataCardModal();
    showToast('🔧 Fitur Edit akan dibuka...', 'info');
    // TODO: Implement edit form
}

function deleteFromCard() {
    if (!currentCardData) return;
    if (confirm(`⚠️ Hapus data ${currentCardData.namaLengkap}?`)) {
        if (typeof deletePengusul === 'function') {
            deletePengusul(currentCardData.rowNumber);
        }
        closeDataCardModal();
    }
}

function changeStatusFromCard() {
    if (!currentCardData) return;
    
    const content = document.getElementById('status-change-content');
    content.innerHTML = `
        <p style="margin-bottom:1rem;color:#64748b;">Ubah status untuk: <strong>${currentCardData.namaLengkap}</strong></p>
        <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1.5rem;">
            <label style="padding:0.75rem;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#e2e8f0'">
                <input type="radio" name="new-status" value="Disetujui" style="margin-right:0.5rem"> ✅ Disetujui
            </label>
            <label style="padding:0.75rem;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#e2e8f0'">
                <input type="radio" name="new-status" value="Perbaikan" style="margin-right:0.5rem"> ⚠️ Perbaikan
            </label>
            <label style="padding:0.75rem;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#e2e8f0'">
                <input type="radio" name="new-status" value="Ditolak" style="margin-right:0.5rem"> ❌ Ditolak
            </label>
            <label style="padding:0.75rem;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#e2e8f0'">
                <input type="radio" name="new-status" value="Batal" style="margin-right:0.5rem"> 🚫 Batal
            </label>
        </div>
        <div style="display:flex;gap:0.75rem;">
            <button class="btn btn-secondary" style="flex:1;" onclick="closeModal('status-change-inner-modal')">Batal</button>
            <button class="btn btn-primary" style="flex:1;" onclick="submitStatusChange()">Simpan Perubahan</button>
        </div>
    `;
    
    closeModal('data-card-modal');
    document.getElementById('status-change-inner-modal').classList.add('active');
}

async function submitStatusChange() {
    const selected = document.querySelector('input[name="new-status"]:checked');
    if (!selected) {
        showToast('⚠️ Pilih status baru!', 'error');
        return;
    }
    
    const newStatus = selected.value;
    
    try {
        // Using Supabase directly
        const { data, error } = await supabaseClient
            .from('submissions')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', rowId)
            .select();
        
        if (error) throw error;
        
        showToast(`✅ Status berhasil diubah ke ${newStatus}`, 'success');
        closeModal('status-update-modal');
        if (typeof fetchAdminData === 'function') fetchAdminData();
    } catch (error) {
        console.error('Error updating status:', error);
        showToast(`❌ Gagal mengubah status: ${error.message}`, 'error');
    }
}

// Roadmap Card Actions
function editRoadmapFromCard(index) {
    closeRoadmapCardModal();
    if (typeof openEditRoadmapModal === 'function') {
        openEditRoadmapModal(index);
    } else {
        showToast('🔧 Fitur Edit Roadmap...', 'info');
    }
}

async function deleteRoadmapFromCard(index) {
    if (!confirm('⚠️ Hapus data roadmap ini?')) return;
    
    closeRoadmapCardModal();
    if (typeof deleteRoadmap === 'function') {
        await deleteRoadmap(index);
    }
}

function changeRoadmapStatusFromCard(index) {
    closeRoadmapCardModal();
    showToast('🔄 Fitur Ubah Status Roadmap...', 'info');
    // TODO: Implement roadmap status change
}

function closeDataCardModal() {
    document.getElementById('data-card-modal').classList.remove('active');
    currentCardData = null;
    currentCardRowNumber = null;
}

function closeRoadmapCardModal() {
    document.getElementById('roadmap-card-modal').classList.remove('active');
    currentCardData = null;
}




