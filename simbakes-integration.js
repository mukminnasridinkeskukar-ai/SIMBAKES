/**
 * =====================================================
 * SIMBAKES - SUPABASE INTEGRATION LAYER (COMPLETE v5.0)
 * =====================================================
 * 
 * ⚠️ FILE INI MENGgANTI SELURUH FUNGSI GOOGLE SHEETS
 * DENGAN SUPABASE 100%
 * 
 * PERBAIKAN v5.0:
 * - 🔥 CRITICAL FIX: Typo simbasesDB → simbakesDB (line 83)
 * - Fix: Block ipapi.co/json/ (CORS error source)
 * - Fix: Block api.ipify.org (IP API error)
 * - Fix: Patch native fetch() untuk CORS protection
 * - Fix: Override getClientIP() function
 * - Fix: fetchWithTimeout() sekarang di-override
 * - Fix: WEB_APP_URL dinonaktifkan total
 * 
 * CARA PENGGUNAAN:
 * 1. Letakkan file ini di folder yang sama dengan index.html
 * 2. Pastikan supabase-client.js dimuat SEBELUM file ini
 * 3. File ini OTOMATIS mengganti semua fungsi Google Sheets
 */

// =====================================================
// IMMEDIATE PATCHES (Sebelum apapun terjadi!)
// =====================================================

// Disable Google Sheets URL immediately to prevent any calls
console.log('[SIMBAKES] v4.0 Loading - Applying security patches...');

// Store original values for reference (but disable them)
const _ORIGINAL_WEB_APP_URL = typeof WEB_APP_URL !== 'undefined' ? WEB_APP_URL : null;

// Disable WEB_APP_URL if it exists
if (typeof WEB_APP_URL !== 'undefined') {
    console.warn('[SIMBAKES] ⛔ Disabling WEB_APP_URL:', WEB_APP_URL.substring(0, 50) + '...');
    window.WEB_APP_URL = '#disabled-by-supabase-integration';
}

// =====================================================
// GLOBAL STATE & CONFIGURATION
// =====================================================

const SIMBAKES_CONFIG = {
    useSupabase: true,
    debugMode: true,
    fallbackToDemo: true,
    autoInit: true,
    version: '4.0'
};

// Global state for caching
const SimbakesCache = {
    dashboardStats: null,
    recentSubmissions: [],
    allPengusulan: [],
    visitorCount: 0,
    lastFetchTime: null,
    cacheExpiry: 60000
};

// Track if Supabase is connected
let supabaseConnected = false;

// =====================================================
// GLOBAL VARIABLES - Declaration
// =====================================================

// User & Session Management
let currentUser = null;

// Dashboard & Admin Cache
let cachedRecentSubmissions = [];
let adminCurrentPage = 1;

// Roadmap Management
let roadmapCachedData = [];
let roadmapAdminData = [];
let roadmapCurrentPage = 1;
let roadmapPageSize = 10;
let roadmapTotalRecords = 0;
let roadmapTotalPages = 0;

// =====================================================
// INITIALIZATION
// =====================================================

/**
 * Main initialization function
 */
async function initSimbakesSupabase() {
    console.log('%c🚀 SIMBAKES Supabase Integration v4.0', 'color:#059669;font-size:16px;font-weight:bold');
    console.log('%c📊 Mengganti Google Sheets dengan Supabase...', 'color:#0891b2');
    
    // Apply IMMEDIATE patches first (before anything else)
    applyImmediatePatches();
    
    // Check Supabase configuration
    const configValid = checkSupabaseConfig();
    
    if (configValid) {
        try {
            // Initialize Supabase client
            if (typeof simbakesDB !== 'undefined') {
                await simbakesDB.init().catch(e => {
                    console.warn('[SIMBAKES] Retrying Supabase init...:', e.message);
                    return simbakesDB.init();
                });
                
                supabaseConnected = true;
                console.log('[SIMBAKES] ✅ Supabase client initialized');
                
                // Override ALL Google Sheets functions
                overrideGoogleSheetsFunctions();
                
                console.log('[SIMBAKES] ✅ Semua fungsi Google Sheets berhasil di-override');
            } else {
                console.warn('[SIMBAKES] ⚠️ simbakesDB tidak ditemukan, menggunakan fallback');
                setupFallbackMode();
            }
        } catch (error) {
            console.error('[SIMBAKES] ❌ Error initializing Supabase:', error);
            setupFallbackMode();
        }
    } else {
        console.warn('[SIMBAKES] ⚠️ Supabase belum dikonfigurasi, menggunakan Demo Mode');
        setupFallbackMode();
    }
    
    // Show status notification
    showIntegrationStatus(configValid);
    
    // Signal that SIMBAKES is ready - trigger landing page to hide
    document.dispatchEvent(new Event('SIMBAKES_READY'));
    console.log('[SIMBAKES] 📢 Dispatched SIMBAKES_READY event for landing page');
}

/**
 * Apply immediate patches to prevent Google Sheets calls
 */
