// ============================================
// FLEETZY APPLICATION FORM - JAVASCRIPT
// ============================================
// Handles 5-step application with visual vehicle selection
// Integrates with Supabase for data storage
// Version: 2.0 - December 2025 (Production Ready)

// Supabase Configuration
const SUPABASE_URL = 'https://xmixxqtcgaydasejshwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaXh4cXRjZ2F5ZGFzZWpzaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODE5NTQsImV4cCI6MjA3ODM1Nzk1NH0.gMKEejleqvf-0iZmskUq43NUYbTW5AYPtsUgXevP2_U';

// Business Contact Info (single source of truth)
const FLEETZY_PHONE = '(281) 271-3900';
const FLEETZY_PHONE_LINK = 'tel:+12812713900';
const FLEETZY_EMAIL = 'info@getfleetzy.com';

// Global Variables
let currentStep = 1;
let vehicles = [];
let selectedVehicle = null;
let selfieStream = null;

// Language helper - uses the proper translations.js system
function t(key) {
    // Use the global getTranslation function from translations.js
    if (typeof window.getTranslation === 'function') {
        const lang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
        return window.getTranslation(lang, key);
    }
    // Safe fallback - return a readable format of the key
    // e.g., "application.step1.fields.firstName" → "First Name"
    const lastPart = key.split(".").pop();
    // Convert camelCase to Title Case: firstName → First Name
    return lastPart
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Fleetzy Application Form Loaded - v2.0');
    
    // Pre-fill from qualifier (localStorage or URL params)
    prefillFromQualifier();
    
    // Load vehicles immediately
    loadVehicles();
    
    // Setup form submission
    const form = document.getElementById('applicationForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    // Setup phone number formatting
    setupPhoneFormatting();
});

// ============================================
// PRE-FILL FROM QUALIFIER
// ============================================

function prefillFromQualifier() {
    // Try localStorage first
    let qualifierData = null;
    try {
        const stored = localStorage.getItem('fleetzy_qualifier');
        if (stored) {
            qualifierData = JSON.parse(stored);
            console.log('Loaded qualifier data from localStorage:', qualifierData);
        }
    } catch (e) {
        console.log('No qualifier data in localStorage');
    }
    
    // Also check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlName = urlParams.get('name');
    const urlPhone = urlParams.get('phone');
    const urlEmail = urlParams.get('email');
    const urlType = urlParams.get('type');
    const urlQualified = urlParams.get('qualified');
    
    // Merge URL params (they take priority)
    if (urlName || urlPhone || urlEmail) {
        qualifierData = qualifierData || {};
        if (urlName) qualifierData.name = urlName;
        if (urlPhone) qualifierData.phone = urlPhone;
        if (urlEmail) qualifierData.email = urlEmail;
        if (urlType) qualifierData.type = urlType;
        if (urlQualified) qualifierData.qualified = urlQualified === 'true';
    }
    
    // Allow direct access to application (no qualifier required)
    // Users can come directly from "Apply Now" buttons
    const cameFromQualifier = qualifierData && qualifierData.qualified;
    if (!qualifierData) {
        qualifierData = { qualified: true }; // No type - let them choose
        console.log('No qualifier data - allowing direct access');
    }
    
    // Only hide rental type selector if they came from qualifier
    if (cameFromQualifier && qualifierData.type) {
        hideRentalTypeSelector(qualifierData.type);
    }
    
    // Pre-fill name (split if full name)
    if (qualifierData.name) {
        const nameParts = qualifierData.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        
        if (firstNameInput && firstName) firstNameInput.value = firstName;
        if (lastNameInput && lastName) lastNameInput.value = lastName;
    }
    
    // Pre-fill phone
    if (qualifierData.phone) {
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            // Format phone nicely
            let phone = qualifierData.phone.replace(/\D/g, '');
            if (phone.startsWith('1') && phone.length === 11) {
                phone = phone.slice(1);
            }
            if (phone.length === 10) {
                phoneInput.value = `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`;
            } else {
                phoneInput.value = qualifierData.phone;
            }
        }
    }
    
    // Pre-fill email
    if (qualifierData.email) {
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.value = qualifierData.email;
    }
    
    // Pre-fill rental type (corporate vs personal)
    if (qualifierData.type === 'corporate' || qualifierData.path === 'corporate') {
        const companyRadio = document.getElementById('rentalTypeCompany');
        if (companyRadio) {
            companyRadio.checked = true;
            if (typeof toggleCompanySection === 'function') {
                toggleCompanySection();
            }
        }
        
        // Pre-fill company info if available
        if (qualifierData.corpCompanyName) {
            const companyNameInput = document.getElementById('companyName');
            if (companyNameInput) companyNameInput.value = qualifierData.corpCompanyName;
        }
    }
    
    // Pre-fill income source based on gig platforms
    if (qualifierData.gigPlatforms && qualifierData.gigPlatforms.length > 0) {
        const incomeSource = document.getElementById('incomeSource');
        if (incomeSource) {
            const platform = qualifierData.gigPlatforms[0].toLowerCase();
            if (platform.includes('uber')) {
                incomeSource.value = 'uber';
            } else if (platform.includes('lyft')) {
                incomeSource.value = 'lyft';
            } else if (platform.includes('doordash')) {
                incomeSource.value = 'doordash';
            }
        }
    }
    
    // Show welcome message if qualified
    if (qualifierData.qualified) {
        showQualifiedBanner();
    }
    
    console.log('Pre-fill complete');
}

