/**
 * SIMBAKES - Supabase Configuration
 * Beasiswa Tematik Bidang Kesehatan
 * 
 * ============================================================
 * PENTING: Ganti nilai di bawah ini dengan credentials Supabase Anda
 * ============================================================
 * 
 * Cara mendapatkan credentials:
 * 1. Login ke https://supabase.com
 * 2. Buat project baru atau pilih existing project
 * 3. Buka Settings > API
 * 4. Copy Project URL dan Anon/Public Key
 * 
 * Security Note:
 * - Anon key aman digunakan di frontend (dengan RLS enabled)
 * - Jangan gunakan Service Role key di frontend!
 */

// Supabase Configuration Object
const SUPABASE_CONFIG = {
    // URL proyek Supabase Anda (format: https://xxxxx.supabase.co)
    url: 'https://boeknpvlfamjmddsdopd.supabase.co',
    
    // Anon/ Public key (aman untuk frontend)
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZWtucHZsZmFtam1kZHNkb3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzYwNjIsImV4cCI6MjEwMjA1MjA2Mn0.kHj7xEY7Wa4zSJwH0rjhiB3Qf0IHriyPlWoh4rdlv3U',
    
    // Opsi konfigurasi tambahan
    options: {
        auth: {
            // Session storage: localStorage atau sessionStorage
            storage: window.sessionStorage,
            
            // Auto-refresh token sebelum expired
            autoRefreshToken: true,
            
            // Persist session (jika true, gunakan localStorage)
            persistSession: false,
            
            // Detect session dari URL (untuk OAuth/magic link)
            detectSessionInUrl: true
        },
        
        // Global headers (opsional)
        // headers: {
        //     'X-Custom-Header': 'SIMBAKES'
        // }
    }
};

/**
 * Validasi konfigurasi saat load
 */
function validateSupabaseConfig() {
    const errors = [];
    
    if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
        errors.push('Supabase URL belum dikonfigurasi');
    }
    
    if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        errors.push('Supabase Anon Key belum dikonfigurasi');
    }
    
    if (errors.length > 0) {
        console.warn('⚠️ SIMBAKES Config Warning:');
        errors.forEach(err => console.warn(`  - ${err}`));
        console.warn('\nSilakan edit config/supabase-config.js dan masukkan credentials Anda.');
        return false;
    }
    
    return true;
}

// Export untuk penggunaan global
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.validateSupabaseConfig = validateSupabaseConfig;
