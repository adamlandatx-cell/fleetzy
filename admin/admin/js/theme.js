/* ============================================
   FLEETZY ADMIN - THEME MANAGEMENT
   ============================================ */

const Theme = {
    // Storage key
    STORAGE_KEY: 'fleetzy-theme',
    
    // Initialize theme on page load
    init() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Default to dark, unless light is explicitly saved or system prefers light
        if (savedTheme === 'light') {
            this.setLight();
        } else if (savedTheme === 'dark') {
            this.setDark();
        } else if (!prefersDark) {
            this.setLight();
        } else {
            this.setDark();
        }
        
        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                e.matches ? this.setDark() : this.setLight();
            }
        });
    },
    
    // Toggle between themes
    toggle() {
        if (document.body.classList.contains('light')) {
            this.setDark();
        } else {
            this.setLight();
        }
    },
    
    // Set dark theme
    setDark() {
        document.body.classList.remove('light');
        localStorage.setItem(this.STORAGE_KEY, 'dark');
        this.updateIcon('dark');
    },
    
    // Set light theme
    setLight() {
        document.body.classList.add('light');
        localStorage.setItem(this.STORAGE_KEY, 'light');
        this.updateIcon('light');
    },
    
    // Update the theme toggle icon
    updateIcon(theme) {
        const icon = document.getElementById('theme-icon');
        if (!icon) return;
        
        if (theme === 'light') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    },
    
    // Get current theme
    getCurrent() {
        return document.body.classList.contains('light') ? 'light' : 'dark';
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => Theme.init());

// Export
window.Theme = Theme;
