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
    // KEAMANAN: escape teks status (anti-XSS), icon bersifat statis
    const escText = String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
    statusEl.innerHTML = `${icon} ${escText}`;
}

/**
 * Set action buttons based on current status
 */
function setActionButtons(status) {
    const actionsContainer = document.getElementById('status-actions');
    if (!actionsContainer) return; // container belum ada di halaman
    const statusLower = String(status).toLowerCase().trim();
    
    let buttonsHTML = '';
    
    // Common button: BUKTI PENDAFTARAN (tersedia utk semua status)
    buttonsHTML += `
        <button class="btn-secondary-action" onclick="printBuktiFromStatus()" style="background:#ecfdf5;color:#065f46;border-color:#a7f3d0;">
            🧾 Bukti Pendaftaran
        </button>
    `;
    
    // Common button: View Document Link
    // KEAMANAN: link TIDAK diinjeksi ke onclick (rentan XSS).
    // Simpan di data-attribute (ter-escape), validasi protokol,
    // lalu pasang listener + noopener.
    // [Revisi 15 Okt i] kolom sebenarnya = dokumen_kelengkapan
    // (linkDokumen camelCase tidak pernah ada di tabel submissions).
    const rawDokValue = currentSearchResult
        ? (currentSearchResult.dokumen_kelengkapan || currentSearchResult.linkDokumen || '')
        : '';
    const firstDokUrl = String(rawDokValue).split(/\s+/)
        .filter(function (v) { return /^https?:\/\//i.test(v); })[0] || '';
    if (firstDokUrl) {
        const safeLink = firstDokUrl.replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
        buttonsHTML += `
            <button class="btn-secondary-action" data-doc-link="${safeLink}">
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
    
    // Pasang listener aman untuk tombol Lihat Dokumen (anti-XSS)
    const docBtn = actionsContainer.querySelector('[data-doc-link]');
    if (docBtn) {
        const target = docBtn.getAttribute('data-doc-link') || '';
        if (/^https?:\/\//i.test(target)) {
            docBtn.addEventListener('click', function () {
                window.open(target, '_blank', 'noopener');
            });
        } else {
            docBtn.remove();
        }
    }
    
    actionsContainer.style.display = buttonsHTML.trim() ? 'flex' : 'none';
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
        // [REVISI 15 OKT k] Bila 1 NIK punya lebih dari 1 baris (duplikat),
        // ambil sampai 10 baris lalu pilih baris TERBAIK (paling banyak
        // file/kelengkapan). Sebelumnya .limit(1) TANPA urutan bisa
        // mengambil baris lama tanpa file — file kartu peserta jadi tidak
        // sesuai dengan yang dilihat admin di menu Data Penetapan.
        let penetapanRows = null;
        const q1 = await supabaseClient
            .from('penetapan')
            .select('*')
            .eq('nik', nik)
            .order('id', { ascending: false })
            .limit(10);
        if (q1.error) {
            // Kolom 'id' mungkin tidak ada di tabel — ulang tanpa urutan
            const q2 = await supabaseClient
                .from('penetapan')
                .select('*')
                .eq('nik', nik)
                .limit(10);
            if (q2.error) throw q2.error;
            penetapanRows = q2.data;
        } else {
            penetapanRows = q1.data;
        }
        
        console.log('[SIMBAKES] ✅ Hasil pencarian penetapan:', penetapanRows);
        
        // Hide loading
        document.getElementById('penetapan-loading').style.display = 'none';
        
        // Check if data found
        if (penetapanRows && penetapanRows.length > 0) {
            const barisTerpilih = pickPenetapanRow(penetapanRows);
            if (penetapanRows.length > 1) {
                console.warn('[SIMBAKES] ⚠️ NIK ini memiliki ' + penetapanRows.length +
                    ' baris penetapan — kartu memakai baris terpilih otomatis.', barisTerpilih);
            }
            displayPenetapanResult(barisTerpilih);
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
 * [REVISI 15 OKT k] Pilih baris penetapan terbaik bila 1 NIK punya
 * lebih dari 1 baris: prioritaskan baris dengan file terbanyak
 * (link_foto / link_sk / bukti_lulus_pt), lalu kelengkapan data lain.
 */
function pickPenetapanRow(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    if (rows.length === 1) return rows[0];
    const score = (r) => {
        let s = 0;
        ['link_foto', 'link_sk', 'bukti_lulus_pt'].forEach(function (k) {
            if (String((r && r[k]) || '').trim().length > 10) s += 10;
        });
        ['nama_lengkap', 'no_register', 'status_penetapan', 'tanggal_penetapan'].forEach(function (k) {
            const v = String((r && r[k]) || '').trim();
            if (v && v !== '-') s += 1;
        });
        return s;
    };
    let best = rows[0];
    for (let i = 1; i < rows.length; i++) {
        if (score(rows[i]) > score(best)) best = rows[i];
    }
    return best;
}

/**
 * [REVISI 15 OKT k] Parser tanggal tangguh — mendukung format Indonesia
 * ("15 Januari 2026" — format yang dipakai form admin), ISO
 * ("2026-01-15" / timestamp penuh), "15/01/2026" dan "15-01-2026".
 * Mengembalikan Date atau null — TIDAK pernah menghasilkan "Invalid Date".
 */
function simbakesParseIdDate(val) {
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    const str = String(val == null ? '' : val).trim();
    if (!str || str === '-') return null;
    let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
        const d = new Date(+m[1], +m[2] - 1, +m[3]);
        return isNaN(d.getTime()) ? null : d;
    }
    m = str.match(/^(\d{1,2})\s+([A-Za-z\.]+)\s+(\d{4})/);
    if (m) {
        const bulan = {
            januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
            juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
            jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, agu: 7, agt: 7,
            sep: 8, okt: 9, nov: 10, des: 11,
            january: 0, february: 1, march: 2, may: 4, august: 7, october: 9, december: 11
        };
        const mi = bulan[m[2].toLowerCase().replace(/\./g, '')];
        if (mi !== undefined) {
            const d = new Date(+m[3], mi, +m[1]);
            return isNaN(d.getTime()) ? null : d;
        }
    }
    m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) {
        const d = new Date(+m[3], +m[2] - 1, +m[1]);
        return isNaN(d.getTime()) ? null : d;
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * [REVISI 15 OKT k] Format tanggal utk kartu penetapan — selalu aman:
 * bila tanggal tak terbaca, tampil teks aslinya (tidak pernah
 * "Invalid Date"); kosong → "-".
 */
function simbakesFormatTanggal(val) {
    const d = simbakesParseIdDate(val);
    if (d) return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const raw = String(val == null ? '' : val).trim();
    return raw || '-';
}

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
        unit_pendayguna: getField(data, 'unit_pendayguna', 'unitPendayguna', 'unit_pendayaguna', 'unitPendayaguna', 'unit_tujuan', 'unitTujuan'),
        
        // Pekerjaan
        pekerjaan: getField(data, 'pekerjaan', 'pekerjaan'),
        
        // Status & Tanggal Penetapan
        status_penetapan: getField(data, 'status_penetapan', 'statusPenetapan', ''),
        tanggal_penetapan: getField(data, 'tanggal_penetapan', 'tanggalPenetapan', 'tanggal'),
        
        // Dokumen / Foto — default '' (sebelumnya string 'foto_drive_link'
        // menjadi default → tombol tampil palsu saat kolom kosong) [REVISI 15 OKT j]
        link_foto: getField(data, 'link_foto', 'linkFoto', ''),
        link_sk: getField(data, 'link_sk', 'linkSk', ''),
        
        // [REVISI 15 OKT j] Bukti Lulus PT / Aktif Kuliah (file upload admin)
        bukti_lulus_pt: getField(data, 'bukti_lulus_pt', 'buktiLulusPt', ''),
        
        // Catatan admin untuk peserta [Task9i]
        // NB: getField global = (data, snake, camel, defaultValue) — default harus '', bukan kunci ke-4.
        catatan_penetapan: getField(data, 'catatan_penetapan', 'catatanPenetapan', (data && data.catatan) || '')
    };
    
    // [REVISI 15 OKT k] Tanggal memakai parser tangguh (format Indonesia
    // dari form admin "15 Januari 2026" ikut terbaca) — tidak pernah lagi
    // "Invalid Date". Definisi: simbakesFormatTanggal di atas.
    
    // =====================================================
    // SET PHOTO (Left side)
    // =====================================================
    const photoEl = document.getElementById('penetapan-photo');
    const placeholderEl = document.getElementById('penetapan-photo-placeholder');
    // Ambil URL pertama bila kolom berisi lebih dari satu URL
    const fotoUrlPertama = (typeof simbakesExtractUrls === 'function')
        ? (simbakesExtractUrls(penetapanData.link_foto)[0] || '')
        : (String(penetapanData.link_foto || '').trim().split(/\s+/)[0] || '');
    setPhotoWithFallback(photoEl, placeholderEl, fotoUrlPertama);
    
    // Set Register Badge under photo
    document.getElementById('penetapan-register-badge').textContent = penetapanData.no_register || '-';
    
    // =====================================================
    // SET HEADER INFO (Right side - top)
    // =====================================================
    document.getElementById('penetapan-nama-lengkap').textContent = penetapanData.nama_lengkap || '-';
    // PRIVASI NIK: tampil versi disamarkan (6402••••••••0002) — menu ini bisa
    // dilihat pembaca selain pemilik data; NIK utuh hanya di Panel Admin.
    const rawNikTampil = penetapanData.nik || '';
    const nikAman = (typeof maskNik === 'function') ? maskNik(rawNikTampil) : '••••••••';
    document.getElementById('penetapan-nik-display').textContent = rawNikTampil ? `NIK: ${nikAman}` : 'NIK: -';
    
    // =====================================================
    // SET DATA GRID - 14 FIELDS SESUAI KOLOM SUPABASE
    // =====================================================
    
    // Baris 1: tempat_lahir & tanggal_lahir
    document.getElementById('penetapan-tempat-lahir').textContent = penetapanData.tempat_lahir || '-';
    document.getElementById('penetapan-tanggal-lahir').textContent = simbakesFormatTanggal(penetapanData.tanggal_lahir);
    
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
    document.getElementById('penetapan-tanggal-penetapan').textContent = simbakesFormatTanggal(penetapanData.tanggal_penetapan);
    
    // Baris 5b: catatan admin (tampil hanya bila ada) [Task9i]
    const catatanRow = document.getElementById('penetapan-catatan-row');
    const catatanText = document.getElementById('penetapan-catatan-text');
    const catatanVal = String(penetapanData.catatan_penetapan || '').trim();
    if (catatanRow && catatanText) {
        if (catatanVal && catatanVal !== '-' ) {
            catatanText.textContent = catatanVal;
            catatanRow.style.display = 'block';
        } else {
            catatanText.textContent = '';
            catatanRow.style.display = 'none';
        }
    }
    
    // Baris 6a-6c: blok file TERPISAH utk link_foto, link_sk & bukti_lulus_pt
    // [REVISI 15 OKT k] Setiap file kini punya blok sendiri dengan tombol
    // [👁 Preview] [⬇ Unduh] (helper yang sama dengan kartu Cek Status
    // Pengajuan) — file yang dibuka dijamin dari baris penetapan ini.
    const wireBlokFile = (rowId, boxId, rawVal, judul) => {
        const rowEl = document.getElementById(rowId);
        const boxEl = document.getElementById(boxId);
        if (!rowEl || !boxEl) return false;
        const urls = (typeof simbakesExtractUrls === 'function')
            ? simbakesExtractUrls(rawVal)
            : String(rawVal || '').trim().split(/\s+/);
        const ok = (urls || []).filter(function (u) { return /^https?:\/\//i.test(u); });
        if (!ok.length) {
            rowEl.style.display = 'none';
            boxEl.innerHTML = '';
            return false;
        }
        boxEl.innerHTML = (typeof simbakesDocActionButtons === 'function')
            ? simbakesDocActionButtons(ok.join(' '), judul)
            : '<a href="' + ok[0] + '" target="_blank" rel="noopener" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:0.38rem 0.75rem;border-radius:8px;font-size:0.75rem;font-weight:700;text-decoration:none;">Buka file</a>';
        rowEl.style.display = 'block';
        return true;
    };
    let hasAnyLink = false;
    if (wireBlokFile('penetapan-file-row-foto', 'penetapan-link-foto', penetapanData.link_foto, 'Foto Pasfoto')) hasAnyLink = true;
    if (wireBlokFile('penetapan-file-row-sk', 'penetapan-link-sk', penetapanData.link_sk, 'SK Penetapan')) hasAnyLink = true;
    if (wireBlokFile('penetapan-file-row-bukti', 'penetapan-link-bukti', penetapanData.bukti_lulus_pt, 'Bukti Lulus PT / Aktif Kuliah')) hasAnyLink = true;
    
    // Pesan "belum ada file" hanya tampil bila tidak ada satu pun file
    const noLinkMsg = document.getElementById('penetapan-no-link-msg');
    if (noLinkMsg) noLinkMsg.style.display = hasAnyLink ? 'none' : 'block';
    
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
    
    // Info file SAAT INI (kolom aktual foto_peserta & dokumen_kelengkapan).
    // [REVISI] Input link Google Drive diganti UPLOAD FILE — nilai lama
    // hanya ditampilkan sebagai tautan info, tidak lagi diedit manual.
    renderRevCurrentFile('rev-foto-current', data.foto_peserta, 'foto');
    renderRevCurrentFile('rev-dokumen-current', data.dokumen_kelengkapan, 'dokumen');
    
    // Show revision form container
    document.getElementById('revision-form-container').classList.add('active');
    
    // Scroll to revision form
    document.getElementById('revision-form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * [REVISI] Tampilkan tautan "file saat ini" pada form revisi.
 * Nilai kolom bisa berisi 1 URL (foto) atau 2 URL dipisah baris
 * (dokumen + surat pernyataan). Dibangun via DOM agar aman dari XSS.
 */
function renderRevCurrentFile(elementId, rawValue, jenis) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '';
    const urls = String(rawValue || '').split(/\s+/).map(s => s.trim()).filter(u => /^https?:\/\//i.test(u));
    if (!urls.length) {
        el.textContent = '📁 Belum ada file ' + (jenis === 'foto' ? 'foto' : 'dokumen') + ' tersimpan.';
        return;
    }
    el.appendChild(document.createTextNode('📎 File saat ini: '));
    urls.forEach((u, i) => {
        if (i > 0) el.appendChild(document.createTextNode(' · '));
        const a = document.createElement('a');
        a.href = u;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Lihat ' + (urls.length > 1 ? ('File ' + (i + 1)) : 'file') + (jenis === 'foto' ? ' foto' : ' dokumen');
        a.style.cssText = 'color:#059669;font-weight:600;text-decoration:underline;';
        el.appendChild(a);
    });
}

/**
 * Close revision form
 */
function closeRevisionForm() {
    document.getElementById('revision-form-container').classList.remove('active');
    
    // [REVISI] Kosongkan pilihan file upload revisi
    if (typeof clearSelectedFile === 'function') {
        clearSelectedFile('rev-foto');
        clearSelectedFile('rev-dokumen');
    }
    renderRevCurrentFile('rev-foto-current', '', 'foto');
    renderRevCurrentFile('rev-dokumen-current', '', 'dokumen');
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
        email: document.getElementById('rev-email').value
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

    // [REVISI] Validasi file revisi (bila dipilih) SEBELUM proses simpan
    const revFotoFile = (typeof getSelectedFile === 'function') ? getSelectedFile('rev-foto') : null;
    const revDokFile  = (typeof getSelectedFile === 'function') ? getSelectedFile('rev-dokumen') : null;
    if (revFotoFile) {
        const errF = validateLocalFile(revFotoFile, 'Foto Pasfoto (Perbaikan)', 'image');
        if (errF) { showToast('❌ ' + errF, 'error'); return; }
    }
    if (revDokFile) {
        const errD = validateLocalFile(revDokFile, 'Dokumen Kelengkapan (Perbaikan)', 'pdf');
        if (errD) { showToast('❌ ' + errD, 'error'); return; }
    }

    // Disable button and show loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></div> Menyimpan...';

    try {
        // ========================================================
        // [REVISI] Upload file baru ke Supabase Storage (bila dipilih).
        // URL publiknya otomatis tersimpan ke kolom foto_peserta /
        // dokumen_kelengkapan. Bila tidak ada file baru, nilai kolom
        // lama DIPERTAHANKAN (tidak di-null-kan).
        // ========================================================
        let revFotoUrl = null;
        let revDokUrl = null;
        if (revFotoFile) {
            console.log('[REVISI] 📤 Upload foto perbaikan...');
            revFotoUrl = await uploadFileToStorage(
                revFotoFile,
                buildStoragePath(formData.noRegister, 'revisi-foto', revFotoFile)
            );
            console.log('[REVISI] ✅ Foto perbaikan terupload:', revFotoUrl);
        }
        if (revDokFile) {
            console.log('[REVISI] 📤 Upload dokumen perbaikan...');
            revDokUrl = await uploadFileToStorage(
                revDokFile,
                buildStoragePath(formData.noRegister, 'revisi-dokumen', revDokFile)
            );
            console.log('[REVISI] ✅ Dokumen perbaikan terupload:', revDokUrl);
        }

        // dokumen_kelengkapan bisa berisi URL dokumen + URL surat pernyataan
        // (dipisah baris baru). Saat dokumen baru diupload, ganti HANYA URL
        // dokumen (entri pertama) dan pertahankan URL surat.
        const existingDokUrls = String((currentSearchResult && currentSearchResult.dokumen_kelengkapan) || '')
            .split(/\s+/).map(s => s.trim()).filter(u => /^https?:\/\//i.test(u));
        let newDokValue = existingDokUrls.join('\n') || null;
        if (revDokUrl) {
            newDokValue = [revDokUrl].concat(existingDokUrls.slice(1)).join('\n');
        }

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
            foto_peserta: revFotoUrl || (currentSearchResult && currentSearchResult.foto_peserta) || null,
            dokumen_kelengkapan: newDokValue,
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

