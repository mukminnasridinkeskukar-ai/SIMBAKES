/**
 * SIMBAKES Panel Admin - UI Overhaul Part 2: JavaScript Functions
 * ================================================================
 * Implementasi fungsi-fungsi baru:
 * - resolvePhotoUrl() & loadSupabasePhoto() dengan multi-fallback
 * - openLightbox() - Full-screen detail view
 * - renderCompactTable() - Tabel 5 kolom saja
 * - getRowColorClass() - Warna gradient baris
 * - generateAllFieldsHTML() - Semua field dalam urutan asli
 */

// ============================================================
// CONFIGURATION - Supabase Storage Settings
// ============================================================
const SUPABASE_CONFIG = {
    url: window.SUPABASE_URL || 'https://your-project.supabase.co',
    bucket: 'simbakes', // Nama bucket storage
    defaultFolder: 'photos',
    fallbackAvatar: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <rect fill="#f1f5f9" width="100" height="100"/>
            <circle cx="50" cy="35" r="20" fill="#94a3b8"/>
            <ellipse cx="50" cy="85" rx="30" ry="25" fill="#94a3b8"/>
            <text y="95" font-size="10" text-anchor="middle" fill="#64748b">No Photo</text>
        </svg>
    `)}`
};

// ============================================================
// PHOTO URL RESOLUTION - Multi-Fallback System
// ============================================================

/**
 * resolvePhotoUrl() - Menentukan URL foto terbaik dari berbagai sumber
 * Support: Supabase Storage URL, Base64, External URL, Data fields
 * 
 * @param {Object} record - Data row dari submissions table
 * @returns {Promise<Object>} { url, source, isBase64 }
 */
async function resolvePhotoUrl(record) {
    if (!record) {
        console.warn('[PHOTO] No record provided');
        return { url: SUPABASE_CONFIG.fallbackAvatar, source: 'fallback', isBase64: true };
    }
    
    const sources = [];
    
    // Source 1: link_foto field (URL langsung)
    if (record.link_foto && typeof record.link_foto === 'string' && record.link_foto.trim().length > 10) {
        sources.push({ url: record.link_foto.trim(), source: 'link_foto', priority: 1 });
    }
    
    // Source 2: foto field (base64 atau URL)
    if (record.foto && typeof record.foto === 'string' && record.foto.trim().length > 10) {
        const fotoData = record.foto.trim();
        if (fotoData.startsWith('data:image')) {
            sources.push({ url: fotoData, source: 'foto_base64', priority: 2, isBase64: true });
        } else if (fotoData.startsWith('http://') || fotoData.startsWith('https://')) {
            sources.push({ url: fotoData, source: 'foto_url', priority: 2 });
        } else if (fotoData.startsWith('/')) {
            // Relative path - construct full URL
            sources.push({ 
                url: `${SUPABASE_CONFIG.url}/storage/v1/object/public/${SUPABASE_CONFIG.bucket}${fotoData}`, 
                source: 'foto_relative', 
                priority: 3 
            });
        }
    }
    
    // Source 3: Construct from ID (Supabase Storage pattern)
    if (record.id) {
        const possiblePaths = [
            `/${SUPABASE_CONFIG.defaultFolder}/${record.id}.jpg`,
            `/${SUPABASE_CONFIG.defaultFolder}/${record.id}.png`,
            `/${SUPABASE_CONFIG.defaultFolder}/${record.id}.jpeg`,
            `/photos/submissions/${record.id}.jpg`
        ];
        
        possiblePaths.forEach((path, idx) => {
            sources.push({ 
                url: `${SUPABASE_CONFIG.url}/storage/v1/object/public/${SUPABASE_CONFIG.bucket}${path}`, 
                source: `supabase_id_${idx}`, 
                priority: 4 + idx 
            });
        });
    }
    
    // Source 4: url_foto / photo_url alternative fields
    ['url_foto', 'photo_url', 'pas_foto', 'avatar_url'].forEach(field => {
        if (record[field] && typeof record[field] === 'string' && record[field].trim().length > 10) {
            const val = record[field].trim();
            if (val.startsWith('http')) {
                sources.push({ url: val, source: field, priority: 5 });
            }
        }
    });
    
    // Return best source (lowest priority number = highest priority)
    if (sources.length > 0) {
        sources.sort((a, b) => a.priority - b.priority);
        console.log(`[PHOTO] ✅ Resolved: ${sources[0].source} (${sources[0].url.substring(0, 50)}...)`);
        return sources[0];
    }
    
    console.log('[PHOTO] ⚠️ No photo source found, using fallback');
    return { url: SUPABASE_CONFIG.fallbackAvatar, source: 'fallback', isBase64: true };
}

