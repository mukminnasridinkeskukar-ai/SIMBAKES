/**
 * ============================================================
 * SIMBAKES - DATA AKUN PESERTA (Fitur Baru)
 * ============================================================
 * CRUD akun peserta dari tabel Supabase `akun_peserta`
 * - Read   : daftar akun + pencarian + filter status + urutan + pagination
 * - Create : modal "Tambah Akun"
 * - Update : modal "Edit Akun" + tombol cepat set status
 * - Delete : konfirmasi + hapus (butuh policy DELETE aktif, lihat sql/)
 *
 * Catatan skema tabel akun_peserta (sesuai database):
 *   id (PK), nama, nik, email, username, password, jurusan_tujuan (NOT NULL),
 *   status (pending|approved|rejected|suspended), status_note,
 *   created_at, updated_at (auto trigger), approved_at, approved_by,
 *   login_attempts, last_login_at
 *
 * File ini tidak mengubah modul lama - hanya menambah fitur.
 * ============================================================
 */

(function () {
    'use strict';

    const AKUN_PAGE_ID = 'data-akun-peserta';

    // ===== STATE =====
    let akunData = [];        // semua baris dari Supabase
    let akunFiltered = [];    // hasil pencarian/filter
    let akunCurrentPage = 1;
    let akunPageSize = 10;
    let akunSearchTimer = null;
    let akunLoading = false;

    // ===== HELPER DASAR =====

    function akunEscapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Resolusi client Supabase (pola yang sama dengan modul registrasi):
     * 1) supabaseClient global  2) simbakesDB.client  3) buat dari SUPABASE_CONFIG
     */
    function getAkunClient() {
        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) return supabaseClient;
        } catch (e) { /* belum terdefinisi */ }
        try {
            if (typeof simbakesDB !== 'undefined' && simbakesDB && simbakesDB.isInitialized && simbakesDB.client) {
                return simbakesDB.client;
            }
        } catch (e) { /* abaikan */ }
        try {
            if (typeof window.supabase !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined' &&
                SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
                return window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            }
        } catch (e) { /* abaikan */ }
        return null;
    }

    function akunFormatDate(iso) {
        if (!iso) return '-';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '-';
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            const hh = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + mi;
        } catch (e) { return '-'; }
    }

    function akunStatusBadge(status) {
        const map = {
            approved:  { cls: 'status-approved', icon: '✅', label: 'Disetujui' },
            pending:   { cls: 'status-verify',   icon: '⏳', label: 'Menunggu' },
            rejected:  { cls: 'status-rejected', icon: '❌', label: 'Ditolak' },
            suspended: { cls: 'status-cancelled', icon: '🚫', label: 'Ditangguhkan' }
        };
        const c = map[status] || map.pending;
        return '<span class="status-badge ' + c.cls + '">' + c.icon + c.label + '</span>';
    }

    // ============================================================
    // READ: MUAT DATA DARI SUPABASE
    // ============================================================

    async function loadAkunPesertaData() {
        if (akunLoading) return;
        const client = getAkunClient();
        const tbody = document.getElementById('akun-peserta-table-body');
        if (!tbody) return;

        if (!client) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#ef4444;">' +
                '❌ Koneksi database tidak tersedia. Periksa internet lalu klik "Ambil Data Terbaru".</td></tr>';
            if (typeof showToast === 'function') showToast('Koneksi Supabase tidak tersedia', 'error');
            return;
        }

        akunLoading = true;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:#64748b;">' +
            '<div class="spinner"></div><p style="margin-top:1rem;">Memuat data akun peserta...</p></td></tr>';

        try {
            const { data, error } = await client
                .from('akun_peserta')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            akunData = Array.isArray(data) ? data : [];
            akunCurrentPage = 1;
            applyAkunFilters();
            console.log('[AKUN PESERTA] ✅ ' + akunData.length + ' akun dimuat dari Supabase');
        } catch (err) {
            console.error('[AKUN PESERTA] Gagal memuat data:', err);
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#ef4444;">' +
                '❌ Gagal memuat data: ' + akunEscapeHtml(err.message || err) +
                '<br><button class="btn btn-sm" style="margin-top:1rem;background:#f1f5f9;color:#475569;" onclick="loadAkunPesertaData()">🔄 Coba Lagi</button></td></tr>';
            if (typeof showToast === 'function') showToast('Gagal memuat data akun: ' + (err.message || ''), 'error');
        } finally {
            akunLoading = false;
        }
    }

    function refreshAkunPeserta() {
        loadAkunPesertaData();
        if (typeof showToast === 'function') showToast('🔄 Memuat ulang data akun...', 'info');
    }

    // ============================================================
    // FILTER / URUT / PAGINATION
    // ============================================================

    function applyAkunFilters() {
        const searchEl = document.getElementById('akun-search-input');
        const statusEl = document.getElementById('akun-status-filter');
        const sortEl = document.getElementById('akun-sort-order');
        const q = (searchEl && searchEl.value ? searchEl.value : '').trim().toLowerCase();
        const statusVal = statusEl ? statusEl.value : '';
        const sortVal = sortEl ? sortEl.value : 'desc';

        let rows = akunData.slice();

        if (statusVal) {
            rows = rows.filter(function (r) { return (r.status || 'pending') === statusVal; });
        }
        if (q) {
            rows = rows.filter(function (r) {
                const hay = [r.nama, r.username, r.email, r.nik, r.jurusan_tujuan]
                    .map(function (v) { return String(v || '').toLowerCase(); }).join(' ');
                return hay.indexOf(q) !== -1;
            });
        }
        if (sortVal === 'nama') {
            rows.sort(function (a, b) { return String(a.nama || '').localeCompare(String(b.nama || '')); });
        } else if (sortVal === 'asc') {
            rows.sort(function (a, b) { return String(a.created_at || '').localeCompare(String(b.created_at || '')); });
        } else {
            rows.sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
        }

        akunFiltered = rows;
        renderAkunPesertaTable();
    }

    function akunDebounceSearch() {
        clearTimeout(akunSearchTimer);
        akunSearchTimer = setTimeout(function () {
            akunCurrentPage = 1;
            applyAkunFilters();
        }, 300);
    }

    function akunTotalPages() {
        return Math.max(1, Math.ceil(akunFiltered.length / akunPageSize));
    }

    function renderAkunPesertaTable() {
        const tbody = document.getElementById('akun-peserta-table-body');
        if (!tbody) return;

        // clamp halaman
        const totalPages = akunTotalPages();
        if (akunCurrentPage > totalPages) akunCurrentPage = totalPages;
        if (akunCurrentPage < 1) akunCurrentPage = 1;

        const start = (akunCurrentPage - 1) * akunPageSize;
        const pageRows = akunFiltered.slice(start, start + akunPageSize);

        akunUpdateStats();

        if (!akunData.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:#64748b;">' +
                '📭 Belum ada akun peserta. Klik "➕ Tambah Akun" untuk membuat akun pertama.</td></tr>';
        } else if (!pageRows.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:#64748b;">' +
                '🔍 Tidak ada akun yang cocok dengan pencarian/filter.</td></tr>';
        } else {
            const html = pageRows.map(function (r, i) {
                const no = start + i + 1;
                const nik = akunEscapeHtml(r.nik || '-');
                const nama = akunEscapeHtml(r.nama || '-');
                const username = akunEscapeHtml(r.username || '-');
                const email = akunEscapeHtml(r.email || '-');
                const jurusan = akunEscapeHtml(r.jurusan_tujuan || '-');
                const note = r.status_note
                    ? '<div style="font-size:0.72rem;color:#64748b;margin-top:2px;max-width:220px;white-space:normal;">' + akunEscapeHtml(r.status_note) + '</div>'
                    : '';
                const lastLogin = r.last_login_at
                    ? akunFormatDate(r.last_login_at)
                    : '<span style="color:#94a3b8;">Belum pernah</span>';

                const btnEdit = '<button class="btn-action-edit" title="Edit akun" onclick="openAkunModal(\'edit\',' + r.id + ')">✏️</button>';
                const btnStatus = (r.status !== 'approved')
                    ? '<button class="btn-action-status" title="Setujui akun" onclick="akunQuickStatus(' + r.id + ',\'approved\')">✅</button>'
                    : '<button class="btn-action-status" title="Tangguhkan akun" onclick="akunQuickStatus(' + r.id + ',\'suspended\')">🚫</button>';
                const btnDelete = '<button class="btn-action-delete" title="Hapus akun" onclick="akunConfirmDelete(' + r.id + ')">🗑️</button>';

                return '<tr>' +
                    '<td style="color:#64748b;">' + no + '</td>' +
                    '<td><div style="font-weight:600;">' + nama + '</div>' +
                        '<div style="font-size:0.72rem;color:#64748b;font-family:monospace;">NIK: ' + nik + '</div></td>' +
                    '<td><div style="font-weight:600;">' + username + '</div>' +
                        '<div style="font-size:0.72rem;color:#64748b;">' + email + '</div></td>' +
                    '<td>' + jurusan + '</td>' +
                    '<td>' + akunStatusBadge(r.status) + note + '</td>' +
                    '<td style="font-size:0.78rem;color:#475569;white-space:nowrap;">' + lastLogin + '</td>' +
                    '<td><div style="display:flex;gap:6px;justify-content:center;">' + btnEdit + btnStatus + btnDelete + '</div></td>' +
                    '</tr>';
            }).join('');
            tbody.innerHTML = html;
        }

        // info pagination
        const showingEl = document.getElementById('akun-page-showing');
        const totalEl = document.getElementById('akun-page-total');
        if (showingEl) showingEl.textContent = akunFiltered.length ? (start + 1) + '-' + (start + pageRows.length) : '0-0';
        if (totalEl) totalEl.textContent = String(akunFiltered.length);

        // tombol pagination
        const setBtn = function (id, disabled) {
            const b = document.getElementById(id);
            if (b) b.disabled = disabled;
        };
        setBtn('akun-btn-first', akunCurrentPage <= 1);
        setBtn('akun-btn-prev', akunCurrentPage <= 1);
        setBtn('akun-btn-next', akunCurrentPage >= totalPages);
        setBtn('akun-btn-last', akunCurrentPage >= totalPages);
        const cur = document.getElementById('akun-btn-current');
        if (cur) cur.textContent = String(akunCurrentPage);
    }

    function akunUpdateStats() {
        const total = akunData.length;
        let approved = 0, pending = 0, blocked = 0;
        akunData.forEach(function (r) {
            const s = r.status || 'pending';
            if (s === 'approved') approved++;
            else if (s === 'pending') pending++;
            else blocked++;
        });
        const put = function (id, v) { const el = document.getElementById(id); if (el) el.textContent = String(v); };
        put('akun-stat-total', total);
        put('akun-stat-approved', approved);
        put('akun-stat-pending', pending);
        put('akun-stat-blocked', blocked);
    }

    function akunGoToPage(p) { akunCurrentPage = p; renderAkunPesertaTable(); }
    function akunGoPrevPage() { akunGoToPage(akunCurrentPage - 1); }
    function akunGoNextPage() { akunGoToPage(akunCurrentPage + 1); }
    function akunGoLastPage() { akunGoToPage(akunTotalPages()); }
    function akunChangePageSize() {
        const sel = document.getElementById('akun-page-size');
        akunPageSize = sel ? parseInt(sel.value, 10) || 10 : 10;
        akunCurrentPage = 1;
        renderAkunPesertaTable();
    }

    // ============================================================
    // CREATE / UPDATE: MODAL TAMBAH & EDIT AKUN
    // ============================================================

    const AKUN_JURUSAN_OPTIONS = [
        'Ners', 'Keperawatan', 'Kebidanan', 'Kesehatan Masyarakat', 'Gizi',
        'Farmasi', 'Kedokteran', 'Dokter Spesialis Penyakit Dalam',
        'Dokter Spesialis Anak', 'Dokter Spesialis Obstetri & Ginekologi',
        'Dokter Gigi', 'Fisioterapi', 'Sanitasi Lingkungan'
    ];

    function akunGetById(id) {
        return akunData.find(function (r) { return String(r.id) === String(id); }) || null;
    }

    function openAkunModal(mode, id) {
        const isEdit = mode === 'edit';
        const row = isEdit ? akunGetById(id) : null;
        if (isEdit && !row) {
            if (typeof showToast === 'function') showToast('Data akun tidak ditemukan, muat ulang dulu', 'error');
            return;
        }

        const modalId = 'akun-peserta-modal';
        if (!document.getElementById(modalId)) {
            const modalHTML =
                '<div class="modal-overlay" id="' + modalId + '">' +
                    '<div class="modal" style="max-width:760px;max-height:92vh;overflow-y:auto;">' +
                        '<div class="modal-header" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;">' +
                            '<h3 class="modal-title" id="akun-modal-title">➕ Tambah Akun Peserta</h3>' +
                            '<button class="modal-close" onclick="closeAkunModal()">' +
                                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                            '</button>' +
                        '</div>' +
                        '<div class="modal-body" style="padding:1.5rem;">' +
                            '<form id="akun-peserta-form" onsubmit="saveAkunPeserta(event);return false;">' +
                                '<input type="hidden" id="akun-form-id">' +
                                '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;">' +
                                    akunFormField('input', 'akun-form-nama', 'Nama Lengkap *', 'Nama sesuai KTP', 'text', true) +
                                    akunFormField('input', 'akun-form-nik', 'NIK *', '16 digit sesuai KTP', 'text', true, 'font-family:monospace;') +
                                    akunFormField('input', 'akun-form-email', 'Email *', 'email@contoh.com', 'email', true) +
                                    akunFormField('input', 'akun-form-username', 'Username *', 'username untuk login', 'text', true) +
                                    akunFormField('input', 'akun-form-password', 'Password *', 'minimal 8 karakter', 'text', true, 'font-family:monospace;') +
                                    akunFormField('input', 'akun-form-jurusan', 'Jurusan Tujuan *', 'ketik atau pilih dari daftar', 'text', true, '', 'akun-jurusan-list') +
                                    akunFormField('select', 'akun-form-status', 'Status Akun *', '', false, true) +
                                    akunFormField('input', 'akun-form-lastlogin', 'Login Terakhir (info)', '', 'text', false, 'background:#f8fafc;color:#94a3b8;', '', true) +
                                '</div>' +
                                '<div class="form-group" style="margin-top:1rem;">' +
                                    '<label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">Catatan Status</label>' +
                                    '<textarea id="akun-form-note" rows="2" placeholder="mis. Alasan penolakan / penangguhan (opsional)" style="width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;resize:vertical;"></textarea>' +
                                '</div>' +
                                '<datalist id="akun-jurusan-list">' +
                                    AKUN_JURUSAN_OPTIONS.map(function (j) { return '<option value="' + akunEscapeHtml(j) + '"></option>'; }).join('') +
                                '</datalist>' +
                                '<div id="akun-form-alert" style="display:none;margin-top:0.75rem;padding:0.65rem 0.85rem;border-radius:8px;font-size:0.82rem;"></div>' +
                                '<p style="font-size:0.75rem;color:#64748b;margin-top:0.75rem;">* wajib diisi. Password disimpan apa adanya (sama dengan pola login peserta saat ini). Username akan otomatis diubah ke huruf kecil.</p>' +
                            '</form>' +
                        '</div>' +
                        '<div class="modal-footer" style="padding:1rem 1.5rem;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:0.75rem;">' +
                            '<button class="btn btn-sm" style="background:#f1f5f9;color:#475569;" onclick="closeAkunModal()">Batal</button>' +
                            '<button class="btn btn-sm" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;" id="akun-save-btn" onclick="saveAkunPeserta(event)">💾 Simpan</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // Isi datalist jurusan (sekali saja, saat modal pertama dibuat)
        const jurList = document.getElementById('akun-jurusan-list');
        if (jurList && !jurList.hasChildNodes()) {
            jurList.innerHTML = AKUN_JURUSAN_OPTIONS.map(function (j) {
                return '<option value="' + akunEscapeHtml(j) + '"></option>';
            }).join('');
        }

        // Prefill form
        const set = function (fid, val) { const el = document.getElementById(fid); if (el) el.value = val == null ? '' : val; };
        set('akun-form-id', isEdit ? row.id : '');
        set('akun-form-nama', isEdit ? row.nama : '');
        set('akun-form-nik', isEdit ? row.nik : '');
        set('akun-form-email', isEdit ? row.email : '');
        set('akun-form-username', isEdit ? row.username : '');
        set('akun-form-password', isEdit ? row.password : '');
        set('akun-form-jurusan', isEdit ? row.jurusan_tujuan : '');
        set('akun-form-status', isEdit ? (row.status || 'pending') : 'pending');
        set('akun-form-note', isEdit ? (row.status_note || '') : '');
        set('akun-form-lastlogin', isEdit ? akunFormatDate(row.last_login_at) : '');

        const titleEl = document.getElementById('akun-modal-title');
        if (titleEl) titleEl.textContent = isEdit ? '✏️ Edit Akun: ' + (row.username || '') : '➕ Tambah Akun Peserta';
        const lastLoginInput = document.getElementById('akun-form-lastlogin');
        if (lastLoginInput) lastLoginInput.readOnly = true;

        akunShowFormAlert('');
        document.getElementById(modalId).classList.add('active');
    }

    function akunFormField(tag, id, label, placeholder, type, required, extraStyle, listAttr, hidden) {
        const req = required ? 'required' : '';
        const style = 'width:100%;padding:0.65rem;border:2px solid #e5e7eb;border-radius:8px;font-size:0.9rem;' + (extraStyle || '');
        const list = listAttr ? ' list="' + listAttr + '"' : '';
        let field;
        if (tag === 'select') {
            field = '<select id="' + id + '" ' + req + ' style="' + style + '">' +
                '<option value="pending">⏳ Menunggu Persetujuan</option>' +
                '<option value="approved">✅ Disetujui</option>' +
                '<option value="rejected">❌ Ditolak</option>' +
                '<option value="suspended">🚫 Ditangguhkan</option>' +
                '</select>';
        } else {
            field = '<input type="' + type + '" id="' + id + '" placeholder="' + akunEscapeHtml(placeholder) + '" ' + req +
                ' style="' + style + '"' + list + '>';
        }
        return '<div class="form-group"' + (hidden ? ' style="display:none;"' : '') + '>' +
            '<label style="font-size:0.8rem;font-weight:600;color:#374151;display:block;margin-bottom:0.25rem;">' + label + '</label>' +
            field + '</div>';
    }

    function closeAkunModal() { closeModal('akun-peserta-modal'); }

    function akunShowFormAlert(msg, type) {
        const el = document.getElementById('akun-form-alert');
        if (!el) return;
        if (!msg) { el.style.display = 'none'; el.innerHTML = ''; return; }
        const colors = { error: 'background:#fee2e2;color:#b91c1c;', success: 'background:#dcfce7;color:#166534;', info: 'background:#dbeafe;color:#1d4ed8;' };
        el.style.display = 'block';
        el.style.cssText = 'margin-top:0.75rem;padding:0.65rem 0.85rem;border-radius:8px;font-size:0.82rem;' + (colors[type] || colors.info);
        el.innerHTML = msg;
    }

    async function saveAkunPeserta(event) {
        if (event) event.preventDefault();
        const g = function (fid) { const el = document.getElementById(fid); return el ? el.value.trim() : ''; };

        const id = g('akun-form-id');
        const isEdit = !!id;
        const payload = {
            nama: g('akun-form-nama'),
            nik: g('akun-form-nik'),
            email: g('akun-form-email').toLowerCase(),
            username: g('akun-form-username').toLowerCase(),
            password: document.getElementById('akun-form-password') ? document.getElementById('akun-form-password').value : '',
            jurusan_tujuan: g('akun-form-jurusan'),
            status: g('akun-form-status') || 'pending',
            status_note: g('akun-form-note') || null
        };

        // Validasi (sesuai aturan registrasi yang sudah ada)
        if (!payload.nama || !payload.nik || !payload.email || !payload.username || !payload.password || !payload.jurusan_tujuan) {
            akunShowFormAlert('Mohon lengkapi semua field wajib (*)', 'error'); return;
        }
        if (!/^[0-9]{16}$/.test(payload.nik)) {
            akunShowFormAlert('NIK harus 16 digit angka (sesuai KTP)', 'error'); return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
            akunShowFormAlert('Format email tidak valid', 'error'); return;
        }
        if (payload.password.length < 8) {
            akunShowFormAlert('Password minimal 8 karakter', 'error'); return;
        }

        const client = getAkunClient();
        if (!client) {
            akunShowFormAlert('Koneksi database tidak tersedia. Cek internet lalu coba lagi.', 'error'); return;
        }

        const btn = document.getElementById('akun-save-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Menyimpan...'; }

        try {
            let result;
            if (isEdit) {
                result = await client.from('akun_peserta').update(payload).eq('id', id).select();
            } else {
                if (payload.status === 'approved') {
                    payload.approved_at = new Date().toISOString();
                }
                result = await client.from('akun_peserta').insert([payload]).select();
            }

            if (result.error) throw result.error;

            const affected = Array.isArray(result.data) ? result.data.length : 0;
            if (affected === 0) {
                // Supabase REST mengembalikan sukses dengan 0 baris saat diblok RLS
                akunShowFormAlert('⚠️ Perubahan tidak tersimpan: policy RLS tabel akun_peserta belum mengizinkan operasi ini. ' +
                    'Jalankan <strong>sql/RLS-akun-peserta-CRUD.sql</strong> di Supabase SQL Editor (lihat folder sql/).', 'error');
                if (typeof showToast === 'function') showToast('Tidak tersimpan - policy RLS belum mengizinkan', 'error');
                return;
            }

            closeAkunModal();
            if (typeof showToast === 'function') {
                showToast(isEdit ? '✅ Akun berhasil diperbarui' : '✅ Akun baru berhasil ditambahkan', 'success');
            }
            await loadAkunPesertaData();
        } catch (err) {
            console.error('[AKUN PESERTA] Gagal menyimpan:', err);
            let msg = err.message || 'Terjadi kesalahan';
            if (err.code === '23505' || msg.indexOf('duplicate') !== -1) {
                msg = 'Username, Email, atau NIK sudah terdaftar. Gunakan yang lain.';
            } else if (err.code === '23502') {
                msg = 'Kolom wajib belum lengkap (mis. Jurusan Tujuan tidak boleh kosong).';
            }
            akunShowFormAlert('❌ ' + msg, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '💾 Simpan'; }
        }
    }

    // ============================================================
    // QUICK STATUS: SETUJUI / TANGGUHKAN DARI TABEL
    // ============================================================

    async function akunQuickStatus(id, newStatus) {
        const row = akunGetById(id);
        if (!row) return;

        if (newStatus === 'suspended') {
            const ok = window.confirm('Tangguhkan akun "' + (row.username || id) + '"?\nPeserta tidak akan bisa login selama ditangguhkan.');
            if (!ok) return;
        } else if (newStatus === 'approved') {
            if (typeof showToast === 'function') showToast('⏳ Menyetujui akun...', 'info');
        }

        const client = getAkunClient();
        if (!client) { if (typeof showToast === 'function') showToast('Koneksi database tidak tersedia', 'error'); return; }

        const payload = { status: newStatus, status_note: newStatus === 'approved' ? 'Disetujui oleh admin' : 'Ditangguhkan oleh admin' };
        if (newStatus === 'approved') payload.approved_at = new Date().toISOString();

        try {
            const { data, error } = await client.from('akun_peserta').update(payload).eq('id', id).select();
            if (error) throw error;
            if (!Array.isArray(data) || data.length === 0) {
                if (typeof showToast === 'function') showToast('⚠️ Tidak tersimpan: jalankan sql/RLS-akun-peserta-CRUD.sql di Supabase', 'error', 6000);
                return;
            }
            if (typeof showToast === 'function') {
                showToast(newStatus === 'approved' ? '✅ Akun disetujui' : '🚫 Akun ditangguhkan', 'success');
            }
            await loadAkunPesertaData();
        } catch (err) {
            console.error('[AKUN PESERTA] Gagal ubah status:', err);
            if (typeof showToast === 'function') showToast('Gagal ubah status: ' + (err.message || ''), 'error');
        }
    }

    // ============================================================
    // DELETE: KONFIRMASI + HAPUS
    // ============================================================

    function akunConfirmDelete(id) {
        const row = akunGetById(id);
        if (!row) return;
        const modalId = 'akun-delete-modal';

        if (!document.getElementById(modalId)) {
            document.body.insertAdjacentHTML('beforeend',
                '<div class="modal-overlay" id="' + modalId + '">' +
                    '<div class="modal" style="max-width:440px;">' +
                        '<div class="modal-header" style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;">' +
                            '<h3 class="modal-title">🗑️ Konfirmasi Hapus Akun</h3>' +
                            '<button class="modal-close" onclick="closeModal(\'akun-delete-modal\')">×</button>' +
                        '</div>' +
                        '<div class="modal-body" style="padding:1.5rem;text-align:center;">' +
                            '<div style="font-size:3rem;margin-bottom:0.5rem;">⚠️</div>' +
                            '<p style="font-weight:600;color:#1e293b;margin-bottom:0.5rem;">Hapus akun peserta ini secara permanen?</p>' +
                            '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem;margin-bottom:1rem;font-size:0.85rem;">' +
                                '<strong id="akun-del-nama">-</strong><br>' +
                                '<span style="color:#64748b;" id="akun-del-user">-</span>' +
                            '</div>' +
                            '<p style="font-size:0.78rem;color:#64748b;">Tindakan ini tidak dapat dibatalkan.</p>' +
                        '</div>' +
                        '<div class="modal-footer" style="padding:1rem 1.5rem;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:0.75rem;">' +
                            '<button class="btn btn-sm" style="background:#f1f5f9;color:#475569;" onclick="closeModal(\'akun-delete-modal\')">Batal</button>' +
                            '<button class="btn btn-sm" style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;" id="akun-del-btn" onclick="akunDoDelete()">🗑️ Ya, Hapus</button>' +
                        '</div>' +
                    '</div>' +
                '</div>');
        }

        document.getElementById('akun-del-nama').textContent = row.nama || '-';
        document.getElementById('akun-del-user').textContent = '@' + (row.username || '-') + ' • NIK ' + (row.nik || '-');
        document.getElementById('akun-del-btn').setAttribute('data-akun-id', id);
        document.getElementById(modalId).classList.add('active');
    }

    async function akunDoDelete() {
        const btn = document.getElementById('akun-del-btn');
        const id = btn ? btn.getAttribute('data-akun-id') : null;
        if (!id) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Menghapus...'; }

        const client = getAkunClient();
        if (!client) {
            if (typeof showToast === 'function') showToast('Koneksi database tidak tersedia', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '🗑️ Ya, Hapus'; }
            return;
        }

        try {
            const { data, error } = await client.from('akun_peserta').delete().eq('id', id).select();
            if (error) throw error;
            const affected = Array.isArray(data) ? data.length : 0;

            closeModal('akun-delete-modal');

            if (affected === 0) {
                // HTTP 200 + 0 baris = diblok policy DELETE (RLS)
                if (typeof showToast === 'function') {
                    showToast('⚠️ Hapus diblokir: jalankan sql/RLS-akun-peserta-CRUD.sql di Supabase SQL Editor untuk mengaktifkan policy DELETE', 'error', 7000);
                }
                return;
            }

            if (typeof showToast === 'function') showToast('🗑️ Akun berhasil dihapus', 'success');
            await loadAkunPesertaData();
        } catch (err) {
            console.error('[AKUN PESERTA] Gagal hapus:', err);
            if (typeof showToast === 'function') showToast('Gagal menghapus: ' + (err.message || ''), 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '🗑️ Ya, Hapus'; }
        }
    }

    // ============================================================
    // INTEGRASI NAVIGASI: wrap showPage lama (tanpa mengubah modul lama)
    // ============================================================

    const akunOriginalShowPage = window.showPage;
    window.showPage = function (pageId) {
        if (pageId === AKUN_PAGE_ID) {
            if (typeof isAdminAuthenticated === 'function' && !isAdminAuthenticated()) {
                if (typeof showToast === 'function') {
                    showToast('🔐 Silakan login untuk mengakses Panel Admin', 'error', 3000);
                }
                const loginPage = document.getElementById('login-page');
                if (loginPage) loginPage.classList.remove('hidden');
                return;
            }
        }
        if (typeof akunOriginalShowPage === 'function') {
            akunOriginalShowPage(pageId);
        }
        if (pageId === AKUN_PAGE_ID) {
            loadAkunPesertaData();
        }
    };

    // ============================================================
    // EXPORT KE WINDOW (dipakai onclick di HTML)
    // ============================================================

    window.applyAkunFilters = applyAkunFilters;
    window.loadAkunPesertaData = loadAkunPesertaData;
    window.refreshAkunPeserta = refreshAkunPeserta;
    window.renderAkunPesertaTable = renderAkunPesertaTable;
    window.akunDebounceSearch = akunDebounceSearch;
    window.akunChangePageSize = akunChangePageSize;
    window.akunGoToPage = akunGoToPage;
    window.akunGoPrevPage = akunGoPrevPage;
    window.akunGoNextPage = akunGoNextPage;
    window.akunGoLastPage = akunGoLastPage;
    window.openAkunModal = openAkunModal;
    window.closeAkunModal = closeAkunModal;
    window.saveAkunPeserta = saveAkunPeserta;
    window.akunQuickStatus = akunQuickStatus;
    window.akunConfirmDelete = akunConfirmDelete;
    window.akunDoDelete = akunDoDelete;

    console.log('[AKUN PESERTA] 📦 Modul Data Akun Peserta siap (CRUD tabel akun_peserta)');

})();
