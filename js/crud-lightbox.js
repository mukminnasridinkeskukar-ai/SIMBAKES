/**
 * SIMBAKES Panel Admin - LIGHTBOX CRUD SYSTEM (Complete Implementation)
 * ================================================================
 * Implementasi CRUD AKTIF di dalam Lightbox
 */

// ERROR HANDLING: Wrap entire CRUD system in try-catch
try {

/**
 * activeRecord - Record yang sedang dibuka di Lightbox
 * SEMUA operasi CRUD menggunakan variable ini
 */
let activeRecord = null;
let lightboxCRUDState = {
    isEditing: false,
    isProcessing: false,
    originalData: null
};

// ============================================================
// TOAST NOTIFICATION SYSTEM (Modern)
// ============================================================

const ToastManager = {
    container: null,
    
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
    },
    
    show(message, type = 'success', duration = 4000) {
        this.init();
        
        const toast = document.createElement('div');
        
        const colors = {
            success: { bg: 'linear-gradient(135deg, #065f46, #059669)', icon: '✓', border: '#10b981' },
            error: { bg: 'linear-gradient(135deg, #991b1b, #dc2626)', icon: '✕', border: '#ef4444' },
            warning: { bg: 'linear-gradient(135deg, #92400e, #d97706)', icon: '⚠', border: '#f59e0b' },
            info: { bg: 'linear-gradient(135deg, #1e40af, #2563eb)', icon: 'ℹ', border: '#3b82f6' }
        };
        
        const config = colors[type] || colors.success;
        
        toast.style.cssText = `
            background: ${config.bg};
            color: white;
            padding: 14px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3), 0 0 0 1px ${config.border};
            font-family: Tahoma, Geneva, Verdana, sans-serif;
            font-size: 0.9rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
            pointer-events: auto;
            transform: translateX(120%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
        `;
        
        toast.innerHTML = `
            <span style="font-size: 1.2rem; flex-shrink: 0;">${config.icon}</span>
            <span style="flex: 1;">${message}</span>
            <span style="opacity: 0.7; font-size: 1rem; flex-shrink: 0;">✕</span>
        `;
        
        // Click to dismiss
        toast.addEventListener('click', () => this.dismiss(toast));
        
        this.container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });
        
        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }
        
        return toast;
    },
    
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },
    
    success(msg) { return this.show(msg, 'success'); },
    error(msg) { return this.show(msg, 'error', 6000); },
    warning(msg) { return this.show(msg, 'warning'); },
    info(msg) { return this.show(msg, 'info'); }
};

// Make globally available
window.ToastManager = ToastManager;

// ============================================================
// SUPABASE CLIENT HELPER
// ============================================================

/**
 * getSupabaseClient() - Get initialized Supabase client
 */
function getSupabaseClient() {
    // Try to use existing global client
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        return supabaseClient;
    }
    
    // Fallback: create new client from window config
    if (typeof window.SUPABASE_URL !== 'undefined' && typeof window.SUPABASE_ANON_KEY !== 'undefined') {
        return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    
    console.error('[CRUD] ❌ Supabase client not available!');
    return null;
}

// ============================================================
// TABLE RENDERER - NO CRUD BUTTONS (5 Columns Only)
// ============================================================

/**
 * renderAdminTableClean() - Render tabel dengan 5 kolom saja, TANPA tombol CRUD
 * Tabel hanya untuk melihat dan memilih data
 */
