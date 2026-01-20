/* ============================================
   FLEETZY ADMIN - CONFIGURATION
   ============================================ */

// Supabase Configuration
const SUPABASE_URL = 'https://xmixxqtcgaydasejshwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaXh4cXRjZ2F5ZGFzZWpzaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODE5NTQsImV4cCI6MjA3ODM1Nzk1NH0.gMKEejleqvf-0iZmskUq43NUYbTW5AYPtsUgXevP2_U';

// Initialize Supabase Client
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// App Configuration
const CONFIG = {
    appName: 'Fleetzy',
    version: '2.0.0',
    owner: {
        name: 'Adam',
        phone: '+12819085583',
        ghlContactId: 'qpTuTaWmPaiquFVMWzWR'
    },
    business: {
        name: 'Fleetzy',
        phone: '(281) 271-3900',
        location: 'Houston, TX',
        weeklyRate: 400,
        depositAmount: 500
    },
    // Storage bucket names (verified)
    buckets: {
        driversLicenses: 'drivers-licenses',
        selfies: 'selfies',
        incomeProofs: 'income-proofs',
        vehicleImages: 'vehicle-images',
        contracts: 'contracts',
        paymentScreenshots: 'payment-screenshots',
        inspectionPhotos: 'inspection_photos'
    },
    // Status configurations
    vehicleStatuses: ['Available', 'Rented', 'Maintenance', 'Reserved'],
    rentalStatuses: ['pending_approval', 'pending_rental', 'active', 'completed', 'cancelled'],
    paymentMethods: ['Zelle', 'CashApp', 'Venmo', 'PayPal', 'Stripe', 'Cash'],
    // Animation settings
    animations: {
        countUpDuration: 2000,
        chartAnimationDelay: 50,
        staggerDelay: 100
    },
    // n8n Webhook URLs
    webhooks: {
        // Contract generation webhook - UPDATE THIS after creating the workflow in n8n
        // Format: https://your-n8n-instance.app.n8n.cloud/webhook/generate-contract
        contractGeneration: 'YOUR_N8N_WEBHOOK_URL_HERE'
    }
};

// Export for use in other modules
window.CONFIG = CONFIG;
window.db = db;
