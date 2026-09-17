/* ============================================================
 * SIMBAKES — PETUNJUK PENGGUNAAN (Hub Buku Panduan + E-Book Reader)
 * ============================================================
 * Fitur:
 *  1. Halaman "Petunjuk Penggunaan" menampilkan 2 buku panduan:
 *     - Panduan Peserta        : terbuka untuk semua, tanpa login.
 *     - Panduan Admin & Operator: hanya admin/operator, WAJIB login.
 *  2. Reader e-book: cover, daftar isi, navigasi halaman, lompat
 *     halaman, zoom, layar penuh, loading/error state, responsif.
 *  3. Keamanan:
 *     - Role TIDAK diambil dari tampilan; divalidasi ke server via
 *       RPC app_validate_session (sumber kebenaran sesi aplikasi).
 *     - Data panduan admin terobfuskasi & hanya didekripsi SETELAH
 *       validasi role lulus. Jalur utama: RPC app_get_panduan_admin
 *       (RLS sisi database — jalankan sql/PANDUAN-ADMIN-BACKEND.sql).
 *     - Tanpa tombol unduh/unduh/simpan, tanpa link file sumber,
 *       konten disembunyikan dari hasil cetak.
 *
 * Modul ini TIDAK mengubah fungsi, menu, database, dan fitur lain.
 * ============================================================ */
