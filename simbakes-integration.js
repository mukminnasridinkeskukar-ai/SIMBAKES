/**
 * =====================================================
 * SIMBAKES - SUPABASE INTEGRATION LAYER (COMPLETE v3.0)
 * =====================================================
 * 
 * ⚠️ FILE INI MENGgANTI SELURUH FUNGSI GOOGLE SHEETS
 * DENGAN SUPABASE 100%
 * 
 * FUNGSI YANG DI-OVERRIDE:
 * 1. apiFetch() → Supabase client
 * 2. renderDashboard() → Dashboard dari Supabase
 * 3. fetchDashboardStats() → Stats dari view Supabase
 * 4. fetchRecentSubmissions() → Data terbaru dari Supabase
 * 5. fetchVisitorStats() → Visitor tracking (optional)
 * 6. trackVisitorToSheets() → Local tracking (no Google)
 * 7. sendToGoogleSheets() → Insert ke Supabase
 * 8. loadDataPengusul()/fetchAdminData() → Data admin dari Supabase
 * 9. updateAdminStats() → Stats admin dari Supabase
 * 10. Semua fungsi CRUD lainnya
 * 
 * CARA PENGGUNAAN:
 * 1. Letakkan file ini di folder yang sama dengan index.html
 * 2. Pastikan supabase-client.js dimuat SEBELUM file ini
 * 3. File ini OTOMATIS mengganti semua fungsi Google Sheets
 */

// =====================================================
// GLOBAL STATE & CONFIGURATION
// =====================================================

const SIMBAKES_CONFIG = {
    useSupabase: true,           // Force Supabase mode
    debugMode: true,             // Show detailed logs
    fallbackToDemo: true,        // Use demo data if Supabase fails
    autoInit: true               // Auto-initialize on load
};

// Global state for caching
const SimbakesCache = {
    dashboardStats: null,
    recentSubmissions: [],
    allPengusulan: [],
    visitorCount: 0,
    lastFetchTime: null,
    cacheExpiry: 60000 // 1 minute cache
};

// =====================================================
// INITIALIZATION
// =====================================================

/**
 * Main initialization function
 * Runs automatically when DOM is ready
 */