/**
 * loadSupabasePhoto() - Load dan validasi foto dengan error handling
 * 
 * @param {string} url - URL foto yang akan di-load
 * @param {HTMLImageElement} imgElement - Element target
 * @returns {Promise<boolean>} success status
 */
async function loadSupabasePhoto(url, imgElement) {
    return new Promise((resolve) => {
        if (!imgElement) {
            resolve(false);
            return;
        }
        
        // Show loading state
        const wrapper = imgElement.closest('.lightbox-photo-wrapper');
        if (wrapper) {
            wrapper.classList.add('loading');
        }
        
        // Create test image to validate URL
        const testImg = new Image();
        
        testImg.onload = function() {
            imgElement.src = url;
            imgElement.style.opacity = '1';
            if (wrapper) {
                wrapper.classList.remove('loading');
            }
            console.log(`[PHOTO] ✅ Loaded successfully: ${url.substring(0, 60)}...`);
            resolve(true);
        };
        
        testImg.onerror = function() {
            console.warn(`[PHOTO] ❌ Failed to load: ${url.substring(0, 60)}...`);
            imgElement.src = SUPABASE_CONFIG.fallbackAvatar;
            if (wrapper) {
                wrapper.classList.remove('loading');
            }
            resolve(false);
        };
        
        // Start loading
        testImg.src = url;
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!testImg.complete) {
                console.warn(`[PHOTO] ⏱️ Timeout loading: ${url.substring(0, 60)}...`);
                imgElement.src = SUPABASE_CONFIG.fallbackAvatar;
                if (wrapper) {
                    wrapper.classList.remove('loading');
                }
                resolve(false);
            }
        }, 10000);
    });
}

// ============================================================
// ROW COLOR VARIATION - Gradient Cycling
// ============================================================

/**
 * getRowColorClass() - Mendapatkan class warna untuk baris
 * Cycling: Blue(0) -> Green(1) -> Purple(2) -> Orange(3) -> Cyan(4)
 * 
 * @param {number} index - Index baris (0-based)
 * @returns {string} CSS class name
 */
function getRowColorClass(index) {
    const colors = ['tr-color-0', 'tr-color-1', 'tr-color-2', 'tr-color-3', 'tr-color-4'];
    return colors[index % colors.length];
}

// ============================================================
// FIELD DEFINITIONS - All Submissions Fields in Order
// ============================================================

/**
 * SUBMISSIONS_FIELDS - Definisi semua field submissions dalam urutan asli
 * Format: { key, label, icon, type, fullWidth }
 */
const SUBMISSIONS_FIELDS = [
    { key: 'no_register', label: 'No Register', icon: '📋', type: 'text' },
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
    { key: 'no_hp', label: 'No HP', icon: '📱', type: 'text' },
    { key: 'no_wa', label: 'No WhatsApp', icon: '💬', type: 'text' },
    { key: 'email', label: 'Email', icon: '✉️', type: 'email' },
    { key: 'nama_file', label: 'Nama File Dokumen', icon: '📄', type: 'text' },
    { key: 'status', label: 'Status Pengajuan', icon: '📊', type: 'status' },
    { key: 'created_at', label: 'Tanggal Pengajuan', icon: '🕐', type: 'datetime' },
    { key: 'link_foto', label: 'Link Foto', icon: '📷', type: 'link', fullWidth: true },
    { key: 'link_dokumen', label: 'Link Dokumen', icon: '📁', type: 'link', fullWidth: true }
];

