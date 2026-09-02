// ===== ADMIN PANEL - DATA PENGUSUL FUNCTIONS v3.0 =====

/**
 * Global variables for admin data management
 * NOTE: Pagination variables declared early at top of script to avoid TDZ errors
 */


/**
 * Initialize and load Data Pengusul when page is shown
 */
function loadDataPengusul() {
    adminCurrentPage = 1;
    fetchAdminData();
}

/**
 * Fetch admin data from Supabase with pagination, search, filter
 * Menggunakan Supabase client dan error handling yang lebih baik
 */
async function fetchAdminData() {
    const tbody = document.getElementById('pengusul-table-body');
    
    // Show loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center;padding:3rem;color:#64748b;">
                <div class="spinner"></div>
                <p style="margin-top:1rem;">Memuat data pengusul...</p>
                <p style="font-size:0.8rem;color:#94a3b8;margin-top:0.5rem;">Menghubungkan ke server Supabase...</p>
            </td>
        </tr>
    `;
    
    try {
        // Pastikan Supabase client tersedia
        if (!supabaseClient) {
            throw new Error('Supabase client belum terinisialisasi. Silakan refresh halaman.');
        }
        
        const search = document.getElementById('admin-search-input')?.value?.trim() || '';
        const statusFilter = document.getElementById('admin-status-filter')?.value || '';
        const sortBy = document.getElementById('admin-sort-by')?.value || 'created_at';
        const sortOrder = document.getElementById('admin-sort-order')?.value || 'desc';
        
        // Build query ke tabel submissions di Supabase
        let query = supabaseClient
            .from('submissions')
            .select('*', { count: 'exact' });
        
        // Apply search filter (search in multiple columns)
        // ✅ BENAR: Gunakan format OR yang valid untuk Supabase PostgREST
        if (search) {
            const searchPattern = `%${search}%`;
            query = query.or(`nama_lengkap.ilike.${searchPattern},nik.ilike.${searchPattern},no_register.ilike.${searchPattern},email.ilike.${searchPattern}`);
        }
        
        // Apply status filter
        if (statusFilter && statusFilter !== '') {
            query = query.eq('status', statusFilter);
        }
        
        // Apply sorting - pastikan kolom valid
        const validSortColumns = ['created_at', 'updated_at', 'nama_lengkap', 'no_register', 'status', 'tanggal_pengajuan'];
        const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder === 'desc' ? false : true;
        query = query.order(sortColumn, { ascending: order });
        
        // Apply pagination
        const fromRange = (adminCurrentPage - 1) * adminPageSize;
        const toRange = fromRange + adminPageSize - 1;
        query = query.range(fromRange, toRange);
        
        console.log('[SIMBAKES] Fetching admin data...', { 
            page: adminCurrentPage, 
            search: search || '(empty)', 
            status: statusFilter || '(all)',
            sort: sortColumn,
            order: sortOrder
        });
        
        // Execute query
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        console.log(`✅ Berhasil mengambil ${data?.length || 0} data pengusul`);
        
        // ============================================================
        // KRITIS: Simpan data ke pengusulData DAN submissionsData untuk CRUD Lightbox!
        // Ini memastikan record tersedia saat baris diklik
        // ============================================================
        if (data && Array.isArray(data)) {
            pengusulData = data;  // SIMPAN DATA GLOBAL (legacy)
            window.submissionsData = data;  // SIMPAN DATA GLOBAL (sistem FINAL)
            console.group('📦 SIMBAKES DATA STORE');
            console.log('✅ pengusulData diupdate:', pengusulData.length, 'records');
            console.log('✅ submissionsData diupdate:', window.submissionsData.length, 'records');
            console.log('Sample record keys:', Object.keys(pengusulData[0] || {}));
            console.log('Sample first record:', pengusulData[0]);
            console.groupEnd();
        } else {
            pengusulData = [];
            console.warn('⚠️ Data kosong atau tidak valid, pengusulData dikosongkan');
        }
        
        // Render table
        if (data && data.length > 0) {
            renderAdminTable(data);
            
            // Update pagination info
            const totalPages = Math.ceil((count || 0) / adminPageSize);
            updatePagination({
                currentPage: adminCurrentPage,
                totalPages: totalPages,
                totalRecords: count || 0,
                pageSize: adminPageSize
            });
            
            // Update stats
            updateAdminStats({
                totalRecords: count || 0,
                filteredRecords: count || 0
            });
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;padding:3rem;color:#64748b;">
                        <p style="font-size:2rem;margin-bottom:0.5rem;">📭</p>
                        <p style="font-weight:600;margin-bottom:0.5rem;">Tidak Ada Data</p>
                        <p style="font-size:0.875rem;color:#94a3b8;">Tidak ditemukan data pengusul dengan filter ini</p>
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('Error fetching admin data:', error);
        console.error('[SIMBAKES] Error details:', {
            message: error.message,
            code: error.code,
            status: error.status,
            hint: error.hint,
            details: error.details
        });
        
        // Tampilkan pesan error yang lebih informatif
        let errorMsg = error.message || 'Terjadi kesalahan tidak diketahui';
        const isNetworkError = !error.status && (error.message?.includes('network') || error.message?.includes('fetch'));
        const isBadRequest = error.status === 400;
        
        // Berikan pesan spesifik untuk error 400
        if (isBadRequest) {
            errorMsg = `Error query database (400). Kemungkinan: kolom tidak ditemukan atau format data salah. Detail: ${error.message || 'Unknown'}`;
            console.warn('[SIMBAKES] Bad Request - cek nama kolom dan tipe data');
        } else if (error.status === 401 || error.code === 'PGRST301') {
            errorMsg = 'Error autentikasi (401). RLS Policy mungkin memblokir akses.';
        } else if (error.status === 403) {
            errorMsg = 'Error izin akses (403). Anda tidak memiliki hak akses ke data ini.';
        } else if (error.status === 404) {
            errorMsg = 'Tabel submissions tidak ditemukan. Pastikan SQL schema sudah dijalankan.';
        } else if (error.status === 422 || error.code === 'PGRST204') {
            errorMsg = `Error format query. Detail: ${error.message}`;
        }
        
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:3rem;color:#dc2626;">
                    <div style="font-size:2.5rem;margin-bottom:1rem;">${isNetworkError ? '🌐' : (isBadRequest ? '⚙️' : '⚠️')}</div>
                    <p style="font-weight:600;margin-bottom:0.5rem;">Gagal Memuat Data Pengusul</p>
                    <p style="font-size:0.875rem;color:#64748b;margin-bottom:1rem;max-width:500px;margin-left:auto;margin-right:auto;">
                        ${errorMsg}
                    </p>
                    <p style="font-size:0.75rem;color:#94a3b8;margin-bottom:1rem;">
                        Error Code: ${error.code || error.status || 'Unknown'} | Status: ${error.status || 'N/A'}
                    </p>
                    <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;margin-top:1rem;">
                        <button class="btn btn-primary btn-sm" onclick="loadDataPengusul()" style="margin-top:0.5rem;">
                            🔄 Coba Lagi
                        </button>
                        <button class="btn btn-sm" onclick="console.log('[SIMBAKES] Debug info:', localStorage.getItem('simbakes_admin_session')); location.reload();" style="background:#e0e7ff;color:#4338ca;margin-top:0.5rem;">
                            🔃 Refresh Halaman
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * Render admin table - FINAL VERSION (No CRUD Buttons)
 * Menggunakan sistem FINAL: 5 kolom, warna baris, event delegation
 * Kolom: NIK | Nama | Jurusan | Rencana Tahun Studi | Unit Penempatan
 */
function renderAdminTable(data) {
    // Gunakan SISTEM FINAL (simbakes-admin-final.js)
    if (typeof renderAdminTableFinal === 'function') {
        console.log('[TABLE] ✅ Using renderAdminTableFinal');
        renderAdminTableFinal(data);
    } else if (window.renderAdminTableFinal) {
        // Coba dari window object
        console.log('[TABLE] ✅ Using window.renderAdminTableFinal');
        window.renderAdminTableFinal(data);
    } else {
        console.error('[TABLE] ❌ renderAdminTableFinal not available!');
        console.error('[TABLE] Available functions:', Object.keys(window).filter(k => k.includes('render')).join(', '));
        
        // Fallback minimal: tampilkan data dengan renderer sederhana
        const tbody = document.getElementById('pengusul-table-body');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:3rem;color:#64748b;">
                <div style="font-size:3rem;margin-bottom:1rem;">📭</div>
                <p style="font-size:1rem;font-weight:600;">Tidak Ada Data</p>
            </td></tr>`;
            return;
        }
        
        // Renderer sederhana tanpa fitur lengkap
        const escapeHtml = (t) => { if(!t) return ''; const d=document.createElement('div'); d.textContent=t; return d.innerHTML; };
        const colors = ['linear-gradient(135deg,#dbeafe,#bfdbfe)', 'linear-gradient(135deg,#d1fae5,#a7f3d0)', 
                       'linear-gradient(135deg,#ede9fe,#ddd6fe)', 'linear-gradient(135deg,#ffedd5,#fed7aa)',
                       'linear-gradient(135deg,#cffafe,#a5f3fc)', 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
                       'linear-gradient(135deg,#fef9c3,#fef08a)', 'linear-gradient(135deg,#e0e7ff,#c7d2fe)'];
        
        let html = '';
        data.forEach((row, i) => {
            html += `<tr data-record-index="${i}" data-id="${row.id||''}" 
                        style="background:${colors[i%colors.length]};cursor:pointer;padding:1rem;
                               border-left:4px solid #93c5fd;transition:all 0.2s;font-family:Tahoma,sans-serif;"
                        onmouseenter="this.style.transform='scale(1.005)'"
                        onmouseleave="this.style.transform=''">
                <td style="font-family:monospace;font-weight:700;color:#1e293b;">🔎 ${escapeHtml(row.nik||'-')}</td>
                <td><strong style="color:#0f172a;">${escapeHtml(row.nama_lengkap||row.nama||'-')}</strong></td>
                <td style="color:#334155;">${escapeHtml(row.jurusan_tujuan||row.jurusan||'-')}</td>
                <td style="text-align:center;"><span style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;
                            padding:0.4rem 1rem;border-radius:20px;font-weight:700;font-size:0.85rem;">
                    ${escapeHtml(row.rencana_tahun_studi||row.rencana_tahun||'-')}</span></td>
                <td style="color:#334155;">${escapeHtml((row.unit_tujuan||row.unit_kerja||'-').substring(0,28))}</td>
            </tr>`;
        });
        
        tbody.innerHTML = html;
        
        // Event delegation sederhana
        tbody.onclick = function(e) {
            const row = e.target.closest('tr[data-record-index]');
            if (row && !e.target.closest('button, a')) {
                const index = parseInt(row.dataset.recordIndex);
                console.log('[FALLBACK TABLE] Row clicked:', index);
                
                if (window.submissionsData && window.submissionsData[index]) {
                    window.activeRecord = window.submissionsData[index];
                    if (typeof openFullScreenLightbox === 'function') {
                        openFullScreenLightbox(window.activeRecord);
                    } else if (typeof openDetailLightbox === 'function') {
                        openDetailLightbox(window.activeRecord);
                    } else {
                        alert('Record: ' + JSON.stringify(window.activeRecord, null, 2).substring(0, 500));
                    }
                }
            }
        };
        
        console.log(`[TABLE] ⚠️ Used fallback renderer for ${data.length} rows`);
    }
}

