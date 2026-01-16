/* ============================================
   FLEETZY ADMIN - UTILITIES
   ============================================ */

const Utils = {
    
    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================
    
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     * @param {string} title - Optional title
     * @param {number} duration - Duration in ms (default 4000)
     */
    toast(message, type = 'info', title = '', duration = 4000) {
        // Create container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        // Icon mapping
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        // Default titles
        const defaultTitles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${title || defaultTitles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        return toast;
    },
    
    // Convenience methods
    toastSuccess(message, title = '') { return this.toast(message, 'success', title); },
    toastError(message, title = '') { return this.toast(message, 'error', title); },
    toastWarning(message, title = '') { return this.toast(message, 'warning', title); },
    toastInfo(message, title = '') { return this.toast(message, 'info', title); },
    
    // ========================================
    // FORMATTING
    // ========================================
    
    /**
     * Format currency
     * @param {number} amount - The amount to format
     * @param {boolean} showCents - Whether to show cents
     */
    formatCurrency(amount, showCents = false) {
        const options = {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: showCents ? 2 : 0,
            maximumFractionDigits: showCents ? 2 : 0
        };
        return new Intl.NumberFormat('en-US', options).format(amount);
    },
    
    /**
     * Format date
     * @param {string|Date} date - The date to format
     * @param {string} format - 'short', 'medium', 'long', 'relative'
     */
    formatDate(date, format = 'medium') {
        const d = new Date(date);
        
        if (format === 'relative') {
            return this.timeAgo(d);
        }
        
        const options = {
            short: { month: 'numeric', day: 'numeric' },
            medium: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
        };
        
        return d.toLocaleDateString('en-US', options[format] || options.medium);
    },
    
    /**
     * Get relative time string
     * @param {Date} date - The date to compare
     */
    timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }
        
        return 'Just now';
    },
    
    /**
     * Format phone number
     * @param {string} phone - The phone number
     */
    formatPhone(phone) {
        const cleaned = ('' + phone).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return '(' + match[1] + ') ' + match[2] + '-' + match[3];
        }
        return phone;
    },
    
    /**
     * Format mileage with commas
     * @param {number} miles - The mileage
     */
    formatMileage(miles) {
        return Number(miles).toLocaleString() + ' mi';
    },
    
    // ========================================
    // STATUS BADGES
    // ========================================
    
    /**
     * Get status badge HTML
     * @param {string} status - The status value
     * @param {string} type - 'vehicle', 'rental', 'payment', 'customer'
     */
    getStatusBadge(status, type = 'vehicle') {
        const statusConfig = {
            vehicle: {
                'Available': { class: 'available', label: 'Available' },
                'Rented': { class: 'rented', label: 'Rented' },
                'Maintenance': { class: 'maintenance', label: 'Service' },
                'Reserved': { class: 'reserved', label: 'Reserved' }
            },
            rental: {
                'pending_approval': { class: 'warning', label: 'Pending' },
                'pending_rental': { class: 'info', label: 'Awaiting Pickup' },
                'active': { class: 'success', label: 'Active' },
                'completed': { class: 'neutral', label: 'Completed' },
                'cancelled': { class: 'error', label: 'Cancelled' }
            },
            payment: {
                'pending': { class: 'warning', label: 'Pending' },
                'confirmed': { class: 'success', label: 'Confirmed' },
                'failed': { class: 'error', label: 'Failed' }
            },
            customer: {
                'pending': { class: 'warning', label: 'Pending' },
                'approved': { class: 'success', label: 'Approved' },
                'rejected': { class: 'error', label: 'Rejected' }
            }
        };
        
        const config = statusConfig[type]?.[status] || { class: 'neutral', label: status };
        return `<span class="vehicle-status ${config.class}">${config.label}</span>`;
    },
    
    // ========================================
    // VALIDATION
    // ========================================
    
    /**
     * Validate email format
     * @param {string} email - The email to validate
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    /**
     * Validate phone number (US format)
     * @param {string} phone - The phone to validate
     */
    isValidPhone(phone) {
        const cleaned = ('' + phone).replace(/\D/g, '');
        return cleaned.length === 10 || cleaned.length === 11;
    },
    
    // ========================================
    // DOM HELPERS
    // ========================================
    
    /**
     * Query selector shorthand
     */
    $(selector) {
        return document.querySelector(selector);
    },
    
    /**
     * Query selector all shorthand
     */
    $$(selector) {
        return document.querySelectorAll(selector);
    },
    
    /**
     * Create element with attributes and content
     */
    createElement(tag, attributes = {}, content = '') {
        const el = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                el.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    el.dataset[dataKey] = dataValue;
                });
            } else {
                el.setAttribute(key, value);
            }
        });
        if (content) {
            el.innerHTML = content;
        }
        return el;
    },
    
    // ========================================
    // LOADING STATES
    // ========================================
    
    /**
     * Show loading spinner in element
     */
    showLoading(element, message = 'Loading...') {
        if (!element) return;
        element.dataset.originalContent = element.innerHTML;
        element.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--accent-green);"></i>
                <span style="color: var(--text-secondary);">${message}</span>
            </div>
        `;
    },
    
    /**
     * Hide loading spinner
     */
    hideLoading(element) {
        if (!element || !element.dataset.originalContent) return;
        element.innerHTML = element.dataset.originalContent;
        delete element.dataset.originalContent;
    },
    
    /**
     * Show empty state
     */
    showEmpty(element, icon = 'fa-inbox', message = 'No data found') {
        if (!element) return;
        element.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-tertiary);">
                <i class="fas ${icon}" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p style="font-size: 16px;">${message}</p>
            </div>
        `;
    },
    
    // ========================================
    // MODALS
    // ========================================
    
    /**
     * Open a modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    /**
     * Close a modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Close modal when clicking outside
     */
    initModalCloseOnOutsideClick() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    },
    
    // ========================================
    // STORAGE
    // ========================================
    
    /**
     * Get from localStorage with JSON parse
     */
    getStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },
    
    /**
     * Set to localStorage with JSON stringify
     */
    setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },
    
    // ========================================
    // DEBOUNCE & THROTTLE
    // ========================================
    
    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Throttle function
     */
    throttle(func, limit = 300) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Export
window.Utils = Utils;

// Initialize modal close handlers on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Utils.initModalCloseOnOutsideClick();
});