// ============================================================
// LIGHTBOX MODAL - Full-Screen Detail View
// ============================================================

/** Current lightbox state */
let lightboxState = {
    currentIndex: 0,
    data: [],
    isOpen: false
};

/**
 * openLightbox() - Buka full-screen lightbox untuk melihat detail
 * 
 * @param {string|number} id - ID record atau index
 * @param {Array} [allData] - Optional: semua data untuk navigasi
 */
async function openLightbox(id, allData = null) {
    console.log(`[LIGHTBOX] Opening for ID: ${id}`);
    
    // Get data
    let record = null;
    let dataIndex = -1;
    
    if (allData && Array.isArray(allData)) {
        lightboxState.data = allData;
        dataIndex = allData.findIndex(item => item.id === id || String(item.id) === String(id));
        if (dataIndex >= 0) {
            record = allData[dataIndex];
            lightboxState.currentIndex = dataIndex;
        }
    }
    
    // Fallback: find from global pengusulData
    if (!record && typeof pengusulData !== 'undefined') {
        lightboxState.data = pengusulData;
        dataIndex = pengusulData.findIndex(item => item.id === id || String(item.id) === String(id));
        if (dataIndex >= 0) {
            record = pengusulData[dataIndex];
            lightboxState.currentIndex = dataIndex;
        }
    }
    
    if (!record) {
        console.error('[LIGHTBOX] Record not found for ID:', id);
        showToast('❌ Data tidak ditemukan', 'error');
        return;
    }
    
    // Create or get lightbox element
    let lightbox = document.getElementById('detail-lightbox');
    if (!lightbox) {
        lightbox = createLightboxElement();
        document.body.appendChild(lightbox);
    }
    
    // Populate content
    await populateLightboxContent(lightbox, record);
    
    // Show with animation
    requestAnimationFrame(() => {
        lightbox.classList.add('active');
        lightboxState.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        console.log('[LIGHTBOX] ✅ Opened successfully');
    });
}

/**
 * createLightboxElement() - Buat struktur HTML lightbox
 * @returns {HTMLElement} Lightbox container
 */