/**
 * Setup Event Delegation for Pengusul Table (Submissions)
 * Mengatasi masalah innerHTML yang menghapus event listener
 * Sesuai PROMPT MASTER section Y
 */
function setupPengusulTableEvents(tbody) {
    if (!tbody) return;
    
    // Hapus listener lama jika ada untuk mencegah duplikasi
    tbody.removeEventListener('click', handlePengusulTableClick);
    
    // Tambah event delegation
    tbody.addEventListener('click', handlePengusulTableClick);
}

/**
 * Event Handler untuk Pengusul Table - Event Delegation
 * Menangani semua klik tombol CRUD di tabel submissions
 */
async function handlePengusulTableClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    
    const id = button.dataset.id;
    const action = button.dataset.action;
    
    if (!id) {
        console.error('[SIMBAKES] ID tidak ditemukan pada tombol');
        showToast('❌ Error: ID tidak ditemukan', 'error');
        return;
    }
    
    console.log(`[SIMBAKES CRUD] Action: ${action} | ID: ${id}`);
    
    // Disable tombol sementara proses (cegah double-click)
    button.disabled = true;
    button.style.opacity = '0.6';
    
    try {
        switch (action) {
            case 'view':
                await viewDetailPengusul(id);
                break;
            case 'edit':
                await openPengusulEditModal(id);
                break;
            case 'status':
                const currentStatus = button.dataset.status || '';
                await openStatusModal(id, currentStatus);
                break;
            case 'delete':
                const nama = button.dataset.nama || '';
                confirmDeletePengusul(id, nama);
                break;
            default:
                console.warn('[SIMBAKES] Unknown action:', action);
        }
    } catch (error) {
        console.error('[SIMBAKES] Error handling action:', error);
        showToast(`❌ Gagal: ${error.message}`, 'error', 5000);
    } finally {
        // Re-enable tombol
        button.disabled = false;
        button.style.opacity = '1';
    }
}

