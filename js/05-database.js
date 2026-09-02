// ============================================================
// SUPABASE DATABASE FUNCTIONS
// Semua operasi database sekarang melalui Supabase
// Tabel: submissions, roadmap, multiusers
// ============================================================

/**
 * Test koneksi ke Supabase
 */
async function testSupabaseConnection() {
    const startTime = Date.now();
    
    try {
        if (!supabaseClient) {
            return { success: false, message: '❌ Supabase client belum diinisialisasi' };
        }
        
        const { data, error } = await supabaseClient.from('submissions').select('id').limit(1);
        const latency = Date.now() - startTime;
        
        if (error) throw error;
        
        return {
            success: true,
            message: `✅ Koneksi Supabase berhasil! Latensi: ${latency}ms`,
            latency: latency
        };
    } catch (error) {
        console.error('[SIMBAKES] Connection error:', error);
        return {
            success: false,
            message: `❌ Koneksi gagal: ${error.message}`,
            error: error
        };
    }
}


/**
 * Get Recent Submissions from Supabase
 * Fetches latest submissions for dashboard display
 */
async function getRecentSubmissionsFromSupabase() {
    if (!supabaseClient) {
        console.warn('[SIMBAKES] Supabase not connected');
        return [];
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Get more data for pagination
            
        if (error) throw error;
        
        console.log(`[SIMBAKES] Recent submissions loaded: ${data?.length || 0} records`);
        return data || [];
    } catch (error) {
        console.error('[SIMBAKES] Error fetching recent submissions:', error);
        return [];
    }
}

/**
 * Fetch Submissions by Status dengan Pagination
 * Returns consistent format for dashboard consumption
 */
async function fetchDataByStatus(statusFilter, page = 1, perPage = 10) {
    // Default response
    const defaultResponse = {
        status: 'success',
        data: [],
        total: 0,
        count: 0,
        page: page,
        perPage: perPage,
        totalPages: 0
    };
    
    if (!supabaseClient) {
        console.warn('[SIMBAKES] Supabase client not available');
        return defaultResponse;
    }
    
    try {
        let query = supabaseClient
            .from('submissions')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });
            
        // Apply status filter only if provided and not null (null = all data)
        if (statusFilter && statusFilter !== 'all' && statusFilter !== null) {
            query = query.eq('status', statusFilter);
        }
        
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;
        
        const { data, count, error } = await query.range(from, to);
        
        if (error) throw error;
        
        return {
            status: 'success',
            data: data || [],
            total: count || 0,
            count: count || 0,
            page: page,
            perPage: perPage,
            totalPages: Math.ceil((count || 0) / perPage)
        };
    } catch (error) {
        console.error('[SIMBAKES] Error fetching data by status:', error);
        return {
            ...defaultResponse,
            status: 'error',
            message: error.message || 'Failed to fetch data'
        };
    }
}

/**
 * Search Submissions by query (no_register or nama_lengkap)
 */
async function searchSubmission(query) {
    if (!supabaseClient || !query) {
        return [];
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('submissions')
            .select('*')
            .or(`no_register.ilike.%${query}%,nama_lengkap.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[SIMBAKES] Error searching submissions:', error);
        return [];
    }
}

/**
 * Get All Submissions (for admin table/export)
 */
async function getAllSubmissions(limit = 10000, offset = 0) {
    if (!supabaseClient) {
        return { data: [], total: 0 };
    }
    
    try {
        const { data, count, error } = await supabaseClient
            .from('submissions')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
            
        if (error) throw error;
        
        return {
            data: data || [],
            total: count || 0
        };
    } catch (error) {
        console.error('[SIMBAKES] Error getting all submissions:', error);
        return { data: [], total: 0 };
    }
}

/**
 * Convert various date formats to ISO format (YYYY-MM-DD) for PostgreSQL
 * Handles Indonesian date formats and browser date inputs
 */
function convertToISODate(dateValue) {
    if (!dateValue || dateValue === '' || dateValue === null || dateValue === undefined) {
        return null;
    }
    
    const dateStr = String(dateValue).trim();
    
    // Already in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.substring(0, 10); // Return just the date part
    }
    
    // Handle Indonesian format: "16 Agustus 2026 pukul 06.27 WIB"
    const indoDateRegex = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/;
    const match = dateStr.match(indoDateRegex);
    if (match) {
        const [, day, monthName, year] = match;
        const months = {
            'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04',
            'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08',
            'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12'
        };
        return `${year}-${months[monthName]}-${day.padStart(2, '0')}`;
    }
    
    // Handle DD/MM/YYYY or MM/DD/YYYY format
    const slashParts = dateStr.split('/');
    if (slashParts.length === 3) {
        const [part1, part2, part3] = slashParts;
        // Assume DD/MM/YYYY for Indonesian locale
        if (parseInt(part3) > 1000) { // Year is last
            return `${part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        }
    }
    
    // Try parsing as Date object
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date.toISOString().substring(0, 10);
        }
    } catch (e) {
        console.warn('[SIMBAKES] Could not parse date:', dateValue, e);
    }
    
    // If all else fails, return null to avoid database error
    console.warn('[SIMBAKES] Invalid date format, returning null:', dateValue);
    return null;
}