function showQualifiedBanner() {
    // Create and inject a banner at the top of the form
    const banner = document.createElement('div');
    banner.className = 'bg-green-50 border border-green-200 rounded-xl p-4 mb-6';
    banner.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
            </div>
            <div>
                <div class="font-semibold text-green-800">You're pre-qualified! 🎉</div>
                <div class="text-sm text-green-700">Just complete your application below to get started.</div>
            </div>
        </div>
    `;
    
    // Insert at top of first form section
    const firstSection = document.querySelector('.form-section.active .bg-white');
    if (firstSection) {
        firstSection.insertBefore(banner, firstSection.firstChild.nextSibling);
    }
}

function hideRentalTypeSelector(type) {
    // Find the rental type selection container
    const rentalTypeContainer = document.querySelector('.grid.grid-cols-2.gap-4');
    
    if (rentalTypeContainer && rentalTypeContainer.querySelector('#rentalTypePersonal')) {
        // Get the parent container that includes the "Rental Type" label
        const rentalTypeSection = rentalTypeContainer.closest('.mb-6') || rentalTypeContainer.parentElement;
        
        // Create a locked display showing their choice
        const lockedDisplay = document.createElement('div');
        lockedDisplay.className = 'mb-6';
        
        const isCorporate = type === 'corporate';
        const rate = isCorporate ? '$350-375/week' : '$400/week';
        const label = isCorporate ? 'Company Rental' : 'Personal Rental';
        const bgColor = isCorporate ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';
        const textColor = isCorporate ? 'text-blue-800' : 'text-green-800';
        
        lockedDisplay.innerHTML = `
            <label class="block text-sm font-medium text-gray-700 mb-2">Rental Type</label>
            <div class="${bgColor} border rounded-xl p-4 flex items-center gap-3">
                <svg class="w-5 h-5 ${textColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <div>
                    <div class="font-semibold ${textColor}">${label}</div>
                    <div class="text-sm ${textColor} opacity-75">${rate}</div>
                </div>
            </div>
        `;
        
        // Replace the selector with the locked display
        if (rentalTypeSection) {
            rentalTypeSection.replaceWith(lockedDisplay);
        }
        
        // Set the hidden radio button value for form submission
        if (isCorporate) {
            const companyRadio = document.getElementById('rentalTypeCompany');
            if (companyRadio) companyRadio.checked = true;
            if (typeof toggleCompanySection === 'function') {
                toggleCompanySection();
            }
        } else {
            const personalRadio = document.getElementById('rentalTypePersonal');
            if (personalRadio) personalRadio.checked = true;
        }
        
        // Update summary
        const summaryRate = document.getElementById('summaryRate');
        const summaryTotal = document.getElementById('summaryTotal');
        if (summaryRate) summaryRate.textContent = isCorporate ? '$350/week' : '$400/week';
        if (summaryTotal) summaryTotal.textContent = isCorporate ? '$600' : '$650';
    }
}

// ============================================
// VEHICLE LOADING & SELECTION
// ============================================

async function loadVehicles() {
    const gallery = document.getElementById('vehicleGallery');
    
    if (!gallery) {
        console.error('Vehicle gallery element not found');
        return;
    }
    
    // Show loading state
    gallery.innerHTML = `
        <div class="loading-vehicles col-span-full text-center py-12">
            <div class="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p class="text-lg font-medium text-gray-600">Loading available vehicles...</p>
        </div>
    `;
    
    try {
        // Fetch available vehicles from Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?select=*&status=eq.Active&order=monthly_payment.asc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load vehicles: ${response.status}`);
        }
        
        vehicles = await response.json();
        console.log('Loaded vehicles:', vehicles.length);
        
        if (vehicles.length === 0) {
            gallery.innerHTML = `
                <div class="col-span-full text-center py-12 bg-amber-50 rounded-xl border border-amber-200">
                    <svg class="w-16 h-16 text-amber-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <p class="text-lg font-semibold text-amber-800 mb-2">All Vehicles Currently Rented</p>
                    <p class="text-amber-700 mb-4">Great news - our fleet is in high demand!</p>
                    <p class="text-sm text-amber-600">Complete your application now and we'll contact you as soon as a vehicle becomes available.</p>
                    <a href="${FLEETZY_PHONE_LINK}" class="inline-flex items-center gap-2 mt-4 text-amber-700 hover:text-amber-900 font-medium">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                        Call us at ${FLEETZY_PHONE}
                    </a>
                </div>
            `;
            return;
        }
        
        // Render vehicle cards
        renderVehicles();
        
    } catch (error) {
        console.error('Error loading vehicles:', error);
        gallery.innerHTML = `
            <div class="col-span-full text-center py-12 bg-red-50 rounded-xl border border-red-200">
                <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-lg font-semibold text-red-800 mb-2">Unable to Load Vehicles</p>
                <p class="text-red-700 mb-4">Please check your internet connection and try again.</p>
                <button onclick="loadVehicles()" class="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition">
                    Try Again
                </button>
                <p class="text-sm text-red-600 mt-4">Or call us at ${FLEETZY_PHONE}</p>
            </div>
        `;
    }
}

