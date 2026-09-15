// ============================================
// SIMBAKES SUPABASE CONFIGURATION (HARDENED)
// ============================================
// Catatan keamanan:
// - URL + anon key Supabase memang dirancang PUBLIC (dipakai browser).
//   Keamanan data ada pada RLS + RPC di server (sql/SECURITY-HARDENING.sql).
// - TIDAK ADA service_role key / secret di file ini atau file lain.
// - Log console diminimalkan; hindari pencetakan data pribadi.
// ============================================

const SUPABASE_CONFIG = {
    url: 'https://boeknpvlfamjmddsdopd.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZWtucHZsZmFtam1kZHNkb3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzYwNjIsImV4cCI6MjEwMjA1MjA2Mn0.kHj7xEY7Wa4zSJwH0rjhiB3Qf0IHriyPlWoh4rdlv3U'
};

// Ekspos URL agar modul ber-IIFE (mis. ui-overhaul.js) dapat memakai URL asli
// tanpa mendeklarasikan ulang SUPABASE_CONFIG (yang akan memicu SyntaxError).
window.SIMBAKES_SUPABASE_URL = SUPABASE_CONFIG.url;

// Global Supabase Client
let supabaseClient = null;
let supabaseInitRetries = 0;
const MAX_SUPABASE_RETRIES = 3;

function initSupabaseClient() {
    try {
        // Cek apakah library supabase sudah dimuat
        if (typeof window.supabase === 'undefined') {
            if (supabaseInitRetries < MAX_SUPABASE_RETRIES) {
                supabaseInitRetries++;
                setTimeout(initSupabaseClient, 1000 * supabaseInitRetries);
                return false;
            }
            return false;
        }

        // Validasi konfigurasi
        if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey ||
            SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
            console.error('[SIMBAKES] Konfigurasi Supabase belum lengkap.');
            return false;
        }

        // Buat client (header sesi x-session-token disuntikkan oleh
        // SecurityGuard saat login, sehingga RLS mengenali sesi admin)
        var extraHeaders = {};
        try {
            if (window.SecurityGuard && window.SecurityGuard.getAdminToken()) {
                extraHeaders['x-session-token'] = window.SecurityGuard.getAdminToken();
            } else if (window.SecurityGuard && window.SecurityGuard.getPesertaToken()) {
                extraHeaders['x-session-token'] = window.SecurityGuard.getPesertaToken();
            }
        } catch (e) { /* abaikan */ }

        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
            global: { headers: extraHeaders }
        });

        return true;

    } catch (error) {
        if (supabaseInitRetries < MAX_SUPABASE_RETRIES) {
            supabaseInitRetries++;
            setTimeout(initSupabaseClient, 1000 * supabaseInitRetries);
        }
        return false;
    }
}

/**
 * Handler error Supabase — pesan untuk PENGGUNA selalu umum
 * (tidak membocorkan struktur DB, kode internal, atau stack trace).
 * Detail teknis hanya dicatat internal (tanpa data pribadi).
 */
function handleSupabaseError(error, operation, tableName) {
    try {
        console.error('[SIMBAKES] Gagal operasi data:', operation, tableName || '');
    } catch (e) { /* abaikan */ }

    // Petakan ke pesan ramah pengguna (tanpa detail teknis)
    let userMessage = 'Terjadi kesalahan. Silakan coba kembali.';
    const code = error && (error.code || '');
    const rawMsg = (error && error.message) || '';

    if (code === '42501' || code === '403' || rawMsg.includes('row-level security')) {
        userMessage = 'Anda tidak memiliki izin untuk operasi ini. Silakan masuk kembali atau hubungi administrator.';
    } else if (code === '23505' || rawMsg.includes('duplicate key')) {
        userMessage = 'Data sudah terdaftar. Gunakan nilai yang berbeda.';
    } else if (code === '401') {
        userMessage = 'Sesi tidak valid. Silakan masuk kembali.';
    }

    return {
        success: false,
        userFriendlyMessage: userMessage
        // Sengaja TIDAK mengembalikan error.message/code ke UI
    };
}

/**
 * Log operasi CRUD — versi aman: TANPA data pribadi/isi sesi.
 * (Dipertahankan demi kompatibilitas modul lain; kini hanya menandai operasi.)
 */
function debugCRUDLog(operation, table, details) {
    if (window.SIMBAKES_DEBUG === true) {
        console.log('[CRUD]', operation, table);
    }
}

/**
 * Pastikan Supabase client siap sebelum operasi database
 */
function ensureSupabaseClient() {
    if (!supabaseClient) {
        const success = initSupabaseClient();
        if (!success) {
            throw new Error('Koneksi database tidak tersedia. Periksa koneksi internet lalu muat ulang halaman.');
        }
    }
    return supabaseClient;
}

/**
 * RPC tahan-gagal: lewat supabase-js bila tersedia; bila TIDAK,
 * fallback ke fetch langsung ke PostgREST (tanpa library CDN).
 * Dipakai jalur login agar tidak bergantung pada CDN.
 * Melempar Error dengan .code (mis. PGRST202 = fungsi belum ada).
 */
async function simbakesRpc(functionName, params) {
    // Jalur 1: supabase-js (utama)
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const { data, error } = await supabaseClient.rpc(functionName, params);
        if (error) {
            const e = new Error(error.message || 'Gagal memanggil RPC.');
            e.code = error.code || '';
            throw e;
        }
        return data;
    }

    // Jalur 2: fetch langsung (cadangan tanpa library)
    const cfg = (typeof SUPABASE_CONFIG !== 'undefined') ? SUPABASE_CONFIG : null;
    if (!cfg || !cfg.url || !cfg.anonKey) {
        throw Object.assign(new Error('Koneksi database tidak tersedia. Muat ulang halaman.'), { code: 'NOCLIENT' });
    }
    const res = await fetch(cfg.url + '/rest/v1/rpc/' + encodeURIComponent(functionName), {
        method: 'POST',
        headers: {
            'apikey': cfg.anonKey,
            'Authorization': 'Bearer ' + cfg.anonKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(params || {})
    });
    const text = await res.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch (e) { payload = null; }
    if (!res.ok) {
        const e = new Error((payload && payload.message) || ('HTTP ' + res.status));
        e.code = (payload && payload.code) || ('HTTP' + res.status);
        e.httpStatus = res.status;
        throw e;
    }
    return payload;
}

// Inisialisasi saat DOM siap
document.addEventListener('DOMContentLoaded', function() {
    initSupabaseClient();
});

// Cadangan: coba lagi saat window load
window.addEventListener('load', function() {
    if (!supabaseClient) {
        initSupabaseClient();
    }
});