function createLightboxElement() {
    const lightbox = document.createElement('div');
    lightbox.id = 'detail-lightbox';
    lightbox.className = 'lightbox-overlay';
    lightbox.innerHTML = `
        <div class="lightbox-container">
            <!-- LEFT: Photo Section -->
            <div class="lightbox-photo-section">
                <div class="lightbox-photo-wrapper">
                    <div class="photo-loading-spinner" style="display:none;"></div>
                    <img class="lightbox-photo" alt="Foto Peserta" style="opacity:0;">
                    <div class="lightbox-photo-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                        </svg>
                        <span>Tidak ada foto</span>
                    </div>
                </div>
                <p class="lightbox-photo-label" id="lightbox-photo-name">-</p>
            </div>
            
            <!-- RIGHT: Data Section -->
            <div class="lightbox-data-section">
                <!-- Header -->
                <div class="lightbox-header">
                    <div class="lightbox-title">
                        <h2 id="lightbox-title-nama">Detail Data</h2>
                        <span class="lightbox-title-badge" id="lightbox-register-badge">#-</span>
                    </div>
                    <button class="lightbox-close-btn" onclick="closeLightbox()" title="Tutup (ESC)">✕</button>
                </div>
                
                <!-- Scrollable Data Grid -->
                <div class="lightbox-data-scroll">
                    <div class="lightbox-data-grid" id="lightbox-data-grid">
                        <!-- Fields will be populated here -->
                    </div>
                </div>
                
                <!-- Footer with Actions -->
                <div class="lightbox-footer">
                    <div class="lightbox-nav-info">
                        <span id="lightbox-record-count">Record 0 of 0</span>
                        <button class="lightbox-nav-btn" id="lightbox-prev-btn" onclick="navigateLightbox(-1)" title="Sebelumnya">◀</button>
                        <button class="lightbox-nav-btn" id="lightbox-next-btn" onclick="navigateLightbox(1)" title="Selanjutnya">▶</button>
                    </div>
                    <div class="lightbox-actions">
                        <button class="btn-lightbox-action btn-lightbox-status" id="lightbox-btn-status" onclick="lightboxChangeStatus()">
                            📋 Ubah Status
                        </button>
                        <button class="btn-lightbox-action btn-lightbox-edit" id="lightbox-btn-edit" onclick="lightboxEdit()">
                            ✏️ Edit Data
                        </button>
                        <button class="btn-lightbox-action btn-lightbox-delete" id="lightbox-btn-delete" onclick="lightboxDelete()">
                            🗑️ Hapus Data
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Event listeners
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    return lightbox;
}

/**
 * populateLightboxContent() - Isi konten lightbox dengan data
 * @param {HTMLElement} lightbox - Lightbox element
 * @param {Object} record - Data record
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
    const totalRecords = lightboxState.data.length;
    const currentNum = lightboxState.currentIndex + 1;
    document.getElementById('lightbox-record-count').textContent = `Record ${currentNum} of ${totalRecords}`;
    
    // Update navigation buttons
    document.getElementById('lightbox-prev-btn').disabled = currentNum <= 1;
    document.getElementById('lightbox-next-btn').disabled = currentNum >= totalRecords;
    
    // Store current ID for action buttons
    lightbox.currentRecordId = id;
    
    // Load photo
    const photoImg = lightbox.querySelector('.lightbox-photo');
    const placeholder = lightbox.querySelector('.lightbox-photo-placeholder');
    
    const photoResult = await resolvePhotoUrl(record);
    
    if (photoResult.isBase64 || photoResult.source === 'fallback') {
        photoImg.src = photoResult.url;
        photoImg.style.opacity = '1';
        placeholder.style.display = photoResult.url.includes('No Photo') ? 'flex' : 'none';
    } else {
        await loadSupabasePhoto(photoResult.url, photoImg);
        placeholder.style.display = 'none';
    }
    
    // Generate all fields HTML
    const dataGrid = document.getElementById('lightbox-data-grid');
    dataGrid.innerHTML = generateAllFieldsHTML(record);
}

/**
 * generateAllFieldsHTML() - Generate HTML untuk semua field
 * @param {Object} record - Data record
 * @returns {string} HTML string
 */
function generateAllFieldsHTML(record) {
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
    
    const truncate = (text, maxLen = 100) => {
        if (!text || text === '-') return '-';
        return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    };
    
    const getStatusClass = (status) => {
        if (!status) return 'status-pending-lightbox';
        const s = status.toLowerCase();
        if (s.includes('diterima') || s.includes('lulus') || s.includes('approved')) return 'status-diterima-lightbox';
        if (s.includes('ditolak') || s.includes('reject') || s.includes('denied')) return 'status-ditolak-lightbox';
        if (s.includes('ditinjau') || s.includes('review') || s.includes('proses')) return 'status-ditinjau-lightbox';
        return 'status-pending-lightbox';
    };
    
    const getStatusIcon = (status) => {
        if (!status) return '⏳';
        const s = status.toLowerCase();
        if (s.includes('diterima') || s.includes('lulus') || s.includes('approved')) return '✅';
        if (s.includes('ditolak') || s.includes('reject') || s.includes('denied')) return '❌';
        if (s.includes('ditinjau') || s.includes('review') || s.includes('proses')) return '🔍';
        return '⏳';
    };
    
    let html = '';
    
    SUBMISSIONS_FIELDS.forEach(field => {
        let value = record[field.key];
        const isEmpty = !value || value === '-' || value === 'null';
        
        // Format value based on type
        let displayValue = '-';
        let valueClass = 'lightbox-field-value';
        
        if (field.highlight && !isEmpty) {
            valueClass += ' highlight';
        }
        
        switch (field.type) {
            case 'date':
                displayValue = isEmpty ? '-' : formatDate(value);
                break;
            case 'datetime':
                displayValue = isEmpty ? '-' : formatDateTime(value);
                break;
            case 'status':
                if (!isEmpty) {
                    valueClass += ' status-value ' + getStatusClass(value);
                    displayValue = `${getStatusIcon(value)} ${value}`;
                } else {
                    displayValue = '⏳ Pending';
                    valueClass += ' status-value status-pending-lightbox';
                }
                break;
            case 'link':
                if (!isEmpty && value.length > 10) {
                    displayValue = `<a href="${escapeHtml(value)}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:none;">${truncate(value, 50)}</a>`;
                } else {
                    displayValue = '-';
                }
                break;
            case 'textarea':
                displayValue = isEmpty ? '-' : `<span style="white-space:pre-wrap;">${escapeHtml(String(value))}</span>`;
                break;
            case 'email':
                if (!isEmpty) {
                    displayValue = `<a href="mailto:${escapeHtml(value)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(value)}</a>`;
                } else {
                    displayValue = '-';
                }
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
    
    return html;
}