function renderVehicles() {
    const gallery = document.getElementById('vehicleGallery');
    
    gallery.innerHTML = vehicles.map(vehicle => {
        const isAvailable = vehicle.status === 'Active';
        const statusBadge = getStatusBadge(vehicle.status);
        const imageUrl = vehicle.image_url || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80';
        const displayName = vehicle.friendly_name || `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        const monthlyRate = vehicle.monthly_payment || 400;
        const weeklyRate = Math.round(monthlyRate * 12 / 52); // Convert monthly to weekly
        
        return `
            <div class="vehicle-card bg-white rounded-xl overflow-hidden shadow-md ${!isAvailable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}"
                 onclick="${isAvailable ? `selectVehicle('${vehicle.id}')` : ''}"
                 data-vehicle-id="${vehicle.id}">
                
                <!-- Vehicle Image -->
                <div class="relative">
                    <img src="${imageUrl}" 
                         alt="${displayName}"
                         class="w-full h-48 object-cover"
                         onerror="this.src='https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80'">
                    <span class="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.class}">${statusBadge.text}</span>
                </div>
                
                <!-- Vehicle Details -->
                <div class="p-4">
                    <h3 class="text-lg font-bold text-gray-900">
                        ${displayName}
                    </h3>
                    <p class="text-sm text-gray-600 mt-1">
                        ${vehicle.color || 'Silver'}
                    </p>
                    
                    <!-- Pricing -->
                    <div class="flex items-center justify-between mt-3">
                        <div>
                            <span class="text-2xl font-bold text-emerald-600">
                                $${weeklyRate}
                            </span>
                            <span class="text-sm text-gray-600">/week</span>
                        </div>
                        ${isAvailable ? `
                            <button type="button" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                                Select
                            </button>
                        ` : `
                            <span class="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-medium">
                                Unavailable
                            </span>
                        `}
                    </div>
                    
                    <!-- Features -->
                    <div class="mt-3 pt-3 border-t border-gray-200">
                        <div class="flex items-center text-xs text-gray-600 space-x-3">
                            <span><i class="fas fa-tachometer-alt mr-1"></i> ${formatMileage(vehicle.current_mileage)}</span>
                            <span><i class="fas fa-shield-alt mr-1"></i> Insured</span>
                            <span><i class="fas fa-check-circle mr-1 text-emerald-600"></i> Rideshare Ready</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusBadge(status) {
    switch(status) {
        case 'Active':
            return { class: 'bg-green-100 text-green-800', text: '✓ Available' };
        case 'Maintenance':
            return { class: 'bg-yellow-100 text-yellow-800', text: 'In Maintenance' };
        case 'Rented':
            return { class: 'bg-blue-100 text-blue-800', text: 'Currently Rented' };
        default:
            return { class: 'bg-gray-100 text-gray-800', text: 'Reserved' };
    }
}

function formatMileage(mileage) {
    if (!mileage) return 'N/A';
    return `${Math.round(mileage / 1000)}k mi`;
}

function selectVehicle(vehicleId) {
    // Remove previous selection
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-50');
    });
    
    // Add selection to clicked card
    const selectedCard = document.querySelector(`[data-vehicle-id="${vehicleId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-50');
    }
    
    // Store selected vehicle
    selectedVehicle = vehicles.find(v => v.id === vehicleId);
    const hiddenInput = document.getElementById('selectedVehicleId');
    if (hiddenInput) {
        hiddenInput.value = vehicleId;
    }
    
    // Hide error if shown
    const errorEl = document.getElementById('vehicleError');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
    
    console.log('Selected vehicle:', selectedVehicle);
    
    // Update summary with selected vehicle rate
    if (selectedVehicle) {
        const weeklyRate = Math.round((selectedVehicle.monthly_payment || 400) * 12 / 52);
        const summaryRate = document.getElementById('summaryRate');
        const summaryTotal = document.getElementById('summaryTotal');
        if (summaryRate) summaryRate.textContent = `$${weeklyRate}/week`;
        if (summaryTotal) summaryTotal.textContent = `$${weeklyRate + 250}`;
    }
}

// ============================================
// STEP NAVIGATION
// ============================================

function nextStep() {
    // Validate current step
    if (!validateStep(currentStep)) {
        return;
    }
    
    // Mark current step as completed
    const currentStepEl = document.querySelector(`.progress-step[data-step="${currentStep}"]`);
    if (currentStepEl) {
        currentStepEl.classList.add('completed');
        currentStepEl.classList.remove('active');
    }
    
    // Move to next step
    currentStep++;
    
    // Hide current section
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show next section
    const nextSection = document.querySelector(`.form-section[data-section="${currentStep}"]`);
    if (nextSection) {
        nextSection.classList.add('active');
    }
    
    // Update progress bar
    const nextStepEl = document.querySelector(`.progress-step[data-step="${currentStep}"]`);
    if (nextStepEl) {
        nextStepEl.classList.add('active');
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update mobile progress
    updateMobileProgress();
}

function previousStep() {
    // Mark current step as inactive
    const currentStepEl = document.querySelector(`.progress-step[data-step="${currentStep}"]`);
    if (currentStepEl) {
        currentStepEl.classList.remove('active');
    }
    
    // Move to previous step
    currentStep--;
    
    // Hide current section
    document.querySelectorAll('.form-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show previous section
    const prevSection = document.querySelector(`.form-section[data-section="${currentStep}"]`);
    if (prevSection) {
        prevSection.classList.add('active');
    }
    
    // Update progress bar
    const prevStepEl = document.querySelector(`.progress-step[data-step="${currentStep}"]`);
    if (prevStepEl) {
        prevStepEl.classList.add('active');
        prevStepEl.classList.remove('completed');
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update mobile progress
    updateMobileProgress();
}

function updateMobileProgress() {
    const stepNum = document.getElementById('mobileStepNum');
    const progress = document.getElementById('mobileProgress');
    const progressBar = document.getElementById('mobileProgressBar');
    
    if (stepNum && progress && progressBar) {
        stepNum.textContent = currentStep;
        const percentage = (currentStep / 5) * 100;
        progress.textContent = percentage;
        progressBar.style.width = percentage + '%';
    }
}

// ============================================
// VALIDATION
// ============================================

function validateStep(step) {
    switch(step) {
        case 1:
            return validatePersonalInfo();
        case 2:
            return validateVehicleSelection();
        case 3:
            return validateSelfie();
        case 4:
            return validateLicense();
        case 5:
            return validateIncome();
        default:
            return true;
    }
}

function validatePersonalInfo() {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address', 'city', 'state', 'zipCode'];
    let isValid = true;
    let firstError = null;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field || !field.value.trim()) {
            isValid = false;
            if (field) {
                field.classList.add('border-red-500', 'ring-red-200');
                if (!firstError) firstError = field;
            }
        } else {
            field.classList.remove('border-red-500', 'ring-red-200');
        }
    });
    
    // Email validation
    const emailField = document.getElementById('email');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            emailField.classList.add('border-red-500', 'ring-red-200');
            isValid = false;
            if (!firstError) firstError = emailField;
        }
    }
    
    // If company rental, validate company fields
    const isCompanyRental = document.getElementById('rentalTypeCompany')?.checked;
    if (isCompanyRental) {
        const companyFields = ['companyName', 'companyContactName', 'companyContactEmail', 'companyContactPhone'];
        companyFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                isValid = false;
                if (field) {
                    field.classList.add('border-red-500', 'ring-red-200');
                    if (!firstError) firstError = field;
                }
            } else {
                field.classList.remove('border-red-500', 'ring-red-200');
            }
        });
    }
    
    if (!isValid && firstError) {
        firstError.focus();
        showValidationError('Please fill in all required fields');
    }
    
    return isValid;
}

function validateVehicleSelection() {
    const selectedVehicleId = document.getElementById('selectedVehicleId')?.value;
    
    if (!selectedVehicleId) {
        // Show error message
        let errorEl = document.getElementById('vehicleError');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'vehicleError';
            errorEl.className = 'bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4';
            const gallery = document.getElementById('vehicleGallery');
            if (gallery) {
                gallery.parentNode.insertBefore(errorEl, gallery);
            }
        }
        errorEl.innerHTML = '<strong>Please select a vehicle</strong> - Click on any available vehicle above to continue.';
        errorEl.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
    }
    
    return true;
}

function validateSelfie() {
    const selfieData = document.getElementById('selfieData')?.value;
    
    if (!selfieData) {
        showValidationError('Please take or upload a selfie photo');
        return false;
    }
    
    return true;
}

function validateLicense() {
    const licenseFront = document.getElementById('licenseFront')?.files?.length;
    const licenseBack = document.getElementById('licenseBack')?.files?.length;
    const licenseNumber = document.getElementById('licenseNumber')?.value?.trim();
    const licenseState = document.getElementById('licenseState')?.value;
    const licenseExpiration = document.getElementById('licenseExpiration')?.value;
    
    if (!licenseFront) {
        showValidationError('Please upload the front of your driver\'s license');
        return false;
    }
    
    if (!licenseBack) {
        showValidationError('Please upload the back of your driver\'s license');
        return false;
    }
    
    if (!licenseNumber) {
        showValidationError('Please enter your driver\'s license number');
        document.getElementById('licenseNumber')?.focus();
        return false;
    }
    
    if (!licenseState) {
        showValidationError('Please select the state that issued your driver\'s license');
        document.getElementById('licenseState')?.focus();
        return false;
    }
    
    if (!licenseExpiration) {
        showValidationError('Please enter your license expiration date');
        document.getElementById('licenseExpiration')?.focus();
        return false;
    }
    
    // Check if license is not expired
    const expDate = new Date(licenseExpiration);
    if (expDate < new Date()) {
        showValidationError('Your driver\'s license appears to be expired. Please contact us if this is incorrect.');
        return false;
    }
    
    return true;
}

function validateIncome() {
    const incomeSource = document.getElementById('incomeSource')?.value;
    const incomeProof = document.getElementById('incomeProof')?.files?.length;
    const termsAccepted = document.getElementById('termsAccepted')?.checked;
    
    if (!incomeSource) {
        showValidationError('Please select your income source');
        return false;
    }
    
    if (!incomeProof) {
        showValidationError('Please upload proof of income (bank statement, pay stub, or earnings screenshot)');
        return false;
    }
    
    if (!termsAccepted) {
        showValidationError('Please agree to the rental terms and conditions');
        return false;
    }
    
    return true;
}

function showValidationError(message) {
    // Create or update error toast
    let toast = document.getElementById('validationToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'validationToast';
        toast.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 transition-all transform';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    toast.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

// ============================================
// SELFIE CAPTURE
// ============================================

async function startCamera() {
    const cameraPreview = document.getElementById('cameraPreview');
    const videoEl = document.getElementById('selfieVideo');
    
    if (!cameraPreview || !videoEl) {
        console.error('Camera elements not found');
        return;
    }
    
    try {
        selfieStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        videoEl.srcObject = selfieStream;
        cameraPreview.style.display = 'block';
        
        // Hide preview if showing
        const previewContainer = document.getElementById('selfiePreviewContainer');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Camera access error:', error);
        showValidationError('Unable to access camera. Please upload a photo instead.');
    }
}

function capturePhoto() {
    const videoEl = document.getElementById('selfieVideo');
    const canvas = document.getElementById('selfieCanvas');
    
    if (!videoEl || !canvas) {
        console.error('Video or canvas element not found');
        return;
    }
    
    const context = canvas.getContext('2d');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    
    context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    document.getElementById('selfieData').value = imageData;
    
    // Show preview
    const preview = document.getElementById('selfiePreview');
    const previewContainer = document.getElementById('selfiePreviewContainer');
    if (preview && previewContainer) {
        preview.src = imageData;
        previewContainer.style.display = 'block';
    }
    
    // Hide camera
    stopCamera();
    
    showSuccessMessage('Selfie captured successfully!');
}

function stopCamera() {
    if (selfieStream) {
        selfieStream.getTracks().forEach(track => track.stop());
        selfieStream = null;
    }
    
    const cameraPreview = document.getElementById('cameraPreview');
    if (cameraPreview) {
        cameraPreview.style.display = 'none';
    }
}

function uploadSelfie() {
    const fileInput = document.getElementById('selfieFileInput');
    if (!fileInput) {
        console.error('Selfie file input not found');
        return;
    }
    
    fileInput.click();
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                showValidationError('File is too large. Please choose an image under 10MB.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageData = event.target.result;
                document.getElementById('selfieData').value = imageData;
                
                const preview = document.getElementById('selfiePreview');
                const previewContainer = document.getElementById('selfiePreviewContainer');
                if (preview && previewContainer) {
                    preview.src = imageData;
                    previewContainer.style.display = 'block';
                }
                
                showSuccessMessage('Selfie uploaded successfully!');
            };
            reader.readAsDataURL(file);
        }
    };
}

// ============================================
// FILE UPLOAD HELPERS
// ============================================

function triggerFileUpload(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.click();
    }
}

function handleFileUpload(input, previewId) {
    const file = input.files[0];
    if (file) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showValidationError('File is too large. Please choose an image under 10MB.');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
}

function showSuccessMessage(message) {
    let toast = document.getElementById('successToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'successToast';
        toast.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg z-50';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
        <div class="flex items-center gap-3">
            <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ============================================
// FORM SUBMISSION
// ============================================

async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    
    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <div class="flex items-center justify-center gap-2">
            <div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
            <span>Submitting Application...</span>
        </div>
    `;
    
    try {
        // 1. Collect form data
        console.log('Step 1: Collecting form data...');
        const formData = collectFormData();
        
        // 2. Upload files to Supabase Storage
        console.log('Step 2: Uploading files...');
        submitBtn.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Uploading Documents...</span>
            </div>
        `;
        const uploadedFiles = await uploadFiles(formData);
        
        // 3. Create customer record
        console.log('Step 3: Creating customer record...');
        submitBtn.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Creating Account...</span>
            </div>
        `;
        const customerId = await createCustomer(formData, uploadedFiles);
        
        // 4. Create rental application
        console.log('Step 4: Creating rental application...');
        submitBtn.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Finalizing Application...</span>
            </div>
        `;
        await createRentalApplication(customerId, formData);
        
        // 5. Send notification to n8n workflow (Slack alert + GHL sync)
        console.log('Step 5: Sending application notification...');
        submitBtn.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Sending Notification...</span>
            </div>
        `;
        
        // Notify n8n workflow - this triggers Slack notification + GHL contact creation
        try {
            await fetch('https://alliedprc.app.n8n.cloud/webhook/fleetzy-full-application', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    body: {
                        record: {
                            id: customerId,
                            first_name: formData.firstName,
                            last_name: formData.lastName,
                            phone: formData.phone,
                            email: formData.email,
                            address: formData.address,
                            city: formData.city,
                            state: formData.state,
                            zip_code: formData.zipCode,
                            date_of_birth: formData.dateOfBirth,
                            is_company_rental: formData.isCompanyRental,
                            company_name: formData.companyName || null,
                            company_contact_name: formData.companyContactName || null,
                            company_contact_email: formData.companyContactEmail || null,
                            company_contact_phone: formData.companyContactPhone || null,
                            license_number: formData.licenseNumber,
                            license_state: formData.licenseState,
                            license_expiration: formData.licenseExpiration,
                            income_source: formData.incomeSource,
                            selected_vehicle_id: formData.vehicleId || null,
                            selfie_url: uploadedFiles.selfie || null,
                            license_front_url: uploadedFiles.licenseFront || null,
                            license_back_url: uploadedFiles.licenseBack || null,
                            income_proof_url: uploadedFiles.incomeProof || null,
                            created_at: new Date().toISOString()
                        }
                    }
                })
            });
            console.log('Notification sent successfully');
        } catch (webhookError) {
            // Don't fail the submission if webhook fails - just log it
            console.warn('Webhook notification failed (non-critical):', webhookError);
        }
        
        // 6. Store application data for success page
        localStorage.setItem('fleetzy_application_submitted', JSON.stringify({
            name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            email: formData.email,
            isCompanyRental: formData.isCompanyRental,
            submittedAt: new Date().toISOString()
        }));
        
        // 7. Show success and redirect
        console.log('Application submitted successfully!');
        window.location.href = 'application-success.html';
        
    } catch (error) {
        console.error('Submission error:', error);
        
        // Show error message
        showValidationError(`Error submitting application: ${error.message}. Please try again or call ${FLEETZY_PHONE}`);
        
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function collectFormData() {
    const isCompanyRental = document.getElementById('rentalTypeCompany')?.checked || false;
    
    // Combine address parts
    const address = [
        document.getElementById('address')?.value?.trim(),
        document.getElementById('city')?.value?.trim(),
        document.getElementById('state')?.value?.trim(),
        document.getElementById('zipCode')?.value?.trim()
    ].filter(Boolean).join(', ');
    
    return {
        // Personal Info
        firstName: document.getElementById('firstName')?.value?.trim() || '',
        lastName: document.getElementById('lastName')?.value?.trim() || '',
        email: document.getElementById('email')?.value?.trim().toLowerCase() || '',
        phone: formatPhoneNumber(document.getElementById('phone')?.value || ''),
        dateOfBirth: document.getElementById('dateOfBirth')?.value || '',
        address: address,
        city: document.getElementById('city')?.value?.trim() || '',
        state: document.getElementById('state')?.value?.trim() || '',
        zipCode: document.getElementById('zipCode')?.value?.trim() || '',
        
        // Company Rental
        isCompanyRental: isCompanyRental,
        companyName: isCompanyRental ? (document.getElementById('companyName')?.value?.trim() || null) : null,
        companyContactName: isCompanyRental ? (document.getElementById('companyContactName')?.value?.trim() || null) : null,
        companyContactEmail: isCompanyRental ? (document.getElementById('companyContactEmail')?.value?.trim() || null) : null,
        companyContactPhone: isCompanyRental ? (document.getElementById('companyContactPhone')?.value?.trim() || null) : null,
        
        // Vehicle
        vehicleId: document.getElementById('selectedVehicleId')?.value || '',
        
        // Selfie
        selfie: document.getElementById('selfieData')?.value || '',
        
        // License
        licenseFront: document.getElementById('licenseFront')?.files?.[0],
        licenseBack: document.getElementById('licenseBack')?.files?.[0],
        licenseNumber: document.getElementById('licenseNumber')?.value?.trim() || '',
        licenseExpiration: document.getElementById('licenseExpiration')?.value || '',
        licenseState: document.getElementById('licenseState')?.value || '',
        
        // Income
        incomeSource: document.getElementById('incomeSource')?.value || '',
        incomeProof: document.getElementById('incomeProof')?.files?.[0]
    };
}

function formatPhoneNumber(phone) {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Add +1 if not present
    if (!digits.startsWith('1') && digits.length === 10) {
        return '+1' + digits;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
        return '+' + digits;
    }
    return '+' + digits;
}

async function uploadFiles(formData) {
    const timestamp = Date.now();
    const uploads = {};
    
    // Upload selfie to 'selfies' bucket
    if (formData.selfie) {
        console.log('Uploading selfie...');
        const selfieBlob = dataURLtoBlob(formData.selfie);
        const filename = `selfie_${timestamp}.jpg`;
        uploads.selfie_url = await uploadToStorage(selfieBlob, 'selfies', filename);
    }
    
    // Upload license front to 'drivers-licenses' bucket
    if (formData.licenseFront) {
        console.log('Uploading license front...');
        const ext = formData.licenseFront.name.split('.').pop() || 'jpg';
        const filename = `front_${timestamp}.${ext}`;
        uploads.license_front_url = await uploadToStorage(formData.licenseFront, 'drivers-licenses', filename);
    }
    
    // Upload license back to 'drivers-licenses' bucket
    if (formData.licenseBack) {
        console.log('Uploading license back...');
        const ext = formData.licenseBack.name.split('.').pop() || 'jpg';
        const filename = `back_${timestamp}.${ext}`;
        uploads.license_back_url = await uploadToStorage(formData.licenseBack, 'drivers-licenses', filename);
    }
    
    // Upload income proof to 'income-proofs' bucket
    if (formData.incomeProof) {
        console.log('Uploading income proof...');
        const ext = formData.incomeProof.name.split('.').pop() || 'jpg';
        const filename = `proof_${timestamp}.${ext}`;
        uploads.income_proof_url = await uploadToStorage(formData.incomeProof, 'income-proofs', filename);
    }
    
    console.log('All files uploaded:', uploads);
    return uploads;
}

function dataURLtoBlob(dataurl) {
    try {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    } catch (e) {
        console.error('Error converting dataURL to blob:', e);
        throw new Error('Failed to process selfie image');
    }
}

async function uploadToStorage(file, bucket, filename) {
    const formData = new FormData();
    formData.append('', file);
    
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: file
    });
    
    if (!response.ok) {
        const error = await response.text();
        console.error(`Upload error for ${bucket}/${filename}:`, error);
        throw new Error(`Failed to upload ${filename}. Please try again.`);
    }
    
    // Return public URL
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
}