// Expose event handler functions
window.setupPengusulTableEvents = setupPengusulTableEvents;
window.handlePengusulTableClick = handlePengusulTableClick;

/**
 * Get styled status badge for table
 */
function getTableStatusBadge(status) {
    const statusLower = String(status).toLowerCase().trim();
    let className = 'status-verify';
    let icon = '⏳';
    
    if (statusLower.includes('disetujui') || statusLower.includes('approve')) {
        className = 'status-approved'; icon = '✅';
    } else if (statusLower.includes('ditolak') || statusLower.includes('reject')) {
        className = 'status-rejected'; icon = '❌';
    } else if (statusLower.includes('perbaikan') || statusLower.includes('revision')) {
        className = 'status-revision'; icon = '⚠️';
    } else if (statusLower.includes('batal') || statusLower.includes('cancel')) {
        className = 'status-cancelled'; icon = '🚫';
    }
    
    return `<span class="table-status-badge ${className}">${icon} ${status || 'Proses Verifikasi'}</span>`;
}

/**
 * Update pagination controls
 */
function updatePagination(pagination) {
    adminTotalPages = pagination.totalPages;
    adminTotalRecords = pagination.totalRecords;
    
    // Update info text
    const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.currentPage - 1) * adminPageSize + 1;
    const endRecord = Math.min(pagination.currentPage * adminPageSize, pagination.totalRecords);
    document.getElementById('pagination-showing').textContent = `${startRecord}-${endRecord}`;
    document.getElementById('pagination-total').textContent = pagination.totalRecords;
    
    // Update current page button
    document.getElementById('btn-current-page').textContent = pagination.currentPage;
    
    // Update navigation buttons
    document.getElementById('btn-first-page').disabled = !pagination.hasPrevPage;
    document.getElementById('btn-prev-page').disabled = !pagination.hasPrevPage;
    document.getElementById('btn-next-page').disabled = !pagination.hasNextPage;
    document.getElementById('btn-last-page').disabled = !pagination.hasNextPage;
}

/**
 * Update admin statistics bar - Fetch real stats from API
 */
async function updateAdminStats(pagination) {
    // Update total from pagination
    document.getElementById('stat-total-pengusul').textContent = pagination.totalRecords;
    
    // Fetch detailed stats for status breakdown
    try {
        const result = await getAllSubmissions(10000);
        
        if (result.status === 'success' && result.data) {
            const allData = result.data;
            document.getElementById('stat-approved-pengusul').textContent = 
                allData.filter(p => p.status === 'Disetujui').length;
            document.getElementById('stat-rejected-pengusul').textContent = 
                allData.filter(p => p.status === 'Ditolak').length;
            document.getElementById('stat-revision-pengusul').textContent = 
                allData.filter(p => p.status === 'Perbaikan').length;
            document.getElementById('stat-verify-pengusul').textContent = 
                allData.filter(p => p.status === 'Proses Verifikasi').length;
        }
    } catch (error) {
        console.warn('Could not fetch detailed stats:', error);
        // Keep showing at least the total
    }
}

// (moved to top of script)

/**
 * Filter data when select changes
 */
function filterDataPengusul() {
    adminCurrentPage = 1;
    fetchAdminData();
}

/**
 * Pagination navigation functions
 */
function goToPage(page) {
    if (page >= 1 && page <= adminTotalPages) {
        adminCurrentPage = page;
        fetchAdminData();
        // Scroll to top of table
        document.getElementById('admin-table-scroll').scrollTop = 0;
    }
}

function goToPrevPage() {
    goToPage(adminCurrentPage - 1);
}

function goToNextPage() {
    goToPage(adminCurrentPage + 1);
}

function goToLastPage() {
    goToPage(adminTotalPages);
}

function changePageSize() {
    adminPageSize = parseInt(document.getElementById('page-size-select').value);
    adminCurrentPage = 1;
    fetchAdminData();
}

/**
 * Refresh data pengusul
 */
function refreshDataPengusul() {
    // Reset filters
    document.getElementById('admin-search-input').value = '';
    document.getElementById('admin-status-filter').value = '';
    document.getElementById('admin-sort-by').value = 'timestamp';
    document.getElementById('admin-sort-order').value = 'desc';
    
    loadDataPengusul();
    showToast('🔄 Data berhasil di-refresh', 'success');
}

/**
 * View detail of a submission - FIXED: Get data by ID from Supabase
 */