function applyImmediatePatches() {
    console.log('[SIMBAKES] 🛡️ Applying security patches...');
    
    // Patch 1: Override fetchWithTimeout if it exists
    if (typeof fetchWithTimeout !== 'undefined') {
        const originalFetchWithTimeout = window.fetchWithTimeout;
        window.fetchWithTimeout = function patchedFetchWithTimeout(url, options = {}, timeout = 10000) {
            // Block any call to Google Sheets URLs or external IP APIs
            if (url && (
                url.includes('script.google.com') ||
                url.includes('google.com/macros') ||
                url === '#disabled-by-supabase-integration' ||
                url.includes('ipapi.co') ||
                url.includes('api.ipify.org') ||
                url.includes('ip-api.com')
            )) {
                console.log('[SIMBAKES] 🛑 Blocked external API call:', url?.substring(0, 60));
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ status: 'success', data: [], message: 'Blocked by Supabase' })
                });
            }
            
            // Allow other calls through
            return originalFetchWithTimeout.call(this, url, options, timeout);
        };
        console.log('[SIMBAKES] ✅ fetchWithTimeout() patched (including IP APIs)');
    }
    
    // Patch 1.5: Block direct fetch calls to problematic APIs (with safe pass-through)
    const originalFetch = window.fetch.bind(window);
    window.fetch = function patchedFetch(url, options) {
        const urlStr = typeof url === 'string' ? url : (url?.url || url?.toString() || '');
        
        // Log Supabase calls for debugging (optional - can be disabled in production)
        if (urlStr && urlStr.includes('supabase.co')) {
            console.log('[SIMBAKES] 🔄 Supabase API call:', urlStr.substring(0, 80) + '...');
        }
        
        // ONLY block these specific problematic URLs (NOT Supabase!)
        if (urlStr && (
            urlStr.includes('ipapi.co') ||
            urlStr.includes('api.ipify.org') ||
            urlStr.includes('ip-api.com') ||
            urlStr.includes('script.google.com') ||
            urlStr.includes('google.com/macros')
        )) {
            console.log('[SIMBAKES] 🛑 Blocked fetch to:', urlStr.substring(0, 60));
            return Promise.resolve({
                ok: false,
                status: 0,
                json: () => Promise.resolve({ error: 'Blocked by SIMBAKES' }),
                text: () => Promise.resolve('')
            });
        }
        
        // Pass through ALL other requests (including Supabase) with error handling
        return originalFetch(url, options).catch(error => {
            const errorType = error.name || 'NetworkError';
            const errorMsg = error.message || 'Unknown error';
            
            console.warn('[SIMBAKES] ⚠️ Fetch error:', errorType, '-', errorMsg, '| URL:', urlStr?.substring(0, 60));
            
            // Provide more specific error info
            if (errorMsg.includes('DNS') || errorMsg.includes('name') || errorType === 'TypeError') {
                console.error('[SIMBAKES] 🌐 Possible DNS/Network issue - Check internet connection');
            }
            
            // Return a proper error response instead of crashing
            return Promise.resolve({
                ok: false,
                status: 0,
                statusText: errorType || 'NetworkError',
                json: () => Promise.resolve({ 
                    error: errorMsg,
                    code: 'NETWORK_ERROR',
                    message: 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
                    details: {
                        errorType: errorType,
                        originalError: errorMsg,
                        url: urlStr?.substring(0, 100)
                    }
                }),
                text: () => Promise.resolve('')
            });
        });
    };
    console.log('[SIMBAKES] ✅ fetch() patched with network error handling');
    
    // Patch 2: Override apiFetch immediately with safe version
    if (typeof window.apiFetch !== 'undefined') {
        const originalApiFetch = window.apiFetch.bind(window);
        // Will be properly overridden later, but this prevents errors now
    }
    
    // Patch 3: Disable GOOGLE_APPS_SCRIPT_URL
    if (typeof GOOGLE_APPS_SCRIPT_URL !== 'undefined') {
        window.GOOGLE_APPS_SCRIPT_URL = '#disabled';
        console.log('[SIMBAKES] ✅ GOOGLE_APPS_SCRIPT_URL disabled');
    }
    
    console.log('[SIMBAKES] ✅ Security patches applied');
}

/**
 * Check if Supabase credentials are configured
 */
function checkSupabaseConfig() {
    if (typeof SUPABASE_CONFIG === 'undefined') {
        console.error('[SIMBAKES] SUPABASE_CONFIG tidak ditemukan!');
        return false;
    }
    
    const isValid = (
        SUPABASE_CONFIG.url && 
        SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' &&
        SUPABASE_CONFIG.anonKey &&
        SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY'
    );
    
    if (!isValid && SIMBAKES_CONFIG.debugMode) {
        console.warn('[SIMBAKES] Config check failed:');
        console.warn('  - URL:', SUPABASE_CONFIG.url ? `${SUPABASE_CONFIG.url.substring(0, 30)}...` : 'NOT SET');
        console.warn('  - Key:', SUPABASE_CONFIG.anonKey ? `${SUPABASE_CONFIG.anonKey.substring(0, 20)}...` : 'NOT SET');
    }
    
    return isValid;
}

/**
 * Show integration status to user
 */
