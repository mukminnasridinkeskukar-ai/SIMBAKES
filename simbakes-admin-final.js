/**
 * ============================================================
 * SIMBAKES PANEL ADMIN - SISTEM FINAL (ROMBAK TOTAL)
 * ============================================================
 * 
 * FITUR:
 * 1. Tabel 5 kolom dengan warna baris berbeda
 * 2. Full-Screen Lightbox dengan foto Supabase
 * 3. Semua field submissions ditampilkan
 * 4. CRUD AKTIF (Edit/Status/Hapus) ke Supabase
 * 5. Event Delegation (tanpa inline onclick)
 * 6. Record-based popup (tidak re-query)
 * 
 * TIDAK ADA:
 * - Simple Modal / Fallback Modal
 * - Polling / "CRUD sedang dimuat"
 * - Fallback table renderer
 * - Duplicate event handlers
 * 
 * @version 5.0.0 - FINAL VERSION
 * @date 2026-08-17
 * ============================================================
 */

// ============================================================
// GLOBAL STATE - Dideklarasikan di awal
// ============================================================

/** @type {Array<Object>} Data submissions dari Supabase */
window.submissionsData = [];

/** @type {Object|null} Record yang sedang aktif/dibuka */
window.activeRecord = null;

/** @type {string|null} Primary key field name */
window.PRIMARY_KEY_FIELD = 'id';

/** @type {Object} Lightbox state */
window.lightboxState = {
    isOpen: false,
    isEditing: false,
    isStatusMode: false,
    isDeleteMode: false,
    originalData: null
};

// ============================================================
// TOAST NOTIFICATION SYSTEM
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
            `;
            document.body.appendChild(this.container);
        }
    },
    
    show(message, type = 'info', duration = 4000) {
        this.init();
        
        const colors = {
            success: { bg: '#10b981', icon: '✅' },
            error: { bg: '#ef4444', icon: '❌' },
            warning: { bg: '#f59e0b', icon: '⚠️' },
            info: { bg: '#3b82f6', icon: 'ℹ️' }
        };
        
        const config = colors[type] || colors.info;
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${config.bg};
            color: white;
            padding: 14px 20px;
            border-radius: 12px;
            font-family: Tahoma, sans-serif;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            cursor: pointer;
        `;
        toast.innerHTML = `<span>${config.icon}</span><span>${message}</span>`;
        
        this.container.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });
        
        const close = () => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        };
        
        toast.addEventListener('click', close);
        setTimeout(close, duration);
    },
    
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    warning(msg) { this.show(msg, 'warning'); },
    info(msg) { this.show(msg, 'info'); }
};

// Export globally
window.ToastManager = ToastManager;

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Escape HTML untuk mencegah XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Format nama field dari snake_case ke Title Case
 */
function formatFieldName(field) {
    return field
        .replace(/_/g, ' ')
        .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Truncate text dengan ellipsis
 */
function truncate(text, maxLen = 30) {
    if (!text || text === '-') return '-';
    return text.length > maxLen ? escapeHtml(text.substring(0, maxLen)) + '...' : escapeHtml(text);
}

/**
 * Format date ke format Indonesia
 */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

// ============================================================
// SUPABASE PHOTO RESOLVER - Multi-method URL detection
// ============================================================

/**
 * resolveSupabaseImage() - Coba semua metode untuk mendapatkan foto
 * @param {Object} record - Record submissions
 * @returns {Promise<{url: string, source: string}>}
 */
async function resolveSupabaseImage(record) {
    console.group('📷 PHOTO RESOLVER');
    
    // 1. Deteksi field foto yang mungkin ada
    const possiblePhotoFields = Object.keys(record).filter(key => {
        const lower = key.toLowerCase();
        return lower.includes('foto') || lower.includes('photo') || lower.includes('gambar') ||
               lower.includes('image') || lower.includes('avatar') || lower.includes('pasfoto') ||
               lower.includes('file_foto') || lower.includes('url_foto');
    });
    
    console.log('Possible photo fields:', possiblePhotoFields);
    
    // Kumpulkan semua candidate URLs
    const candidates = [];
    
    // A. Dari field foto yang terdeteksi
    for (const field of possiblePhotoFields) {
        const value = record[field];
        if (value && typeof value === 'string' && value.trim()) {
            candidates.push({ url: value.trim(), source: `field:${field}`, priority: 1 });
        }
    }
    
    // B. Dari link_foto (jika ada)
    if (record.link_foto && typeof record.link_foto === 'string' && record.link_foto.trim()) {
        candidates.push({ url: record.link_foto.trim(), source: 'link_foto', priority: 2 });
    }
    
    // C. Dari foto (field umum)
    if (record.foto && typeof record.foto === 'string' && record.foto.trim()) {
        candidates.push({ url: record.foto.trim(), source: 'foto', priority: 2 });
    }
    
    console.log('Total candidates:', candidates.length);
    candidates.forEach(c => console.log(`- ${c.source}: ${c.url.substring(0, 60)}...`));
    
    // Jika tidak ada candidate sama sekali
    if (candidates.length === 0) {
        console.log('No photo fields found, using placeholder');
        console.groupEnd();
        return { url: generatePlaceholderSVG(record), source: 'placeholder', isBase64: true };
    }
    
    // Test setiap URL sampai berhasil
    for (const candidate of candidates) {
        console.log(`Testing: ${candidate.source}`);
        
        // Jika sudah full URL dan bisa diakses langsung
        if (candidate.url.startsWith('http://') || candidate.url.startsWith('https://')) {
            const isValid = await testImageUrl(candidate.url);
            if (isValid) {
                console.log(`✅ Valid URL found: ${candidate.source}`);
                console.groupEnd();
                return { url: candidate.url, source: candidate.source };
            }
        }
        
        // Jika terlihat seperti storage path, coba buat public URL
        if (!candidate.url.startsWith('http') && candidate.url.includes('/')) {
            console.log('Trying as storage path...');
            
            // Coba berbagai bucket
            const buckets = ['photos', 'avatars', 'uploads', 'public', 'submissions'];
            
            for (const bucket of buckets) {
                try {
                    if (typeof supabaseClient !== 'undefined' && supabaseClient.storage) {
                        const { data } = supabaseClient.storage.from(bucket).getPublicUrl(candidate.url);
                        if (data?.publicUrl) {
                            const isValid = await testImageUrl(data.publicUrl);
                            if (isValid) {
                                console.log(`✅ Storage URL from bucket "${bucket}"`);
                                console.groupEnd();
                                return { url: data.publicUrl, source: `storage:${bucket}` };
                            }
                        }
                    }
                } catch (e) {
                    console.log(`Bucket "${bucket}" failed:`, e.message);
                }
            }
        }
    }
    
    // Semua gagal, gunakan placeholder
    console.log('All candidates failed, using placeholder');
    console.groupEnd();
    return { url: generatePlaceholderSVG(record), source: 'placeholder-fallback', isBase64: true };
}

/**
 * Test jika image URL valid dan bisa dimuat
 */
function testImageUrl(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.timeout = 5000; // 5 detik timeout
        
        const timer = setTimeout(() => {
            resolve(false);
        }, img.timeout);
        
        img.onload = () => {
            clearTimeout(timer);
            resolve(true);
        };
        
        img.onerror = () => {
            clearTimeout(timer);
            resolve(false);
        };
        
        img.src = url;
    });
}

