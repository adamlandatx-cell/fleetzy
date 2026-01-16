/* ============================================
   FLEETZY ADMIN - SIDEBAR NAVIGATION
   ============================================ */

const Sidebar = {
    // Current active section
    activeSection: 'dashboard',
    
    // Section configurations
    sections: {
        dashboard: {
            title: 'Dashboard',
            subtitle: 'Welcome back, Adam. Here\'s what\'s happening today.',
            icon: 'fa-th-large',
            loader: () => Dashboard?.load?.()
        },
        vehicles: {
            title: 'Fleet Management',
            subtitle: 'Manage your vehicles, maintenance, and availability.',
            icon: 'fa-car',
            loader: () => Vehicles?.load?.()
        },
        customers: {
            title: 'Customers',
            subtitle: 'View and manage customer applications and profiles.',
            icon: 'fa-users',
            loader: () => Customers?.load?.()
        },
        rentals: {
            title: 'Rentals',
            subtitle: 'Track active rentals, approvals, and contracts.',
            icon: 'fa-file-contract',
            loader: () => Rentals?.load?.()
        },
        payments: {
            title: 'Payments',
            subtitle: 'Monitor payments, receipts, and outstanding balances.',
            icon: 'fa-credit-card',
            loader: () => Payments?.load?.()
        },
        reports: {
            title: 'Reports & Analytics',
            subtitle: 'View financial reports, trends, and AI insights.',
            icon: 'fa-chart-line',
            loader: () => Reports?.load?.()
        },
        settings: {
            title: 'Settings',
            subtitle: 'Configure your account, notifications, and preferences.',
            icon: 'fa-cog',
            loader: () => Settings?.load?.()
        }
    },
    
    /**
     * Initialize sidebar
     */
    init() {
        this.bindEvents();
        this.loadFromURL();
    },
    
    /**
     * Bind click events to nav items
     */
    bindEvents() {
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.navigate(section);
            });
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state?.section) {
                this.navigate(e.state.section, false);
            }
        });
    },
    
    /**
     * Load section from URL hash
     */
    loadFromURL() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const section = this.sections[hash] ? hash : 'dashboard';
        this.navigate(section, false);
    },
    
    /**
     * Navigate to a section
     * @param {string} section - Section name
     * @param {boolean} updateHistory - Whether to push to browser history
     */
    navigate(section, updateHistory = true) {
        if (!this.sections[section]) {
            console.warn(`Unknown section: ${section}`);
            return;
        }
        
        // Update active state
        this.activeSection = section;
        
        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        // Update page header
        const config = this.sections[section];
        const titleEl = document.querySelector('.page-title');
        const subtitleEl = document.querySelector('.page-subtitle');
        
        if (titleEl) titleEl.textContent = config.title;
        if (subtitleEl) subtitleEl.textContent = config.subtitle;
        
        // Hide all content sections
        document.querySelectorAll('.content-section').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        
        // Show target section
        const targetSection = document.getElementById(`section-${section}`);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
        }
        
        // Call section loader
        if (config.loader) {
            config.loader();
        }
        
        // Update URL
        if (updateHistory) {
            history.pushState({ section }, '', `#${section}`);
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    /**
     * Update badge count on nav item
     * @param {string} section - Section name
     * @param {number} count - Badge count (0 to hide)
     */
    updateBadge(section, count) {
        const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
        if (!navItem) return;
        
        let badge = navItem.querySelector('.badge');
        
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge';
                navItem.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
        } else if (badge) {
            badge.remove();
        }
    },
    
    /**
     * Get current section name
     */
    getCurrentSection() {
        return this.activeSection;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => Sidebar.init());

// Export
window.Sidebar = Sidebar;