function renderAdminTableClean(data) {
    const tbody = document.getElementById('pengusul-table-body');
    if (!tbody) {
        console.error('[TABLE] Tbody not found');
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:3rem;color:#64748b;">
                    <div style="font-size:3rem;margin-bottom:1rem;">📭</div>
                    <p style="font-size:1rem;font-weight:600;">Tidak ada data ditemukan</p>
                    <p style="font-size:0.85rem;margin-top:0.5rem;opacity:0.7;">
                        Klik baris data untuk melihat detail dan mengelola data
                    </p>
                </td>
            </tr>
        `;
        return;
    }
    
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    const truncate = (text, maxLen = 30) => {
        if (!text || text === '-') return '-';
        return text.length > maxLen ? escapeHtml(text.substring(0, maxLen)) + '...' : escapeHtml(text);
    };
    
    // Row color variation - Cycling: Blue -> Green -> Purple -> Orange -> Cyan
    const getRowColorClass = (index) => {
        const colors = ['tr-color-0', 'tr-color-1', 'tr-color-2', 'tr-color-3', 'tr-color-4'];
        return colors[index % colors.length];
    };
    
    let html = '';
    
    data.forEach((row, index) => {
        const id = row.id || '';
        const colorClass = getRowColorClass(index);
        
        // Data 5 kolom utama
        const nik = row.nik || '-';
        const namaLengkap = row.nama_lengkap || row.nama || '-';
        const jurusanTujuan = row.jurusan_tujuan || row.jurusan || '-';
        const rencanaTahun = row.rencana_tahun || '-';
        const unitTujuan = row.unit_tujuan || row.unit_kerja || '-';
        
        html += `
            <tr data-id="${id}" data-index="${index}" class="${colorClass}" 
                style="cursor:pointer;transition:all 0.2s ease;"
                data-clickable="true"
                onmouseenter="this.style.transform='scale(1.005)'"
                onmouseleave="this.style.transform='scale(1)'">
                
                <!-- KOLOM 1: NIK -->
                <td class="col-nik" style="font-family:monospace;font-weight:700;font-size:0.9rem;color:#1e293b;letter-spacing:0.5px;">
                    ${escapeHtml(nik)}
                </td>
                
                <!-- KOLOM 2: Nama Lengkap -->
                <td class="col-nama">
                    <strong style="color:#0f172a;font-size:0.92rem;">${escapeHtml(namaLengkap)}</strong>
                </td>
                
                <!-- KOLOM 3: Jurusan Tujuan -->
                <td class="col-jurusan" style="font-size:0.88rem;color:#334155;">
                    ${escapeHtml(jurusanTujuan)}
                </td>
                
                <!-- KOLOM 4: Rencana Tahun Studi -->
                <td class="col-tahun" style="text-align:center;">
                    <span style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af;
                                padding:0.35rem 0.8rem;border-radius:8px;font-weight:700;font-size:0.85rem;
                                display:inline-block;min-width:80px;">
                        ${escapeHtml(rencanaTahun)}
                    </span>
                </td>
                
                <!-- KOLOM 5: Unit Penempatan -->
                <td class="col-unit" style="font-size:0.88rem;color:#334155;" title="${escapeHtml(unitTujuan)}">
                    ${truncate(unitTujuan, 28)}
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // ===== EVENT DELEGATION: Handle Row Click to Open Lightbox =====
    // Menggunakan addEventListener (tidak bergantung pada inline onclick)
    tbody.addEventListener('click', function onRowClick(e) {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;
        
        // Abaikan klik di dalam tombol/link
        if (e.target.closest('button, a, .btn-crud, [data-no-click]')) return;
        
        const recordId = row.getAttribute('data-id');
        const index = parseInt(row.getAttribute('data-index')) || 0;
        
        console.log(`[ROW CLICK] ID: ${recordId}, Index: ${index}`);
        
        // Panggil handler global
        if (typeof window.handleTableRowClick === 'function') {
            window.handleTableRowClick(recordId, index);
        } else if (typeof handleTableRowClick === 'function') {
            handleTableRowClick(recordId, index);
        }
    });
    
    console.log(`[TABLE] ✅ Rendered ${data.length} rows (clean mode + event delegation)`);
}

/**
 * handleTableRowClick() - Handle click pada baris tabel
 * PERBAIKAN KRITIS: Gunakan index-based lookup langsung dari array
 * JANGAN cari berdasarkan ID/NIK - gunakan record yang SUDAH ADA di memory
 */
function handleTableRowClick(recordId, index) {
    console.group('🖱️ SIMBAKES ROW CLICK DEBUG');
    console.log('recordId (dari data-id):', recordId);
    console.log('index (dari data-index):', index);
    console.log('pengusulData length:', typeof pengusulData !== 'undefined' ? pengusulData.length : 'UNDEFINED');
    console.log('pengusulData is Array:', Array.isArray(pengusulData));
    
    // ============================================================
    // PERBAIKAN: Gunakan INDEX langsung, bukan pencarian ID
    // Record sudah ada di pengusulData[index] saat tabel dirender
    // ============================================================
    let record = null;
    
    // CEK 1: Index-based lookup (UTAMA - paling reliable)
    if (typeof index === 'number' && !isNaN(index) && index >= 0) {
        if (typeof pengusulData !== 'undefined' && Array.isArray(pengusulData) && pengusulData[index]) {
            record = pengusulData[index];
            console.log('✅ Record ditemukan via INDEX:', index);
        }
    }
    
    // CEK 2: Fallback ID-based lookup (jika index gagal)
    if (!record && recordId && typeof pengusulData !== 'undefined' && Array.isArray(pengusulData)) {
        record = pengusulData.find(item => 
            item.id === recordId || 
            String(item.id) === String(recordId) ||
            item.nik === recordId ||
            item.no_register === recordId
        );
        if (record) {
            console.log('⚠️ Record ditemukan via ID fallback:', recordId);
        }
    }
    
    // DEBUG: Tampilkan status akhir
    console.log('FINAL RECORD:', record);
    if (record) {
        console.log('Record keys:', Object.keys(record));
        console.log('Record ID:', record.id);
        console.log('Record NIK:', record.nik);
        console.log('Record Nama:', record.nama_lengkap || record.nama);
    }
    console.groupEnd();
    
    if (record && typeof record === 'object' && Object.keys(record).length > 0) {
        // Set activeRecord SEBELUM membuka lightbox
        activeRecord = record;
        console.log('[ROW CLICK] ✅ Membuka Lightbox dengan record valid');
        // Gunakan openDetailLightbox (wrapper yang lebih robust)
        openDetailLightbox(record);
    } else {
        console.error('[ROW CLICK] ❌ Gagal mendapatkan record!');
        console.error('[ROW CLICK] Diagnosa:');
        console.error('  - pengusulData ada?', typeof pengusulData !== 'undefined');
        console.error('  - pengusulData array?', Array.isArray(pengusulData));
        console.error('  - pengusulData length:', typeof pengusulData !== 'undefined' ? pengusulData.length : 'N/A');
        console.error('  - index valid?', index, typeof index);
        console.error('  - recordId:', recordId);
        
        if (typeof ToastManager !== 'undefined' && ToastManager.error) {
            ToastManager.error('Gagal memuat record. Silakan refresh halaman.');
        } else {
            alert('Gagal memuat record. Silakan refresh halaman.');
        }
    }
}

// ============================================================
// OPEN DETAIL LIGHTBOX - Fungsi utama pembuka popup
// MENERIMA RECORD LANGSUNG, tidak melakukan query ulang
// ============================================================

/**
 * openDetailLightbox() - Buka popup detail dengan record yang sudah ada
 * @param {Object} record - Record object lengkap dari pengusulData
 * 
 * Alur: SUPABASE → pengusulData[] → render table → data-record-index 
 *       → klik baris → pengusulData[index] → activeRecord → openDetailLightbox(activeRecord)
 * 
 * JANGAN lakukan query Supabase lagi di dalam fungsi ini!
 */
function openDetailLightbox(record) {
    console.group('🔓 SIMBAKES OPEN DETAIL LIGHTBOX');
    console.log('RECEIVED RECORD:', record);
    
    // Validasi record
    if (!record || typeof record !== 'object') {
        console.error('❌ Invalid record:', record);
        if (typeof ToastManager !== 'undefined' && ToastManager.error) {
            ToastManager.error('Record tidak valid', 'error');
        }
        console.groupEnd();
        return;
    }
    
    if (Object.keys(record).length === 0) {
        console.error('❌ Record is empty object');
        if (typeof ToastManager !== 'undefined' && ToastManager.error) {
            ToastManager.error('Record kosong', 'error');
        }
        console.groupEnd();
        return;
    }
    
    // Set activeRecord GLOBAL (digunakan oleh semua fungsi CRUD)
    activeRecord = record;
    
    console.log('✅ Active record set:');
    console.log('  - ID:', record.id);
    console.log('  - NIK:', record.nik);
    console.log('  - Nama:', record.nama_lengkap || record.nama);
    console.log('  - Keys count:', Object.keys(record).length);
    console.groupEnd();
    
    // Delegate ke FINAL Lightbox system
    if (typeof openFullScreenLightbox === 'function') {
        openFullScreenLightbox(record);
    } else if (typeof openLightboxWithCRUD === 'function') {
        openLightboxWithCRUD(record);
    } else {
        console.error('❌ Tidak ada lightbox tersedia!');
        ToastManager.error('Sistem popup belum dimuat. Silakan refresh.');
    }
}

// Export globally
window.openDetailLightbox = openDetailLightbox;

// ============================================================
// LIGHTBOX WITH FULL CRUD SYSTEM
// ============================================================

/**
 * openLightboxWithCRUD() - Buka Lightbox lengkap dengan sistem CRUD
 * @param {Object} record - Data record yang akan ditampilkan
 */
async function openLightboxWithCRUD(record) {
    console.log('[LIGHTBOX] Opening with CRUD system for:', record?.id);
    
    // Set activeRecord GLOBAL
    activeRecord = record;
    lightboxCRUDState.isEditing = false;
    lightboxCRUDState.originalData = JSON.parse(JSON.stringify(record)); // Deep copy
    
    // Buat atau dapatkan lightbox element
    let lightbox = document.getElementById('crud-lightbox');
    if (!lightbox) {
        lightbox = createCRUDLightbox();
        document.body.appendChild(lightbox);
    }
    
    // Populate content
    await populateLightboxContent(lightbox, record);
    
    // Show dengan animasi
    requestAnimationFrame(() => {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        console.log('[LIGHTBOX] ✅ Opened with CRUD system');
    });
}

/**
 * createCRUDLightbox() - Buat struktur HTML Lightbox dengan CRUD
 * Struktur:
 * ┌─────────────────────────────────────────────┐
 * │ HEADER: Title + Close                       │
 * ├──────────────────┬──────────────────────────┤
 * │                  │                          │
 * │   FOTO BESAR     │  DATA GRID (semua field) │
 * │                  │                          │
 * ├──────────────────┴──────────────────────────┤
 * │ FOOTER: [EDIT][STATUS][DELETE][CLOSE]       │
 * └─────────────────────────────────────────────┘
 */
function createCRUDLightbox() {
    const lightbox = document.createElement('div');
    lightbox.id = 'crud-lightbox';
    lightbox.className = 'lightbox-overlay';
    lightbox.innerHTML = `
        <div class="lightbox-container" id="lightbox-main-container">
            
            <!-- ===== LEFT: PHOTO SECTION ===== -->
            <div class="lightbox-photo-section">
                <div class="lightbox-photo-wrapper" id="lightbox-photo-wrapper">
                    <div class="photo-loading-spinner" id="photo-loader"></div>
                    <img class="lightbox-photo" id="lightbox-photo-img" alt="Foto Peserta" style="opacity:0;">
                    <div class="lightbox-photo-placeholder" id="lightbox-photo-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="80" height="80">
                            <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                        </svg>
                        <span>Tidak ada foto</span>
                    </div>
                </div>
                <p class="lightbox-photo-label" id="lightbox-photo-name">-</p>
            </div>
            
            <!-- ===== RIGHT: DATA + ACTIONS SECTION ===== -->
            <div class="lightbox-data-section">
                
                <!-- Header -->
                <div class="lightbox-header">
                    <div class="lightbox-title">
                        <h2 id="lightbox-title-nama">Detail Data Peserta</h2>
                        <span class="lightbox-title-badge" id="lightbox-register-badge">#-</span>
                    </div>
                    <button class="lightbox-close-btn" onclick="closeLightboxCRUD()" title="Tutup (ESC)">✕</button>
                </div>
                
                <!-- EDIT FORM OVERLAY (Hidden by default) -->
                <div class="lightbox-edit-overlay" id="lightbox-edit-overlay" style="display:none;">
                    <div class="lightbox-edit-content">
                        <div class="lightbox-edit-header">
                            <h3>✏️ EDIT DATA PESERTA</h3>
                            <span class="edit-hint">Ubah field yang diperlukan, lalu simpan perubahan</span>
                        </div>
                        <form id="edit-form" class="lightbox-edit-form" onsubmit="handleEditSubmit(event)">
                            <div class="edit-form-grid" id="edit-form-grid">
                                <!-- Form fields will be generated dynamically -->
                            </div>
                            <div class="edit-form-actions">
                                <button type="button" class="btn-lightbox-action btn-cancel-edit" onclick="cancelEditMode()">
                                    ✕ BATAL
                                </button>
                                <button type="submit" class="btn-lightbox-action btn-save-edit" id="btn-save-edit">
                                    💾 SIMPAN PERUBAHAN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <!-- STATUS CHANGE OVERLAY (Hidden by default) -->
                <div class="lightbox-status-overlay" id="lightbox-status-overlay" style="display:none;">
                    <div class="lightbox-status-content">
                        <div class="lightbox-status-header">
                            <h3>✓ UBAH STATUS PENGAJUAN</h3>
                        </div>
                        <div class="status-options" id="status-options">
                            <!-- Status options will be generated dynamically -->
                        </div>
                        <div class="status-actions">
                            <button type="button" class="btn-lightbox-action btn-cancel-status" onclick="cancelStatusMode()">
                                ✕ BATAL
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- DELETE CONFIRMATION OVERLAY (Hidden by default) -->
                <div class="lightbox-delete-overlay" id="lightbox-delete-overlay" style="display:none;">
                    <div class="lightbox-delete-content">
                        <div class="delete-icon">🗑️</div>
                        <h3>HAPUS DATA?</h3>
                        <p>Data peserta ini akan dihapus <strong>secara permanen</strong> dari tabel submissions.</p>
                        <p class="delete-warning">Tindakan ini tidak dapat dibatalkan!</p>
                        <div class="delete-actions">
                            <button type="button" class="btn-lightbox-action btn-cancel-delete" onclick="cancelDeleteMode()">
                                ✕ BATAL
                            </button>
                            <button type="button" class="btn-lightbox-action btn-confirm-delete" id="btn-confirm-delete" onclick="confirmDeleteAction()">
                                🗑 YA, HAPUS DATA
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Data Grid (Normal view) -->
                <div class="lightbox-data-scroll" id="lightbox-data-scroll">
                    <div class="lightbox-data-grid" id="lightbox-data-grid">
                        <!-- Fields populated dynamically -->
                    </div>
                </div>
                
                <!-- ===== CRUD FOOTER (Always visible at bottom) ===== -->
                <div class="lightbox-crud-footer" id="lightbox-crud-footer">
                    <div class="crud-footer-info">
                        <span id="lightbox-record-info">Record 0 of 0</span>
                        <div class="nav-buttons">
                            <button class="lightbox-nav-btn" id="lb-prev-btn" onclick="navigateLightboxCRUD(-1)" title="Sebelumnya">◀</button>
                            <button class="lightbox-nav-btn" id="lb-next-btn" onclick="navigateLightboxCRUD(1)" title="Selanjutnya">▶</button>
                        </div>
                    </div>
                    <div class="crud-footer-buttons">
                        <button class="btn-crud-footer btn-edit-data" id="lb-btn-edit" onclick="openEditMode()">
                            ✏️ EDIT DATA
                        </button>
                        <button class="btn-crud-footer btn-status-data" id="lb-btn-status" onclick="openStatusMode()">
                            ✓ UBAH STATUS
                        </button>
                        <button class="btn-crud-footer btn-delete-data" id="lb-btn-delete" onclick="openDeleteMode()">
                            🗑️ HAPUS DATA
                        </button>
                        <button class="btn-crud-footer btn-close-data" onclick="closeLightboxCRUD()">
                            ✕ TUTUP
                        </button>
                    </div>
                </div>
                
            </div>
        </div>
    `;
    
    // Event: Click outside to close
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox && !lightboxCRUDState.isEditing) {
            closeLightboxCRUD();
        }
    });
    
    return lightbox;
}

