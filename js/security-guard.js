// ============================================================
// SIMBAKES — SECURITY GUARD (Modul Keamanan Inti)
// ============================================================
// Tugas modul ini:
//   1. IDLE TIMEOUT 15 MENIT  : mousemove, click, keyboard, scroll,
//      touch, dan navigasi dalam aplikasi dihitung sebagai aktivitas.
//      Tanpa aktivitas 15 menit penuh -> sesi dihentikan, token
//      dicabut di server, state dibersihkan, redirect ke
//      https://mukminnasri.com/ dengan pesan singkat.
//   2. VALIDASI SESI KE SERVER: setiap halaman dibuka (tab baru,
//      refresh, direct URL, bookmark, duplicate tab), saat kembali
//      online, saat tab kembali aktif, dan heartbeat berkala —
//      status login TIDAK dipercaya dari localStorage saja.
//   3. LOGOUT AMAN           : revoke token di server, hapus state,
//      hentikan timer, blokir tombol Back ke halaman protected.
//
// Modul ini TIDAK mengubah desain/menu/fungsi aplikasi.
// ============================================================

(function () {
    'use strict';

    // ---------------- KONFIGURASI ----------------
    var IDLE_LIMIT_MS   = 15 * 60 * 1000;          // 15 menit (spesifikasi)
    var CHECK_EVERY_MS  = 15 * 1000;               // pemeriksaan idle tiap 15 detik
    var HEARTBEAT_MS    = 5 * 60 * 1000;           // validasi server tiap 5 menit saat aktif
    var REDIRECT_URL    = 'https://mukminnasri.com/';
    var MSG_IDLE        = 'Sesi Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Silakan masuk kembali.';
    var MSG_EXPIRED     = 'Sesi Anda telah berakhir. Silakan masuk kembali.';
    var MSG_OFFLINE     = 'Koneksi internet terputus. Sesi akan divalidasi ulang saat koneksi kembali.';

    var TOKEN_KEY_ADMIN   = 'simbakes_session_token';
    var TOKEN_KEY_PESERTA = 'simbakes_peserta_token';

    // ---------------- STATE ----------------
    var lastActivity    = Date.now();
    var idleTimer       = null;
    var heartbeatTimer  = null;
    var adminValidated  = false;
    var pesertaValidated= false;
    var validating      = false;
    var loggingOut      = false;
    var legacyModeWarned= false;

    // ---------------- UTIL ----------------
    function isDebug() {
        try {
            return window.SIMBAKES_DEBUG === true ||
                   window.location.search.indexOf('debug=1') !== -1;
        } catch (e) { return false; }
    }

    // Hygiene console: sembunyikan log rutin (yang kadang memuat data
    // pribadi) pada produksi. console.error tetap tampil.
    // Aktifkan kembali dengan ?debug=1 di URL.
    (function consoleHygiene() {
        if (isDebug()) return;
        try {
            var noop = function () {};
            ['log', 'info', 'debug'].forEach(function (m) {
                var orig = console[m];
                console[m] = function () {
                    if (window.SIMBAKES_DEBUG === true && orig) orig.apply(console, arguments);
                    /* diam pada produksi */
                };
                console[m].__orig = orig;
            });
        } catch (e) { /* abaikan */ }
    })();

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeSet(key, val) {
        try { localStorage.setItem(key, val); } catch (e) { /* kuota */ }
    }
    function safeRemove(key) {
        try { localStorage.removeItem(key); } catch (e) {}
        try { sessionStorage.removeItem(key); } catch (e) {}
    }

    function clientReady() {
        return typeof supabaseClient !== 'undefined' && supabaseClient !== null;
    }

    function waitForClient(cb, tries) {
        tries = tries || 0;
        if (clientReady()) { cb(true); return; }
        if (tries > 20) { cb(false); return; }   // ~10 detik
        setTimeout(function () { waitForClient(cb, tries + 1); }, 500);
    }

    function isRpcMissing(err) {
        if (!err) return false;
        var msg = (err.message || '') + ' ' + (err.code || '');
        return err.code === 'PGRST202' ||
               msg.indexOf('Could not find the function') !== -1 ||
               msg.indexOf('schema cache') !== -1 && msg.indexOf('app_') !== -1;
    }

    // ---------------- AKTIVITAS PENGGUNA ----------------
    function registerActivity() {
        lastActivity = Date.now();
    }

    function attachActivityListeners() {
        var opts = { capture: true, passive: true };
        ['mousemove', 'mousedown', 'click', 'keydown', 'scroll',
         'touchstart', 'touchmove', 'wheel'].forEach(function (ev) {
            window.addEventListener(ev, registerActivity, opts);
        });
        // Aktivitas navigasi di dalam aplikasi (SPA showPage)
        var lastNav = 0;
        var origShowPage = window.showPage;
        if (typeof origShowPage === 'function') {
            window.showPage = function () {
                var now = Date.now();
                if (now - lastNav > 1000) {   // throttle
                    lastNav = now;
                    registerActivity();
                }
                return origShowPage.apply(this, arguments);
            };
        }
    }

    // ---------------- IDLE CHECKER ----------------
    function hasActiveSession() {
        return !!(safeGet(TOKEN_KEY_ADMIN) || safeGet(TOKEN_KEY_PESERTA) ||
                  (typeof currentAdminUser !== 'undefined' && currentAdminUser) ||
                  (typeof pesertaSessionData !== 'undefined' && pesertaSessionData));
    }

    function checkIdle() {
        if (loggingOut) return;
        if (!hasActiveSession()) return;         // belum login: tidak ada yang di-timeout
        var idleFor = Date.now() - lastActivity;
        if (idleFor >= IDLE_LIMIT_MS) {
            forceLogout('idle');
        }
    }

    // ---------------- VALIDASI SERVER ----------------
    function validateToken(token) {
        return new Promise(function (resolve) {
            if (!token || !clientReady()) { resolve(null); return; }
            supabaseClient.rpc('app_validate_session', { p_token: token })
                .then(function (res) {
                    if (res.error) {
                        if (isRpcMissing(res.error)) {
                            resolve({ __legacy: true });   // SQL belum dijalankan
                        } else {
                            resolve(null);
                        }
                        return;
                    }
                    resolve(res.data || null);
                })
                .catch(function () { resolve(null); });
        });
    }

    function validateAdminSession(force) {
        if (validating && !force) return Promise.resolve(false);
        validating = true;
        var token = safeGet(TOKEN_KEY_ADMIN);

        var p;
        if (!token) {
            // Tidak ada token -> tidak boleh percaya sesi localStorage.
            var hadUser = (typeof currentAdminUser !== 'undefined' && currentAdminUser);
            adminValidated = false;
            p = Promise.resolve(null);
            if (hadUser) {
                validating = false;
                forceLogout('expired');
                return Promise.resolve(false);
            }
        } else {
            p = validateToken(token).then(function (data) {
                if (data && data.__legacy) {
                    // RPC belum tersedia (SQL belum dijalankan):
                    // mode kompatibilitas, jangan merusak aplikasi.
                    adminValidated = true;
                    if (!legacyModeWarned) {
                        legacyModeWarned = true;
                        console.error('[SECURITY] ⚠️ RPC keamanan belum ditemukan. ' +
                            'Jalankan sql/SECURITY-HARDENING.sql di Supabase SQL Editor.');
                    }
                    return true;
                }
                if (data && data.valid) {
                    adminValidated = true;
                    // Sinkronkan profil terbaru dari server (sumber kebenaran)
                    if (typeof currentAdminUser !== 'undefined' && currentAdminUser && data.profile) {
                        currentAdminUser.role = data.profile.role || currentAdminUser.role;
                        currentAdminUser.name = data.profile.name || currentAdminUser.name;
                    }
                    return true;
                }
                return false;
            });
        }

        return p.then(function (ok) {
            validating = false;
            if (ok === false) {
                forceLogout('expired');
            }
            return ok === true;
        }).catch(function () { validating = false; return false; });
    }

    function validatePesertaSession() {
        var token = safeGet(TOKEN_KEY_PESERTA);
        if (!token) {
            if (typeof pesertaSessionData !== 'undefined' && pesertaSessionData) {
                pesertaSessionData = null;
            }
            pesertaValidated = false;
            return Promise.resolve(false);
        }
        return validateToken(token).then(function (data) {
            if (data && data.__legacy) { pesertaValidated = true; return true; }
            if (data && data.valid) {
                pesertaValidated = true;
                if (typeof pesertaSessionData !== 'undefined' && data.profile) {
                    pesertaSessionData = data.profile;
                }
                return true;
            }
            pesertaValidated = false;
            return false;
        });
    }

    function validateNow() {
        return Promise.all([validateAdminSession(false), validatePesertaSession()]);
    }

    // ---------------- CLIENT DENGAN HEADER SESI ----------------
    // Sisipkan token sesi ke header setiap request Supabase (x-session-token)
    // sehingga policy RLS di server dapat memvalidasi role.
    function applySessionHeader() {
        try {
            if (typeof window.supabase === 'undefined' ||
                typeof SUPABASE_CONFIG === 'undefined') return;
            var headers = {};
            var tAdmin   = safeGet(TOKEN_KEY_ADMIN);
            var tPeserta = safeGet(TOKEN_KEY_PESERTA);
            if (tAdmin)   headers['x-session-token'] = tAdmin;
            if (tPeserta && !headers['x-session-token']) headers['x-session-token'] = tPeserta;
            supabaseClient = window.supabase.createClient(
                SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, { global: { headers: headers } }
            );
        } catch (e) { /* biarkan client lama */ }
    }

    // ---------------- LOGOUT AMAN ----------------
    function revokeServer(token) {
        if (!token || !clientReady()) return;
        try {
            supabaseClient.rpc('app_logout', { p_token: token }).catch(function () {});
        } catch (e) { /* abaikan */ }
    }

    function clearSensitiveState() {
        // Token & sesi
        safeRemove(TOKEN_KEY_ADMIN);
        safeRemove(TOKEN_KEY_PESERTA);
        safeRemove('simbakes_admin_session');
        safeRemove('simbakes_peserta_session');
        safeRemove('simbakes_user_role');
        safeRemove('simbakes_login_time');
        safeRemove('simbakes_return_page');
        // Data aplikasi yang bersifat sensitif
        safeRemove('simbakes_applications');
        // State in-memory
        try { currentAdminUser = null; } catch (e) {}
        try { pesertaSessionData = null; } catch (e) {}
        if (typeof window.submissionsData !== 'undefined') window.submissionsData = [];
    }

    function resetAuthUI() {
        try {
            var lf = document.getElementById('admin-login-form');
            var am = document.getElementById('admin-menu');
            var ib = document.getElementById('admin-info-bar');
            var sb = document.getElementById('admin-status-badge');
            if (lf) lf.style.display = 'block';
            if (am) am.style.display = 'none';
            if (ib) ib.classList.remove('visible');
            if (sb) { sb.textContent = 'Login'; sb.className = 'badge-login'; }
            if (typeof resetTopbarAfterLogout === 'function') resetTopbarAfterLogout();
            // Tutup overlay peserta bila terbuka
            var dash = document.getElementById('peserta-dashboard-overlay');
            if (dash) dash.classList.remove('show');
            document.body.style.overflow = '';
        } catch (e) { /* abaikan */ }
    }

    function showLogoutOverlay(message) {
        try {
            var overlay = document.createElement('div');
            overlay.id = 'simbakes-session-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(15,23,42,0.94);' +
                'display:flex;align-items:center;justify-content:center;font-family:Tahoma,Arial,sans-serif;';
            overlay.innerHTML =
                '<div style="max-width:420px;margin:1rem;background:#ffffff;border-radius:18px;padding:2rem;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.35);">' +
                '<div style="width:64px;height:64px;margin:0 auto 1rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;background:linear-gradient(135deg,#dcfce7,#d1fae5);">🔒</div>' +
                '<h3 style="margin:0 0 0.5rem;color:#0f172a;font-size:1.05rem;">Sesi Berakhir</h3>' +
                '<p id="simbakes-session-overlay-msg" style="margin:0;color:#475569;font-size:0.9rem;line-height:1.6;"></p>' +
                '<p style="margin:1rem 0 0;color:#94a3b8;font-size:0.75rem;">Anda akan diarahkan ke halaman utama…</p>' +
                '</div>';
            document.body.appendChild(overlay);
            var msgEl = document.getElementById('simbakes-session-overlay-msg');
            if (msgEl) msgEl.textContent = message;   // textContent = anti-XSS
        } catch (e) { /* abaikan */ }
    }

    function forceLogout(reason) {
        if (loggingOut) return;
        loggingOut = true;

        // 1) Cabut sesi di SERVER (jangan hanya redirect)
        revokeServer(safeGet(TOKEN_KEY_ADMIN));
        revokeServer(safeGet(TOKEN_KEY_PESERTA));

        // 2) Hentikan timer & listener rutin
        if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }

        // 3) Bersihkan data sensitif dari state aplikasi
        clearSensitiveState();
        try { sessionStorage.setItem('simbakes_logout_trap', String(Date.now())); } catch (e) {}

        // 4) Reset UI
        resetAuthUI();

        // 5) Pesan singkat lalu redirect (replace: tombol Back tidak
        //    membawa pengguna kembali ke halaman protected)
        var message = reason === 'idle' ? MSG_IDLE
                    : reason === 'offline' ? MSG_OFFLINE
                    : MSG_EXPIRED;
        showLogoutOverlay(message);

        setTimeout(function () {
            try {
                window.location.replace(REDIRECT_URL);
            } catch (e) {
                window.location.href = REDIRECT_URL;
            }
        }, 2600);
    }

    // ---------------- API PUBLIK ----------------
    var SecurityGuard = {

        /** Simpan sesi admin (dipanggil setelah login sukses via RPC) */
        setAdminSession: function (token, profile) {
            safeSet(TOKEN_KEY_ADMIN, token);
            adminValidated = true;
            lastActivity = Date.now();
            applySessionHeader();
            SecurityGuard.ensureTimers();
        },

        /** Simpan sesi peserta */
        setPesertaSession: function (token, profile) {
            safeSet(TOKEN_KEY_PESERTA, token);
            pesertaValidated = true;
            lastActivity = Date.now();
            applySessionHeader();
            SecurityGuard.ensureTimers();
        },

        getAdminToken:   function () { return safeGet(TOKEN_KEY_ADMIN); },
        getPesertaToken: function () { return safeGet(TOKEN_KEY_PESERTA); },

        isAdminValidated:   function () { return adminValidated; },
        isPesertaValidated: function () { return pesertaValidated; },

        registerActivity: registerActivity,

        /** Validasi ulang sekarang (dipakai saat online kembali dsb.) */
        validateNow: function () { return validateNow(); },

        /** Logout manual dari UI */
        logout: function () { forceLogout('manual'); },

        /** Pasang/jalankan timer idle & heartbeat */
        ensureTimers: function () {
            if (!idleTimer)      idleTimer      = setInterval(checkIdle, CHECK_EVERY_MS);
            if (!heartbeatTimer) heartbeatTimer = setInterval(function () {
                if (document.visibilityState !== 'visible') return;
                if (!navigator.onLine) return;
                if (!hasActiveSession()) return;
                validateNow();
            }, HEARTBEAT_MS);
        },

        /** Akses internal (debug) */
        _forceLogout: forceLogout
    };

    window.SecurityGuard = SecurityGuard;

    // ---------------- EVENT JARINGAN & TAB ----------------
    // (B) Saat browser pertama kali mendapatkan koneksi internet:
    // validasi ulang status autentikasi ke server.
    window.addEventListener('online', function () {
        if (loggingOut) return;
        if (hasActiveSession()) {
            validateNow().then(function (results) {
                var adminOk = results[0], pesertaOk = results[1];
                if (!adminOk && !pesertaOk && hasActiveSession()) {
                    forceLogout('expired');
                }
            });
        }
    });

    // Saat tab kembali aktif / bfcache (Back-Forward cache):
    // validasi ulang agar tombol Back tidak menghidupkan sesi mati.
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && !loggingOut && hasActiveSession()) {
            validateNow();
        }
    });

    window.addEventListener('pageshow', function (e) {
        if (loggingOut) return;
        if (e && e.persisted) {
            // Halaman dipulihkan dari bfcache — sesi WAJIB divalidasi ulang
            if (hasActiveSession()) {
                validateNow().then(function (results) {
                    if (!results[0] && !results[1] && hasActiveSession()) {
                        forceLogout('expired');
                    }
                });
            } else {
                resetAuthUI();
            }
        }
    });

    // ---------------- BOOT ----------------
    function boot() {
        attachActivityListeners();

        waitForClient(function (ok) {
            if (!ok) {
                // Client gagal terbuat (offline / CDN blokir):
                // jangan pecah aplikasi; validasi akan terjadi saat online.
                SecurityGuard.ensureTimers();
                return;
            }

            var hadAdmin   = !!safeGet(TOKEN_KEY_ADMIN);
            var hadPeserta = !!safeGet(TOKEN_KEY_PESERTA);

            // Terapkan header token agar RLS server mengenali sesi
            if (hadAdmin || hadPeserta) applySessionHeader();

            if (hadAdmin || hadPeserta) {
                // Sesi ditemukan -> WAJIB divalidasi ke server (tab baru,
                // refresh, duplicate tab, direct URL, bookmark).
                validateNow().then(function (results) {
                    if (!results[0] && !results[1]) {
                        // Token tidak sah / sudah kedaluwarsa di server
                        forceLogout('expired');
                    } else {
                        SecurityGuard.ensureTimers();
                    }
                });
            } else {
                // Sesi localStorage admin/peserta TANPA token:
                // dibuat oleh versi lama / dimanipulasi -> tidak dipercaya.
                var staleAdmin = safeGet('simbakes_admin_session');
                var stalePes   = safeGet('simbakes_peserta_session');
                if (staleAdmin || stalePes) {
                    safeRemove('simbakes_admin_session');
                    safeRemove('simbakes_peserta_session');
                    try { currentAdminUser = null; } catch (e) {}
                    try { pesertaSessionData = null; } catch (e) {}
                    resetAuthUI();
                }
                SecurityGuard.ensureTimers();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
