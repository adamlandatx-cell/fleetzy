// ============================================================================
// FLEETZY PAYMENT PORTAL - JavaScript
// ============================================================================

// Configuration
const SUPABASE_URL = 'https://xmixxqtcgaydasejshwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaXh4cXRjZ2F5ZGFzZWpzaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODE5NTQsImV4cCI6MjA3ODM1Nzk1NH0.gMKEejleqvf-0iZmskUq43NUYbTW5AYPtsUgXevP2_U';
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51SUF2jHZpdKJtYCeQeeIsxYrJVX6L6xGfKXDoLku2N4gEWHGQXbnjwNtOXtaCko7ZYpkcWIR8xxmrAmM1hIzOnzm00bMUlh063';

// Initialize Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialize Stripe
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
let cardElement;

// Global state
let customerData = null;
let rentalData = null;
let paymentAmount = 0;

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const authSection = document.getElementById('authSection');
const paymentSection = document.getElementById('paymentSection');
const successSection = document.getElementById('successSection');
const authForm = document.getElementById('authForm');
const paymentForm = document.getElementById('paymentForm');
const authError = document.getElementById('authError');
const authErrorText = document.getElementById('authErrorText');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeStripe();
    checkExistingSession();
});

// ============================================================================
// SESSION CHECK - Skip auth if already logged in from dashboard
// ============================================================================

// Normalize phone - strip all non-digits
function normalizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

async function checkExistingSession() {
    const customerId = localStorage.getItem('fleetzy_customer_id');
    const customerPhone = localStorage.getItem('fleetzy_phone');
    
    console.log('🔐 Checking existing session...', { customerId, customerPhone });
    
    // Check if we have stored session data
    if (customerId || customerPhone) {
        // Already logged in from dashboard - load customer data directly
        showLoading('Loading your account...');
        
        try {
            // Step 1: Get customer data (same pattern as dashboard.html)
            let customer = null;
            
            if (customerId) {
                // Try by customer_id first (most reliable)
                const { data: customerById, error: idError } = await supabaseClient
                    .from('customers')
                    .select('*')
                    .eq('id', customerId)
                    .single();
                
                if (customerById && !idError) {
                    customer = customerById;
                    console.log('✅ Customer found by ID:', customer.full_name);
                } else {
                    console.log('⚠️ Customer not found by ID, trying phone...');
                }
            }
            
            // Fallback: Try by phone if ID lookup failed
            if (!customer && customerPhone) {
                const normalizedPhone = normalizePhone(customerPhone);
                const { data: allCustomers, error: phoneError } = await supabaseClient
                    .from('customers')
                    .select('*');
                
                if (!phoneError && allCustomers) {
                    customer = allCustomers.find(c => normalizePhone(c.phone) === normalizedPhone);
                    if (customer) {
                        console.log('✅ Customer found by phone:', customer.full_name);
                        // Update stored customer_id for future use
                        localStorage.setItem('fleetzy_customer_id', customer.id);
                    }
                }
            }
            
            if (!customer) {
                console.log('❌ Customer not found, showing auth form');
                hideLoading();
                initializeAuth();
                return;
            }
            
            // Step 2: Get active rental separately (same pattern as dashboard.html)
            const { data: rental, error: rentalError } = await supabaseClient
                .from('rentals')
                .select('*, vehicles(*)')
                .eq('customer_id', customer.id)
                .eq('rental_status', 'active')
                .single();
            
            if (rental && !rentalError) {
                console.log('✅ Active rental found:', rental.id);
                customerData = customer;
                rentalData = rental;
                hideLoading();
                showPaymentSection();
                return; // Exit - no need for auth form
            } else {
                console.log('⚠️ No active rental found for customer:', rentalError?.message || 'No rental');
                // Customer exists but no active rental - show auth form with message
                hideLoading();
                initializeAuth();
                // Show helpful message
                setTimeout(() => {
                    showAuthError('No active rental found. Please contact support if you believe this is an error.');
                }, 100);
                return;
            }
            
        } catch (err) {
            console.error('❌ Session load error:', err);
            hideLoading();
        }
    }
    
    // No valid session - show auth form
    console.log('📝 No session found, showing auth form...');
    initializeAuth();
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

function initializeAuth() {
    authForm.addEventListener('submit', handleAuth);
    
    // Auto-format phone input
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0 && !value.startsWith('1')) {
            value = '1' + value;
        }
        if (value.length > 11) {
            value = value.slice(0, 11);
        }
        e.target.value = formatPhone(value);
    });
    
    // Auto-format DL last 4
    const dlInput = document.getElementById('dlLast4');
    dlInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });
}

