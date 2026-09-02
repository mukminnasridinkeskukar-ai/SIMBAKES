// ===== LEGACY RENDER FUNCTIONS (kept for compatibility) =====
function renderDashboard_legacy() {
    document.getElementById('stat-total').textContent = pengusulData.length;
    document.getElementById('stat-disetujui').textContent = pengusulData.filter(p => p.status === 'Disetujui').length;
    document.getElementById('stat-verifikasi').textContent = pengusulData.filter(p => p.status === 'Proses Verifikasi').length;
    document.getElementById('stat-ditolak').textContent = pengusulData.filter(p => p.status === 'Ditolak' || p.status === 'Perbaikan').length;
    
    const tbody = document.getElementById('dashboard-table-body');
    tbody.innerHTML = pengusulData.slice(0, 5).map(p => `
        <tr>
            <td><strong>${p.nama}</strong></td>
            <td>${p.institusi}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>${p.tanggalPengajuan}</td>
        </tr>
    `).join('');
}

// ===== ROADMAP KEBUTUHAN FUNCTIONS v2.0 =====

function renderRoadmap() {
    // Load roadmap data from API when page is shown
    loadRoadmapData();
}

/**
 * Main function: Load Roadmap Data from Supabase
 * Public Roadmap Page - Menggunakan Supabase client
 * ENHANCED: Multiple fallback strategies + detailed debugging
 */
async function loadRoadmapData() {
    const loadingEl = document.getElementById('roadmap-loading');
    const tableWrapperEl = document.getElementById('roadmap-table-wrapper');
    const emptyStateEl = document.getElementById('roadmap-empty-state');
    
    // Safety check - pastikan elemen ada
    if (!loadingEl || !tableWrapperEl || !emptyStateEl) {
        console.error('❌ Elemen Roadmap tidak ditemukan di DOM!');
        return;
    }
    
    // Show loading
    loadingEl.style.display = 'block';
    tableWrapperEl.style.display = 'none';
    emptyStateEl.style.display = 'none';
    
    console.log('🔄 Loading Roadmap Kebutuhan data dari Supabase...');
    console.log('[DEBUG] Supabase client status:', supabaseClient ? '✅ Connected' : '❌ Not initialized');
    
    try {
        // Cek Supabase client
        if (!supabaseClient) {
            throw new Error('Supabase client belum terinisialisasi. Pastikan koneksi internet stabil.');
        }
        
        // Get filter values dengan safety check
        const jurusanSelect = document.getElementById('roadmap-filter-jurusan');
        const ptSelect = document.getElementById('roadmap-filter-pt');
        const pekerjaanSelect = document.getElementById('roadmap-filter-pekerjaan');
        const unitSelect = document.getElementById('roadmap-filter-unit');
        const statusSelect = document.getElementById('roadmap-filter-status');
        
        // Build query - start with base query to roadmap table
        let query = supabaseClient
            .from('roadmap')
            .select('*', { count: 'exact' });
        
        console.log('[DEBUG] Base query created for table: roadmap');
        
        // Apply filters if values exist (Supabase filters)
        if (jurusanSelect && jurusanSelect.value) {
            query = query.ilike('jurusan', `%${jurusanSelect.value}%`);
            console.log('[DEBUG] Filter jurusan:', jurusanSelect.value);
        }
        if (ptSelect && ptSelect.value) {
            query = query.ilike('perguruan_tinggi', `%${ptSelect.value}%`);
            console.log('[DEBUG] Filter PT:', ptSelect.value);
        }
        if (pekerjaanSelect && pekerjaanSelect.value) {
            query = query.eq('pekerjaan', pekerjaanSelect.value);
            console.log('[DEBUG] Filter pekerjaan:', pekerjaanSelect.value);
        }
        if (unitSelect && unitSelect.value) {
            query = query.ilike('unit_pendayaguna', `%${unitSelect.value}%`);
            console.log('[DEBUG] Filter unit:', unitSelect.value);
        }
        if (statusSelect && statusSelect.value) {
            query = query.eq('status', statusSelect.value);
            console.log('[DEBUG] Filter status:', statusSelect.value);
        }
        
        // Order by tahun dan jurusan
        query = query.order('tahun_studi', { ascending: true })
                   .order('jurusan', { ascending: true });
        
        console.log('[DEBUG] Executing query...');
        console.time('roadmap-query');
        
        // Execute query with MULTIPLE FALLBACK STRATEGIES
        let data = null;
        let error = null;
        let count = null;
        
        // STRATEGY 1: Original query with count
        try {
            const result = await query;
            data = result.data;
            error = result.error;
            count = result.count;
            console.log('[DEBUG] Strategy 1 (with count) completed');
        } catch(e) {
            console.warn('[DEBUG] Strategy 1 failed:', e.message);
        }
        
        // STRATEGY 2: If error, try without count option
        if(error && !data) {
            console.log('[DEBUG] Trying Strategy 2 (without count)...');
            try {
                const result2 = await supabaseClient
                    .from('roadmap')
                    .select('*')
                    .order('tahun_studi', { ascending: true })
                    .order('jurusan', { ascending: true });
                
                if(!result2.error && result2.data) {
                    data = result2.data;
                    error = null;
                    count = result2.data.length;
                    console.log('[DEBUG] Strategy 2 SUCCESS!');
                } else {
                    error = result2.error;
                }
            } catch(e2) {
                console.warn('[DEBUG] Strategy 2 also failed:', e2.message);
            }
        }
        
        // STRATEGY 3: If still error, try simplest possible query
        if(error && !data) {
            console.log('[DEBUG] Trying Strategy 3 (simplest query)...');
            try {
                const result3 = await supabaseClient
                    .from('roadmap')
                    .select('*')
                    .limit(100); // Get up to 100 records
                
                if(!result3.error && result3.data) {
                    data = result3.data;
                    error = null;
                    count = result3.data.length;
                    console.log('[DEBUG] Strategy 3 SUCCESS!');
                } else {
                    error = result3.error;
                }
            } catch(e3) {
                console.warn('[DEBUG] Strategy 3 also failed:', e3.message);
            }
        }
        
        console.timeEnd('roadmap-query');
        
        // Log the FINAL result
        console.log('[DEBUG] === FINAL QUERY RESULT ===');
        console.log('[DEBUG] Data:', data);
        console.log('[DEBUG] Error:', error);
        console.log('[DEBUG] Count:', count);
        
        if (error) {
            console.error('[DEBUG] Query error details:', {
                code: error.code,
                message: error.message,
                hint: error.hint,
                details: error.details,
                status: error.status
            });
            
            // SPECIAL HANDLING for RLS errors
            if(error.status === 401 || error.code === 'PGRST301' || error.message?.includes('permission')) {
                console.error('🔴 RLS ERROR DETECTED! Anon role cannot access roadmap table.');
                alert('⚠️ ERROR RLS (Row Level Security)\n\nTabel roadmap tidak bisa diakses oleh anon role.\n\nSolusi: Jalankan SQL berikut di Supabase SQL Editor:\n\nCREATE POLICY "Enable public read access" ON public.roadmap FOR SELECT USING (true);');
            }
            
            throw error;
        }
        
        console.log(`✅ Berhasil mengambil ${data?.length || 0} data roadmap (count: ${count})`);
        
        if (data && data.length > 0) {
            console.log('[DEBUG] Sample data (first row):', data[0]);
            console.log('[DEBUG] Available fields:', Object.keys(data[0]));
        } else {
            console.warn('[DEBUG] Data kosong - cek apakah tabel memiliki data di Supabase dashboard');
            console.warn('[DEBUG] Ini aneh karena user bilang data sudah ada di Supabase!');
        }
        
        // Hide loading
        loadingEl.style.display = 'none';
        
        // Cache data for filtering
        roadmapCachedData = data || [];
        
        // Build filter options from data (if not yet populated)
        if (!roadmapFilterOptions && data && data.length > 0) {
            roadmapFilterOptions = {
                jurusan: [...new Set(data.map(d => d.jurusan).filter(Boolean))].sort(),
                perguruanTinggi: [...new Set(data.map(d => d.perguruan_tinggi).filter(Boolean))].sort(),
                pekerjaan: [...new Set(data.map(d => d.pekerjaan).filter(Boolean))],
                unitPendayaguna: [...new Set(data.map(d => d.unit_pendayaguna).filter(Boolean))].sort(),
                // Status options dari data aktual, bukan hardcoded
                status: [...new Set(data.map(d => d.status).filter(Boolean))].sort()
            };
            console.log('[DEBUG] Filter options built:', roadmapFilterOptions);
            populateRoadmapFilterDropdowns(roadmapFilterOptions);
        }
        
        // Render table or show empty state
        if (data && data.length > 0) {
            tableWrapperEl.style.display = 'block';
            emptyStateEl.style.display = 'none';
            renderRoadmapTablePublic(data);
            updateRoadmapResultCount(count || data.length);
            showToast(`✅ Berhasil memuat ${data.length} data roadmap`, 'success');
        } else {
            tableWrapperEl.style.display = 'none';
            emptyStateEl.style.display = 'block';
            updateRoadmapResultCount(0);
            console.warn('[DEBUG] Menampilkan empty state - tidak ada data');
        }
        
    } catch (error) {
        console.error('❌ Error loading roadmap data:', error);
        console.error('[DEBUG] Full error object:', JSON.stringify(error, null, 2));
        loadingEl.style.display = 'none';
        emptyStateEl.style.display = 'block';
        
        const titleEl = document.getElementById('roadmap-empty-state').querySelector('h3');
        const descEl = document.getElementById('roadmap-empty-state').querySelector('p');
        if (titleEl) titleEl.textContent = 'Gagal Memuat Data';
        if (descEl) descEl.textContent = error.message || 'Terjadi kesalahan saat memuat data. Silakan coba lagi.';
        
        showToast('❌ Gagal memuat data roadmap: ' + error.message, 'error');
    }
}

