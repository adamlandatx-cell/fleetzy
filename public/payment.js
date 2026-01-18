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
    initializeAuth();
    initializeStripe();
});

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
        // Format phone for database query (+1XXXXXXXXXX)
        const formattedPhone = `+${phone}`;
        
        // Query Supabase for customer with active rental
        const { data, error } = await supabaseClient
            .from('customers')
            .select(`
                *,
                rentals!inner(
                    *,
                    vehicles(*)
                )
            `)
            .eq('phone', formattedPhone)
            .eq('rentals.status', 'active')
            .single();
        
        if (error || !data) {
            console.error('Customer not found:', error);
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

function showPaymentSection() {
    // Hide auth, show payment
    authSection.classList.add('hidden');
    paymentSection.classList.remove('hidden');
    
    // Populate customer info
    const fullName = `${customerData.first_name} ${customerData.last_name}`;
    document.getElementById('customerName').textContent = fullName;
    
    // Contract info
    const contractId = rentalData.id.split('-')[0].toUpperCase();
    document.getElementById('contractInfo').textContent = `Contract: ${contractId}`;
    
    // Vehicle info
    if (rentalData.vehicles) {
        const vehicle = rentalData.vehicles;
        const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        document.getElementById('vehicleInfo').textContent = vehicleInfo;
    }
    
    // Calculate payment amounts
    const weeklyRate = parseFloat(rentalData.weekly_rate) || 400.00;
    const depositAmount = parseFloat(rentalData.deposit_amount) || 500.00;
    const txTax = weeklyRate * 0.0625;
    const weeklyTotal = weeklyRate + txTax;
    const initialTotal = weeklyRate + depositAmount + txTax;
    
    paymentAmount = weeklyTotal;
    
    // Display amounts
    document.getElementById('weeklyRate').textContent = formatCurrency(weeklyRate);
    document.getElementById('txTax').textContent = formatCurrency(txTax);
    document.getElementById('totalDue').textContent = formatCurrency(weeklyTotal);
    document.getElementById('weeklyPaymentAmount').textContent = formatCurrency(weeklyTotal);
    
    // Populate initial payment amount
    const initialAmountEl = document.getElementById('initialPaymentAmount');
    if (initialAmountEl) {
        initialAmountEl.textContent = formatCurrency(initialTotal);
    }
    
    // Store amounts for payment type selection
    window.paymentAmounts = {
        weekly: weeklyTotal,
        initial: initialTotal,
        late_fee: 50
    };
    
    // Calculate next payment due
    const nextDue = new Date(rentalData.next_payment_due);
    const today = new Date();
    const daysUntil = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
    
    document.getElementById('nextDueDate').textContent = formatDate(nextDue);
    document.getElementById('daysUntilDue').textContent = `${daysUntil} days`;
    
    // Status badge
    const statusBadge = document.getElementById('statusBadge');
    if (daysUntil < 0) {
        statusBadge.textContent = 'OVERDUE';
        statusBadge.className = 'px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-700';
    } else if (daysUntil <= 2) {
        statusBadge.textContent = 'DUE SOON';
        statusBadge.className = 'px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700';
    } else {
        statusBadge.textContent = 'CURRENT';
        statusBadge.className = 'px-4 py-2 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700';
    }
    
    // Update button text
    document.getElementById('submitButtonText').textContent = `Pay ${formatCurrency(weeklyTotal)}`;
    
    // Initialize payment type selection (weekly is default)
    selectPaymentType('weekly');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// PAYMENT TYPE SELECTION
// ============================================================================

function selectPaymentType(type) {
    selectedPaymentType = type;
    document.getElementById('selectedPaymentType').value = type;
    
    // Update card styles
    const cards = document.querySelectorAll('.payment-type-card');
    cards.forEach(card => {
        if (card.dataset.type === type) {
            card.classList.add('border-emerald-500', 'bg-emerald-50', 'selected');
            card.classList.remove('border-gray-200');
        } else {
            card.classList.remove('border-emerald-500', 'bg-emerald-50', 'selected');
            card.classList.add('border-gray-200');
        }
    });
    
    // Show/hide custom amount input
    const customSection = document.getElementById('customAmountSection');
    const needsCustomAmount = ['toll_deposit', 'damage_fee', 'other'].includes(type);
    
    if (needsCustomAmount) {
        customSection.classList.remove('hidden');
        document.getElementById('customPaymentAmount').focus();
        // Don't set amount yet - wait for user input
        paymentAmount = 0;
        document.getElementById('submitButtonText').textContent = 'Enter Amount';
    } else {
        customSection.classList.add('hidden');
        // Set predefined amounts
        if (type === 'weekly') {
            paymentAmount = window.paymentAmounts.weekly || 425;
        } else if (type === 'initial') {
            paymentAmount = window.paymentAmounts.initial || 900;
        } else if (type === 'late_fee') {
            paymentAmount = window.paymentAmounts.late_fee || 50;
        }
        document.getElementById('submitButtonText').textContent = `Pay ${formatCurrency(paymentAmount)}`;
    }
}

function updateCustomPaymentAmount() {
    const input = document.getElementById('customPaymentAmount');
    const amount = parseFloat(input.value) || 0;
    paymentAmount = amount;
    
    if (amount > 0) {
        document.getElementById('submitButtonText').textContent = `Pay ${formatCurrency(amount)}`;
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
    
    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#1f2937',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                '::placeholder': {
                    color: '#9ca3af'
                }
            },
            invalid: {
                color: '#ef4444'
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
        
        // Step 1: Create payment intent via Supabase Edge Function
        const { data: intentData, error: intentError } = await supabaseClient.functions.invoke('create-payment-intent', {
            body: {
                amount: Math.round(paymentAmount * 100), // Convert to cents
                customer_id: customerData.id,
                rental_id: rentalData.id,
                customer_email: customerData.email,
                customer_name: `${customerData.first_name} ${customerData.last_name}`,
                payment_type: paymentType // NEW: Include payment type
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
                        name: `${customerData.first_name} ${customerData.last_name}`,
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
