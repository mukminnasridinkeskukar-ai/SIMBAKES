/**
 * ============================================
 * SIMBAKES - Supabase Configuration
 * ============================================
 * 
 * File ini berisi konfigurasi koneksi ke Supabase.
 * 
 * ⚠️ PENTING: Untuk production, gunakan environment variables
 * atau server-side rendering untuk menyembunyikan API key.
 * 
 * Untuk GitHub Pages static site, ANON key aman digunakan
 * karena sudah dilindungi oleh Row Level Security (RLS).
 */

const SUPABASE_CONFIG = {
    // ====== SUPABASE URL ======
    // Ganti dengan URL project Supabase Anda
    // Format: https://xxxxxxxxxxxxx.supabase.co
    URL: 'https://boeknpvlfamjmddsdopd.supabase.co',
    
    // ====== SUPABASE ANON (PUBLIC) KEY ======
    // Ganti dengan anon/public key dari project Supabase Anda
    // Ditemukan di: Project Settings > API > Project API keys > public anon key
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZWtucHZsZmFtam1kZHNkb3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzYwNjIsImV4cCI6MjEwMjA1MjA2Mn0.kHj7xEY7Wa4zSJwH0rjhiB3Qf0IHriyPlWoh4rdlv3U',
    
    // ====== OPTIONAL: SERVICE ROLE KEY (Hanya untuk admin) ======
    // ⚠️ JANGAN gunakan di client-side production!
    // Key ini memiliki akses penuh bypass RLS
    SERVICE_ROLE_KEY: '',  // Kosongkan jika tidak digunakan
    
    // ====== CONFIGURATION OPTIONS ======
    OPTIONS: {
        // Auth configuration
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        },
        // Database configuration
        db: {
            schema: 'public'
        },
        // Realtime configuration (untuk live updates)
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    },
    
    // ====== TABLE NAMES ======
    TABLES: {
        // Tabel Pengusulan Beasiswa
        PENgUSULAN: 'pengusulan',
        
        // Tabel Penetapan Penerima
        PENETAPAN: 'penetapan',
        
        // Tabel Roadmap Kebutuhan
        ROADMAP: 'roadmap_kebutuhan',
        
        // Tabel Users/Pemohon
        USERS: 'users',
        
        // Tabel Dokumen
        DOKUMEN: 'dokumen',
        
        // Tabel Informasi/Update News
        INFORMASI: 'informasi_update',
        
        // Tabel Activity Log
        ACTIVITY_LOG: 'activity_log'
    },
    
    // ====== STATUS CONSTANTS ======
    STATUS: {
        // Status Pengusulan
        USULAN: {
            DRAFT: 'draft',
            SUBMITTED: 'submitted',
            REVIEW: 'review',
            APPROVED: 'approved',
            REJECTED: 'rejected',
            WITHDRAWN: 'withdrawn'
        },
        
        // Status Penetapan
        PENETAPAN: {
            PENDING: 'pending',
            PROCESSING: 'processing',
            DISBURSED: 'disbursed',
            CANCELLED: 'cancelled',
            SUSPENDED: 'suspended'
        },
        
        // Status Dokumen
        DOKUMEN: {
            UPLOADED: 'uploaded',
            VERIFIED: 'verified',
            REJECTED: 'rejected',
            MISSING: 'missing'
        }
    }
};

// ====== VALIDATION ======
function validateSupabaseConfig() {
    const errors = [];
    
    if (!SUPABASE_CONFIG.URL || SUPABASE_CONFIG.URL === 'https://YOUR_PROJECT_ID.supabase.co') {
        errors.push('Supabase URL belum dikonfigurasi');
    }
    
    if (!SUPABASE_CONFIG.ANON_KEY || SUPABASE_CONFIG.ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        errors.push('Supabase ANON Key belum dikonfigurasi');
    }
    
    if (errors.length > 0) {
        console.warn('⚠️ SIMBAKES - Supabase Configuration Warning:');
        errors.forEach(err => console.warn(`  - ${err}`));
        console.warn('\n📋 Langkah konfigurasi:');
        console.warn('  1. Buat project di https://supabase.com');
        console.warn('  2. Copy URL dan ANON key dari Settings > API');
        console.warn('  3. Update file ini dengan credentials Anda');
        return false;
    }
    
    return true;
}

// Export untuk penggunaan global
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.validateSupabaseConfig = validateSupabaseConfig;

console.log('📦 SIMBAKES - Supabase Configuration Loaded');