function showIntegrationStatus(isConnected) {
    // Remove existing status if any
    const existing = document.getElementById('simbakes-status');
    if (existing) existing.remove();
    
    const statusDiv = document.createElement('div');
    statusDiv.id = 'simbakes-status';
    statusDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: opacity 0.3s;
        max-width: 400px;
    `;
    
    if (isConnected && supabaseConnected) {
        statusDiv.style.background = '#059669';
        statusDiv.style.color = '#fff';
        statusDiv.innerHTML = '✅ Terhubung ke Supabase Database';
    } else {
        statusDiv.style.background = '#d97706';
        statusDiv.style.color = '#fff';
        statusDiv.innerHTML = `
            <div style="flex:1">
                <div style="font-weight:bold">⚠️ Demo Mode</div>
                <div style="font-size:11px;opacity:0.9">Edit supabase-client.js untuk koneksi database</div>
            </div>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:white;font-size:16px;cursor:pointer">×</button>
        `;
    }
    
    document.body.appendChild(statusDiv);
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
        if (statusDiv.parentElement) {
            statusDiv.style.opacity = '0';
            setTimeout(() => statusDiv.remove(), 300);
        }
    }, 8000);
}

// =====================================================
// CORE FUNCTION OVERRIDES
// =====================================================

/**
 * Override ALL Google Sheets functions with Supabase equivalents
 */
function overrideGoogleSheetsFunctions() {
    console.log('[SIMBAKES] 🔄 Meng-override fungsi Google Sheets...');
    
    // ==========================================
    // 1. OVERRIDE apiFetch() - MAIN FETCH FUNCTION
    // ==========================================
    window.apiFetch = async function supabaseApiFetch(url, options = {}, isRetry = false) {
        // Block Google Sheets URLs completely
        if (url && (
            url.includes('script.google.com') ||
            url.includes('google.com/macros') ||
            url === '#disabled-by-supabase-integration'
        )) {
            console.log('[SIMBAKES] 🛑 Blocking Google Sheets API call');
            return { status: 'success', data: [], message: 'Replaced by Supabase' };
        }
        
        console.log(`[SIMBAKES] apiFetch() routing to Supabase`);
        
        // Parse action from URL to determine what to do
        let action = null;
        try {
            const urlObj = new URL(url, window.location.origin);
            action = urlObj.searchParams.get('action');
        } catch (e) {
            // If URL parsing fails, extract action manually
            const match = url.match(/action=([^&]+)/);
            if (match) action = match[1];
        }
        
        console.log(`[SIMBAKES] Action: ${action || 'unknown'}`);
        
        // Route to appropriate Supabase function
        switch(action) {
            case 'dashboardStats':
                return await fetchDashboardStatsFromSupabase();
            case 'recentSubmissions':
                return await fetchRecentSubmissionsFromSupabase();
            case 'visitorStats':
                return await fetchVisitorStatsFromSupabase();
            case 'getAllSubmissions':
                return await getAllSubmissionsFromSupabase();
            case 'dataByStatus':
                return await fetchDataByStatusFromSupabase(extractParam(url, 'status'));
            case 'getLulusTesData':
                return await getLulusTesDataFromSupabase();
            case 'submitApplication':
                return await submitApplicationToSupabase(options.body);
            case 'updateSubmission':
                return await updateSubmissionInSupabase(options.body);
            case 'deleteSubmission':
                return await deleteSubmissionFromSupabase(extractParam(url, 'id'));
            case 'trackVisitor':
                return await trackVisitorLocal();
            default:
                console.log(`[SIMBAKES] Action '${action}' → returning empty success`);
                return { status: 'success', data: [], message: 'Handled by Supabase v4' };
        }
    };
    
    // ==========================================
    // 2. OVERRIDE renderDashboard()
    // ==========================================
    window.renderDashboard = async function supabaseRenderDashboard() {
        console.log('[SIMBAKES] renderDashboard() → Supabase');
        
        try {
            showDashboardLoading(true);
            
            // Use local tracking (no Google)
            await trackVisitorLocal();
            
            // Fetch all dashboard data in parallel from Supabase
            const results = await Promise.allSettled([
                fetchDashboardStatsFromSupabase(),
                fetchRecentSubmissionsFromSupabase(),
                fetchVisitorStatsFromSupabase()
            ]);
            
            updateLastUpdateTime();
            showDashboardLoading(false);
            console.log('[SIMBAKES] ✅ Dashboard loaded from Supabase');
            
        } catch (error) {
            console.error('[SIMBAKES] Dashboard error:', error);
            showDashboardLoading(false);
            loadDummyStats();
        }
    };
    
    // ==========================================
    // 3. OVERRIDE fetchDashboardStats()
    // ==========================================
    window.fetchDashboardStats = async function supabaseFetchDashboardStats() {
        return await fetchDashboardStatsFromSupabase();
    };
    
    // ==========================================
    // 4. OVERRIDE fetchRecentSubmissions()
    // ==========================================
    window.fetchRecentSubmissions = async function supabaseFetchRecentSubmissions() {
        return await fetchRecentSubmissionsFromSupabase();
    };
    
    // ==========================================
    // 5. OVERRIDE fetchVisitorStats()
    // ==========================================
    window.fetchVisitorStats = async function supabaseFetchVisitorStats() {
        return await fetchVisitorStatsFromSupabase();
    };
    
    // ==========================================
    // 6. OVERRIDE trackVisitorToSheets() - CRITICAL FIX!
    // ==========================================
    window.trackVisitorToSheets = async function supabaseTrackVisitor() {
        console.log('[SIMBAKES] trackVisitorToSheets() → Local tracking (no Google/ipapi)');
        
        // IMPORTANT: Do NOT call fetchWithTimeout or any external URL
        // Just use local storage - NO ipapi.co, NO Google Sheets
        return await trackVisitorLocal();
    };
    
    // ==========================================
    // 6.5 OVERRIDE getClientIP() - Block api.ipify.org
    // ==========================================
    if (typeof window.getClientIP !== 'undefined') {
        window.getClientIP = async function safeGetClientIP() {
            console.log('[SIMBAKES] getClientIP() → Local fallback (no external API)');
            return '-'; // Return placeholder instead of calling api.ipify.org
        };
        console.log('[SIMBAKES] ✅ getClientIP() overridden');
    }
    
    // ==========================================
    // 7. OVERRIDE sendToGoogleSheets()
    // ==========================================
    window.sendToGoogleSheets = async function supabaseSendData(data) {
        console.log('[SIMBAKES] sendToGoogleSheets() → Supabase INSERT');
        return await submitApplicationToSupabase(data);
    };
    
    // ==========================================
    // 8. OVERRIDE refreshDashboard()
    // ==========================================
    window.refreshDashboard = async function supabaseRefreshDashboard(event) {
        console.log('[SIMBAKES] refreshDashboard() → Supabase');
        
        const btn = event?.target;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Loading...';
        }
        
        await Promise.all([
            fetchDashboardStatsFromSupabase(),
            fetchRecentSubmissionsFromSupabase(),
            fetchVisitorStatsFromSupabase()
        ]);
        
        updateLastUpdateTime();
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🔄 Refresh';
        }
        
        if (typeof showToast === 'function') {
            showToast('✅ Dashboard refreshed! (Supabase)', 'success');
        }
    };
    
    // ==========================================
    // 9. OVERRIDE Admin Functions
    // ==========================================
    if (typeof window.loadDataPengusul !== 'undefined') {
        window.loadDataPengusul = async function() {
            console.log('[SIMBAKES] loadDataPengusul() → Supabase');
            return await fetchAdminDataFromSupabase();
        };
    }
    
    if (typeof window.fetchAdminData !== 'undefined') {
        window.fetchAdminData = async function() {
            console.log('[SIMBAKES] fetchAdminData() → Supabase');
            return await fetchAdminDataFromSupabase();
        };
    }
    
    if (typeof window.updateAdminStats !== 'undefined') {
        window.updateAdminStats = async function(pagination) {
            console.log('[SIMBAKES] updateAdminStats() → Supabase');
            return await updateAdminStatsFromSupabase(pagination);
        };
    }
    
    // ==========================================
    // 10. OVERRIDE ROADMAP FUNCTIONS - FIX "GAGAL MENAMPILKAN DATA"!
    // ==========================================
    if (typeof window.loadRoadmapData !== 'undefined') {
        window.loadRoadmapData = async function() {
            console.log('[SIMBAKES] loadRoadmapData() → Supabase (OVERRIDING Google Sheets)');
            return await loadRoadmapDataFromSupabase();
        };
        console.log('[SIMBAKES] ✅ loadRoadmapData() overridden');
    }
    
    if (typeof window.fetchRoadmapData !== 'undefined') {
        window.fetchRoadmapData = async function() {
            console.log('[SIMBAKES] fetchRoadmapData() → Supabase (OVERRIDING Google Sheets)');
            return await fetchRoadmapDataFromSupabase();
        };
        console.log('[SIMBAKES] ✅ fetchRoadmapData() overridden');
    }
    
    if (typeof window.loadDataRoadmap !== 'undefined') {
        window.loadDataRoadmap = function() {
            console.log('[SIMBAKES] loadDataRoadmap() → Supabase');
            roadmapCurrentPage = 1;
            fetchRoadmapDataFromSupabase();
        };
        console.log('[SIMBAKES] ✅ loadDataRoadmap() overridden');
    }
    
    console.log('[SIMBAKES] ✅ All Google Sheets functions overridden successfully (including ROADMAP)');
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Extract parameter from URL string
 */
function extractParam(url, paramName) {
    try {
        const urlObj = new URL(url, window.location.origin);
        return urlObj.searchParams.get(paramName);
    } catch {
        const match = url.match(new RegExp(`${paramName}=([^&]+)`));
        return match ? match[1] : null;
    }
}

// =====================================================
// SUPABASE DATA FUNCTIONS
// =====================================================

/**
 * Fetch dashboard statistics from Supabase
 */
async function fetchDashboardStatsFromSupabase() {
    try {
        console.log('[SIMBAKES] 📊 Fetching stats from Supabase...');
        
        let result;
        if (supabaseConnected && typeof simbakesDB !== 'undefined') {
            result = await simbakesDB.getDashboardStats();
        } else {
            throw new Error('Supabase not connected');
        }
        
        if (result.success) {
            const data = result.data;
            const statsData = {
                status: 'success',
                data: {
                    total: data.totalPengusulan || 0,
                    disetujui: data.totalDiterima || 0,
                    ditolak: data.totalDitolak || 0,
                    perbaikan: data.sedangDiproses || 0,
                    batal: 0,
                    pengajuanBaru: data.pengusulanBaru || 0
                }
            };
            
            // Update UI
            animateValue('stat-total', statsData.data.total || 0);
            animateValue('stat-disetujui', statsData.data.disetujui || 0);
            animateValue('stat-ditolak', statsData.data.ditolak || 0);
            animateValue('stat-perbaikan', statsData.data.perbaikan || 0);
            animateValue('stat-batal', statsData.data.batal || 0);
            
            SimbakesCache.dashboardStats = statsData.data;
            SimbakesCache.lastFetchTime = Date.now();
            
            return statsData;
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.warn('[SIMBAKES] Stats fetch error, using fallback:', error.message);
        return await calculateDashboardStatsManually();
    }
}

/**
 * Manual calculation of dashboard stats as fallback
 */
async function calculateDashboardStatsManually() {
    try {
        if (!supabaseConnected) {
            return { 
                status: 'success', 
                data: { total: 0, disetujui: 0, ditolak: 0, perbaikan: 0, batal: 0 } 
            };
        }
        
        const [pengusulanResult, penetapanResult] = await Promise.all([
            simbakesDB.getPengusulan({ pageSize: 1 }).catch(() => ({ total: 0 })),
            simbakesDB.getPenetapan({ pageSize: 1 }).catch(() => ({ total: 0 }))
        ]);
        
        const allData = await simbakesDB.getPengusulan({ pageSize: 10000 }).catch(() => ({ data: [] }));
        const data = allData.data || [];
        
        const disetujui = data.filter(d => ['diterima', 'Disetujui'].includes(d.status)).length;
        const ditolak = data.filter(d => ['ditolak', 'Ditolak'].includes(d.status)).length;
        const perbaikan = data.filter(d => ['direvisi', 'Perbaikan', 'diproses'].includes(d.status)).length;
        
        const statsData = {
            status: 'success',
            data: {
                total: pengusulanResult.total || 0,
                disetujui: disetujui + (penetapanResult.total || 0),
                ditolak: ditolak,
                perbaikan: perbaikan,
                batal: 0
            }
        };
        
        animateValue('stat-total', statsData.data.total || 0);
        animateValue('stat-disetujui', statsData.data.disetujui || 0);
        animateValue('stat-ditolak', statsData.data.ditolak || 0);
        animateValue('stat-perbaikan', statsData.data.perbaikan || 0);
        animateValue('stat-batal', statsData.data.batal || 0);
        
        return statsData;
        
    } catch (error) {
        console.error('[SIMBAKES] Manual calc error:', error);
        return { status: 'error', data: { total: 0, disetujui: 0, ditolak: 0, perbaikan: 0, batal: 0 } };
    }
}

/**
 * Fetch recent submissions from Supabase
 */
async function fetchRecentSubmissionsFromSupabase(limit = 50) {
    try {
        console.log('[SIMBAKES] 📋 Fetching recent submissions...');
        
        if (!supabaseConnected) {
            cachedRecentSubmissions = [];
            return { status: 'success', data: [] };
        }
        
        const result = await simbakesDB.getPengusulan({
            pageSize: limit,
            sortBy: 'created_at',
            sortOrder: 'desc'
        });
        
        if (result.success) {
            const transformedData = result.data.map((item, index) => ({
                rowNumber: index + 1,
                noRegister: `REG-${item.nik}-${new Date(item.created_at).getTime()}`,
                nik: item.nik,
                namaLengkap: item.nama_lengkap,
                jurusanTujuan: item.jurusan_tujuan,
                jenjangPendidikan: item.jenjang_pendidikan,
                unitTujuan: item.unit_tujuan_pemanfaatan,
                rencanaTahun: item.rencana_tahun_studi,
                email: item.email,
                status: mapStatus(item.status),
                tanggalPengajuan: item.created_at,
                linkFoto: item.pasfoto,
                linkDokumen: item.dokumen,
                timestamp: new Date(item.created_at).getTime()
            }));
            
            cachedRecentSubmissions = transformedData;
            SimbakesCache.recentSubmissions = transformedData;
            
            if (typeof renderRecentSubmissions === 'function') {
                renderRecentSubmissions();
            }
            
            console.log(`[SIMBAKES] ✅ Loaded ${transformedData.length} submissions`);
            return { status: 'success', data: transformedData, total: result.total };
        }
        
        throw new Error(result.error);
        
    } catch (error) {
        console.error('[SIMBAKES] Recent submissions error:', error);
        cachedRecentSubmissions = [];
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Map database status to display status
 */
function mapStatus(dbStatus) {
    const statusMap = {
        'diajukan': 'Proses Verifikasi',
        'diproses': 'Proses Verifikasi',
        'diterima': 'Disetujui',
        'ditolak': 'Ditolak',
        'direvisi': 'Perbaikan'
    };
    return statusMap[dbStatus] || dbStatus || 'Proses Verifikasi';
}

/**
 * Fetch visitor stats locally
 */
async function fetchVisitorStatsFromSupabase() {
    console.log('[SIMBAKES] 👥 Visitor stats (local mode)');
    
    const visitCount = parseInt(localStorage.getItem('simbakes_visit_count') || '0');
    const uniqueVisitors = new Set(JSON.parse(localStorage.getItem('simbakes_unique_visitors') || '[]')).size;
    
    return {
        status: 'success',
        data: {
            totalVisits: visitCount,
            uniqueVisitors: uniqueVisitors,
            todayVisits: parseInt(localStorage.getItem('simbakes_today_visits') || '0')
        }
    };
}

/**
 * Track visitor locally (NO external calls!)
 */
async function trackVisitorLocal() {
    try {
        // This function does NOT make any network requests
        // It only uses localStorage - completely safe
        
        let visitCount = parseInt(localStorage.getItem('simbakes_visit_count') || '0');
        visitCount++;
        localStorage.setItem('simbakes_visit_count', visitCount.toString());
        
        let todayVisits = parseInt(localStorage.getItem('simbakes_today_visits') || '0');
        const lastVisitDate = localStorage.getItem('simbakes_last_visit_date');
        const today = new Date().toDateString();
        
        if (lastVisitDate !== today) {
            todayVisits = 1;
            localStorage.setItem('simbakes_last_visit_date', today);
        } else {
            todayVisits++;
        }
        localStorage.setItem('simbakes_today_visits', todayVisits.toString());
        
        let visitorId = localStorage.getItem('simbakes_visitor_id');
        if (!visitorId) {
            visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('simbakes_visitor_id', visitorId);
        }
        
        const uniqueVisitors = JSON.parse(localStorage.getItem('simbakes_unique_visitors') || '[]');
        if (!uniqueVisitors.includes(visitorId)) {
            uniqueVisitors.push(visitorId);
            localStorage.setItem('simbakes_unique_visitors', JSON.stringify(uniqueVisitors));
        }
        
        SimbakesCache.visitorCount = visitCount;
        
        console.log(`[SIMBAKES] 👤 Visitor tracked locally: #${visitCount}`);
        
        return { status: 'success', visitCount: visitCount };
        
    } catch (error) {
        console.warn('[SIMBAKES] Visitor tracking warning:', error.message);
        return { status: 'success', message: 'Tracking skipped' }; // Non-critical, don't throw
    }
}

