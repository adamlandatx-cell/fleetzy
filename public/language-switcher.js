// ============================================
// FLEETZY LANGUAGE SWITCHER
// ============================================
// Version: 1.0 - December 2025
// 
// Features:
// - Auto-detects browser language
// - Shows confirmation prompt for Spanish browsers
// - Saves preference to localStorage
// - Provides toggle UI (English | Español)
// - Updates all translatable elements on page
// ============================================

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    
    const SUPPORTED_LANGUAGES = ['en', 'es'];
    const DEFAULT_LANGUAGE = 'en';
    const STORAGE_KEY = 'fleetzy_language';
    const PROMPT_SHOWN_KEY = 'fleetzy_lang_prompt_shown';

    // ============================================
    // INITIALIZATION
    // ============================================

    document.addEventListener('DOMContentLoaded', function() {
        initializeLanguage();
    });

    /**
     * Initialize language system
     */
    function initializeLanguage() {
        const savedLanguage = localStorage.getItem(STORAGE_KEY);
        const promptShown = localStorage.getItem(PROMPT_SHOWN_KEY);
        
        if (savedLanguage) {
            // User has a saved preference - use it
            applyLanguage(savedLanguage);
        } else if (!promptShown) {
            // First visit - check browser language
            const browserLang = detectBrowserLanguage();
            
            if (browserLang === 'es') {
                // Browser is Spanish - show confirmation prompt
                showLanguagePrompt();
            } else {
                // Browser is English or other - default to English
                applyLanguage(DEFAULT_LANGUAGE);
            }
        } else {
            // Prompt was shown but dismissed without saving preference
            applyLanguage(DEFAULT_LANGUAGE);
        }
        
        // Create language toggle UI
        createLanguageToggle();
    }

    /**
     * Detect browser's preferred language
     */
    function detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        const primaryLang = browserLang.split('-')[0].toLowerCase();
        
        return SUPPORTED_LANGUAGES.includes(primaryLang) ? primaryLang : DEFAULT_LANGUAGE;
    }

    // ============================================
    // LANGUAGE PROMPT (Modal)
    // ============================================

    /**
     * Show language selection prompt for Spanish browser users
     */
    function showLanguagePrompt() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'lang-prompt-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'lang-prompt-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 32px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease;
        `;
        
        modal.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                #lang-prompt-modal button {
                    transition: all 0.2s ease;
                }
                #lang-prompt-modal button:hover {
                    transform: translateY(-2px);
                }
            </style>
            <div style="margin-bottom: 24px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🌐</div>
                <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 8px;">
                    ¿Prefieres Español?
                </h2>
                <p style="color: #6b7280; font-size: 15px; line-height: 1.5;">
                    We noticed your browser is set to Spanish. Would you like to view this site in Spanish?
                </p>
                <p style="color: #6b7280; font-size: 15px; line-height: 1.5; margin-top: 8px;">
                    Notamos que tu navegador está en español. ¿Te gustaría ver este sitio en español?
                </p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <button id="lang-btn-spanish" style="
                    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                    color: white;
                    border: none;
                    padding: 14px 24px;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    width: 100%;
                ">
                    Sí, cambiar a Español
                </button>
                <button id="lang-btn-english" style="
                    background: #f3f4f6;
                    color: #374151;
                    border: none;
                    padding: 14px 24px;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    width: 100%;
                ">
                    No, keep English
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Event listeners
        document.getElementById('lang-btn-spanish').addEventListener('click', function() {
            localStorage.setItem(PROMPT_SHOWN_KEY, 'true');
            setLanguage('es');
            closePrompt();
        });
        
        document.getElementById('lang-btn-english').addEventListener('click', function() {
            localStorage.setItem(PROMPT_SHOWN_KEY, 'true');
            setLanguage('en');
            closePrompt();
        });
        
        // Close on overlay click (outside modal)
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                localStorage.setItem(PROMPT_SHOWN_KEY, 'true');
                setLanguage(DEFAULT_LANGUAGE);
                closePrompt();
            }
        });
        
        function closePrompt() {
            overlay.style.animation = 'fadeIn 0.2s ease reverse';
            setTimeout(function() { overlay.remove(); }, 200);
        }
    }

    // ============================================
    // LANGUAGE TOGGLE UI
    // ============================================

    /**
     * Create language toggle in header
     */
    function createLanguageToggle() {
        // Find header or nav element
        const header = document.querySelector('header');
        if (!header) return;
        
        // Check if toggle already exists
        if (document.getElementById('lang-toggle')) return;
        
        const currentLang = getCurrentLanguage();
        
        // Create toggle container
        const toggle = document.createElement('div');
        toggle.id = 'lang-toggle';
        toggle.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            margin-left: 16px;
        `;
        
        toggle.innerHTML = `
            <a href="#" id="lang-en" class="lang-option ${currentLang === 'en' ? 'active' : ''}" 
               style="color: ${currentLang === 'en' ? '#059669' : '#6b7280'}; 
                      text-decoration: none; 
                      font-weight: ${currentLang === 'en' ? '600' : '400'};
                      transition: color 0.2s ease;">
                English
            </a>
            <span style="color: #d1d5db;">|</span>
            <a href="#" id="lang-es" class="lang-option ${currentLang === 'es' ? 'active' : ''}" 
               style="color: ${currentLang === 'es' ? '#059669' : '#6b7280'}; 
                      text-decoration: none; 
                      font-weight: ${currentLang === 'es' ? '600' : '400'};
                      transition: color 0.2s ease;">
                Español
            </a>
        `;
        
        // Find the right place to insert toggle
        // Strategy: Look for specific patterns in Fleetzy pages
        
        // Option 1: Find nav with flex container
        const nav = header.querySelector('nav');
        if (nav) {
            const flexContainer = nav.querySelector('.flex.items-center.gap-6, .flex.items-center.gap-4, .hidden.md\\:flex');
            if (flexContainer) {
                flexContainer.appendChild(toggle);
                return;
            }
        }
        
        // Option 2: Find the right side of the header
        const rightSide = header.querySelector('.flex.items-center.gap-4');
        if (rightSide) {
            // Insert before the first button or at the end
            const firstButton = rightSide.querySelector('a[href*="apply"], a[href*="qualify"], button');
            if (firstButton) {
                rightSide.insertBefore(toggle, firstButton);
            } else {
                rightSide.appendChild(toggle);
            }
            return;
        }
        
        // Option 3: Just append to nav or header
        if (nav) {
            nav.appendChild(toggle);
        } else {
            const headerInner = header.querySelector('div');
            if (headerInner) {
                headerInner.appendChild(toggle);
            }
        }
        
        // Event listeners
        document.getElementById('lang-en').addEventListener('click', function(e) {
            e.preventDefault();
            setLanguage('en');
        });
        
        document.getElementById('lang-es').addEventListener('click', function(e) {
            e.preventDefault();
            setLanguage('es');
        });
    }

    /**
     * Update toggle UI to reflect current language
     */
    function updateToggleUI(lang) {
        const enLink = document.getElementById('lang-en');
        const esLink = document.getElementById('lang-es');
        
        if (enLink && esLink) {
            enLink.style.color = lang === 'en' ? '#059669' : '#6b7280';
            enLink.style.fontWeight = lang === 'en' ? '600' : '400';
            esLink.style.color = lang === 'es' ? '#059669' : '#6b7280';
            esLink.style.fontWeight = lang === 'es' ? '600' : '400';
        }
    }

    // ============================================
    // LANGUAGE APPLICATION
    // ============================================

    /**
     * Get current language
     */
    function getCurrentLanguage() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
    }

    /**
     * Set language and apply translations
     */
    function setLanguage(lang) {
        if (!SUPPORTED_LANGUAGES.includes(lang)) {
            lang = DEFAULT_LANGUAGE;
        }
        
        localStorage.setItem(STORAGE_KEY, lang);
        applyLanguage(lang);
        updateToggleUI(lang);
        
        // Update qualifier data if exists
        updateQualifierLanguage(lang);
    }

    /**
     * Apply language to page
     */
    function applyLanguage(lang) {
        // Set HTML lang attribute
        document.documentElement.lang = lang;
        
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            const key = el.getAttribute('data-i18n');
            const translation = window.t ? window.t(key) : null;
            
            if (translation && translation !== key) {
                // Check if it's an input placeholder
                if (el.hasAttribute('placeholder')) {
                    el.placeholder = translation;
                } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    // Don't change input values
                } else {
                    el.textContent = translation;
                }
            }
        });
        
        // Update elements with data-i18n-placeholder
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = window.t ? window.t(key) : null;
            if (translation && translation !== key) {
                el.placeholder = translation;
            }
        });
        
        // Update elements with data-i18n-html (for HTML content)
        document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
            const key = el.getAttribute('data-i18n-html');
            const translation = window.t ? window.t(key) : null;
            if (translation && translation !== key) {
                el.innerHTML = translation;
            }
        });
        
        // Update page title if data-i18n-title exists
        const titleKey = document.body.getAttribute('data-i18n-title') || 
                         document.documentElement.getAttribute('data-i18n-title');
        if (titleKey && window.t) {
            const titleTranslation = window.t(titleKey);
            if (titleTranslation && titleTranslation !== titleKey) {
                document.title = titleTranslation;
            }
        }
        
        // Fire custom event for dynamic content handlers
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang } 
        }));
    }

    /**
     * Update qualifier localStorage with language preference
     */
    function updateQualifierLanguage(lang) {
        try {
            const qualifier = localStorage.getItem('fleetzy_qualifier');
            if (qualifier) {
                const data = JSON.parse(qualifier);
                data.preferred_language = lang;
                localStorage.setItem('fleetzy_qualifier', JSON.stringify(data));
            }
        } catch (e) {
            // Ignore JSON parse errors
        }
    }

    // ============================================
    // EXPOSE FUNCTIONS GLOBALLY
    // ============================================
    
    window.FleetzyLanguage = {
        get: getCurrentLanguage,
        set: setLanguage,
        apply: applyLanguage,
        detect: detectBrowserLanguage,
        supported: SUPPORTED_LANGUAGES
    };

    // Also expose simpler global functions
    window.getCurrentLanguage = getCurrentLanguage;
    window.setCurrentLanguage = setLanguage;

})();
