// ===== HELPER FUNCTIONS =====
function getStatusBadge(status) {
    // Handle both old and new status values for compatibility
    const config = {
        // New Supabase status values
        'Diterima': { class: 'status-approved', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>', display: 'Diterima' },
        'Ditolak': { class: 'status-rejected', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', display: 'Ditolak' },
        'Revisi': { class: 'status-revision', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>', display: 'Revisi' },
        'Dibatalkan': { class: 'status-cancelled', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="18.36" y2="5.64"/><line x1="5.64" y1="18.36" x2="9.17" y2="14.83"/></svg>', display: 'Dibatalkan' },
        
        // Legacy/Alternative status values (for backward compatibility)
        'Disetujui': { class: 'status-approved', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>', display: 'Disetujui' },
        'Perbaikan': { class: 'status-revision', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>', display: 'Perbaikan' },
        'Batal': { class: 'status-cancelled', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="18.36" y2="5.64"/><line x1="5.64" y1="18.36" x2="9.17" y2="14.83"/></svg>', display: 'Batal' },
        'Proses Verifikasi': { class: 'status-verify', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>', display: 'Proses Verifikasi' },
        'Pending': { class: 'status-verify', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>', display: 'Pending' },
        'Draft': { class: 'status-verify', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>', display: 'Draft' }
    };
    
    const c = config[status] || config['Pending'];
    const displayStatus = c.display || status || 'Pending';
    return `<span class="status-badge ${c.class}">${c.icon}${displayStatus}</span>`;
}

function getPriorityClass(p) {
    if (p === 'Sangat Tinggi') return 'priority-very-high';
    if (p === 'Tinggi') return 'priority-high';
    return 'priority-medium';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ===== MODAL FUNCTIONS =====
function openModal(type) {
    const modal = document.getElementById('card-modal');
    const configs = {
        total: { title: 'Total Pengajuan', value: pengusulData.length, desc: 'Seluruh pengajuan beasiswa', source: 'Database SIMBAKES - Real-time aggregation', iconClass: 'icon-blue' },
        disetujui: { title: 'Disetujui', value: pengusulData.filter(p => p.status === 'Disetujui').length, desc: 'Pengajuan yang disetujui', source: 'Database SIMBAKES - Filter "Disetujui"', iconClass: 'icon-green' },
        verifikasi: { title: 'Proses Verifikasi', value: pengusulData.filter(p => p.status === 'Proses Verifikasi').length, desc: 'Menunggu verifikasi admin', source: 'Database SIMBAKES - Filter "Proses Verifikasi"', iconClass: 'icon-amber' },
        ditolak: { title: 'Ditolak/Perbaikan', value: pengusulData.filter(p => ['Ditolak','Perbaikan'].includes(p.status)).length, desc: 'Perlu tindak lanjut', source: 'Database SIMBAKES - Aggregate "Ditolak" & "Perbaikan"', iconClass: 'icon-red' }
    };
    const config = configs[type];
    document.getElementById('modal-title-text').textContent = config.title;
    document.getElementById('modal-value').textContent = config.value;
    document.getElementById('modal-desc').textContent = config.desc;
    document.getElementById('modal-source').textContent = config.source;
    document.getElementById('modal-icon').className = 'card-icon ' + config.iconClass;
    modal.classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
});

// ===== TOAST NOTIFICATION =====
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===== CEK STATUS PAGE FUNCTIONS v3.0 =====

/**
 * Global variable to store current search result data
 */
let currentSearchResult = null;

// Variables for revision form file uploads

/**
 * Main function: Search submission by NIK or Register Number
 * Menggunakan Supabase client
 */
async function searchSubmissionData() {
    const nik = document.getElementById('search-nik').value.trim();
    const register = document.getElementById('search-register').value.trim();
    
    // Validation
    if (!nik && !register) {
        showToast('❌ Masukkan NIK atau Nomor Register!', 'error');
        return;
    }
    
    // Hide previous results, show loading
    document.getElementById('result-container').classList.remove('active');
    document.getElementById('not-found-container').style.display = 'none';
    document.getElementById('revision-form-container').classList.remove('active');
    document.getElementById('search-loading').style.display = 'block';
    
    try {
        // Query dari Supabase - cari berdasarkan NIK atau nomor register
        let query = supabaseClient
            .from('submissions')
            .select('*')
            .limit(1);
        
        if (nik) {
            query = query.eq('nik', nik);
        } else if (register) {
            query = query.eq('no_register', register);
        }
        
        const { data: submissionData, error } = await query;
        
        if (error) throw error;
        
        console.log('✅ Hasil pencarian:', submissionData);
        
        // Hide loading
        document.getElementById('search-loading').style.display = 'none';
        
        // Check if data found
        if (submissionData && submissionData.length > 0) {
            currentSearchResult = submissionData[0];
            
            // Gunakan displayStatusResult() untuk tampilan 23 field lengkap
            displayStatusResult(submissionData[0]);
            
            // Show result container
            document.getElementById('result-container').classList.add('active');
        } else {
            showNotFound(`Data dengan ${nik ? 'NIK' : 'Nomor Register'} "${nik || register}" tidak ditemukan`);
        }
        
    } catch (error) {
        console.error('Error searching submission:', error);
        document.getElementById('search-loading').style.display = 'none';
        showNotFound('Gagal terhubung ke server. Silakan coba lagi.');
    }
}

/**
 * Display search result in the status card (DEPRECATED)
 * Now redirects to displayStatusResult() for 23-field layout
 * Kept for backward compatibility - do not use for new code
 */
function displaySearchResult(data) {
    console.warn('[SIMBAKES] ⚠️ displaySearchResult() is deprecated, using displayStatusResult() instead');
    
    // Redirect to new function with 23 fields
    if (typeof displayStatusResult === 'function') {
        displayStatusResult(data);
        document.getElementById('result-container').classList.add('active');
    } else {
        console.error('[SIMBAKES] ❌ displayStatusResult() not available!');
    }
}

/**
 * Set status badge styling and text
 */
function setStatusBadge(status) {
    const statusEl = document.getElementById('result-status');
    const statusLower = String(status).toLowerCase().trim();
    
    let icon, className, text;
    
    if (statusLower.includes('disetujui') || statusLower.includes('approve') || statusLower.includes('diterima')) {
        icon = '✅';
        className = 'approved';
        text = status || 'Disetujui';
    } else if (statusLower.includes('ditolak') || statusLower.includes('reject') || statusLower.includes('tolak')) {
        icon = '❌';
        className = 'rejected';
        text = status || 'Ditolak';
    } else if (statusLower.includes('perbaikan') || statusLower.includes('revision') || statusLower.includes('revisi')) {
        icon = '⚠️';
        className = 'revision';
        text = status || 'Perbaikan';
    } else if (statusLower.includes('batal') || statusLower.includes('cancel')) {
        icon = '🚫';
        className = 'cancelled';
        text = status || 'Batal';
    } else {
        // Default: Proses Verifikasi
        icon = '⏳';
        className = 'verify';
        text = status || 'Proses Verifikasi';
    }
    
    statusEl.className = `status-large-badge ${className}`;
    statusEl.innerHTML = `${icon} ${text}`;
}

/**
 * Set action buttons based on current status
 */
function setActionButtons(status) {
    const actionsContainer = document.getElementById('status-actions');
    const statusLower = String(status).toLowerCase().trim();
    
    let buttonsHTML = '';
    
    // Common button: View Document Link
    if (currentSearchResult && currentSearchResult.linkDokumen && currentSearchResult.linkDokumen !== '-') {
        buttonsHTML += `
            <button class="btn-secondary-action" onclick="window.open('${currentSearchResult.linkDokumen}', '_blank')">
                📄 Lihat Dokumen
            </button>
        `;
    }
    
    // Conditional button: Perbaikan (only for "Perbaikan" status)
    if (statusLower.includes('perbaikan') || statusLower.includes('revision') || statusLower.includes('revisi')) {
        buttonsHTML += `
            <button class="btn-perbaikan" onclick="openRevisionForm()">
                ✏️ Perbaiki Data
            </button>
        `;
    }
    
    // Button for other statuses
    if (!statusLower.includes('perbaikan') && !statusLower.includes('revision')) {
        if (statusLower.includes('disetujui') || statusLower.includes('approve')) {
            buttonsHTML += `
                <button class="btn-secondary-action" onclick="showToast('🎉 Selamat! Pengajuan Anda telah disetujui.', 'success')" style="background:#dcfce7;color:#166534;border-color:#bbf7d0;">
                    🎉 Selamat!
                </button>
            `;
        } else if (statusLower.includes('ditolak') || statusLower.includes('reject')) {
            buttonsHTML += `
                <button class="btn-secondary-action" onclick="showToast('ℹ️ Untuk informasi lebih lanjut, hubungi admin.', 'info')">
                    ℹ️ Info Selengkapnya
                </button>
            `;
        } else if (statusLower.includes('batal') || statusLower.includes('cancel')) {
            buttonsHTML += `
                <button class="btn-secondary-action" onclick="showToast('ℹ️ Pengajuan ini telah dibatalkan.', 'info')">
                    ℹ️ Info Pembatalan
                </button>
            `;
        } else {
            // Proses Verifikasi
            buttonsHTML += `
                <button class="btn-secondary-action" onclick="showToast('⏳ Data sedang dalam proses verifikasi oleh admin.', 'info')">
                    ⏳ Sedang Diverifikasi
                </button>
            `;
        }
    }
    
    actionsContainer.innerHTML = buttonsHTML;
}

/**
 * Show not found state
 */
function showNotFound(message) {
    document.getElementById('not-found-container').style.display = 'block';
    document.getElementById('not-found-message').textContent = message;
}

// ===== CEK STATUS PENETAPAN FUNCTIONS =====

/**
 * Main function: Search Penetapan by NIK from Supabase
 * Fetches data from 'penetapan' table
 */
async function searchPenetapanData() {
    const nik = document.getElementById('penetapan-search-nik')?.value?.trim();
    
    // Validation
    if (!nik) {
        showToast('❌ Masukkan NIK 16 digit!', 'error');
        document.getElementById('penetapan-search-nik')?.focus();
        return;
    }
    
    if (nik.length < 16) {
        showToast('⚠️ NIK harus 16 digit! Saat ini: ' + nik.length + ' digit', 'error');
        document.getElementById('penetapan-search-nik')?.focus();
        return;
    }
    
    console.log('[SIMBAKES] 🔍 Mencari data penetapan untuk NIK:', nik);
    
    // Hide previous results, show loading
    document.getElementById('penetapan-result-container').style.display = 'none';
    document.getElementById('penetapan-loading').style.display = 'block';
    document.getElementById('penetapan-not-found').style.display = 'none';
    
    try {
        // Check Supabase client availability
        if (!supabaseClient) {
            throw new Error('Supabase client tidak tersedia. Silakan refresh halaman atau hubungi admin.');
        }
        
        console.log('[SIMBAKES] 📡 Mengquery tabel penetapan di Supabase...');
        
        // Query dari Supabase tabel penetapan
        const { data: penetapanData, error } = await supabaseClient
            .from('penetapan')
            .select('*')
            .eq('nik', nik)
            .limit(1);
        
        if (error) throw error;
        
        console.log('[SIMBAKES] ✅ Hasil pencarian penetapan:', penetapanData);
        
        // Hide loading
        document.getElementById('penetapan-loading').style.display = 'none';
        
        // Check if data found
        if (penetapanData && penetapanData.length > 0) {
            displayPenetapanResult(penetapanData[0]);
        } else {
            showPenetapanNotFound(`Data penetapan dengan NIK "${nik}" tidak ditemukan`);
        }
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error searching penetapan:', error);
        
        // Detailed error logging
        console.error('[SIMBAKES] Error details:', {
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details
        });
        
        document.getElementById('penetapan-loading').style.display = 'none';
        
        // Show user-friendly error message
        let errorMessage = 'Gagal terhubung ke server.';
        
        if (error.message?.includes('Supabase client')) {
            errorMessage = error.message;
        } else if (error.code === 'PGRST116' || error.message?.includes('relation')) {
            errorMessage = 'Tabel "penetapan" belum dibuat di database. Hubungi admin.';
        } else if (error.code === '42703' || error.message?.includes('column')) {
            errorMessage = 'Struktur tabel tidak sesuai. Kolom mungkin belum dibuat.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showPenetapanNotFound(errorMessage);
        showToast('❌ ' + errorMessage, 'error');
    }
}

/**
 * Display Penetapan result in the card (Photo Left, Data Right)
 */
/**
 * Display Penetapan result in the card (Photo Left, Data Right)
 * Data source: Supabase table 'penetapan'
 * 14 Fields sesuai kolom tabel:
 * nik, nama_lengkap, tempat_lahir, tanggal_lahir, no_register,
 * jurusan, jenjang, perguruan_tinggi, unit_pendayguna,
 * pekerjaan, status_penetapan, link_foto, link_sk, tanggal_penetapan
 */
function displayPenetapanResult(data) {
    console.log('[SIMBAKES] 📋 Menampilkan hasil penetapan:', data);
    
    // Show result container
    document.getElementById('penetapan-result-container').style.display = 'block';
    
    // Show result card, hide not found
    document.getElementById('penetapan-result-card').style.display = 'block';
    document.getElementById('penetapan-not-found').style.display = 'none';
    
    // =====================================================
    // EXTRACT DATA FROM SUPABASE (snake_case columns)
    // Tabel: penetapan - 14 Fields
    // =====================================================
    const penetapanData = {
        // Identitas Utama
        nik: getField(data, 'nik', 'nik'),
        nama_lengkap: getField(data, 'nama_lengkap', 'namaLengkap'),
        
        // Data Lahir
        tempat_lahir: getField(data, 'tempat_lahir', 'tempatLahir'),
        tanggal_lahir: getField(data, 'tanggal_lahir', 'tanggalLahir'),
        
        // Registrasi
        no_register: getField(data, 'no_register', 'noRegister'),
        
        // Pendidikan
        jurusan: getField(data, 'jurusan', 'jurusan_tujuan', 'jurusanTujuan'),
        jenjang: getField(data, 'jenjang', 'jenjang_pendidikan', 'jenjangPendidikan'),
        perguruan_tinggi: getField(data, 'perguruan_tinggi', 'perguruanTinggi'),
        unit_pendayguna: getField(data, 'unit_pendayguna', 'unitPendayguna', 'unit_tujuan', 'unitTujuan'),
        
        // Pekerjaan
        pekerjaan: getField(data, 'pekerjaan', 'pekerjaan'),
        
        // Status & Tanggal Penetapan
        status_penetapan: getField(data, 'status_penetapan', 'statusPenetapan', 'status', 'Pending'),
        tanggal_penetapan: getField(data, 'tanggal_penetapan', 'tanggalPenetapan', 'tanggal'),
        
        // Dokumen / Foto
        link_foto: getField(data, 'link_foto', 'linkFoto', 'foto_drive_link', ''),
        link_sk: getField(data, 'link_sk', 'linkSk', 'sk_drive_link', '')
    };
    
    // Format tanggal helper
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };
    
    // =====================================================
    // SET PHOTO (Left side)
    // =====================================================
    const photoEl = document.getElementById('penetapan-photo');
    const placeholderEl = document.getElementById('penetapan-photo-placeholder');
    setPhotoWithFallback(photoEl, placeholderEl, penetapanData.link_foto);
    
    // Set Register Badge under photo
    document.getElementById('penetapan-register-badge').textContent = penetapanData.no_register || '-';
    
    // =====================================================
    // SET HEADER INFO (Right side - top)
    // =====================================================
    document.getElementById('penetapan-nama-lengkap').textContent = penetapanData.nama_lengkap || '-';
    document.getElementById('penetapan-nik-display').textContent = `NIK: ${penetapanData.nik || '-'}`;
    
    // =====================================================
    // SET DATA GRID - 14 FIELDS SESUAI KOLOM SUPABASE
    // =====================================================
    
    // Baris 1: tempat_lahir & tanggal_lahir
    document.getElementById('penetapan-tempat-lahir').textContent = penetapanData.tempat_lahir || '-';
    document.getElementById('penetapan-tanggal-lahir').textContent = formatDate(penetapanData.tanggal_lahir);
    
    // Baris 2: no_register & jurusan
    document.getElementById('penetapan-no-register').textContent = penetapanData.no_register || '-';
    document.getElementById('penetapan-jurusan').textContent = penetapanData.jurusan || '-';
    
    // Baris 3: jenjang & perguruan_tinggi
    document.getElementById('penetapan-jenjang').textContent = penetapanData.jenjang || '-';
    document.getElementById('penetapan-perguruan-tinggi').textContent = penetapanData.perguruan_tinggi || '-';
    
    // Baris 4: unit_pendayguna & pekerjaan
    document.getElementById('penetapan-unit-pendayguna').textContent = penetapanData.unit_pendayguna || '-';
    document.getElementById('penetapan-pekerjaan').textContent = penetapanData.pekerjaan || '-';
    
    // Baris 5: status_penetapan & tanggal_penetapan
    setPenetapanStatusBadge(penetapanData.status_penetapan);
    document.getElementById('penetapan-tanggal-penetapan').textContent = formatDate(penetapanData.tanggal_penetapan);
    
    // Baris 6: Action Buttons untuk link_foto & link_sk
    const btnFoto = document.getElementById('penetapan-btn-foto');
    const btnSK = document.getElementById('penetapan-btn-sk');
    const noLinkMsg = document.getElementById('penetapan-no-link-msg');
    
    let hasAnyLink = false;
    
    // Handle link_foto
    if (penetapanData.link_foto && penetapanData.link_foto !== '' && penetapanData.link_foto.length > 10) {
        btnFoto.style.display = 'flex';
        btnFoto.onclick = () => window.open(penetapanData.link_foto, '_blank');
        hasAnyLink = true;
    } else {
        btnFoto.style.display = 'none';
    }
    
    // Handle link_sk
    if (penetapanData.link_sk && penetapanData.link_sk !== '' && penetapanData.link_sk.length > 10) {
        btnSK.style.display = 'flex';
        btnSK.onclick = () => window.open(penetapanData.link_sk, '_blank');
        hasAnyLink = true;
    } else {
        btnSK.style.display = 'none';
    }
    
    // Show/hide "no link" message
    if (hasAnyLink) {
        noLinkMsg.style.display = 'none';
    } else {
        noLinkMsg.style.display = 'flex';
    }
    
    // Set timestamp
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('penetapan-result-timestamp').textContent = `Dicari pada: ${now}`;
    
    // Log the mapped data for debugging
    console.log('[SIMBAKES] ✅ Mapped penetapan data (14 fields):', penetapanData);
}

/**
 * Set Penetapan Status Badge styling and text
 */
function setPenetapanStatusBadge(status) {
    const statusEl = document.getElementById('penetapan-status-badge');
    const statusLower = String(status).toLowerCase().trim();
    
    let icon, bgColor, textColor, text;
    
    if (statusLower.includes('ditetapkan') || statusLower.includes('disetujui') || statusLower.includes('lulus') || statusLower.includes('diterima')) {
        icon = '✅'; bgColor = '#dcfce7'; textColor = '#166534'; text = status || 'Ditetapkan';
    } else if (statusLower.includes('ditolak') || statusLower.includes('gagal')) {
        icon = '❌'; bgColor = '#fef2f2'; textColor = '#991b1b'; text = status || 'Ditolak';
    } else if (statusLower.includes('pending') || statusLower.includes('proses') || statusLower.includes('verifikasi') || statusLower.includes('menunggu')) {
        icon = '⏳'; bgColor = '#eff6ff'; textColor = '#1d4ed8'; text = status || 'Proses Penetapan';
    } else if (statusLower.includes('dicabut') || statusLower.includes('batal')) {
        icon = '🚫'; bgColor = '#f8fafc'; textColor = '#64748b'; text = status || 'Dicabut';
    } else {
        icon = '📋'; bgColor = '#fef3c7'; textColor = '#92400e'; text = status || 'Status Tidak Diketahui';
    }
    
    statusEl.innerHTML = `${icon} ${text}`;
    statusEl.style.background = bgColor;
    statusEl.style.color = textColor;
}

/**
 * Show Penetapan Not Found state
 */
function showPenetapanNotFound(message) {
    document.getElementById('penetapan-result-container').style.display = 'block';
    document.getElementById('penetapan-result-card').style.display = 'none';
    document.getElementById('penetapan-not-found').style.display = 'block';
    document.getElementById('penetapan-not-found-msg').textContent = message || 'Data penetapan tidak ditemukan.';
}

/**
 * Open revision form with pre-filled data
 */
function openRevisionForm() {
    if (!currentSearchResult) {
        showToast('❌ Tidak ada data untuk diperbaiki', 'error');
        return;
    }
    
    const data = currentSearchResult;
    
    // Fill form fields with existing data (baris Supabase = snake_case)
    document.getElementById('revision-row-number').value = data.id || '';
    document.getElementById('rev-reg-nomor').value = data.no_register || '';
    document.getElementById('rev-tanggal').value = data.tanggal_pengajuan ? formatDate(data.tanggal_pengajuan) : '';
    
    // Data Pribadi
    document.getElementById('rev-nik').value = data.nik || '';
    document.getElementById('rev-nama-lengkap').value = data.nama_lengkap || '';
    document.getElementById('rev-tempat-lahir').value = data.tempat_lahir || '';
    document.getElementById('rev-tanggal-lahir').value = data.tanggal_lahir || '';
    document.getElementById('rev-alamat-ktp').value = data.alamat_ktp || '';
    document.getElementById('rev-alamat-domisili').value = data.alamat_domisili || '';
    document.getElementById('rev-lama-domisili').value = data.lama_domisili || '';
    
    // Data Pekerjaan
    document.getElementById('rev-pekerjaan').value = data.pekerjaan || '';
    document.getElementById('rev-posisi').value = data.posisi || '';
    document.getElementById('rev-unit-kerja').value = data.unit_kerja || '';
    document.getElementById('rev-penjelasan').value = data.penjelasan || '';
    
    // Rencana Studi
    document.getElementById('rev-jurusan-tujuan').value = data.jurusan_tujuan || '';
    document.getElementById('rev-jenjang-pendidikan').value = data.jenjang_pendidikan || '';
    document.getElementById('rev-unit-tujuan').value = data.unit_tujuan || '';
    document.getElementById('rev-rencana-tahun').value = data.rencana_tahun || '';
    
    // Kontak
    document.getElementById('rev-no-hp').value = data.no_hp || '';
    document.getElementById('rev-no-wa').value = data.no_wa || '';
    document.getElementById('rev-email').value = data.email || '';
    
    // Link Drive saat ini (kolom aktual foto_peserta & dokumen_kelengkapan)
    const revFotoLink = document.getElementById('rev-foto-link');
    const revDokLink = document.getElementById('rev-dokumen-link');
    if (revFotoLink) revFotoLink.value = data.foto_peserta || '';
    if (revDokLink) revDokLink.value = (data.dokumen_kelengkapan || '').split(/\s+/)[0] || '';
    
    // Show revision form container
    document.getElementById('revision-form-container').classList.add('active');
    
    // Scroll to revision form
    document.getElementById('revision-form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Close revision form
 */
function closeRevisionForm() {
    document.getElementById('revision-form-container').classList.remove('active');
    
    // Kosongkan input link Drive revisi
    const revFotoLink = document.getElementById('rev-foto-link');
    const revDokLink = document.getElementById('rev-dokumen-link');
    if (revFotoLink) revFotoLink.value = '';
    if (revDokLink) revDokLink.value = '';
}

/**
 * Save revision data to Supabase
 */
async function saveRevisionData() {
    // Get form values
    const formData = {
        rowNumber: document.getElementById('revision-row-number').value,
        noRegister: document.getElementById('rev-reg-nomor').value,
        tanggalPengajuan: document.getElementById('rev-tanggal').value,
        nik: document.getElementById('rev-nik').value,
        namaLengkap: document.getElementById('rev-nama-lengkap').value,
        tempatLahir: document.getElementById('rev-tempat-lahir').value,
        tanggalLahir: document.getElementById('rev-tanggal-lahir').value,
        alamatKTP: document.getElementById('rev-alamat-ktp').value,
        alamatDomisili: document.getElementById('rev-alamat-domisili').value,
        lamaDomisili: document.getElementById('rev-lama-domisili').value,
        pekerjaan: document.getElementById('rev-pekerjaan').value,
        posisi: document.getElementById('rev-posisi').value,
        unitKerja: document.getElementById('rev-unit-kerja').value,
        penjelasan: document.getElementById('rev-penjelasan').value,
        jurusanTujuan: document.getElementById('rev-jurusan-tujuan').value,
        jenjangPendidikan: document.getElementById('rev-jenjang-pendidikan').value,
        unitTujuan: document.getElementById('rev-unit-tujuan').value,
        rencanaTahun: document.getElementById('rev-rencana-tahun').value,
        noHP: document.getElementById('rev-no-hp').value,
        noWA: document.getElementById('rev-no-wa').value,
        email: document.getElementById('rev-email').value,
        fotoPeserta: document.getElementById('rev-foto-link')?.value?.trim() || '',
        dokumenKelengkapan: document.getElementById('rev-dokumen-link')?.value?.trim() || ''
    };

    // Basic validation
    if (!formData.namaLengkap || !formData.nik) {
        showToast('❌ NIK dan Nama Lengkap wajib diisi!', 'error');
        return;
    }
    if (!formData.rowNumber) {
        showToast('❌ ID data tidak ditemukan. Muat ulang halaman lalu cari ulang.', 'error');
        return;
    }

    // Confirm before save
    const confirmSave = confirm('Apakah Anda yakin ingin menyimpan perbaikan data?\n\nStatus akan kembali ke "Proses Verifikasi".');
    if (!confirmSave) return;

    // Disable button and show loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></div> Menyimpan...';

    try {
        // Map ke kolom aktual tabel submissions (snake_case)
        const updates = {
            nik: formData.nik,
            nama_lengkap: formData.namaLengkap,
            tempat_lahir: formData.tempatLahir,
            tanggal_lahir: formData.tanggalLahir || null,
            alamat_ktp: formData.alamatKTP,
            alamat_domisili: formData.alamatDomisili,
            lama_domisili: formData.lamaDomisili,
            pekerjaan: formData.pekerjaan,
            posisi: formData.posisi,
            unit_kerja: formData.unitKerja,
            penjelasan: formData.penjelasan,
            jurusan_tujuan: formData.jurusanTujuan,
            jenjang_pendidikan: formData.jenjangPendidikan,
            unit_tujuan: formData.unitTujuan,
            rencana_tahun: formData.rencanaTahun,
            no_hp: formData.noHP,
            no_wa: formData.noWA,
            email: formData.email,
            foto_peserta: formData.fotoPeserta || null,
            dokumen_kelengkapan: formData.dokumenKelengkapan || null,
            status: 'Proses Verifikasi',
            updated_at: new Date().toISOString()
        };

        // Update via Supabase
        const { data: result, error } = await supabaseClient
            .from('submissions')
            .update(updates)
            .eq('id', formData.rowNumber)
            .select();
        
        if (error) throw error;
        
        if (result && result.length > 0) {
            // Success!
            showToast('✅ Data perbaikan berhasil disimpan! Status kembali ke Proses Verifikasi.', 'success');
            
            // Close revision form
            closeRevisionForm();
            
            // Refresh search result to show updated status
            setTimeout(() => {
                searchSubmissionData();
            }, 1000);
            
        } else {
            throw new Error(result.message || 'Gagal menyimpan data');
        }
        
    } catch (error) {
        console.error('Error saving revision:', error);
        showToast(`❌ Gagal menyimpan: ${error.message}`, 'error');
    } finally {
        // Restore button
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

