// ============================================================
// REAL-TIME VISITOR STATS UPDATE SYSTEM
// ============================================================
// Fitur: Update statistik pengunjung secara realtime
//       TANPA BLINK / FLICKER!
// ============================================================

/**
 * Global state untuk visitor stats real-time
 */
const VisitorStatsRealtime = {
    lastUpdate: null,
    intervalId: null,
    isUpdating: false,
    updateInterval: 30000, // 30 detik
    currentData: null,
    
    // Cache elemen DOM untuk performa
    elements: {
        total: null,
        today: null,
        online: null,
        countries: null
    }
};

/**
 * Inisialisasi Real-time Visitor Stats System
 * Panggil sekali saat page load
 */
function initVisitorRealtimeSystem() {
    console.log('[VISITOR RT] 🚀 Initializing real-time stats system...');
    
    // Cache DOM elements
    VisitorStatsRealtime.elements.total = document.getElementById('visitor-total');
    VisitorStatsRealtime.elements.today = document.getElementById('visitor-today');
    VisitorStatsRealtime.elements.online = document.getElementById('visitor-online');
    VisitorStatsRealtime.elements.countries = document.getElementById('visitor-countries');
    
    // Add CSS transitions untuk smooth updates
    addVisitorStatsTransitions();
    
    // Start auto-update interval
    startVisitorAutoRefresh();
    
    console.log('[VISITOR RT] ✅ Real-time system initialized (refresh every', VisitorStatsRealtime.updateInterval/1000, 'seconds)');
}

/**
 * Add CSS transitions untuk smooth number changes (tanpa blink!)
 */
function addVisitorStatsTransitions() {
    const styleId = 'visitor-stats-transitions';
    if (document.getElementById(styleId)) return; // Sudah ada
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Smooth transitions untuk visitor stat values */
        #visitor-total,
        #visitor-today,
        #visitor-online,
        #visitor-countries {
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            display: inline-block;
        }
        
        /* Pulse animation saat nilai berubah */
        .visitor-value-updated {
            animation: visitorPulse 0.5s ease-out;
        }
        
        @keyframes visitorPulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; color: #16a34a; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        /* Live indicator pulse */
        .live-indicator-pulse {
            animation: livePulse 2s infinite;
        }
        
        @keyframes livePulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Update visitor stats dengan SMOOTH TRANSITION (tanpa blink!)
 * 
 * @param {Object} newData - Data baru dari getVisitorStats()
 */
async function updateVisitorStatsSmooth(newData) {
    // Prevent concurrent updates
    if (VisitorStatsRealtime.isUpdating) {
        console.log('[VISITOR RT] ⏳ Update in progress, skipping...');
        return;
    }
    
    VisitorStatsRealtime.isUpdating = true;
    
    try {
        const data = newData.data || newData;
        const prevData = VisitorStatsRealtime.currentData || {};
        
        // Update each stat dengan smooth transition
        await animateValueChange(
            VisitorStatsRealtime.elements.total, 
            prevData.totalKunjungan || 0, 
            data.totalKunjungan || 0
        );
        
        await animateValueChange(
            VisitorStatsRealtime.elements.today, 
            prevData.hariIni || 0, 
            data.hariIni || 0
        );
        
        await animateValueChange(
            VisitorStatsRealtime.elements.online, 
            prevData.onlineEstimate || 1, 
            data.onlineEstimate || 1
        );
        
        await animateValueChange(
            VisitorStatsRealtime.elements.countries, 
            Object.keys(prevData.negara || {}).length || 0, 
            Object.keys(data.negara || {}).length || 0
        );
        
        // Update chart jika ada perubahan data
        if (data.dataPerHari && data.dataPerHari.length > 0) {
            renderVisitorChart(data.dataPerHari);
        }
        
        // Update recent visitors table
        if (data.kunjunganTerakhir && data.kunjunganTerakhir.length > 0) {
            renderRecentVisitorsTable(data.kunjunganTerakhir);
        }
        
        // Save current data
        VisitorStatsRealtime.currentData = data;
        VisitorStatsRealtime.lastUpdate = new Date();
        
        console.log('[VISITOR RT] ✅ Stats updated smoothly at:', VisitorStatsRealtime.lastUpdate.toLocaleTimeString());
        
    } catch (error) {
        console.error('[VISITOR RT] ❌ Error updating stats:', error);
    } finally {
        VisitorStatsRealtime.isUpdating = false;
    }
}

