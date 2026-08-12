/* ============================================
   SIMBAKES - Beasiswa Tematik Bidang Kesehatan
   Application JavaScript (Versi Lengkap)
   ============================================ */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        LANDING_DURATION: 3000,
        DEFAULT_PAGE: 'dashboard',
        ANIMATION_DURATION: 500
    };

    // Sample Data untuk Demo
    const SAMPLE_DATA = {
        pengusulan: [
            { nomor: 'USL-2024-0001', nama: 'Ahmad Fauzi', prodi: 'Keperawatan (S1)', institusi: 'Universitas Indonesia', tanggal: '15 Jan 2024', status: 'approved' },
            { nomor: 'USL-2024-0002', nama: 'Siti Nurhaliza', prodi: 'Kedokteran (Profesi)', institusi: 'Universitas Gadjah Mada', tanggal: '18 Jan 2024', status: 'review' },
            { nomor: 'USL-2024-0003', nama: 'Budi Santoso', prodi: 'Farmasi (S1)', institusi: 'Institut Teknologi Bandung', tanggal: '20 Jan 2024', status: 'rejected' },
            { nomor: 'USL-2024-0004', nama: 'Dewi Lestari', prodi: 'Kesehatan Masyarakat (S2)', institusi: 'Universitas Airlangga', tanggal: '22 Jan 2024', status: 'draft' },
            { nomor: 'USL-2024-0005', nama: 'Rizky Pratama', prodi: 'Gizi (S1)', institusi: 'Universitas Diponegoro', tanggal: '25 Jan 2024', status: 'approved' }
        ],
        penetapan: [
            { nomor: 'PNT-2024-0001', nama: 'Ahmad Fauzi', prodi: 'Keperawatan (S1)', batch: 'Batch 1', tanggal: '01 Feb 2024', dana: 'disbursed' },
            { nomor: 'PNT-2024-0002', nama: 'Siti Nurhaliza', prodi: 'Kedokteran (Profesi)', batch: 'Batch 1', tanggal: '01 Feb 2024', dana: 'disbursed' },
            { nomor: 'PNT-2024-0015', nama: 'Rizky Pratama', prodi: 'Gizi (S1)', batch: 'Batch 2', tanggal: '15 Feb 2024', dana: 'processing' },
            { nomor: 'PNT-2024-0028', nama: 'Maya Putri', prodi: 'Farmasi (S1)', batch: 'Batch 3', tanggal: '01 Mar 2024', dana: 'pending' }
        ]
    };

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
        totalFormSteps: 4
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        cacheDOMElements();
        setupLandingPage();
        setupNavigation();
        setupSidebar();
        setupHashRouting();
        setupFormHandler();
        setupSearchHandlers();
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
    // MULTI-STEP FORM HANDLER
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
            form.addEventListener('submit', handleFormSubmit);
        }

        // File upload visual feedback
        setupFileUploads();
    }

    function goToStep(step) {
        if (step < 1 || step > State.totalFormSteps) return;

        // Validate current step before proceeding
        if (step > State.formStep) {
            if (!validateCurrentStep()) return;
        }

        State.formStep = step;

        // Update step visibility
        document.querySelectorAll('.form-step').forEach(el => {
            el.classList.remove('active');
        });
        
        const currentStepEl = document.querySelector(`.form-step[data-step="${step}"]`);
        if (currentStepEl) {
            currentStepEl.classList.add('active');
        }

        // Update progress indicators
        updateProgressIndicators();

        // Update navigation buttons
        updateFormNavigation();

        // If on confirmation step, populate summary
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
                
                // Add shake animation
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

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function getJenisKelaminLabel(value) {
        const labels = { 'L': 'Laki-laki', 'P': 'Perempuan' };
        return labels[value] || '-';
    }

    function handleFormSubmit(event) {
        event.preventDefault();

        const declaration = document.getElementById('declaration');
        if (declaration && !declaration.checked) {
            showAlert('Anda harus menyetujui pernyataan di atas untuk melanjutkan.', 'warning');
            return;
        }

        // Simulate form submission
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Mengirim...';
        }

        setTimeout(() => {
            showAlert('Usulan berhasil dikirim! Nomor usulan Anda: USL-2024-' + String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0'), 'success');
            
            // Reset form
            const form = document.getElementById('usulan-form');
            if (form) form.reset();
            
            goToStep(1);
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '✉️ Kirim Usulan';
            }

            // Navigate to cek status
            setTimeout(() => {
                navigateTo('cek-pengusulan');
            }, 2000);

        }, 2000);
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
    // SEARCH HANDLERS
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

        // Enter key support
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

        // Admin Search
        setupAdminSearch();
    }

    function searchByNomorUsulan() {
        const input = document.getElementById('search-nomor');
        const nomor = input ? input.value.trim() : '';
        
        if (!nomor) {
            showAlert('Masukkan nomor usulan yang ingin dicari.', 'warning');
            return;
        }

        // Simulate search
        simulateSearch(nomor, 'pengusulan');
    }

    function searchByNIK() {
        const input = document.getElementById('search-nik');
        const nik = input ? input.value.trim() : '';
        
        if (!nik || nik.length !== 16) {
            showAlert('Masukkan NIK yang valid (16 digit).', 'warning');
            return;
        }

        // Simulate search
        simulateSearch(nik, 'pengusulan');
    }

    function searchPenetapan() {
        const input = document.getElementById('penetapan-nomor');
        const nomor = input ? input.value.trim() : '';
        
        if (!nomor) {
            showAlert('Masukkan nomor pendaftar atau NIK.', 'warning');
            return;
        }

        // Show random result for demo
        const resultDiv = document.getElementById('penetapan-result');
        const rejectedDiv = document.getElementById('penetapan-rejected');
        
        // Randomly show accepted or pending
        if (Math.random() > 0.3) {
            if (resultDiv) resultDiv.style.display = 'block';
            if (rejectedDiv) rejectedDiv.style.display = 'none';
        } else {
            if (resultDiv) resultDiv.style.display = 'none';
            if (rejectedDiv) rejectedDiv.style.display = 'block';
        }
    }

    function simulateSearch(query, type) {
        const resultDiv = document.getElementById('search-result');
        const noResultDiv = document.getElementById('no-result');
        
        // Hide results first
        if (resultDiv) resultDiv.style.display = 'none';
        if (noResultDiv) noResultDiv.style.display = 'none';

        // Show loading state
        showAlert('Mencari data...', 'info');

        setTimeout(() => {
            // For demo, always find a result
            const found = Math.random() > 0.2; // 80% chance of finding

            if (found) {
                // Populate result with sample data
                const sampleData = SAMPLE_DATA[type][Math.floor(Math.random() * SAMPLE_DATA[type].length)];
                
                if (resultDiv) {
                    document.getElementById('res-nomor').textContent = query.includes('USL') ? query : sampleData.nomor;
                    document.getElementById('res-tanggal').textContent = sampleData.tanggal;
                    document.getElementById('res-nama').textContent = sampleData.nama;
                    document.getElementById('res-prodi').textContent = sampleData.prodi;
                    document.getElementById('res-institusi').textContent = sampleData.institusi;
                    
                    const statusLabels = {
                        'draft': 'Draft',
                        'review': 'Dalam Review',
                        'approved': 'Disetujui',
                        'rejected': 'Ditolak'
                    };
                    
                    const statusBadge = document.getElementById('result-status');
                    statusBadge.textContent = statusLabels[sampleData.status] || sampleData.status;
                    statusBadge.className = 'result-status table-badge badge-' + sampleData.status;
                    
                    document.getElementById('res-status-detail').innerHTML = 
                        '<span class="table-badge badge-' + sampleData.status + '">' + 
                        (statusLabels[sampleData.status] || sampleData.status) + '</span>';
                    
                    resultDiv.style.display = 'block';
                }
            } else {
                if (noResultDiv) noResultDiv.style.display = 'block';
            }
        }, 800);
    }

    function setupAdminSearch() {
        // Admin search functionality can be added here
        // For now, it's just UI
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
        // Create alert element
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
        
        // Auto remove after 5 seconds
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

    // Global functions for admin actions
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

    window.saveNewData = function(type) {
        closeModal();
        showAlert(`Data ${type} berhasil ditambahkan!`, 'success');
    };

    // Add CSS animations dynamically
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