// ============================================================
// POPULATE LIGHTBOX CONTENT
// ============================================================

/**
 * populateLightboxContent() - Isi konten Lightbox dengan data record
 */
async function populateLightboxContent(lightbox, record) {
    const nama = record.nama_lengkap || record.nama || '-';
    const noRegister = record.no_register || '-';
    const id = record.id || '';
    
    // Update header
    document.getElementById('lightbox-title-nama').textContent = nama;
    document.getElementById('lightbox-register-badge').textContent = `#${noRegister}`;
    document.getElementById('lightbox-photo-name').textContent = nama;
    
    // Update navigation info
    const totalRecords = typeof pengusulData !== 'undefined' ? pengusulData.length : 1;
    const currentIndex = typeof pengusulData !== 'undefined' ? 
        pengusulData.findIndex(item => item.id === id) : 0;
    document.getElementById('lightbox-record-info').textContent = `Record ${currentIndex + 1} of ${totalRecords}`;
    
    // Update nav buttons
    document.getElementById('lb-prev-btn').disabled = currentIndex <= 0;
    document.getElementById('lb-next-btn').disabled = currentIndex >= totalRecords - 1;
    
    // Load photo with multi-fallback
    await loadPhotoToLightbox(record);
    
    // Generate all fields
    generateAllFieldsHTML(record);
}

