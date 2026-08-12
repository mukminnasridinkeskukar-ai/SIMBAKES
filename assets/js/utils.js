/**
 * SIMBAKES - Utility Functions Module
 * Beasiswa Tematik Bidang Kesehatan
 * 
 * Modul ini menyediakan:
 * - Helper functions untuk UI
 * - Formatting functions
 * - Validation functions
 * - Common utilities
 */

// ============================================================
// UI HELPER FUNCTIONS
// ============================================================

const UI = {
    /**
     * Show loading state
     */
    showLoading(containerId = 'loadingState') {
        const containers = ['loadingState', 'errorState', 'emptyState', 'dataTable'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        const loadingEl = document.getElementById(containerId);
        if (loadingEl) loadingEl.style.display = 'block';
    },
    
    /**
     * Show error state
     */
    showError(message, containerId = 'errorState') {
        const containers = ['loadingState', 'errorState', 'emptyState', 'dataTable'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        const errorEl = document.getElementById(containerId);
        if (errorEl) {
            errorEl.style.display = 'block';
            const msgEl = errorEl.querySelector('#errorMessage') || errorEl.querySelector('p');
            if (msgEl) msgEl.textContent = message;
        }
    },
    
    /**
     * Show empty state
     */
    showEmpty(containerId = 'emptyState') {
        const containers = ['loadingState', 'errorState', 'emptyState', 'dataTable'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        const emptyEl = document.getElementById(containerId);
        if (emptyEl) emptyEl.style.display = 'block';
    },
    
    /**
     * Show data table
     */
    showData(containerId = 'dataTable') {
        const containers = ['loadingState', 'errorState', 'emptyState'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        const tableEl = document.getElementById(containerId);
        if (tableEl) tableEl.style.display = 'table';
    },
    
    /**
     * Show alert/notification
     */
    showAlert(type, message, containerId = 'alertContainer') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const alertHtml = `
            <div class="alert alert-${type}">
                <i class="${icons[type] || icons.info}"></i>
                <span>${message}</span>
                <span class="alert-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </span>
            </div>
        `;
        
        container.innerHTML = alertContainer.innerHTML + alertHtml;
        
        // Auto-remove after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                const alert = container.querySelector('.alert-success');
                if (alert) alert.remove();
            }, 5000);
        }
    },
    
    /**
     * Clear all alerts
     */
    clearAlerts(containerId = 'alertContainer') {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '';
    },
    
    /**
     * Update user info in navbar
     */
    updateUserInfo() {
        const user = simbakesAuth?.getCurrentUser();
        
        const nameEl = document.getElementById('currentUserName');
        const roleEl = document.getElementById('currentUserRole');
        
        if (nameEl && user) {
            nameEl.textContent = user.nama_lengkap || user.email || 'User';
        }
        
        if (roleEl && user) {
            roleEl.textContent = simbakesAuth?.getRoleLabel(user.role) || user.role || '-';
        }
    },
    
    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, loading = true) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;
        
        btn.disabled = loading;
        
        if (loading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '<div class="spinner"></div><span>Memproses...</span>';
        } else if (btn.dataset.originalText) {
            btn.innerHTML = btn.dataset.originalText;
        }
    }
};


// ============================================================
// FORMATTING FUNCTIONS
// ============================================================

const Format = {
    /**
     * Format date to Indonesian locale
     */
    date(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    },
    
    /**
     * Format date short (DD/MM/YYYY)
     */
    dateShort(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID');
        } catch (e) {
            return dateString;
        }
    },
    
    /**
     * Format number with thousand separator
     */
    number(num) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString('id-ID');
    },
    
    /**
     * Format currency (Rupiah)
     */
    currency(amount) {
        if (amount === null || amount === undefined) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    /**
     * Format file size
     */
    fileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Truncate text with ellipsis
     */
    truncate(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    /**
     * Get initials from name
     */
    initials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    },
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};


// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