async function createCustomer(formData, uploads) {
    const customerData = {
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth || null,
        address: formData.address || null,
        current_address: formData.address || null,
        selfie_url: uploads.selfie_url || null,
        dl_photo_front_url: uploads.license_front_url || null,
        dl_photo_back_url: uploads.license_back_url || null,
        dl_number: formData.licenseNumber,
        dl_state: formData.licenseState || null,
        dl_expiry_date: formData.licenseExpiration,
        weekly_earnings_proof_url: uploads.income_proof_url || null,
        gig_platform: formData.incomeSource,
        is_company_rental: formData.isCompanyRental || false,
        company_name: formData.companyName || null,
        company_contact_person: formData.companyContactName || null,
        company_email: formData.companyContactEmail || null,
        company_phone: formData.companyContactPhone || null,
        status: 'pending_verification',
        application_type: formData.isCompanyRental ? 'corporate' : 'individual'
    };
    
    console.log('Creating customer with data:', { ...customerData, selfie_url: '[REDACTED]', dl_photo_front_url: '[REDACTED]', dl_photo_back_url: '[REDACTED]' });
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(customerData)
    });
    
    if (!response.ok) {
        const error = await response.text();
        console.error('Customer creation error:', error);
        
        // Check for duplicate phone
        if (error.includes('duplicate') || error.includes('unique')) {
            throw new Error('This phone number is already registered. Please login or use a different number.');
        }
        
        throw new Error('Failed to create your account. Please try again.');
    }
    
    const customers = await response.json();
    console.log('Customer created with ID:', customers[0].id);
    return customers[0].id;
}