/**
 * Submit application to Supabase
 */
async function submitApplicationToSupabase(formData) {
    try {
        console.log('[SIMBAKES] 📤 Submitting to Supabase...');
        
        if (!supabaseConnected) {
            return { status: 'warning', message: 'Demo mode - data not saved' };
        }
        
        let data = formData;
        if (typeof formData === 'string') {
            try { data = JSON.parse(formData); } catch { data = {}; }
        }
        
        const dbData = {
            nik: data.nik || data.NIK,
            nama_lengkap: data.namaLengkap || data.nama || data.namaLengkap,
            tempat_lahir: data.tempatLahir,
            tanggal_lahir: parseDateToISO(data.tanggalLahir),
            alamat_ktp: data.alamatKTP,
            alamat_domisili: data.alamatDomisili,
            lama_domisili_tahun: parseInt(data.lamaDomisili) || null,
            pekerjaan: data.pekerjaan,
            posisi_jabatan: data.posisi || data.posisiJabatan,
            unit_kerja: data.unitKerja,
            penjelasan_narasi: data.narasi || data.penjelasanNarasi,
            jurusan_tujuan: data.jurusan || data.jurusanTujuan,
            jenjang_pendidikan: data.jenjang || data.jenjangPendidikan,
            unit_tujuan_pemanfaatan: data.unitTujuan || data.unitTujuanPemanfaatan,
            rencana_tahun_studi: parseInt(data.tahunStudi) || null,
            no_hp: data.noHP || data.noHp,
            no_whatsapp: data.whatsapp || data.noWhatsapp,
            email: data.email,
            pasfoto: data.fotoUrl || data.linkFoto,
            dokumen: data.dokumenUrl || data.linkDokumen,
            status: 'diajukan'
        };
        
        const result = await simbakesDB.insertPengusulan(dbData);
        
        if (result.success) {
            return {
                status: 'success',
                message: 'Data tersimpan ke Supabase',
                data: result.data,
                noRegister: `REG-${dbData.nik}-${Date.now()}`
            };
        }
        
        throw new Error(result.error);
        
    } catch (error) {
        console.error('[SIMBAKES] Submit error:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Get all submissions for admin
 */
async function getAllSubmissionsFromSupabase(limit = 1000) {
    try {
        if (!supabaseConnected) {
            return { status: 'success', data: [], total: 0 };
        }
        
        const result = await simbakesDB.getPengusulan({ pageSize: limit, sortBy: 'created_at', sortOrder: 'desc' });
        
        if (result.success) {
            const transformedData = result.data.map((item, index) => ({
                rowNumber: index + 1,
                noRegister: `REG-${item.nik}-${new Date(item.created_at).getTime()}`,
                nik: item.nik,
                namaLengkap: item.nama_lengkap,
                jurusanTujuan: item.jurusan_tujuan,
                jenjangPendidikan: item.jenjang_pendidikan,
                unitTujuan: item.unit_tujuan_pemanfaatan,
                rencanaTahun: item.rencana_tahun_studi,
                email: item.email,
                status: mapStatus(item.status),
                tanggalPengajuan: item.created_at,
                linkFoto: item.pasfoto,
                linkDokumen: item.dokumen,
                id: item.id
            }));
            
            return { status: 'success', data: transformedData, total: result.total };
        }
        
        throw new Error(result.error);
        
    } catch (error) {
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Filter by status
 */
async function fetchDataByStatusFromSupabase(status) {
    try {
        if (!supabaseConnected) return { status: 'success', data: [] };
        
        const dbStatusMap = { 'Disetujui': 'diterima', 'Ditolak': 'ditolak', 'Perbaikan': 'direvisi', 'Proses Verifikasi': 'diajukan' };
        const dbStatus = dbStatusMap[status] || status.toLowerCase();
        
        const result = await simbakesDB.getPengusulan({ status: dbStatus, pageSize: 1000 });
        
        if (result.success) {
            return { status: 'success', data: result.data.map(mapPengusulanItem), total: result.total };
        }
        
        return { status: 'error', data: [], message: result.error };
        
    } catch (error) {
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Get Penetapan data
 */
async function getLulusTesDataFromSupabase() {
    try {
        if (!supabaseConnected) return { status: 'success', data: [] };
        
        const result = await simbakesDB.getPenetapan({ pageSize: 1000, status: 'disetujui' });
        
        if (result.success) {
            return { status: 'success', data: result.data.map((item, i) => ({
                rowNumber: i + 1,
                noRegister: item.no_sk_penetapan || `SK-${item.nik}`,
                nik: item.nik,
                namaLengkap: item.nama_lengkap,
                jurusan: item.jurusan_tujuan,
                status: 'Lulus Tes'
            }))};
        }
        
        return { status: 'error', data: [] };
        
    } catch (error) {
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Fetch admin data
 */
async function fetchAdminDataFromSupabase() {
    try {
        if (!supabaseConnected) {
            const tbody = document.getElementById('admin-table-body');
            if (tbody) tbody.innerHTML = '<tr><td colspan="24" class="loading-cell">🔒 Mode Demo</td></tr>';
            return { status: 'success', data: [], total: 0 };
        }
        
        const searchInput = document.getElementById('admin-search-input');
        const statusFilter = document.getElementById('admin-status-filter');
        const sortBy = document.getElementById('admin-sort-by');
        const sortOrder = document.getElementById('admin-sort-order');
        const pageSizeSelect = document.getElementById('page-size-select');
        
        const filters = {
            search: searchInput?.value || '',
            status: statusFilter?.value || '',
            sortBy: { 'timestamp': 'created_at', 'nama': 'nama_lengkap', 'nik': 'nik', 'status': 'status' }[sortBy?.value] || 'created_at',
            sortOrder: sortOrder?.value || 'desc',
            pageSize: parseInt(pageSizeSelect?.value || '10'),
            page: adminCurrentPage
        };
        
        const result = await simbakesDB.getPengusulan(filters);
        
        if (result.success) {
            const transformedData = result.data.map(mapPengusulanItem);
            
            if (typeof renderAdminTable === 'function') renderAdminTable(transformedData, result.total, filters.page, filters.pageSize);
            if (typeof updatePaginationControls === 'function') updatePaginationControls(result.total, filters.page, filters.pageSize);
            
            return { status: 'success', data: transformedData, total: result.total };
        }
        
        throw new Error(result.error);
        
    } catch (error) {
        console.error('[SIMBAKES] Admin data error:', error);
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Update admin stats
 */
async function updateAdminStatsFromSupabase(pagination) {
    try {
        const statTotal = document.getElementById('stat-total-pengusul');
        if (statTotal && pagination) statTotal.textContent = pagination.totalRecords || 0;
        
        if (!supabaseConnected) return;
        
        const result = await simbakesDB.getPengusulan({ pageSize: 10000 });
        
        if (result.success && result.data) {
            const allData = result.data;
            
            const updateStat = (id, filterFn) => {
                const el = document.getElementById(id);
                if (el) el.textContent = allData.filter(filterFn).length;
            };
            
            updateStat('stat-approved-pengusul', p => p.status === 'diterima');
            updateStat('stat-rejected-pengusul', p => p.status === 'ditolak');
            updateStat('stat-revision-pengusul', p => ['direvisi', 'diproses'].includes(p.status));
            updateStat('stat-verify-pengusul', p => p.status === 'diajukan');
        }
        
    } catch (error) {
        console.warn('[SIMBAKES] Admin stats warning:', error.message);
    }
}

// =====================================================
// ROADMAP DATA FUNCTIONS (NEW! - Fix "Gagal Menampilkan Data")
// =====================================================

/**
 * Load Roadmap Data from Supabase - Public version (for loadRoadmapData)
 * Fetches from roadmap_kebutuhan table
 */
async function loadRoadmapDataFromSupabase() {
    const loadingEl = document.getElementById('roadmap-loading');
    const tableWrapperEl = document.getElementById('roadmap-table-wrapper');
    const emptyStateEl = document.getElementById('roadmap-empty-state');
    
    // Safety check
    if (!loadingEl || !tableWrapperEl || !emptyStateEl) {
        console.error('[SIMBAKES] ❌ Elemen Roadmap tidak ditemukan di DOM!');
        return;
    }
    
    // Show loading
    loadingEl.style.display = 'block';
    tableWrapperEl.style.display = 'none';
    emptyStateEl.style.display = 'none';
    
    console.log('[SIMBAKES] 🔄 Loading Roadmap Kebutuhan dari Supabase...');
    
    try {
        let result;
        
        if (supabaseConnected && typeof simbakesDB !== 'undefined' && simbakesDB.client) {
            // Fetch from Supabase roadmap_kebutuhan table
            const { data, error } = await simbakesDB.client
                .from('roadmap_kebutuhan')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000);
            
            if (error) throw error;
            
            result = {
                status: 'success',
                data: data || [],
                totalRecords: data?.length || 0
            };
            
            console.log(`[SIMBAKES] ✅ Berhasil mengambil ${data?.length || 0} data roadmap dari Supabase`);
        } else {
            // Fallback: return empty data with demo mode message
            console.warn('[SIMBAKES] ⚠️ Supabase tidak terhubung, menggunakan mode demo untuk roadmap');
            result = {
                status: 'success',
                data: [],
                totalRecords: 0,
                message: 'Demo mode - Supabase not connected'
            };
        }
        
        // Hide loading
        loadingEl.style.display = 'none';
        
        // Cache data
        roadmapCachedData = result.data || [];
        
        // Render table or show empty state
        if (result.data && result.data.length > 0) {
            tableWrapperEl.style.display = 'block';
            emptyStateEl.style.display = 'none';
            
            // Call original render function if exists
            if (typeof renderRoadmapTablePublic === 'function') {
                renderRoadmapTablePublic(result.data);
            }
            
            if (typeof updateRoadmapResultCount === 'function') {
                updateRoadmapResultCount(result.totalRecords || result.data.length);
            }
            
            if (typeof showToast === 'function') {
                showToast(`✅ Berhasil memuat ${result.data.length} data roadmap (Supabase)`, 'success');
            }
        } else {
            tableWrapperEl.style.display = 'none';
            emptyStateEl.style.display = 'block';
            
            if (typeof updateRoadmapResultCount === 'function') {
                updateRoadmapResultCount(0);
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error loading roadmap dari Supabase:', error);
        loadingEl.style.display = 'none';
        emptyStateEl.style.display = 'block';
        
        const titleEl = document.getElementById('roadmap-empty-state')?.querySelector('h3');
        const descEl = document.getElementById('roadmap-empty-state')?.querySelector('p');
        if (titleEl) titleEl.textContent = 'Gagal Memuat Data';
        if (descEl) descEl.textContent = error.message || 'Terjadi kesalahan saat memuat data dari Supabase. Silakan coba lagi.';
        
        if (typeof showToast === 'function') {
            showToast('❌ Gagal memuat data roadmap: ' + error.message, 'error');
        }
        
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Fetch Roadmap Data from Supabase - Admin version (for fetchRoadmapData)
 * With pagination, search, and filter support
 */
async function fetchRoadmapDataFromSupabase() {
    const tbody = document.getElementById('roadmap-table-body');
    
    // Show loading state
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align:center;padding:3rem;color:#64748b;">
                    <div class="spinner"></div>
                    <p style="margin-top:1rem;">Memuat data roadmap dari Supabase...</p>
                    <p style="font-size:0.8rem;color:#94a3b8;margin-top:0.5rem;">Menghubungkan ke database...</p>
                </td>
            </tr>
        `;
    }
    
    try {
        let filteredData = [];
        
        if (supabaseConnected && typeof simbakesDB !== 'undefined' && simbakesDB.client) {
            // Fetch all data from Supabase first
            const { data, error } = await simbakesDB.client
                .from('roadmap_kebutuhan')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5000);
            
            if (error) throw error;
            
            filteredData = data || [];
            
            // Apply client-side search filter
            const searchInput = document.getElementById('roadmap-search-input');
            if (searchInput && searchInput.value.trim()) {
                const search = searchInput.value.trim().toLowerCase();
                filteredData = filteredData.filter(row => 
                    String(row.nama_lengkap || row.nama || '').toLowerCase().includes(search) ||
                    String(row.jurusan || '').toLowerCase().includes(search) ||
                    String(row.pekerjaan || '').toLowerCase().includes(search) ||
                    String(row.institusi || '').toLowerCase().includes(search)
                );
            }
            
            // Apply client-side status filter
            const statusFilter = document.getElementById('roadmap-status-filter');
            if (statusFilter && statusFilter.value) {
                filteredData = filteredData.filter(row => 
                    String(row.status || '').toLowerCase() === statusFilter.value.toLowerCase()
                );
            }
            
            console.log(`[SIMBAKES] ✅ Roadmap admin data: ${filteredData.length} records`);
            
        } else {
            console.warn('[SIMBAKES] ⚠️ Mode demo untuk roadmap admin');
            filteredData = [];
        }
        
        // Cache data for pagination
        roadmapAdminData = filteredData;
        
        // Calculate pagination
        const pageSize = roadmapPageSize;
        const currentPage = roadmapCurrentPage;
        const totalRecords = filteredData.length;
        const totalPages = Math.ceil(totalRecords / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, totalRecords);
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        // Update pagination variables
        roadmapTotalRecords = totalRecords;
        roadmapTotalPages = totalPages;
        
        // Transform data to match expected format (array of arrays)
        const transformedData = paginatedData.map((row, idx) => [
            startIndex + idx + 1,          // No
            row.nama_lengkap || row.nama || '-',  // Nama
            row.nik || '-',                 // NIK
            row.jurusan || '-',             // Jurusan
            row.jenjang_pendidikan || '-',  // Jenjang
            row.perguruan_tinggi || row.institusi || '-',  // PT
            row.pekerjaan || '-',           // Pekerjaan
            row.unit_kerja || '-',          // Unit
            row.status || '-',              // Status
            row.created_at || '-',          // Tanggal
            row.id                          // ID for actions
        ]);
        
        // Call render function if exists
        if (typeof renderRoadmapTable === 'function') {
            renderRoadmapTable(transformedData, startIndex);
        }
        
        // Update pagination controls
        if (typeof updateRoadmapPagination === 'function') {
            updateRoadmapPagination();
        }
        
        // Update stats
        if (typeof updateRoadmapStats === 'function') {
            updateRoadmapStats();
        }
        
        return { status: 'success', data: transformedData, totalRecords };
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error fetching roadmap dari Supabase:', error);
        
        const errorMsg = error.message || 'Terjadi kesalahan tidak diketahui';
        
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align:center;padding:3rem;color:#dc2626;">
                        <div style="font-size:2.5rem;margin-bottom:1rem;">⚠️</div>
                        <div style="font-weight:600;margin-bottom:0.5rem;">Gagal Memuat Data Roadmap</div>
                        <div style="color:#64748b;font-size:0.875rem;">${errorMsg}</div>
                        <button onclick="fetchRoadmapDataFromSupabase()" style="margin-top:1rem;padding:0.5rem 1rem;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.875rem;">
                            🔄 Coba Lagi
                        </button>
                    </td>
                </tr>
            `;
        }
        
        if (typeof showToast === 'function') {
            showToast('❌ Gagal memuat data roadmap: ' + errorMsg, 'error');
        }
        
        return { status: 'error', data: [], message: errorMsg };
    }
}

// =====================================================
// HELPERS
// =====================================================

function mapPengusulanItem(item, index = 0) {
    return {
        rowNumber: index + 1,
        noRegister: `REG-${item.nik}-${new Date(item.created_at).getTime()}`,
        nik: item.nik,
        namaLengkap: item.nama_lengkap,
        tempatLahir: item.tempat_lahir,
        tanggalLahir: formatDateDisplay(item.tanggal_lahir),
        alamatKTP: item.alamat_ktp,
        alamatDomisili: item.alamat_domisili,
        lamaDomisili: item.lama_domisili_tahun,
        pekerjaan: item.pekerjaan,
        posisi: item.posisi_jabatan,
        unitKerja: item.unit_kerja,
        narasi: item.penjelasan_narasi,
        jurusan: item.jurusan_tujuan,
        jenjang: item.jenjang_pendidikan,
        unitTujuan: item.unit_tujuan_pemanfaatan,
        tahunStudi: item.rencana_tahun_studi,
        noHP: item.no_hp,
        whatsapp: item.no_whatsapp,
        email: item.email,
        status: mapStatus(item.status),
        tanggalPengajuan: formatDateDisplay(item.created_at),
        linkFoto: item.pasfoto,
        linkDokumen: item.dokumen,
        timestamp: new Date(item.created_at).getTime(),
        id: item.id
    };
}

function parseDateToISO(dateStr) {
    if (!dateStr) return null;
    try { return new Date(dateStr).toISOString().split('T')[0]; } catch { return null; }
}

function formatDateDisplay(dateStr) {
    if (!dateStr) return '-';
    try { return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return dateStr; }
}

function showDashboardLoading(show) {
    const loader = document.getElementById('dashboard-loader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

function loadDummyStats() {
    ['stat-total', 'stat-disetujui', 'stat-ditolak', 'stat-perbaikan', 'stat-batal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
}

function animateValue(elementId, endValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        element.textContent = Math.round(startValue + (endValue - startValue) * easeOutQuart);
        if (progress < 1) requestAnimationFrame(update);
    }
    
    requestAnimationFrame(update);
}

function updateLastUpdateTime() {
    const el = document.getElementById('last-update-time');
    if (el) {
        el.textContent = `Terakhir update: ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }
}

// =====================================================
// FALLBACK MODE
// =====================================================

function setupFallbackMode() {
    console.warn('[SIMBAKES] ⚠️ Setting up DEMO MODE v4.0');
    
    // Safe overrides that won't cause errors
    window.apiFetch = async () => ({ status: 'success', data: [], message: 'Demo mode' });
    window.renderDashboard = async () => { loadDummyStats(); };
    window.fetchDashboardStats = async () => ({ status: 'success', data: { total: 0, disetujui: 0, ditolak: 0, perbaikan: 0, batal: 0 } });
    window.fetchRecentSubmissions = async () => { cachedRecentSubmissions = []; return { status: 'success', data: [] }; };
    window.fetchVisitorStats = async () => ({ status: 'success', data: [] });
    window.trackVisitorToSheets = async () => { /* Do nothing silently */ return { status: 'success' }; };
    window.sendToGoogleSheets = async () => ({ status: 'warning', message: 'Demo mode - not saved' });
    
    // Show demo notification after delay
    setTimeout(() => {
        if (typeof showToast === 'function') {
            showToast('🔒 Mode Demo - Edit supabase-client.js untuk production', 'warning', 6000);
        }
    }, 2000);
}

// =====================================================
// AUTHENTICATION INTEGRATION
// =====================================================

function overrideAuthFunctions() {
    const demoUsers = [
        { username: 'superadmin', password: 'Aida2007###', nama: 'Mukmin Nasri', role: 'superadmin', email: 'mukminnasri@dinkeskukar.go.id' },
        { username: 'operator2', password: 'EtaSDMK2024@', nama: 'Eta', role: 'admin', email: 'eta@dinkeskukar.go.id' },
        { username: 'admin', password: 'admin123', nama: 'Administrator', role: 'admin', email: 'admin@simbakes.local' },
        { username: 'operator', password: 'operator123', nama: 'Operator', role: 'operator', email: 'operator@simbakes.local' }
    ];
    
    window.handleLogin = async function(username, password) {
        console.log('[SIMBAKES] Login attempt:', username);
        
        // Try Supabase first if connected
        if (supabaseConnected && typeof simbakesDB !== 'undefined') {
            try {
                const result = await simbakesDB.login(username, password);
                if (result.success) {
                    const user = result.user;
                    currentUser = { id: user.id, nama: user.nama_lengkap, username: user.username, role: user.role, email: user.email };
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    sessionStorage.setItem('isLoggedIn', 'true');
                    
                    if (typeof hideLandingPage === 'function') hideLandingPage();
                    if (typeof showDashboard === 'function') showDashboard();
                    if (typeof showToast === 'function') showToast(`Selamat datang, ${currentUser.nama}!`, 'success');
                    
                    return { success: true, user: currentUser };
                }
            } catch (e) {
                console.warn('[SIMBAKES] Supabase login failed, trying demo');
            }
        }
        
        // Fallback to demo credentials
        const user = demoUsers.find(u => u.username === username && u.password === password);
        if (user) {
            currentUser = { id: 'demo-' + user.username, nama: user.nama, username: user.username, role: user.role, email: user.email };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            sessionStorage.setItem('isLoggedIn', 'true');
            
            if (typeof hideLandingPage === 'function') hideLandingPage();
            if (typeof showDashboard === 'function') showDashboard();
            if (typeof showToast === 'function') showToast(`Mode Demo - Selamat, ${currentUser.nama}!`, 'warning');
            
            return { success: true, user: currentUser };
        }
        
        if (typeof showToast === 'function') showToast('Username atau password salah!', 'error');
        return { success: false, error: 'Invalid credentials' };
    };
    
    window.handleLogout = async function() {
        await simbakesDB?.logout();
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('isLoggedIn');
        currentUser = null;
        if (typeof showLandingPage === 'function') showLandingPage();
        if (typeof showToast === 'function') showToast('Berhasil logout', 'success');
    };
}

// =====================================================
// AUTO-INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[SIMBAKES] DOM ready, initializing v4.0...');
    
    // Wait a bit for other scripts
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Initialize main integration
    await initSimbakesSupabase();
    
    // Override additional functions
    overrideAuthFunctions();
    
    // Restore session if exists
    const savedSession = sessionStorage.getItem('simbakes_admin_session') || sessionStorage.getItem('currentUser');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            const user = session.user || session;
            if (user && (session.isLoggedIn || sessionStorage.getItem('isLoggedIn'))) {
                currentUser = user;
                console.log(`[SIMBAKES] Session restored: ${user.nama} (${user.role})`);
            }
        } catch (e) {
            console.warn('[SIMBAKES] Invalid session cleared');
            sessionStorage.removeItem('simbakes_admin_session');
            sessionStorage.removeItem('currentUser');
        }
    }
    
    console.log('%c✅ SIMBAKES v4.0 Ready! | Data: %s', 'color:#059669;font-weight:bold', supabaseConnected ? 'SUPABASE ✅' : 'DEMO MODE ⚠️');
});

// =====================================================
// GLOBAL EXPORT
// =====================================================

window.SimbakesIntegration = {
    init: initSimbakesSupabase,
    checkConfig: checkSupabaseConfig,
    isConnected: () => supabaseConnected,
    cache: SimbakesCache,
    version: '4.0'
};

console.log('[SIMBAKES] Integration v4.0 loaded - Google Sheets DISABLED');