/**
 * Animasi perubahan nilai dengan counter effect (tanpa blink!)
 * 
 * @param {HTMLElement} element - Element yang akan diupdate
 * @param {number} startValue - Nilai awal
 * @param {number} endValue - Nilai akhir
 * @param {number} duration - Durasi animasi (ms)
 */
function animateValueChange(element, startValue, endValue, duration = 500) {
    return new Promise((resolve) => {
        if (!element) {
            resolve();
            return;
        }
        
        // Jika nilai sama, skip animasi
        if (startValue === endValue) {
            resolve();
            return;
        }
        
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out-cubic)
            const eased = 1 - Math.pow(1 - progress, 3);
            
            // Calculate current value
            const currentValue = Math.round(startValue + (endValue - startValue) * eased);
            
            // Format dan tampilkan
            element.textContent = formatNumber(currentValue);
            
            // Add pulse class saat selesai
            if (progress >= 1) {
                element.classList.add('visitor-value-updated');
                setTimeout(() => element.classList.remove('visitor-value-updated'), 500);
                resolve();
            } else {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    });
}

/**
 * Format angka dengan separator ribuan
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return num.toLocaleString('id-ID');
    }
    return num.toString();
}

/**
 * Start auto-refresh visitor stats
 */
function startVisitorAutoRefresh() {
    // Stop existing interval if any
    stopVisitorAutoRefresh();
    
    // Start new interval
    VisitorStatsRealtime.intervalId = setInterval(async () => {
        console.log('[VISITOR RT] 🔄 Auto-refreshing stats...');
        
        try {
            const result = await getVisitorStats();
            if (result.status === 'success') {
                await updateVisitorStatsSmooth(result);
            }
        } catch (error) {
            console.warn('[VISITOR RT] ⚠️ Auto-refresh failed:', error.message);
        }
    }, VisitorStatsRealtime.updateInterval);
    
    console.log('[VISITOR RT] ⏱️ Auto-refresh started (interval:', VisitorStatsRealtime.updateInterval/1000, 's)');
}

/**
 * Stop auto-refresh visitor stats
 */
function stopVisitorAutoRefresh() {
    if (VisitorStatsRealtime.intervalId) {
        clearInterval(VisitorStatsRealtime.intervalId);
        VisitorStatsRealtime.intervalId = null;
        console.log('[VISITOR RT] ⏹️ Auto-refresh stopped');
    }
}

/**
 * Manual refresh visitor stats (dipanggil dari UI)
 */
async function manualRefreshVisitorStats() {
    const btn = document.getElementById('visitor-refresh-btn');
    
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳...';
    }
    
    try {
        const result = await getVisitorStats();
        if (result.status === 'success') {
            await updateVisitorStatsSmooth(result);
            showToast('📊 Statistik pengunjung diperbarui', 'success', 2000);
        }
    } catch (error) {
        showToast('❌ Gagal memperbarui statistik', 'error', 3000);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🔄 Refresh';
        }
    }
}

// Export functions ke global scope
window.initVisitorRealtimeSystem = initVisitorRealtimeSystem;
window.updateVisitorStatsSmooth = updateVisitorStatsSmooth;
window.manualRefreshVisitorStats = manualRefreshVisitorStats;
window.startVisitorAutoRefresh = startVisitorAutoRefresh;
window.stopVisitorAutoRefresh = stopVisitorAutoRefresh;

/**

/**
 * Fetch statistik dari tabel Penetapan & Submissions (NEW)
 * - Lulus Tes PT: COUNT dari tabel penetapan
 * - Penerima Beasiswa: COUNT link_SK NOT NULL di tabel penetapan
 * - Jurusan Terbanyak: MODE jurusan_tujuan dari submissions
 * - Unit Terbanyak: MODE unit_tujuan dari submissions
 */