/**
 * Map formData keys (camelCase) to database columns (snake_case)
 * All dates are converted to ISO format for PostgreSQL compatibility
 */
function mapFormDataToDB(formData) {
    return {
        // Informasi Registrasi
        no_register: formData.noRegister,
        tanggal_pengajuan: convertToISODate(formData.tanggalPengajuan),
        
        // Data Pribadi
        nik: formData.nik,
        nama_lengkap: formData.namaLengkap,
        tempat_lahir: formData.tempatLahir,
        tanggal_lahir: convertToISODate(formData.tanggalLahir),
        
        // Alamat
        alamat_ktp: formData.alamatKTP,
        alamat_domisili: formData.alamatDomisili,
        lama_domisili: formData.lamaDomisili,
        
        // Pekerjaan
        pekerjaan: formData.pekerjaan,
        posisi: formData.posisi,
        
        // Unit & Jurusan
        unit_kerja: formData.unitKerja,
        penjelasan: formData.penjelasan,
        jurusan_tujuan: formData.jurusanTujuan,
        jenjang_pendidikan: formData.jenjangPendidikan,
        unit_tujuan: formData.unitTujuan,
        rencana_tahun: formData.rencanaTahun,
        
        // Kontak
        no_hp: formData.noHP,
        no_wa: formData.noWA,
        email: formData.email,
        
        // GOOGLE DRIVE LINKS (NEW! - replacing base64 files)
        foto_drive_link: formData.fotoDriveLink || null,           // Link Google Drive foto pasfoto
        dokumen_drive_link: formData.dokumenDriveLink || null,     // Link Google Drive dokumen PDF
        surat_pernyataan_link: formData.suratPernyataanLink || null, // Link Google Drive surat pernyataan
        template_drive_link: formData.templateDriveLink || null,     // Link template (optional)
        
        // File Upload - TIDAK DISIMPAN (set null untuk hemat storage)
        foto: null,
        dokumen_pdf: null,
        nama_file: null,
        
        // Metadata
        status: formData.status || 'Proses Verifikasi',
        submission_method: formData.submissionMethod || 'google_drive_links',
        timestamp: new Date().toISOString()
    };
}

/**
 * Submit New Data to Supabase
 */
async function submitToSupabase(formData) {
    if (!supabaseClient) {
        throw new Error('Supabase client tidak tersedia');
    }
    
    try {
        // Map camelCase form data to snake_case DB columns
        const dbData = mapFormDataToDB(formData);
        
        console.log('[SIMBAKES] 📤 Mapped data for Supabase:', dbData);
        
        // Filter out undefined/null values that might cause issues
        const cleanData = {};
        for (const [key, value] of Object.entries(dbData)) {
            if (value !== undefined && value !== 'undefined') {
                cleanData[key] = value;
            }
        }
        
        // Add timestamps
        cleanData.created_at = new Date().toISOString();
        cleanData.updated_at = new Date().toISOString();
        
        console.log('[SIMBAKES] 📤 Clean data for insert:', cleanData);
        
        const { data, error } = await supabaseClient
            .from('submissions')
            .insert([cleanData])
            .select();
            
        if (error) {
            console.error('[SIMBAKES] ❌ Supabase Insert Error:', {
                message: error.message,
                code: error.code,
                hint: error.hint,
                details: error.details,
                fullError: error
            });
            throw error;
        }
        
        console.log('[SIMBAKES] ✅ Data submitted successfully:', data);
        return data;
    } catch (error) {
        console.error('[SIMBAKES] Error submitting data:', error);
        throw error;
    }
}