async function handleAuth(e) {
    e.preventDefault();
    
    const phone = document.getElementById('phone').value.replace(/\D/g, '');
    const dlLast4 = document.getElementById('dlLast4').value;
    
    // Validate
    if (!phone || phone.length < 10) {
        showAuthError('Please enter a valid phone number');
        return;
    }
    
    if (!dlLast4 || dlLast4.length !== 4) {
        showAuthError('Please enter the last 4 digits of your driver\'s license');
        return;
    }
    
    // Show loading
    showLoading('Verifying your identity...');
    hideAuthError();
    
    try {
        // Normalize phone - strip to just digits (no country code prefix for matching)
        let normalizedPhone = phone.replace(/\D/g, '');
        // Remove leading 1 if present (country code)
        if (normalizedPhone.length === 11 && normalizedPhone.startsWith('1')) {
            normalizedPhone = normalizedPhone.slice(1);
        }
        
        console.log('Looking for customer with normalized phone:', normalizedPhone);
        
        // Get all customers and find by normalized phone
        const { data: allCustomers, error: customersError } = await supabaseClient
            .from('customers')
            .select(`
                *,
                rentals!inner(
                    *,
                    vehicles(*)
                )
            `)
            .eq('rentals.rental_status', 'active');
        
        if (customersError) throw customersError;
        
        // Find customer where normalized phone matches
        const data = allCustomers?.find(c => {
            const dbPhoneNorm = (c.phone || '').replace(/\D/g, '');
            // Also strip leading 1 from database phone if present
            const dbPhoneClean = dbPhoneNorm.length === 11 && dbPhoneNorm.startsWith('1') 
                ? dbPhoneNorm.slice(1) 
                : dbPhoneNorm;
            return dbPhoneClean === normalizedPhone;
        });
        
        if (!data) {
            console.error('Customer not found');
            hideLoading();
            showAuthError('Customer not found. Please check your phone number.');
            return;
        }
        
        // Verify last 4 of DL
        const storedDLLast4 = data.dl_number ? data.dl_number.slice(-4) : '';
        if (storedDLLast4 !== dlLast4) {
            hideLoading();
            showAuthError('Driver\'s license verification failed. Please check the last 4 digits.');
            return;
        }
        
        // Success! Store customer and rental data
        customerData = data;
        rentalData = data.rentals[0]; // First active rental
        
        // Show payment section
        hideLoading();
        showPaymentSection();
        
    } catch (error) {
        console.error('Authentication error:', error);
        hideLoading();
        showAuthError('An error occurred. Please try again.');
    }
}

// ============================================================================
// PAYMENT SECTION
// ============================================================================

// Global state for selected payment type
let selectedPaymentType = 'weekly';
let pendingCharges = []; // Store pending charges globally