const Validate = {
    /**
     * Check if value is not empty
     */
    required(value, fieldName = 'Field ini') {
        if (!value || (typeof value === 'string' && !value.trim())) {
            return { valid: false, message: `${fieldName} wajib diisi` };
        }
        return { valid: true };
    },
    
    /**
     * Validate email format
     */
    email(value) {
        if (!value) return { valid: true }; // Skip if empty
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return { valid: false, message: 'Format email tidak valid' };
        }
        return { valid: true };
    },
    
    /**
     * Validate minimum length
     */
    minLength(value, min, fieldName = '') {
        if (!value) return { valid: true }; // Skip if empty
        
        if (value.length < min) {
            return { valid: false, message: `${fieldName} minimal ${min} karakter` };
        }
        return { valid: true };
    },
    
    /**
     * Validate NIK format (16 digits)
     */
    nik(value) {
        if (!value) return { valid: false, message: 'NIK wajib diisi' };
        
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length !== 16) {
            return { valid: false, message: 'NIK harus 16 digit angka' };
        }
        return { valid: true };
    },
    
    /**
     * Validate phone number
     */
    phone(value) {
        if (!value) return { valid: true }; // Skip if empty
        
        const phoneRegex = /^(\+62|62|0)[0-9]{8,13}$/;
        const cleaned = value.replace(/[\s-]/g, '');
        
        if (!phoneRegex.test(cleaned)) {
            return { valid: false, message: 'Format nomor telepon tidak valid' };
        }
        return { valid: true };
    },
    
    /**
     * Validate file type
     */
    fileType(file, allowedTypes) {
        if (!file) return { valid: true };
        
        const extension = file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(extension)) {
            return { 
                valid: false, 
                message: `Tipe file tidak diizinkan. Yang diizinkan: ${allowedTypes.join(', ')}` 
            };
        }
        return { valid: true };
    },
    
    /**
     * Validate file size
     */
    fileSize(file, maxSizeMB) {
        if (!file) return { valid: true };
        
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return { 
                valid: false, 
                message: `Ukuran file terlalu besar. Maksimal ${maxSizeMB}MB` 
            };
        }
        return { valid: true };
    },
    
    /**
     * Validate image dimensions (for pasfoto)
     */
    async imageDimensions(file, minWidth, minHeight) {
        return new Promise((resolve) => {
            if (!file) {
                resolve({ valid: true });
                return;
            }
            
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                
                if (img.width < minWidth || img.height < minHeight) {
                    resolve({
                        valid: false,
                        message: `Dimensi gambar minimal ${minWidth}x${minHeight}px`
                    });
                } else {
                    resolve({ valid: true });
                }
            };
            
            img.onerror = () => {
                resolve({
                    valid: false,
                    message: 'Gagal memuat gambar'
                });
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
};


// ============================================================
// DEBOUNCE & THROTTLE
// ============================================================

/**
 * Debounce function execution
 */
function debounce(func, wait = 300) {
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

/**
 * Throttle function execution
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}


// ============================================================
// STATUS & ROLE HELPERS
// ============================================================

/**
 * Get status badge HTML
 */
function getStatusBadge(status, type = 'status') {
    const statusConfig = {
        'status': {
            'aktif': { class: 'aktif', label: 'Aktif' },
            'non-aktif': { class: 'non-aktif', label: 'Non-Aktif' },
            'blokir': { class: 'blokir', label: 'Blokir' }
        },
        'status_penetapan': {
            'aktif': { class: 'aktif', label: 'Aktif' },
            'selesai': { class: 'selesai', label: 'Selesai' },
            'dibatalkan': { class: 'dibatalkan', label: 'Dibatalkan' },
            'ditunda': { class: 'ditunda', label: 'Ditunda' }
        },
        'status_pengusulan': {
            'draft': { class: 'draft', label: 'Draft' },
            'diajukan': { class: 'diajukan', label: 'Diajukan' },
            'diproses': { class: 'diproses', label: 'Diproses' },
            'diterima': { class: 'diterima', label: 'Diterima' },
            'ditolak': { class: 'ditolak', label: 'Ditolak' }
        }
    };
    
    const config = statusConfig[type]?.[status];
    
    if (!config) {
        return `<span class="status-badge">${status || '-'}</span>`;
    }
    
    return `<span class="status-badge ${config.class}">${config.label}</span>`;
}

/**
 * Get role badge HTML
 */
function getRoleBadge(role) {
    const roleConfig = {
        super_admin: { class: 'super_admin', label: 'Super Admin' },
        admin: { class: 'admin', label: 'Admin' },
        approver: { class: 'approver', label: 'Approver' },
        operator: { class: 'operator', label: 'Operator' },
        viewer: { class: 'viewer', label: 'Viewer' }
    };
    
    const config = roleConfig[role];
    
    if (!config) {
        return `<span class="role-badge">${role || '-'}</span>`;
    }
    
    return `<span class="role-badge ${config.class}">${config.label}</span>`;
}


// ============================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================

window.UI = UI;
window.Format = Format;
window.Validate = Validate;
window.debounce = debounce;
window.throttle = throttle;
window.getStatusBadge = getStatusBadge;
window.getRoleBadge = getRoleBadge;
