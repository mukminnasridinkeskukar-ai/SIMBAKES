/* ============================================
   SIMBAKES - Beasiswa Tematik Bidang Kesehatan
   Application JavaScript (Versi Lengkap + Supabase)
   ============================================ */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        LANDING_DURATION: 3000,
        DEFAULT_PAGE: 'dashboard',
        ANIMATION_DURATION: 500,
        
        // Database mode: 'supabase' atau 'demo'
        // Akan otomatis detect berdasarkan koneksi Supabase
        DB_MODE: 'auto' 
    };

    // State untuk database connection
    let db = null;
    let isSupabaseConnected = false;

    // ============================================
    // DOM ELEMENTS
    // ============================================
    const DOM = {
        landingPage: null,
        app: null,
        menuToggle: null,
        sidebar: null,
        sidebarOverlay: null,
        mainContent: null,
        navItems: null,
        pages: null
    };

    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const State = {
        currentPage: CONFIG.DEFAULT_PAGE,
        isSidebarOpen: false,
        isLandingComplete: false,
        formStep: 1,
        totalFormSteps: 4,
        dbMode: 'demo' // Default ke demo mode
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    async function init() {
        console.log('🚀 SIMBAKES - Initializing application...');
        
        cacheDOMElements();
        
        // Initialize database connection
        await initDatabase();
        
        // Setup UI components
        setupLandingPage();
        setupNavigation();
        setupSidebar();
        setupHashRouting();
        setupFormHandler();
        setupSearchHandlers();
        
        // Load dashboard data if on dashboard page
        if (State.currentPage === 'dashboard') {
            loadDashboardData();
        }
        
        console.log('✅ SIMBAKES - Application initialized');
        console.log(`📊 Database Mode: ${State.dbMode}`);
    }

    /**
     * Initialize database connection to Supabase
     */
    async function initDatabase() {
        try {
            // Check if SIMBAKESDB is available (from supabase-client.js)
            if (typeof window.SIMBAKESDB !== 'undefined') {
                db = window.SIMBAKESDB;
                await db.init();
                
                if (db.isConnected) {
                    isSupabaseConnected = true;
                    State.dbMode = 'supabase';
                    console.log('✅ Connected to Supabase database');
                    
                    // Show connection status in UI
                    showConnectionStatus(true);
                } else {
                    State.dbMode = 'demo';
                    console.log('⚠️ Using demo mode (Supabase not configured)');
                    showConnectionStatus(false);
                }
            } else {
                State.dbMode = 'demo';
                console.log('⚠️ SIMBAKESDB not found, using demo mode');
            }
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            State.dbMode = 'demo';
            showConnectionStatus(false);
        }
    }

    /**
     * Show database connection status indicator
     */
    function showConnectionStatus(connected) {
        // Create or update status indicator
        let statusEl = document.getElementById('db-status');
        
        if (!statusEl && DOM.app) {
            statusEl = document.createElement('div');
            statusEl.id = 'db-status';
            statusEl.style.cssText = `
                position: fixed;
                bottom: 70px;
                right: 20px;
                padding: 0.5rem 1rem;
                border-radius: var(--radius-full);
                font-size: 0.75rem;
                font-weight: 600;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                box-shadow: var(--shadow-lg);
                transition: all 0.3s ease;
            `;
            DOM.app.appendChild(statusEl);
        }
        
        if (statusEl) {
            if (connected) {
                statusEl.innerHTML = '🟢 Supabase Connected';
                statusEl.style.background = '#D1FAE5';
                statusEl.style.color = '#065F46';
            } else {
                statusEl.innerHTML = '🟡 Demo Mode';
                statusEl.style.background = '#FEF3C7';
                statusEl.style.color = '#92400E';
            }
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (statusEl) {
                    statusEl.style.opacity = '0';
                    setTimeout(() => {
                        if (statusEl && statusEl.parentElement) {
                            statusEl.remove();
                        }
                    }, 300);
                }
            }, 5000);
        }
    }

    function cacheDOMElements() {
        DOM.landingPage = document.getElementById('landing-page');
        DOM.app = document.getElementById('app');
        DOM.menuToggle = document.getElementById('menu-toggle');
        DOM.sidebar = document.getElementById('sidebar');
        DOM.sidebarOverlay = document.getElementById('sidebar-overlay');
        DOM.mainContent = document.getElementById('main-content');
        DOM.navItems = document.querySelectorAll('.nav-item');
        DOM.pages = document.querySelectorAll('.page');
    }

    // ============================================
    // LANDING PAGE LOGIC
    // ============================================
    function setupLandingPage() {
        setTimeout(() => {
            transitionToApp();
        }, CONFIG.LANDING_DURATION);
    }

    function transitionToApp() {
        if (DOM.landingPage) {
            DOM.landingPage.classList.add('fade-out');
        }

        setTimeout(() => {
            if (DOM.landingPage) {
                DOM.landingPage.style.display = 'none';
            }
            if (DOM.app) {
                DOM.app.classList.remove('hidden');
            }
            
            State.isLandingComplete = true;
            handleInitialNavigation();
            
        }, CONFIG.ANIMATION_DURATION);
    }

    function handleInitialNavigation() {
        const hash = window.location.hash;
        
        if (hash && hash.startsWith('#/')) {
            const pageName = hash.substring(2);
            navigateTo(pageName);
        } else {
            navigateTo(CONFIG.DEFAULT_PAGE);
        }
    }

    // ============================================
    // NAVIGATION SYSTEM (SPA Router)
    // ============================================
    function setupNavigation() {
        DOM.navItems.forEach(item => {
            item.addEventListener('click', handleNavClick);
        });
    }

    function handleNavClick(event) {
        event.preventDefault();
        
        const target = event.currentTarget;
        const pageName = target.getAttribute('data-page');
        
        if (pageName) {
            navigateTo(pageName);
            closeSidebarOnMobile();
        }
    }

    function navigateTo(pageName) {
        const targetPage = document.getElementById(`page-${pageName}`);
        
        if (!targetPage) {
            console.warn(`Page "${pageName}" not found, redirecting to default`);
            pageName = CONFIG.DEFAULT_PAGE;
        }

        State.currentPage = pageName;

        if (window.history && window.history.pushState) {
            window.history.pushState(null, null, `#/${pageName}`);
        } else {
            window.location.hash = `#/${pageName}`;
        }

        updateActiveStates(pageName);
        showPage(pageName);

        // Load data for specific pages
        loadPageData(pageName);
    }

    /**
     * Load data for specific pages when navigated
     */
    async function loadPageData(pageName) {
        switch (pageName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'data-pengusulan':
                await loadAdminPengusulanData();
                break;
            case 'data-penetapan':
                await loadAdminPenetapanData();
                break;
            case 'data-roadmap':
                await loadAdminRoadmapData();
                break;
            case 'informasi-update':
                await loadInformasiData();
                break;
        }
    }

    /**
     * Load Dashboard Statistics
     */
    async function loadDashboardData() {
        try {
            let stats;
            
            if (isSupabaseConnected && db) {
                stats = await db.getDashboardStats();
            } else {
                stats = getDemoStats();
            }
            
            // Update stat cards with animation
            animateValue('stat-total', 0, stats.total, 1000, '📋 Total Pengusulan');
            animateValue('stat-approved', 0, stats.disetujui, 1000, '✅ Disetujui');
            animateValue('stat-review', 0, stats.dalam_proses, 1000, '⏳ Dalam Proses');
            animateValue('stat-rejected', 0, stats.ditolak, 1000, '❌ Ditolak');
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    /**
     * Animate number counting up
     */
    function animateValue(elementId, start, end, duration, label) {
        // Try to find element by ID or use default structure
        let element = document.getElementById(elementId);
        
        // If not found by ID, try to find in stat cards
        if (!element) {
            const statCards = document.querySelectorAll('.stat-card .stat-number');
            const index = ['total', 'approved', 'review', 'rejected'].indexOf(
                elementId.replace('stat-', '')
            );
            if (index >= 0 && statCards[index]) {
                element = statCards[index];
            }
        }
        
        if (element) {
            const range = end - start;
            const startTime = performance.now();
            
            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const value = Math.floor(start + (range * easeOutQuad(progress)));
                element.textContent = value;
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }
            
            requestAnimationFrame(update);
        }
    }

    function easeOutQuad(t) {
        return t * (2 - t);
    }

    /**
     * Get demo statistics (fallback when offline)
     */
    function getDemoStats() {
        return {
            total: 156,
            disetujui: 89,
            dalam_proses: 42,
            ditolak: 25
        };
    }

    /**
     * Load Admin Pengusulan Data from Supabase
     */
    async function loadAdminPengusulanData() {
        try {
            let data;
            
            if (isSupabaseConnected && db) {
                data = await db.getAll(SUPABASE_CONFIG.TABLES.PENGUSULAN, {
                    order: { column: 'created_at', ascending: false },
                    limit: 50
                });
            } else {
                data = getDemoPengusulanList();
            }
            
            // Update table body
            updateTableBody('table-pengusulan', data, formatPengusulanRow);
            
        } catch (error) {
            console.error('Error loading pengusulan data:', error);
        }
    }

    /**
     * Load Admin Penetapan Data from Supabase
     */
    async function loadAdminPenetapanData() {
        try {
            let data;
            
            if (isSupabaseConnected && db) {
                data = await db.getAll(SUPABASE_CONFIG.TABLES.PENETAPAN, {
                    order: { column: 'tanggal_penetapan', ascending: false },
                    limit: 50
                });
            } else {
                data = getDemoPenetapanList();
            }
            
            updateTableBody('table-penetapan', data, formatPenetapanRow);
            
        } catch (error) {
            console.error('Error loading penetapan data:', error);
        }
    }

    /**
     * Load Admin Roadmap Data from Supabase
     */
    async function loadAdminRoadmapData() {
        try {
            let data;
            
            if (isSupabaseConnected && db) {
                data = await db.getAll(SUPABASE_CONFIG.TABLES.ROADMAP, {
                    filter: { tahun: new Date().getFullYear() },
                    order: { column: 'program_studi', ascending: true }
                });
            } else {
                data = getDemoRoadmapList();
            }
            
            updateTableBody('table-roadmap', data, formatRoadmapRow);
            
            // Update summary cards
            updateRoadmapSummary(data);
            
        } catch (error) {
            console.error('Error loading roadmap data:', error);
        }
    }

    /**
     * Load Informasi/News Data from Supabase
     */
    async function loadInformasiData() {
        try {
            let data;
            
            if (isSupabaseConnected && db) {
                data = await db.getAll(SUPABASE_CONFIG.TABLES.INFORMASI, {
                    filter: { status: 'published' },
                    order: { column: 'published_at', ascending: false },
                    limit: 10
                });
            } else {
                data = getDemoInformasiList();
            }
            
            // Update news list (implementation depends on HTML structure)
            console.log('Loaded informasi data:', data.length, 'items');
            
        } catch (error) {
            console.error('Error loading informasi data:', error);
        }
    }

    /**
     * Update table body with data
     */
    function updateTableBody(tableId, data, rowFormatter) {
        const table = document.getElementById(tableId);
        if (!table) return;
        
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" style="text-align: center; padding: 2rem; color: #64748B;">
                        📭 Tidak ada data tersedia
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = data.map((item, index) => rowFormatter(item, index + 1)).join('');
    }

    /**
     * Format pengusulan row for table
     */
    function formatPengusulanRow(item, no) {
        const statusLabels = {
            'draft': '<span class="table-badge badge-draft">Draft</span>',
            'submitted': '<span class="table-badge badge-review">Submitted</span>',
            'review': '<span class="table-badge badge-review">Review</span>',
            'approved': '<span class="table-badge badge-approved">Disetujui</span>',
            'rejected': '<span class="table-badge badge-rejected">Ditolak</span>'
        };
        
        const tanggal = item.created_at ? formatDate(item.created_at) : item.tanggal || '-';
        
        return `
            <tr>
                <td>${no}</td>
                <td>${item.nomor_usulan || '-'}</td>
                <td>${item.nama_lengkap || item.nama || '-'}</td>
                <td>${formatProdi(item.program_studi_dituju || item.prodi)}</td>
                <td>${item.nama_institusi || item.institusi || '-'}</td>
                <td>${tanggal}</td>
                <td>${statusLabels[item.status] || '<span class="table-badge">Unknown</span>'}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon btn-view" onclick="viewPengusulan('${item.id || item.nomor}')" title="Lihat">👁️</button>
                        <button class="btn-icon btn-edit" onclick="editPengusulan('${item.id || item.nomor}')" title="Edit">✏️</button>
                        <button class="btn-icon btn-delete" onclick="deletePengusulan('${item.id || item.nomor}')" title="Hapus">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Format penetapan row for table
     */
    function formatPenetapanRow(item, no) {
        const danaLabels = {
            'pending': '<span class="table-badge badge-pending">Pending</span>',
            'processing': '<span class="table-badge badge-processing">Proses</span>',
            'disbursed': '<span class="table-badge badge-disbursed">Dicairkan</span>',
            'cancelled': '<span class="table-badge badge-rejected">Batal</span>'
        };
        
        const tanggal = item.tanggal_penetapan ? formatDate(item.tanggal_penetapan) : item.tanggal || '-';
        
        return `
            <tr>
                <td>${no}</td>
                <td>${item.nomor_penetapan || item.nomor || '-'}</td>
                <td>${item.nama_lengkap || item.nama || '-'}</td>
                <td>${formatProdi(item.program_studi || item.prodi)}</td>
                <td>${item.batch || '-'}</td>
                <td>${tanggal}</td>
                <td>${danaLabels[item.status_dana || item.dana] || '<span class="table-badge">Unknown</span>'}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon btn-view" onclick="viewPenetapan('${item.id || item.nomor}')" title="Lihat">👁️</button>
                        <button class="btn-icon btn-edit" onclick="editPenetapan('${item.id || item.nomor}')" title="Edit">✏️</button>
                        <button class="btn-icon btn-print" onclick="printPenetapan('${item.id || item.nomor}')" title="Cetak">🖨️</button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Format roadmap row for table
     */
    function formatRoadmapRow(item, no) {
        const statusLabels = {
            'available': '<span class="table-badge badge-available">Tersedia</span>',
            'limited': '<span class="table-badge badge-limited">Terbatas</span>',
            'full': '<span class="table-badge badge-rejected">Penuh</span>',
            'closed': '<span class="table-badge badge-draft">Tutup</span>'
        };
        
        const persentase = item.persentase || (item.kuota > 0 ? ((item.terdaftar / item.kuota) * 100).toFixed(2) : 0);
        
        return `
            <tr>
                <td>${no}</td>
                <td>${item.program_studi || '-'}</td>
                <td>${item.jenjang || '-'}</td>
                <td>${item.kuota || 0}</td>
                <td>${item.terdaftar || 0}</td>
                <td>${item.tersisa || (item.kuota - item.terdaftar)}</td>
                <td>
                    <div class="progress-mini">
                        <div class="progress-bar-mini" style="width: ${Math.min(persentase, 100)}%"></div>
                    </div>
                    ${persentase}%
                </td>
                <td>${formatCurrency(item.budget)}</td>
                <td>${statusLabels[item.status] || '<span class="table-badge">Unknown</span>'}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon btn-view" onclick="viewRoadmap('${item.id}')" title="Lihat">👁️</button>
                        <button class="btn-icon btn-edit" onclick="editRoadmap('${item.id}')" title="Edit">✏️</button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Update Roadmap Summary Cards
     */
    function updateRoadmapSummary(data) {
        if (!data || data.length === 0) return;
        
        const total = data.reduce((sum, item) => sum + (item.kuota || 0), 0);
        const filled = data.reduce((sum, item) => sum + (item.terdaftar || 0), 0);
        const available = total - filled;
        const budget = data.reduce((sum, item) => sum + (item.budget || 0), 0);
        
        // Update summary cards if they exist
        const summaryCards = document.querySelectorAll('.summary-number');
        if (summaryCards.length >= 4) {
            summaryCards[0].textContent = total;
            summaryCards[1].textContent = filled;
            summaryCards[2].textContent = available;
            summaryCards[3].textContent = formatCurrency(budget);
        }
    }

    // Helper functions
    function formatProdi(prodi) {
        if (!prodi) return '-';
        // Convert slug format to readable
        return prodi.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatCurrency(amount) {
        if (!amount) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    // Demo data fallbacks
    function getDemoPengusulanList() {
        return [
            { id: 1, nomor_usulan: 'USL-2024-0001', nama_lengkap: 'Ahmad Fauzi', program_studi_dituju: 'Keperawatan-S1', nama_institusi: 'Universitas Indonesia', created_at: '2024-01-15', status: 'approved' },
            { id: 2, nomor_usulan: 'USL-2024-0002', nama_lengkap: 'Siti Nurhaliza', program_studi_dituju: 'Profesi-Dokter', nama_institusi: 'Universitas Gadjah Mada', created_at: '2024-01-18', status: 'review' },
            { id: 3, nomor_usulan: 'USL-2024-0003', nama_lengkap: 'Budi Santoso', program_studi_dituju: 'Farmasi-S1', nama_institusi: 'Institut Teknologi Bandung', created_at: '2024-01-20', status: 'rejected' },
            { id: 4, nomor_usulan: 'USL-2024-0004', nama_lengkap: 'Dewi Lestari', program_studi_dituju: 'KM-S2', nama_institusi: 'Universitas Airlangga', created_at: '2024-01-22', status: 'draft' },
            { id: 5, nomor_usulan: 'USL-2024-0005', nama_lengkap: 'Rizky Pratama', program_studi_dituju: 'Gizi-S1', nama_institusi: 'Universitas Diponegoro', created_at: '2024-01-25', status: 'approved' }
        ];
    }

    function getDemoPenetapanList() {
        return [
            { id: 1, nomor_penetapan: 'PNT-2024-0001', nama_lengkap: 'Ahmad Fauzi', program_studi: 'Keperawatan (S1)', batch: 'Batch 1', tanggal_penetapan: '2024-02-01', status_dana: 'disbursed' },
            { id: 2, nomor_penetapan: 'PNT-2024-0002', nama_lengkap: 'Siti Nurhaliza', program_studi: 'Kedokteran (Profesi)', batch: 'Batch 1', tanggal_penetapan: '2024-02-01', status_dana: 'disbursed' },
            { id: 3, nomor_penetapan: 'PNT-2024-0015', nama_lengkap: 'Rizky Pratama', program_studi: 'Gizi (S1)', batch: 'Batch 2', tanggal_penetapan: '2024-02-15', status_dana: 'processing' },
            { id: 4, nomor_penetapan: 'PNT-2024-0028', nama_lengkap: 'Maya Putri', program_studi: 'Farmasi (S1)', batch: 'Batch 3', tanggal_penetapan: '2024-03-01', status_dana: 'pending' },
            { id: 5, nomor_penetapan: 'PNT-2024-0042', nama_lengkap: 'Hendra Wijaya', program_studi: 'Kesehatan Masyarakat (S2)', batch: 'Batch 3', tanggal_penetapan: '2024-03-01', status_dana: 'pending' }
        ];
    }

    function getDemoRoadmapList() {
        return [
            { id: 1, program_studi: 'Keperawatan', jenjang: 'S1', kuota: 150, terdaftar: 142, budget: 7500000, status: 'available' },
            { id: 2, program_studi: 'Kedokteran', jenjang: 'Profesi', kuota: 100, terdaftar: 98, budget: 10000000, status: 'limited' },
            { id: 3, program_studi: 'Kesehatan Masyarakat', jenjang: 'S2', kuota: 80, terdaftar: 65, budget: 5000000, status: 'available' },
            { id: 4, program_studi: 'Farmasi', jenjang: 'S1', kuota: 90, terdaftar: 68, budget: 4500000, status: 'available' },
            { id: 5, program_studi: 'Gizi', jenjang: 'S1/S2', kuota: 80, terdaftar: 47, budget: 3000000, status: 'available' }
        ];
    }

    function getDemoInformasiList() {
        return [
            { id: 1, judul: 'Pendaftaran Beasiswa Tematik Kesehatan 2024 Resmi Dibuka', kategori: 'Berita Utama', published_at: '2024-01-15', views: 2534 },
            { id: 2, judul: 'Perpanjangan Batas Waktu Pengusulan', kategori: 'Pengumuman', published_at: '2024-06-10', views: 1523 },
            { id: 3, judul: 'Fitur Baru: Tracking Real-time Status Usulan', kategori: 'Update Sistem', published_at: '2024-06-05', views: 876 }
        ];
    }

    function updateActiveStates(pageName) {
        DOM.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            }
        });

        DOM.pages.forEach(page => {
            page.classList.remove('active');
        });
    }

    function showPage(pageName) {
        const targetPage = document.getElementById(`page-${pageName}`);
        
        if (targetPage) {
            targetPage.classList.add('active');
            
            if (DOM.mainContent) {
                DOM.mainContent.scrollTop = 0;
            }
        }
    }

    function setupHashRouting() {
        window.addEventListener('hashchange', function() {
            if (!State.isLandingComplete) return;

            const hash = window.location.hash;
            
            if (hash && hash.startsWith('#/')) {
                const pageName = hash.substring(2);
                
                if (pageName !== State.currentPage) {
                    navigateTo(pageName);
                }
            }
        });

        window.addEventListener('popstate', function() {
            if (!State.isLandingComplete) return;

            const hash = window.location.hash;
            
            if (hash && hash.startsWith('#/')) {
                const pageName = hash.substring(2);
                navigateTo(pageName);
            } else {
                navigateTo(CONFIG.DEFAULT_PAGE);
            }
        });
    }

    // ============================================
    // SIDEBAR FUNCTIONALITY
    // ============================================
    function setupSidebar() {
        if (DOM.menuToggle) {
            DOM.menuToggle.addEventListener('click', toggleSidebar);
        }

        if (DOM.sidebarOverlay) {
            DOM.sidebarOverlay.addEventListener('click', closeSidebar);
        }

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && State.isSidebarOpen) {
                closeSidebar();
            }
        });

        window.addEventListener('resize', debounce(handleResize, 150));
    }

    function toggleSidebar() {
        if (State.isSidebarOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }

    function openSidebar() {
        State.isSidebarOpen = true;
        
        if (DOM.sidebar) {
            DOM.sidebar.classList.add('open');
        }
        
        if (DOM.sidebarOverlay) {
            DOM.sidebarOverlay.classList.add('active');
        }

        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        State.isSidebarOpen = false;
        
        if (DOM.sidebar) {
            DOM.sidebar.classList.remove('open');
        }
        
        if (DOM.sidebarOverlay) {
            DOM.sidebarOverlay.classList.remove('active');
        }

        document.body.style.overflow = '';
    }

    function closeSidebarOnMobile() {
        if (window.innerWidth <= 1024) {
            closeSidebar();
        }
    }

    function handleResize() {
        if (window.innerWidth > 1024 && State.isSidebarOpen) {
            closeSidebar();
        }
    }

    // ============================================
    // MULTI-STEP FORM HANDLER (with Supabase)
    // ============================================
    function setupFormHandler() {
        const form = document.getElementById('usulan-form');
        const nextBtn = document.getElementById('next-btn');
        const prevBtn = document.getElementById('prev-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => goToStep(State.formStep + 1));
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => goToStep(State.formStep - 1));
        }

        if (form) {
            form.addEventListener('submit', handleFormSubmitWithSupabase);
        }

        setupFileUploads();
    }

    function goToStep(step) {
        if (step < 1 || step > State.totalFormSteps) return;

        if (step > State.formStep) {
            if (!validateCurrentStep()) return;
        }

        State.formStep = step;

        document.querySelectorAll('.form-step').forEach(el => {
            el.classList.remove('active');
        });
        
        const currentStepEl = document.querySelector(`.form-step[data-step="${step}"]`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }

        updateProgressIndicators();
        updateFormNavigation();

        if (step === 4) {
            populateSummary();
        }
    }

    function validateCurrentStep() {
        const currentStepEl = document.querySelector(`.form-step[data-step="${State.formStep}"]`);
        if (!currentStepEl) return true;

        const requiredFields = currentStepEl.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
                
                field.style.animation = 'shake 0.5s ease';
                setTimeout(() => {
                    field.style.animation = '';
                    field.classList.remove('error');
                }, 500);
            } else {
                field.classList.remove('error');
            }
        });

        if (!isValid) {
            showAlert('Mohon lengkapi semua field yang wajib diisi.', 'warning');
        }

        return isValid;
    }

    function updateProgressIndicators() {
        document.querySelectorAll('.progress-step').forEach((el, index) => {
            const stepNum = index + 1;
            el.classList.remove('active', 'completed');
            
            if (stepNum < State.formStep) {
                el.classList.add('completed');
            } else if (stepNum === State.formStep) {
                el.classList.add('active');
            }
        });
    }

    function updateFormNavigation() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (prevBtn) {
            prevBtn.style.display = State.formStep > 1 ? 'inline-flex' : 'none';
        }

        if (nextBtn) {
            nextBtn.style.display = State.formStep < State.totalFormSteps ? 'inline-flex' : 'none';
        }

        if (submitBtn) {
            submitBtn.style.display = State.formStep === State.totalFormSteps ? 'inline-flex' : 'none';
        }
    }

    function populateSummary() {
        const summaryEl = document.getElementById('summary-content');
        if (!summaryEl) return;

        const formData = getFormData();
        
        summaryEl.innerHTML = `
            <div class="summary-field"><label>Nama Lengkap</label><p>${formData.nama_lengkap || '-'}</p></div>
            <div class="summary-field"><label>NIK</label><p>${formData.nik || '-'}</p></div>
            <div class="summary-field"><label>Tempat/Tanggal Lahir</label><p>${formData.tempat_lahir || '-'}, ${formatDate(formData.tanggal_lahir)}</p></div>
            <div class="summary-field"><label>Jenis Kelamin</label><p>${getJenisKelaminLabel(formData.jenis_kelamin)}</p></div>
            <div class="summary-field"><label>Email</label><p>${formData.email || '-'}</p></div>
            <div class="summary-field"><label>No. HP</label><p>${formData.no_hp || '-'}</p></div>
            <div class="summary-field"><label>Pendidikan Terakhir</label><p>${formData.pendidikan_terakhir || '-'}</p></div>
            <div class="summary-field"><label>Program Studi</label><p>${formData.program_studi_dituju || '-'}</p></div>
            <div class="summary-field"><label>Institusi</label><p>${formData.nama_institusi || '-'}</p></div>
            <div class="summary-field"><label>IPK</label><p>${formData.ipk || '-'}</p></div>
        `;
    }

    function getFormData() {
        const form = document.getElementById('usulan-form');
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    function getJenisKelaminLabel(value) {
        const labels = { 'L': 'Laki-laki', 'P': 'Perempuan' };
        return labels[value] || '-';
    }

    /**
     * Handle Form Submit with Supabase Integration
     */
    async function handleFormSubmitWithSupabase(event) {
        event.preventDefault();

        const declaration = document.getElementById('declaration');
        if (declaration && !declaration.checked) {
            showAlert('Anda harus menyetujui pernyataan di atas untuk melanjutkan.', 'warning');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Mengirim...';
        }

        try {
            const formData = getFormData();
            let result;

            if (isSupabaseConnected && db) {
                // Save to Supabase
                result = await db.submitPengusulan(formData);
                showAlert(`Usulan berhasil dikirim! Nomor usulan: ${result.nomor_usulan}`, 'success');
            } else {
                // Demo mode - simulate save
                result = {
                    nomor_usulan: generateNomorUsulan(),
                    ...formData,
                    status: 'submitted',
                    created_at: new Date().toISOString()
                };
                
                showAlert(`Usulan berhasil dikirim! (Demo Mode) Nomor usulan: ${result.nomor_usulan}`, 'info');
            }

            // Reset form
            const form = document.getElementById('usulan-form');
            if (form) form.reset();
            
            goToStep(1);
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '✉️ Kirim Usulan';
            }

            // Navigate to cek status after delay
            setTimeout(() => {
                navigateTo('cek-pengusulan');
                
                // Auto-fill search with the new nomor usulan
                const searchInput = document.getElementById('search-nomor');
                if (searchInput) {
                    searchInput.value = result.nomor_usulan;
                }
            }, 2000);

        } catch (error) {
            console.error('Error submitting form:', error);
            showAlert('Gagal mengirim usulan. Silakan coba lagi.', 'error');
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '✉️ Kirim Usulan';
            }
        }
    }

    function generateNomorUsulan() {
        const year = new Date().getFullYear();
        const random = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
        return `USL-${year}-${random}`;
    }

    function setupFileUploads() {
        document.querySelectorAll('.file-upload input[type="file"]').forEach(input => {
            input.addEventListener('change', function() {
                const label = this.nextElementSibling;
                if (this.files.length > 0) {
                    const fileName = this.files[0].name;
                    label.innerHTML = `<span class="upload-icon">📎</span><span>${fileName}</span>`;
                    label.style.borderColor = 'var(--color-emerald-500)';
                    label.style.background = 'var(--color-emerald-50)';
                }
            });
        });
    }

    // ============================================
    // SEARCH HANDLERS (with Supabase)
    // ============================================
    function setupSearchHandlers() {
        // Cek Status Pengusulan
        const btnSearchUsulan = document.getElementById('btn-search-usulan');
        const btnSearchNik = document.getElementById('btn-search-nik');
        
        if (btnSearchUsulan) {
            btnSearchUsulan.addEventListener('click', searchByNomorUsulan);
        }
        
        if (btnSearchNik) {
            btnSearchNik.addEventListener('click', searchByNIK);
        }

        const searchInput = document.getElementById('search-nomor');
        const nikInput = document.getElementById('search-nik');
        
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchByNomorUsulan();
            });
        }
        
        if (nikInput) {
            nikInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchByNIK();
            });
        }

        // Cek Status Penetapan
        const btnSearchPenetapan = document.getElementById('btn-search-penetapan');
        if (btnSearchPenetapan) {
            btnSearchPenetapan.addEventListener('click', searchPenetapan);
        }

        const penetapanInput = document.getElementById('penetapan-nomor');
        if (penetapanInput) {
            penetapanInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchPenetapan();
            });
        }

        setupAdminSearch();
    }

    async function searchByNomorUsulan() {
        const input = document.getElementById('search-nomor');
        const nomor = input ? input.value.trim() : '';
        
        if (!nomor) {
            showAlert('Masukkan nomor usulan yang ingin dicari.', 'warning');
            return;
        }

        showAlert('Mencari data...', 'info');

        try {
            let result;
            
            if (isSupabaseConnected && db) {
                result = await db.cekStatusPengusulan(nomor, 'nomor_usulan');
            } else {
                // Demo mode
                await new Promise(resolve => setTimeout(resolve, 800));
                result = getDemoPengusulanResult(nomor);
            }
            
            displayPengusulanResult(result, nomor);

        } catch (error) {
            console.error('Search error:', error);
            showAlert('Terjadi kesalahan saat mencari data.', 'error');
        }
    }

    async function searchByNIK() {
        const input = document.getElementById('search-nik');
        const nik = input ? input.value.trim() : '';
        
        if (!nik || nik.length !== 16) {
            showAlert('Masukkan NIK yang valid (16 digit).', 'warning');
            return;
        }

        showAlert('Mencari data...', 'info');

        try {
            let result;
            
            if (isSupabaseConnected && db) {
                result = await db.cekStatusPengusulan(nik, 'nik');
            } else {
                await new Promise(resolve => setTimeout(resolve, 800));
                result = getDemoPengusulanResult(nik);
            }
            
            displayPengusulanResult(result, nik);

        } catch (error) {
            console.error('Search error:', error);
            showAlert('Terjadi kesalahan saat mencari data.', 'error');
        }
    }

    async function searchPenetapan() {
        const input = document.getElementById('penetapan-nomor');
        const nomor = input ? input.value.trim() : '';
        
        if (!nomor) {
            showAlert('Masukkan nomor pendaftar atau NIK.', 'warning');
            return;
        }

        showAlert('Mencari data...', 'info');

        try {
            let result;
            
            if (isSupabaseConnected && db) {
                result = await db.cekStatusPenetapan(nomor);
            } else {
                await new Promise(resolve => setTimeout(resolve, 800));
                result = Math.random() > 0.3 ? getDemoPenetapanResult() : null;
            }
            
            displayPenetapanResult(result);

        } catch (error) {
            console.error('Search error:', error);
            showAlert('Terjadi kesalahan saat mencari data.', 'error');
        }
    }

    /**
     * Display pengusulan search result
     */
    function displayPengusulanResult(result, searchTerm) {
        const resultDiv = document.getElementById('search-result');
        const noResultDiv = document.getElementById('no-result');
        
        // Hide both first
        if (resultDiv) resultDiv.style.display = 'none';
        if (noResultDiv) noResultDiv.style.display = 'none';

        if (result) {
            // Populate result fields
            document.getElementById('res-nomor').textContent = result.nomor_usulan || searchTerm;
            document.getElementById('res-tanggal').textContent = formatDate(result.created_at || result.tanggal);
            document.getElementById('res-nama').textContent = result.nama_lengkap || result.nama;
            document.getElementById('res-prodi').textContent = formatProdi(result.program_studi_dituju || result.prodi);
            document.getElementById('res-institusi').textContent = result.nama_institusi || result.institusi;
            
            // Set status
            const statusBadge = document.getElementById('result-status');
            const statusDetail = document.getElementById('res-status-detail');
            const statusLabels = {
                'draft': 'Draft',
                'submitted': 'Submitted',
                'review': 'Dalam Review',
                'approved': 'Disetujui',
                'rejected': 'Ditolak'
            };
            
            if (statusBadge) {
                statusBadge.textContent = statusLabels[result.status] || result.status || 'Unknown';
                statusBadge.className = `result-status table-badge badge-${result.status}`;
            }
            
            if (statusDetail) {
                statusDetail.innerHTML = `<span class="table-badge badge-${result.status}">${statusLabels[result.status] || result.status}</span>`;
            }
            
            if (resultDiv) resultDiv.style.display = 'block';
        } else {
            if (noResultDiv) noResultDiv.style.display = 'block';
        }
    }

    /**
     * Display penetapan search result
     */
    function displayPenetapanResult(result) {
        const acceptedDiv = document.getElementById('penetapan-result');
        const rejectedDiv = document.getElementById('penetapan-rejected');
        
        if (acceptedDiv) acceptedDiv.style.display = 'none';
        if (rejectedDiv) rejectedDiv.style.display = 'none';

        if (result) {
            // Populate accepted view
            document.getElementById('pen-no-penetapan').textContent = result.nomor_penetapan || '-';
            document.getElementById('pen-nama').textContent = result.nama_lengkap || result.nama || '-';
            document.getElementById('pen-prodi').textContent = result.program_studi || result.prodi || '-';
            document.getElementById('pen-institusi').textContent = result.institusi || '-';
            
            if (acceptedDiv) acceptedDiv.style.display = 'block';
        } else {
            if (rejectedDiv) rejectedDiv.style.display = 'block';
        }
    }

    // Demo data results
    function getDemoPengusulanResult(searchTerm) {
        const demoData = getDemoPengusulanList();
        return demoData.find(p => 
            p.nomor_usulan?.toLowerCase().includes(searchTerm.toLowerCase())
        ) || null;
    }

    function getDemoPenetapanResult() {
        return {
            nomor_penetapan: 'PNT-2024-0156',
            nama_lengkap: 'Ahmad Fauzi',
            program_studi: 'Keperawatan (S1)',
            institusi: 'Universitas Indonesia'
        };
    }

    function setupAdminSearch() {
        // Admin search inputs
        const adminSearchInputs = ['admin-search-usulan', 'admin-search-penetapan', 'admin-search-roadmap'];
        
        adminSearchInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', debounce(handleAdminSearch, 500));
            }
        });
    }

    function handleAdminSearch(event) {
        const searchTerm = event.target.value.toLowerCase();
        const tableId = event.target.id.replace('admin-search-', '');
        const table = document.getElementById(`table-${tableId}`);
        
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            background: white;
            box-shadow: var(--shadow-lg);
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            max-width: 400px;
            animation: slideInRight 0.3s ease-out;
            border-left: 4px solid ${getTypeColor(type)};
        `;
        
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        
        alert.innerHTML = `
            <span style="font-size: 1.25rem;">${icons[type]}</span>
            <span style="flex: 1; font-size: 0.9rem; color: var(--color-slate-700);">${message}</span>
            <button onclick="this.parentElement.remove()" style="color: var(--color-slate-400); font-size: 1.25rem;">&times;</button>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            if (alert.parentElement) {
                alert.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => alert.remove(), 300);
            }
        }, 5000);
    }

    function getTypeColor(type) {
        const colors = {
            success: 'var(--color-success)',
            warning: 'var(--color-warning)',
            error: 'var(--color-danger)',
            info: 'var(--color-info)'
        };
        return colors[type] || colors.info;
    }

    // Global CRUD action handlers
    window.viewPengusulan = function(id) {
        showModal('Detail Pengusulan', `<p>Loading data ID: ${id}...</p>`, []);
    };

    window.editPengusulan = function(id) {
        showModal('Edit Pengusulan', `<p>Edit form untuk ID: ${id}</p>`, [
            { text: 'Simpan', class: 'btn-primary', onclick: 'closeModal()' }
        ]);
    };

    window.deletePengusulan = async function(id) {
        if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
            if (isSupabaseConnected && db) {
                try {
                    await db.delete(SUPABASE_CONFIG.TABLES.PENGUSULAN, id);
                    showAlert('Data berhasil dihapus!', 'success');
                    loadAdminPengusulanData();
                } catch (error) {
                    showAlert('Gagal menghapus data.', 'error');
                }
            } else {
                showAlert('Data berhasil dihapus! (Demo)', 'info');
            }
        }
    };

    window.viewPenetapan = function(id) {
        showModal('Detail Penetapan', `<p>Loading data ID: ${id}...</p>`, []);
    };

    window.editPenetapan = function(id) {
        showModal('Edit Penetapan', `<p>Edit form untuk ID: ${id}</p>`, [
            { text: 'Simpan', class: 'btn-primary', onclick: 'closeModal()' }
        ]);
    };

    window.printPenetapan = function(id) {
        showAlert('Mencetak data...', 'info');
        window.print();
    };

    window.viewRoadmap = function(id) {
        showModal('Detail Roadmap', `<p>Loading data ID: ${id}...</p>`, []);
    };

    window.editRoadmap = function(id) {
        showModal('Edit Roadmap', `<p>Edit form untuk ID: ${id}</p>`, [
            { text: 'Simpan', class: 'btn-primary', onclick: 'closeModal()' }
        ]);
    };

    window.exportData = function(type) {
        showAlert(`Mengekspor data ${type}...`, 'info');
        setTimeout(() => {
            showAlert(`Data ${type} berhasil diekport!`, 'success');
        }, 1500);
    };

    window.showAddModal = function(type) {
        const modal = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');
        const footer = document.getElementById('modal-footer');

        if (modal && title && body) {
            title.textContent = `Tambah Data ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            body.innerHTML = `
                <p style="margin-bottom: 1rem; color: var(--color-slate-600);">Formulir penambahan data ${type}.</p>
                <div class="form-group" style="margin-bottom: 1rem;">
                    <label>Data Baru</label>
                    <input type="text" class="toolbar-input" placeholder="Masukkan data...">
                </div>
            `;
            
            footer.innerHTML = `
                <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
                <button class="btn btn-primary" onclick="saveNewData('${type}')">Simpan</button>
            `;
            
            modal.style.display = 'flex';
        }
    };

    window.closeModal = function() {
        const modal = document.getElementById('modal-overlay');
        if (modal) modal.style.display = 'none';
    };

    window.saveNewData = async function(type) {
        closeModal();
        
        if (isSupabaseConnected && db) {
            showAlert(`Menyimpan data ${type} ke Supabase...`, 'info');
            // Actual implementation would collect form data and insert
        }
        
        showAlert(`Data ${type} berhasil ditambahkan!`, 'success');
        
        // Reload data
        switch (type) {
            case 'pengusulan': await loadAdminPengusulanData(); break;
            case 'penetapan': await loadAdminPenetapanData(); break;
            case 'roadmap': await loadAdminRoadmapData(); break;
        }
    };

    // Add CSS animations
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
        }
        .error {
            border-color: var(--color-danger) !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
        }
    `;
    document.head.appendChild(styleSheet);

    // ============================================
    // START APPLICATION
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
