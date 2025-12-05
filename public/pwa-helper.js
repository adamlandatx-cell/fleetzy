// Fleetzy PWA Helper - Service Worker Registration & Update Management
// Compatible with both PWA and Capacitor

class FleetzyPWA {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
    this.deferredPrompt = null;
  }

  // Initialize PWA features
  async init() {
    console.log('[PWA] Initializing Fleetzy PWA...');

    // Check if running in Capacitor (native app)
    if (this.isCapacitor()) {
      console.log('[PWA] Running in Capacitor - skipping service worker');
      return;
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });
        console.log('[PWA] Service worker registered:', this.registration.scope);

        // Check for updates every 60 seconds
        setInterval(() => this.checkForUpdates(), 60000);

        // Handle service worker updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration.installing;
          console.log('[PWA] New service worker found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true;
              this.showUpdateNotification();
            }
          });
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('[PWA] Message from service worker:', event.data);
          this.handleServiceWorkerMessage(event.data);
        });

      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    }

    // Setup install prompt handler
    this.setupInstallPrompt();

    // Setup beforeinstallprompt handler for A2HS
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] beforeinstallprompt fired');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // Detect if already installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.deferredPrompt = null;
      this.hideInstallButton();
      this.trackInstallation();
    });

    // Check if running in standalone mode
    if (this.isStandalone()) {
      console.log('[PWA] Running in standalone mode');
      document.body.classList.add('standalone-mode');
    }
  }

  // Check if running in Capacitor
  isCapacitor() {
    return typeof window.Capacitor !== 'undefined';
  }

  // Check if running in standalone mode
  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           this.isCapacitor();
  }

  // Check for service worker updates
  async checkForUpdates() {
    if (this.registration) {
      try {
        await this.registration.update();
      } catch (error) {
        console.error('[PWA] Update check failed:', error);
      }
    }
  }

  // Show update notification
  showUpdateNotification() {
    // Create update banner
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.className = 'fixed bottom-0 left-0 right-0 bg-fleetzy-green text-white p-4 shadow-lg z-50 transform transition-transform duration-300';
    banner.innerHTML = `
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div>
            <p class="font-semibold">Update Available</p>
            <p class="text-sm text-white text-opacity-90">A new version of Fleetzy is ready</p>
          </div>
        </div>
        <div class="flex space-x-2">
          <button onclick="fleetzyPWA.dismissUpdate()" class="px-4 py-2 text-white hover:bg-white hover:bg-opacity-10 rounded">
            Later
          </button>
          <button onclick="fleetzyPWA.applyUpdate()" class="px-4 py-2 bg-white text-fleetzy-green rounded hover:bg-opacity-90">
            Update Now
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Slide in animation
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
    }, 100);
  }

  // Apply update
  applyUpdate() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Dismiss update notification
  dismissUpdate() {
    const banner = document.getElementById('pwa-update-banner');
    if (banner) {
      banner.style.transform = 'translateY(100%)';
      setTimeout(() => banner.remove(), 300);
    }
  }

  // Setup install prompt
  setupInstallPrompt() {
    // Add install button to navigation (if element exists)
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.addEventListener('click', () => this.promptInstall());
    }
  }

  // Show install button
  showInstallButton() {
    const button = document.getElementById('pwa-install-button');
    if (button) {
      button.classList.remove('hidden');
    }

    // Also show install banner if not dismissed
    if (!localStorage.getItem('install-banner-dismissed')) {
      this.showInstallBanner();
    }
  }

  // Hide install button
  hideInstallButton() {
    const button = document.getElementById('pwa-install-button');
    if (button) {
      button.classList.add('hidden');
    }
  }

  // Show install banner
  showInstallBanner() {
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'fixed top-0 left-0 right-0 bg-gradient-to-r from-fleetzy-green to-fleetzy-blue text-white p-4 shadow-lg z-50 transform -translate-y-full transition-transform duration-300';
    banner.innerHTML = `
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <img src="/icons/icon-72x72.png" class="w-12 h-12 rounded-lg" alt="Fleetzy">
          <div>
            <p class="font-bold text-lg">Install Fleetzy</p>
            <p class="text-sm text-white text-opacity-90">Get the app experience on your device</p>
          </div>
        </div>
        <div class="flex space-x-2">
          <button onclick="fleetzyPWA.dismissInstallBanner()" class="px-4 py-2 text-white hover:bg-white hover:bg-opacity-10 rounded">
            Not Now
          </button>
          <button onclick="fleetzyPWA.promptInstall()" class="px-4 py-2 bg-white text-fleetzy-green rounded hover:bg-opacity-90 font-semibold">
            Install
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Slide in animation
    setTimeout(() => {
      banner.style.transform = 'translateY(0)';
    }, 100);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.dismissInstallBanner();
    }, 10000);
  }

  // Dismiss install banner
  dismissInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.style.transform = 'translateY(-100%)';
      setTimeout(() => banner.remove(), 300);
      localStorage.setItem('install-banner-dismissed', 'true');
    }
  }

  // Prompt install
  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('[PWA] Install prompt not available');
      this.showManualInstallInstructions();
      return;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('[PWA] User choice:', outcome);

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
    } else {
      console.log('[PWA] User dismissed install');
    }

    this.deferredPrompt = null;
    this.dismissInstallBanner();
  }

  // Show manual install instructions (for iOS and browsers without prompt)
  showManualInstallInstructions() {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    let instructions = '';

    if (isIOS && isSafari) {
      instructions = `
        <div class="space-y-2">
          <p class="font-semibold">To install Fleetzy on iOS:</p>
          <ol class="list-decimal list-inside space-y-1 text-sm">
            <li>Tap the Share button <svg class="inline w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/></svg> at the bottom</li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" in the top right corner</li>
          </ol>
        </div>
      `;
    } else {
      instructions = `
        <div class="space-y-2">
          <p class="font-semibold">To install Fleetzy:</p>
          <ol class="list-decimal list-inside space-y-1 text-sm">
            <li>Open the browser menu (⋮)</li>
            <li>Look for "Install app" or "Add to Home Screen"</li>
            <li>Follow the prompts to install</li>
          </ol>
        </div>
      `;
    }

    // Show modal with instructions
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-900">Install Fleetzy</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        ${instructions}
        <button onclick="this.closest('.fixed').remove()" class="mt-4 w-full px-4 py-2 bg-fleetzy-green text-white rounded hover:bg-green-700">
          Got it
        </button>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // Handle messages from service worker
  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('[PWA] Cache updated');
        break;
      case 'SYNC_COMPLETE':
        console.log('[PWA] Background sync complete');
        this.showNotification('Sync Complete', 'Your data has been synced successfully');
        break;
      default:
        console.log('[PWA] Unknown message type:', data.type);
    }
  }

  // Show notification
  async showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      if (this.registration) {
        await this.registration.showNotification(title, {
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png'
        });
      }
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('[PWA] Notification permission:', permission);
      return permission === 'granted';
    }
    return false;
  }

  // Track installation (send to analytics)
  trackInstallation() {
    // TODO: Implement analytics tracking
    console.log('[PWA] Tracking installation');
  }

  // Clear all caches
  async clearCaches() {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
      console.log('[PWA] All caches cleared');
    }
  }

  // Check if update is available
  isUpdateAvailable() {
    return this.updateAvailable;
  }
}

// Initialize PWA when DOM is ready
const fleetzyPWA = new FleetzyPWA();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => fleetzyPWA.init());
} else {
  fleetzyPWA.init();
}

// Make available globally
window.fleetzyPWA = fleetzyPWA;