/**
 * loadPhotoToLightbox() - Load foto ke Lightbox dengan multi-fallback
 */
async function loadPhotoToLightbox(record) {
    const photoImg = document.getElementById('lightbox-photo-img');
    const placeholder = document.getElementById('lightbox-photo-placeholder');
    const loader = document.getElementById('photo-loader');
    
    if (!photoImg) return;
    
    // Show loading
    loader.style.display = 'block';
    photoImg.style.opacity = '0';
    placeholder.style.display = 'none';
    
    try {
        // Resolve best photo URL
        const photoResult = await resolvePhotoUrl(record);
        
        if (photoResult.url) {
            // Test and load image
            await loadSupabasePhoto(photoResult.url, photoImg);
            placeholder.style.display = 'none';
        } else {
            throw new Error('No photo URL resolved');
        }
    } catch (error) {
        console.warn('[PHOTO] Using fallback:', error.message);
        photoImg.src = `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <rect fill="#f1f5f9" width="100" height="100"/>
                <circle cx="50" cy="35" r="20" fill="#94a3b8"/>
                <ellipse cx="50" cy="85" rx="30" ry="25" fill="#94a3b8"/>
                <text y="95" font-size="10" text-anchor="middle" fill="#64748b">No Photo</text>
            </svg>
        `)`;
        placeholder.style.display = 'flex';
    } finally {
        loader.style.display = 'none';
    }
}

/**
 * SUBMISSIONS_FIELDS_COMPLETE - Definisi semua field submissions
 */
const SUBMISSIONS_FIELDS_COMPLETE = [
    { key: 'nik', label: 'NIK', icon: '🆔', type: 'text', highlight: true },
    { key: 'nama_lengkap', label: 'Nama Lengkap', icon: '👤', type: 'text', highlight: true },
    { key: 'tempat_lahir', label: 'Tempat Lahir', icon: '📍', type: 'text' },
    { key: 'tanggal_lahir', label: 'Tanggal Lahir', icon: '🎂', type: 'date' },
    { key: 'alamat_ktp', label: 'Alamat KTP', icon: '🏠', type: 'textarea', fullWidth: true },
    { key: 'alamat_domisili', label: 'Alamat Domisili', icon: '🏡', type: 'textarea', fullWidth: true },
    { key: 'lama_domisili', label: 'Lama Domisili', icon: '⏱️', type: 'text' },
    { key: 'pekerjaan', label: 'Pekerjaan', icon: '💼', type: 'text' },
    { key: 'posisi', label: 'Posisi/Jabatan', icon: '🎯', type: 'text' },
    { key: 'unit_kerja', label: 'Unit Kerja', icon: '🏢', type: 'text' },
    { key: 'penjelasan', label: 'Penjelasan/Narasi', icon: '📝', type: 'textarea', fullWidth: true },
    { key: 'jurusan_tujuan', label: 'Jurusan Tujuan', icon: '🎓', type: 'text', highlight: true },
    { key: 'jenjang_pendidikan', label: 'Jenjang Pendidikan', icon: '📚', type: 'text' },
    { key: 'unit_tujuan', label: 'Unit Penempatan', icon: '🏥', type: 'text', highlight: true },
    { key: 'rencana_tahun', label: 'Rencana Tahun Studi', icon: '📅', type: 'text', highlight: true },
    { key: 'no_hp', label: 'No HP', icon: '📱', type: 'tel' },
    { key: 'no_wa', label: 'No WhatsApp', icon: '💬', type: 'tel' },
    { key: 'email', label: 'Email', icon: '✉️', type: 'email' },
    { key: 'nama_file', label: 'Nama File Dokumen', icon: '📄', type: 'text' },
    { key: 'status', label: 'Status Pengajuan', icon: '📊', type: 'status' },
    { key: 'created_at', label: 'Tanggal Pengajuan', icon: '🕐', type: 'datetime' },
    { key: 'link_foto', label: 'Link Foto', icon: '📷', type: 'link', fullWidth: true },
    { key: 'link_dokumen', label: 'Link Dokumen', icon: '📁', type: 'link', fullWidth: true }
];

/**
 * generateAllFieldsHTML() - Generate HTML untuk semua field dalam Lightbox
 */
function generateAllFieldsHTML(record) {
    const dataGrid = document.getElementById('lightbox-data-grid');
    if (!dataGrid) return;
    
    const formatDate = (dateVal) => {
        if (!dateVal) return '-';
        try {
            const d = new Date(dateVal);
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch { return '-'; }
    };
    
    const formatDateTime = (dateVal) => {
        if (!dateVal) return '-';
        try {
            const d = new Date(dateVal);
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + 
                   ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        } catch { return '-'; }
    };
    
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    const getStatusConfig = (status) => {
        if (!status) return { cls: 'status-pending-lightbox', icon: '⏳', text: 'Pending' };
        const s = String(status).toLowerCase();
        if (s.includes('diterima') || s.includes('lulus') || s.includes('approved')) 
            return { cls: 'status-diterima-lightbox', icon: '✅', text: status };
        if (s.includes('ditolak') || s.includes('reject') || s.includes('denied')) 
            return { cls: 'status-ditolak-lightbox', icon: '❌', text: status };
        if (s.includes('ditinjau') || s.includes('review') || s.includes('proses')) 
            return { cls: 'status-ditinjau-lightbox', icon: '🔍', text: status };
        return { cls: 'status-pending-lightbox', icon: '⏳', text: status };
    };
    
    let html = '';
    
    SUBMISSIONS_FIELDS_COMPLETE.forEach(field => {
        let value = record[field.key];
        const isEmpty = !value || value === '-' || value === 'null';
        let valueClass = 'lightbox-field-value';
        
        if (field.highlight && !isEmpty) valueClass += ' highlight';
        
        // Format based on type
        let displayValue = '-';
        
        switch (field.type) {
            case 'date':
                displayValue = isEmpty ? '-' : formatDate(value);
                break;
            case 'datetime':
                displayValue = isEmpty ? '-' : formatDateTime(value);
                break;
            case 'status':
                const stCfg = getStatusConfig(value);
                valueClass += ` status-value ${stCfg.cls}`;
                displayValue = `${stCfg.icon} ${stCfg.text}`;
                break;
            case 'link':
                if (!isEmpty && String(value).length > 10) {
                    displayValue = `<a href="${escapeHtml(String(value))}" target="_blank" rel="noopener noreferrer" 
                                     style="color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:0.3rem;">
                                     📎 ${String(value).length > 45 ? escapeHtml(String(value).substring(0,45)) + '...' : escapeHtml(String(value))}
                                     </a>`;
                } else {
                    displayValue = '-';
                }
                break;
            case 'textarea':
                displayValue = isEmpty ? '-' : `<span style="white-space:pre-wrap;line-height:1.5;">${escapeHtml(String(value))}</span>`;
                break;
            case 'email':
                displayValue = isEmpty ? '-' : `<a href="mailto:${escapeHtml(String(value))}" style="color:#2563eb;text-decoration:none;">${escapeHtml(String(value))}</a>`;
                break;
            default:
                displayValue = isEmpty ? '-' : escapeHtml(String(value));
        }
        
        html += `
            <div class="lightbox-field ${field.fullWidth ? 'full-width' : ''}">
                <span class="lightbox-field-label">${field.icon} ${field.label}</span>
                <span class="${valueClass}">${displayValue}</span>
            </div>
        `;
    });
    
    dataGrid.innerHTML = html;
}

// ============================================================
// NAVIGATION
// ============================================================

/**
 * navigateLightboxCRUD() - Navigasi antar record
 */
function navigateLightboxCRUD(direction) {
    if (typeof pengusulData === 'undefined' || !Array.isArray(pengusulData)) return;
    
    const currentId = activeRecord?.id;
    const currentIndex = pengusulData.findIndex(item => item.id === currentId);
    
    const newIndex = currentIndex + direction;
    
    if (newIndex < 0 || newIndex >= pengusulData.length) return;
    
    const newRecord = pengusulData[newIndex];
    if (newRecord) {
        activeRecord = newRecord;
        lightboxCRUDState.originalData = JSON.parse(JSON.stringify(newRecord));
        
        // Reset edit mode if active
        if (lightboxCRUDState.isEditing) {
            cancelEditMode();
        }
        
        const lightbox = document.getElementById('crud-lightbox');
        if (lightbox) {
            populateLightboxContent(lightbox, newRecord);
        }
    }
}

// ============================================================
// CLOSE LIGHTBOX
// ============================================================

/**
 * closeLightboxCRUD() - Tutup Lightbox
 */
function closeLightboxCRUD() {
    const lightbox = document.getElementById('crud-lightbox');
    if (lightbox) {
        // Reset states
        lightboxCRUDState.isEditing = false;
        lightboxCRUDState.isProcessing = false;
        
        // Hide overlays
        hideAllOverlays();
        
        // Animate out
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        
        console.log('[LIGHTBOX] Closed');
    }
}

function hideAllOverlays() {
    const overlays = ['lightbox-edit-overlay', 'lightbox-status-overlay', 'lightbox-delete-overlay'];
    const scrolls = ['lightbox-data-scroll'];
    
    overlays.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    scrolls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
    
    // Show footer
    const footer = document.getElementById('lightbox-crud-footer');
    if (footer) footer.style.display = 'flex';
}

// ============================================================
// EDIT MODE - Full Form in Lightbox
// ============================================================

/**
 * openEditMode() - Buka form edit di dalam Lightbox
 */
function openEditMode() {
    if (!activeRecord) {
        ToastManager.error('Tidak ada data aktif');
        return;
    }
    
    console.log('[EDIT] Opening edit mode for:', activeRecord.id);
    
    lightboxCRUDState.isEditing = true;
    
    // Hide data scroll, show edit overlay
    document.getElementById('lightbox-data-scroll').style.display = 'none';
    document.getElementById('lightbox-edit-overlay').style.display = 'block';
    document.getElementById('lightbox-status-overlay').style.display = 'none';
    document.getElementById('lightbox-delete-overlay').style.display = 'none';
    
    // Disable CRUD footer buttons during edit
    setCRUDButtonsDisabled(true);
    
    // Generate edit form fields
    generateEditFormFields(activeRecord);
}

/**
 * generateEditFormFields() - Generate form fields berdasarkan record
 */
function generateEditFormFields(record) {
    const formGrid = document.getElementById('edit-form-grid');
    if (!formGrid) return;
    
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    // Fields yang bisa diedit (exclude auto-generated fields)
    const editableFields = [
        { key: 'nik', label: 'NIK', type: 'text', required: true },
        { key: 'nama_lengkap', label: 'Nama Lengkap', type: 'text', required: true },
        { key: 'tempat_lahir', label: 'Tempat Lahir', type: 'text' },
        { key: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date' },
        { key: 'alamat_ktp', label: 'Alamat KTP', type: 'textarea' },
        { key: 'alamat_domisili', label: 'Alamat Domisili', type: 'textarea' },
        { key: 'lama_domisili', label: 'Lama Domisili (tahun)', type: 'number' },
        { key: 'pekerjaan', label: 'Pekerjaan', type: 'text' },
        { key: 'posisi', label: 'Posisi/Jabatan', type: 'text' },
        { key: 'unit_kerja', label: 'Unit Kerja', type: 'text' },
        { key: 'penjelasan', label: 'Penjelasan/Narasi', type: 'textarea' },
        { key: 'jurusan_tujuan', label: 'Jurusan Tujuan', type: 'text', required: true },
        { key: 'jenjang_pendidikan', label: 'Jenjang Pendidikan', type: 'text' },
        { key: 'unit_tujuan', label: 'Unit Penempatan', type: 'text' },
        { key: 'rencana_tahun', label: 'Rencana Tahun Studi', type: 'text' },
        { key: 'no_hp', label: 'No HP', type: 'tel' },
        { key: 'no_wa', label: 'No WhatsApp', type: 'tel' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'link_foto', label: 'Link Foto URL', type: 'url' },
        { key: 'link_dokumen', label: 'Link Dokumen URL', type: 'url' }
    ];
    
    let html = '';
    
    editableFields.forEach(field => {
        const value = record[field.key] || '';
        const displayValue = escapeHtml(String(value));
        const requiredAttr = field.required ? 'required' : '';
        const requiredMark = field.required ? '<span style="color:#ef4444;margin-left:4px;">*</span>' : '';
        
        // Determine input type
        let inputHtml = '';
        
        switch (field.type) {
            case 'textarea':
                inputHtml = `<textarea name="${field.key}" ${requiredAttr} 
                              style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;
                                     font-family:Tahoma;font-size:0.9rem;resize:vertical;min-height:60px;
                                     transition:border-color 0.2s;"
                              onfocus="this.style.borderColor='#3b82f6'"
                              onblur="this.style.borderColor='#e2e8f0'">${displayValue}</textarea>`;
                break;
            case 'date':
                inputHtml = `<input type="date" name="${field.key}" value="${value ? value.split('T')[0] : ''}" 
                              ${requiredAttr}
                              style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;
                                     font-family:Tahoma;font-size:0.9rem;">`;
                break;
            case 'number':
                inputHtml = `<input type="number" name="${field.key}" value="${displayValue}" 
                              ${requiredAttr}
                              style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;
                                     font-family:Tahoma;font-size:0.9rem;">`;
                break;
            case 'email':
                inputHtml = `<input type="email" name="${field.key}" value="${displayValue}" 
                              ${requiredAttr}
                              style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;
                                     font-family:Tahoma;font-size:0.9rem;">`;
                break;
            case 'url':
                inputHtml = `<input type="url" name="${field.key}" value="${displayValue}" 
                              placeholder="https://..."
                              style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;
                                     font-family:Tahoma;font-size:0.9rem;">`;
                break;
            default:
                inputHtml = `<input type="text" name="${field.key}" value="${displayValue}" 
                              ${requiredAttr}
                              style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;
                                     font-family:Tahoma;font-size:0.9rem;">`;
        }
        
        html += `
            <div class="edit-form-group" style="margin-bottom:1rem;">
                <label style="display:block;font-size:0.8rem;font-weight:700;color:#475569;
                              margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.03em;">
                    ${field.label}${requiredMark}
                </label>
                ${inputHtml}
            </div>
        `;
    });
    
    formGrid.innerHTML = html;
}