async function fetchPenetapanStats() {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase client tidak tersedia untuk fetchPenetapanStats');
            loadDummyPenetapanStats();
            return;
        }
        
        // Cek apakah elemen kartu penetapan ada di DOM
        const statLulusPT = document.getElementById('stat-lulus-pt');
        const statPenerima = document.getElementById('stat-penerima-beasiswa');
        
        if (!statLulusPT && !statPenerima) {
            console.log('[SIMBAKES] ℹ️ Kartu Penetapan tidak ditampilkan, skip fetching');
            return;
        }

        // 1. Hitung total data di tabel Penetapan (Lulus Tes PT)
        const { count: totalPenetapan, error: errorPenetapan } = await supabaseClient
            .from('penetapan')
            .select('*', { count: 'exact', head: true });

        if (errorPenetapan) console.warn('⚠️ Error fetching penetapan count:', errorPenetapan);

        // 2. Hitung penerima beasiswa (link_SK IS NOT NULL dan tidak kosong)
        const { count: penerimaBeasiswa, error: errorSK } = await supabaseClient
            .from('penetapan')
            .select('*', { count: 'exact', head: true })
            .not('link_sk', 'is', null)
            .not('link_sk', 'eq', '');

        if (errorSK) console.warn('⚠️ Error fetching penerima beasiswa:', errorSK);

        // 3. Ambil semua jurusan_tujuan untuk mencari yang terbanyak
        const { data: submissionsData, error: errorSubmissions } = await supabaseClient
            .from('submissions')
            .select('jurusan_tujuan, unit_tujuan');

        if (errorSubmissions) console.warn('⚠️ Error fetching submissions for stats:', errorSubmissions);

        // Proses jurusan terbanyak
        let jurusanTerbanyak = { nama: '-', jumlah: 0 };
        let unitTerbanyak = { nama: '-', jumlah: 0 };

        if (submissionsData && submissionsData.length > 0) {
            // Hitung frequency jurusan_tujuan
            const jurusanCount = {};
            const unitCount = {};

            submissionsData.forEach(item => {
                const jurusan = item.jurusan_tujuan || item.jurusanTujuan || '-';
                const unit = item.unit_tujuan || item.unitTujuan || '-';

                if (jurusan && jurusan !== '-') {
                    jurusanCount[jurusan] = (jurusanCount[jurusan] || 0) + 1;
                }
                if (unit && unit !== '-') {
                    unitCount[unit] = (unitCount[unit] || 0) + 1;
                }
            });

            // Cari yang terbanyak
            Object.entries(jurusanCount).forEach(([nama, jumlah]) => {
                if (jumlah > jurusanTerbanyak.jumlah) {
                    jurusanTerbanyak = { nama, jumlah };
                }
            });

            Object.entries(unitCount).forEach(([nama, jumlah]) => {
                if (jumlah > unitTerbanyak.jumlah) {
                    unitTerbanyak = { nama, jumlah };
                }
            });
        }

        // Update UI dengan animasi
        animateValue('stat-lulus-pt', totalPenetapan || 0);
        animateValue('stat-penerima-beasiswa', penerimaBeasiswa || 0);
        animateValue('stat-jurusan-terbanyak', jurusanTerbanyak.jumlah);
        animateValue('stat-unit-terbanyak', unitTerbanyak.jumlah);

        // Update nama jurusan dan unit
        const jurusanNamaEl = document.getElementById('jurusan-terbanyak-nama');
        const unitNamaEl = document.getElementById('unit-terbanyak-nama');
        
        if (jurusanNamaEl) jurusanNamaEl.textContent = jurusanTerbanyak.nama.length > 25 
            ? jurusanTerbanyak.nama.substring(0, 22) + '...' 
            : jurusanTerbanyak.nama;
        
        if (unitNamaEl) unitNamaEl.textContent = unitTerbanyak.nama.length > 25 
            ? unitTerbanyak.nama.substring(0, 22) + '...' 
            : unitTerbanyak.nama;

        console.log('✅ Penetapan stats loaded:', {
            totalPenetapan,
            penerimaBeasiswa,
            jurusanTerbanyak,
            unitTerbanyak
        });

    } catch (error) {
        console.error('❌ Error in fetchPenetapanStats:', error);
        loadDummyPenetapanStats();
    }
}

