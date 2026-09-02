// ============================================
// SUPABASE CONFIGURATION
// Ganti dengan URL dan Anon Key Anda!
// ============================================
const SUPABASE_CONFIG = {
    url: 'https://boeknpvlfamjmddsdopd.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZWtucHZsZmFtam1kZHNkb3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NzYwNjIsImV4cCI6MjEwMjA1MjA2Mn0.kHj7xEY7Wa4zSJwH0rjhiB3Qf0IHriyPlWoh4rdlv3U'
};

// Global Supabase Client
let supabaseClient = null;
let supabaseInitRetries = 0;
const MAX_SUPABASE_RETRIES = 3;

function initSupabaseClient() {
    try {
        console.log('[SIMBAKES] 🔄 Initializing Supabase client... (attempt ' + (supabaseInitRetries + 1) + ')');
        
        // Check if supabase library is loaded
        if (typeof window.supabase === 'undefined') {
            console.warn('[SIMBAKES] ⚠️ Supabase library not loaded yet');
            if (supabaseInitRetries < MAX_SUPABASE_RETRIES) {
                supabaseInitRetries++;
                setTimeout(initSupabaseClient, 1000 * supabaseInitRetries); // Retry with delay
                return false;
            }
            return false;
        }
        
        // Validate configuration
        if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
            console.error('[SIMBAKES] ❌ Supabase configuration missing');
            return false;
        }
        
        if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
            console.error('[SIMBAKES] ❌ Supabase not configured - using placeholder values');
            return false;
        }
        
        // Create client
        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        
        console.log('[SIMBAKES] ✅ Supabase client initialized successfully!');
        console.log('[SIMBAKES] 📡 Connected to:', SUPABASE_CONFIG.url);
        
        // Test connection (optional - can be commented out for faster loading)
        testConnectionOnLoad();
        
        return true;
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error initializing Supabase:', error);
        
        if (supabaseInitRetries < MAX_SUPABASE_RETRIES) {
            supabaseInitRetries++;
            console.log('[SIMBAKES] 🔄 Retrying in ' + (1000 * supabaseInitRetries) + 'ms...');
            setTimeout(initSupabaseClient, 1000 * supabaseInitRetries);
        }
        
        return false;
    }
}

/**
 * Test connection on load (silent test)
 */
async function testConnectionOnLoad() {
    try {
        if (!supabaseClient) return;
        
        const startTime = Date.now();
        const { data, error } = await supabaseClient.from('submissions').select('id').limit(1);
        const latency = Date.now() - startTime;
        
        if (error) {
            console.warn('[SIMBAKES] ⚠️ Connection test warning:', error.message);
            console.warn('[SIMBAKES] ⚠️ Error code:', error.code);
            console.warn('[SIMBAKES] ⚠️ This might indicate RLS policy issues');
        } else {
            console.log('[SIMBAKES] ✅ Connection test successful! Latency: ' + latency + 'ms');
        }
    } catch (err) {
        console.warn('[SIMBAKES] ⚠️ Connection test failed:', err.message);
    }
}

/**
 * 🔧 CRUD DEBUG & TESTING UTILITIES
 * Fungsi-fungsi untuk debugging operasi database
 */

/**
 * Test semua CRUD permissions (SELECT, INSERT, UPDATE, DELETE)
 * Panggil ini di Console untuk diagnosa masalah
 */
async function testCRUDPermissions() {
    console.log('=== CRUD PERMISSION TEST ===');
    
    if (!supabaseClient) {
        console.error('❌ Supabase client not initialized!');
        return;
    }
    
    const results = {};
    
    // Test SELECT
    try {
        const { data, error } = await supabaseClient.from('submissions').select('id').limit(1);
        results.SELECT = error ? { success: false, error: error.message, code: error.code } : { success: true, count: data?.length };
        console.log('[TEST] SELECT:', results.SELECT);
    } catch(e) {
        results.SELECT = { success: false, error: e.message };
    }
    
    // Test INSERT (dengan dummy data yang akan dihapus)
    try {
        const testData = { 
            nama_lengkap: '__CRUD_TEST__', 
            nik: 'TEST_' + Date.now(),
            created_at: new Date().toISOString()
        };
        const { data, error } = await supabaseClient.from('submissions').insert([testData]).select('id');
        
        if (error) {
            results.INSERT = { success: false, error: error.message, code: error.code };
        } else if (data && data.length > 0) {
            // Hapus test record
            const testId = data[0].id;
            await supabaseClient.from('submissions').delete().eq('id', testId);
            results.INSERT = { success: true, testId: testId };
        } else {
            results.INSERT = { success: false, error: 'No data returned after insert' };
        }
        console.log('[TEST] INSERT:', results.INSERT);
    } catch(e) {
        results.INSERT = { success: false, error: e.message };
    }
    
    // Test UPDATE (jika ada data)
    try {
        const { data: existing } = await supabaseClient.from('submissions').select('id').limit(1);
        if (existing && existing.length > 0) {
            const testId = existing[0].id;
            const { data, error } = await supabaseClient
                .from('submissions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', testId)
                .select('id');
            
            results.UPDATE = error ? { success: false, error: error.message, code: error.code } : { success: true, updatedId: testId };
        } else {
            results.UPDATE = { success: false, error: 'No records to test with' };
        }
        console.log('[TEST] UPDATE:', results.UPDATE);
    } catch(e) {
        results.UPDATE = { success: false, error: e.message };
    }
    
    // Test DELETE (skip untuk keamanan, hanya log)
    results.DELETE = { success: true, note: 'Skipped for safety. Use UI to test delete.' };
    console.log('[TEST] DELETE:', results.DELETE);
    
    console.log('=== CRUD TEST SUMMARY ===');
    console.table(results);
    
    // Cek apakah ada yang gagal
    const failures = Object.entries(results).filter(([k,v]) => !v.success);
    if (failures.length > 0) {
        console.error('❌ FAILED OPERATIONS:', failures.map(([k]) => k));
        console.error('💡 TIPS:');
        console.error('   - Jika INSERT/UPDATE gagal dengan code 42501/42503: RLS Policy issue');
        console.error('   - Jika gagal dengan code 23505: Unique constraint violation');
        console.error('   - Jika gagal dengan code 42P01: Table not found');
        console.error('');
        console.error('🔧 SOLUTION: Jalankan SQL berikut di Supabase SQL Editor:');
        console.error('');
        console.error('-- Enable RLS policies for anon role:');
        console.error('ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;');
        console.error('');
        console.error('-- Create policy untuk allow all operations (development):');
        console.error('CREATE POLICY "Allow all" ON submissions FOR ALL USING (true) WITH CHECK (true);');
    } else {
        console.log('✅ All CRUD operations working correctly!');
    }
    
    return results;
}