(function () {
    'use strict';

    /* ============ KONFIGURASI ============ */
    var V = '20260917b';
    // Setengah kunci dekripsi blob admin (setengah lainnya di panduan/admin-data.js)
    var ADMIN_KEY_PART2 = 'cd007b5f50c68800302ffea9ba9113a6';
    // Role yang berhak membaca Panduan Admin & Operator.
    // ('admin' dinormalisasi menjadi 'superadmin' oleh server saat login.)
    var ALLOWED_ADMIN_ROLES = ['superadmin', 'operator'];

    var TOKEN_ADMIN = 'simbakes_session_token';
    var TOKEN_PESERTA = 'simbakes_peserta_token';

    /* ============ UTIL ============ */
    function $(sel, root) { return (root || document).querySelector(sel); }
    function byId(id) { return document.getElementById(id); }

    function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function toast(msg, type) {
        try {
            if (typeof window.showToast === 'function') { window.showToast(msg, type || 'info'); return; }
        } catch (e) { /* fallback di bawah */ }
        try {
            var t = document.createElement('div');
            t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:100000;' +
                'background:#0f172a;color:#fff;padding:10px 18px;border-radius:12px;font-size:0.85rem;' +
                'font-weight:600;box-shadow:0 12px 30px rgba(0,0,0,0.25);max-width:88vw;';
            t.textContent = msg;
            document.body.appendChild(t);
            setTimeout(function () { t.remove(); }, 3800);
        } catch (e) { /* diam */ }
    }

    function injectStylesheet(href) {
        if ($('link[data-pbhref="' + href + '"]')) return;
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        l.setAttribute('data-pbhref', href);
        document.head.appendChild(l);
    }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var existed = $('script[data-pbsrc="' + src + '"]');
            if (existed && existed.dataset.pbLoaded === '1') { resolve(); return; }
            if (existed) existed.remove();   // tag gagal sebelumnya -> bersihkan agar retry benar-benar mengulang
            var s = document.createElement('script');
            s.src = src;
            s.setAttribute('data-pbsrc', src);
            s.onload = function () { s.dataset.pbLoaded = '1'; resolve(); };
            s.onerror = function () { s.remove(); reject(new Error('Gagal memuat berkas: ' + src)); };
            document.head.appendChild(s);
        });
    }

    function isRpcMissing(err) {
        if (!err) return false;
        var msg = (err.message || '') + ' ' + (err.code || '');
        return err.code === 'PGRST202' ||
            msg.indexOf('Could not find the function') !== -1 ||
            (msg.indexOf('schema cache') !== -1 && msg.indexOf('app_') !== -1);
    }

    function localAdminRole() {
        // Kompabilitas mode legacy (RPC belum terpasang): pakai state login aplikasi.
        try {
            if (typeof currentAdminUser !== 'undefined' && currentAdminUser) {
                var r = String(currentAdminUser.role || '').toLowerCase();
                if (r === 'admin' || r === 'administrator' || r === 'super_admin' || r === 'super-admin') r = 'superadmin';
                return r;
            }
        } catch (e) { /* global belum ada */ }
        return null;
    }

    /* ============ VALIDASI AKSES (SERVER = SUMBER KEBENARAN) ============ */
    /**
     * Keputusan akses Panduan Admin & Operator.
     * Selalu memanggil server (RPC app_validate_session) kecuali saat
     * RPC memang tidak tersedia (mode legacy aplikasi).
     * @returns {Promise<{state:'login'|'ok'|'deny'|'uncertain', role?:string}>}
     */
    function getAdminVerdict(forceServer) {
        var tok = safeGet(TOKEN_ADMIN);
        if (!tok) return Promise.resolve({ state: 'login' });

        var call;
        try {
            if (typeof simbakesRpc !== 'function') throw new Error('NOCLIENT');
            call = simbakesRpc('app_validate_session', { p_token: tok });
        } catch (e) { call = Promise.reject(e); }

        return call.then(function (data) {
            if (data && data.valid === true && data.user_type === 'admin') {
                var role = String((data.profile && data.profile.role) || '').toLowerCase();
                if (role === 'admin') role = 'superadmin';
                return { state: ALLOWED_ADMIN_ROLES.indexOf(role) !== -1 ? 'ok' : 'deny', role: role };
            }
            // null / valid:false -> server menolak token (expired/revoked)
            return Promise.resolve(afterServerReject());
        }).catch(function (err) {
            if (isRpcMissing(err)) {
                // Mode legacy: RPC keamanan belum dijalankan (pola yang sama
                // dengan security-guard.js). Gunakan state lokal aplikasi.
                var role = localAdminRole();
                if (!role) return { state: 'login' };
                return { state: ALLOWED_ADMIN_ROLES.indexOf(role) !== -1 ? 'ok' : 'deny', role: role, legacy: true };
            }
            // Transien (jaringan/server) -> jangan bunuh sesi; tandai belum pasti.
            var lr = localAdminRole();
            if (!lr) return { state: 'login', uncertain: true };
            return {
                state: ALLOWED_ADMIN_ROLES.indexOf(lr) !== -1 ? 'ok' : 'deny',
                role: lr, uncertain: true
            };
        });

        function afterServerReject() {
            var hasPeserta = !!safeGet(TOKEN_PESERTA);
            if (hasPeserta) return { state: 'deny' };   // login sebagai peserta -> ditolak
            return { state: 'login' };                   // sesi admin tidak sah -> dianggap belum login
        }
    }

    /* ============ SUMBER DATA BUKU ============ */
    function getPesertaBook() {
        var d = window.__SIMBAKES_PANDUAN__ && window.__SIMBAKES_PANDUAN__.peserta;
        if (!d) throw new Error('Data Panduan Peserta belum termuat.');
        return d;
    }

    function fetchAdminRpc() {
        var cfg = (typeof SUPABASE_CONFIG !== 'undefined') ? SUPABASE_CONFIG : null;
        if (!cfg || !cfg.url || !cfg.anonKey) return Promise.reject(new Error('NOCLIENT'));
        var tok = safeGet(TOKEN_ADMIN) || '';
        return fetch(cfg.url + '/rest/v1/rpc/app_get_panduan_admin', {
            method: 'POST',
            headers: {
                'apikey': cfg.anonKey,
                'Authorization': 'Bearer ' + cfg.anonKey,
                'Content-Type': 'application/json',
                'x-session-token': tok
            },
            body: '{}'
        }).then(function (res) {
            return res.json().then(function (body) {
                if (!res.ok) {
                    var e = new Error((body && body.message) || ('HTTP ' + res.status));
                    e.code = (body && body.code) || ('HTTP' + res.status);
                    throw e;
                }
                return body;   // objek buku (jsonb) atau null (ditolak server)
            });
        });
    }

    function decodeAdminBlob(blob) {
        function hexToBytes(h) {
            var out = new Uint8Array(h.length / 2);
            for (var i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
            return out;
        }
        var keyBytes = new Uint8Array(32);
        keyBytes.set(hexToBytes(blob.a), 0);
        keyBytes.set(hexToBytes(ADMIN_KEY_PART2), 16);

        var bin = atob(blob.b);
        var raw = new Uint8Array(bin.length);
        for (var j = 0; j < bin.length; j++) raw[j] = bin.charCodeAt(j);

        var out = new Uint8Array(raw.length);
        for (var k = 0; k < raw.length; k++) out[k] = raw[k] ^ keyBytes[k % 32];

        var json = new TextDecoder('utf-8').decode(out);
        return JSON.parse(json);
    }

    /**
     * Memuat isi Panduan Admin & Operator.
     * Jalur 1 (utama): RPC app_get_panduan_admin — divalidasi RLS di server.
     *                  Return null dari server = AKSES DITOLAK di backend.
     * Jalur 2 (kompatibilitas): modul statis terobfuskasi (hanya diambil
     *                  setelah role tervalidasi server; lihat openAdminBook).
     */
    function loadAdminBook() {
        return fetchAdminRpc().then(function (d) {
            if (d && d.bab && d.bab.length) return d;
            var e = new Error('DITOLAK_SERVER');
            e.pbDenied = true;
            throw e;
        }).catch(function (err) {
            if (err && err.pbDenied) throw err;
            if (!isRpcMissing(err)) {
                // RPC ada tapi error transien -> coba fallback statis tetap
                // diizinkan karena role SUDAH tervalidasi server sebelumnya.
            }
            return loadStaticAdmin();
        });
    }

    function loadStaticAdmin() {
        var d = window.__SIMBAKES_PANDUAN__ && window.__SIMBAKES_PANDUAN__.adminBlob;
        var ready = d ? Promise.resolve() : loadScript('panduan/admin-data.js?v=' + V);
        return ready.then(function () {
            var b = window.__SIMBAKES_PANDUAN__ && window.__SIMBAKES_PANDUAN__.adminBlob;
            if (!b) throw new Error('Data panduan admin tidak ditemukan.');
            return decodeAdminBlob(b);
        });
    }

    /* ============ HUB (HALAMAN PETUNJUK PENGGUNAAN) ============ */
    var hubReady = false;

    function buildGenCover(host, opts) {
        if (!host || host.dataset.pbBuilt === '1') return;
        host.innerHTML =
            '<div class="ph-genbook">' +
                '<div class="gb-kick">' + esc(opts.kicker) + '</div>' +
                '<div class="gb-title">' + esc(opts.title) + '</div>' +
                '<div class="gb-rule"></div>' +
                '<div class="gb-sub">' + esc(opts.sub) + '</div>' +
                '<div class="gb-foot">SIMBAKES · ' + esc(opts.edisi) + '</div>' +
            '</div>';
        host.dataset.pbBuilt = '1';
    }

    function setChip(state, text) {
        var chip = byId('ph-chip-admin');
        if (!chip) return;
        chip.className = 'ph-chip ' + ({
            ok: 'ph-chip-ok', deny: 'ph-chip-deny',
            lock: 'ph-chip-lock', wait: 'ph-chip-wait'
        }[state] || 'ph-chip-wait');
        chip.textContent = text;
    }

    function refreshAdminChip() {
        setChip('wait', '⏳ Memeriksa akses…');
        return getAdminVerdict().then(function (v) {
            if (v.state === 'ok') setChip('ok', '✓ Akses tersedia');
            else if (v.state === 'deny') setChip('deny', '× Akses ditolak');
            else setChip('lock', '🔒 Login diperlukan');
        }).catch(function () { setChip('lock', '🔒 Login diperlukan'); });
    }

    function initHub() {
        if (hubReady) return;
        var cardPeserta = byId('ph-card-peserta');
        var cardAdmin = byId('ph-card-admin');
        if (!cardPeserta || !cardAdmin) return;
        hubReady = true;

        buildGenCover(byId('ph-cover-peserta'), {
            kicker: 'Panduan Resmi', title: 'Panduan Peserta SIMBAKES',
            sub: 'Mengajukan rekomendasi, memantau status, hingga penetapan kelulusan.',
            edisi: 'Edisi ' + new Date().getFullYear()
        });
        buildGenCover(byId('ph-cover-admin'), {
            kicker: 'Panduan Internal', title: 'Panduan Admin & Operator SIMBAKES',
            sub: 'Verifikasi pengajuan, penetapan, akun peserta, dan pengelolaan data.',
            edisi: 'Edisi ' + new Date().getFullYear()
        });
        // Warna aksen kartu
        cardPeserta.style.setProperty('--ph-accent', '#0d9488');
        cardPeserta.style.setProperty('--ph-accent-d', '#0f766e');
        cardAdmin.style.setProperty('--ph-accent', '#2a5298');
        cardAdmin.style.setProperty('--ph-accent-d', '#1a365d');

        var bp = byId('ph-btn-peserta');
        if (bp) bp.addEventListener('click', function () { openPesertaBook(); });
        var ba = byId('ph-btn-admin');
        if (ba) ba.addEventListener('click', function () { openAdminBook(); });

        refreshAdminChip();
    }

    /* ---------- alur buka panduan ---------- */
    function openPesertaBook() {
        openReader('peserta');
    }

    function openAdminBook() {
        setChip('wait', '⏳ Memeriksa akses…');
        getAdminVerdict(true).then(function (v) {
            if (v.state === 'ok') {
                setChip('ok', '✓ Akses tersedia');
                openReader('admin');
                return;
            }
            if (v.state === 'deny') {
                setChip('deny', '× Akses ditolak');
                showDenyModal();
                return;
            }
            // belum login / sesi tidak sah -> arahkan ke halaman login admin
            setChip('lock', '🔒 Login diperlukan');
            goToAdminLogin();
        }).catch(function () {
            setChip('lock', '🔒 Login diperlukan');
            toast('Tidak dapat memverifikasi sesi. Periksa koneksi internet Anda.', 'error');
        });
    }

    function goToAdminLogin() {
        var redirected = false;
        // Jalur utama: halaman login resmi aplikasi (overlay login-page via topbar)
        try {
            if (typeof window.openTopbarLogin === 'function') {
                window.openTopbarLogin();
                redirected = true;
            }
        } catch (e) { /* coba jalur cadangan */ }
        // Jalur cadangan: form login di sidebar (bila UI topbar tidak ada)
        if (!redirected) {
            try {
                var items = byId('items-admin');
                if (items && !items.classList.contains('open') && typeof toggleSection === 'function') {
                    toggleSection('admin');
                }
                var u = byId('sidebar-username');
                if (items && items.scrollIntoView) items.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (u) setTimeout(function () {
                    try { u.focus({ preventScroll: true }); } catch (e) { u.focus(); }
                }, 420);
            } catch (e) { /* diam */ }
        }
        toast('🔐 Login Admin/Operator diperlukan untuk membuka panduan ini.', 'error');
    }

    /* ---------- modal akses ditolak ---------- */
    var denyModalBuilt = false;
    function ensureDenyModal() {
        if (denyModalBuilt) return;
        denyModalBuilt = true;
        var m = document.createElement('div');
        m.className = 'pb-modal';
        m.id = 'pb-deny-modal';
        m.innerHTML =
            '<div class="pb-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="pb-deny-title">' +
                '<div class="pb-modal-icon">✕</div>' +
                '<h3 class="pb-modal-title" id="pb-deny-title">Akses Ditolak</h3>' +
                '<p class="pb-modal-msg">Anda tidak memiliki akses ke panduan ini.<br>' +
                'Panduan Admin &amp; Operator hanya dapat dibaca oleh <b>admin</b> dan <b>operator</b> yang sedang login.</p>' +
                '<button class="pb-modal-btn" id="pb-deny-ok">Mengerti</button>' +
            '</div>';
        document.body.appendChild(m);
        m.addEventListener('click', function (e) {
            if (e.target === m || e.target.id === 'pb-deny-ok') m.classList.remove('show');
        });
    }
    function showDenyModal() {
        ensureDenyModal();
        var m = byId('pb-deny-modal');
        if (m) m.classList.add('show');
    }

    /* ============ READER E-BOOK ============ */
    var R = {
        built: false, open: false,
        book: null, sheets: [], idx: 0,
        zoom: 1, lastKey: null, historyPushed: false
    };
    var ZOOM_MIN = 0.85, ZOOM_MAX = 1.6, ZOOM_STEP = 0.15;

    var SVG = {
        book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
        left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
        right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
        list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
        zoomIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
        zoomOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
        expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
        compress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
    };

    function ensureReaderDom() {
        if (R.built) return;
        R.built = true;

        var ov = document.createElement('div');
        ov.className = 'pb-overlay';
        ov.id = 'pb-overlay';
        ov.innerHTML =
            '<div class="pb-top">' +
                '<button class="pb-back" id="pb-back" title="Kembali ke Petunjuk Penggunaan">' +
                    SVG.left.replace('stroke-width="2"', 'stroke-width="2.4"') +
                    '<span class="pb-back-label">Petunjuk Penggunaan</span>' +
                '</button>' +
                '<span class="pb-crumb-sep">›</span>' +
                '<div class="pb-top-title" id="pb-top-title"></div>' +
                '<div class="pb-top-spacer"></div>' +
                '<button class="pb-tool" id="pb-btn-toc" title="Daftar isi" aria-label="Daftar isi">' + SVG.list + '</button>' +
                '<button class="pb-tool" id="pb-btn-zout" title="Perkecil tampilan" aria-label="Perkecil">' + SVG.zoomOut + '</button>' +
                '<span class="pb-zoom-label" id="pb-zoom-label">100%</span>' +
                '<button class="pb-tool" id="pb-btn-zin" title="Perbesar tampilan" aria-label="Perbesar">' + SVG.zoomIn + '</button>' +
                '<button class="pb-tool" id="pb-btn-fs" title="Layar penuh" aria-label="Layar penuh">' + SVG.expand + '</button>' +
                '<button class="pb-tool" id="pb-btn-close" title="Tutup" aria-label="Tutup">' + SVG.close + '</button>' +
            '</div>' +
            '<div class="pb-stage" id="pb-stage"></div>' +
            '<div class="pb-drawer" id="pb-drawer">' +
                '<div class="pb-drawer-head">' +
                    '<div class="pb-drawer-title">Daftar Isi</div>' +
                    '<div class="pb-drawer-sub" id="pb-drawer-sub"></div>' +
                '</div>' +
                '<div class="pb-drawer-list" id="pb-drawer-list"></div>' +
            '</div>' +
            '<div class="pb-nav">' +
                '<div class="pb-progress" id="pb-progress" style="width:0"></div>' +
                '<button class="pb-nav-btn" id="pb-prev">' + SVG.left + '<span class="pb-nav-label">Sebelumnya</span></button>' +
                '<span class="pb-pageinfo">' +
                    '<input type="number" class="pb-pageinput" id="pb-pageinput" min="1" value="1" aria-label="Nomor halaman">' +
                    '<span>/</span><span id="pb-pagetotal" class="pb-pagetotal">–</span>' +
                '</span>' +
                '<button class="pb-nav-btn" id="pb-next"><span class="pb-nav-label">Berikutnya</span>' + SVG.right + '</button>' +
            '</div>';
        document.body.appendChild(ov);

        byId('pb-back').addEventListener('click', function () { closeReader(); });
        byId('pb-btn-close').addEventListener('click', function () { closeReader(); });
        byId('pb-prev').addEventListener('click', function () { goSheet(R.idx - 1); });
        byId('pb-next').addEventListener('click', function () { goSheet(R.idx + 1); });
        byId('pb-btn-toc').addEventListener('click', function () {
            var d = byId('pb-drawer');
            if (d) d.classList.toggle('open');
        });
        byId('pb-btn-zin').addEventListener('click', function () { setZoom(R.zoom + ZOOM_STEP); });
        byId('pb-btn-zout').addEventListener('click', function () { setZoom(R.zoom - ZOOM_STEP); });
        byId('pb-btn-fs').addEventListener('click', toggleFullscreen);
        byId('pb-pageinput').addEventListener('change', function () {
            var v = parseInt(this.value, 10);
            if (isNaN(v)) { this.value = R.idx + 1; return; }
            goSheet(v - 1);
        });

        document.addEventListener('fullscreenchange', updateFsIcon);
        document.addEventListener('webkitfullscreenchange', updateFsIcon);

        // Keyboard
        document.addEventListener('keydown', function (e) {
            if (!R.open) return;
            if (e.key === 'Escape') {
                var d = byId('pb-drawer');
                if (d && d.classList.contains('open')) { d.classList.remove('open'); return; }
                closeReader();
            } else if (e.key === 'ArrowRight') { goSheet(R.idx + 1); }
            else if (e.key === 'ArrowLeft') { goSheet(R.idx - 1); }
        });

        // Geser (swipe) pada layar sentuh
        var tx = 0, ty = 0, tt = 0;
        var stage = byId('pb-stage');
        stage.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) return;
            tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now();
        }, { passive: true });
        stage.addEventListener('touchend', function (e) {
            if (!e.changedTouches.length) return;
            var dx = e.changedTouches[0].clientX - tx;
            var dy = e.changedTouches[0].clientY - ty;
            if (Date.now() - tt > 700) return;
            if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
            try {
                var t = e.target;
                if (t && t.closest && t.closest('table')) return;   // hindari konflik scroll tabel
            } catch (er) { /* diam */ }
            if (dx < 0) goSheet(R.idx + 1); else goSheet(R.idx - 1);
        }, { passive: true });

        // Tombol Back browser menutup reader (bukan meninggalkan aplikasi)
        window.addEventListener('popstate', function () {
            if (R.open) closeReader(true);
        });
    }

    function setZoom(z) {
        R.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
        var ov = byId('pb-overlay');
        if (ov) ov.style.setProperty('--pb-zoom', String(R.zoom));
        var lbl = byId('pb-zoom-label');
        if (lbl) lbl.textContent = Math.round(R.zoom * 100) + '%';
    }

    function toggleFullscreen() {
        var ov = byId('pb-overlay');
        if (!ov) return;
        var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fsEl) {
            try {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            } catch (e) { /* diam */ }
            return;
        }
        var req = ov.requestFullscreen || ov.webkitRequestFullscreen;
        if (req) {
            try {
                var p = req.call(ov);
                if (p && p.catch) p.catch(function () { ov.classList.toggle('pb-fs-fallback'); });
            } catch (e) { ov.classList.toggle('pb-fs-fallback'); }
        } else {
            ov.classList.toggle('pb-fs-fallback');   // cadangan (mis. iOS Safari)
        }
    }

    function updateFsIcon() {
        var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        var b = byId('pb-btn-fs');
        if (b) b.innerHTML = fsEl ? SVG.compress : SVG.expand;
    }

    function showOverlay() {
        var ov = byId('pb-overlay');
        ov.classList.add('show');
        R.open = true;
        try { document.body.style.overflow = 'hidden'; } catch (e) { /* diam */ }
        try {
            history.pushState({ pbReader: true }, '');
            R.historyPushed = true;
        } catch (e) { R.historyPushed = false; }
    }

    function closeReader(fromPop) {
        if (!R.open) return;
        var ov = byId('pb-overlay');
        if (ov) ov.classList.remove('show');
        var d = byId('pb-drawer');
        if (d) d.classList.remove('open');
        R.open = false;
        try { document.body.style.overflow = ''; } catch (e) { /* diam */ }
        if (R.historyPushed && !fromPop) {
            try { history.back(); return; } catch (e) { /* diam */ }
        }
        R.historyPushed = false;
    }

    function stageHtml(html, cls) {
        var st = byId('pb-stage');
        st.innerHTML = '<div class="pb-sheet ' + (cls || '') + '">' + html + '</div>';
        return st.firstChild;
    }

    function setLoadingState(msg) {
        stageHtml(
            '<div class="pb-state pb-state--loading">' +
                '<div class="pb-spinner" aria-hidden="true"></div>' +
                '<div class="pb-state-title">Memuat dokumen…</div>' +
                '<div class="pb-state-desc">' + esc(msg || 'Mohon tunggu sejenak.') + '</div>' +
            '</div>', 'pb-sheet--flow'
        );
    }

    function showErrorState(title, desc, actions) {
        var btns = '';
        (actions || []).forEach(function (a) {
            btns += '<button class="pb-back" style="border:1px solid #e2e8f0;background:#fff;" data-act="' + a.act + '">' +
                    esc(a.label) + '</button>';
        });
        var el = stageHtml(
            '<div class="pb-state pb-state--error">' +
                '<div class="pb-state-icon">⚠️</div>' +
                '<div class="pb-state-title">' + esc(title) + '</div>' +
                '<div class="pb-state-desc">' + esc(desc) + '</div>' +
                '<div class="pb-state-actions">' + btns + '</div>' +
            '</div>', 'pb-sheet--flow'
        );
        el.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-act]');
            if (!b) return;
            var act = b.getAttribute('data-act');
            if (act === 'retry' && R.lastKey) openReader(R.lastKey);
            else if (act === 'close') closeReader();
            else if (act === 'login') { closeReader(); goToAdminLogin(); }
        });
    }

    function showEmptyState() {
        stageHtml(
            '<div class="pb-state pb-state--empty">' +
                '<div class="pb-state-icon">📖</div>' +
                '<div class="pb-state-title">Dokumen belum tersedia</div>' +
                '<div class="pb-state-desc">Isi panduan belum diunggah. Silakan hubungi administrator.</div>' +
            '</div>', 'pb-sheet--flow'
        );
    }

    function applyPalette(book) {
        var ov = byId('pb-overlay');
        var p = book.palet || {};
        if (p.primary) ov.style.setProperty('--pb-accent', p.primary);
        if (p.accent) ov.style.setProperty('--pb-accent', p.accent);
        if (p.primaryD) ov.style.setProperty('--pb-accent-d', p.primaryD);
    }

    /** Suntikkan CSS buku (sudah di-scope ke .pbb) satu kali per buku. */
    function ensureBookCss(book) {
        var sid = 'pb-book-css-' + (book.id || 'x');
        if (byId(sid)) return;
        var s = document.createElement('style');
        s.id = sid;
        s.textContent = book.css || '';
        document.head.appendChild(s);
    }

    function buildSheets(book) {
        var s = [{ t: 'cover' }, { t: 'toc' }];
        (book.bab || []).forEach(function (b) { s.push({ t: 'bab', b: b }); });
        s.push({ t: 'back' });
        return s;
    }

    function sheetLabel(i) {
        var sh = R.sheets[i];
        if (!sh) return '';
        if (sh.t === 'cover') return 'Sampul';
        if (sh.t === 'toc') return 'Daftar Isi';
        if (sh.t === 'bab') return 'Bab ' + sh.b.n;
        return 'Penutup';
    }

    function fitCover() {
        var frame = byId('pb-cover-frame');
        var scaleEl = byId('pb-cover-scale');
        var st = byId('pb-stage');
        if (!frame || !scaleEl || !st) return;
        var availW = st.clientWidth - 32;
        var availH = st.clientHeight - 150;
        var w = Math.max(200, Math.min(availW, availH * 794 / 1123, 760));
        var scale = w / 794;
        frame.style.width = w + 'px';
        frame.style.height = Math.round(w * 1123 / 794) + 'px';
        scaleEl.style.transform = 'scale(' + scale + ')';
    }

    function renderSheet(i) {
        var sh = R.sheets[i];
        var st = byId('pb-stage');
        st.scrollTop = 0;
        st.scrollLeft = 0;
        var title = byId('pb-top-title');
        if (title) title.textContent = R.book.judul || 'Panduan';

        if (sh.t === 'cover') {
            var el = stageHtml(
                '<div class="pb-cover-frame" id="pb-cover-frame">' +
                    '<div class="pbb pb-cover-scale" id="pb-cover-scale">' + R.book.cover + '</div>' +
                '</div>', 'pb-sheet--cover'
            );
            el.style.margin = 'auto';
            requestAnimationFrame(fitCover);
        } else if (sh.t === 'toc') {
            var items = '';
            (R.book.toc || []).forEach(function (t, k) {
                var babIdx = 2 + k;
                items +=
                    '<button class="pb-toc-item' + (R.idx === babIdx ? ' current' : '') + '" data-go="' + babIdx + '">' +
                        '<span class="pb-toc-num">' + (t.n < 10 ? '0' + t.n : t.n) + '</span>' +
                        '<span><span class="pb-toc-name">' + esc(t.judul) + '</span>' +
                        '<span class="pb-toc-desc" style="display:block">' + esc(t.desc) + '</span></span>' +
                        '<span class="pb-toc-arrow">' + SVG.chev + '</span>' +
                    '</button>';
            });
            var toc = stageHtml(
                '<div class="pb-toc-kick">Daftar Isi</div>' +
                '<h2 class="pb-toc-title">' + esc(R.book.judul || '') + '</h2>' +
                '<p class="pb-toc-sub">' + esc((R.book.toc || []).length) + ' bab · ' + esc(R.book.edisi || '') + '</p>' +
                '<div class="pb-toc-list">' + items + '</div>', 'pb-sheet--toc'
            );
            toc.addEventListener('click', function (e) {
                var b = e.target.closest('button[data-go]');
                if (b) goSheet(parseInt(b.getAttribute('data-go'), 10));
            });
        } else if (sh.t === 'bab') {
            stageHtml(
                '<div class="pbb pb-bookbody">' +
                    '<div class="main-content">' + sh.b.html + '</div>' +
                '</div>', 'pb-sheet--flow'
            );
        } else {
            stageHtml(
                '<div class="pb-back-logo">✓</div>' +
                '<div class="pb-back-title">Selesai membaca</div>' +
                '<div class="pb-back-sub">Anda telah membaca seluruh isi ' +
                    esc(R.book.judul || 'panduan') + '. Terima kasih telah menggunakan platform SIMBAKES.</div>' +
                '<button class="pb-back-btn" id="pb-back-hub">Kembali ke Petunjuk Penggunaan</button>', 'pb-sheet--back'
            );
            var bb = byId('pb-back-hub');
            if (bb) bb.addEventListener('click', function () { closeReader(); });
        }

        updateNav();
        updateDrawerCurrent();
    }

    function updateNav() {
        var total = R.sheets.length;
        var inp = byId('pb-pageinput');
        var tot = byId('pb-pagetotal');
        var prev = byId('pb-prev');
        var next = byId('pb-next');
        var prog = byId('pb-progress');
        if (inp) { inp.value = String(R.idx + 1); inp.min = '1'; inp.max = String(total); }
        if (tot) tot.textContent = String(total);
        if (prev) prev.disabled = R.idx <= 0;
        if (next) next.disabled = R.idx >= total - 1;
        if (prog) prog.style.width = (total <= 1 ? 100 : ((R.idx + 1) / total * 100)) + '%';
        var sub = byId('pb-drawer-sub');
        if (sub) sub.textContent = sheetLabel(R.idx) + ' · halaman ' + (R.idx + 1) + ' dari ' + total;
    }

    function updateDrawerCurrent() {
        var list = byId('pb-drawer-list');
        if (!list) return;
        list.querySelectorAll('.pb-drawer-item').forEach(function (it) {
            it.classList.toggle('current', parseInt(it.getAttribute('data-go'), 10) === R.idx);
        });
    }

    function buildDrawer(book) {
        var list = byId('pb-drawer-list');
        if (!list) return;
        var html =
            '<button class="pb-drawer-item" data-go="0"><span class="dn">S</span><span class="dt">Sampul</span></button>' +
            '<button class="pb-drawer-item" data-go="1"><span class="dn">i</span><span class="dt">Daftar Isi</span></button>';
        (book.toc || []).forEach(function (t, k) {
            var babIdx = 2 + k;
            html += '<button class="pb-drawer-item" data-go="' + babIdx + '">' +
                '<span class="dn">' + (t.n < 10 ? '0' + t.n : t.n) + '</span>' +
                '<span class="dt">' + esc(t.judul) + '</span></button>';
        });
        html += '<button class="pb-drawer-item" data-go="' + (R.sheets.length - 1) + '">' +
            '<span class="dn">✓</span><span class="dt">Penutup</span></button>';
        list.innerHTML = html;
        list.onclick = function (e) {
            var b = e.target.closest('button[data-go]');
            if (!b) return;
            var d = byId('pb-drawer');
            if (d && window.innerWidth < 900) d.classList.remove('open');
            goSheet(parseInt(b.getAttribute('data-go'), 10));
        };
        var sub = byId('pb-drawer-sub');
        if (sub) sub.textContent = book.judul || '';
    }

    function goSheet(i) {
        if (!R.sheets.length) return;
        var n = Math.max(0, Math.min(R.sheets.length - 1, i));
        if (n === R.idx && byId('pb-stage') && byId('pb-stage').querySelector('.pb-sheet')) {
            updateNav(); return;
        }
        R.idx = n;
        renderSheet(R.idx);
    }

    function openReader(key) {
        ensureReaderDom();
        R.lastKey = key;
        showOverlay();
        setLoadingState(key === 'admin'
            ? 'Memverifikasi akses dan menyiapkan dokumen panduan…'
            : 'Menyiapkan dokumen panduan…');

        var ready = (key === 'peserta')
            ? loadScript('panduan/peserta-data.js?v=' + V).then(function () { return getPesertaBook(); })
            : loadAdminBook();

        ready.then(function (book) {
            if (!R.open) return;
            if (!book || !book.bab || !book.bab.length) { showEmptyState(); return; }
            R.book = book;
            R.sheets = buildSheets(book);
            R.idx = 0;
            R.zoom = 1;
            setZoom(1);
            applyPalette(book);
            ensureBookCss(book);
            buildDrawer(book);
            renderSheet(0);
        }).catch(function (err) {
            if (!R.open) return;
            if (err && err.pbDenied) {
                showErrorState('Sesi Berakhir',
                    'Sesi Anda berakhir saat dokumen sedang dimuat. Silakan login kembali sebagai admin/operator.',
                    [{ act: 'login', label: 'Login Ulang' }, { act: 'close', label: 'Kembali' }]);
            } else {
                showErrorState('Dokumen Gagal Dimuat',
                    'Terjadi kendala saat memuat panduan. Periksa koneksi internet Anda, lalu coba lagi.',
                    [{ act: 'retry', label: 'Coba Lagi' }, { act: 'close', label: 'Kembali' }]);
            }
        });
    }

    // Sesuaikan skala cover saat ukuran layar berubah
    window.addEventListener('resize', function () {
        if (R.open && R.sheets[R.idx] && R.sheets[R.idx].t === 'cover') fitCover();
    });

    /* ============ INTEGRASI DENGAN APLIKASI ============ */
    // Muat gaya fitur (non-blocking)
    injectStylesheet('css/panduan.css?v=' + V);
    injectStylesheet('panduan/fonts.css?v=' + V);

    function onPageMaybeShown(pageId) {
        if (pageId === 'petunjuk') { initHub(); refreshAdminChip(); }
    }

    // Ikuti perpindahan halaman aplikasi (pola pembungkusan showPage
    // yang sama dipakai modul-modul lain: 03, 07, 13, 14).
    try {
        var origShowPage = window.showPage;
        if (typeof origShowPage === 'function') {
            window.showPage = function (pageId) {
                var r = origShowPage.apply(this, arguments);
                try { onPageMaybeShown(pageId); } catch (e) { /* diam */ }
                return r;
            };
        }
    } catch (e) { /* diam */ }

    // Saat halaman petunjuk sudah aktif saat modul dimuat
    try {
        var cur = document.querySelector('.page.active');
        if (cur && cur.id === 'page-petunjuk') { initHub(); refreshAdminChip(); }
    } catch (e) { /* diam */ }

    // Status login berubah (login/logout admin di sidebar) -> perbarui chip
    try {
        var badge = document.getElementById('admin-status-badge');
        if (badge && typeof MutationObserver !== 'undefined') {
            var deb = null;
            new MutationObserver(function () {
                clearTimeout(deb);
                deb = setTimeout(refreshAdminChip, 350);
            }).observe(badge, { childList: true, characterData: true, subtree: true });
        }
    } catch (e) { /* diam */ }

    // API publik kecil (untuk uji & integrasi menu lain bila diperlukan)
    window.SIMBAKES_PANDUAN = {
        openPeserta: openPesertaBook,
        openAdmin: openAdminBook,
        refreshStatus: refreshAdminChip,
        verdict: getAdminVerdict
    };
})();