/**
 * Populate filter dropdowns with unique values from API
 */
function populateRoadmapFilterDropdowns(options) {
    // Populate Jurusan
    const jurusanSelect = document.getElementById('roadmap-filter-jurusan');
    options.jurusan.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        jurusanSelect.appendChild(opt);
    });
    
    // Populate Perguruan Tinggi
    const ptSelect = document.getElementById('roadmap-filter-pt');
    options.perguruanTinggi.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        ptSelect.appendChild(opt);
    });
    
    // Populate Pekerjaan
    const pekerjaanSelect = document.getElementById('roadmap-filter-pekerjaan');
    options.pekerjaan.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        pekerjaanSelect.appendChild(opt);
    });
    
    // Populate Unit Pendayaguna
    const unitSelect = document.getElementById('roadmap-filter-unit');
    options.unitPendayaguna.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        unitSelect.appendChild(opt);
    });
    
    // Populate Status (already has default options, just add dynamic ones)
    const statusSelect = document.getElementById('roadmap-filter-status');
    options.status.forEach(val => {
        // Check if option already exists
        if (!Array.from(statusSelect.options).some(opt => opt.value === val)) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = getRoadmapStatusIcon(val) + ' ' + val;
            statusSelect.appendChild(opt);
        }
    });
}

/**
 * Get status icon/emoji for Roadmap status
 */
function getRoadmapStatusIcon(status) {
    const s = String(status).toLowerCase().trim();
    if (s.includes('aktif')) return '✅';
    if (s.includes('perencanaan')) return '📋';
    if (s.includes('draft')) return '📝';
    if (s.includes('selesai')) return '🎉';
    if (s.includes('ditunda')) return '⏸️';
    if (s.includes('dibatalkan')) return '❌';
    return '📊';
}

/**
 * Apply filters and reload data
 */
function applyRoadmapFilters() {
    loadRoadmapData();
}

/**
 * Reset all filters to default
 */
function resetRoadmapFilters() {
    document.getElementById('roadmap-filter-jurusan').value = '';
    document.getElementById('roadmap-filter-pt').value = '';
    document.getElementById('roadmap-filter-pekerjaan').value = '';
    document.getElementById('roadmap-filter-unit').value = '';
    document.getElementById('roadmap-filter-status').value = '';
    
    // Reset pagination when resetting filters
    PaginationManager.reset('roadmap');
    
    // Reload data without filters
    loadRoadmapData();
}

/**
 * Update result count display
 */
function updateRoadmapResultCount(count) {
    const countEl = document.getElementById('roadmap-result-count');
    countEl.textContent = `Menampilkan ${count} data`;
}

/**
 * Render Public Roadmap Table with colorful rows [WITH PAGINATION]
 * Updated: Display all 12 data fields (no Kode column) matching new schema
 */
function renderRoadmapTablePublic(data) {
    const tbody = document.getElementById('roadmap-table-body');
    const container = document.getElementById('pagination-roadmap-container');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align:center;padding:2rem;color:#64748b;">
                    📭 Tidak ada data roadmap
                </td>
            </tr>
        `;
        container.innerHTML = '';
        return;
    }
    
    // Use PaginationManager
    const paginatedResult = PaginationManager.paginate('roadmap', data);
    
    let html = '';
    paginatedResult.data.forEach((row, index) => {
        // Determine row colors based on index (alternating gradient effect)
        const rowBgColors = [
            'background:linear-gradient(135deg,#faf5ff 0%,#f3e8ff 100%);',
            'background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);',
            'background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);',
            'background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);'
        ];
        const bgStyle = rowBgColors[index % rowBgColors.length];
        
        // Status badge styling
        const statusBadge = getRoadmapStatusBadge(row.status);
        
        html += `
            <tr style="${bgStyle} border:none; transition:all 0.2s;" 
                onmouseover="this.style.transform='scale(1.01)';this.style.boxShadow='0 4px 15px rgba(102,126,234,0.2)';"
                onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none';">
                <!-- 1. Jurusan -->
                <td style="vertical-align:middle;">
                    <div style="font-weight:600;color:#5b21b6;">${row.jurusan || '-'}</div>
                </td>
                
                <!-- 2. Kualifikasi Awal -->
                <td style="vertical-align:middle;">
                    <span style="padding:0.25rem 0.6rem;background:#ede9fe;color:#5b21b6;border-radius:6px;font-size:0.8rem;font-weight:500;">
                        ${row.kualifikasi_awal || '-'}
                    </span>
                </td>
                
                <!-- 3. Jenis Pendidikan -->
                <td style="vertical-align:middle;">
                    <div style="color:#6d28d9;font-weight:500;">${row.jenis_pendidikan || '-'}</div>
                </td>
                
                <!-- 4. Perguruan Tinggi -->
                <td style="vertical-align:middle;">
                    <div style="color:#374151;font-weight:500;">${row.perguruan_tinggi || '-'}</div>
                </td>
                
                <!-- 5. Pekerjaan -->
                <td style="vertical-align:middle;">
                    <span style="padding:0.25rem 0.6rem;background:#dbeafe;color:#1e40af;border-radius:6px;font-size:0.8rem;font-weight:500;">
                        ${row.pekerjaan || '-'}
                    </span>
                </td>
                
                <!-- 6. Tahun Studi -->
                <td style="text-align:center;vertical-align:middle;">
                    <span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.35rem 0.75rem;background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;border-radius:8px;font-size:0.9rem;font-weight:700;">
                        📅 ${row.tahun_studi || '-'}
                    </span>
                </td>
                
                <!-- 7. Jumlah Kuota -->
                <td style="text-align:center;vertical-align:middle;">
                    <span style="display:inline-block;padding:0.35rem 0.75rem;background:#dbeafe;color:#1e40af;border-radius:8px;font-size:0.85rem;font-weight:700;">
                        🔢 ${row.jumlah_kuota || 0}
                    </span>
                </td>
                
                <!-- 8. Kuota Terisi -->
                <td style="text-align:center;vertical-align:middle;">
                    <span style="display:inline-block;padding:0.35rem 0.75rem;background:#dcfce7;color:#166534;border-radius:8px;font-size:0.85rem;font-weight:700;">
                        ✅ ${row.kuota_terisi || 0}
                    </span>
                </td>
                
                <!-- 9. Sisa Kuota (Generated Column) -->
                <td style="text-align:center;vertical-align:middle;">
                    <span style="display:inline-block;padding:0.35rem 0.75rem;background:${(row.sisa_kuota || 0) > 0 ? '#fef3c7' : '#fee2e2'};color:${(row.sisa_kuota || 0) > 0 ? '#92400e' : '#991b1b'};border-radius:8px;font-size:0.85rem;font-weight:700;">
                        📋 ${row.sisa_kuota !== undefined ? row.sisa_kuota : (row.jumlah_kuota || 0) - (row.kuota_terisi || 0)}
                    </span>
                </td>
                
                <!-- 10. Unit Pendayaguna -->
                <td style="vertical-align:middle;">
                    <div style="color:#047857;font-weight:500;">${row.unit_pendayaguna || '-'}</div>
                </td>
                
                <!-- 11. Status -->
                <td style="text-align:center;vertical-align:middle;">
                    ${statusBadge}
                </td>
                
                <!-- 12. Nama Penerima -->
                <td style="vertical-align:middle;">
                    <span style="font-size:0.85rem;color:#374151;">${row.nama_penerima || '-'}</span>
                </td>
                
                <!-- 13. Aksi Column -->
                <td style="text-align:center;vertical-align:middle;">
                    <button onclick="viewRoadmapDetailPublic('${row.id}')" style="padding:0.4rem 0.8rem;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        👁️ Detail
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // Render pagination controls
    container.innerHTML = PaginationManager.renderControls('roadmap');
}