/**
 * closeLightbox() - Tutup lightbox
 */
function closeLightbox() {
    const lightbox = document.getElementById('detail-lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        lightboxState.isOpen = false;
        document.body.style.overflow = '';
        console.log('[LIGHTBOX] Closed');
    }
}

/**
 * navigateLightbox() - Navigasi antar record di lightbox
 * @param {number} direction - 1 untuk next, -1 untuk prev
 */
function navigateLightbox(direction) {
    const newIndex = lightboxState.currentIndex + direction;
    
    if (newIndex < 0 || newIndex >= lightboxState.data.length) {
        return;
    }
    
    lightboxState.currentIndex = newIndex;
    const record = lightboxState.data[newIndex];
    
    if (record) {
        const lightbox = document.getElementById('detail-lightbox');
        if (lightbox) {
            populateLightboxContent(lightbox, record);
        }
    }
}

/**
 * lightboxEdit() - Buka form edit dari lightbox
 */
function lightboxEdit() {
    const id = document.getElementById('detail-lightbox')?.currentRecordId;
    if (id) {
        closeLightbox();
        // Call existing edit function if available
        if (typeof openPengusulEditModal === 'function') {
            setTimeout(() => openPengusulEditModal(id), 300);
        } else if (typeof viewDetailPengusul === 'function') {
            // Fallback to view then edit
            setTimeout(() => {
                const editBtn = document.querySelector(`button[data-action="edit"][data-id="${id}"]`);
                if (editBtn) editBtn.click();
            }, 300);
        }
    }
}

/**
 * lightboxDelete() - Konfirmasi hapus dari lightbox
 */
function lightboxDelete() {
    const id = document.getElementById('detail-lightbox')?.currentRecordId;
    const nama = document.getElementById('lightbox-title-nama')?.textContent || 'data ini';
    
    if (id) {
        closeLightbox();
        if (typeof confirmDeletePengusul === 'function') {
            setTimeout(() => confirmDeletePengusul(id, nama), 300);
        } else if (confirm(`Hapus data "${nama}"?`)) {
            console.log('[LIGHTBOX] Delete confirmed for:', id);
        }
    }
}

/**
 * lightboxChangeStatus() - Ubah status dari lightbox
 */
function lightboxChangeStatus() {
    const id = document.getElementById('detail-lightbox')?.currentRecordId;
    if (id) {
        closeLightbox();
        if (typeof openStatusModal === 'function') {
            setTimeout(() => openStatusModal(id), 300);
        }
    }
}

// Keyboard shortcut for closing lightbox
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxState.isOpen) {
        closeLightbox();
    }
    if (e.key === 'ArrowLeft' && lightboxState.isOpen) {
        navigateLightbox(-1);
    }
    if (e.key === 'ArrowRight' && lightboxState.isOpen) {
        navigateLightbox(1);
    }
});

