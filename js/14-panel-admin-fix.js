// ============================================================
// SIMBAKES - MODUL 14: PANEL ADMIN FIX
// Memperbaiki Panel Admin yang "hilang semua" setelah refresh.
//
// LATAR BELAKANG (bug bawaan template - dua sistem auth bertabrakan):
// - Modul 02 (auth-navigation) menyimpan sesi login admin dengan format
//   { user: {...}, timestamp } ke localStorage "simbakes_admin_session".
// - Modul 12 (multiuser-init) saat halaman dimuat membaca key yang SAMA
//   dan MENGHARUSKAN format { isLoggedIn: true, expiresAt }.
//   Format modul 02 dianggap tidak valid -> SESSI DIHAPUS.
// - Akibatnya: setiap refresh halaman, login admin lenyap; menu admin di
//   sidebar hilang; form login sidebar disembunyikan CSS (desain login
//   via topbar) sehingga section "Panel Admin" tampak kosong total.
//
// SOLUSI (aditif - tidak mengubah modul lama):
// 1. Saat skrip ini dieksekusi (sebelum DOMContentLoaded): satukan kedua
//    format sesi di localStorage agar modul 12 tidak menghapus sesi sah.
// 2. Setelah DOM siap: pulihkan state login (currentAdminUser) dan tampilkan
//    UI admin sidebar sejak awal, tanpa perlu login ulang/klik ulang.
// 3. Wrapper toggleSection: mengklik "Panel Admin" saat belum login langsung
//    membuka overlay login (konsisten dengan pola halaman terlindung).
// 4. Wrapper showPage untuk halaman admin lama (data-pengusul, data-roadmap,
//    data-penetapan): pulihkan sesi dulu sebelum cek auth sehingga penolakan
//    "klik pertama setelah refresh" tidak terjadi lagi.
// ============================================================