/**
 * View Roadmap Detail (Public Page)
 * Menampilkan modal detail untuk data roadmap yang dipilih
 */
function viewRoadmapDetailPublic(id) {
    // Cari data dari cached data
    const row = roadmapCachedData?.find(r => r.id === id);
    if (!row) {
        showToast('❌ Data tidak ditemukan', 'error');
        console.error('Roadmap data not found for ID:', id);
        return;
    }
    
    // Tampilkan detail menggunakan alert atau modal sederhana
    const detailHtml = `
        <div style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:1rem;border-radius:12px 12px 0 0;">
            <h3 style="margin:0;font-size:1.25rem;">🗺️ Detail Roadmap - ${row.jurusan}</h3>
        </div>
        <div style="padding:1.5rem;background:white;border-radius:0 0 12px 12px;">
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;font-size:0.9rem;">
                <div><strong>Kualifikasi Awal:</strong><br>${row.kualifikasi_awal || '-'}</div>
                <div><strong>Jenis Pendidikan:</strong><br>${row.jenis_pendidikan || '-'}</div>
                <div><strong>Perguruan Tinggi:</strong><br>${row.perguruan_tinggi || '-'}</div>
                <div><strong>Pekerjaan:</strong><br>${row.pekerjaan || '-'}</div>
                <div><strong>Tahun Studi:</strong><br>${row.tahun_studi || '-'}</div>
                <div><strong>Jumlah Kuota:</strong><br>${row.jumlah_kuota || 0}</div>
                <div><strong>Kuota Terisi:</strong><br>${row.kuota_terisi || 0}</div>
                <div><strong>Sisa Kuota:</strong><br>${row.sisa_kuota !== undefined ? row.sisa_kuota : (row.jumlah_kuota || 0) - (row.kuota_terisi || 0)}</div>
                <div style="grid-column:span 2;"><strong>Unit Pendayaguna:</strong><br>${row.unit_pendayaguna || '-'}</div>
                <div><strong>Status:</strong><br>${getRoadmapStatusBadge(row.status)}</div>
                <div style="grid-column:span 2;"><strong>Nama Penerima:</strong><br>${row.nama_penerima || '-'}</div>
            </div>
            <div style="margin-top:1rem;text-align:right;">
                <button onclick="this.closest('.swal2-container')?.remove() || this.closest('.modal-overlay')?.classList.remove('active')" style="padding:0.5rem 1.5rem;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.9rem;">✓ Tutup</button>
            </div>
        </div>
    `;
    
    // Cek jika ada library SweetAlert, gunakan itu
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            html: detailHtml,
            width: '600px',
            showConfirmButton: false,
            background: '#f8fafc'
        });
    } else {
        // Fallback ke custom modal
        let modal = document.getElementById('roadmap-detail-public-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'roadmap-detail-public-modal';
            modal.className = 'modal-overlay';
            modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
            document.body.appendChild(modal);
        }
        modal.innerHTML = `<div class="modal-content" style="max-width:600px;">${detailHtml}</div>`;
        // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
    }
}

/**
 * Get styled status badge for Roadmap
 */
function getRoadmapStatusBadge(status) {
    const statusLower = String(status).toLowerCase().trim();
    let bgColor, textColor, icon, text;
    
    if (statusLower.includes('aktif')) {
        bgColor = 'linear-gradient(135deg,#dcfce7,#bbf7d0)';
        textColor = '#166534';
        icon = '✅';
        text = status || 'Aktif';
    } else if (statusLower.includes('perencanaan')) {
        bgColor = 'linear-gradient(135deg,#dbeafe,#bfdbfe)';
        textColor = '#1e40af';
        icon = '📋';
        text = status || 'Perencanaan';
    } else if (statusLower.includes('draft')) {
        bgColor = 'linear-gradient(135deg,#fef3c7,#fde68a)';
        textColor = '#92400e';
        icon = '📝';
        text = status || 'Draft';
    } else if (statusLower.includes('selesai')) {
        bgColor = 'linear-gradient(135deg,#d1fae5,#a7f3d0)';
        textColor = '#065f46';
        icon = '🎉';
        text = status || 'Selesai';
    } else if (statusLower.includes('ditunda')) {
        bgColor = 'linear-gradient(135deg,#fed7aa,#fdba74)';
        textColor = '#9a3412';
        icon = '⏸️';
        text = status || 'Ditunda';
    } else if (statusLower.includes('dibatalkan') || statusLower.includes('batal')) {
        bgColor = 'linear-gradient(135deg,#fee2e2,#fecaca)';
        textColor = '#991b1b';
        icon = '❌';
        text = status || 'Dibatalkan';
    } else {
        bgColor = 'linear-gradient(135deg,#f3f4f6,#e5e7eb)';
        textColor = '#374151';
        icon = '📊';
        text = status || 'Unknown';
    }
    
    return `<span style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;background:${bgColor};color:${textColor};border-radius:20px;font-size:0.85rem;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        ${icon} ${text}
    </span>`;
}

function renderPengusulTable() {
    const tbody = document.getElementById('pengusul-table-body');
    tbody.innerHTML = pengusulData.map(p => `
        <tr>
            <td><strong>${p.noRegister || '-'}</strong></td>
            <td>${p.nama}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>${p.tanggalPengajuan}</td>
        </tr>
    `).join('');
}

// ===== DATA ROADMAP ADMIN FUNCTIONS v3.0 =====

/**
 * PERMISSION GUARD: Cek akses sebelum operasi Roadmap
 * Mencegah operator mengakses via console/URL langsung
 */
function checkRoadmapPermission() {
    console.log('=== ROADMAP PERMISSION CHECK ===');
    
    // Jika tidak login, tolak
    if (!isAdminAuthenticated()) {
        console.warn('[ROADMAP] ❌ Not authenticated');
        showToast('🔐 Silakan login terlebih dahulu', 'error', 3000);
        return false;
    }
    
    // Jika role operator, tolak akses roadmap
    const userRole = getCurrentUserRole();
    console.log('[ROADMAP] Current role:', userRole, '| Type:', typeof userRole);
    
    // 🔧 FIX: Superadmin SELALU diizinkan!
    if (userRole === 'superadmin' || userRole === 'admin') {
        console.log('[ROADMAP] ✅ GRANTED - Superadmin/Admin access');
        return true;
    }
    
    if (userRole === 'operator') {
        showToast('🚫 Akses ditolak. Operator tidak memiliki izin untuk mengakses Data Roadmap.', 'error', 4000);
        console.error('[SECURITY] 🔒 Operator attempted Roadmap access - BLOCKED');
        return false;
    }
    
    // Cek permission tambahan
    const hasPerm = hasPermission('roadmapKebutuhan');
    console.log('[ROADMAP] hasPermission("roadmapKebutuhan"):', hasPerm);
    
    if (!hasPerm) {
        showToast('🚫 Anda tidak memiliki izin untuk mengakses Data Roadmap.', 'error', 4000);
        return false;
    }
    
    console.log('[ROADMAP] ✅ ACCESS GRANTED');
    return true;
}