/**
 * Update Submission Status/Data
 */
async function updateSubmissionStatus(id, updates) {
    if (!supabaseClient) {
        throw new Error('Supabase client tidak tersedia');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('submissions')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();
            
        if (error) throw error;
        
        console.log('[SIMBAKES] ✅ Submission updated:', data);
        return data;
    } catch (error) {
        console.error('[SIMBAKES] Error updating submission:', error);
        throw error;
    }
}

/**
 * Delete Submission
 */
async function deleteSubmission(id) {
    if (!supabaseClient) {
        throw new Error('Supabase client tidak tersedia');
    }
    
    try {
        const { error } = await supabaseClient
            .from('submissions')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        console.log('[SIMBAKES] ✅ Submission deleted:', id);
        return true;
    } catch (error) {
        console.error('[SIMBAKES] Error deleting submission:', error);
        throw error;
    }
}

/**
 * Fetch Roadmap Data dari Supabase
 */
async function fetchRoadmapData() {
    // Pastikan Supabase client tersedia
    if (!supabaseClient) {
        console.warn('[SIMBAKES] Supabase not connected for roadmap');
        return [];
    }
    
    try {
        console.log('[SIMBAKES] Fetching roadmap data from Supabase...');
        
        const { data, error } = await supabaseClient
            .from('roadmap')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('[SIMBAKES] Roadmap query error:', error);
            throw error;
        }
        
        console.log(`[SIMBAKES] ✅ Roadmap data loaded: ${data?.length || 0} items`);
        
        if (data && data.length > 0) {
            console.log('[SIMBAKES] Sample roadmap data:', data[0]);
        }
        
        return data || [];
    } catch (error) {
        console.error('[SIMBAKES] Error fetching roadmap data:', error);
        return [];
    }
}

/**
 * Save Revision Data to Supabase
 */
async function saveRevisionToSupabase(revisionData) {
    if (!supabaseClient) {
        throw new Error('Supabase client tidak tersedia');
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('revisions')
            .insert([{
                ...revisionData,
                created_at: new Date().toISOString()
            }])
            .select();
            
        if (error) throw error;
        
        console.log('[SIMBAKES] ✅ Revision saved:', data);
        return data;
    } catch (error) {
        console.error('[SIMBAKES] Error saving revision:', error);
        throw error;
    }
}

/**
 * Track Visitor (optional - ke tabel visitors)
 */
async function trackVisitor(visitorData) {
    if (!supabaseClient) return;
    
    try {
        await supabaseClient
            .from('visitors')
            .insert([{
                ...visitorData,
                visited_at: new Date().toISOString()
            }]);
    } catch (error) {
        // Silent fail - visitor tracking tidak kritis
        console.log('[SIMBAKES] Visitor tracking skipped');
    }
}

/**
 * Get Visitor Stats - Enhanced version with complete data for dashboard
 * Returns data structure expected by fetchVisitorStats()
 * 
 * PERBAIKAN:
 * - Negara diambil dari data asli (bukan hardcoded)
 * - Online estimate lebih realistis
 * - Data per hari lengkap 30 hari
 */