/**
 * handleEditSubmit() - Handle form submission - UPDATE to Supabase
 */
async function handleEditSubmit(event) {
    event.preventDefault();
    
    if (!activeRecord) {
        ToastManager.error('Tidak ada data aktif');
        return;
    }
    
    if (lightboxCRUDState.isProcessing) {
        ToastManager.warning('Proses sedang berjalan...');
        return;
    }
    
    const saveBtn = document.getElementById('btn-save-edit');
    const originalText = saveBtn.innerHTML;
    
    try {
        // Set processing state
        lightboxCRUDState.isProcessing = true;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ MENYIMPAN...';
        
        // Collect form data
        const formData = new FormData(event.target);
        const updatedData = {};
        
        // Build update object
        for (let [key, value] of formData.entries()) {
            if (value.trim() !== '') {
                updatedData[key] = value.trim();
            }
        }
        
        // Add timestamp
        updatedData.updated_at = new Date().toISOString();
        
        // VALIDATION
        if (!updatedData.nik || !updatedData.nama_lengkap || !updatedData.jurusan_tujuan) {
            throw new Error('NIK, Nama Lengkap, dan Jurusan Tujuan wajib diisi!');
        }
        
        console.log('[EDIT] Updating record:', activeRecord.id);
        console.log('[EDIT] Update data:', updatedData);
        
        // GET SUPABASE CLIENT
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client tidak tersedia');
        }
        
        // EXECUTE UPDATE - Use actual primary key (usually 'id') - TANPA .single() ⭐
        const primaryKeyField = 'id';
        const primaryKeyValue = activeRecord.id;
        
        console.log('[EDIT] Updating record ID:', primaryKeyValue);
        console.log('[EDIT] Update data:', updatedData);
        
        const { data: resultArray, error } = await client
            .from('submissions')
            .update(updatedData)
            .eq(primaryKeyField, primaryKeyValue)
            .select('*');  // TANPA .single() - return array
        
        // Handle error
        if (error) {
            console.error('[EDIT] Supabase error:', error);
            throw new Error(error.message || 'Gagal menyimpan data ke database');
        }
        
        // Validasi hasil (array, bukan single object)
        if (!resultArray || !Array.isArray(resultArray) || resultArray.length === 0) {
            throw new Error('Update tidak menghasilkan data. Periksa ID record atau RLS policy.');
        }
        
        const result = resultArray[0];  // Ambil record pertama dari array
        
        console.log('[EDIT] ✅ Update successful:', result);
        
        // Update activeRecord with new data
        Object.assign(activeRecord, result);
        lightboxCRUDState.originalData = JSON.parse(JSON.stringify(result));
        
        // Update UI
        generateAllFieldsHTML(result);
        
        // Update table if function exists
        if (typeof fetchAndRenderAdminData === 'function') {
            await fetchAndRenderAdminData();
        } else if (typeof loadPengusulData === 'function') {
            await loadPengusulData();
        }
        
        // Exit edit mode
        cancelEditMode();
        
        // Success notification
        ToastManager.success('✓ Data berhasil diperbarui');
        
    } catch (error) {
        console.error('[EDIT] Error:', error);
        ToastManager.error(`✕ Gagal memperbarui: ${error.message}`);
        
        // Reset button
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        lightboxCRUDState.isProcessing = false;
        
    } finally {
        // Reset processing state after delay
        setTimeout(() => {
            if (saveBtn) {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
            lightboxCRUDState.isProcessing = false;
        }, 1000);
    }
}