/**
 * Global variables for Roadmap Admin
 * NOTE: Pagination variables declared early at top of script to avoid TDZ errors
 */
let roadmapAdminData = [];
let roadmapEditingId = null;


/**
 * Initialize and load Roadmap data when page is shown
 * FIXED: Now calls loadRoadmapAdminTable() to properly fetch AND render
 */
function loadDataRoadmap() {
    // SECURITY: Check permission before loading roadmap data
    if (!checkRoadmapPermission()) {
        return; // Access denied, stop execution
    }
    
    roadmapCurrentPage = 1;
    loadRoadmapAdminTable(); // This function both fetches AND renders to admin table
}

/**
 * Load and Render Roadmap Admin Table with pagination, search, filter
 * Menggunakan Supabase client dan error handling yang lebih baik
 * FIXED: Enhanced with comprehensive debugging and RLS error detection
 */
async function loadRoadmapAdminTable() {
    // SECURITY: Double-check permission (defense in depth)
    if (!checkRoadmapPermission()) {
        return; // Access denied
    }
    
    const tbody = document.getElementById('roadmap-admin-table-body');
    
    console.log('=== [ROADMAP ADMIN] Starting loadRoadmapAdminTable ===');
    console.log('[ROADMAP ADMIN] tbody element found:', !!tbody);
    
    // Show loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="14" style="text-align:center;padding:3rem;color:#64748b;">
                <div class="spinner"></div>
                <p style="margin-top:1rem;">Memuat data roadmap...</p>
                <p style="font-size:0.8rem;color:#94a3b8;margin-top:0.5rem;">Menghubungkan ke server Supabase...</p>
            </td>
        </tr>
    `;
    
    try {
        // Pastikan Supabase client tersedia
        if (!supabaseClient) {
            console.error('[ROADMAP ADMIN] ❌ Supabase client not initialized!');
            throw new Error('Supabase client belum terinisialisasi. Pastikan koneksi internet stabil.');
        }
        
        console.log('[ROADMAP ADMIN] ✅ Supabase client available');
        
        const search = document.getElementById('roadmap-search-input')?.value?.trim() || '';
        const statusFilter = document.getElementById('roadmap-status-filter')?.value || '';
        
        console.log('[ROADMAP ADMIN] Filters:', { search, statusFilter });
        
        // Fetch data using the main fetchRoadmapData function
        console.log('[ROADMAP ADMIN] Calling fetchRoadmapData()...');
        const data = await fetchRoadmapData();
        
        console.log('[ROADMAP ADMIN] Data received:', data?.length || 0, 'records');
        console.log('[ROADMAP ADMIN] Sample data (first record):', data?.[0]);
        
        // Store all data for filtering
        roadmapAdminData = data || [];
        
        // Apply client-side filtering - ✅ BENAR: Gunakan snake_case dari SQL schema
        let filteredData = roadmapAdminData;
        
        if (search) {
            const searchLower = search.toLowerCase();
            filteredData = filteredData.filter(row => 
                String(row.jurusan || '').toLowerCase().includes(searchLower) ||
                String(row.kualifikasi_awal || '').toLowerCase().includes(searchLower) ||
                String(row.jenis_pendidikan || '').toLowerCase().includes(searchLower) ||
                String(row.perguruan_tinggi || '').toLowerCase().includes(searchLower) ||
                String(row.pekerjaan || '').toLowerCase().includes(searchLower) ||
                String(row.tahun_studi || '').toLowerCase().includes(searchLower) ||
                String(row.unit_pendayaguna || '').toLowerCase().includes(searchLower) ||
                String(row.nama_penerima || '').toLowerCase().includes(searchLower) ||
                String(row.status || '').toLowerCase().includes(searchLower)
            );
            console.log('[ROADMAP ADMIN] After search filter:', filteredData.length, 'records');
        }
        
        if (statusFilter && statusFilter !== '') {
            filteredData = filteredData.filter(row => 
                String(row.status || '').toLowerCase() === statusFilter.toLowerCase()
            );
            console.log('[ROADMAP ADMIN] After status filter:', filteredData.length, 'records');
        }
        
        // Calculate pagination
        roadmapTotalRecords = filteredData.length;
        roadmapTotalPages = Math.ceil(roadmapTotalRecords / roadmapPageSize);
        const startIndex = (roadmapCurrentPage - 1) * roadmapPageSize;
        const endIndex = Math.min(startIndex + roadmapPageSize, roadmapTotalRecords);
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        console.log('[ROADMAP ADMIN] Pagination:', { 
            total: roadmapTotalRecords, 
            page: roadmapCurrentPage, 
            pageSize: roadmapPageSize,
            showing: paginatedData.length 
        });
        
        renderRoadmapTable(paginatedData, startIndex);
        updateRoadmapPagination();
        updateRoadmapStats();
        
        console.log('=== [ROADMAP ADMIN] Load complete ===');
        
    } catch (error) {
        console.error('=== [ROADMAP ADMIN] ERROR ===');
        console.error('[ROADMAP ADMIN] Error fetching roadmap data:', error);
        console.error('[ROADMAP ADMIN] Error details:', {
            message: error.message,
            code: error.code,
            status: error.status,
            hint: error.hint,
            details: error.details
        });
        
        // Tampilkan pesan error yang lebih informatif dengan RLS detection
        let errorMsg = error.message || 'Terjadi kesalahan tidak diketahui';
        let errorIcon = '⚠️';
        const isNetworkError = !error.status && (error.message?.includes('network') || error.message?.includes('fetch'));
        
        // DETEKSI SPESIFIK untuk berbagai jenis error
        if (error.status === 401 || error.code === 'PGRST301' || error.message?.includes('permission')) {
            errorMsg = '<strong>ERROR RLS/AUTENTIKASI (401)</strong><br><br>Row Level Security (RLS) memblokir akses ke tabel.<br>Solusi: Pastikan policy SELECT sudah diatur untuk anon role di Supabase Dashboard.<br><br><small>Detail: ' + error.message + '</small>';
            errorIcon = '🔒';
        } else if (error.status === 403 || error.code === 'PGRST302') {
            errorMsg = '<strong>ERROR FORBIDDEN (403)</strong><br><br>Akses ditolak oleh RLS Policy.<br>Solusi: Cek tabel policies di Supabase Dashboard.<br><br><small>Detail: ' + error.message + '</small>';
            errorIcon = '🚫';
        } else if (error.status === 404 || error.code === 'PGRST116') {
            errorMsg = '<strong>TABEL TIDAK DITEMUKAN (404)</strong><br><br>Tabel "roadmap" tidak ditemukan.<br>Solusi: Pastikan SQL schema sudah dijalankan di Supabase SQL Editor.<br><br><small>Detail: ' + error.message + '</small>';
            errorIcon = '❓';
        } else if (error.status === 400 || error.code === 'PGRST201' || error.code === 'PGRST202') {
            errorMsg = '<strong>ERROR QUERY (400)</strong><br><br>Query tidak valid atau kolom tidak ditemukan.<br>Solusi: Periksa nama kolom sesuai schema.<br><br><small>Detail: ' + error.message + '</small>';
            errorIcon = '⚙️';
        } else if (isNetworkError) {
            errorMsg = '<strong>ERROR JARINGAN</strong><br><br>Tidak dapat terhubung ke server Supabase.<br>Solusi: Periksa koneksi internet Anda.<br><br><small>Detail: ' + error.message + '</small>';
            errorIcon = '🌐';
        }
        
        tbody.innerHTML = `
            <tr>
                <td colspan="14" style="text-align:center;padding:3rem;color:#dc2626;">
                    <div style="font-size:2.5rem;margin-bottom:1rem;">${errorIcon}</div>
                    <p style="font-weight:600;margin-bottom:0.5rem;">Gagal Memuat Data Roadmap</p>
                    <div style="font-size:0.875rem;color:#64748b;margin-bottom:1rem;max-width:600px;margin-left:auto;margin-right:auto;text-align:left;background:#fef2f2;padding:1rem;border-radius:8px;border:1px solid #fecaca;">
                        ${errorMsg}
                    </div>
                    <p style="font-size:0.75rem;color:#94a3b8;margin-bottom:1rem;">
                        Error Code: ${error.code || error.status || 'Unknown'} | Status: ${error.status || 'N/A'}
                    </p>
                    <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;margin-top:1rem;">
                        <button class="btn btn-primary btn-sm" onclick="loadDataRoadmap()" style="margin-top:0.5rem;">
                            🔄 Coba Lagi
                        </button>
                        <button class="btn btn-sm" onclick="testSupabaseConnection()" style="background:#e0e7ff;color:#4338ca;margin-top:0.5rem;">
                            🔗 Test Koneksi
                        </button>
                        <button class="btn btn-sm" onclick="location.reload();" style="background:#f1f5f9;color:#475569;margin-top:0.5rem;">
                            🔃 Refresh Halaman
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * Render Roadmap Admin Table with CRUD buttons in LAST column
 * Updated: Show all 12 data fields + row number, CRUD at end
 * Menggunakan OBJECT PROPERTY NAMES (sesuai Supabase response)
 */
function renderRoadmapTable(data, startIndex) {
    const tbody = document.getElementById('roadmap-admin-table-body');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" style="text-align:center;padding:3rem;color:#64748b;">
                    <div style="font-size:3rem;margin-bottom:1rem;">📭</div>
                    <p>Tidak ada data roadmap ditemukan</p>
                    <p style="font-size:0.875rem;margin-top:0.5rem;">Coba ubah filter atau tambah data baru</p>
                    <button class="btn btn-primary btn-sm" onclick="openRoadmapAddModal()" style="margin-top:1rem;background:linear-gradient(135deg,#667eea,#764ba2);">➕ Tambah Data Baru</button>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    data.forEach((row, index) => {
        const actualIndex = startIndex + index;
        const rowNum = startIndex + index + 1;
        
        // Gunakan PROPERTY NAMES sesuai SQL schema
        const jurusan = row.jurusan || '-';
        const kualifikasi = row.kualifikasi_awal || '-';
        const jenisPendidikan = row.jenis_pendidikan || '-';
        const perguruanTinggi = row.perguruan_tinggi || '-';
        const pekerjaan = row.pekerjaan || '-';
        const tahunStudi = row.tahun_studi || '-';
        const jumlahKuota = row.jumlah_kuota || 0;
        const kuotaTerisi = row.kuota_terisi || 0;
        const sisaKuota = row.sisa_kuota !== undefined ? row.sisa_kuota : (jumlahKuota - kuotaTerisi);
        const unitPendayaguna = row.unit_pendayaguna || '-';
        const status = row.status || 'Aktif';
        const namaPenerima = row.nama_penerima || '-';
        
        html += `
            <tr data-row-index="${actualIndex}" data-jurusan="${jurusan}">
                <!-- Row Number -->
                <td style="text-align:center;font-weight:600;color:#64748b;">${rowNum}</td>
                
                <!-- 1. Jurusan -->
                <td><strong style="color:#667eea;">${jurusan}</strong></td>
                
                <!-- 2. Kualifikasi Awal -->
                <td>${kualifikasi}</td>
                
                <!-- 3. Jenis Pendidikan -->
                <td>${jenisPendidikan}</td>
                
                <!-- 4. Perguruan Tinggi -->
                <td>${perguruanTinggi}</td>
                
                <!-- 5. Pekerjaan -->
                <td>${pekerjaan}</td>
                
                <!-- 6. Tahun Studi -->
                <td style="text-align:center;">${tahunStudi}</td>
                
                <!-- 7. Jumlah Kuota -->
                <td style="text-align:center;"><span class="badge" style="background:#dbeafe;color:#1e40af;padding:4px 8px;border-radius:6px;font-weight:600;">${jumlahKuota}</span></td>
                
                <!-- 8. Kuota Terisi -->
                <td style="text-align:center;"><span class="badge" style="background:#dcfce7;color:#166534;padding:4px 8px;border-radius:6px;font-weight:600;">${kuotaTerisi}</span></td>
                
                <!-- 9. Sisa Kuota (Generated Column) -->
                <td style="text-align:center;"><span class="badge" style="background:${sisaKuota > 0 ? '#fef3c7' : '#fee2e2'};color:${sisaKuota > 0 ? '#92400e' : '#991b1b'};padding:4px 8px;border-radius:6px;font-weight:600;">${sisaKuota}</span></td>
                
                <!-- 10. Unit Pendayaguna -->
                <td>${unitPendayaguna}</td>
                
                <!-- 11. Status -->
                <td>${getRoadmapStatusBadge(status)}</td>
                
                <!-- 12. Nama Penerima -->
                <td><span style="font-size:0.85rem;color:#374151;">${namaPenerima}</span></td>
                
                <!-- 13. CRUD Actions Column (LAST) - Event Delegation -->
                <td>
                    <div class="crud-actions">
                        <button type="button" class="btn-crud btn-view" 
                                data-action="view" data-index="${actualIndex}" title="Lihat Detail">👁️</button>
                        <button type="button" class="btn-crud btn-edit" 
                                data-action="edit" data-index="${actualIndex}" title="Edit Data">✏️</button>
                        <button type="button" class="btn-crud btn-delete" 
                                data-action="delete" data-index="${actualIndex}" title="Hapus Data">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    // ===== EVENT DELEGATION untuk Roadmap Table =====
    setupRoadmapTableEvents(tbody);
    
    // Tambahkan row click handler untuk lightbox
    addRowClickHandlers('roadmap-admin-table-body', (index) => viewDetailRoadmap(index));
}

/**
 * Setup Event Delegation for Roadmap Table
 * Sesuai PROMPT MASTER section Y
 */
function setupRoadmapTableEvents(tbody) {
    if (!tbody) return;
    
    // Hapus listener lama
    tbody.removeEventListener('click', handleRoadmapTableClick);
    
    // Tambah event delegation
    tbody.addEventListener('click', handleRoadmapTableClick);
}

/**
 * Event Handler untuk Roadmap Table - Event Delegation
 * Menangani semua klik tombol CRUD di tabel roadmap
 */
async function handleRoadmapTableClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    
    const index = button.dataset.index;
    const action = button.dataset.action;
    
    if (index === undefined || index === null) {
        console.error('[ROADMAP] Index tidak ditemukan');
        showToast('❌ Error: Index tidak ditemukan', 'error');
        return;
    }
    
    console.log(`[ROADMAP CRUD] Action: ${action} | Index: ${index}`);
    
    // Disable tombol sementara
    button.disabled = true;
    button.style.opacity = '0.6';
    
    try {
        switch (action) {
            case 'view':
                await viewDetailRoadmap(parseInt(index));
                break;
            case 'edit':
                await openRoadmapEditModal(parseInt(index));
                break;
            case 'delete':
                confirmDeleteRoadmap(parseInt(index));
                break;
            default:
                console.warn('[ROADMAP] Unknown action:', action);
        }
    } catch (error) {
        console.error('[ROADMAP] Error handling action:', error);
        showToast(`❌ Gagal: ${error.message}`, 'error', 5000);
    } finally {
        button.disabled = false;
        button.style.opacity = '1';
    }
}

// Expose functions
window.setupRoadmapTableEvents = setupRoadmapTableEvents;
window.handleRoadmapTableClick = handleRoadmapTableClick;

/**
 * View detail of a roadmap item
 * Menggunakan OBJECT PROPERTY NAMES (sesuai Supabase response)
 */
function viewDetailRoadmap(index) {
    const row = roadmapAdminData[index];
    if (!row) {
        showToast('❌ Data tidak ditemukan', 'error');
        return;
    }
    
    const modalId = 'detail-roadmap-modal';
    
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
        document.body.appendChild(modal);
    }
    
    // Extract data dengan PROPERTY NAMES yang benar (sesuai SQL schema)
    const id = row.id || '-';
    const jurusan = row.jurusan || '-';
    const kualifikasi = row.kualifikasi_awal || '-';
    const jenisPendidikan = row.jenis_pendidikan || '-';
    const perguruanTinggi = row.perguruan_tinggi || '-';
    const pekerjaan = row.pekerjaan || '-';
    const tahunStudi = row.tahun_studi || '-';
    const jumlahKuota = row.jumlah_kuota || 0;
    const kuotaTerisi = row.kuota_terisi || 0;
    const sisaKuota = row.sisa_kuota || (jumlahKuota - kuotaTerisi);
    const unitPendayaguna = row.unit_pendayaguna || '-';
    const status = row.status || 'Aktif';
    const namaPenerima = row.nama_penerima || '-';
    
    modal.innerHTML = `
        <div class="modal-content modal-large admin-detail-modal">
            <div class="modal-header-modal" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;">
                <h3 style="display:flex;align-items:center;gap:0.75rem;">
                    🗺️ Detail Roadmap
                    <span style="font-size:0.875rem;background:rgba(255,255,255,0.2);padding:0.25rem 0.75rem;border-radius:20px;">
                        ${jurusan}
                    </span>
                </h3>
                <button class="modal-close-btn" onclick="closeModal('${modalId}')">✕</button>
            </div>
            <div class="modal-body-modal" style="max-height:70vh;overflow-y:auto;">
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">ID Record</div>
                        <div class="detail-value"><strong style="color:#667eea;font-size:0.75rem;">${String(id).substring(0, 8)}...</strong></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Jurusan</div>
                        <div class="detail-value">${jurusan}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Kualifikasi Awal</div>
                        <div class="detail-value">${kualifikasi}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Jenis Pendidikan</div>
                        <div class="detail-value">${jenisPendidikan}</div>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <div class="detail-label">Perguruan Tinggi</div>
                        <div class="detail-value">${perguruanTinggi}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Pekerjaan</div>
                        <div class="detail-value">${pekerjaan}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tahun Studi</div>
                        <div class="detail-value">${tahunStudi}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Jumlah Kuota</div>
                        <div class="detail-value"><span class="badge" style="background:#dbeafe;color:#1e40af;padding:4px 8px;border-radius:6px;font-weight:600;">${jumlahKuota}</span></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Kuota Terisi</div>
                        <div class="detail-value"><span class="badge" style="background:#dcfce7;color:#166534;padding:4px 8px;border-radius:6px;font-weight:600;">${kuotaTerisi}</span></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Sisa Kuota</div>
                        <div class="detail-value"><span class="badge" style="background:${sisaKuota > 0 ? '#fef3c7' : '#fee2e2'};color:${sisaKuota > 0 ? '#92400e' : '#991b1b'};padding:4px 8px;border-radius:6px;font-weight:600;">${sisaKuota}</span></div>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <div class="detail-label">Unit Pendayaguna</div>
                        <div class="detail-value">${unitPendayaguna}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Status</div>
                        <div class="detail-value">${getRoadmapStatusBadge(status)}</div>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                        <div class="detail-label">Nama Penerima</div>
                        <div class="detail-value">${namaPenerima || '-'}</div>
                    </div>
                </div>
                
                <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid #e2e8f0;display:flex;gap:1rem;flex-wrap:wrap;justify-content:flex-end;">
                    <button onclick="closeModal('${modalId}'); openRoadmapEditModal(${index});" class="btn btn-sm" style="background:#fef3c7;color:#d97706;">
                        ✏️ Edit Data
                    </button>
                    <button onclick="closeModal('${modalId}'); confirmDeleteRoadmap(${index});" class="btn btn-sm" style="background:#fee2e2;color:#dc2626;">
                        🗑️ Hapus Data
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
}

/**
 * Update Roadmap pagination controls
 */
function updateRoadmapPagination() {
    // Update info text
    const startRecord = roadmapTotalRecords === 0 ? 0 : (roadmapCurrentPage - 1) * roadmapPageSize + 1;
    const endRecord = Math.min(roadmapCurrentPage * roadmapPageSize, roadmapTotalRecords);
    document.getElementById('roadmap-pagination-showing').textContent = `${startRecord}-${endRecord}`;
    document.getElementById('roadmap-pagination-total').textContent = roadmapTotalRecords;
    
    // Update current page button
    document.getElementById('roadmap-btn-current-page').textContent = roadmapCurrentPage;
    document.getElementById('roadmap-total-pages').textContent = roadmapTotalPages || 1;
    
    // Update navigation buttons
    document.getElementById('roadmap-btn-first-page').disabled = roadmapCurrentPage <= 1;
    document.getElementById('roadmap-btn-prev-page').disabled = roadmapCurrentPage <= 1;
    document.getElementById('roadmap-btn-next-page').disabled = roadmapCurrentPage >= roadmapTotalPages;
    document.getElementById('roadmap-btn-last-page').disabled = roadmapCurrentPage >= roadmapTotalPages;
}

/**
 * Update Roadmap statistics bar
 * Fixed: Use property names instead of array index for status filtering
 */
function updateRoadmapStats() {
    document.getElementById('stat-total-roadmap').textContent = roadmapTotalRecords;
    document.getElementById('stat-aktif-roadmap').textContent = roadmapAdminData.filter(r => r.status === 'Aktif').length;
    document.getElementById('stat-pending-roadmap').textContent = roadmapAdminData.filter(r => r.status === 'Pending' || r.status === 'Perencanaan').length;
    document.getElementById('stat-nonaktif-roadmap').textContent = roadmapAdminData.filter(r => r.status === 'Non-Aktif' || r.status === 'Draft').length;
    document.getElementById('stat-selesai-roadmap').textContent = roadmapAdminData.filter(r => r.status === 'Selesai').length;
}

// (moved to top of script)

/**
 * Filter Roadmap data when select changes
 * FIXED: Now calls loadRoadmapAdminTable for proper rendering
 */
function filterDataRoadmap() {
    roadmapCurrentPage = 1;
    loadRoadmapAdminTable();
}

/**
 * Pagination navigation functions for Roadmap
 */
function goToRoadmapPage(page) {
    if (page >= 1 && page <= roadmapTotalPages) {
        roadmapCurrentPage = page;
        loadRoadmapAdminTable(); // FIXED: Call full reload for proper rendering
        document.getElementById('roadmap-table-scroll').scrollTop = 0;
    }
}

function goToRoadmapPrevPage() {
    goToRoadmapPage(roadmapCurrentPage - 1);
}

function goToRoadmapNextPage() {
    goToRoadmapPage(roadmapCurrentPage + 1);
}

function goToRoadmapLastPage() {
    goToRoadmapPage(roadmapTotalPages);
}

function changeRoadmapPageSize() {
    roadmapPageSize = parseInt(document.getElementById('roadmap-page-size-select').value);
    roadmapCurrentPage = 1;
    loadRoadmapAdminTable(); // FIXED: Call full admin table reload instead of just fetch
}

/**
 * Refresh Roadmap data
 */
function refreshDataRoadmap() {
    document.getElementById('roadmap-search-input').value = '';
    document.getElementById('roadmap-status-filter').value = '';
    loadDataRoadmap();
    showToast('🔄 Data Roadmap berhasil di-refresh', 'success');
}

/**
 * Export Roadmap data to CSV - FIXED VERSION
 * Menggunakan header dan field mapping yang sesuai SQL schema
 */
function exportDataRoadmap() {
    console.log('[Roadmap] Starting export...');
    console.log('[Roadmap] Total records to export:', roadmapAdminData?.length || 0);
    
    showToast('📥 Mempersiapkan export data...', 'info');
    
    // FIXED: Header sesuai dengan kolom tabel roadmap di Supabase
    const headers = [
        'No',
        'Jurusan', 
        'Kualifikasi Awal', 
        'Jenis Pendidikan', 
        'Perguruan Tinggi', 
        'Pekerjaan', 
        'Tahun Studi', 
        'Jumlah Kuota', 
        'Kuota Terisi', 
        'Sisa Kuota', 
        'Unit Pendayaguna', 
        'Status', 
        'Nama Penerima'
    ];
    
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += headers.join(',') + '\n';
    
    if (roadmapAdminData && roadmapAdminData.length > 0) {
        roadmapAdminData.forEach((row, index) => {
            // FIXED: Gunakan object properties yang sesuai schema
            const sisaKuota = row.sisa_kuota !== undefined ? row.sisa_kuota : ((row.jumlah_kuota || 0) - (row.kuota_terisi || 0));
            
            const rowData = [
                index + 1,
                `"${String(row.jurusan || '').replace(/"/g, '""')}"`,
                `"${String(row.kualifikasi_awal || '').replace(/"/g, '""')}"`,
                `"${String(row.jenis_pendidikan || '').replace(/"/g, '""')}"`,
                `"${String(row.perguruan_tinggi || '').replace(/"/g, '""')}"`,
                `"${String(row.pekerjaan || '').replace(/"/g, '""')}"`,
                `"${row.tahun_studi || ''}"`,
                `"${row.jumlah_kuota || 0}"`,
                `"${row.kuota_terisi || 0}"`,
                `"${sisaKuota}"`,
                `"${String(row.unit_pendayaguna || '').replace(/"/g, '""')}"`,
                `"${row.status || 'Aktif'}"`,
                `"${String(row.nama_penerima || '').replace(/"/g, '""')}"`
            ];
            csvContent += rowData.join(',') + '\n';
        });
        
        console.log('[Roadmap] Export prepared with', roadmapAdminData.length, 'rows');
    } else {
        console.warn('[Roadmap] No data to export');
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SIMBAKES_DataRoadmap_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    showToast('✅ Data Roadmap berhasil di-export!', 'success');
}

/**
 * Open Add Roadmap Modal
 */
function openRoadmapAddModal() {
    // SECURITY: Check permission before opening add modal
    if (!checkRoadmapPermission()) {
        return; // Access denied
    }
    
    const modalId = 'roadmap-form-modal';
    
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
        document.body.appendChild(modal);
    }
    
    roadmapEditingId = null;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width:700px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;">
                <h3 class="modal-title">➕ Tambah Data Roadmap Baru</h3>
                <button class="modal-close" onclick="closeModal('${modalId}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <form onsubmit="submitRoadmapForm(event)" style="padding:1.5rem;">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Jurusan <span class="required">*</span></label>
                        <input type="text" id="rm-jurusan" required placeholder="Contoh: Keperawatan" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Kualifikasi Awal</label>
                        <input type="text" id="rm-kualifikasi" placeholder="Contoh: D3 Keperawatan" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Jenis Pendidikan</label>
                        <select id="rm-jenis-pendidikan" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                            <option value="">Pilih Jenis</option>
                            <option value="D3">D3 (Diploma)</option>
                            <option value="D4">D4 (Diploma Terapan)</option>
                            <option value="S1">S1 (Sarjana)</option>
                            <option value="S2">S2 (Magister)</option>
                            <option value="S3">S3 (Doktor)</option>
                            <option value="Profesi">Profesi</option>
                            <option value="Spesialis">Spesialis</option>
                        </select>
                    </div>
                    <div style="grid-column:span 2;">
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Perguruan Tinggi</label>
                        <input type="text" id="rm-pt" placeholder="Contoh: Universitas Indonesia" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Pekerjaan</label>
                        <input type="text" id="rm-pekerjaan" placeholder="Contoh: Perawat" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Tahun Studi</label>
                        <input type="number" id="rm-tahun" placeholder="Contoh: 2024" min="2020" max="2030" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Jumlah Kuota</label>
                        <input type="number" id="rm-kuota" placeholder="Contoh: 10" min="0" value="0" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Kuota Terisi</label>
                        <input type="number" id="rm-kuota-terisi" placeholder="Contoh: 5" min="0" value="0" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Unit Pendayaguna</label>
                        <input type="text" id="rm-unit" placeholder="Contoh: RSUP Fatmawati" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Status</label>
                        <select id="rm-status" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                            <option value="Aktif" selected>Aktif</option>
                            <option value="Pending">Pending</option>
                            <option value="Non-Aktif">Non-Aktif</option>
                            <option value="Selesai">Selesai</option>
                            <option value="Ditunda">Ditunda</option>
                        </select>
                    </div>
                    <div style="grid-column:span 2;">
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Nama Penerima</label>
                        <input type="text" id="rm-nama-penerima" placeholder="Contoh: Ahmad Fauzi (opsional)" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                </div>
                
                <div style="margin-top:1.5rem;display:flex;gap:0.75rem;justify-content:flex-end;">
                    <button type="button" class="btn" style="background:#f1f5f9;color:#475569;" onclick="closeModal('${modalId}')">Batal</button>
                    <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#667eea,#764ba2);">
                        💾 Simpan Data
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
}

/**
 * Open Edit Roadmap Modal
 * Menggunakan OBJECT PROPERTY NAMES (sesuai Supabase response)
  */
function openRoadmapEditModal(index) {
    // SECURITY: Check permission before opening edit modal
    if (!checkRoadmapPermission()) {
        return; // Access denied
    }
    
    const row = roadmapAdminData[index];
    if (!row) {
        showToast('❌ Data tidak ditemukan', 'error');
        return;
    }
    
    const modalId = 'roadmap-form-modal';
    
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
        document.body.appendChild(modal);
    }
    
    roadmapEditingId = index;
    
    // Extract data dengan PROPERTY NAMES yang benar (snake_case sesuai SQL schema)
    const jurusan = row.jurusan || '';
    const kualifikasi = row.kualifikasi_awal || '';
    const jenisPendidikan = row.jenis_pendidikan || '';
    const perguruanTinggi = row.perguruan_tinggi || '';
    const pekerjaan = row.pekerjaan || '';
    const tahunStudi = row.tahun_studi || '';
    const jumlahKuota = row.jumlah_kuota || 0;
    const kuotaTerisi = row.kuota_terisi || 0;
    const unitPendayaguna = row.unit_pendayaguna || '';
    const status = row.status || 'Aktif';
    const namaPenerima = row.nama_penerima || '';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width:750px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#059669,#10b981);color:white;">
                <h3 class="modal-title">✏️ Edit Data Roadmap - ${escapeHtml(jurusan)}</h3>
                <button class="modal-close" onclick="closeModal('${modalId}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <form onsubmit="submitRoadmapForm(event)" style="padding:1.5rem;">
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Jurusan <span class="required">*</span></label>
                        <input type="text" id="rm-jurusan" required value="${escapeHtml(jurusan)}" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Kualifikasi Awal</label>
                        <input type="text" id="rm-kualifikasi" value="${escapeHtml(kualifikasi)}" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Jenis Pendidikan</label>
                        <select id="rm-jenis-pendidikan" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                            <option value="">Pilih Jenis</option>
                            <option value="D3" ${jenisPendidikan === 'D3' ? 'selected' : ''}>D3 (Diploma)</option>
                            <option value="D4" ${jenisPendidikan === 'D4' ? 'selected' : ''}>D4 (Diploma Terapan)</option>
                            <option value="S1" ${jenisPendidikan === 'S1' ? 'selected' : ''}>S1 (Sarjana)</option>
                            <option value="S2" ${jenisPendidikan === 'S2' ? 'selected' : ''}>S2 (Magister)</option>
                            <option value="S3" ${jenisPendidikan === 'S3' ? 'selected' : ''}>S3 (Doktor)</option>
                            <option value="Profesi" ${jenisPendidikan === 'Profesi' ? 'selected' : ''}>Profesi</option>
                            <option value="Spesialis" ${jenisPendidikan === 'Spesialis' ? 'selected' : ''}>Spesialis</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Perguruan Tinggi</label>
                        <input type="text" id="rm-pt" value="${escapeHtml(perguruanTinggi)}" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Pekerjaan</label>
                        <input type="text" id="rm-pekerjaan" value="${escapeHtml(pekerjaan)}" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Tahun Studi</label>
                        <input type="number" id="rm-tahun" value="${tahunStudi}" placeholder="Contoh: 2024" min="2020" max="2030" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Jumlah Kuota</label>
                        <input type="number" id="rm-kuota" value="${jumlahKuota}" min="0" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Kuota Terisi</label>
                        <input type="number" id="rm-kuota-terisi" value="${kuotaTerisi}" min="0" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Unit Pendayaguna</label>
                        <input type="text" id="rm-unit" value="${escapeHtml(unitPendayaguna)}" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                    <div>
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Status</label>
                        <select id="rm-status" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                            <option value="Aktif" ${status === 'Aktif' ? 'selected' : ''}>Aktif</option>
                            <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Non-Aktif" ${status === 'Non-Aktif' ? 'selected' : ''}>Non-Aktif</option>
                            <option value="Selesai" ${status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                            <option value="Ditunda" ${status === 'Ditunda' ? 'selected' : ''}>Ditunda</option>
                        </select>
                    </div>
                    <div style="grid-column:span 2;">
                        <label style="font-weight:600;display:block;margin-bottom:0.4rem;font-size:0.875rem;">Nama Penerima</label>
                        <input type="text" id="rm-nama-penerima" value="${escapeHtml(namaPenerima)}" placeholder="Contoh: Ahmad Fauzi (opsional)" style="width:100%;padding:0.7rem;border:2px solid #e2e8f0;border-radius:8px;font-size:0.9rem;">
                    </div>
                </div>
                
                <div style="margin-top:1.5rem;display:flex;gap:0.75rem;justify-content:flex-end;">
                    <button type="button" class="btn" style="background:#f1f5f9;color:#475569;" onclick="closeModal('${modalId}')">Batal</button>
                    <button type="submit" class="btn btn-primary" style="background:linear-gradient(135deg,#059669,#10b981);">
                        💾 Update Data
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
}

/**
 * Submit Roadmap Form (Add/Edit)
 * Menggunakan Supabase client
 */
async function submitRoadmapForm(event) {
    event.preventDefault();
    
    // Validation - hanya jurusan yang wajib
    const jurusan = document.getElementById('rm-jurusan').value.trim();
    
    if (!jurusan) {
        showToast('❌ Jurusan wajib diisi!', 'error');
        return;
    }
    
    // Collect form data dengan semua field sesuai SQL schema
    const dbData = {
        jurusan: jurusan,
        kualifikasi_awal: document.getElementById('rm-kualifikasi').value.trim(),
        jenis_pendidikan: document.getElementById('rm-jenis-pendidikan').value,
        perguruan_tinggi: document.getElementById('rm-pt').value.trim(),
        pekerjaan: document.getElementById('rm-pekerjaan').value.trim(),
        tahun_studi: parseInt(document.getElementById('rm-tahun').value) || null,
        jumlah_kuota: parseInt(document.getElementById('rm-kuota').value) || 0,
        kuota_terisi: parseInt(document.getElementById('rm-kuota-terisi').value) || 0,
        unit_pendayaguna: document.getElementById('rm-unit').value.trim(),
        status: document.getElementById('rm-status').value,
        nama_penerima: document.getElementById('rm-nama-penerima').value.trim()
    };
    
    // Validation complete, proceed with submit
    const isEdit = roadmapEditingId !== null;
    const action = isEdit ? 'editRoadmap' : 'addRoadmap';
    
    // Add id for edit - dapatkan UUID dari data
    if (isEdit && roadmapEditingId !== null && roadmapAdminData[roadmapEditingId]) {
        dbData.id = roadmapAdminData[roadmapEditingId].id;
    }
    
    console.log('📤 Submitting roadmap:', action, dbData);
    
    // Disable button dan show loading
    const btn = document.querySelector('#roadmap-form-modal .btn-primary');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = isEdit ? '⏳ Menyimpan Perubahan...' : '⏳ Menambahkan Data...';
    }
    
    // Save to Supabase
    try {
        if (action === 'add') {
            const { data, error } = await supabaseClient
                .from('roadmap')
                .insert([dbData])
                .select();
            if (error) throw error;
        } else {
            const { data, error } = await supabaseClient
                .from('roadmap')
                .update(dbData)
                .eq('id', dbData.id)
                .select();
            if (error) throw error;
        }
        
        showToast(`✅ ${isEdit ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan'}`, 'success');
        closeModal('roadmap-form-modal');
        loadRoadmapAdminTable(); // FIXED: Refresh admin table properly
        
        // Also refresh the public roadmap page if exists
        if (typeof loadRoadmapData === 'function') {
            loadRoadmapData();
        }
            
    } catch (error) {
        console.error('Error submitting roadmap:', error);
        showToast(`❌ Gagal menyimpan: ${error.message}`, 'error', 5000);
        
        // Tampilkan tips jika network error
        if (error.isNetworkError) {
            setTimeout(() => showConnectionTips(), 1500);
        }
    } finally {
        // Restore button
        const btn = document.querySelector('#roadmap-form-modal .btn-primary');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '💾 Simpan';
        }
    }
}

/**
 * Confirm Delete Roadmap - FIXED VERSION
 * Menampilkan detail data yang akan dihapus (tanpa field 'kode' yang sudah tidak ada)
 */
function confirmDeleteRoadmap(index) {
    // SECURITY: Check permission before delete
    if (!checkRoadmapPermission()) {
        return; // Access denied
    }
    
    const rowData = roadmapAdminData[index];
    if (!rowData) {
        showToast('❌ Data tidak ditemukan', 'error');
        return;
    }
    
    const modalId = 'roadmap-delete-modal';
    
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
        document.body.appendChild(modal);
    }
    
    // FIXED: Tampilkan field yang benar dari schema (tanpa 'kode')
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#dc2626,#ef4444);color:white;">
                <h3 class="modal-title">🗑️ Konfirmasi Hapus Data Roadmap</h3>
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
                    <p style="font-size:0.875rem;margin-bottom:0.5rem;"><strong>Jurusan:</strong> ${rowData.jurusan || '-'}</p>
                    <p style="font-size:0.875rem;margin-bottom:0.5rem;"><strong>Perguruan Tinggi:</strong> ${rowData.perguruan_tinggi || '-'}</p>
                    <p style="font-size:0.875rem;margin-bottom:0.5rem;"><strong>Tahun Studi:</strong> ${rowData.tahun_studi || '-'}</p>
                    <p style="font-size:0.875rem;margin-bottom:0;"><strong>Status:</strong> ${rowData.status || '-'}</p>
                </div>
                <div style="display:flex;gap:0.75rem;justify-content:flex-end;">
                    <button class="btn" style="background:#f1f5f9;color:#475569;" onclick="closeModal('${modalId}')">Batal</button>
                    <button class="btn" style="background:#dc2626;color:white;" onclick="deleteRoadmap(${index})">🗑️ Ya, Hapus</button>
                </div>
            </div>
        </div>
    `;
    
    // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
}

/**
 * Delete Roadmap
 * Menggunakan Supabase client
 */
async function deleteRoadmap(index) {
    // Disable button dan show loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Menghapus...';
    
    try {
        const rowData = roadmapAdminData[index];
        
        // Delete from Supabase
        const { error } = await supabaseClient
            .from('roadmap')
            .delete()
            .eq('id', rowData.id);
        
        if (!error) {
            showToast(`✅ ${result.message}`, 'success');
            closeModal('roadmap-delete-modal');
            loadRoadmapAdminTable(); // FIXED: Refresh admin table properly
            
            // Also refresh public roadmap page
            if (typeof loadRoadmapData === 'function') {
                loadRoadmapData();
            }
        } else {
            throw new Error(result.message || 'Gagal menghapus data');
        }
        
    } catch (error) {
        console.error('Error deleting roadmap:', error);
        showToast(`❌ Gagal menghapus: ${error.message}`, 'error', 5000);
        
        // Tampilkan tips jika network error
        if (error.isNetworkError) {
            setTimeout(() => showConnectionTips(), 1500);
        }
    } finally {
        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