async function getVisitorStats() {
    // Default response structure
    const defaultResponse = {
        status: 'success',
        data: {
            totalKunjungan: 0,
            hariIni: 0,
            onlineEstimate: 1, // Current user
            negara: {},
            dataPerHari: [],
            kunjunganTerakhir: []
        }
    };
    
    if (!supabaseClient) {
        console.warn('[SIMBAKES] Supabase client not available for visitor stats');
        return defaultResponse;
    }
    
    try {
        // Get total count
        const { count: total, error: countError } = await supabaseClient
            .from('visitors')
            .select('*', { count: 'exact', head: true });
        
        if (countError) throw countError;
        
        // Get today's visitors
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount, error: todayError } = await supabaseClient
            .from('visitors')
            .select('*', { count: 'exact', head: true })
            .gte('visited_at', today);
        
        // Get recent visitors (last 10)
        const { data: recentVisitors, error: recentError } = await supabaseClient
            .from('visitors')
            .select('*')
            .order('visited_at', { ascending: false })
            .limit(10);
        
        // Get visitors for last 30 days (for chart)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: chartData, error: chartError } = await supabaseClient
            .from('visitors')
            .select('visited_at, country, language')
            .gte('visited_at', thirtyDaysAgo.toISOString())
            .order('visited_at', { ascending: true });
        
        // ==========================================
        // PROCESS COUNTRY DATA (dari database!)
        // ==========================================
        const countryCounts = {};
        if (chartData && chartData.length > 0) {
            chartData.forEach(v => {
                // Prioritas: country field → extract dari language → Unknown
                let countryName = v.country;
                
                if (!countryName || countryName === 'Unknown' || countryName === '-') {
                    // Coba extract dari language (id-ID → Indonesia)
                    if (v.language) {
                        const langParts = v.language.split('-');
                        if (langParts.length > 1) {
                            countryName = langParts[1];
                        } else {
                            countryName = v.language;
                        }
                    }
                }
                
                // Default ke Indonesia jika masih unknown dan language id
                if ((!countryName || countryName === 'Unknown') && 
                    (v.language?.startsWith('id') || v.language === 'id')) {
                    countryName = 'Indonesia';
                }
                
                // Final fallback
                if (!countryName || countryName === '-' || countryName === 'Unknown') {
                    countryName = 'Other';
                }
                
                countryCounts[countryName] = (countryCounts[countryName] || 0) + 1;
            });
        }
        
        // Jika tetap kosong, set default
        if (Object.keys(countryCounts).length === 0) {
            countryCounts['Indonesia'] = total || 1;
        }
        
        // ==========================================
        // PROCESS CHART DATA - Group by date
        // ==========================================
        const dailyVisits = {};
        
        // Initialize last 30 days dengan 0
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dailyVisits[dateStr] = 0;
        }
        
        // Fill dengan data aktual
        if (chartData && chartData.length > 0) {
            chartData.forEach(v => {
                const date = v.visited_at ? v.visited_at.split('T')[0] : new Date().toISOString().split('T')[0];
                if (dailyVisits.hasOwnProperty(date)) {
                    dailyVisits[date]++;
                } else {
                    dailyVisits[date] = 1;
                }
            });
        }
        
        // Convert to array format for chart (sorted by date)
        const dataPerHari = Object.entries(dailyVisits)
            .map(([tanggal, jumlah]) => ({
                tanggal,
                jumlah
            }))
            .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        
        // ==========================================
        // PROCESS RECENT VISITORS FOR TABLE
        // ==========================================
        const kunjunganTerakhir = (recentVisitors || []).map((v, idx) => ({
            no: idx + 1,
            waktu: v.visited_at ? new Date(v.visited_at).toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '-',
            halaman: v.page || '/',
            browser: v.user_agent ? extractBrowserName(v.user_agent) : 'Unknown',
            referrer: v.referrer === 'direct' ? '🏠 Langsung' : 
                     (v.referrer?.includes('google') ? '🔍 Google' :
                      v.referrer?.includes('facebook') ? '📘 Facebook' :
                      v.referrer?.includes('instagram') ? '📷 Instagram' :
                      v.referrer?.includes('twitter') || v.referrer?.includes('t.co') ? '🐦 Twitter' :
                      v.referrer || '-')
        }));
        
        // ==========================================
        // ONLINE ESTIMATE (lebih realistis)
        // ==========================================
        // Hitung pengunjung dalam 5 menit terakhir sebagai "online"
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { count: onlineCount } = await supabaseClient
            .from('visitors')
            .select('*', { count: 'exact', head: true })
            .gte('visited_at', fiveMinutesAgo);
        
        const onlineEstimate = Math.max(onlineCount || 1, 1); // Minimal current user
        
        console.log('[VISITOR STATS] 📊 Data:', {
            total,
            today: todayCount,
            online: onlineEstimate,
            countries: Object.keys(countryCounts).length,
            chartPoints: dataPerHari.length
        });
        
        return {
            status: 'success',
            data: {
                totalKunjungan: total || 0,
                hariIni: todayCount || 0,
                onlineEstimate: onlineEstimate,
                negara: countryCounts,
                dataPerHari,
                kunjunganTerakhir
            }
        };
        
    } catch (error) {
        console.error('[SIMBAKES] Error fetching visitor stats:', error);
        return defaultResponse;
    }
}

/**
 * Extract browser name from user agent string
 */