async function viewDetailPengusul(id) {
    try {
        console.log('[SIMBAKES] Viewing detail for ID:', id);
        
        if (!id || id === 'undefined') {
            showToast('❌ ID tidak valid', 'error');
            return;
        }
        
        // Query data dari Supabase berdasarkan ID - gunakan .maybeSingle() untuk SELECT ⭐
        if (!supabaseClient) {
            throw new Error('Supabase client tidak tersedia');
        }
        
        const { data, error } = await supabaseClient
            .from('submissions')
            .select('*')
            .eq('id', id)
            .maybeSingle();  // Gunakan .maybeSingle() - boleh return null jika tidak ditemukan
        
        if (error) throw error;
        
        if (!data) {
            showToast('❌ Data tidak ditemukan', 'error');
            return;
        }
        
        console.log('[SIMBAKES] ✅ Data ditemukan:', data.no_register);
        
        // Format data untuk modal - gunakan snake_case dari Supabase
        const formattedData = {
            id: data.id,
            noRegister: data.no_register || '-',
            namaLengkap: data.nama_lengkap || '-',
            nik: data.nik || '-',
            tempatLahir: data.tempat_lahir || '-',
            tanggalLahir: data.tanggal_lahir || '-',
            alamatKTP: data.alamat_ktp || '-',
            alamatDomisili: data.alamat_domisili || '-',
            lamaDomisili: data.lama_domisili || '-',
            pekerjaan: data.pekerjaan || '-',
            posisi: data.posisi || '-',
            unitKerja: data.unit_kerja || '-',
            penjelasan: data.penjelasan || '-',
            jurusanTujuan: data.jurusan_tujuan || '-',
            jenjangPendidikan: data.jenjang_pendidikan || '-',
            unitTujuan: data.unit_tujuan || '-',
            rencanaTahun: data.rencana_tahun || '-',
            noHP: data.no_hp || '-',
            noWA: data.no_wa || '-',
            email: data.email || '-',
            namaFile: data.nama_file || '-',
            status: data.status || '-',
            created_at: data.created_at,
            foto: data.foto || null,
            dokumen_pdf: data.dokumen_pdf || null
        };
        
        showDetailModal(formattedData);
        
    } catch (error) {
        console.error('[SIMBAKES] Error viewing detail:', error);
        showToast('❌ Gagal memuat detail: ' + error.message, 'error');
    }
}

/**
 * Show detail modal for pengusul
 */