async function showPaymentSection() {
    // Hide auth, show payment
    authSection.classList.add('hidden');
    paymentSection.classList.remove('hidden');
    
    // Populate customer info - use first name for greeting
    let displayName = 'Driver';
    if (customerData.full_name && customerData.full_name.trim()) {
        displayName = customerData.full_name.split(' ')[0]; // First name only
    } else if (customerData.first_name && customerData.first_name.trim()) {
        displayName = customerData.first_name;
    }
    
    // Update greeting (matches HTML element id="customerGreeting")
    const greetingEl = document.getElementById('customerGreeting');
    if (greetingEl) {
        greetingEl.textContent = `Hello, ${displayName}!`;
    }
    
    // Vehicle info (matches HTML element id="vehicleName")
    if (rentalData.vehicles) {
        const vehicle = rentalData.vehicles;
        const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        const vehicleEl = document.getElementById('vehicleName');
        if (vehicleEl) {
            vehicleEl.textContent = vehicleInfo;
        }
    }
    
    // Fetch pending charges from rental_charges table
    let chargesTotal = 0;
    pendingCharges = [];
    try {
        const { data: charges, error: chargesError } = await supabaseClient
            .from('rental_charges')
            .select('*')
            .eq('rental_id', rentalData.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (!chargesError && charges && charges.length > 0) {
            pendingCharges = charges;
            chargesTotal = charges.reduce((sum, charge) => sum + parseFloat(charge.amount || 0), 0);
            console.log('📋 Pending charges found:', charges.length, 'Total:', chargesTotal);
        }
    } catch (err) {
        console.log('⚠️ Could not fetch charges:', err.message);
    }
    
    // Calculate payment amounts - NO processing fee, just flat weekly rate + charges
    const weeklyRate = parseFloat(rentalData.weekly_rate) || 400.00;
    const depositAmount = parseFloat(rentalData.deposit_amount) || 500.00;
    const additionalFees = parseFloat(rentalData.additional_fees) || 0; // Legacy field
    
    // Total = weekly rate + pending charges from rental_charges table
    const totalCharges = chargesTotal + additionalFees;
    const weeklyTotal = weeklyRate + totalCharges;
    const depositTotal = depositAmount;
    
    paymentAmount = weeklyTotal;
    
    // Display amounts (matches HTML element IDs)
    const weeklyRateEl = document.getElementById('weeklyRate');
    if (weeklyRateEl) {
        weeklyRateEl.textContent = formatCurrency(weeklyRate);
    }
    
    // Build charges display - insert after weekly rate row
    const chargesContainer = document.getElementById('chargesContainer');
    if (chargesContainer) {
        chargesContainer.remove(); // Remove old container if exists
    }
    
    // Create charges section if there are pending charges
    if (pendingCharges.length > 0 || additionalFees > 0) {
        const weeklyRateRow = weeklyRateEl?.closest('.summary-row');
        if (weeklyRateRow) {
            let chargesHTML = '<div id="chargesContainer">';
            
            // Display each individual charge
            pendingCharges.forEach(charge => {
                const chargeType = charge.charge_type ? charge.charge_type.replace('_', ' ') : 'Fee';
                const chargeLabel = charge.description || chargeType.charAt(0).toUpperCase() + chargeType.slice(1);
                chargesHTML += `
                    <div class="summary-row charge-item">
                        <span class="summary-label" style="color: var(--accent-amber);">
                            <i class="fas fa-${getChargeIcon(charge.charge_type)}" style="margin-right: 6px;"></i>
                            ${chargeLabel}
                        </span>
                        <span class="summary-value" style="color: var(--accent-amber);">+${formatCurrency(charge.amount)}</span>
                    </div>
                `;
            });
            
            // Add legacy additional fees if any
            if (additionalFees > 0) {
                chargesHTML += `
                    <div class="summary-row charge-item">
                        <span class="summary-label" style="color: var(--accent-amber);">Additional Fees</span>
                        <span class="summary-value" style="color: var(--accent-amber);">+${formatCurrency(additionalFees)}</span>
                    </div>
                `;
            }
            
            chargesHTML += '</div>';
            weeklyRateRow.insertAdjacentHTML('afterend', chargesHTML);
        }
    }
    
    // Hide legacy additional fees row (now using individual charge items)
    const additionalFeesRow = document.getElementById('additionalFeesRow');
    if (additionalFeesRow) {
        additionalFeesRow.classList.add('hidden');
    }
    
    const totalEl = document.getElementById('totalWithTax');
    if (totalEl) {
        totalEl.textContent = formatCurrency(weeklyTotal);
    }
    
    // Store amounts for payment type selection
    window.paymentAmounts = {
        weekly: weeklyTotal,
        deposit: depositTotal,
        additionalFees: totalCharges,
        chargesTotal: chargesTotal,
        custom: 0
    };
    
    // Update button text
    document.getElementById('submitButtonText').textContent = `Pay ${formatCurrency(weeklyTotal)}`;
    
    // Update payment method card amounts
    updatePaymentMethodAmounts();
    
    // Initialize payment type selection (weekly is default)
    selectPaymentType('weekly');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('✅ Payment section loaded:', {
        customer: displayName,
        weeklyRate: weeklyRate,
        chargesTotal: chargesTotal,
        additionalFees: additionalFees,
        total: weeklyTotal
    });
}

// ============================================================================
// PAYMENT TYPE SELECTION
// ============================================================================

function selectPaymentType(type) {
    selectedPaymentType = type;
    
    // Update button styles (matches HTML class="payment-type-btn")
    const buttons = document.querySelectorAll('.payment-type-btn');
    buttons.forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide custom amount input
    const customAmountGroup = document.getElementById('customAmountGroup');
    
    if (type === 'custom') {
        // Show custom amount input
        if (customAmountGroup) {
            customAmountGroup.classList.remove('hidden');
            const customInput = document.getElementById('customAmount');
            if (customInput) {
                customInput.focus();
            }
        }
        paymentAmount = 0;
        document.getElementById('submitButtonText').textContent = 'Enter Amount';
    } else {
        // Hide custom amount input
        if (customAmountGroup) {
            customAmountGroup.classList.add('hidden');
        }
        
        // Set predefined amounts (no processing fee - flat rates + any additional fees)
        const additionalFees = window.paymentAmounts.additionalFees || 0;
        
        if (type === 'weekly') {
            const weeklyRate = parseFloat(rentalData?.weekly_rate) || 400;
            paymentAmount = weeklyRate + additionalFees;
            
            // Update display
            const weeklyRateEl = document.getElementById('weeklyRate');
            if (weeklyRateEl) {
                weeklyRateEl.textContent = formatCurrency(weeklyRate);
            }
        } else if (type === 'deposit') {
            paymentAmount = window.paymentAmounts.deposit || 500;
            
            // Update display to show deposit
            const weeklyRateEl = document.getElementById('weeklyRate');
            if (weeklyRateEl) {
                weeklyRateEl.textContent = formatCurrency(paymentAmount);
            }
        }
        
        document.getElementById('submitButtonText').textContent = `Pay ${formatCurrency(paymentAmount)}`;
        
        // Update the summary card total
        const totalEl = document.getElementById('totalWithTax');
        if (totalEl) {
            totalEl.textContent = formatCurrency(paymentAmount);
        }
        
        // Show/hide additional fees row based on payment type and if fees exist
        const additionalFeesRow = document.getElementById('additionalFeesRow');
        if (additionalFeesRow) {
            if (type === 'weekly' && additionalFees > 0) {
                additionalFeesRow.classList.remove('hidden');
            } else {
                additionalFeesRow.classList.add('hidden');
            }
        }
    }
    
    // Update payment method card amounts
    if (typeof updatePaymentMethodAmounts === 'function') {
        updatePaymentMethodAmounts();
    }
    
    // Reset payment method selection when payment type changes
    selectedPaymentMethod = null;
    document.querySelectorAll('.method-card').forEach(card => card.classList.remove('selected'));
    const continueBtn = document.getElementById('continueToPayBtn');
    if (continueBtn) {
        continueBtn.disabled = true;
        continueBtn.querySelector('span').textContent = 'Select a payment method';
    }
    
    console.log('💳 Payment type selected:', type, '| Amount:', paymentAmount);
}

// Renamed to match HTML oninput="updateCustomAmount()"
function updateCustomAmount() {
    const input = document.getElementById('customAmount');
    const amount = parseFloat(input?.value) || 0;
    paymentAmount = amount;
    
    if (amount > 0) {
        document.getElementById('submitButtonText').textContent = `Pay ${formatCurrency(amount)}`;
        
        // Update total display
        const totalEl = document.getElementById('totalWithTax');
        if (totalEl) {
            totalEl.textContent = formatCurrency(amount);
        }
    } else {
        document.getElementById('submitButtonText').textContent = 'Enter Amount';
    }
}

// ============================================================================
// STRIPE INTEGRATION
// ============================================================================

function initializeStripe() {
    // Create card element when payment form is visible
    const elements = stripe.elements();
    
    // Dark mode styling to match the premium Fleetzy aesthetic
    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#fafafa',
                fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
                fontSmoothing: 'antialiased',
                '::placeholder': {
                    color: '#71717a'
                },
                iconColor: '#a1a1aa'
            },
            invalid: {
                color: '#ef4444',
                iconColor: '#ef4444'
            },
            complete: {
                color: '#10b981',
                iconColor: '#10b981'
            }
        },
        hidePostalCode: false
    });
    
    // Mount card element (will be hidden until payment section shows)
    setTimeout(() => {
        cardElement.mount('#card-element');
    }, 100);
    
    // Handle card errors
    cardElement.on('change', (event) => {
        const cardErrors = document.getElementById('card-errors');
        if (event.error) {
            cardErrors.textContent = event.error.message;
            cardErrors.classList.remove('hidden');
        } else {
            cardErrors.classList.add('hidden');
        }
    });
    
    // Handle payment form submission
    paymentForm.addEventListener('submit', handlePayment);
}

