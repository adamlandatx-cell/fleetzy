/* ============================================
   FLEETZY ADMIN - ANIMATIONS
   ============================================ */

const Animations = {
    
    /**
     * Animate a number counting up
     * @param {HTMLElement} element - The element to animate
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @param {number} duration - Animation duration in ms
     * @param {string} prefix - Prefix (e.g., '$')
     * @param {string} suffix - Suffix (e.g., '%')
     * @param {boolean} formatNumber - Whether to add commas
     */
    countUp(element, start, end, duration = 2000, prefix = '', suffix = '', formatNumber = true) {
        if (!element) return;
        
        let startTime = null;
        const isDecimal = !Number.isInteger(end);
        
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            
            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            let current = easeOut * (end - start) + start;
            
            if (isDecimal) {
                current = current.toFixed(1);
            } else {
                current = Math.floor(current);
            }
            
            if (formatNumber && !isDecimal) {
                current = Number(current).toLocaleString();
            }
            
            element.textContent = prefix + current + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    },
    
    /**
     * Animate chart bars growing from zero
     * @param {string} containerSelector - Selector for the chart container
     * @param {number} delay - Delay between each bar animation
     */
    animateChartBars(containerSelector = '.chart-bar', delay = 50) {
        const bars = document.querySelectorAll(containerSelector);
        
        bars.forEach((bar, index) => {
            const targetHeight = bar.dataset.height || bar.style.height;
            bar.style.height = '0%';
            bar.style.transition = 'none';
            
            setTimeout(() => {
                bar.style.transition = 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                bar.style.height = targetHeight;
            }, 800 + (index * delay));
        });
    },
    
    /**
     * Fade in elements with stagger
     * @param {string} selector - Elements to animate
     * @param {number} staggerDelay - Delay between each element
     */
    staggerFadeIn(selector, staggerDelay = 100) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                el.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * staggerDelay);
        });
    },
    
    /**
     * Animate element sliding in from right
     * @param {HTMLElement} element - Element to animate
     */
    slideInRight(element) {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.transform = 'translateX(20px)';
        
        requestAnimationFrame(() => {
            element.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        });
    },
    
    /**
     * Pulse animation for attention
     * @param {HTMLElement} element - Element to pulse
     */
    pulse(element) {
        if (!element) return;
        
        element.style.animation = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.animation = 'pulse 0.6s ease-in-out';
    },
    
    /**
     * Shake animation for errors
     * @param {HTMLElement} element - Element to shake
     */
    shake(element) {
        if (!element) return;
        
        element.style.animation = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.animation = 'shake 0.5s ease-in-out';
    },
    
    /**
     * Initialize all dashboard animations
     */
    initDashboard() {
        // Animate stat cards
        this.staggerFadeIn('.stat-card', CONFIG?.animations?.staggerDelay || 100);
        
        // Animate chart bars after stats
        setTimeout(() => {
            this.animateChartBars('.chart-bar', CONFIG?.animations?.chartAnimationDelay || 50);
        }, 500);
    }
};

// Add keyframes for custom animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(styleSheet);

// Export
window.Animations = Animations;