(function () {
    'use strict';

    var SESSION_KEY = 'simbakes_admin_session';
    var SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 jam (sama dengan modul 02)
    var OLD_ADMIN_PAGES = ['data-pengusul', 'data-roadmap', 'data-penetapan'];

    // --------------------------------------------------------
    // Util dasar
    // --------------------------------------------------------
    function readRawSession() {
        try {
            var raw = localStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function writeSession(s) {
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* kuota penuh dsb */ }
    }

    function isFuture(iso) {
        var t = new Date(iso).getTime();
        return !isNaN(t) && t > Date.now();
    }

    // --------------------------------------------------------
    // 1) NORMALISASI SESI: gabungkan format modul 02 & modul 12
    //    -> keduanya bisa membaca sesi yang sama tanpa saling hapus.
    // --------------------------------------------------------
    function normalizeAdminSession() {
        var s = readRawSession();
        if (!s) return null;

        // Ambil objek user dari berbagai kemungkinan bentuk
        var u = s.user || null;

        // Validus kedaluwarsa: utamakan expiresAt, fallback ke timestamp + 8 jam
        var expired = false;
        if (s.expiresAt) {
            expired = !isFuture(s.expiresAt);
        } else if (s.timestamp) {
            expired = (Date.now() - s.timestamp) >= SESSION_DURATION;
        } else {
            expired = true; // tidak ada penanda waktu sama sekali
        }
        if (expired) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }

        var changed = false;

        // Lengkapi sisi modul 12 (isLoggedIn, expiresAt, identitas ringkas)
        if (!s.isLoggedIn) { s.isLoggedIn = true; changed = true; }
        if (!s.expiresAt) {
            var base = s.timestamp || Date.now();
            s.expiresAt = new Date(base + SESSION_DURATION).toISOString();
            changed = true;
        }
        if (!s.userRole && u) { s.userRole = u.userRole || u.role || 'superadmin'; changed = true; }
        if (!s.nama && u) { s.nama = u.name || u.nama || u.username || 'Admin'; changed = true; }
        if (!s.userId && u) { s.userId = u.id || u.userId || null; changed = true; }

        // Lengkapi sisi modul 02 (objek .user + timestamp)
        if (!u) {
            var role = s.userRole || 'superadmin';
            u = {
                id: s.userId || null,
                username: s.username || s.nama || 'admin',
                email: s.email || '',
                name: s.nama || s.username || 'Admin',
                role: role,
                userRole: role,
                avatar: (typeof getAvatarForRole === 'function') ? getAvatarForRole(role) : '👤',
                institusi: '',
                loginTime: s.loginTime || new Date().toISOString(),
                source: s.source || 'session_restore'
            };
            s.user = u;
            changed = true;
        }
        if (!s.timestamp) { s.timestamp = Date.now(); changed = true; }

        if (changed) writeSession(s);
        return s;
    }

    // --------------------------------------------------------
    // 2) PULIHKAN UI ADMIN (currentAdminUser + sidebar menu)
    // --------------------------------------------------------
    function restoreAdminPanel() {
        var s = normalizeAdminSession();
        if (!s) return false;

        // Jalur resmi: initAuthState milik modul 02 memulihkan state & UI
        var restored = false;
        if (typeof initAuthState === 'function') {
            try { restored = initAuthState() === true; } catch (e) { restored = false; }
        }

        // Fallback: bila modul 02 belum mengenali sesi, pulihkan manual
        var authOk = (typeof isAdminAuthenticated === 'function') && isAdminAuthenticated();
        if (!authOk) {
            try {
                /* global currentAdminUser */
                currentAdminUser = s.user;
                if (typeof showLoggedInUI === 'function') showLoggedInUI(s.user);
                authOk = true;
                console.log('[PANEL FIX] ✅ Sesi admin dipulihkan (jalur cadangan):', s.user.name);
            } catch (e) { /* biarkanUI default */ }
        } else if (!restored) {
            console.log('[PANEL FIX] ✅ Sesi admin dipulihkan via initAuthState');
        }
        return authOk;
    }

    // --------------------------------------------------------
    // 3) WRAPPER toggleSection: Panel Admin diklik saat belum login
    //    -> pulihkan sesi bila ada; kalau benar2 belum login, buka
    //       overlay login (jangan biarkan section kosong tanpa pesan).
    // --------------------------------------------------------
    function wrapToggleSection() {
        if (typeof window.toggleSection !== 'function') return;
        var orig = window.toggleSection;
        window.toggleSection = function (section) {
            var result = orig.apply(this, arguments);
            if (section === 'admin') {
                var authOk = (typeof isAdminAuthenticated === 'function') && isAdminAuthenticated();
                if (!authOk) authOk = restoreAdminPanel(); // coba pulihkan sesi dulu
                if (!authOk) {
                    var lp = document.getElementById('login-page');
                    if (lp) lp.classList.remove('hidden');
                    if (typeof showToast === 'function') {
                        showToast('🔑 Silakan login lewat form yang terbuka untuk masuk Panel Admin', 'info', 4000);
                    }
                }
            }
            return result;
        };
    }

    // --------------------------------------------------------
    // 4) WRAPPER showPage untuk halaman admin lama:
    //    pulihkan sesi SEBELUM cek auth (anti "klik pertama ditolak").
    //    (Halaman data-akun-peserta sudah ditangani modul 13.)
    // --------------------------------------------------------
    function wrapShowPage() {
        if (typeof window.showPage !== 'function') return;
        var orig = window.showPage;
        window.showPage = function (pageId) {
            if (OLD_ADMIN_PAGES.indexOf(pageId) !== -1) {
                var authOk = (typeof isAdminAuthenticated === 'function') && isAdminAuthenticated();
                if (!authOk) authOk = restoreAdminPanel();
                if (!authOk && typeof isAdminAuthenticated === 'function' && !isAdminAuthenticated()) {
                    if (typeof showToast === 'function') {
                        showToast('🔐 Silakan login untuk mengakses Panel Admin', 'error', 3000);
                    }
                    var lp = document.getElementById('login-page');
                    if (lp) lp.classList.remove('hidden');
                    return; // blok sebelum showPage lama (yang cek-nya di ujung)
                }
            }
            return orig.apply(this, arguments);
        };
    }

    // --------------------------------------------------------
    // 5) RAPIKAN BADGE "PANEL ADMIN": teks role (mis. "👑 Superadmin")
    //    lebih panjang dari pil "Login" bawaan -> jangan menumpuk label.
    // --------------------------------------------------------
    function injectBadgeCss() {
        if (document.getElementById('panel-fix-badge-style')) return;
        var st = document.createElement('style');
        st.id = 'panel-fix-badge-style';
        st.textContent = '#admin-status-badge{white-space:nowrap;max-width:104px;overflow:hidden;' +
            'text-overflow:ellipsis;display:inline-block;vertical-align:middle;line-height:1.4;}';
        document.head.appendChild(st);
    }

    // --------------------------------------------------------
    // 6) PERBAIKI KARTU DASHBOARD YANG "0": renderDashboard bawaan
    //    berjalan sebelum client Supabase selesai dibuat (urutan
    //    DOMContentLoaded bawaan template), sehingga kartu terisi
    //    dummy 0. Begitu client siap, render ulang sekali saja.
    // --------------------------------------------------------
    function fixDashboardZeros() {
        var tries = 0;
        var timer = setInterval(function () {
            tries++;
            var clientReady = (typeof supabaseClient !== 'undefined') && !!supabaseClient;
            var el = document.getElementById('stat-total');
            var val = el ? el.textContent.trim() : '';
            var looksDummy = (val === '0' || val === '' || val === '-');
            if (clientReady && looksDummy && typeof renderDashboard === 'function') {
                clearInterval(timer);
                try {
                    renderDashboard();
                    console.log('[PANEL FIX] 📊 Statistik dashboard dirender ulang setelah client Supabase siap');
                } catch (e) { /* abaikan */ }
            } else if (tries >= 20 || (clientReady && !looksDummy)) {
                clearInterval(timer);
            }
        }, 700);
    }

    // --------------------------------------------------------
    // BOOTSTRAP
    // --------------------------------------------------------
    // (a) NORMALISASI SEKARANG juga: skrip ini dimuat SETELAH modul 12
    //     tetapi SEBELUM DOMContentLoaded, sehingga sesi sudah berformat
    //     gabungan ketika initSimbakesAuth (modul 12) berjalan.
    normalizeAdminSession();

    // (b) Setelah DOM siap (dan setelah init modul 12): pulihkan UI admin
    //     sejak awal + pasang wrapper.
    function boot() {
        setTimeout(function () {
            restoreAdminPanel();
            wrapToggleSection();
            wrapShowPage();
            injectBadgeCss();
            fixDashboardZeros();
            console.log('[PANEL FIX] 🛡️ Modul Panel Admin Fix aktif (sesi tahan refresh)');
        }, 0);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // Ekspor untuk pemakaian manual di console (debugging)
    window.simbaRestoreAdminPanel = restoreAdminPanel;
    window.simbaNormalizeAdminSession = normalizeAdminSession;
})();