function extractBrowserName(userAgent) {
    if (!userAgent) return 'Unknown';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Browser';
}

// ============================================================
// END OF SUPABASE FUNCTIONS
// ============================================================

/**
 * Show connection status notification
 */
async function showConnectionStatus() {
    showToast('🔍 Menguji koneksi ke server...', 'info');
    const result = await testSupabaseConnection();
    
    if (result.success) {
        showToast(result.message, 'success');
    } else {
        showToast(result.message, 'error', 5000);
        
        // Tampilkan tips jika error koneksi
        if (result.errorType === 'network' || result.errorType === 'cors') {
            setTimeout(() => {
                showConnectionTips();
            }, 1000);
        }
    }
    
    return result;
}

/**
 * Show tips for fixing connection issues
 */
function showConnectionTips() {
    const modalId = 'connection-tips-modal';
    
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.onclick = (e) => { if (e.target === modal) closeModal(modalId); };
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width:550px;">
            <div class="modal-header" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;">
                <h3 class="modal-title">🔧 Tips Memperbaiki Koneksi</h3>
                <button class="modal-close" onclick="closeModal('${modalId}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div style="padding:1.5rem;">
                <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:1rem;margin-bottom:1.5rem;border-radius:0 8px 8px 0;">
                    <p style="font-weight:600;color:#92400e;margin-bottom:0.5rem;">📋 Langkah-langkah perbaikan:</p>
                </div>
                
                <ol style="padding-left:1.25rem;color:#374151;line-height:1.8;">
                    <li style="margin-bottom:0.75rem;">
                        <strong>Deploy Ulang Web App:</strong>
                        <ul style="margin-top:0.25rem;padding-left:1rem;font-size:0.875rem;color:#6b7280;">
                            <li>Buka Google Apps Script Editor</li>
                            <li>Menu: Deploy > Manage deployments</li>
                            <li>Edit deployment > Version: New version</li>
                            <li><strong>Execute as:</strong> Me</li>
                            <li><strong>Who has access:</strong> Anyone (penting!)</li>
                        </ul>
                    </li>
                    <li style="margin-bottom:0.75rem;">
                        <strong>Periksa URL:</strong>
                        <p style="font-family:monospace;font-size:0.8rem;background:#f3f4f6;padding:0.5rem;border-radius:4px;margin-top:0.25rem;word-break:break-all;">
                            [Supabase URL hidden]...
                        </p>
                        <p style="font-size:0.8rem;color:#6b7280;margin-top:0.25rm;">Pastikan URL ini accessible di browser</p>
                    </li>
                    <li style="margin-bottom:0.75rem;">
                        <strong>Cek Koneksi Internet:</strong>
                        <p style="font-size:0.875rem;color:#6b7280;">Pastikan stabil dan tidak diblokir firewall</p>
                    </li>
                    <li>
                        <strong>Test Ulang:</strong>
                        <p style="font-size:0.875rem;color:#6b7280;">Klik tombol "Test Koneksi" setelah melakukan perbaikan</p>
                    </li>
                </ol>
                
                <div style="display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5e7eb;">
                    <button class="btn btn-primary" onclick="closeModal('${modalId}'); showConnectionStatus();">
                        🔄 Test Koneksi Lagi
                    </button>
                    <button class="btn" style="background:#f1f5f9;color:#475569;" onclick="closeModal('${modalId}')">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // ✅ FIX: Add 'active' class to show modal with animation
    modal.classList.add('active');
}

// Console log untuk debugging
console.log('🚀 SIMBAKES API Wrapper Loaded');
console.log('📍 Database:', 'Supabase connected');

// ===== GOOGLE DRIVE PHOTO HELPER (ENHANCED v2.0) =====
/**
 * KUMPULAN FUNGSI UNTUK MENAMPILKAN FOTO DARI GOOGLE DRIVE
 * 
 * Metode yang digunakan (urutan prioritas):
 * 1. Direct URL conversion (lh3.googleusercontent.com)
 * 2. Multiple URL format fallbacks
 * 3. Web App Proxy endpoint (getImage)
 * 4. Placeholder image jika semua gagal
 */

/**
 * Ekstrak File ID dari berbagai format Google Drive URL
 */