/**
 * cancelEditMode() - Batalkan edit mode
 */
function cancelEditMode() {
    lightboxCRUDState.isEditing = false;
    
    // Restore original data to form if needed
    hideAllOverlays();
    document.getElementById('lightbox-data-scroll').style.display = 'block';
    
    // Re-enable CRUD buttons
    setCRUDButtonsDisabled(false);
    
    console.log('[EDIT] Cancelled');
}

// ============================================================
// STATUS CHANGE MODE
// ============================================================

/**
 * openStatusMode() - Buka pilihan ubah status
 */
function openStatusMode() {
    if (!activeRecord) {
        ToastManager.error('Tidak ada data aktif');
        return;
    }
    
    console.log('[STATUS] Opening status change for:', activeRecord.id);
    
    // Hide other views
    document.getElementById('lightbox-data-scroll').style.display = 'none';
    document.getElementById('lightbox-edit-overlay').style.display = 'none';
    document.getElementById('lightbox-delete-overlay').style.display = 'none';
    document.getElementById('lightbox-status-overlay').style.display = 'block';
    
    // Disable CRUD buttons
    setCRUDButtonsDisabled(true);
    
    // Generate status options
    generateStatusOptions(activeRecord.status);
}

/**
 * Status options based on common workflow statuses
 */