async function initSimbakesSupabase() {
    console.log('%c🚀 SIMBAKES Supabase Integration v3.0', 'color:#059669;font-size:16px;font-weight:bold');
    console.log('%c📊 Mengganti Google Sheets dengan Supabase...', 'color:#0891b2');
    
    if (SIMBAKES_CONFIG.debugMode) {
        console.log('[SIMBAKES] Debug mode ON');
    }
    
    // Check Supabase configuration
    const configValid = checkSupabaseConfig();
    
    if (configValid) {
        try {
            // Initialize Supabase client
            if (typeof simbakesDB !== 'undefined') {
                await simbakesDB.init();
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
    
    return isValid;
}

/**
 * Show integration status to user
 */
function showIntegrationStatus(isConnected) {
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
    `;
    
    if (isConnected) {
        statusDiv.style.background = '#059669';
        statusDiv.style.color = '#fff';
        statusDiv.innerHTML = '✅ Terhubung ke Supabase';
    } else {
        statusDiv.style.background = '#d97706';
        statusDiv.style.color = '#fff';
        statusDiv.innerHTML = '⚠️ Demo Mode (Supabase belum dikonfigurasi)';
    }
    
    document.body.appendChild(statusDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.opacity = '0';
        setTimeout(() => statusDiv.remove(), 300);
    }, 5000);
}

// =====================================================
// CORE FUNCTION OVERRIDES
// =====================================================

/**
 * Override ALL Google Sheets functions with Supabase equivalents
 * This is the main function that replaces Google Sheets functionality
 */
function overrideGoogleSheetsFunctions() {
    console.log('[SIMBAKES] 🔄 Meng-override fungsi Google Sheets...');
    
    // ==========================================
    // 1. OVERRIDE apiFetch() - MAIN FETCH FUNCTION
    // ==========================================
    window.apiFetch = async function supabaseApiFetch(url, options = {}, isRetry = false) {
        console.log('[SIMBAKES] apiFetch() di-redirect ke Supabase');
        
        // Parse action from URL to determine what to do
        const urlObj = new URL(url);
        const action = urlObj.searchParams.get('action');
        
        console.log(`[SIMBAKES] Action detected: ${action}`);
        
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
                return await fetchDataByStatusFromSupabase(urlObj.searchParams.get('status'));
            case 'getLulusTesData':
                return await getLulusTesDataFromSupabase();
            case 'submitApplication':
                return await submitApplicationToSupabase(options.body);
            case 'updateSubmission':
                return await updateSubmissionInSupabase(options.body);
            case 'deleteSubmission':
                return await deleteSubmissionFromSupabase(urlObj.searchParams.get('id'));
            case 'trackVisitor':
                return await trackVisitorLocal();
            default:
                console.warn(`[SIMBAKES] Action '${action}' tidak dikenali, menggunakan default handler`);
                return { status: 'success', data: [], message: 'Action handled by Supabase' };
        }
    };
    
    // ==========================================
    // 2. OVERRIDE renderDashboard()
    // ==========================================
    window.renderDashboard = async function supabaseRenderDashboard() {
        console.log('[SIMBAKES] renderDashboard() di-redirect ke Supabase');
        
        try {
            // Show loading state
            showDashboardLoading(true);
            
            // Track visitor (local, no Google)
            trackVisitorLocal();
            
            // Fetch all dashboard data in parallel from Supabase
            const results = await Promise.allSettled([
                fetchDashboardStatsFromSupabase(),
                fetchRecentSubmissionsFromSupabase(),
                fetchVisitorStatsFromSupabase()
            ]);
            
            // Check results
            const [statsResult, submissionsResult, visitorResult] = results;
            
            if (statsResult.status === 'rejected') {
                console.error('[SIMBAKES] Error fetching stats:', statsResult.reason);
                loadDummyStats();
            }
            
            if (submissionsResult.status === 'rejected') {
                console.error('[SIMBAKES] Error fetching submissions:', submissionsResult.reason);
            }
            
            // Update timestamp
            updateLastUpdateTime();
            
            showDashboardLoading(false);
            console.log('[SIMBAKES] ✅ Dashboard loaded from Supabase');
            
        } catch (error) {
            console.error('[SIMBAKES] Error in renderDashboard:', error);
            showDashboardLoading(false);
            loadDummyStats();
        }
    };
    
    // ==========================================
    // 3. OVERRIDE fetchDashboardStats()
    // ==========================================
    window.fetchDashboardStats = async function supabaseFetchDashboardStats() {
        console.log('[SIMBAKES] fetchDashboardStats() di-redirect ke Supabase');
        return await fetchDashboardStatsFromSupabase();
    };
    
    // ==========================================
    // 4. OVERRIDE fetchRecentSubmissions()
    // ==========================================
    window.fetchRecentSubmissions = async function supabaseFetchRecentSubmissions() {
        console.log('[SIMBAKES] fetchRecentSubmissions() di-redirect ke Supabase');
        return await fetchRecentSubmissionsFromSupabase();
    };
    
    // ==========================================
    // 5. OVERRIDE fetchVisitorStats()
    // ==========================================
    window.fetchVisitorStats = async function supabaseFetchVisitorStats() {
        console.log('[SIMBAKES] fetchVisitorStats() di-redirect ke local/Supabase');
        return await fetchVisitorStatsFromSupabase();
    };
    
    // ==========================================
    // 6. OVERRIDE trackVisitorToSheets()
    // ==========================================
    window.trackVisitorToSheets = async function supabaseTrackVisitor() {
        console.log('[SIMBAKES] trackVisitorToSheets() di-redirect ke local tracking');
        return await trackVisitorLocal();
    };
    
    // ==========================================
    // 7. OVERRIDE sendToGoogleSheets()
    // ==========================================
    window.sendToGoogleSheets = async function supabaseSendData(data) {
        console.log('[SIMBAKES] sendToGoogleSheets() di-redirect ke Supabase INSERT');
        return await submitApplicationToSupabase(data);
    };
    
    // ==========================================
    // 8. OVERRIDE loadDataPengusul() / fetchAdminData()
    // ==========================================
    if (typeof window.loadDataPengusul !== 'undefined') {
        const originalLoadDataPengusul = window.loadDataPengusul;
        window.loadDataPengusul = async function supabaseLoadDataPengusul() {
            console.log('[SIMBAKES] loadDataPengusul() di-redirect ke Supabase');
            return await fetchAdminDataFromSupabase();
        };
    }
    
    if (typeof window.fetchAdminData !== 'undefined') {
        const originalFetchAdminData = window.fetchAdminData;
        window.fetchAdminData = async function supabaseFetchAdminData() {
            console.log('[SIMBAKES] fetchAdminData() di-redirect ke Supabase');
            return await fetchAdminDataFromSupabase();
        };
    }
    
    // ==========================================
    // 9. OVERRIDE updateAdminStats()
    // ==========================================
    if (typeof window.updateAdminStats !== 'undefined') {
        window.updateAdminStats = async function supabaseUpdateAdminStats(pagination) {
            console.log('[SIMBAKES] updateAdminStats() di-redirect ke Supabase');
            return await updateAdminStatsFromSupabase(pagination);
        };
    }
    
    // ==========================================
    // 10. OVERRIDE refreshDashboard()
    // ==========================================
    window.refreshDashboard = async function supabaseRefreshDashboard(event) {
        console.log('[SIMBAKES] refreshDashboard() di-redirect ke Supabase');
        
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
            showToast('✅ Dashboard berhasil di-refresh! (Supabase)', 'success');
        }
    };
    
    console.log('[SIMBAKES] ✅ Berhasil meng-override 10+ fungsi Google Sheets');
}

// =====================================================
// SUPABASE DATA FUNCTIONS
// =====================================================

/**
 * Fetch dashboard statistics from Supabase
 * Replaces: apiFetch(WEB_APP_URL + '?action=dashboardStats')
 */
async function fetchDashboardStatsFromSupabase() {
    try {
        console.log('[SIMBAKES] 📊 Fetching dashboard stats from Supabase...');
        
        // Try using the view first
        let result = await simbakesDB.getDashboardStats();
        
        if (result.success) {
            const data = result.data;
            
            // Transform data to match expected format
            const statsData = {
                status: 'success',
                data: {
                    total: data.totalPengusulan || 0,
                    disetujui: data.totalDiterima || 0,
                    ditolak: data.totalDitolak || 0,
                    perbaikan: data.sedangDiproses || 0,
                    batal: 0, // Can be calculated if needed
                    pengajuanBaru: data.pengusulanBaru || 0
                }
            };
            
            // Update UI elements
            animateValue('stat-total', statsData.data.total || 0);
            animateValue('stat-disetujui', statsData.data.disetujui || 0);
            animateValue('stat-ditolak', statsData.data.ditolak || 0);
            animateValue('stat-perbaikan', statsData.data.perbaikan || 0);
            animateValue('stat-batal', statsData.data.batal || 0);
            
            // Cache the result
            SimbakesCache.dashboardStats = statsData.data;
            SimbakesCache.lastFetchTime = Date.now();
            
            console.log('[SIMBAKES] ✅ Dashboard stats:', statsData.data);
            return statsData;
        } else {
            throw new Error(result.error || 'Failed to fetch stats');
        }
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error fetching dashboard stats:', error);
        
        // Fallback to manual calculation
        return await calculateDashboardStatsManually();
    }
}

/**
 * Manual calculation of dashboard stats as fallback
 */
async function calculateDashboardStatsManually() {
    try {
        console.log('[SIMBAKES] Calculating stats manually...');
        
        const [pengusulanResult, penetapanResult] = await Promise.all([
            simbakesDB.getPengusulan({ pageSize: 1 }),
            simbakesDB.getPenetapan({ pageSize: 1 })
        ]);
        
        const totalPengusulan = pengusulanResult.total || 0;
        const totalPenetapan = penetapanResult.total || 0;
        
        // Get status breakdown
        const allData = await simbakesDB.getPengusulan({ pageSize: 10000 });
        const data = allData.data || [];
        
        const disetujui = data.filter(d => d.status === 'diterima' || d.status === 'Disetujui').length;
        const ditolak = data.filter(d => d.status === 'ditolak' || d.status === 'Ditolak').length;
        const perbaikan = data.filter(d => d.status === 'direvisi' || d.status === 'Perbaikan' || d.status === 'diproses').length;
        
        const statsData = {
            status: 'success',
            data: {
                total: totalPengusulan,
                disetujui: disetujui + totalPenetapan,
                ditolak: ditolak,
                perbaikan: perbaikan,
                batal: 0,
                pengajuanBaru: data.filter(d => d.status === 'diajukan').length
            }
        };
        
        // Update UI
        animateValue('stat-total', statsData.data.total || 0);
        animateValue('stat-disetujui', statsData.data.disetujui || 0);
        animateValue('stat-ditolak', statsData.data.ditolak || 0);
        animateValue('stat-perbaikan', statsData.data.perbaikan || 0);
        animateValue('stat-batal', statsData.data.batal || 0);
        
        return statsData;
        
    } catch (error) {
        console.error('[SIMBAKES] Error in manual calculation:', error);
        return { status: 'error', message: error.message, data: { total: 0, disetujui: 0, ditolak: 0, perbaikan: 0, batal: 0 } };
    }
}

/**
 * Fetch recent submissions from Supabase
 * Replaces: apiFetch(WEB_APP_URL + '?action=recentSubmissions')
 */
async function fetchRecentSubmissionsFromSupabase(limit = 50) {
    try {
        console.log('[SIMBAKES] 📋 Fetching recent submissions from Supabase...');
        
        const result = await simbakesDB.getPengusulan({
            pageSize: limit,
            sortBy: 'created_at',
            sortOrder: 'desc'
        });
        
        if (result.success) {
            // Transform data to match expected format
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
                noHP: item.no_hp,
                status: mapStatus(item.status),
                tanggalPengajuan: item.created_at,
                linkFoto: item.pasfoto,
                linkDokumen: item.dokumen,
                timestamp: new Date(item.created_at).getTime()
            }));
            
            // Cache data
            cachedRecentSubmissions = transformedData;
            SimbakesCache.recentSubmissions = transformedData;
            
            // Render to table
            if (typeof renderRecentSubmissions === 'function') {
                renderRecentSubmissions();
            }
            
            console.log(`[SIMBAKES] ✅ Loaded ${transformedData.length} recent submissions`);
            
            return {
                status: 'success',
                data: transformedData,
                total: result.total
            };
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error fetching recent submissions:', error);
        
        // Return empty result
        cachedRecentSubmissions = [];
        const tbody = document.getElementById('recent-submissions-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        ⚠️ Gagal memuat data dari Supabase. Periksa koneksi.
                    </td>
                </tr>
            `;
        }
        
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
 * Fetch visitor stats from Supabase/local
 * Replaces: apiFetch(WEB_APP_URL + '?action=visitorStats')
 */
async function fetchVisitorStatsFromSupabase() {
    console.log('[SIMBAKES] 👥 Fetching visitor stats (local mode)');
    
    // For now, use local storage for visitor tracking
    // In production, you could create a visitors table in Supabase
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
 * Track visitor locally (replaces Google Sheets tracking)
 */
async function trackVisitorLocal() {
    try {
        // Increment visit count
        let visitCount = parseInt(localStorage.getItem('simbakes_visit_count') || '0');
        visitCount++;
        localStorage.setItem('simbakes_visit_count', visitCount.toString());
        
        // Track today's visits
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
        
        // Track unique visitors
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
        
        console.log(`[SIMBAKES] 👤 Visitor tracked: Visit #${visitCount}`);
        
        return { status: 'success', visitCount: visitCount };
        
    } catch (error) {
        console.error('[SIMBAKES] Error tracking visitor:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Submit application to Supabase
 * Replaces: sendToGoogleSheets()
 */
async function submitApplicationToSupabase(formData) {
    try {
        console.log('[SIMBAKES] 📤 Submitting application to Supabase...');
        
        // Parse form data if it's a string
        let data = formData;
        if (typeof formData === 'string') {
            data = JSON.parse(formData);
        }
        
        // Map form fields to database schema
        const dbData = {
            nik: data.nik || data.NIK,
            nama_lengkap: data.namaLengkap || data.nama || data.namaLengkap,
            tempat_lahir: data.tempatLahir || data.tempatLahir,
            tanggal_lahir: parseDateToISO(data.tanggalLahir || data.tanggalLahir),
            alamat_ktp: data.alamatKTP || data.alamatKTP,
            alamat_domisili: data.alamatDomisili || data.alamatDomisili,
            lama_domisili_tahun: parseInt(data.lamaDomisili) || null,
            pekerjaan: data.pekerjaan || data.pekerjaan,
            posisi_jabatan: data.posisi || data.posisiJabatan,
            unit_kerja: data.unitKerja || data.unitKerja,
            penjelasan_narasi: data.narasi || data.penjelasanNarasi,
            jurusan_tujuan: data.jurusan || data.jurusanTujuan,
            jenjang_pendidikan: data.jenjang || data.jenjangPendidikan,
            unit_tujuan_pemanfaatan: data.unitTujuan || data.unitTujuanPemanfaatan,
            rencana_tahun_studi: parseInt(data.tahunStudi) || null,
            no_hp: data.noHP || data.noHp,
            no_whatsapp: data.whatsapp || data.noWhatsapp,
            email: data.email || data.email,
            pasfoto: data.fotoUrl || data.linkFoto || data.pasfoto,
            dokumen: data.dokumenUrl || data.linkDokumen || data.dokumen,
            status: 'diajukan'
        };
        
        // Insert into Supabase
        const result = await simbakesDB.insertPengusulan(dbData);
        
        if (result.success) {
            console.log('[SIMBAKES] ✅ Application submitted successfully');
            
            return {
                status: 'success',
                message: 'Data berhasil disimpan ke Supabase',
                data: result.data,
                noRegister: `REG-${dbData.nik}-${Date.now()}`
            };
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error submitting application:', error);
        return {
            status: 'error',
            message: `Gagal menyimpan: ${error.message}`
        };
    }
}

/**
 * Fetch all submissions for admin panel
 * Replaces: apiFetch(WEB_APP_URL + '?action=getAllSubmissions')
 */
async function getAllSubmissionsFromSupabase(limit = 1000) {
    try {
        console.log('[SIMBAKES] 📂 Fetching all submissions for admin...');
        
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
                tempatLahir: item.tempat_lahir,
                tanggalLahir: item.tanggal_lahir,
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
                tanggalPengajuan: item.created_at,
                linkFoto: item.pasfoto,
                linkDokumen: item.dokumen,
                timestamp: new Date(item.created_at).getTime(),
                id: item.id
            }));
            
            SimbakesCache.allPengusulan = transformedData;
            
            console.log(`[SIMBAKES] ✅ Loaded ${transformedData.length} submissions`);
            
            return {
                status: 'success',
                data: transformedData,
                total: result.total
            };
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error fetching all submissions:', error);
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Fetch data filtered by status
 * Replaces: apiFetch(WEB_APP_URL + '?action=dataByStatus&status=...')
 */
async function fetchDataByStatusFromSupabase(status) {
    try {
        console.log(`[SIMBAKES] 📊 Fetching data with status: ${status}`);
        
        // Map display status back to DB status
        const dbStatusMap = {
            'Disetujui': 'diterima',
            'Ditolak': 'ditolak',
            'Perbaikan': 'direvisi',
            'Proses Verifikasi': 'diajukan'
        };
        
        const dbStatus = dbStatusMap[status] || status.toLowerCase();
        
        const result = await simbakesDB.getPengusulan({
            status: dbStatus,
            pageSize: 1000
        });
        
        if (result.success) {
            const transformedData = result.data.map(mapPengusulanItem);
            
            return { status: 'success', data: transformedData, total: result.total };
        }
        
        return { status: 'error', data: [], message: result.error };
        
    } catch (error) {
        console.error('[SIMBAKES] Error filtering by status:', error);
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Get Lulus Tes (Penetapan) data
 * Replaces: apiFetch(WEB_APP_URL + '?action=getLulusTesData')
 */
async function getLulusTesDataFromSupabase() {
    try {
        console.log('[SIMBAKES] 🎓 Fetching Penetapan data...');
        
        const result = await simbakesDB.getPenetapan({
            pageSize: 1000,
            status: 'disetujui'
        });
        
        if (result.success) {
            const transformedData = result.data.map((item, index) => ({
                rowNumber: index + 1,
                noRegister: item.no_sk_penetapan || `SK-${item.nik}`,
                nik: item.nik,
                namaLengkap: item.nama_lengkap,
                jurusan: item.jurusan_tujuan,
                jenjang: item.jenjang_pendidikan,
                unitTujuan: item.unit_tujuan_pemanfaatan,
                tahunStudi: item.rencana_tahun_studi,
                status: 'Lulus Tes',
                tanggalPengajuan: item.tanggal_penetapan || item.created_at,
                linkFoto: item.link_foto_pasfoto,
                linkDokumen: item.link_dokumen_pdf,
                periode: item.periode_pemberian
            }));
            
            return { status: 'success', data: transformedData };
        }
        
        return { status: 'error', data: [], message: result.error };
        
    } catch (error) {
        console.error('[SIMBAKES] Error fetching Lulus Tes data:', error);
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Fetch admin data for Data Pengusul page
 * Replaces: fetchAdminData() / loadDataPengusul()
 */
async function fetchAdminDataFromSupabase() {
    try {
        console.log('[SIMBAKES] 📋 Fetching admin data from Supabase...');
        
        // Get filter values
        const searchInput = document.getElementById('admin-search-input');
        const statusFilter = document.getElementById('admin-status-filter');
        const sortBy = document.getElementById('admin-sort-by');
        const sortOrder = document.getElementById('admin-sort-order');
        const pageSizeSelect = document.getElementById('page-size-select');
        
        const filters = {
            search: searchInput?.value || '',
            status: statusFilter?.value || '',
            sortBy: sortBy?.value || 'created_at',
            sortOrder: sortOrder?.value || 'desc',
            pageSize: parseInt(pageSizeSelect?.value || '10'),
            page: typeof adminCurrentPage !== 'undefined' ? adminCurrentPage : 1
        };
        
        // Map sort field
        const sortFieldMap = {
            'timestamp': 'created_at',
            'nama': 'nama_lengkap',
            'nik': 'nik',
            'status': 'status'
        };
        filters.sortBy = sortFieldMap[filters.sortBy] || 'created_at';
        
        const result = await simbakesDB.getPengusulan(filters);
        
        if (result.success) {
            const transformedData = result.data.map(mapPengusulanItem);
            
            // Render table if function exists
            if (typeof renderAdminTable === 'function') {
                renderAdminTable(transformedData, result.total, filters.page, filters.pageSize);
            }
            
            // Update pagination if function exists
            if (typeof updatePaginationControls === 'function') {
                updatePaginationControls(result.total, filters.page, filters.pageSize);
            }
            
            console.log(`[SIMBAKES] ✅ Loaded ${transformedData.length} records (page ${filters.page})`);
            
            return {
                status: 'success',
                data: transformedData,
                total: result.total,
                page: filters.page,
                pageSize: filters.pageSize
            };
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('[SIMBAKES] ❌ Error fetching admin data:', error);
        
        // Show error in table
        const tbody = document.getElementById('admin-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="24" class="loading-cell">
                        ❌ Gagal memuat data: ${error.message}
                    </td>
                </tr>
            `;
        }
        
        return { status: 'error', data: [], message: error.message };
    }
}

/**
 * Update admin statistics bar
 * Replaces: updateAdminStats()
 */
async function updateAdminStatsFromSupabase(pagination) {
    try {
        console.log('[SIMBAKES] 📊 Updating admin stats from Supabase...');
        
        // Update total from pagination
        const statTotal = document.getElementById('stat-total-pengusul');
        if (statTotal && pagination) {
            statTotal.textContent = pagination.totalRecords || 0;
        }
        
        // Fetch all data for status breakdown
        const result = await simbakesDB.getPengusulan({ pageSize: 10000 });
        
        if (result.success && result.data) {
            const allData = result.data;
            
            // Count by status
            const approved = allData.filter(p => p.status === 'diterima').length;
            const rejected = allData.filter(p => p.status === 'ditolak').length;
            const revision = allData.filter(p => p.status === 'direvisi' || p.status === 'diproses').length;
            const verify = allData.filter(p => p.status === 'diajukan').length;
            
            // Update UI
            const statApproved = document.getElementById('stat-approved-pengusul');
            const statRejected = document.getElementById('stat-rejected-pengusul');
            const statRevision = document.getElementById('stat-revision-pengusul');
            const statVerify = document.getElementById('stat-verify-pengusul');
            
            if (statApproved) statApproved.textContent = approved;
            if (statRejected) statRejected.textContent = rejected;
            if (statRevision) statRevision.textContent = revision;
            if (statVerify) statVerify.textContent = verify;
            
            console.log(`[SIMBAKES] ✅ Admin stats updated: ${allData.length} total`);
        }
        
    } catch (error) {
        console.warn('[SIMBAKES] Could not update admin stats:', error);
    }
}

/**
 * Update submission in Supabase
 * Replaces: apiFetch(WEB_APP_URL, { action: 'updateSubmission' })
 */
async function updateSubmissionInSupabase(data) {
    try {
        console.log('[SIMBAKES] ✏️ Updating submission in Supabase...');
        
        let updateData = data;
        if (typeof data === 'string') {
            updateData = JSON.parse(data);
        }
        
        const result = await simbakesDB.updatePengusulan(updateData.nik, updateData);
        
        if (result.success) {
            return { status: 'success', message: 'Data berhasil diupdate', data: result.data };
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('[SIMBAKES] Error updating submission:', error);
        return { status: 'error', message: error.message };
    }
}

/**
 * Delete submission from Supabase
 * Replaces: apiFetch(WEB_APP_URL + '?action=deleteSubmission&id=...')
 */
async function deleteSubmissionFromSupabase(id) {
    try {
        console.log('[SIMBAKES] 🗑️ Deleting submission from Supabase...');
        
        // Need NIK to delete - find it first or accept NIK as ID
        const result = await simbakesDB.deletePengusulan(id);
        
        if (result.success) {
            return { status: 'success', message: 'Data berhasil dihapus' };
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('[SIMBAKES] Error deleting submission:', error);
        return { status: 'error', message: error.message };
    }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Map pengusulan item from DB format to display format
 */
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

/**
 * Format date string to ISO format
 */
function parseDateToISO(dateStr) {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    } catch {
        return null;
    }
}

/**
 * Format date for display
 */
function formatDateDisplay(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Show/hide dashboard loading state
 */
function showDashboardLoading(show) {
    const loader = document.getElementById('dashboard-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Load dummy stats when API fails
 */
function loadDummyStats() {
    const stats = ['stat-total', 'stat-disetujui', 'stat-ditolak', 'stat-perbaikan', 'stat-batal'];
    stats.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
}

// =====================================================
// FALLBACK MODE (when Supabase not configured)
// =====================================================

/**
 * Setup fallback/demo mode when Supabase is not available
 */
function setupFallbackMode() {
    console.warn('[SIMBAKES] ⚠️ Setting up DEMO MODE (fallback)');
    
    // Override functions to use mock data
    window.apiFetch = async function demoApiFetch(url, options = {}) {
        console.log('[SIMBAKES-DEMO] apiFetch() returning mock data');
        return { status: 'success', data: [], message: 'Demo mode - no database connection' };
    };
    
    window.renderDashboard = async function demoRenderDashboard() {
        console.log('[SIMBAKES-DEMO] renderDashboard() showing demo data');
        loadDummyStats();
        
        const tbody = document.getElementById('recent-submissions-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        🔒 Demo Mode - Hubungkan ke Supabase untuk melihat data real
                    </td>
                </tr>
            `;
        }
    };
    
    window.fetchDashboardStats = async function demoFetchDashboardStats() {
        return { status: 'success', data: { total: 0, disetujui: 0, ditolak: 0, perbaikan: 0, batal: 0 } };
    };
    
    window.fetchRecentSubmissions = async function demoFetchRecentSubmissions() {
        cachedRecentSubmissions = [];
        return { status: 'success', data: [] };
    };
    
    window.trackVisitorToSheets = async function demoTrackVisitor() {
        return { status: 'success' };
    };
    
    window.sendToGoogleSheets = async function demoSendData(data) {
        if (typeof showToast === 'function') {
            showToast('⚠️ Demo Mode - Data tidak tersimpan. Konfigurasi Supabase untuk production.', 'warning');
        }
        return { status: 'error', message: 'Demo mode - data not saved' };
    };
    
    // Show warning notification
    setTimeout(() => {
        if (typeof showToast === 'function') {
            showToast('🔒 Mode Demo Aktif - Edit supabase-client.js untuk menghubungkan ke database', 'warning', 8000);
        }
    }, 2000);
}

// =====================================================
// ROADMAP INTEGRATION
// =====================================================

/**
 * Override roadmap functions if they exist
 */
function overrideRoadmapFunctions() {
    if (typeof fetchRoadmapData === 'function') {
        const originalFetchRoadmap = window.fetchRoadmapData;
        window.fetchRoadmapData = async function supabaseFetchRoadmap() {
            console.log('[SIMBAKES] fetchRoadmapData() di-redirect ke Supabase');
            
            try {
                const result = await simbakesDB.getRoadmap();
                
                if (result.success) {
                    const transformedData = result.data.map((item, index) => ({
                        id: item.id,
                        rowNumber: index + 1,
                        kode: item.kode,
                        bidangFokus: item.jurusan,
                        targetPenerima: item.nama_penerima ? 1 : 0,
                        alokasiDana: '-',
                        prioritas: item.status === 'aktif' ? 'Tinggi' : 'Rendah',
                        sumberData: item.perguruan_tinggi || '-'
                    }));
                    
                    // Cache and render
                    window.roadmapData = transformedData;
                    
                    if (typeof renderRoadmapTable === 'function') {
                        renderRoadmapTable(transformedData);
                    }
                    
                    return { status: 'success', data: transformedData };
                }
                
                return { status: 'error', data: [], message: result.error };
                
            } catch (error) {
                console.error('[SIMBAKES] Error fetching roadmap:', error);
                return { status: 'error', data: [], message: error.message };
            }
        };
    }
}

// =====================================================
// PENETAPAN (APPROVAL) INTEGRATION
// =====================================================

/**
 * Override penetapan functions if they exist
 */
function overridePenetapanFunctions() {
    if (typeof loadPenetapanData === 'function') {
        window.loadPenetapanData = async function supabaseLoadPenetapan() {
            console.log('[SIMBAKES] loadPenetapanData() di-redirect ke Supabase');
            
            try {
                const result = await simbakesDB.getPenetapan({ pageSize: 1000 });
                
                if (result.success) {
                    const transformedData = result.data.map((item, index) => ({
                        id: item.id,
                        rowNumber: index + 1,
                        noRegister: item.no_sk_penetapan || `SK-${index + 1}`,
                        nik: item.nik,
                        namaLengkap: item.nama_lengkap,
                        jurusan: item.jurusan_tujuan,
                        jenjang: item.jenjang_pendidikan,
                        unitTujuan: item.unit_tujuan_pemanfaatan,
                        tahunStudi: item.rencana_tahun_studi,
                        status: item.status_penetapan,
                        tanggalPengajuan: item.tanggal_penetapan,
                        linkFoto: item.link_foto_pasfoto,
                        linkDokumen: item.link_dokumen_pdf,
                        periode: item.periode_pemberian
                    }));
                    
                    if (typeof renderPenetapanTable === 'function') {
                        renderPenetapanTable(transformedData);
                    }
                    
                    return { status: 'success', data: transformedData };
                }
                
                return { status: 'error', data: [], message: result.error };
                
            } catch (error) {
                console.error('[SIMBAKES] Error loading penetapan:', error);
                return { status: 'error', data: [], message: error.message };
            }
        };
    }
}

// =====================================================
// EXPORT/IMPORT INTEGRATION
// =====================================================

/**
 * Override export function to use Supabase data
 */
function overrideExportImportFunctions() {
    // Export to Excel/CSV
    if (typeof exportToExcel === 'function') {
        const originalExport = window.exportToExcel;
        window.exportToExcel = async function supabaseExport(tableType) {
            console.log(`[SIMBAKES] Exporting ${tableType} from Supabase...`);
            
            try {
                let result;
                switch(tableType) {
                    case 'pengusulan':
                    case 'data-pengusul':
                        result = await simbakesDB.exportData('data_pengusulan');
                        break;
                    case 'penetapan':
                        result = await simbakesDB.exportData('data_penetapan');
                        break;
                    case 'roadmap':
                        result = await simbakesDB.exportData('roadmap_kebutuhan');
                        break;
                    default:
                        throw new Error('Unknown table type: ' + tableType);
                }
                
                if (result.success && result.data.length > 0) {
                    downloadAsCSV(result.data, `simbakes_${tableType}_${new Date().toISOString().split('T')[0]}.csv`);
                    
                    if (typeof showToast === 'function') {
                        showToast(`✅ Export berhasil: ${result.data.length} record`, 'success');
                    }
                } else {
                    if (typeof showToast === 'function') {
                        showToast('⚠️ Tidak ada data untuk diekspor', 'warning');
                    }
                }
                
            } catch (error) {
                console.error('[SIMBAKES] Export error:', error);
                if (typeof showToast === 'function') {
                    showToast('❌ Export gagal: ' + error.message, 'error');
                }
            }
        };
    }
}

/**
 * Download data as CSV file
 */
function downloadAsCSV(data, filename) {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                const str = value !== null && value !== undefined ? String(value) : '';
                return `"${str.replace(/"/g, '""')}"`;
            }).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

// =====================================================
// AUTHENTICATION INTEGRATION
// =====================================================

/**
 * Override login to use Supabase multiusers table
 */
function overrideAuthFunctions() {
    // Store original login function if exists
    const originalLogin = window.handleLogin || window.login;
    
    /**
     * Login handler using Supabase multiusers table
     */
    window.handleLogin = async function supabaseLogin(username, password) {
        console.log('[SIMBAKES] handleLogin() via Supabase');
        
        try {
            if (!checkSupabaseConfig()) {
                // Fallback to demo credentials
                return handleLoginDemo(username, password);
            }
            
            const result = await simbakesDB.login(username, password);
            
            if (result.success) {
                const user = result.user;
                
                // Set session
                currentUser = {
                    id: user.id,
                    nama: user.nama_lengkap,
                    username: user.username,
                    role: user.role,
                    email: user.email
                };
                
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('simbakes_admin_session', JSON.stringify({
                    isLoggedIn: true,
                    user: currentUser,
                    loginTime: new Date().toISOString(),
                    role: currentUser.role
                }));
                
                console.log(`[SIMBAKES] ✅ Login berhasil: ${currentUser.nama} (${currentUser.role})`);
                
                // Trigger post-login actions
                if (typeof hideLandingPage === 'function') hideLandingPage();
                if (typeof showDashboard === 'function') showDashboard();
                if (typeof showToast === 'function') {
                    showToast(`Selamat datang, ${currentUser.nama}!`, 'success');
                }
                
                return { success: true, user: currentUser };
            } else {
                if (typeof showToast === 'function') {
                    showToast(result.error || 'Login gagal', 'error');
                }
                return { success: false, error: result.error };
            }
            
        } catch (error) {
            console.error('[SIMBAKES] Login error:', error);
            if (typeof showToast === 'function') {
                showToast('Terjadi kesalahan saat login', 'error');
            }
            return { success: false, error: error.message };
        }
    };
    
    /**
     * Logout handler
     */
    window.handleLogout = async function supabaseLogout() {
        console.log('[SIMBAKES] handleLogout()');
        
        await simbakesDB.logout();
        
        // Clear sessions
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('simbakes_admin_session');
        localStorage.removeItem('simbakes_user');
        
        currentUser = null;
        
        // Show landing page
        if (typeof showLandingPage === 'function') showLandingPage();
        if (typeof showToast === 'function') {
            showToast('Berhasil logout', 'success');
        }
    };
}

/**
 * Demo login with hardcoded credentials
 */
function handleLoginDemo(username, password) {
    const demoUsers = [
        { username: 'superadmin', password: 'Aida2007###', nama: 'Mukmin Nasri', role: 'superadmin', email: 'mukminnasri@dinkeskukar.go.id' },
        { username: 'operator2', password: 'EtaSDMK2024@', nama: 'Eta', role: 'admin', email: 'eta@dinkeskukar.go.id' },
        { username: 'admin', password: 'admin123', nama: 'Administrator', role: 'admin', email: 'admin@simbakes.local' },
        { username: 'operator', password: 'operator123', nama: 'Operator', role: 'operator', email: 'operator@simbakes.local' }
    ];
    
    const user = demoUsers.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = {
            id: 'demo-' + user.username,
            nama: user.nama,
            username: user.username,
            role: user.role,
            email: user.email
        };
        
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('simbakes_admin_session', JSON.stringify({
            isLoggedIn: true,
            user: currentUser,
            loginTime: new Date().toISOString(),
            role: currentUser.role
        }));
        
        if (typeof hideLandingPage === 'function') hideLandingPage();
        if (typeof showDashboard === 'function') showDashboard();
        if (typeof showToast === 'function') {
            showToast(`Mode Demo - Selamat datang, ${currentUser.nama}!`, 'warning');
        }
        
        return { success: true, user: currentUser };
    } else {
        if (typeof showToast === 'function') {
            showToast('Username atau password salah!', 'error');
        }
        return { success: false, error: 'Invalid credentials' };
    }
}

// =====================================================
// AUTO-INITIALIZATION ON DOM READY
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[SIMBAKES] DOM ready, initializing Supabase integration...');
    
    // Wait for supabase-client.js to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initialize main integration
    await initSimbakesSupabase();
    
    // Override additional functions
    overrideRoadmapFunctions();
    overridePenetapanFunctions();
    overrideExportImportFunctions();
    overrideAuthFunctions();
    
    // Check for existing session
    const savedSession = sessionStorage.getItem('simbakes_admin_session');
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            if (session.isLoggedIn && session.user) {
                currentUser = session.user;
                console.log(`[SIMBAKES] Session restored: ${currentUser.nama} (${currentUser.role})`);
            }
        } catch (e) {
            console.warn('[SIMBAKES] Invalid session, clearing...');
            sessionStorage.removeItem('simbakes_admin_session');
        }
    }
    
    console.log('%c✅ SIMBAKES Supabase Integration Complete!', 'color:#059669;font-size:14px;font-weight:bold');
    console.log('%c📖 Data sekarang dari Supabase, BUKAN Google Sheets', 'color:#0891b2');
});

// =====================================================
// GLOBAL EXPORT
// =====================================================

// Make integration available globally
window.SimbakesIntegration = {
    // Core
    init: initSimbakesSupabase,
    checkConfig: checkSupabaseConfig,
    
    // Data operations
    getPengusulan: () => simbakesDB.getPengusulan.bind(simbakesDB)(),
    getPenetapan: () => simbakesDB.getPenetapan.bind(simbakesDB)(),
    getRoadmap: () => simbakesDB.getRoadmap.bind(simbakesDB)(),
    insertPengusulan: (data) => simbakesDB.insertPengusulan(data),
    updatePengusulan: (nik, data) => simbakesDB.updatePengusulan(nik, data),
    
    // Status
    isConnected: checkSupabaseConfig(),
    cache: SimbakesCache,
    
    // Utilities
    showNotif: (msg, type) => {
        if (typeof showToast === 'function') showToast(msg, type);
    },
    setLoading: (show) => showDashboardLoading(show)
};

console.log('[SIMBAKES] Integration layer loaded - ready to replace Google Sheets');