/**
 * Load dummy stats untuk kartu baru (fallback)
 */
function loadDummyPenetapanStats() {
    document.getElementById('stat-lulus-pt').textContent = '0';
    document.getElementById('stat-penerima-beasiswa').textContent = '0';
    document.getElementById('stat-jurusan-terbanyak').textContent = '0';
    document.getElementById('stat-unit-terbanyak').textContent = '0';
    document.getElementById('jurusan-terbanyak-nama').textContent = '-';
    document.getElementById('unit-terbanyak-nama').textContent = '-';
}

/**
 * Show detail data Penetapan (modal/popup)
 * @param {string} type - 'lulus_pt' atau 'penerima'
 */
async function showPenetapanDetail(type) {
    try {
        if (!supabaseClient) {
            showToast('⚠️ Supabase belum terhubung', 'warning');
            return;
        }

        let query = supabaseClient.from('penetapan').select('*');
        
        if (type === 'penerima') {
            query = query.not('link_sk', 'is', null).not('link_sk', 'eq', '');
        }

        const { data, error } = await query;

        if (error) throw error;

        const title = type === 'lulus_pt' ? '🎓 Data Lulus Tes PT (Penetapan)' : '📜 Penerima Beasiswa (Ada SK)';
        
        // Tampilkan modal dengan data
        showModalPenetapanDetail(title, data || [], type);

    } catch (error) {
        console.error('❌ Error showing penetapan detail:', error);
        showToast(`❌ Gagal memuat data: ${error.message}`, 'error');
    }
}

/**
 * Show detail Jurusan (modal dengan distribusi)
 */
async function showJurusanDetail() {
    try {
        if (!supabaseClient) {
            showToast('⚠️ Supabase belum terhubung', 'warning');
            return;
        }

        const { data, error } = await supabaseClient
            .from('submissions')
            .select('jurusan_tujuan, nama_lengkap');

        if (error) throw error;

        // Hitung distribusi jurusan
        const jurusanDist = {};
        (data || []).forEach(item => {
            const j = item.jurusan_tujuan || item.jurusanTujuan || 'Lainnya';
            jurusanDist[j] = (jurusanDist[j] || 0) + 1;
        });

        // Sort descending
        const sorted = Object.entries(jurusanDist)
            .sort((a, b) => b[1] - a[1]);

        showModalDistribution('📚 Distribusi Jurusan Tujuan', sorted, 'Jurusan');

    } catch (error) {
        console.error('❌ Error showing jurusan detail:', error);
        showToast(`❌ Gagal memuat data: ${error.message}`, 'error');
    }
}

/**
 * Show detail Unit Pendayagunaan (modal dengan distribusi)
 */
async function showUnitDetail() {
    try {
        if (!supabaseClient) {
            showToast('⚠️ Supabase belum terhubung', 'warning');
            return;
        }

        const { data, error } = await supabaseClient
            .from('submissions')
            .select('unit_tujuan, nama_lengkap');

        if (error) throw error;

        // Hitung distribusi unit
        const unitDist = {};
        (data || []).forEach(item => {
            const u = item.unit_tujuan || item.unitTujuan || 'Lainnya';
            unitDist[u] = (unitDist[u] || 0) + 1;
        });

        // Sort descending
        const sorted = Object.entries(unitDist)
            .sort((a, b) => b[1] - a[1]);

        showModalDistribution('🏥 Distribusi Unit Pendayagunaan', sorted, 'Unit');

    } catch (error) {
        console.error('❌ Error showing unit detail:', error);
        showToast(`❌ Gagal memuat data: ${error.message}`, 'error');
    }
}

/**
 * Modal helper: Tampilkan data Penetapan
 */
