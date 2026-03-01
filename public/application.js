// ============================================
// FLEETZY APPLICATION FORM - JAVASCRIPT
// ============================================
// Handles 5-step application with visual vehicle selection
// Integrates with Supabase for data storage

// Supabase Configuration
const SUPABASE_URL = 'https://xmixxqtcgaydasejshwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaXh4cXRjZ2F5ZGFzZWpzaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODE5NTQsImV4cCI6MjA3ODM1Nzk1NH0.gMKEejleqvf-0iZmskUq43NUYbTW5AYPtsUgXevP2_U';

// Global Variables
let currentStep = 1;
let vehicles = [];
let selectedVehicle = null;
let selfieStream = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Fleetzy Application Form Loaded');
    
    // Load vehicles immediately
    loadVehicles();
    
    // Setup form submission
    const form = document.getElementById('applicationForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

// ============================================
// VEHICLE LOADING & SELECTION
// ============================================

async function loadVehicles() {
    const gallery = document.getElementById('vehicleGallery');
    
    try {
        // Fetch ALL vehicles from Supabase (not just Active) so customers can see what's coming available
        const response = await fetch(`${SUPABASE_URL}/rest/v1/vehicles?select=*&order=status.asc,monthly_payment.asc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load vehicles');
        }
        
        vehicles = await response.json();
        
        if (vehicles.length === 0) {
            gallery.innerHTML = `
                <div class="loading-vehicles">
                    <i class="fas fa-car-crash text-4xl text-slate-400 mb-3"></i>
                    <p class="text-lg font-medium">No vehicles available</p>
                    <p class="text-sm">Please check back soon or call us at (281) 271-3900</p>
                </div>
            `;
            return;
        }
        
        // Render vehicle cards
        renderVehicles();
        
    } catch (error) {
        console.error('Error loading vehicles:', error);
        gallery.innerHTML = `
            <div class="loading-vehicles">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
                <p class="text-lg font-medium text-red-600">Error loading vehicles</p>
                <p class="text-sm text-slate-600">Please refresh the page or call us at (281) 271-3900</p>
            </div>
        `;
    }
}

function renderVehicles() {
    const gallery = document.getElementById('vehicleGallery');
    
    gallery.innerHTML = vehicles.map(vehicle => {
        const statusLower = (vehicle.status || '').toLowerCase();
        const isAvailable = statusLower === 'active' || statusLower === 'available';
        const statusBadge = getStatusBadge(vehicle.status);
        const imageUrl = vehicle.image_url || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80';
        const displayName = vehicle.friendly_name || `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        const weeklyRate = vehicle.weekly_rate || 400; // Use actual rental rate
        
        return `
            <div class="vehicle-card bg-white rounded-xl overflow-hidden shadow-md ${!isAvailable ? 'unavailable' : ''}"
                 onclick="${isAvailable ? `selectVehicle('${vehicle.id}')` : ''}">
                
                <!-- Vehicle Image -->
                <div class="relative">
                    <img src="${imageUrl}" 
                         alt="${vehicle.year} ${vehicle.make} ${vehicle.model}"
                         class="vehicle-image"
                         onerror="this.src='https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80'">
                    <span class="vehicle-badge ${statusBadge.class}">${statusBadge.text}</span>
                </div>
                
                <!-- Vehicle Details -->
                <div class="p-4">
                    <h3 class="text-lg font-bold text-slate-900">
                        ${displayName}
                    </h3>
                    <p class="text-sm text-slate-600 mt-1">
                        ${vehicle.color || 'Silver'}
                    </p>
                    
                    <!-- Pricing -->
                    <div class="flex items-center justify-between mt-3">
                        <div>
                            <span class="text-2xl font-bold text-emerald-600">
                                $${weeklyRate}
                            </span>
                            <span class="text-sm text-slate-600">/week</span>
                        </div>
                        ${isAvailable ? `
                            <button type="button" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                                Select
                            </button>
                        ` : `
                            <span class="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm font-medium">
                                ${statusBadge.text}
                            </span>
                        `}
                    </div>
                    
                    <!-- Features -->
                    <div class="mt-3 pt-3 border-t border-slate-200">
                        <div class="flex items-center text-xs text-slate-600 space-x-3">
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
    const statusLower = (status || '').toLowerCase();
    
    if (statusLower === 'active' || statusLower === 'available') {
        return { class: 'badge-available', text: '✓ Available' };
    } else if (statusLower === 'rented' || statusLower === 'currently rented') {
        return { class: 'badge-rented', text: 'Currently Rented' };
    } else if (statusLower === 'maintenance' || statusLower === 'in service') {
        return { class: 'badge-maintenance', text: 'In Service' };
    } else if (statusLower === 'reserved') {
        return { class: 'badge-reserved', text: 'Reserved' };
    } else {
        return { class: 'badge-reserved', text: status || 'Unavailable' };
    }
}

function formatMileage(mileage) {
    if (!mileage) return 'N/A';
    return `${Math.round(mileage / 1000)}k mi`;
}

function selectVehicle(vehicleId) {
    // Remove previous selection
    document.querySelectorAll('.vehicle-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked card
    event.currentTarget.classList.add('selected');
    
    // Store selected vehicle
    selectedVehicle = vehicles.find(v => v.id === vehicleId);
    document.getElementById('selectedVehicleId').value = vehicleId;
    
    // Hide error if shown
    const errorEl = document.getElementById('vehicleError');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
    
    console.log('Selected vehicle:', selectedVehicle);
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
            return validateRentalDates();
        case 4:
            return validateSelfie();
        case 5:
            return validateLicense();
        case 6:
            return validateIncome();
        default:
            return true;
    }
}

function validatePersonalInfo() {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address', 'city', 'state', 'zipCode'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field || !field.value.trim()) {
            isValid = false;
            if (field) {
                field.classList.add('border-red-500');
            }
        } else {
            field.classList.remove('border-red-500');
        }
    });
    
    // If company rental, validate company fields
    const isCompanyRental = document.getElementById('rentalTypeCompany')?.checked;
    if (isCompanyRental) {
        const companyFields = ['companyName', 'companyContactName', 'companyContactEmail', 'companyContactPhone'];
        companyFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                isValid = false;
                if (field) {
                    field.classList.add('border-red-500');
                }
            } else {
                field.classList.remove('border-red-500');
            }
        });
    }
    
    // Email validation
    const emailField = document.getElementById('email');
    if (emailField && emailField.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value)) {
            emailField.classList.add('border-red-500');
            isValid = false;
        }
    }
    
    // Phone validation (10 digits)
    const phoneField = document.getElementById('phone');
    if (phoneField && phoneField.value) {
        const phoneDigits = phoneField.value.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
            phoneField.classList.add('border-red-500');
            isValid = false;
        }
    }
    
    // Age validation (18+)
    const dobField = document.getElementById('dateOfBirth');
    if (dobField && dobField.value) {
        const dob = new Date(dobField.value);
        const today = new Date();
        const age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 18) {
            dobField.classList.add('border-red-500');
            isValid = false;
            alert('You must be at least 18 years old to rent.');
            return false;
        }
    }
    
    if (!isValid) {
        alert('Please fill in all required fields correctly.');
    }
    
    return isValid;
}

function validateVehicleSelection() {
    const vehicleId = document.getElementById('selectedVehicleId')?.value;
    const errorEl = document.getElementById('vehicleError');
    
    if (!vehicleId) {
        if (errorEl) {
            errorEl.style.display = 'block';
        }
        alert('Please select a vehicle to continue.');
        return false;
    }
    
    if (errorEl) {
        errorEl.style.display = 'none';
    }
    return true;
}

function validateRentalDates() {
    const startDate = document.getElementById('rentalStartDate')?.value;
    const durationRadios = document.querySelectorAll('input[name="rentalDuration"]');
    
    // Check start date is selected
    if (!startDate) {
        alert('Please select a start date for your rental.');
        return false;
    }
    
    // Validate start date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(startDate + 'T00:00:00');
    
    if (selectedDate < today) {
        alert('Please select a start date that is today or in the future.');
        return false;
    }
    
    // Check duration is selected
    let durationSelected = false;
    durationRadios.forEach(radio => {
        if (radio.checked) durationSelected = true;
    });
    
    if (!durationSelected) {
        alert('Please select a rental duration.');
        return false;
    }
    
    return true;
}

function validateSelfie() {
    const selfieData = document.getElementById('selfieData')?.value;
    
    if (!selfieData) {
        alert('Please capture your selfie to continue.');
        return false;
    }
    
    return true;
}

function validateLicense() {
    const licenseFront = document.getElementById('licenseFront')?.files?.[0];
    const licenseBack = document.getElementById('licenseBack')?.files?.[0];
    const licenseNumber = document.getElementById('licenseNumber')?.value;
    const licenseExpiration = document.getElementById('licenseExpiration')?.value;
    
    if (!licenseFront || !licenseBack || !licenseNumber || !licenseExpiration) {
        alert('Please upload both sides of your license and provide license details.');
        return false;
    }
    
    return true;
}

function validateIncome() {
    const incomeSource = document.getElementById('incomeSource')?.value;
    const incomeProof = document.getElementById('incomeProof')?.files?.[0];
    
    if (!incomeSource || !incomeProof) {
        alert('Please select your income source and upload proof of income.');
        return false;
    }
    
    return true;
}

// ============================================
// SELFIE CAPTURE
// ============================================

async function startCamera() {
    try {
        const cameraPreview = document.getElementById('cameraPreview');
        const videoElement = document.getElementById('videoElement');
        
        // Show camera preview
        cameraPreview.style.display = 'block';
        
        // Request camera access
        selfieStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' },
            audio: false
        });
        
        videoElement.srcObject = selfieStream;
        
    } catch (error) {
        console.error('Camera error:', error);
        alert('Unable to access camera. Please check permissions or use the file upload option.');
    }
}

function captureSelfie() {
    const videoElement = document.getElementById('videoElement');
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0);
    
    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Store in hidden input
    document.getElementById('selfieData').value = imageData;
    
    // Show preview
    document.getElementById('selfiePreview').src = imageData;
    document.getElementById('selfiePreviewContainer').style.display = 'block';
    
    // Hide camera
    stopCamera();
    
    alert('Selfie captured successfully!');
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
    fileInput.click();
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageData = event.target.result;
                document.getElementById('selfieData').value = imageData;
                document.getElementById('selfiePreview').src = imageData;
                document.getElementById('selfiePreviewContainer').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };
}

// ============================================
// FILE UPLOAD HELPERS
// ============================================

function triggerFileUpload(inputId) {
    document.getElementById(inputId).click();
}

function handleFileUpload(input, previewId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(previewId).src = e.target.result;
            document.getElementById(previewId).style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// ============================================
// FORM SUBMISSION
// ============================================

async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
    
    try {
        // 1. Collect form data
        const formData = collectFormData();
        
        // 2. Upload files to Supabase Storage
        const uploadedFiles = await uploadFiles(formData);
        
        // 3. Create customer record
        const customerId = await createCustomer(formData, uploadedFiles);
        
        // 4. Create rental application
        await createRentalApplication(customerId, formData);
        
        // 5. Show success message
        alert('Application submitted successfully! We will contact you within 24 hours.');
        
        // 6. Redirect to thank you page or reset form
        window.location.href = `/`; // Or wherever you want to redirect
        
    } catch (error) {
        console.error('Submission error:', error);
        alert('Error submitting application. Please try again or call (281) 908-5583');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function collectFormData() {
    const isCompanyRental = document.getElementById('rentalTypeCompany')?.checked || false;
    
    return {
        // Personal Info
        firstName: document.getElementById('firstName')?.value?.trim() || '',
        lastName: document.getElementById('lastName')?.value?.trim() || '',
        email: document.getElementById('email')?.value?.trim().toLowerCase() || '',
        phone: formatPhoneNumber(document.getElementById('phone')?.value || ''),
        dateOfBirth: document.getElementById('dateOfBirth')?.value || '',
        address: document.getElementById('address')?.value?.trim() || '',
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
        
        // Rental Dates
        rentalStartDate: document.getElementById('rentalStartDate')?.value || '',
        rentalDuration: document.querySelector('input[name="rentalDuration"]:checked')?.value || '2',
        isOngoingRental: document.querySelector('input[name="rentalDuration"]:checked')?.value === 'ongoing',
        
        // Selfie
        selfie: document.getElementById('selfieData')?.value || '',
        
        // License
        licenseFront: document.getElementById('licenseFront')?.files?.[0],
        licenseBack: document.getElementById('licenseBack')?.files?.[0],
        licenseNumber: document.getElementById('licenseNumber')?.value?.trim() || '',
        licenseExpiration: document.getElementById('licenseExpiration')?.value || '',
        
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
    return '+' + digits;
}

async function uploadFiles(formData) {
    const timestamp = Date.now();
    const uploads = {};
    
    // Upload selfie to 'selfies' bucket
    if (formData.selfie) {
        const selfieBlob = dataURLtoBlob(formData.selfie);
        const filename = `selfie_${timestamp}.jpg`;
        uploads.selfie_url = await uploadToStorage(selfieBlob, 'selfies', filename);
    }
    
    // Upload license front to 'drivers-licenses' bucket
    if (formData.licenseFront) {
        const filename = `front_${timestamp}.jpg`;
        uploads.license_front_url = await uploadToStorage(formData.licenseFront, 'drivers-licenses', filename);
    }
    
    // Upload license back to 'drivers-licenses' bucket
    if (formData.licenseBack) {
        const filename = `back_${timestamp}.jpg`;
        uploads.license_back_url = await uploadToStorage(formData.licenseBack, 'drivers-licenses', filename);
    }
    
    // Upload income proof to 'income-proofs' bucket
    if (formData.incomeProof) {
        const filename = `proof_${timestamp}.jpg`;
        uploads.income_proof_url = await uploadToStorage(formData.incomeProof, 'income-proofs', filename);
    }
    
    return uploads;
}

function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

async function uploadToStorage(file, bucket, filename) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.text();
        console.error('Upload error:', error);
        throw new Error(`Upload failed: ${bucket}/${filename}`);
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
        dl_state: formData.state || null,
        dl_expiry_date: formData.licenseExpiration,
        weekly_earnings_proof_url: uploads.income_proof_url || null,
        gig_platform: formData.incomeSource,
        is_company_rental: formData.isCompanyRental || false,
        company_name: formData.companyName || null,
        company_contact_person: formData.companyContactName || null,
        company_email: formData.companyContactEmail || null,
        company_phone: formData.companyContactPhone || null,
        status: 'pending_verification'
    };
    
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
        throw new Error('Failed to create customer');
    }
    
    const customers = await response.json();
    return customers[0].id;
}

async function createRentalApplication(customerId, formData) {
    const weeklyRate = selectedVehicle?.weekly_rate || 400; // Use actual rental rate
    
    // Generate rental ID (e.g., R-20251115-001)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const rentalId = `R-${dateStr}-${randomSuffix}`;
    
    // Calculate end date based on duration (if not ongoing)
    let endDate = null;
    let weeksCount = null;
    
    if (formData.isOngoingRental) {
        // Ongoing rentals have no fixed end date, but minimum 2 weeks
        weeksCount = null; // null indicates ongoing
    } else {
        const weeks = parseInt(formData.rentalDuration) || 2;
        weeksCount = weeks;
        const startDate = new Date(formData.rentalStartDate + 'T00:00:00');
        const calculatedEndDate = new Date(startDate);
        calculatedEndDate.setDate(calculatedEndDate.getDate() + (weeks * 7));
        endDate = calculatedEndDate.toISOString().split('T')[0];
    }
    
    // Calculate first payment due date (7 days after start)
    const startDateObj = new Date(formData.rentalStartDate + 'T00:00:00');
    const nextPaymentDue = new Date(startDateObj);
    nextPaymentDue.setDate(nextPaymentDue.getDate() + 7);
    
    const rentalData = {
        rental_id: rentalId,
        customer_id: customerId,
        vehicle_id: formData.vehicleId,
        start_date: formData.rentalStartDate,
        end_date: endDate,
        weeks_count: weeksCount,
        rental_status: 'pending_approval',
        weekly_rate: weeklyRate,
        initial_payment: 0,
        deposit_included: 500,
        deposit_amount: 500,
        deposit_status: 'pending',
        payment_method: 'pending',
        next_payment_due: nextPaymentDue.toISOString().split('T')[0],
        start_mileage: 0
    };
    
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
        throw new Error('Failed to create rental application');
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format phone number as user types
document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
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
    }
});