const STATUS_OPTIONS = [
    { value: 'Pending', label: '⏳ Pending', description: 'Menunggu proses', color: '#fef3c7', textColor: '#92400e' },
    { value: 'Ditinjau', label: '🔍 Ditinjau', description: 'Sedang dalam review', color: '#dbeafe', textColor: '#1e40af' },
    { value: 'Diterima', label: '✅ Diterima', labelAlt: '✅ Lulus', description: 'Pengajuan disetujui', color: '#d1fae5', textColor: '#065f46' },
    { value: 'Ditolak', label: '❌ Ditolak', description: 'Pengajuan ditolak', color: '#fee2e2', textColor: '#991b1b' }
];

/**
 * generateStatusOptions() - Generate status selection buttons
 */
function generateStatusOptions(currentStatus) {
    const container = document.getElementById('status-options');
    if (!container) return;
    
    const currentStatusLower = (currentStatus || '').toLowerCase();
    
    let html = '<p style="margin-bottom:1rem;color:#64748b;font-size:0.9rem;">Status saat ini: <strong>' + (currentStatus || 'Pending') + '</strong></p>';
    html += '<div style="display:flex;flex-direction:column;gap:0.75rem;">';
    
    STATUS_OPTIONS.forEach(option => {
        const isActive = currentStatusLower === option.value.toLowerCase();
        
        html += `
            <button type="button" 
                    class="status-option-btn ${isActive ? 'active' : ''}"
                    onclick="handleStatusChange('${option.value}')"
                    style="
                        padding: 1rem 1.25rem;
                        border-radius: 12px;
                        border: 2px solid ${isActive ? option.color : '#e2e8f0'};
                        background: ${isActive ? option.color : 'white'};
                        color: ${isActive ? option.textColor : '#334155'};
                        font-family: Tahoma, Geneva, Verdana, sans-serif;
                        font-size: 0.95rem;
                        font-weight: 600;
                        cursor: pointer;
                        text-align: left;
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        transition: all 0.2s ease;
                        ${isActive ? 'pointer-events:none;opacity:0.8;' : ''}
                    "
                    onmouseenter="if(!this.classList.contains('active')){this.style.borderColor='${option.color}';this.style.background='${option.color}20';}"
                    onmouseleave="if(!this.classList.contains('active')){this.style.borderColor='#e2e8f0';this.style.background='white';}"
            >
                <span style="font-size:1.3rem;">${option.label.split(' ')[0]}</span>
                <span style="flex:1;">
                    <span style="display:block;font-weight:700;">${option.label.substring(2)}</span>
                    <span style="font-size:0.78rem;opacity:0.7;font-weight:400;">${option.description}</span>
                </span>
                ${isActive ? '<span style="font-size:1.1rem;">✓</span>' : ''}
            </button>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * handleStatusChange() - Execute status change to Supabase
 */
async function handleStatusChange(newStatus) {
    if (!activeRecord) {
        ToastManager.error('Tidak ada data aktif');
        return;
    }
    
    if (lightboxCRUDState.isProcessing) {
        ToastManager.warning('Proses sedang berjalan...');
        return;
    }
    
    try {
        lightboxCRUDState.isProcessing = true;
        
        console.log('[STATUS] Changing to:', newStatus, 'for record:', activeRecord.id);
        
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client tidak tersedia');
        }
        
        // Execute UPDATE - TANPA .single() ⭐
        console.log('[STATUS] Executing status update...');
        
        const { data: resultArray, error } = await client
            .from('submissions')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', activeRecord.id)
            .select('*');  // TANPA .single()
        
        if (error) {
            console.error('[STATUS] Supabase error:', error);
            throw new Error(error.message || 'Gagal mengubah status');
        }
        
        // Validasi hasil array
        if (!resultArray || !Array.isArray(resultArray) || resultArray.length === 0) {
            throw new Error('Status update tidak menghasilkan data. Periksa ID atau RLS policy.');
        }
        
        const result = resultArray[0];  // Ambil dari array
        
        console.log('[STATUS] ✅ Changed successfully:', result);
        
        // Update local state
        activeRecord.status = newStatus;
        activeRecord.updated_at = result.updated_at;
        
        // Refresh UI
        generateAllFieldsHTML(activeRecord);
        
        // Update table
        if (typeof fetchAndRenderAdminData === 'function') {
            await fetchAndRenderAdminData();
        }
        
        // Exit status mode
        cancelStatusMode();
        
        ToastManager.success(`✓ Status berhasil diubah menjadi "${newStatus}"`);
        
    } catch (error) {
        console.error('[STATUS] Error:', error);
        ToastManager.error(`✕ Gagal mengubah status: ${error.message}`);
    } finally {
        lightboxCRUDState.isProcessing = false;
    }
}

/**
 * cancelStatusMode() - Batalkan status mode
 */
function cancelStatusMode() {
    hideAllOverlays();
    document.getElementById('lightbox-data-scroll').style.display = 'block';
    setCRUDButtonsDisabled(false);
}

// ============================================================
// DELETE MODE - With Confirmation
// ============================================================

/**
 * openDeleteMode() - Buka konfirmasi hapus
 */
function openDeleteMode() {
    if (!activeRecord) {
        ToastManager.error('Tidak ada data aktif');
        return;
    }
    
    console.log('[DELETE] Opening confirmation for:', activeRecord.id);
    
    // Hide other views
    document.getElementById('lightbox-data-scroll').style.display = 'none';
    document.getElementById('lightbox-edit-overlay').style.display = 'none';
    document.getElementById('lightbox-status-overlay').style.display = 'none';
    document.getElementById('lightbox-delete-overlay').style.display = 'flex';
    
    // Disable CRUD buttons except delete
    setCRUDButtonsDisabled(true);
    
    // Enable confirm button
    const confirmBtn = document.getElementById('btn-confirm-delete');
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '🗑 YA, HAPUS DATA';
    }
}

/**
 * confirmDeleteAction() - Execute DELETE to Supabase
 */
async function confirmDeleteAction() {
    if (!activeRecord) {
        ToastManager.error('Tidak ada data aktif');
        return;
    }
    
    if (lightboxCRUDState.isProcessing) {
        ToastManager.warning('Proses sedang berjalan...');
        return;
    }
    
    const confirmBtn = document.getElementById('btn-confirm-delete');
    const originalText = confirmBtn?.innerHTML;
    
    try {
        lightboxCRUDState.isProcessing = true;
        
        // Update button state
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '⏳ MENGHAPUS...';
        }
        
        console.log('[DELETE] Deleting record:', activeRecord.id);
        
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client tidak tersedia');
        }
        
        // Execute DELETE
        const { error } = await client
            .from('submissions')
            .delete()
            .eq('id', activeRecord.id);
        
        if (error) {
            console.error('[DELETE] Supabase error:', error);
            throw new Error(error.message || 'Gagal menghapus data dari database');
        }
        
        console.log('[DELETE] ✅ Deleted successfully');
        
        // Store deleted ID for removal from local array
        const deletedId = activeRecord.id;
        const deletedName = activeRecord.nama_lengkap || activeRecord.nama || 'data';
        
        // Remove from local data array
        if (typeof pengusulData !== 'undefined' && Array.isArray(pengusulData)) {
            const index = pengusulData.findIndex(item => item.id === deletedId);
            if (index > -1) {
                pengusulData.splice(index, 1);
                console.log('[DELETE] Removed from local array at index:', index);
            }
        }
        
        // Close lightbox
        closeLightboxCRUD();
        
        // Clear active record
        activeRecord = null;
        
        // Re-render table
        if (typeof renderAdminTableClean === 'function') {
            renderAdminTableClean(pengusulData);
        } else if (typeof renderAdminTable === 'function') {
            renderAdminTable(pengusulData);
        }
        
        // Update pagination count
        if (typeof updatePaginationInfo === 'function') {
            updatePaginationInfo();
        }
        
        ToastManager.success(`✓ Data "${deletedName}" berhasil dihapus`);
        
    } catch (error) {
        console.error('[DELETE] Error:', error);
        ToastManager.error(`✕ Gagal menghapus: ${error.message}`);
        
        // Reset button
        if (confirmBtn) {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
        lightboxCRUDState.isProcessing = false;
    }
}

/**
 * cancelDeleteMode() - Batalkan delete mode
 */
function cancelDeleteMode() {
    hideAllOverlays();
    document.getElementById('lightbox-data-scroll').style.display = 'block';
    setCRUDButtonsDisabled(false);
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * setCRUDButtonsDisabled() - Enable/disable CRUD footer buttons
 */
function setCRUDButtonsDisabled(disabled) {
    const buttons = ['lb-btn-edit', 'lb-btn-status', 'lb-btn-delete', 'lb-btn-close'];
    
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = disabled;
            btn.style.opacity = disabled ? '0.5' : '1';
            btn.style.pointerEvents = disabled ? 'none' : 'auto';
        }
    });
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('crud-lightbox');
    if (!lightbox || !lightbox.classList.contains('active')) return;
    
    // ESC: Close
    if (e.key === 'Escape') {
        if (lightboxCRUDState.isEditing) {
            cancelEditMode();
        } else {
            closeLightboxCRUD();
        }
    }
    
    // Arrow navigation (when not editing)
    if (!lightboxCRUDState.isEditing) {
        if (e.key === 'ArrowLeft') navigateLightboxCRUD(-1);
        if (e.key === 'ArrowRight') navigateLightboxCRUD(1);
    }
    
    // Ctrl+S: Save when in edit mode
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && lightboxCRUDState.isEditing) {
        e.preventDefault();
        const form = document.getElementById('edit-form');
        if (form) {
            const event = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(event);
        }
    }
});

// ============================================================
// EXPORT GLOBAL FUNCTIONS
// ============================================================

// Table functions
window.renderAdminTableClean = renderAdminTableClean;
window.handleTableRowClick = handleTableRowClick;

// Lightbox functions
window.openDetailLightbox = openDetailLightbox;
window.openLightboxWithCRUD = openLightboxWithCRUD;
window.closeLightboxCRUD = closeLightboxCRUD;
window.navigateLightboxCRUD = navigateLightboxCRUD;

// CRUD functions
window.openEditMode = openEditMode;
window.cancelEditMode = cancelEditMode;
window.handleEditSubmit = handleEditSubmit;
window.openStatusMode = openStatusMode;
window.cancelStatusMode = cancelStatusMode;
window.handleStatusChange = handleStatusChange;
window.openDeleteMode = openDeleteMode;
window.cancelDeleteMode = cancelDeleteMode;
window.confirmDeleteAction = confirmDeleteAction;

// State access
window.getActiveRecord = () => activeRecord;
window.setActiveRecord = (rec) => { activeRecord = rec; };

console.log('[CRUD SYSTEM] 📦 Module loaded - All CRUD functions are now available');
console.log('[CRUD SYSTEM] ℹ️ Table: renderAdminTableClean() | Lightbox: openLightboxWithCRUD()');

} catch (error) {
    // CRITICAL: Log error if CRUD system fails to load
    console.error('[CRUD SYSTEM] ❌ FATAL ERROR loading CRUD system!');
    console.error('[CRUD SYSTEM] Error:', error);
    console.error('[CRUD SYSTEM] Stack:', error.stack);
    
    // Store error for debugging
    window.CRUD_LOAD_ERROR = {
        message: error.message,
        stack: error.stack,
        time: new Date().toISOString()
    };
    
    // Alert developer (in production, this could send to error tracking service)
    console.warn('[CRUD SYSTEM] ⚠️ Fallback modal will be used for row clicks');
}