function extractFileId(driveUrl) {
    if (!driveUrl || driveUrl === '-' || driveUrl.length < 10) return '';
    
    let fileId = '';
    
    // Pattern 1: /file/d/FILE_ID/view or /file/d/FILE_ID/
    const match1 = driveUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (match1) fileId = match1[1];
    
    // Pattern 2: ?id=FILE_ID or &id=FILE_ID
    if (!fileId) {
        const match2 = driveUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
        if (match2) fileId = match2[1];
    }
    
    // Pattern 3: /d/FILE_ID (shortened URL)
    if (!fileId) {
        const match3 = driveUrl.match(/\/d\/([a-zA-Z0-9-_]{25,})/);
        if (match3) fileId = match3[1];
    }
    
    // Pattern 4: open?id=FILE_ID
    if (!fileId) {
        const match4 = driveUrl.match(/open\?id=([a-zA-Z0-9-_]+)/);
        if (match4) fileId = match4[1];
    }
    
    return fileId;
}

/**
 * Generate multiple possible direct URLs untuk sebuah File ID
 * Ini memberikan beberapa alternatif URL yang bisa dicoba
 */
function generateDirectUrls(fileId) {
    if (!fileId) return [];
    
    return [
        // Format 1: lh3.googleusercontent.com (thumbnail service) - PALING RELIABLE
        `https://lh3.googleusercontent.com/d/${fileId}=s2200`,
        // Format 2: drive.google.com uc export (view mode)
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        // Format 3: drive.google.com thumbnail
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w2200-h1500`,
        // Format 4: thumbnails.googleapi.com
        `https://thumbnails.googleusercontent.com/vi/${fileId}/w=2200-h=1500`
    ];
}

/**
 * Konversi Google Drive URL ke format direct image link
 * Mendukung berbagai format URL Drive:
 * - drive.google.com/file/d/FILE_ID
 * - drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 * - https://lh3.googleusercontent.com/...
 * 
 * @returns {string} URL langsung yang bisa digunakan di <img src>
 */
function getDirectImageUrl(driveUrl) {
    if (!driveUrl || driveUrl === '-' || driveUrl.length < 10) return '';
    
    // Jika sudah data URL (base64), return as-is
    if (driveUrl.startsWith('data:image/')) {
        return driveUrl;
    }
    
    // Jika sudah direct URL dan bukan drive, return as-is
    if (driveUrl.startsWith('http') && !driveUrl.includes('drive.google.com') && !driveUrl.includes('googleusercontent.com')) {
        return driveUrl;
    }
    
    // Jika sudah googleusercontent URL, return as-is
    if (driveUrl.includes('googleusercontent.com')) {
        return driveUrl;
    }
    
    // Extract file ID dan generate direct URL
    const fileId = extractFileId(driveUrl);
    
    if (fileId) {
        // Return URL paling reliable (format lh3)
        return `https://lh3.googleusercontent.com/d/${fileId}=s2200`;
    }
    
    // Jika tidak bisa extract, return original (mungkin sudah direct URL)
    return driveUrl;
}

/**
 * Generate proxy URL menggunakan Web App endpoint
 * Ini adalah FALLBACK jika direct URL gagal
 */
function getProxyImageUrl(driveUrl) {
    if (!driveUrl || driveUrl === '-' || driveUrl.length < 10) return '';
    
    const fileId = extractFileId(driveUrl);
    
    if (fileId) {
        // Method 1: Gunakan fileId langsung
        return `https://boeknpvlfamjmddsdopd.supabase.co/storage/v1/object/public/photos/${fileId}`;
    } else {
        // Method 2: Encode URL lengkap
        // Return drive URL as-is (Supabase storage)
    }
}

/**
 * Cache untuk foto yang berhasil dimuat
 * Menghindari request ulang ke server untuk foto yang sama
 */
const photoCache = new Map();
const photoFailCache = new Set(); // Cache URL yang gagal (untuk skip retry)

/**
 * Set gambar dengan MULTI-LEVEL FALLBACK
 * Urutan mencoba:
 * 1. Direct URL (lh3.googleusercontent.com)
 * 2. Alternative direct URLs (jika #1 gagal)
 * 3. Proxy via Web App (jika semua direct URL gagal)
 * 4. Placeholder (jika semua metode gagal)
 */