async function handlePayment(e) {
    e.preventDefault();
    
    // Validate amount for custom types
    if (paymentAmount <= 0) {
        const cardErrors = document.getElementById('card-errors');
        cardErrors.textContent = 'Please enter a valid payment amount';
        cardErrors.classList.remove('hidden');
        return;
    }
    
    // Disable submit button
    const submitButton = document.getElementById('submitPayment');
    submitButton.disabled = true;
    
    showLoading('Processing your payment...');
    
    try {
        // Get selected payment type
        const paymentType = selectedPaymentType || 'weekly';
        
        // Calculate fee and total for card payment
        const processingFee = paymentAmount * FEE_RATES.card;
        const chargeAmount = paymentAmount + processingFee;
        
        // Step 1: Create payment intent via Supabase Edge Function
        const { data: intentData, error: intentError } = await supabaseClient.functions.invoke('create-payment-intent', {
            body: {
                amount: Math.round(chargeAmount * 100), // Total with fee in cents
                base_amount: Math.round(paymentAmount * 100), // Base amount in cents
                processing_fee: Math.round(processingFee * 100), // Fee in cents
                customer_id: customerData.id,
                rental_id: rentalData.id,
                customer_email: customerData.email,
                customer_name: customerData.full_name || 'Customer',
                payment_type: paymentType,
                payment_method: 'card'
            }
        });
        
        if (intentError || !intentData.clientSecret) {
            throw new Error('Failed to create payment intent');
        }
        
        // Step 2: Confirm card payment with Stripe
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
            intentData.clientSecret,
            {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: customerData.full_name || 'Customer',
                        email: customerData.email,
                        phone: customerData.phone
                    }
                }
            }
        );
        
        if (stripeError) {
            throw new Error(stripeError.message);
        }
        
        // Step 3: Payment successful!
        if (paymentIntent.status === 'succeeded') {
            // The webhook will handle recording the payment in Supabase
            // and sending SMS receipts via n8n
            
            // Show success screen
            showSuccessScreen(paymentIntent);
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        hideLoading();
        submitButton.disabled = false;
        
        const cardErrors = document.getElementById('card-errors');
        cardErrors.textContent = error.message || 'Payment failed. Please try again.';
        cardErrors.classList.remove('hidden');
    }
}