function showModalPenetapanDetail(title, data, type) {
    // Buat atau update modal
    let modal = document.getElementById('penetapan-detail-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'penetapan-detail-modal';
        modal.innerHTML = `
            <div class="modal-content modal-large" style="max-width:900px;">
                <div class="modal-header-modal">
                    <h3 id="penetapan-modal-title">${title}</h3>
                    <button class="modal-close-btn" onclick="closeModal('penetapan-detail-modal')">✕</button>
                </div>
                <div class="modal-body-modal">
                    <div class="status-summary" style="margin-bottom:1rem;">
                        <span class="summary-label">Total Data:</span>
                        <span class="summary-value" id="penetapan-total-count">${data.length}</span>
                    </div>
                    <div class="table-container modern-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Nama Lengkap</th>
                                    <th>Institusi</th>
                                    <th>Jurusan</th>
                                    <th>Status SK</th>
                                </tr>
                            </thead>
                            <tbody id="penetapan-detail-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Update title dan data
    document.getElementById('penetapan-modal-title').textContent = title;
    document.getElementById('penetapan-total-count').textContent = data.length;

    // Render tabel
    const tbody = document.getElementById('penetapan-detail-body');
    tbody.innerHTML = data.slice(0, 50).map((item, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${item.nama_lengkap || item.namaLengkap || '-'}</td>
            <td>${item.institusi || item.institution || '-'}</td>
            <td>${item.jurusan_tujuan || item.jurusanTujuan || '-'}</td>
            <td>
                <span class="status-badge ${(item.link_sk && item.link_sk.trim()) ? 'badge-green' : 'badge-gray'}" 
                      style="padding:4px 12px;border-radius:20px;font-size:0.8rem;">
                    ${(item.link_sk && item.link_sk.trim()) ? '✓ Ada SK' : 'Belum'}
                </span>
            </td>
        </tr>
    `).join('');

    if (data.length > 50) {
        tbody.innerHTML += `<tr><td colspan="5" style="text-align:center;color:#64748b;">... dan ${data.length - 50} data lainnya</td></tr>`;
    }

    modal.classList.add('active');
}

/**
 * Modal helper: Tampilkan distribusi data
 */