/**
 * Generate placeholder SVG dengan inisial nama
 */
function generatePlaceholderSVG(record) {
    const nama = record.nama_lengkap || record.nama || '?';
    const initial = nama.charAt(0).toUpperCase();
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];
    const bgColor = colors[(record.id || 0) % colors.length];
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect fill="${bgColor}" width="200" height="200" rx="20"/>
        <text x="100" y="110" text-anchor="middle" fill="white" font-family="Tahoma,sans-serif" font-size="80" font-weight="bold">${initial}</text>
        <text x="100" y="150" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Tahoma,sans-serif" font-size="16">${escapeHtml(nama.substring(0, 15))}</text>
    </svg>`;
    
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ============================================================
// TABLE RENDERER - FINAL VERSION (5 Columns Only)
// ============================================================

/**
 * renderAdminTableFinal() - Render tabel admin dengan desain final
 * HANYA 5 KOLOM: NIK | Nama | Jurusan | Rencana Tahun Studi | Unit Penempatan
 * Setiap baris memiliki warna berbeda (8 warna gradient)
 */
function renderAdminTableFinal(data) {
    const tbody = document.getElementById('pengusul-table-body');
    if (!tbody) {
        console.error('[TABLE] Element #pengusul-table-body not found');
        return;
    }
    
    console.group('📊 RENDER TABLE FINAL');
    console.log('Records to render:', data?.length || 0);
    
    // Simpan data global untuk akses lightbox
    window.submissionsData = Array.isArray(data) ? data : [];
    
    // State kosong
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:4rem 2rem;color:#64748b;background:linear-gradient(135deg,#f8fafc,#e2e8f0);">
                    <div style="font-size:4rem;margin-bottom:1rem;">📭</div>
                    <p style="font-size:1.2rem;font-weight:700;color:#334155;margin-bottom:0.5rem;">
                        Tidak Ada Data
                    </p>
                    <p style="font-size:0.9rem;color:#94a3b8;">
                        Belum ada data pengajuan beasiswa atau filter tidak menemukan hasil
                    </p>
                </td>
            </tr>
        `;
        console.log('Empty state rendered');
        console.groupEnd();
        return;
    }
    
    // 8 Warna gradient untuk baris (cerah & modern)
    const rowColors = [
        { bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', border: '#93c5fd', hover: 'transform:scale(1.01);box-shadow:0 8px 25px rgba(59,130,246,0.25)' },      // Biru muda
        { bg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: '#6ee7b7', hover: 'transform:scale(1.01);box-shadow:0 8px 25px rgba(16,185,129,0.25)' },     // Hijau mint
        { bg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)', border: '#c4b5fd', hover: 'transform:scale(1.01);box-shadow:0 8px 25px rgba(139,92,246,0.25)' },     // Ungu muda
        { bg: 'linear-gradient(135deg, #ffedd5, #fed7aa)', border: '#fdba74', hover: 'transform:scale(1.01);box-shadow:0 8px 25px rgba(245,158,11,0.25)' },     // Orange muda
        { bg: 'linear-gradient(135deg, #cffafe, #a5f3fc)', border: '#67e8f9', hover: 'transform:scale(1.01);box-shadow:0 8px 25px rgba(6,182,212,0.25)' },       // Cyan muda
        { bg: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', border: '#f9a8d4', hover: 'transform:scale(1.01);box-shadow:0 8px 25px rgba(236,72,153,0.25)' },     // Pink muda
        { bg: 'linear-gradient(135deg, #fef9c3, #fef08a)', border: '#fde047', hover: 'transform:scale(1.01);box-shadow:0 8px 25px rgba(234,179,8,0.25)' },     // Kuning muda
        { bg: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', border: '#a5b4fc', hover: 'transform:scale(1.01);box-shadow:0 8px 25px(rgba(99,102,241,0.25)' }    // Biru lavender
    ];
    
    let html = '';
    
    data.forEach((row, index) => {
        const colorScheme = rowColors[index % rowColors.length];
        const id = row.id || '';
        
        // 5 Kolom Data
        const nik = row.nik || '-';
        const namaLengkap = row.nama_lengkap || row.nama || '-';
        const jurusanTujuan = row.jurusan_tujuan || row.jurusan || '-';
        const rencanaTahun = row.rencana_tahun_studi || row.rencana_tahun || '-';
        const unitTujuan = row.unit_tujuan || row.unit_kerja || row.unit_penempatan || '-';
        
        html += `
            <tr class="admin-data-row" 
                data-record-index="${index}" 
                data-id="${id}"
                style="
                    background: ${colorScheme.bg};
                    border-left: 4px solid ${colorScheme.border};
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    font-family: Tahoma, sans-serif;
                "
                onmouseenter="this.style.${colorScheme.hover}"
                onmouseleave="this.style.transform='';this.style.boxShadow=''">
                
                <!-- KOLOM 1: NIK (Clickable trigger) -->
                <td class="col-nik" style="padding:1rem;font-weight:700;font-family:monospace;color:#1e293b;letter-spacing:0.5px;">
                    <button class="nik-trigger-btn" data-record-index="${index}" 
                            style="background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;
                                   transition:all 0.2s;font-family:inherit;font-size:inherit;"
                            onmouseover="this.style.background='rgba(59,130,246,0.15)'"
                            onmouseout="this.style.background='none'">
                        🔎 ${escapeHtml(nik)}
                    </button>
                </td>
                
                <!-- KOLOM 2: Nama Lengkap -->
                <td class="col-nama" style="padding:1rem;">
                    <strong style="color:#0f172a;font-size:0.95rem;display:block;">
                        ${escapeHtml(namaLengkap)}
                    </strong>
                </td>
                
                <!-- KOLOM 3: Jurusan Tujuan -->
                <td class="col-jurusan" style="padding:1rem;color:#334155;font-size:0.9rem;">
                    ${escapeHtml(jurusanTujuan)}
                </td>
                
                <!-- KOLOM 4: Rencana Tahun Studi -->
                <td class="col-tahun" style="padding:1rem;text-align:center;">
                    <span style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;
                                padding:0.4rem 1rem;border-radius:20px;font-weight:700;font-size:0.85rem;
                                display:inline-block;min-width:70px;box-shadow:0 2px 8px rgba(37,99,235,0.3);">
                        ${escapeHtml(rencanaTahun)}
                    </span>
                </td>
                
                <!-- KOLOM 5: Unit Penempatan -->
                <td class="col-unit" style="padding:1rem;color:#334155;font-size:0.9rem;" title="${escapeHtml(unitTujuan)}">
                    ${truncate(unitTujuan, 28)}
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // ============================================================
    // EVENT DELEGATION - SATU-SATUNYA EVENT HANDLER UNTUK TABEL
    // ============================================================
    setupTableEventDelegation(tbody);
    
    console.log(`✅ Rendered ${data.length} rows with colored design`);
    console.groupEnd();
}

/**
 * setupTableEventDelegation() - Event delegation untuk tabel
 * Menangani klik pada baris dan tombol NIK
 */
function setupTableEventDelegation(tbody) {
    // Hapus listener lama jika ada (cegah duplikasi)
    const newTbody = tbody.cloneNode(true);
    tbody.parentNode.replaceChild(newTbody, tbody);
    
    // Tambah event delegation
    newTbody.addEventListener('click', function handleTableClick(event) {
        // Cek apakah yang diklik adalah tombol NIK
        const nikBtn = event.target.closest('.nik-trigger-btn');
        if (nikBtn) {
            event.preventDefault();
            event.stopPropagation();
            
            const index = parseInt(nikBtn.dataset.recordIndex);
            console.log('[TABLE CLICK] NIK button clicked, index:', index);
            
            openRecordDetailByIndex(index);
            return;
        }
        
        // Cek apakah yang diklik adalah baris
        const row = event.target.closest('.admin-data-row[data-record-index]');
        if (row) {
            // Abaikan klik di dalam tombol/link lainnya
            if (event.target.closest('button:not(.nik-trigger-btn), a, [data-no-click], input, select, textarea')) {
                return;
            }
            
            const index = parseInt(row.dataset.recordIndex);
            console.log('[TABLE CLICK] Row clicked, index:', index);
            
            openRecordDetailByIndex(index);
        }
    });
    
    console.log('[EVENT] ✅ Table event delegation setup complete');
}

/**
 * openRecordDetailByIndex() - Buka detail record berdasarkan index
 * LANGSUNG ambil dari submissionsData[], tidak query ulang!
 */
function openRecordDetailByIndex(index) {
    console.group('🔓 OPEN RECORD DETAIL');
    console.log('Index requested:', index);
    console.log('submissionsData length:', window.submissionsData.length);
    
    // Validasi index
    if (typeof index !== 'number' || isNaN(index) || index < 0) {
        console.error('Invalid index:', index);
        ToastManager.error('Indeks record tidak valid');
        console.groupEnd();
        return;
    }
    
    // Ambil record langsung dari array
    const record = window.submissionsData[index];
    
    if (!record || typeof record !== 'object') {
        console.error('Record not found at index:', index);
        ToastManager.error('Data tidak ditemukan di indeks tersebut');
        console.groupEnd();
        return;
    }
    
    console.log('✅ Record found:');
    console.log('  ID:', record.id);
    console.log('  NIK:', record.nik);
    console.log('  Nama:', record.nama_lengkap || record.nama);
    console.log('  Keys:', Object.keys(record));
    console.groupEnd();
    
    // Set active record
    window.activeRecord = record;
    
    // Buka Lightbox
    openFullScreenLightbox(record);
}

// ============================================================
// FULL SCREEN LIGHTBOX - FINAL VERSION
// ============================================================

/**
 * openFullScreenLightbox() - Buka Full Screen Lightbox
 * Layout: Foto Kiri | Data Kanan | CRUD Footer
 */
async function openFullScreenLightbox(record) {
    console.group('💡 OPEN FULL SCREEN LIGHTBOX');
    console.log('Opening for record:', record?.id);
    
    // Reset state
    window.lightboxState = {
        isOpen: true,
        isEditing: false,
        isStatusMode: false,
        isDeleteMode: false,
        originalData: JSON.parse(JSON.stringify(record))
    };
    
    // Buat atau dapatkan element lightbox
    let lightbox = document.getElementById('fullscreen-lightbox');
    if (!lightbox) {
        lightbox = createFullScreenLightboxElement();
        document.body.appendChild(lightbox);
    }
    
    // Populate content
    await populateLightboxContent(lightbox, record);
    
    // Show dengan animasi
    requestAnimationFrame(() => {
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('✅ Lightbox opened successfully');
    });
    
    console.groupEnd();
}

/**
 * createFullScreenLightboxElement() - Buat struktur HTML Lightbox
 */
function createFullScreenLightboxElement() {
    const lightbox = document.createElement('div');
    lightbox.id = 'fullscreen-lightbox';
    lightbox.className = 'fs-lightbox-overlay';
    
    lightbox.innerHTML = `
        <style>
            /* ===== LIGHTBOX OVERLAY STYLES ===== */
            .fs-lightbox-overlay {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                z-index: 99999;
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(12px);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                padding: 2rem;
                box-sizing: border-box;
            }
            
            .fs-lightbox-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            /* ===== LIGHTBOX CONTAINER ===== */
            .fs-lightbox-container {
                background: linear-gradient(145deg, #ffffff, #f8fafc);
                width: min(1500px, 96vw);
                height: min(900px, 94vh);
                border-radius: 24px;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: lightboxSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            @keyframes lightboxSlideIn {
                from { opacity: 0; transform: scale(0.9) translateY(30px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            
            /* ===== HEADER ===== */
            .fs-lightbox-header {
                background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
                padding: 1.25rem 2rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            
            .fs-lightbox-title {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .fs-lightbox-title h2 {
                color: white;
                font-family: Tahoma, sans-serif;
                font-size: 1.3rem;
                font-weight: 800;
                margin: 0;
                letter-spacing: -0.02em;
            }
            
            .fs-lightbox-badge {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
                padding: 0.35rem 1rem;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 700;
                font-family: Tahoma, sans-serif;
            }
            
            .fs-close-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                width: 42px;
                height: 42px;
                border-radius: 12px;
                cursor: pointer;
                font-size: 1.4rem;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .fs-close-btn:hover {
                background: rgba(239,68,68,0.8);
                transform: rotate(90deg);
            }
            
            /* ===== MAIN CONTENT AREA ===== */
            .fs-lightbox-main {
                display: flex;
                flex: 1;
                overflow: hidden;
            }
            
            /* ===== LEFT: PHOTO SECTION ===== */
            .fs-photo-section {
                width: 320px;
                background: linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem;
                border-right: 1px solid #e2e8f0;
                flex-shrink: 0;
            }
            
            .fs-photo-wrapper {
                width: 240px;
                height: 280px;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 15px 40px rgba(0,0,0,0.15);
                background: white;
                margin-bottom: 1rem;
                position: relative;
            }
            
            .fs-photo-wrapper img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center top;
            }
            
            .fs-photo-name {
                font-family: Tahoma, sans-serif;
                font-weight: 700;
                color: #1e293b;
                font-size: 1rem;
                text-align: center;
                margin-top: 0.75rem;
            }
            
            .fs-photo-fullscreen-btn {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
                border: none;
                padding: 0.6rem 1.2rem;
                border-radius: 10px;
                cursor: pointer;
                font-family: Tahoma, sans-serif;
                font-weight: 600;
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.2s;
                margin-top: 0.5rem;
            }
            
            .fs-photo-fullscreen-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 5px 15px rgba(59,130,246,0.4);
            }
            
            /* ===== RIGHT: DATA SECTION ===== */
            .fs-data-section {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .fs-data-scroll {
                flex: 1;
                overflow-y: auto;
                padding: 1.5rem 2rem;
            }
            
            .fs-data-scroll::-webkit-scrollbar {
                width: 8px;
            }
            
            .fs-data-scroll::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
            }
            
            .fs-data-scroll::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, #94a3b8, #64748b);
                border-radius: 4px;
            }
            
            .fs-field-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 0.85rem 1rem;
                margin-bottom: 0.5rem;
                background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                border-radius: 12px;
                border-left: 4px solid #3b82f6;
                transition: all 0.2s;
            }
            
            .fs-field-item:hover {
                background: linear-gradient(135deg, #eff6ff, #dbeafe);
                transform: translateX(4px);
            }
            
            .fs-field-label {
                font-family: Tahoma, sans-serif;
                font-weight: 700;
                color: #475569;
                font-size: 0.85rem;
                min-width: 180px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .fs-field-value {
                font-family: Tahoma, sans-serif;
                color: #0f172a;
                font-size: 0.9rem;
                text-align: right;
                word-break: break-word;
                line-height: 1.5;
            }
            
            .fs-field-null {
                color: #94a3b8;
                font-style: italic;
            }
            
            /* ===== FOOTER: CRUD BUTTONS ===== */
            .fs-crud-footer {
                background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
                border-top: 2px solid #e2e8f0;
                padding: 1.25rem 2rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            
            .fs-crud-info {
                font-family: Tahoma, sans-serif;
                font-size: 0.85rem;
                color: #64748b;
            }
            
            .fs-crud-buttons {
                display: flex;
                gap: 0.75rem;
            }
            
            .fs-btn-crud {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 12px;
                font-family: Tahoma, sans-serif;
                font-weight: 700;
                font-size: 0.85rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .fs-btn-crud:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            }
            
            .fs-btn-crud:active {
                transform: translateY(0);
            }
            
            .fs-btn-edit {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
            }
            
            .fs-btn-status {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
            }
            
            .fs-btn-delete {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
            }
            
            .fs-btn-close {
                background: linear-gradient(135deg, #64748b, #475569);
                color: white;
            }
            
            /* ===== OVERLAYS (Edit/Status/Delete) ===== */
            .fs-overlay {
                position: absolute;
                inset: 0;
                background: rgba(255,255,255,0.98);
                z-index: 100;
                display: none;
                flex-direction: column;
                padding: 2rem;
                overflow-y: auto;
                border-radius: 24px;
            }
            
            .fs-overlay.active {
                display: flex;
            }
            
            .fs-overlay-header {
                margin-bottom: 1.5rem;
            }
            
            .fs-overlay-header h3 {
                font-family: Tahoma, sans-serif;
                font-size: 1.4rem;
                font-weight: 800;
                color: #1e293b;
                margin-bottom: 0.5rem;
            }
            
            .fs-form-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 1rem;
            }
            
            .fs-form-group {
                display: flex;
                flex-direction: column;
                gap: 0.4rem;
            }
            
            .fs-form-group label {
                font-family: Tahoma, sans-serif;
                font-weight: 700;
                font-size: 0.85rem;
                color: #475569;
            }
            
            .fs-form-group input, 
            .fs-form-group select,
            .fs-form-group textarea {
                padding: 0.75rem 1rem;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                font-family: Tahoma, sans-serif;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            
            .fs-form-group input:focus,
            .fs-form-group select:focus,
            .fs-form-group textarea:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
            }
            
            .fs-overlay-actions {
                display: flex;
                gap: 1rem;
                margin-top: auto;
                padding-top: 1.5rem;
                border-top: 2px solid #e2e8f0;
            }
            
            .fs-btn-cancel {
                background: #f1f5f9;
                color: #475569;
                border: 2px solid #e2e8f0;
                padding: 0.75rem 1.5rem;
                border-radius: 12px;
                font-family: Tahoma, sans-serif;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .fs-btn-cancel:hover {
                background: #e2e8f0;
            }
            
            .fs-btn-save {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                border: none;
                padding: 0.75rem 2rem;
                border-radius: 12px;
                font-family: Tahoma, sans-serif;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .fs-btn-save:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(16,185,129,0.3);
            }
            
            /* Status Options */
            .fs-status-options {
                display: flex;
                flex-wrap: wrap;
                gap: 0.75rem;
            }
            
            .fs-status-option {
                padding: 0.75rem 1.5rem;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                font-family: Tahoma, sans-serif;
                font-weight: 600;
                transition: all 0.2s;
            }
            
            .fs-status-option:hover {
                border-color: #f59e0b;
                background: #fffbeb;
            }
            
            .fs-status-option.selected {
                border-color: #f59e0b;
                background: linear-gradient(135deg, #fef3c7, #fde68a);
            }
            
            /* Delete Confirmation */
            .fs-delete-content {
                text-align: center;
                padding: 2rem;
            }
            
            .fs-delete-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            
            .fs-delete-content h3 {
                font-family: Tahoma, sans-serif;
                font-size: 1.5rem;
                color: #dc2626;
                margin-bottom: 1rem;
            }
            
            .fs-delete-content p {
                color: #64748b;
                margin-bottom: 0.5rem;
            }
            
            .fs-delete-warning {
                background: #fef2f2;
                color: #dc2626;
                padding: 1rem;
                border-radius: 12px;
                font-weight: 600;
                margin: 1rem 0;
            }
            
            /* Responsive Mobile */
            @media (max-width: 768px) {
                .fs-lightbox-main {
                    flex-direction: column;
                }
                
                .fs-photo-section {
                    width: 100%;
                    padding: 1.5rem;
                    border-right: none;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .fs-photo-wrapper {
                    width: 180px;
                    height: 210px;
                }
                
                .fs-crud-footer {
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .fs-crud-buttons {
                    flex-wrap: wrap;
                    justify-content: center;
                }
                
                .fs-field-item {
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .fs-field-label, .fs-field-value {
                    text-align: left;
                }
            }
        </style>
        
        <div class="fs-lightbox-container">
            <!-- HEADER -->
            <div class="fs-lightbox-header">
                <div class="fs-lightbox-title">
                    <h2>📋 Detail Data Peserta</h2>
                    <span class="fs-lightbox-badge" id="fs-record-badge">#-</span>
                </div>
                <button class="fs-close-btn" onclick="closeFullScreenLightbox()" title="Tutup (ESC)">✕</button>
            </div>
            
            <!-- MAIN CONTENT -->
            <div class="fs-lightbox-main">
                <!-- LEFT: PHOTO -->
                <div class="fs-photo-section">
                    <div class="fs-photo-wrapper" id="fs-photo-wrapper">
                        <img id="fs-photo-img" alt="Foto Peserta" />
                    </div>
                    <p class="fs-photo-name" id="fs-photo-name">-</p>
                    <button class="fs-photo-fullscreen-btn" onclick="viewPhotoFullscreen()">
                        🔍 Lihat Foto Penuh
                    </button>
                </div>
                
                <!-- RIGHT: DATA -->
                <div class="fs-data-section">
                    <!-- Normal View -->
                    <div class="fs-data-scroll" id="fs-data-normal">
                        <div class="fs-data-grid" id="fs-data-grid">
                            <!-- Fields populated dynamically -->
                        </div>
                    </div>
                    
                    <!-- EDIT OVERLAY -->
                    <div class="fs-overlay" id="fs-edit-overlay">
                        <div class="fs-overlay-header">
                            <h3>✏️ EDIT DATA PESERTA</h3>
                            <p style="color:#64748b;font-size:0.9rem;">Ubah field yang diperlukan, lalu simpan perubahan</p>
                        </div>
                        <form id="fs-edit-form" onsubmit="handleEditSubmit(event)">
                            <div class="fs-form-grid" id="fs-edit-grid">
                                <!-- Form fields generated dynamically -->
                            </div>
                            <div class="fs-overlay-actions">
                                <button type="button" class="fs-btn-cancel" onclick="closeEditMode()">✕ BATAL</button>
                                <button type="submit" class="fs-btn-save">💾 SIMPAN PERUBAHAN</button>
                            </div>
                        </form>
                    </div>
                    
                    <!-- STATUS OVERLAY -->
                    <div class="fs-overlay" id="fs-status-overlay">
                        <div class="fs-overlay-header">
                            <h3>✓ UBAH STATUS PENGAJUAN</h3>
                        </div>
                        <div class="fs-status-options" id="fs-status-options">
                            <!-- Status options generated dynamically -->
                        </div>
                        <div class="fs-overlay-actions">
                            <button type="button" class="fs-btn-cancel" onclick="closeStatusMode()">✕ BATAL</button>
                        </div>
                    </div>
                    
                    <!-- DELETE CONFIRMATION OVERLAY -->
                    <div class="fs-overlay" id="fs-delete-overlay">
                        <div class="fs-delete-content">
                            <div class="fs-delete-icon">🗑️</div>
                            <h3>HAPUS DATA?</h3>
                            <p>Data peserta ini akan dihapus <strong>secara permanen</strong></p>
                            <p>dari tabel submissions.</p>
                            <div class="fs-delete-warning">⚠️ Tindakan ini tidak dapat dibatalkan!</div>
                            <div class="fs-overlay-actions" style="justify-content:center;">
                                <button type="button" class="fs-btn-cancel" onclick="closeDeleteMode()">✕ BATAL</button>
                                <button type="button" class="fs-btn-crud fs-btn-delete" onclick="confirmDeleteAction()">🗑 YA, HAPUS DATA</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- FOOTER: CRUD BUTTONS -->
            <div class="fs-crud-footer" id="fs-crud-footer">
                <div class="fs-crud-info">
                    <span id="fs-record-info">Record 0 of 0</span>
                </div>
                <div class="fs-crud-buttons">
                    <button type="button" class="fs-btn-crud fs-btn-edit" onclick="openEditMode()">✏️ EDIT DATA</button>
                    <button type="button" class="fs-btn-crud fs-btn-status" onclick="openStatusMode()">✓ UBAH STATUS</button>
                    <button type="button" class="fs-btn-crud fs-btn-delete" onclick="openDeleteMode()">🗑 HAPUS DATA</button>
                    <button type="button" class="fs-btn-crud fs-btn-close" onclick="closeFullScreenLightbox()">✕ TUTUP</button>
                </div>
            </div>
        </div>
    `;
    
    // Event: Click outside to close
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox && !window.lightboxState.isEditing) {
            closeFullScreenLightbox();
        }
    });
    
    return lightbox;
}

/**
 * populateLightboxContent() - Isi konten Lightbox dengan data record
 */
async function populateLightboxContent(lightbox, record) {
    const nama = record.nama_lengkap || record.nama || '-';
    const noRegister = record.no_register || record.id || '-';
    const id = record.id || '';
    
    // Update header
    document.getElementById('fs-record-badge').textContent = `#${noRegister}`;
    document.getElementById('fs-photo-name').textContent = nama;
    
    // Update navigation info
    const totalRecords = window.submissionsData.length;
    const currentIndex = window.submissionsData.findIndex(item => item.id === id);
    document.getElementById('fs-record-info').textContent = 
        `Record ${currentIndex + 1} of ${totalRecords}`;
    
    // Load photo
    await loadPhotoToLightbox(record);
    
    // Generate all fields
    generateFieldsHTML(record);
}

/**
 * loadPhotoToLightbox() - Load foto ke Lightbox
 */
async function loadPhotoToLightbox(record) {
    const img = document.getElementById('fs-photo-img');
    if (!img) return;
    
    // Show loading state
    img.style.opacity = '0.5';
    img.src = '';
    
    try {
        const photoResult = await resolveSupabaseImage(record);
        
        if (photoResult.isBase64) {
            img.src = photoResult.url;
        } else {
            // Test URL dulu
            const valid = await testImageUrl(photoResult.url);
            if (valid) {
                img.src = photoResult.url;
            } else {
                throw new Error('URL invalid');
            }
        }
        
        img.onload = () => {
            img.style.opacity = '1';
        };
        
        img.onerror = () => {
            img.src = generatePlaceholderSVG(record);
            img.style.opacity = '1';
        };
        
    } catch (error) {
        console.warn('[PHOTO] Error loading photo:', error);
        img.src = generatePlaceholderSVG(record);
        img.style.opacity = '1';
    }
}

/**
 * generateFieldsHTML() - Generate HTML untuk semua field record
 * Urutan mengikuti struktur Supabase (Object.entries mempertahankan urutan)
 */
function generateFieldsHTML(record) {
    const grid = document.getElementById('fs-data-grid');
    if (!grid) return;
    
    console.log('[FIELDS] Generating for record with keys:', Object.keys(record));
    
    // Icon mapping untuk kategori field
    const fieldIcons = {
        nik: '🆔', nama_lengkap: '👤', nama: '👤', tempat_lahir: '📍', tanggal_lahir: '🎂',
        jenis_kelamin: '⚧', agama: '🙏', golongan_darah: '🩸',
        email: '📧', no_telepon: '📱', no_hp: '📱',
        alamat: '🏠', provinsi: '🗺️', kabupaten_kota: '🏙️', kecamatan: '🏘️', kelurahan: '🏡',
        jurusan_tujuan: '🎓', jurusan: '🎓', rencana_tahun_studi: '📅', rencana_tahun: '📅',
        unit_tujuan: '🏥', unit_kerja: '🏥', unit_penempatan: '🏥',
        status: '📊', no_register: '📋', tanggal_pengajuan: '📝',
        created_at: '➕', updated_at: '✏️', id: '🔢'
    };
    
    let html = '';
    
    Object.entries(record).forEach(([key, value]) => {
        // Skip internal fields
        if (key.startsWith('_') || key === 'row_num') return;
        
        const label = formatFieldName(key);
        const icon = fieldIcons[key] || '📌';
        
        // Format nilai
        let displayValue;
        if (value === null || value === undefined || value === '') {
            displayValue = '<span class="fs-field-null">—</span>';
        } else if (typeof value === 'object') {
            displayValue = escapeHtml(JSON.stringify(value));
        } else if (key.toLowerCase().includes('tanggal') || key.toLowerCase().includes('created_at') || key.toLowerCase().includes('updated_at')) {
            displayValue = formatDate(value);
        } else {
            displayValue = escapeHtml(String(value));
        }
        
        html += `
            <div class="fs-field-item">
                <div class="fs-field-label">${icon} ${label}</div>
                <div class="fs-field-value">${displayValue}</div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    console.log(`[FIELDS] ✅ Generated ${Object.keys(record).length} fields`);
}

// ============================================================
// LIGHTBOX NAVIGATION
// ============================================================

function navigateRecord(direction) {
    if (!window.activeRecord) return;
    
    const currentIndex = window.submissionsData.findIndex(item => item.id === window.activeRecord.id);
    const newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < window.submissionsData.length) {
        const newRecord = window.submissionsData[newIndex];
        window.activeRecord = newRecord;
        populateLightboxContent(document.getElementById('fullscreen-lightbox'), newRecord);
    }
}

// ============================================================
// CRUD OPERATIONS - REAL SUPABASE OPERATIONS
// ============================================================

/**
 * openEditMode() - Buka form edit
 */
function openEditMode() {
    if (!window.activeRecord) {
        ToastManager.error('Tidak ada record aktif');
        return;
    }
    
    window.lightboxState.isEditing = true;
    
    const overlay = document.getElementById('fs-edit-overlay');
    const grid = document.getElementById('fs-edit-grid');
    
    if (!overlay || !grid) return;
    
    // Generate form fields
    let formHtml = '';
    
    Object.entries(window.activeRecord).forEach(([key, value]) => {
        // Skip ID dan timestamp (biasanya tidak diedit)
        if (['id', 'created_at', 'updated_at', 'row_num'].includes(key)) return;
        
        const label = formatFieldName(key);
        const currentValue = value === null ? '' : String(value);
        
        // Special handling for status field (select dropdown)
        if (key === 'status') {
            const statusOptions = ['Draft', 'Proses Verifikasi', 'Disetujui', 'Ditolak', 'Perbaikan', 'Dibatalkan'];
            
            formHtml += `
                <div class="fs-form-group">
                    <label>${label}</label>
                    <select name="${key}" id="edit-${key}">
                        ${statusOptions.map(opt => 
                            `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        } else if (key.toLowerCase().includes('tanggal') && currentValue) {
            // Date fields
            formHtml += `
                <div class="fs-form-group">
                    <label>${label}</label>
                    <input type="date" name="${key}" id="edit-${key}" value="${currentValue.split('T')[0]}" />
                </div>
            `;
        } else if (typeof value === 'number' || (!isNaN(currentValue) && currentValue !== '')) {
            // Number fields
            formHtml += `
                <div class="fs-form-group">
                    <label>${label}</label>
                    <input type="number" name="${key}" id="edit-${key}" value="${currentValue}" />
                </div>
            `;
        } else if (currentValue.length > 100) {
            // Long text (textarea)
            formHtml += `
                <div class="fs-form-group">
                    <label>${label}</label>
                    <textarea name="${key}" id="edit-${key}" rows="3">${escapeHtml(currentValue)}</textarea>
                </div>
            `;
        } else {
            // Regular text
            formHtml += `
                <div class="fs-form-group">
                    <label>${label}</label>
                    <input type="text" name="${key}" id="edit-${key}" value="${escapeHtml(currentValue)}" />
                </div>
            `;
        }
    });
    
    grid.innerHTML = formHtml;
    overlay.classList.add('active');
    
    console.log('[EDIT] Edit mode opened');
}

/**
 * closeEditMode() - Tutup form edit
 */
function closeEditMode() {
    const overlay = document.getElementById('fs-edit-overlay');
    if (overlay) overlay.classList.remove('active');
    window.lightboxState.isEditing = false;
}

/**
 * handleEditSubmit() - Simpan perubahan edit ke Supabase
 */
async function handleEditSubmit(event) {
    event.preventDefault();
    
    if (!window.activeRecord || !supabaseClient) {
        ToastManager.error('Gagal menyimpan: data atau koneksi tidak tersedia');
        return;
    }
    
    const primaryKeyValue = window.activeRecord[window.PRIMARY_KEY_FIELD];
    if (!primaryKeyValue) {
        ToastManager.error('Identifier record tidak ditemukan');
        return;
    }
    
    // Collect form data
    const formData = new FormData(event.target);
    const updatedData = {};
    
    for (const [key, value] of formData.entries()) {
        if (value !== '') {
            // Convert number fields
            const originalValue = window.activeRecord[key];
            if (typeof originalValue === 'number' && !isNaN(value)) {
                updatedData[key] = parseFloat(value);
            } else {
                updatedData[key] = value;
            }
        }
    }
    
    console.log('[EDIT] Updating record:', primaryKeyValue);
    console.log('[EDIT] Updated data:', updatedData);
    
    try {
        // Disable save button
        const saveBtn = event.target.querySelector('.fs-btn-save');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ MENYIMPAN...';
        }
        
        // UPDATE ke Supabase
        const { data, error } = await supabaseClient
            .from('submissions')
            .update(updatedData)
            .eq(window.PRIMARY_KEY_FIELD, primaryKeyValue)
            .select()
            .single();
        
        if (error) throw error;
        
        // Update active record
        window.activeRecord = data;
        
        // Update local array
        const localIndex = window.submissionsData.findIndex(item => item.id === primaryKeyValue);
        if (localIndex >= 0) {
            window.submissionsData[localIndex] = data;
        }
        
        // Close edit mode and refresh view
        closeEditMode();
        populateLightboxContent(document.getElementById('fullscreen-lightbox'), data);
        
        // Re-render table
        renderAdminTableFinal(window.submissionsData);
        
        ToastManager.success('✅ Data berhasil diperbarui!');
        console.log('[EDIT] ✅ Update successful');
        
    } catch (error) {
        console.error('[EDIT] ❌ Update failed:', error);
        ToastManager.error(`Gagal menyimpan: ${error.message}`);
    } finally {
        const saveBtn = event.target.querySelector('.fs-btn-save');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 SIMPAN PERUBAHAN';
        }
    }
}

/**
 * openStatusMode() - Buka pilihan status
 */
function openStatusMode() {
    if (!window.activeRecord) {
        ToastManager.error('Tidak ada record aktif');
        return;
    }
    
    const overlay = document.getElementById('fs-status-overlay');
    const optionsContainer = document.getElementById('fs-status-options');
    
    if (!overlay || !optionsContainer) return;
    
    const currentStatus = window.activeRecord.status || '';
    const statuses = [
        { value: 'Draft', label: '📝 Draft', color: '#94a3b8' },
        { value: 'Proses Verifikasi', label: '🔄 Proses Verifikasi', color: '#f59e0b' },
        { value: 'Disetujui', label: '✅ Disetujui', color: '#10b981' },
        { value: 'Ditolak', label: '❌ Ditolak', color: '#ef4444' },
        { value: 'Perbaikan', label: '🔧 Perbaikan', color: '#f97316' },
        { value: 'Dibatalkan', label: '🚫 Dibatalkan', color: '#6b7280' }
    ];
    
    optionsContainer.innerHTML = statuses.map(s => `
        <button type="button" 
                class="fs-status-option ${s.value === currentStatus ? 'selected' : ''}"
                data-status="${s.value}"
                onclick="selectStatusOption(this)">
            ${s.label}
        </button>
    `).join('');
    
    overlay.classList.add('active');
    console.log('[STATUS] Status mode opened');
}

function selectStatusOption(btn) {
    // Remove selected from all
    document.querySelectorAll('.fs-status-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

function closeStatusMode() {
    const overlay = document.getElementById('fs-status-overlay');
    if (overlay) overlay.classList.remove('active');
}

/**
 * confirmStatusChange() - Konfirmasi ubah status
 */
async function confirmStatusChange() {
    if (!window.activeRecord || !supabaseClient) {
        ToastManager.error('Gagal mengubah status');
        return;
    }
    
    const selectedBtn = document.querySelector('.fs-status-option.selected');
    if (!selectedBtn) {
        ToastManager.warning('Pilih status baru terlebih dahulu');
        return;
    }
    
    const newStatus = selectedBtn.dataset.status;
    const primaryKeyValue = window.activeRecord[window.PRIMARY_KEY_FIELD];
    
    try {
        const { data, error } = await supabaseClient
            .from('submissions')
            .update({ status: newStatus })
            .eq(window.PRIMARY_KEY_FIELD, primaryKeyValue)
            .select()
            .single();
        
        if (error) throw error;
        
        // Update state
        window.activeRecord = data;
        
        const localIndex = window.submissionsData.findIndex(item => item.id === primaryKeyValue);
        if (localIndex >= 0) {
            window.submissionsData[localIndex] = data;
        }
        
        closeStatusMode();
        populateLightboxContent(document.getElementById('fullscreen-lightbox'), data);
        renderAdminTableFinal(window.submissionsData);
        
        ToastManager.success(`✅ Status diubah menjadi "${newStatus}"`);
        
    } catch (error) {
        console.error('[STATUS] Error:', error);
        ToastManager.error(`Gagal mengubah status: ${error.message}`);
    }
}

/**
 * openDeleteMode() - Buka konfirmasi hapus
 */
function openDeleteMode() {
    if (!window.activeRecord) {
        ToastManager.error('Tidak ada record aktif');
        return;
    }
    
    const overlay = document.getElementById('fs-delete-overlay');
    if (overlay) overlay.classList.add('active');
}

function closeDeleteMode() {
    const overlay = document.getElementById('fs-delete-overlay');
    if (overlay) overlay.classList.remove('active');
}

/**
 * confirmDeleteAction() - Eksekusi hapus data dari Supabase
 */
async function confirmDeleteAction() {
    if (!window.activeRecord || !supabaseClient) {
        ToastManager.error('Gagal menghapus data');
        return;
    }
    
    const primaryKeyValue = window.activeRecord[window.PRIMARY_KEY_FIELD];
    const deletedName = window.activeRecord.nama_lengkap || window.activeRecord.nama || 'Record';
    
    try {
        console.log('[DELETE] Deleting record:', primaryKeyValue);
        
        // DELETE dari Supabase
        const { error } = await supabaseClient
            .from('submissions')
            .delete()
            .eq(window.PRIMARY_KEY_FIELD, primaryKeyValue);
        
        if (error) throw error;
        
        // Remove from local array
        const localIndex = window.submissionsData.findIndex(item => item.id === primaryKeyValue);
        if (localIndex >= 0) {
            window.submissionsData.splice(localIndex, 1);
        }
        
        // Close lightbox
        closeFullScreenLightbox();
        
        // Re-render table
        renderAdminTableFinal(window.submissionsData);
        
        ToastManager.success(`🗑️ Data "${deletedName}" berhasil dihapus`);
        console.log('[DELETE] ✅ Delete successful');
        
    } catch (error) {
        console.error('[DELETE] ❌ Error:', error);
        ToastManager.error(`Gagal menghapus: ${error.message}`);
    }
}

/**
 * closeFullScreenLightbox() - Tutup Lightbox
 */
function closeFullScreenLightbox() {
    const lightbox = document.getElementById('fullscreen-lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset overlays
        setTimeout(() => {
            closeEditMode();
            closeStatusMode();
            closeDeleteMode();
            window.activeRecord = null;
            window.lightboxState.isOpen = false;
        }, 350);
    }
}

/**
 * viewPhotoFullscreen() - Lihat foto dalam ukuran penuh
 */
function viewPhotoFullscreen() {
    const img = document.getElementById('fs-photo-img');
    if (!img || !img.src) return;
    
    // Create fullscreen viewer
    const viewer = document.createElement('div');
    viewer.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(0,0,0,0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    viewer.innerHTML = `
        <img src="${img.src}" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;" />
        <p style="position:fixed;bottom:2rem;color:white;font-family:Tahoma,sans-serif;text-align:center;width:100%;">
            Klik mana saja untuk tutup
        </p>
    `;
    
    viewer.addEventListener('click', () => viewer.remove());
    document.body.appendChild(viewer);
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', (e) => {
    if (!window.lightboxState.isOpen) return;
    
    switch(e.key) {
        case 'Escape':
            closeFullScreenLightbox();
            break;
        case 'ArrowLeft':
            navigateRecord(-1);
            break;
        case 'ArrowRight':
            navigateRecord(1);
            break;
    }
});

// ============================================================
// EXPORT GLOBAL FUNCTIONS
// ============================================================

// Table functions
window.renderAdminTableFinal = renderAdminTableFinal;

// Lightbox functions
window.openFullScreenLightbox = openFullScreenLightbox;
window.closeFullScreenLightbox = closeFullScreenLightbox;
window.openRecordDetailByIndex = openRecordDetailByIndex;

// CRUD functions
window.openEditMode = openEditMode;
window.closeEditMode = closeEditMode;
window.handleEditSubmit = handleEditSubmit;
window.openStatusMode = openStatusMode;
window.closeStatusMode = closeStatusMode;
window.confirmStatusChange = confirmStatusChange;
window.openDeleteMode = openDeleteMode;
window.closeDeleteMode = closeDeleteMode;
window.confirmDeleteAction = confirmDeleteAction;
window.navigateRecord = navigateRecord;
window.viewPhotoFullscreen = viewPhotoFullscreen;

// Utility
window.resolveSupabaseImage = resolveSupabaseImage;
window.testImageUrl = testImageUrl;

console.log('✅ SIMBAKES ADMIN FINAL SYSTEM LOADED');
console.log('📦 Features: 5-col table | Full-screen Lightbox | Real CRUD | Photo Resolver');
console.log('🚀 NO FALLBACKS - NO SIMPLE MODAL - NO POLLING');