// Export untuk penggunaan di Console
window.testCRUDPermissions = testCRUDPermissions;

/**
 * Debug helper - Log lengkap untuk setiap operasi CRUD
 */
function debugCRUDLog(operation, table, details) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CRUD:${operation}] 📋 ${table}`, {
        ...details,
        userRole: currentAdminUser?.role,
        userId: currentAdminUser?.id,
        supabaseReady: !!supabaseClient
    });
}

/**
 * Enhanced error handler untuk Supabase errors
 */
function handleSupabaseError(error, operation, tableName) {
    debugCRUDLog('ERROR', tableName || 'unknown', { operation, error });
    
    // Error codes dan solusinya
    const errorSolutions = {
        '42501': 'RLS Policy Error: Role tidak memiliki izin. Cek Row Level Security di Supabase.',
        '42503': 'Privilege Error: Tidak memiliki privilege. Grant permission ke role anon/service_role.',
        '23505': 'Unique Violation: Data duplikat. Gunakan nilai unik untuk field yang required unique.',
        '23503': 'Foreign Key Error: Referensi data tidak valid. Pastikan ID referensi ada.',
        '23514': 'Check Violation: Constraint check gagal. Periksa data yang dimasukkan.',
        '22P02': 'Invalid Input: Format data tidak sesuai tipe kolom.',
        '22001': 'String Too Long: Data terlalu panjang untuk kolom.',
        '42P01': 'Table Not Found: Tabel tidak ada. Periksa nama tabel.',
        '42P02': 'Column Not Found: Kolom tidak ada. Periksa nama field.',
        '406': 'Not Acceptable: Format response tidak sesuai. Biasanya karena .single() pada query yang return multiple rows.',
        'PGRST': 'PostgREST Error: Masalah API layer. Cek URL dan headers.'
    };
    
    const errorCode = error.code || 'UNKNOWN';
    const solution = errorSolutions[errorCode] || errorSolutions[errorCode.substring(0,5)] || null;
    
    let message = `Error ${operation} ${tableName || ''}: ${error.message}`;
    if (solution) {
        message += `\n\n🔍 Diagnosis: ${solution}`;
    }
    
    console.error(`[CRUD ERROR] ${message}`);
    console.error(`[CRUD ERROR] Full error object:`, error);
    console.error(`[CRUD ERROR] Code: ${errorCode}`);
    
    return {
        success: false,
        error: error.message,
        code: errorCode,
        solution: solution,
        userFriendlyMessage: `Gagal ${operation.toLowerCase()} data${tableName ? ' di tabel ' + tableName : ''}. ${solution || 'Periksa console untuk detail.'}`
    };
}

/**
 * Ensure Supabase client is ready (call before any Supabase operation)
 */
function ensureSupabaseClient() {
    if (!supabaseClient) {
        // Try to initialize again
        const success = initSupabaseClient();
        if (!success) {
            throw new Error('Supabase client tidak tersedia. Pastikan koneksi internet stabil dan refresh halaman.');
        }
    }
    return supabaseClient;
}

// Initialize on DOM ready with multiple strategies
document.addEventListener('DOMContentLoaded', function() {
    console.log('[SIMBAKES] 📄 DOM Content Loaded - Initializing Supabase...');
    initSupabaseClient();
});

// Also try to initialize when window loads (backup)
window.addEventListener('load', function() {
    if (!supabaseClient) {
        console.log('[SIMBAKES] 📄 Window Loaded - Retrying Supabase init...');
        initSupabaseClient();
    }
});