function showModalDistribution(title, distribution, labelName) {
    // Buat atau update modal
    let modal = document.getElementById('distribution-detail-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'distribution-detail-modal';
        modal.innerHTML = `
            <div class="modal-content modal-large" style="max-width:700px;">
                <div class="modal-header-modal">
                    <h3 id="distribution-modal-title">${title}</h3>
                    <button class="modal-close-btn" onclick="closeModal('distribution-detail-modal')">✕</button>
                </div>
                <div class="modal-body-modal">
                    <div id="distribution-chart" style="margin-bottom:1.5rem;"></div>
                    <div class="table-container modern-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>${labelName}</th>
                                    <th>Jumlah</th>
                                    <th>Persentase</th>
                                </tr>
                            </thead>
                            <tbody id="distribution-detail-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Update title
    document.getElementById('distribution-modal-title').textContent = title;

    // Hitung total
    const total = distribution.reduce((sum, [, count]) => sum + count, 0);

    // Render tabel
    const tbody = document.getElementById('distribution-detail-body');
    tbody.innerHTML = distribution.map(([name, count], i) => {
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        const barWidth = total > 0 ? (count / total) * 100 : 0;
        return `
            <tr>
                <td><strong>${i + 1}</strong></td>
                <td>${name}</td>
                <td><strong>${count}</strong></td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                            <div style="width:${barWidth}%;height:100%;background:linear-gradient(90deg,#059669,#10b981);border-radius:4px;"></div>
                        </div>
                        <span style="min-width:45px;text-align:right;font-size:0.85rem;color:#64748b;">${pct}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    modal.classList.add('active');
}

// Export functions to global scope
window.showPenetapanDetail = showPenetapanDetail;
window.showJurusanDetail = showJurusanDetail;
window.showUnitDetail = showUnitDetail;
window.fetchPenetapanStats = fetchPenetapanStats;

/**
 * Render grafik kunjungan menggunakan Canvas API
 */
function renderVisitorChart(chartData) {
    const canvas = document.getElementById('visitor-chart');
    
    // Safety check - skip jika canvas tidak ada
    if (!canvas) {
        console.log('[SIMBAKES] ℹ️ Visitor chart element not found, skipping render');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2; // Retina display
    const height = canvas.height = 400;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Setup dimensions
    const padding = { top: 40, right: 30, bottom: 60, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Find max value for scaling
    const maxVal = Math.max(...chartData.map(d => d.jumlah), 10);
    const niceMax = Math.ceil(maxVal / 5) * 5; // Round up to nearest 5
    
    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.font = '20px -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        const val = Math.round(niceMax - (niceMax / 5) * i);
        
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        
        ctx.fillText(val.toString(), padding.left - 10, y + 6);
    }
    
    // Draw bars
    const barWidth = (chartWidth / chartData.length) * 0.7;
    const gap = (chartWidth / chartData.length) * 0.3;
    
    chartData.forEach((d, i) => {
        const x = padding.left + (barWidth + gap) * i + gap / 2;
        const barHeight = (d.jumlah / niceMax) * chartHeight;
        const y = padding.top + chartHeight - barHeight;
        
        // Create gradient for bar
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#06b6d4');
        
        // Draw rounded bar
        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = Math.min(barWidth / 4, 8);
        ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
        ctx.fill();
        
        // Draw date labels (show every 7 days to avoid crowding)
        if (i % 7 === 0 || i === chartData.length - 1) {
            ctx.save();
            ctx.translate(x + barWidth / 2, height - padding.bottom + 15);
            ctx.rotate(-Math.PI / 4);
            ctx.fillStyle = '#64748b';
            ctx.font = '18px -apple-system, sans-serif';
            ctx.textAlign = 'right';
            const dateLabel = new Date(d.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            ctx.fillText(dateLabel, 0, 0);
            ctx.restore();
        }
    });
    
    // Draw axis labels
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Jumlah Kunjungan', width / 2, height - 5);
}

/**
 * Render tabel pengunjung terakhir [WITH PAGINATION]
 */
// Variable already declared at top to avoid TDZ error

function renderRecentVisitorsTable(visitors) {
    // Cek apakah element ada di DOM (section Pengunjung Terakhir sudah dihapus)
    const tbody = document.getElementById('recent-visitors-body');
    
    if (!tbody) {
        console.log('[SIMBAKES] ℹ️ Section Pengunjung Terakhir tidak ditampilkan (disabled)');
        return;  // Skip rendering jika element tidak ada
    }
    
    // Cache data for pagination
    cachedRecentVisitors = visitors || [];
    renderRecentVisitors();
}

/**
 * Render Recent Visitors with Pagination
 */

/**
 * Render Recent Visitors Table with Pagination
 * Uses data from getVisitorStats() which returns proper Supabase format
 */
function renderRecentVisitors() {
    // Safety check - pastikan element ada di DOM
    const tbody = document.getElementById('recent-visitors-body');
    const container = document.getElementById('pagination-recent-visitors-container');
    
    if (!tbody || !container) {
        return;  // Skip jika element tidak ada (section disabled)
    }
    
    if (!cachedRecentVisitors || cachedRecentVisitors.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-cell">📭 Belum ada data pengunjung</td>
            </tr>
        `;
        container.innerHTML = '';
        return;
    }
    
    // Use PaginationManager
    const paginatedResult = PaginationManager.paginate('recent-visitors', cachedRecentVisitors);
    
    tbody.innerHTML = paginatedResult.data.map((v, index) => {
        // Data comes from getVisitorStats() in this format:
        // { no, waktu, halaman, browser, referrer }
        const no = v.no || (index + 1);
        const waktu = v.waktu || v.timestamp || v.visited_at || '-';
        const halaman = v.halaman || v.page || '/';
        const browser = v.browser || v.user_agent ? extractBrowserName(v.user_agent) : 'Unknown';
        const referrer = v.referrer || '-';
        
        return `
            <tr>
                <td><strong>${no}</strong></td>
                <td>${waktu}</td>
                <td>${halaman}</td>
                <td><span class="status-badge status-verify">${browser}</span></td>
                <td style="font-size: 0.85rem; color: #64748b;">${referrer}</td>
            </tr>
        `;
    }).join('');
    
    // Render pagination controls
    container.innerHTML = PaginationManager.renderControls('recent-visitors');
}