async function createRentalApplication(customerId, formData) {
    const weeklyRate = selectedVehicle?.monthly_payment ? 
        Math.round(selectedVehicle.monthly_payment * 12 / 52) : 400;
    
    // Generate rental ID (e.g., R-20251216-001)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const rentalId = `R-${dateStr}-${randomSuffix}`;
    
    const rentalData = {
        rental_id: rentalId,
        customer_id: customerId,
        vehicle_id: formData.vehicleId || null,
        start_date: new Date().toISOString().split('T')[0], // Today's date as YYYY-MM-DD
        rental_status: 'pending_approval',
        weekly_rate: weeklyRate,
        initial_payment: 0, // Will be set when first payment is made
        deposit_included: 250, // Standard deposit
        deposit_amount: 250,
        deposit_status: 'pending',
        payment_method: 'pending', // Will be set when payment method chosen
        start_mileage: 0 // Will be set at vehicle pickup
    };
    
    console.log('Creating rental application:', rentalData);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rentals`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(rentalData)
    });
    
    if (!response.ok) {
        const error = await response.text();
        console.error('Rental creation error:', error);
        throw new Error('Failed to create rental application. Please try again.');
    }
    
    const rentals = await response.json();
    console.log('Rental application created:', rentals[0].rental_id);
    return rentals[0];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function setupPhoneFormatting() {
    document.querySelectorAll('input[type="tel"], #phone, #companyContactPhone').forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 10) value = value.slice(0, 10);
            
            if (value.length >= 6) {
                e.target.value = `(${value.slice(0,3)}) ${value.slice(3,6)}-${value.slice(6)}`;
            } else if (value.length >= 3) {
                e.target.value = `(${value.slice(0,3)}) ${value.slice(3)}`;
            } else {
                e.target.value = value;
            }
        });
    });
}

// Initialize phone formatting on DOM ready
document.addEventListener('DOMContentLoaded', setupPhoneFormatting);