// ============================================================
// COMPACT TABLE RENDERER - 5 Columns Only
// ============================================================

/**
 * renderCompactTable() - Render tabel dengan hanya 5 kolom utama
 * Kolom: NIK, Nama, Jurusan, Rencana Tahun, Unit Penempatan + AKSI
 * 
 * @param {Array} data - Array of records
 * @param {string} tbodyId - ID of tbody element
 */
function renderCompactTable(data, tbodyId = 'pengusul-table-body') {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) {
        console.error('[TABLE] Tbody not found:', tbodyId);
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:3rem;color:#64748b;">
                    <div style="font-size:3rem;margin-bottom:1rem;">📭</div>
                    <p style="font-size:1rem;font-weight:600;">Belum ada data</p>
                    <p style="font-size:0.85rem;opacity:0.7;">Data pengusulan belum tersedia</p>
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
    
    const getStatusBadge = (status) => {
        if (!status) return '<span class="status-badge" style="background:#fef3c7;color:#92400e;padding:0.3rem 0.8rem;border-radius:20px;font-size:0.78rem;font-weight:700;">⏳ Pending</span>';
        
        const s = status.toLowerCase();
        let bg, color, icon;
        
        if (s.includes('diterima') || s.includes('lulus')) {
            bg = '#d1fae5'; color = '#065f46'; icon = '✅';
        } else if (s.includes('ditolak')) {
            bg = '#fee2e2'; color = '#991b1b'; icon = '❌';
        } else if (s.includes('ditinjau') || s.includes('proses')) {
            bg = '#dbeafe'; color = '#1e40af'; icon = '🔍';
        } else {
            bg = '#fef3c7'; color = '#92400e'; icon = '⏳';
        }
        
        return `<span style="background:${bg};color:${color};padding:0.3rem 0.8rem;border-radius:20px;font-size:0.78rem;font-weight:700;white-space:nowrap;">${icon} ${status}</span>`;
    };
    
    let html = '';
    
    data.forEach((row, index) => {
        const id = row.id || '';
        const rowNum = (adminCurrentPage || 1) * (adminPageSize || 10) - (adminPageSize || 10) + index + 1;
        const colorClass = getRowColorClass(index);
        
        // Main 5 columns data
        const nik = row.nik || '-';
        const nama = row.nama_lengkap || row.nama || '-';
        const jurusan = row.jurusan_tujuan || row.jurusan || '-';
        const rencanaTahun = row.rencana_tahun || '-';
        const unit = row.unit_tujuan || row.unit_kerja || '-';
        const status = row.status || 'Pending';
        
        html += `
            <tr data-id="${id}" data-index="${index}" class="${colorClass}" style="cursor:pointer;">
                <!-- NIK -->
                <td class="col-nik" style="font-family:monospace;font-weight:600;font-size:0.88rem;">
                    ${escapeHtml(nik)}
                </td>
                
                <!-- Nama Lengkap -->
                <td class="col-nama">
                    <strong style="color:#1e293b;">${escapeHtml(nama)}</strong>
                </td>
                
                <!-- Jurusan Tujuan -->
                <td class="col-jurusan" style="font-size:0.88rem;">
                    ${escapeHtml(jurusan)}
                </td>
                
                <!-- Rencana Tahun Studi -->
                <td class="col-tahun" style="font-weight:600;color:#2563eb;">
                    ${escapeHtml(rencanaTahun)}
                </td>
                
                <!-- Unit Penempatan -->
                <td class="col-unit" style="font-size:0.88rem;" title="${escapeHtml(unit)}">
                    ${unit.length > 30 ? escapeHtml(unit.substring(0, 30)) + '...' : escapeHtml(unit)}
                </td>
                
                <!-- AKSI Column (STICKY) -->
                <td class="col-aksi" style="position: sticky; right: 0; background: inherit; z-index: 10;" onclick="event.stopPropagation();">
                    <div class="crud-actions">
                        <button type="button" class="btn-crud btn-view" 
                                data-action="view" data-id="${id}" 
                                title="Lihat Detail (Lightbox)"
                                onclick="event.stopPropagation(); openLightbox('${id}');">
                            👁️
                        </button>
                        <button type="button" class="btn-crud btn-edit" 
                                data-action="edit" data-id="${id}" 
                                title="Edit Data"
                                onclick="event.stopPropagation();">
                            ✏️
                        </button>
                        <button type="button" class="btn-crud btn-status" 
                                data-action="status" data-id="${id}" data-status="${escapeHtml(status)}"
                                title="Ubah Status"
                                onclick="event.stopPropagation();">
                            📋
                        </button>
                        <button type="button" class="btn-crud btn-delete" 
                                data-action="delete" data-id="${id}" data-nama="${escapeHtml(nama)}"
                                title="Hapus Data"
                                onclick="event.stopPropagation();">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Re-attach event delegation
    setupPengusulTableEvents(tbody);
    
    // Add row click handler for lightbox
    addRowClickHandlers(tbodyId, (rowId) => {
        openLightbox(rowId);
    });
    
    console.log(`[SIMBAKES] ✅ Rendered ${data.length} rows in compact 5-column table`);
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * injectUIOverhaulCSS() - Inject CSS styles ke halaman
 */
function injectUIOverhaulCSS() {
    // Check if already injected
    if (document.getElementById('ui-overhaul-styles')) {
        console.log('[UI OVERHAUL] CSS already injected');
        return;
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'ui-overhaul-styles';
    styleEl.textContent = uiOverhaulCSS;
    document.head.appendChild(styleEl);
    
    console.log('[UI OVERHAUL] ✅ CSS styles injected successfully');
}

/**
 * initializeUIOverhaul() - Initialize complete UI overhaul
 * Call this function to activate all new UI features
 */
function initializeUIOverhaul() {
    console.log('[UI OVERHAUL] Initializing...');
    
    // 1. Inject CSS
    injectUIOverhaulCSS();
    
    // 2. Update table header to 5 columns
    updateTableHeaderTo5Columns();
    
    console.log('[UI OVERHAUL] ✅ Initialization complete');
}

/**
 * updateTableHeaderTo5Columns() - Update thead untuk 5 kolom
 */
function updateTableHeaderTo5Columns() {
    const thead = document.querySelector('#admin-pengusul-table thead tr');
    if (!thead) return;
    
    thead.innerHTML = `
        <th class="col-nik">NIK</th>
        <th class="col-nama">Nama Lengkap</th>
        <th class="col-jurusan">Jurusan Tujuan</th>
        <th class="col-tahun">Rencana Tahun Studi</th>
        <th class="col-unit">Unit Penempatan</th>
        <th class="col-aksi" style="border-radius:0 12px 0 0;">AKSI</th>
    `;
    
    // Add new class to thead
    thead.parentElement.classList.add('admin-table-thead-new');
    
    console.log('[UI OVERHAUL] ✅ Table header updated to 5 columns');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUIOverhaul);
} else {
    // Small delay to ensure other scripts load first
    setTimeout(initializeUIOverhaul, 500);
}

// Export functions globally
window.resolvePhotoUrl = resolvePhotoUrl;
window.loadSupabasePhoto = loadSupabasePhoto;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.navigateLightbox = navigateLightbox;
window.lightboxEdit = lightboxEdit;
window.lightboxDelete = lightboxDelete;
window.lightboxChangeStatus = lightboxChangeStatus;
window.renderCompactTable = renderCompactTable;
window.getRowColorClass = getRowColorClass;
window.initializeUIOverhaul = initializeUIOverhaul;
window.injectUIOverhaulCSS = injectUIOverhaulCSS;

console.log('[UI OVERHAUL] 📦 Module loaded successfully');