async function setPhotoWithFallback(imgElement, placeholderElement, photoUrl) {
    // Reset state
    imgElement.style.display = 'none';
    if (placeholderElement) placeholderElement.style.display = 'flex';
    
    // Validasi input
    if (!photoUrl || photoUrl === '-' || photoUrl.length < 10) {
        if (placeholderElement) placeholderElement.style.display = 'flex';
        return;
    }
    
    // Cek cache dulu
    const cacheKey = photoUrl.substring(0, 100);
    if (photoCache.has(cacheKey)) {
        imgElement.src = photoCache.get(cacheKey);
        imgElement.style.display = 'block';
        if (placeholderElement) placeholderElement.style.display = 'none';
        return;
    }
    
    // Cek fail cache - jika pernah gagal, langsung coba proxy
    if (photoFailCache.has(cacheKey)) {
        await tryProxyImage(imgElement, placeholderElement, photoUrl, cacheKey);
        return;
    }
    
    // LEVEL 1: Coba direct URL utama
    const directUrl = getDirectImageUrl(photoUrl);
    
    if (!directUrl) {
        await tryProxyImage(imgElement, placeholderElement, photoUrl, cacheKey);
        return;
    }
    
    // Try direct URL dengan Promise
    const directSuccess = await tryLoadImage(imgElement, directUrl);
    
    if (directSuccess) {
        photoCache.set(cacheKey, directUrl);
        imgElement.style.display = 'block';
        if (placeholderElement) placeholderElement.style.display = 'none';
        return;
    }
    
    // LEVEL 2: Coba alternative URLs
    const fileId = extractFileId(photoUrl);
    if (fileId) {
        const altUrls = generateDirectUrls(fileId);
        // Skip index 0 karena itu sudah dicoba sebagai directUrl
        for (let i = 1; i < altUrls.length; i++) {
            const altSuccess = await tryLoadImage(imgElement, altUrls[i]);
            if (altSuccess) {
                photoCache.set(cacheKey, altUrls[i]);
                imgElement.style.display = 'block';
                if (placeholderElement) placeholderElement.style.display = 'none';
                console.log(`✅ Foto loaded via alternative URL ${i}:`, altUrls[i].substring(0, 60));
                return;
            }
            // Small delay between attempts
            await new Promise(r => setTimeout(r, 100));
        }
    }
    
    // LEVEL 3: Coba via Proxy (Web App endpoint)
    await tryProxyImage(imgElement, placeholderElement, photoUrl, cacheKey);
}

/**
 * Helper: Coba load image dari URL, return true jika success
 */
function tryLoadImage(imgElement, url) {
    return new Promise((resolve) => {
        const testImg = new Image();
        const timeout = setTimeout(() => {
            resolve(false);
        }, 8000); // 8 second timeout
        
        testImg.onload = () => {
            clearTimeout(timeout);
            // Check if image has valid dimensions (not a redirect/error page)
            if (testImg.naturalWidth > 10 && testImg.naturalHeight > 10) {
                imgElement.src = url;
                resolve(true);
            } else {
                resolve(false);
            }
        };
        
        testImg.onerror = () => {
            clearTimeout(timeout);
            resolve(false);
        };
        
        testImg.src = url;
    });
}

/**
 * Helper: Coba load image via Web App Proxy
 */
async function tryProxyImage(imgElement, placeholderElement, photoUrl, cacheKey) {
    console.log('🔄 Trying proxy for photo:', photoUrl.substring(0, 50) + '...');
    
    try {
        const proxyUrl = getProxyImageUrl(photoUrl);
        const response = await fetch(proxyUrl);
        const result = await response.json();
        
        if (result.status === 'success' && result.imageUrl) {
            imgElement.src = result.imageUrl;
            imgElement.style.display = 'block';
            if (placeholderElement) placeholderElement.style.display = 'none';
            
            if (cacheKey && !result.isPlaceholder) {
                photoCache.set(cacheKey, result.imageUrl);
            }
            
            console.log('✅ Foto loaded via proxy');
            return;
        }
        
        // Proxy juga gagal, tampilkan placeholder
        throw new Error(result.message || 'Proxy failed');
        
    } catch (error) {
        console.warn('⚠️ Semua metode gagal untuk foto:', error.message);
        
        // Tandai di fail cache agar tidak retry terus
        if (cacheKey) {
            photoFailCache.add(cacheKey);
        }
        
        // Tampilkan placeholder
        imgElement.style.display = 'none';
        if (placeholderElement) placeholderElement.style.display = 'flex';
    }
}

