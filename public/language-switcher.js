// Fleetzy Language Switcher Component
// Creates a toggle button to switch between English and Spanish

(function() {
    'use strict';
    
    // Create language switcher HTML
    function createLanguageSwitcher() {
        const currentLang = localStorage.getItem('fleetzy_language') || 'en';
        
        const switcher = document.createElement('div');
        switcher.className = 'language-switcher';
        switcher.innerHTML = `
            <button 
                id="languageToggle" 
                class="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-fleetzy-green transition bg-white"
                aria-label="Switch language"
            >
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                </svg>
                <span id="currentLanguage" class="font-medium text-gray-700">${currentLang === 'en' ? 'EN' : 'ES'}</span>
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            
            <div id="languageMenu" class="absolute right-0 mt-2 w-48 bg-white border-2 border-gray-200 rounded-lg shadow-lg hidden z-50">
                <button 
                    data-lang="en" 
                    class="language-option w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between ${currentLang === 'en' ? 'bg-green-50 text-fleetzy-green font-semibold' : 'text-gray-700'}"
                >
                    <span>🇺🇸 English</span>
                    ${currentLang === 'en' ? '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' : ''}
                </button>
                <button 
                    data-lang="es" 
                    class="language-option w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between ${currentLang === 'es' ? 'bg-green-50 text-fleetzy-green font-semibold' : 'text-gray-700'}"
                >
                    <span>🇲🇽 Español</span>
                    ${currentLang === 'es' ? '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' : ''}
                </button>
            </div>
        `;
        
        return switcher;
    }
    
    // Add required styles
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .language-switcher {
                position: relative;
                display: inline-block;
            }
            
            #languageMenu {
                min-width: 180px;
            }
            
            .language-option:first-child {
                border-top-left-radius: 0.5rem;
                border-top-right-radius: 0.5rem;
            }
            
            .language-option:last-child {
                border-bottom-left-radius: 0.5rem;
                border-bottom-right-radius: 0.5rem;
            }
            
            .language-option:not(:last-child) {
                border-bottom: 1px solid #e5e7eb;
            }
            
            @media (max-width: 640px) {
                #languageToggle span {
                    display: none;
                }
                
                #languageMenu {
                    right: -1rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize language switcher
    function initLanguageSwitcher() {
        // Add styles
        addStyles();
        
        // Find header container (looks for common header structures)
        const headerContainers = [
            document.querySelector('header .flex.justify-between'),
            document.querySelector('header .flex.items-center'),
            document.querySelector('header > div > div'),
            document.querySelector('header')
        ];
        
        let container = null;
        for (const elem of headerContainers) {
            if (elem) {
                container = elem;
                break;
            }
        }
        
        if (!container) {
            console.warn('Language switcher: Could not find header container');
            return;
        }
        
        // Create and insert switcher
        const switcher = createLanguageSwitcher();
        
        // If container has justify-between, append to end
        // Otherwise, create a wrapper with proper flex layout
        if (container.classList.contains('justify-between')) {
            const rightSide = container.querySelector(':last-child');
            if (rightSide) {
                const wrapper = document.createElement('div');
                wrapper.className = 'flex items-center gap-4';
                rightSide.parentNode.insertBefore(wrapper, rightSide);
                wrapper.appendChild(rightSide);
                wrapper.appendChild(switcher);
            } else {
                container.appendChild(switcher);
            }
        } else {
            container.appendChild(switcher);
        }
        
        // Add event listeners
        const toggleButton = document.getElementById('languageToggle');
        const menu = document.getElementById('languageMenu');
        const options = document.querySelectorAll('.language-option');
        
        // Toggle menu
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menu.classList.contains('hidden') && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
        
        // Language selection
        options.forEach(option => {
            option.addEventListener('click', () => {
                const lang = option.getAttribute('data-lang');
                
                // Switch language
                if (window.switchLanguage) {
                    window.switchLanguage(lang);
                }
                
                // Update UI
                document.getElementById('currentLanguage').textContent = lang.toUpperCase();
                
                // Update selected state
                options.forEach(opt => {
                    opt.classList.remove('bg-green-50', 'text-fleetzy-green', 'font-semibold');
                    opt.classList.add('text-gray-700');
                    const checkmark = opt.querySelector('svg');
                    if (checkmark) checkmark.remove();
                });
                
                option.classList.add('bg-green-50', 'text-fleetzy-green', 'font-semibold');
                option.classList.remove('text-gray-700');
                option.innerHTML += '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
                
                // Close menu
                menu.classList.add('hidden');
                
                // Optional: Show toast notification
                showLanguageChangeToast(lang);
            });
        });
    }
    
    // Show toast notification (optional)
    function showLanguageChangeToast(lang) {
        const messages = {
            en: 'Language changed to English',
            es: 'Idioma cambiado a Español'
        };
        
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-fleetzy-green text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-fade-in';
        toast.innerHTML = `
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            <span>${messages[lang]}</span>
        `;
        
        // Add animation
        const toastStyle = document.createElement('style');
        toastStyle.textContent = `
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out;
            }
        `;
        document.head.appendChild(toastStyle);
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLanguageSwitcher);
    } else {
        initLanguageSwitcher();
    }
    
    // Re-initialize on languageChanged event (to update button state)
    window.addEventListener('languageChanged', (e) => {
        const lang = e.detail.language;
        const currentLangElement = document.getElementById('currentLanguage');
        if (currentLangElement) {
            currentLangElement.textContent = lang.toUpperCase();
        }
    });
    
})();