function showDetailModal(data) {
    const modalId = 'detail-pengusul-modal';
    
    // Check if modal exists, create if not
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content modal-large admin-detail-modal">
            <div class="modal-header-modal" style="background:linear-gradient(135deg,#1e293b,#334155);color:white;">
                <h3 style="display:flex;align-items:center;gap:0.75rem;">
                    📋 Detail Pengajuan
                    <span style="font-size:0.875rem;background:rgba(255,255,255,0.2);padding:0.25rem 0.75rem;border-radius:20px;">
                        ${data.noRegister}
                    </span>
                </h3>
                <button class="modal-close-btn" onclick="closeModal('${modalId}')">✕</button>
            </div>
            <div class="modal-body-modal" style="max-height:70vh;overflow-y:auto;">
                <!-- Photo & Basic Info -->
                <div style="display:flex;gap:1.5rem;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid #e2e8f0;">
                    <div style="flex-shrink:0;">
                        ${generatePhotoCell(data.linkFoto, data.namaLengkap || '', 'large')}
                    </div>
                    <div style="flex:1;">
                        <h2 style="font-size:1.5rem;margin-bottom:0.5rem;">${data.namaLengkap || '-'}</h2>
                        <p style="color:#64748b;margin-bottom:0.5rem;">NIK: <strong>${data.nik || '-'}</strong></p>
                        <div style="margin-top:auto;">
                            ${getTableStatusBadge(data.status)}
                        </div>
                    </div>
                </div>
                
                <!-- Detail Grid -->
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">No Register</div>
                        <div class="detail-value">${data.noRegister || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tanggal Pengajuan</div>
                        <div class="detail-value">${formatDate(data.tanggalPengajuan)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tempat, Tanggal Lahir</div>
                        <div class="detail-value">${data.tempatLahir || '-'}, ${formatDate(data.tanggalLahir)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Jenis Kelamin</div>
                        <div class="detail-value">-</div>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <div class="detail-label">Alamat KTP</div>
                        <div class="detail-value">${data.alamatKTP || '-'}</div>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <div class="detail-label">Alamat Domisili</div>
                        <div class="detail-value">${data.alamatDomisili || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Pekerjaan</div>
                        <div class="detail-value">${data.pekerjaan || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Posisi/Jabatan</div>
                        <div class="detail-value">${data.posisi || '-'}</div>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <div class="detail-label">Unit Kerja / Institusi Asal</div>
                        <div class="detail-value">${data.unitKerja || '-'}</div>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <div class="detail-label">Penjelasan / Narasi Singkat</div>
                        <div class="detail-value">${data.penjelasan || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Jurusan Tujuan</div>
                        <div class="detail-value">${data.jurusanTujuan || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Jenjang Pendidikan</div>
                        <div class="detail-value">${data.jenjangPendidikan || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Unit Tujuan Pemanfaatan</div>
                        <div class="detail-value">${data.unitTujuan || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Rencana Tahun Studi</div>
                        <div class="detail-value">${data.rencanaTahun || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">No HP</div>
                        <div class="detail-value">${data.noHP || '-'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">No WhatsApp</div>
                        <div class="detail-value">${data.noWA || '-'}</div>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <div class="detail-label">Email</div>
                        <div class="detail-value" style="color:#2563eb;">${data.email || '-'}</div>
                    </div>
                </div>
                
                <!-- File Links -->
                <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #e2e8f0;display:flex;gap:1rem;flex-wrap:wrap;">
                    ${data.linkFoto && data.linkFoto !== '-' 
                        ? `<a href="${data.linkFoto}" target="_blank" class="btn btn-sm" style="background:#dcfce7;color:#166534;">📷 Lihat Foto Pasfoto</a>`
                        : ''
                    }
                    ${data.linkDokumen && data.linkDokumen !== '-' 
                        ? `<a href="${data.linkDokumen}" target="_blank" class="btn btn-sm" style="background:#dbeafe;color:#1d4ed8;">📄 Lihat Dokumen PDF</a>`
                        : ''
                    }
                </div>
            </div>
        </div>
    `;
    
    // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
    console.log('[MODAL] ✅ Detail modal opened for:', data.noRegister);
}

/**
 * Open status update modal - FIXED: Use ID instead of rowNumber
 */
function openStatusModal(id, currentStatus) {
    const modalId = 'status-update-modal';
    
    // Simpan ID untuk digunakan saat submit
    window.currentStatusUpdateId = id;
    
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
        document.body.appendChild(modal);
    }
    
    const statuses = [
        { value: 'Proses Verifikasi', icon: '⏳', label: 'Proses Verifikasi', color: '#dbeafe' },
        { value: 'Disetujui', icon: '✅', label: 'Disetujui', color: '#dcfce7' },
        { value: 'Ditolak', icon: '❌', label: 'Ditolak', color: '#fee2e2' },
        { value: 'Perbaikan', icon: '⚠️', label: 'Perbaikan', color: '#fef3c7' },
        { value: 'Batal', icon: '🚫', label: 'Batal', color: '#f1f5f9' }
    ];
    
    const statusOptions = statuses.map(s => `
        <label class="status-option ${currentStatus === s.value ? 'selected' : ''}">
            <input type="radio" name="new-status" value="${s.value}" ${currentStatus === s.value ? 'checked' : ''}>
            <div class="status-option-icon">${s.icon}</div>
            <div class="status-option-label">${s.label}</div>
        </label>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#16a34a,#22c55e);color:white;">
                <h3 class="modal-title">✏️ Ubah Status Pengajuan</h3>
                <button class="modal-close" onclick="closeModal('${modalId}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="status-update-form">
                <p style="margin-bottom:1rem;color:#64748b;">
                    ID: <strong>${id ? id.substring(0, 8) + '...' : '-'}</strong> | Status saat ini: <strong>${currentStatus || '-'}</strong>
                </p>
                <label style="font-weight:600;display:block;margin-bottom:0.5rem;">Pilih Status Baru:</label>
                <div class="status-options">
                    ${statusOptions}
                </div>
                <div style="margin-top:1.5rem;display:flex;gap:0.75rem;justify-content:flex-end;">
                    <button class="btn" style="background:#f1f5f9;color:#475569;" onclick="closeModal('${modalId}')">Batal</button>
                    <button class="btn btn-primary" onclick="submitStatusUpdate()">💾 Simpan Perubahan</button>
                </div>
            </div>
        </div>
    `;
    
    // Add click handlers for status options
    setTimeout(() => {
        document.querySelectorAll('.status-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                this.querySelector('input').checked = true;
            });
        });
    }, 100);
    
    // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
    console.log('[MODAL] ✅ Status update modal opened for ID:', id);
}

/**
 * Submit status update to Supabase - FIXED: Use saved ID
 */
async function submitStatusUpdate() {
    try {
        const newStatus = document.querySelector('input[name="new-status"]:checked')?.value;
        const id = window.currentStatusUpdateId;
        
        if (!newStatus) {
            showToast('❌ Pilih status baru terlebih dahulu', 'error');
            return;
        }
        
        if (!id) {
            showToast('❌ ID tidak valid', 'error');
            return;
        }
        
        console.log('[SIMBAKES] Updating status for ID:', id, 'to:', newStatus);
        
        if (!supabaseClient) {
            throw new Error('Supabase client tidak tersedia');
        }
        
        // UPDATE status - TANPA .single() ⭐
        const { data: dataArray, error } = await supabaseClient
            .from('submissions')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*');  // TANPA .single()
        
        if (error) throw error;
        
        // Validasi hasil array
        if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
            throw new Error('Status update tidak menghasilkan data.');
        }
        
        const data = dataArray[0];  // Ambil dari array
        
        console.log('[SIMBAKES] ✅ Status updated:', data.status);
        
        closeModal('status-update-modal');
        showToast(`✅ Status berhasil diubah menjadi: ${newStatus}`, 'success');
        
        // Refresh table
        loadDataPengusul();
        
    } catch (error) {
        console.error('[SIMBAKES] Error updating status:', error);
        showToast(`❌ Gagal update status: ${error.message}`, 'error');
    }
}

/**
 * Open Add Modal for new Submission (Data Pengusulan)
 */
function openPengusulAddModal() {
    const modalId = 'pengusul-add-modal';
    
    // Create modal if not exists
    if (!document.getElementById(modalId)) {
        const modalHTML = `
            <div class="modal-overlay" id="${modalId}" onclick="if(event.target===this)closeModal('${modalId}')">
                <div class="modal-content" style="max-width:800px;">
                    <div class="modal-header" style="background:linear-gradient(135deg,#059669,#10b981);color:white;padding:1.25rem;">
                        <h3 class="modal-title">➕ Tambah Data Pengusulan Baru</h3>
                        <button class="modal-close" onclick="closeModal('${modalId}')">×</button>
                    </div>
                    <div class="modal-body" style="padding:1.5rem;max-height:70vh;overflow-y:auto;">
                        <form id="pengusul-add-form" onsubmit="return false;">
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
                                <div class="form-group">
                                    <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Nama Lengkap *</label>
                                    <input type="text" id="add-nama_lengkap" required placeholder="Nama sesuai KTP" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                </div>
                                <div class="form-group">
                                    <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">NIK *</label>
                                    <input type="text" id="add-nik" required maxlength="16" placeholder="16 digit NIK" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;font-family:monospace;">
                                </div>
                                <div class="form-group">
                                    <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Email *</label>
                                    <input type="email" id="add-email" required placeholder="email@contoh.com" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                </div>
                                <div class="form-group">
                                    <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">No. HP</label>
                                    <input type="text" id="add-no_hp" placeholder="08xxxxxxxxxx" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                </div>
                                <div class="form-group">
                                    <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Jurusan Tujuan *</label>
                                    <select id="add-jurusan_tujuan" required style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                        <option value="">Pilih Jurusan</option>
                                        <option value="Keperawatan">Keperawatan</option>
                                        <option value="Kebidanan">Kebidanan</option>
                                        <option value="Kesehatan Masyarakat">Kesehatan Masyarakat</option>
                                        <option value="Gizi">Gizi</option>
                                        <option value="Farmasi">Farmasi</option>
                                        <option value="Kedokteran">Kedokteran</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Jenjang Pendidikan</label>
                                    <select id="add-jenjang_pendidikan" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                        <option value="">Pilih Jenjang</option>
                                        <option value="D3">D3 (Diploma)</option>
                                        <option value="D4">D4 (Diploma Terapan)</option>
                                        <option value="S1">S1 (Sarjana)</option>
                                        <option value="S2">S2 (Magister)</option>
                                        <option value="Profesi">Profesi</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Status</label>
                                    <select id="add-status" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                        <option value="Proses Verifikasi">Proses Verifikasi</option>
                                        <option value="Disetujui">Disetujui</option>
                                        <option value="Ditolak">Ditolak</option>
                                        <option value="Perbaikan">Perbaikan</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Pekerjaan</label>
                                    <input type="text" id="add-pekerjaan" placeholder="Pekerjaan saat ini" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                </div>
                            </div>
                            <div class="form-group" style="margin-top:1rem;">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Alamat KTP</label>
                                <textarea id="add-alamat_ktp" rows="2" placeholder="Alamat sesuai KTP" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;resize:vertical;"></textarea>
                            </div>
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Unit Kerja / Penempatan</label>
                                <input type="text" id="add-unit_kerja" placeholder="Unit kerja tujuan" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer" style="padding:1rem;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:0.75rem;">
                        <button class="btn btn-sm" style="background:#f1f5f9;color:#475569;" onclick="closeModal('${modalId}')">Batal</button>
                        <button class="btn btn-sm" style="background:linear-gradient(135deg,#059669,#10b981);color:white;" onclick="saveNewPengusul('${modalId}')">
                            💾 Simpan Data
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Show modal
    document.getElementById(modalId).style.display = 'flex';
}

/**
 * Save new submission to Supabase
 */
async function saveNewPengusul(modalId) {
    // Collect form data
    const newData = {
        nama_lengkap: document.getElementById('add-nama_lengkap')?.value?.trim(),
        nik: document.getElementById('add-nik')?.value?.trim(),
        email: document.getElementById('add-email')?.value?.trim(),
        no_hp: document.getElementById('add-no_hp')?.value?.trim(),
        jurusan_tujuan: document.getElementById('add-jurusan_tujuan')?.value,
        jenjang_pendidikan: document.getElementById('add-jenjang_pendidikan')?.value,
        status: document.getElementById('add-status')?.value || 'Proses Verifikasi',
        pekerjaan: document.getElementById('add-pekerjaan')?.value?.trim(),
        alamat_ktp: document.getElementById('add-alamat_ktp')?.value?.trim(),
        unit_kerja: document.getElementById('add-unit_kerja')?.value?.trim()
    };
    
    // Validation
    if (!newData.nama_lengkap || !newData.nik || !newData.email || !newData.jurusan_tujuan) {
        showToast('⚠️ Mohon isi field yang wajib (*)', 'warning');
        return;
    }
    
    // Validate NIK length
    if (newData.nik.length !== 16 || !/^\d+$/.test(newData.nik)) {
        showToast('⚠️ NIK harus 16 digit angka', 'warning');
        return;
    }
    
    try {
        showToast('🔄 Menyimpan data...', 'info');
        
        // Insert to Supabase
        const { data, error } = await supabaseClient
            .from('submissions')
            .insert([{
                ...newData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select();
        
        if (error) throw error;
        
        console.log('✅ New submission created:', data);
        
        // Close modal
        closeModal(modalId);
        
        // Show success
        showToast('✅ Data pengusulan berhasil ditambahkan', 'success');
        
        // Refresh table
        loadDataPengusul();
        
    } catch (error) {
        console.error('❌ Error saving new pengusul:', error);
        showToast(`❌ Gagal menyimpan: ${error.message}`, 'error');
    }
}

/**
 * Confirm delete submission - FIXED: Use ID instead of rowNumber
 */
function confirmDeletePengusul(id, namaLengkap) {
    const modalId = 'delete-confirm-modal';
    
    // Simpan ID untuk digunakan saat konfirmasi hapus
    window.currentDeleteId = id;
    
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width:450px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#dc2626,#ef4444);color:white;">
                <h3 class="modal-title">🗑️ Konfirmasi Hapus Data</h3>
                <button class="modal-close" onclick="closeModal('${modalId}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div style="padding:1.5rem;">
                <div style="text-align:center;margin-bottom:1.5rem;">
                    <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                    <p style="font-weight:600;font-size:1.125rem;margin-bottom:0.5rem;">Apakah Anda yakin ingin menghapus data ini?</p>
                    <p style="color:#64748b;font-size:0.875rem;">Tindakan ini tidak dapat dibatalkan!</p>
                </div>
                <div style="background:#fef2f2;border:1px solid #fecaca;padding:1rem;border-radius:8px;margin-bottom:1.5rem;">
                    <p style="font-size:0.875rem;"><strong>Nama:</strong> ${namaLengkap || '-'}</p>
                    <p style="font-size:0.875rem;"><strong>ID:</strong> ${id ? id.substring(0, 8) + '...' : '-'}</p>
                </div>
                <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
                    <button class="btn" style="background:#f1f5f9;color:#475569;" onclick="closeModal('${modalId}')">Batal</button>
                    <button class="btn" style="background:#dc2626;color:white;" onclick="deletePengusul()">🗑️ Ya, Hapus</button>
                </div>
            </div>
        </div>
    `;
    
    // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
}

/**
 * Open Edit Modal for existing Submission (Data Pengusulan)
 * Fetches data from Supabase and populates form
 */
async function openPengusulEditModal(id) {
    try {
        console.log('[SIMBAKES] Opening edit modal for ID:', id);
        
        if (!id || id === 'undefined') {
            showToast('❌ ID tidak valid', 'error');
            return;
        }
        
        // Fetch data dari Supabase
        if (!supabaseClient) {
            throw new Error('Supabase client tidak tersedia');
        }
        
        // Fetch data dari Supabase - gunakan .maybeSingle() untuk SELECT ⭐
        const { data, error } = await supabaseClient
            .from('submissions')
            .select('*')
            .eq('id', id)
            .maybeSingle();  // Gunakan .maybeSingle() - boleh return null
        
        if (error) throw error;
        if (!data) {
            showToast('❌ Data tidak ditemukan', 'error');
            return;
        }
        
        const modalId = 'pengusul-edit-modal';
        
        // Create modal if not exists
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal-overlay';
            modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
            document.body.appendChild(modal);
        }
        
        // Populate form dengan data yang ada
        modal.innerHTML = `
            <div class="modal-content" style="max-width:900px;">
                <div class="modal-header" style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:white;padding:1.25rem;">
                    <h3 class="modal-title">✏️ Edit Data Pengusulan</h3>
                    <span style="font-size:0.875rem;background:rgba(255,255,255,0.2);padding:0.25rem 0.75rem;border-radius:20px;margin-left:auto;">${data.no_register || id.substring(0, 8)}</span>
                    <button class="modal-close" onclick="closeModal('${modalId}')">×</button>
                </div>
                <div class="modal-body" style="padding:1.5rem;max-height:70vh;overflow-y:auto;">
                    <form id="pengusul-edit-form" onsubmit="return false;">
                        <input type="hidden" id="edit-id" value="${data.id}">
                        
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
                            <!-- Data Pribadi -->
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Nama Lengkap *</label>
                                <input type="text" id="edit-nama_lengkap" required value="${escapeHtml(data.nama_lengkap || '')}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">NIK *</label>
                                <input type="text" id="edit-nik" required value="${escapeHtml(data.nik || '')}" maxlength="16" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;font-family:monospace;">
                            </div>
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Tempat Lahir</label>
                                <input type="text" id="edit-tempat_lahir" value="${escapeHtml(data.tempat_lahir || '')}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Tanggal Lahir</label>
                                <input type="date" id="edit-tanggal_lahir" value="${data.tanggal_lahir ? data.tanggal_lahir.split('T')[0] : ''}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            
                            <!-- Kontak -->
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">No HP</label>
                                <input type="tel" id="edit-no_hp" value="${escapeHtml(data.no_hp || '')}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">WhatsApp</label>
                                <input type="tel" id="edit-no_wa" value="${escapeHtml(data.no_wa || '')}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Email</label>
                                <input type="email" id="edit-email" value="${escapeHtml(data.email || '')}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            
                            <!-- Alamat -->
                            <div class="form-group" style="grid-column: span 2;">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Alamat KTP</label>
                                <textarea id="edit-alamat_ktp" rows="2" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;resize:vertical;">${escapeHtml(data.alamat_ktp || '')}</textarea>
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Alamat Domisili</label>
                                <textarea id="edit-alamat_domisili" rows="2" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;resize:vertical;">${escapeHtml(data.alamat_domisili || '')}</textarea>
                            </div>
                            
                            <!-- Pekerjaan -->
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Pekerjaan</label>
                                <input type="text" id="edit-pekerjaan" value="${escapeHtml(data.pekerjaan || '')}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Posisi/Jabatan</label>
                                <input type="text" id="edit-posisi" value="${escapeHtml(data.posisi || '')}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Unit Kerja / Institusi</label>
                                <input type="text" id="edit-unit_kerja" value="${escapeHtml(data.unit_kerja || '')}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            
                            <!-- Pendidikan -->
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Jurusan Tujuan *</label>
                                <select id="edit-jurusan_tujuan" required style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                    <option value="">Pilih Jurusan</option>
                                    <option value="Keperawatan" ${data.jurusan_tujuan === 'Keperawatan' ? 'selected' : ''}>Keperawatan</option>
                                    <option value="Kebidanan" ${data.jurusan_tujuan === 'Kebidanan' ? 'selected' : ''}>Kebidanan</option>
                                    <option value="Kesehatan Masyarakat" ${data.jurusan_tujuan === 'Kesehatan Masyarakat' ? 'selected' : ''}>Kesehatan Masyarakat</option>
                                    <option value="Gizi" ${data.jurusan_tujuan === 'Gizi' ? 'selected' : ''}>Gizi</option>
                                    <option value="Kesehatan Lingkungan" ${data.jurusan_tujuan === 'Kesehatan Lingkungan' ? 'selected' : ''}>Kesehatan Lingkungan</option>
                                    <option value="Epidemiologi" ${data.jurusan_tujuan === 'Epidemiologi' ? 'selected' : ''}>Epidemiologi</option>
                                    <option value="Lainnya" ${data.jurusan_tujuan === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Jenjang Pendidikan</label>
                                <select id="edit-jenjang_pendidikan" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                    <option value="">Pilih Jenjang</option>
                                    <option value="D3" ${data.jenjang_pendidikan === 'D3' ? 'selected' : ''}>Diploma (D3)</option>
                                    <option value="D4" ${data.jenjang_pendidikan === 'D4' ? 'selected' : ''}>Diploma (D4)</option>
                                    <option value="S1" ${data.jenjang_pendidikan === 'S1' ? 'selected' : ''}>Sarjana (S1)</option>
                                    <option value="S2" ${data.jenjang_pendidikan === 'S2' ? 'selected' : ''}>Magister (S2)</option>
                                    <option value="S3" ${data.jenjang_pendidikan === 'S3' ? 'selected' : ''}>Doktor (S3)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Unit Tujuan</label>
                                <input type="text" id="edit-unit_tujuan" value="${escapeHtml(data.unit_tujuan || '')}" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            <div class="form-group">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Rencana Tahun Studi</label>
                                <input type="number" id="edit-rencana_tahun" value="${data.rencana_tahun || ''}" min="2024" max="2030" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                            </div>
                            
                            <!-- Status -->
                            <div class="form-group" style="grid-column: span 2;">
                                <label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Status</label>
                                <select id="edit-status" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;">
                                    <option value="Proses Verifikasi" ${(data.status || '').includes('Verifikasi') ? 'selected' : ''}>Proses Verifikasi</option>
                                    <option value="Disetujui" ${(data.status || '').includes('Setujui') ? 'selected' : ''}>Disetujui</option>
                                    <option value="Ditolak" ${(data.status || '').includes('Tolak') ? 'selected' : ''}>Ditolak</option>
                                    <option value="Perlu Perbaikan" ${(data.status || '').includes('Perbaikan') ? 'selected' : ''}>Perlu Perbaikan</option>
                                    <option value="Dibatalkan" ${(data.status || '').includes('Batal') ? 'selected' : ''}>Dibatalkan</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5e7eb;">
                            <button type="button" class="btn" style="background:#f1f5f9;color:#475569;" onclick="closeModal('${modalId}')">Batal</button>
                            <button type="button" class="btn" style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:white;" onclick="savePengusulEdit('${modalId}')">💾 Simpan Perubahan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
        console.log('[SIMBAKES] ✅ Edit modal opened for:', data.nama_lengkap);
        
    } catch (error) {
        console.error('[SIMBAKES] Error opening edit modal:', error);
        showToast('❌ Gagal membuka edit: ' + error.message, 'error');
    }
}

/**
 * Save edited submission data to Supabase
 */
async function savePengusulEdit(modalId) {
    try {
        const id = document.getElementById('edit-id').value;
        
        if (!id) {
            showToast('❌ ID tidak valid', 'error');
            return;
        }
        
        // Collect form data
        const updateData = {
            nama_lengkap: document.getElementById('edit-nama_lengkap').value.trim(),
            nik: document.getElementById('edit-nik').value.trim(),
            tempat_lahir: document.getElementById('edit-tempat_lahir').value.trim(),
            tanggal_lahir: document.getElementById('edit-tanggal_lahir').value,
            no_hp: document.getElementById('edit-no_hp').value.trim(),
            no_wa: document.getElementById('edit-no_wa').value.trim(),
            email: document.getElementById('edit-email').value.trim(),
            alamat_ktp: document.getElementById('edit-alamat_ktp').value.trim(),
            alamat_domisili: document.getElementById('edit-alamat_domisili').value.trim(),
            pekerjaan: document.getElementById('edit-pekerjaan').value.trim(),
            posisi: document.getElementById('edit-posisi').value.trim(),
            unit_kerja: document.getElementById('edit-unit_kerja').value.trim(),
            jurusan_tujuan: document.getElementById('edit-jurusan_tujuan').value,
            jenjang_pendidikan: document.getElementById('edit-jenjang_pendidikan').value,
            unit_tujuan: document.getElementById('edit-unit_tujuan').value.trim(),
            rencana_tahun: parseInt(document.getElementById('edit-rencana_tahun').value) || null,
            status: document.getElementById('edit-status').value,
            updated_at: new Date().toISOString()
        };
        
        // Validation
        if (!updateData.nama_lengkap || !updateData.nik) {
            showToast('❌ Nama Lengkap dan NIK wajib diisi!', 'error');
            return;
        }
        
        console.log('[SIMBAKES] Saving edit for ID:', id);
        
        // Update ke Supabase
        const { error } = await supabaseClient
            .from('submissions')
            .update(updateData)
            .eq('id', id);
        
        if (error) throw error;
        
        console.log('[SIMBAKES] ✅ Data updated successfully');
        
        showToast(`✅ Data ${updateData.nama_lengkap} berhasil diperbarui!`, 'success');
        closeModal(modalId);
        
        // Refresh table
        loadDataPengusul();
        
    } catch (error) {
        console.error('[SIMBAKES] Error saving edit:', error);
        showToast('❌ Gagal menyimpan: ' + error.message, 'error', 5000);
    }
}

/**
 * Delete submission - FIXED: Use saved ID from window.currentDeleteId
 */
async function deletePengusul() {
    try {
        const id = window.currentDeleteId;
        
        if (!id) {
            showToast('❌ ID tidak valid', 'error');
            return;
        }
        
        console.log('[SIMBAKES] Deleting submission with ID:', id);
        
        if (!supabaseClient) {
            throw new Error('Supabase client tidak tersedia');
        }
        
        // Delete from Supabase
        const { error } = await supabaseClient
            .from('submissions')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        console.log('[SIMBAKES] ✅ Data deleted successfully');
        
        showToast(`✅ Data berhasil dihapus`, 'success');
        closeModal('delete-confirm-modal');
        
        // Refresh table
        loadDataPengusul();
        
    } catch (error) {
        console.error('[SIMBAKES] Error deleting submission:', error);
        showToast(`❌ Gagal menghapus: ${error.message}`, 'error', 5000);
    }
}

/**

/**
 * Export data to CSV
 */
function exportDataPengusul() {
    showToast('📥 Mempersiapkan export data...', 'info');
    
    // Create CSV content
    const headers = ['No Register', 'Tanggal', 'NIK', 'Nama Lengkap', 'Jurusan', 'Jenjang', 'Unit Tujuan', 'Status'];
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += headers.join(',') + '\n';
    
    // Get visible rows from table
    const rows = document.querySelectorAll('#pengusul-table-body tr[data-row-number]');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 23) {
            const rowData = [
                cells[3].textContent, // No Register
                cells[22].textContent, // Tgl Pengajuan
                cells[4].textContent, // NIK
                cells[5].textContent, // Nama
                cells[15].textContent, // Jurusan
                cells[16].textContent, // Jenjang
                cells[17].textContent, // Unit
                cells[22].textContent  // Status
            ];
            csvContent += rowData.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',') + '\n';
        }
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SIMBAKES_DataPengusul_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    showToast('✅ Data berhasil di-export!', 'success');
}

/**
 * Format date time for display
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/"/g, '&quot;');
}

/**
 * Add row click handler for lightbox functionality
 * Membuat baris tabel bisa diklik untuk menampilkan detail (lightbox)
 */
function addRowClickHandlers(tbodyId, viewFunction) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr[data-id], tr[data-row-index]');
    
    rows.forEach(row => {
        // Tambahkan class clickable
        row.classList.add('clickable-row');
        row.style.cursor = 'pointer';
        
        // Hapus event listener lama jika ada (untuk mencegah duplikasi)
        row.removeEventListener('click', handleRowClick);
        
        // Tambahkan event listener baru
        row.addEventListener('click', handleRowClick);
    });
    
    function handleRowClick(e) {
        // Jangan trigger jika klik di tombol CRUD
        if (e.target.closest('.btn-crud') || e.target.closest('.btn-action')) {
            return;
        }
        
        const row = e.currentTarget;
        const id = row.dataset.id || row.dataset.rowIndex;
        
        if (id && typeof viewFunction === 'function') {
            viewFunction(id);
        }
    }
}

// Expose functions to global scope
window.openPengusulEditModal = openPengusulEditModal;
window.savePengusulEdit = savePengusulEdit;
window.addRowClickHandlers = addRowClickHandlers;

// Note: originalShowPage already declared above (line ~9381) for Data Penetapan admin module
// No need to redeclare here - using event listener approach instead

// ============================================================
// PAGE ACCESS PROTECTION NOTES
// Proteksi halaman admin SUDAH TERINTEGRASI di dalam fungsi showPage() utama
// - Menggunakan sistem RBAC: isAdminAuthenticated(), hasPermission()
// - Hanya data-pengusul & data-roadmap yang diproteksi
// - Menu lain (Dashboard, Form, dll) BEBAS akses tanpa login