// ============================================================================
// SUCCESS SCREEN
// ============================================================================

function showSuccessScreen(paymentIntent) {
    hideLoading();
    
    // Hide payment section
    paymentSection.classList.add('hidden');
    successSection.classList.remove('hidden');
    
    // Populate success details
    document.getElementById('successAmount').textContent = formatCurrency(paymentAmount);
    document.getElementById('successDate').textContent = formatDate(new Date());
    
    // Card info
    const cardBrand = paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand || 'Card';
    const last4 = paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4 || '****';
    document.getElementById('successMethod').textContent = `${capitalize(cardBrand)} ****${last4}`;
    
    // Calculate next payment (7 days from now)
    const nextPayment = new Date();
    nextPayment.setDate(nextPayment.getDate() + 7);
    document.getElementById('successNextDue').textContent = formatDate(nextPayment);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showLoading(message) {
    loadingText.textContent = message;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showAuthError(message) {
    authErrorText.textContent = message;
    authError.classList.remove('hidden');
}

function hideAuthError() {
    authError.classList.add('hidden');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^1?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get Font Awesome icon for charge type
 */
function getChargeIcon(chargeType) {
    const icons = {
        'toll': 'road',
        'damage': 'car-crash',
        'cleaning': 'broom',
        'late_fee': 'clock',
        'deposit_replenish': 'piggy-bank',
        'mileage_overage': 'tachometer-alt',
        'other': 'file-invoice-dollar'
    };
    return icons[chargeType] || 'dollar-sign';
}

// ============================================================================
// ZELLE PAYMENT HANDLING
// ============================================================================

function handleZelleClick() {
    // Update the amount in the modal
    const zelleAmountEl = document.getElementById('zelleAmount');
    if (zelleAmountEl && paymentAmount) {
        zelleAmountEl.textContent = formatCurrency(paymentAmount);
    }
    
    // Show the modal
    const modal = document.getElementById('zelleModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeZelleModal() {
    const modal = document.getElementById('zelleModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function copyZelleEmail() {
    const zelleEmail = 'adam@getfleetzy.com';
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(zelleEmail).then(() => {
            showCopyToast('Email copied! Open your bank app');
        }).catch(() => {
            fallbackCopyToClipboard(zelleEmail);
        });
    } else {
        fallbackCopyToClipboard(zelleEmail);
    }
}

function fallbackCopyToClipboard(text) {
    // Fallback for older browsers/iOS
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyToast('Email copied! Open your bank app');
    } catch (err) {
        showCopyToast('Tap and hold to copy');
    }
    
    document.body.removeChild(textArea);
}

function showCopyToast(message) {
    // Remove any existing toast
    const existingToast = document.querySelector('.copy-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create and show toast
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 2500);
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('zelleModal');
    if (modal && e.target === modal) {
        closeZelleModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeZelleModal();
    }
});

// ============================================================================
// PAYMENT METHOD SELECTION WITH FEES
// ============================================================================

// Fee configuration
const FEE_RATES = {
    zelle: 0,       // 0% - preferred
    card: 0.03,     // 3%
    cashapp: 0.03   // 3%
};

let selectedPaymentMethod = null;
let totalWithFee = 0;

// Update payment method card amounts when payment amount changes
function updatePaymentMethodAmounts() {
    const baseAmount = paymentAmount;
    
    // Calculate amounts with fees
    const zelleTotal = baseAmount; // 0% fee
    const cardFee = baseAmount * FEE_RATES.card;
    const cardTotal = baseAmount + cardFee;
    const cashappFee = baseAmount * FEE_RATES.cashapp;
    const cashappTotal = baseAmount + cashappFee;
    
    // Update card displays
    const zelleEl = document.getElementById('zelleTotal');
    const cardEl = document.getElementById('cardMethodTotal');
    const cashappEl = document.getElementById('cashappMethodTotal');
    
    if (zelleEl) zelleEl.textContent = formatCurrency(zelleTotal);
    if (cardEl) cardEl.textContent = formatCurrency(cardTotal);
    if (cashappEl) cashappEl.textContent = formatCurrency(cashappTotal);
    
    console.log('💵 Payment amounts updated:', { baseAmount, zelleTotal, cardTotal, cashappTotal });
}

// Select a payment method
function selectPaymentMethod(method) {
    if (paymentAmount <= 0) {
        showCopyToast('Please select or enter a payment amount first');
        return;
    }
    
    selectedPaymentMethod = method;
    
    // Update card selection UI
    document.querySelectorAll('.method-card').forEach(card => {
        if (card.dataset.method === method) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Calculate total with fee
    const fee = paymentAmount * (FEE_RATES[method] || 0);
    totalWithFee = paymentAmount + fee;
    
    // Update continue button
    const continueBtn = document.getElementById('continueToPayBtn');
    if (continueBtn) {
        continueBtn.disabled = false;
        const methodName = method === 'card' ? 'Credit Card' : method.charAt(0).toUpperCase() + method.slice(1);
        continueBtn.querySelector('span').textContent = `Continue with ${methodName} - ${formatCurrency(totalWithFee)}`;
    }
    
    console.log('💳 Payment method selected:', method, '| Fee:', formatCurrency(fee), '| Total:', formatCurrency(totalWithFee));
}

// Continue to payment after method selection
function continueToPayment() {
    if (!selectedPaymentMethod || paymentAmount <= 0) {
        showCopyToast('Please select a payment method');
        return;
    }
    
    // Hide method selection card
    const methodCard = document.getElementById('methodSelectionCard');
    if (methodCard) methodCard.classList.add('hidden');
    
    // Calculate fee
    const fee = paymentAmount * (FEE_RATES[selectedPaymentMethod] || 0);
    totalWithFee = paymentAmount + fee;
    
    // Show appropriate payment section
    if (selectedPaymentMethod === 'zelle') {
        showZellePaymentCard();
    } else if (selectedPaymentMethod === 'cashapp') {
        showCashAppPaymentCard();
    } else if (selectedPaymentMethod === 'card') {
        showCardPaymentCard();
    }
}

// Show Zelle payment section
function showZellePaymentCard() {
    const section = document.getElementById('zellePaymentCard');
    if (section) {
        section.classList.remove('hidden');
        
        // Update amounts (Zelle has no fee)
        const baseEl = document.getElementById('zelleBaseAmount');
        const finalEl = document.getElementById('zelleFinalAmount');
        if (baseEl) baseEl.textContent = formatCurrency(paymentAmount);
        if (finalEl) finalEl.textContent = formatCurrency(paymentAmount);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show CashApp payment section
function showCashAppPaymentCard() {
    const section = document.getElementById('cashappPaymentCard');
    if (section) {
        section.classList.remove('hidden');
        
        // Calculate fee
        const fee = paymentAmount * FEE_RATES.cashapp;
        const total = paymentAmount + fee;
        
        // Update displays
        const baseEl = document.getElementById('cashappBaseAmount');
        const feeEl = document.getElementById('cashappFeeAmount');
        const finalEl = document.getElementById('cashappFinalAmount');
        
        if (baseEl) baseEl.textContent = formatCurrency(paymentAmount);
        if (feeEl) feeEl.textContent = formatCurrency(fee);
        if (finalEl) finalEl.textContent = formatCurrency(total);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show Card payment section
function showCardPaymentCard() {
    const section = document.getElementById('cardPaymentCard');
    if (section) {
        section.classList.remove('hidden');
        
        // Calculate fee
        const fee = paymentAmount * FEE_RATES.card;
        const total = paymentAmount + fee;
        
        // Update displays
        const baseEl = document.getElementById('cardBaseAmount');
        const feeEl = document.getElementById('cardFeeAmount');
        const finalEl = document.getElementById('cardFinalAmount');
        const submitText = document.getElementById('submitButtonText');
        
        if (baseEl) baseEl.textContent = formatCurrency(paymentAmount);
        if (feeEl) feeEl.textContent = formatCurrency(fee);
        if (finalEl) finalEl.textContent = formatCurrency(total);
        if (submitText) submitText.textContent = `Pay ${formatCurrency(total)}`;
        
        // Store total with fee for payment processing
        totalWithFee = total;
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Go back to method selection
function goBackToMethodSelection() {
    // Hide all payment cards
    const zelleCard = document.getElementById('zellePaymentCard');
    const cashappCard = document.getElementById('cashappPaymentCard');
    const cardCard = document.getElementById('cardPaymentCard');
    
    if (zelleCard) zelleCard.classList.add('hidden');
    if (cashappCard) cashappCard.classList.add('hidden');
    if (cardCard) cardCard.classList.add('hidden');
    
    // Show method selection
    const methodCard = document.getElementById('methodSelectionCard');
    if (methodCard) methodCard.classList.remove('hidden');
    
    // Reset selection
    selectedPaymentMethod = null;
    document.querySelectorAll('.method-card').forEach(card => card.classList.remove('selected'));
    
    const continueBtn = document.getElementById('continueToPayBtn');
    if (continueBtn) {
        continueBtn.disabled = true;
        continueBtn.querySelector('span').textContent = 'Select a payment method';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Don't show user-facing errors for all JS errors
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show user-facing errors for all promise rejections
});
