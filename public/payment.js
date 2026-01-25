// ============================================================================
// FLEETZY PAYMENT PORTAL - WITH PROCESSING FEES
// ============================================================================

// Configuration
const SUPABASE_URL = 'https://xmixxqtcgaydasejshwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaXh4cXRjZ2F5ZGFzZWpzaHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODE5NTQsImV4cCI6MjA3ODM1Nzk1NH0.gMKEejleqvf-0iZmskUq43NUYbTW5AYPtsUgXevP2_U';
const STRIPE_PK = 'pk_live_51SUF2jHZpdKJtYCeQeeIsxYrJVX6L6xGfKXDoLku2N4gEWHGQXbnjwNtOXtaCko7ZYpkcWIR8xxmrAmM1hIzOnzm00bMUlh063';

// Fee configuration
const FEE_RATES = {
    zelle: 0,       // 0% - preferred
    card: 0.03,     // 3%
    cashapp: 0.03   // 3%
};

// Initialize Supabase and Stripe
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const stripe = Stripe(STRIPE_PK);

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const authSection = document.getElementById('authSection');
const authForm = document.getElementById('authForm');
const authError = document.getElementById('authError');
const authErrorText = document.getElementById('authErrorText');
const paymentSection = document.getElementById('paymentSection');
const paymentForm = document.getElementById('paymentForm');

// State
let customerData = null;
let rentalData = null;
let cardElement = null;
let paymentAmount = 0;      // Base amount (before fees)
let totalWithFee = 0;       // Amount with fee added
let selectedPaymentType = 'weekly';
let selectedPaymentMethod = null;
let pendingCharges = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚗 Fleetzy Payment Portal initialized');
    
    // Check for stored session
    const storedCustomerId = localStorage.getItem('fleetzy_customer_id');
    const storedPhone = localStorage.getItem('fleetzy_phone');
    
    if (storedCustomerId && storedPhone) {
        document.getElementById('phone').value = storedPhone;
    }
    
    // Set up form handler
    authForm.addEventListener('submit', handleAuth);
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
        return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
}

function normalizePhone(phone) {
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        digits = '1' + digits;
    }
    return '+' + digits;
}

function showLoading(text = 'Processing...') {
    loadingText.textContent = text;
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

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

function getChargeIcon(chargeType) {
    const icons = {
        'weekly_rent': 'calendar-week',
        'late_fee': 'clock',
        'toll': 'road',
        'cleaning': 'broom',
        'damage': 'car-crash',
        'deposit': 'shield-alt',
        'processing_fee': 'percentage'
    };
    return icons[chargeType] || 'receipt';
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function handleAuth(e) {
    e.preventDefault();
    hideAuthError();
    
    const phone = document.getElementById('phone').value;
    const dlLast4 = document.getElementById('dlLast4').value;
    
    if (!phone || !dlLast4) {
        showAuthError('Please fill in all fields');
        return;
    }
    
    if (dlLast4.length !== 4 || !/^\d{4}$/.test(dlLast4)) {
        showAuthError('Please enter exactly 4 digits for your driver\'s license');
        return;
    }
    
    showLoading('Verifying your account...');
    
    try {
        const normalizedPhone = normalizePhone(phone);
        
        const { data, error } = await supabaseClient
            .from('customers')
            .select(`
                *,
                rentals!inner (
                    *,
                    vehicles (*)
                )
            `)
            .or(`phone.eq.${normalizedPhone},phone.eq.${phone}`)
            .eq('rentals.rental_status', 'active')
            .single();
        
        if (error || !data) {
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
        
        // Store session
        localStorage.setItem('fleetzy_customer_id', data.id);
        localStorage.setItem('fleetzy_phone', phone);
        
        customerData = data;
        rentalData = data.rentals[0];
        
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

async function showPaymentSection() {
    authSection.classList.add('hidden');
    paymentSection.classList.remove('hidden');
    
    // Customer greeting
    let displayName = 'Driver';
    if (customerData.full_name && customerData.full_name.trim()) {
        displayName = customerData.full_name.split(' ')[0];
    } else if (customerData.first_name && customerData.first_name.trim()) {
        displayName = customerData.first_name;
    }
    
    const greetingEl = document.getElementById('customerGreeting');
    if (greetingEl) {
        greetingEl.textContent = `Hello, ${displayName}!`;
    }
    
    // Vehicle info
    if (rentalData.vehicles) {
        const vehicle = rentalData.vehicles;
        const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        const vehicleEl = document.getElementById('vehicleName');
        if (vehicleEl) vehicleEl.textContent = vehicleInfo;
    }
    
    // Fetch pending charges
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
    
    // Calculate amounts
    const weeklyRate = parseFloat(rentalData.current_weekly_rate || rentalData.weekly_rate) || 400.00;
    const depositAmount = parseFloat(rentalData.deposit_amount) || 500.00;
    const additionalFees = parseFloat(rentalData.additional_fees) || 0;
    
    const totalCharges = chargesTotal + additionalFees;
    const weeklyTotal = weeklyRate + totalCharges;
    
    paymentAmount = weeklyTotal;
    
    // Display weekly rate
    const weeklyRateEl = document.getElementById('weeklyRate');
    if (weeklyRateEl) weeklyRateEl.textContent = formatCurrency(weeklyRate);
    
    // Build charges display
    const chargesContainer = document.getElementById('chargesContainer');
    if (chargesContainer) chargesContainer.innerHTML = '';
    
    if (pendingCharges.length > 0 || additionalFees > 0) {
        let chargesHTML = '';
        
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
        
        if (additionalFees > 0) {
            chargesHTML += `
                <div class="summary-row charge-item">
                    <span class="summary-label" style="color: var(--accent-amber);">Additional Fees</span>
                    <span class="summary-value" style="color: var(--accent-amber);">+${formatCurrency(additionalFees)}</span>
                </div>
            `;
        }
        
        if (chargesContainer) chargesContainer.innerHTML = chargesHTML;
    }
    
    // Display total
    const totalDueEl = document.getElementById('totalDue');
    if (totalDueEl) totalDueEl.textContent = formatCurrency(weeklyTotal);
    
    // Store amounts for payment type selection
    window.paymentAmounts = {
        weekly: weeklyTotal,
        deposit: depositAmount,
        additionalFees: totalCharges,
        chargesTotal: chargesTotal,
        custom: 0
    };
    
    // Update method card amounts
    updatePaymentMethodAmounts();
    
    // Initialize payment type
    selectPaymentType('weekly');
    
    // Initialize Stripe
    initializeStripe();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('✅ Payment section loaded:', {
        customer: displayName,
        weeklyRate: weeklyRate,
        chargesTotal: chargesTotal,
        total: weeklyTotal
    });
}

// ============================================================================
// PAYMENT TYPE SELECTION
// ============================================================================

function selectPaymentType(type) {
    selectedPaymentType = type;
    
    // Update button styles
    const buttons = document.querySelectorAll('.payment-type-btn');
    buttons.forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const customAmountGroup = document.getElementById('customAmountGroup');
    
    if (type === 'custom') {
        if (customAmountGroup) {
            customAmountGroup.classList.remove('hidden');
            const customInput = document.getElementById('customAmount');
            if (customInput) customInput.focus();
        }
        paymentAmount = 0;
    } else {
        if (customAmountGroup) customAmountGroup.classList.add('hidden');
        
        const additionalFees = window.paymentAmounts?.additionalFees || 0;
        
        if (type === 'weekly') {
            const weeklyRate = parseFloat(rentalData?.current_weekly_rate || rentalData?.weekly_rate) || 400;
            paymentAmount = weeklyRate + additionalFees;
        } else if (type === 'deposit') {
            paymentAmount = window.paymentAmounts?.deposit || 500;
        }
    }
    
    // Update displays
    const totalDueEl = document.getElementById('totalDue');
    if (totalDueEl) totalDueEl.textContent = formatCurrency(paymentAmount);
    
    // Update method card amounts
    updatePaymentMethodAmounts();
    
    // Reset payment method selection
    selectedPaymentMethod = null;
    document.querySelectorAll('.method-card').forEach(card => card.classList.remove('selected'));
    const continueBtn = document.getElementById('continueToPayBtn');
    if (continueBtn) {
        continueBtn.disabled = true;
        continueBtn.querySelector('span').textContent = 'Select a payment method';
    }
    
    console.log('💳 Payment type selected:', type, '| Base Amount:', paymentAmount);
}

function updateCustomAmount() {
    const input = document.getElementById('customAmount');
    const amount = parseFloat(input?.value) || 0;
    paymentAmount = amount;
    
    // Update total display
    const totalDueEl = document.getElementById('totalDue');
    if (totalDueEl) totalDueEl.textContent = formatCurrency(amount);
    
    // Update method card amounts
    updatePaymentMethodAmounts();
    
    // Reset method selection
    selectedPaymentMethod = null;
    document.querySelectorAll('.method-card').forEach(card => card.classList.remove('selected'));
}

// ============================================================================
// PAYMENT METHOD SELECTION
// ============================================================================

function updatePaymentMethodAmounts() {
    const baseAmount = paymentAmount;
    
    // Calculate amounts with fees
    const zelleTotal = baseAmount; // 0% fee
    const cardFee = baseAmount * FEE_RATES.card;
    const cardTotal = baseAmount + cardFee;
    const cashappFee = baseAmount * FEE_RATES.cashapp;
    const cashappTotal = baseAmount + cashappFee;
    
    // Update card displays
    document.getElementById('zelleTotal').textContent = formatCurrency(zelleTotal);
    document.getElementById('cardTotal').textContent = formatCurrency(cardTotal);
    document.getElementById('cashappTotal').textContent = formatCurrency(cashappTotal);
    
    console.log('💵 Payment amounts updated:', { baseAmount, zelleTotal, cardTotal, cashappTotal });
}

function selectPaymentMethod(method) {
    if (paymentAmount <= 0) {
        showToast('Please select or enter a payment amount first');
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

function continueToPayment() {
    if (!selectedPaymentMethod || paymentAmount <= 0) {
        showToast('Please select a payment method');
        return;
    }
    
    // Hide payment section
    paymentSection.classList.add('hidden');
    
    // Calculate fee
    const fee = paymentAmount * (FEE_RATES[selectedPaymentMethod] || 0);
    totalWithFee = paymentAmount + fee;
    
    // Show appropriate payment section
    if (selectedPaymentMethod === 'zelle') {
        showZellePayment();
    } else if (selectedPaymentMethod === 'cashapp') {
        showCashAppPayment();
    } else if (selectedPaymentMethod === 'card') {
        showCardPayment();
    }
}

// ============================================================================
// ZELLE PAYMENT
// ============================================================================

function showZellePayment() {
    const section = document.getElementById('zellePaymentSection');
    section.classList.remove('hidden');
    
    // Update amounts (Zelle has no fee)
    document.getElementById('zelleBaseAmount').textContent = formatCurrency(paymentAmount);
    document.getElementById('zelleFinalAmount').textContent = formatCurrency(paymentAmount);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function copyZelleEmail() {
    navigator.clipboard.writeText('adam@getfleetzy.com').then(() => {
        showToast('Email copied to clipboard!');
    }).catch(() => {
        showToast('Could not copy email');
    });
}

// ============================================================================
// CASHAPP PAYMENT
// ============================================================================

function showCashAppPayment() {
    const section = document.getElementById('cashappPaymentSection');
    section.classList.remove('hidden');
    
    // Calculate fee
    const fee = paymentAmount * FEE_RATES.cashapp;
    const total = paymentAmount + fee;
    
    // Update displays
    document.getElementById('cashappBaseAmount').textContent = formatCurrency(paymentAmount);
    document.getElementById('cashappFeeAmount').textContent = formatCurrency(fee);
    document.getElementById('cashappFinalAmount').textContent = formatCurrency(total);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// CARD PAYMENT (STRIPE)
// ============================================================================

function showCardPayment() {
    const section = document.getElementById('cardPaymentSection');
    section.classList.remove('hidden');
    
    // Calculate fee
    const fee = paymentAmount * FEE_RATES.card;
    const total = paymentAmount + fee;
    
    // Update displays
    document.getElementById('cardBaseAmount').textContent = formatCurrency(paymentAmount);
    document.getElementById('cardFeeAmount').textContent = formatCurrency(fee);
    document.getElementById('cardFinalAmount').textContent = formatCurrency(total);
    document.getElementById('submitButtonText').textContent = `Pay ${formatCurrency(total)}`;
    
    // Remount Stripe element if needed
    if (cardElement) {
        setTimeout(() => {
            cardElement.mount('#card-element');
        }, 100);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initializeStripe() {
    const elements = stripe.elements();
    
    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#fafafa',
                fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
                fontSmoothing: 'antialiased',
                '::placeholder': { color: '#71717a' },
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
    
    cardElement.on('change', (event) => {
        const cardErrors = document.getElementById('card-errors');
        if (event.error) {
            cardErrors.textContent = event.error.message;
            cardErrors.classList.remove('hidden');
        } else {
            cardErrors.classList.add('hidden');
        }
    });
    
    paymentForm.addEventListener('submit', handleCardPayment);
}

async function handleCardPayment(e) {
    e.preventDefault();
    
    // Calculate final amount with fee
    const fee = paymentAmount * FEE_RATES.card;
    const finalAmount = paymentAmount + fee;
    
    if (finalAmount <= 0) {
        const cardErrors = document.getElementById('card-errors');
        cardErrors.textContent = 'Please enter a valid payment amount';
        cardErrors.classList.remove('hidden');
        return;
    }
    
    const submitButton = document.getElementById('submitPayment');
    submitButton.disabled = true;
    
    showLoading('Processing your payment...');
    
    try {
        // Create payment intent
        const { data: intentData, error: intentError } = await supabaseClient.functions.invoke('create-payment-intent', {
            body: {
                amount: Math.round(finalAmount * 100), // Convert to cents - INCLUDES FEE
                customer_id: customerData.id,
                rental_id: rentalData.id,
                customer_email: customerData.email,
                customer_name: customerData.full_name || 'Customer',
                payment_type: selectedPaymentType,
                base_amount: paymentAmount,
                processing_fee: fee
            }
        });
        
        if (intentError || !intentData.clientSecret) {
            throw new Error('Failed to create payment intent');
        }
        
        // Confirm payment
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
            throw stripeError;
        }
        
        if (paymentIntent.status === 'succeeded') {
            // Record payment in database
            await recordPayment(finalAmount, 'stripe', paymentIntent.id);
            showSuccess(finalAmount, 'Credit Card');
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
// RECORD PAYMENT
// ============================================================================

async function recordPayment(amount, method, transactionId = null) {
    try {
        const { data, error } = await supabaseClient
            .from('payments')
            .insert({
                rental_id: rentalData.id,
                customer_id: customerData.id,
                paid_amount: amount,
                paid_date: new Date().toISOString().split('T')[0],
                payment_method: method,
                transaction_id: transactionId,
                payment_status: 'confirmed',
                notes: `Payment via ${method}. Base: ${formatCurrency(paymentAmount)}, Fee: ${formatCurrency(amount - paymentAmount)}`
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error recording payment:', error);
        } else {
            console.log('✅ Payment recorded:', data);
        }
        
        return data;
    } catch (err) {
        console.error('Error recording payment:', err);
    }
}

// ============================================================================
// SUCCESS
// ============================================================================

function showSuccess(amount, method) {
    hideLoading();
    
    // Hide all payment sections
    document.getElementById('paymentSection').classList.add('hidden');
    document.getElementById('zellePaymentSection').classList.add('hidden');
    document.getElementById('cashappPaymentSection').classList.add('hidden');
    document.getElementById('cardPaymentSection').classList.add('hidden');
    
    // Show success
    const successSection = document.getElementById('successSection');
    successSection.classList.remove('hidden');
    
    // Update success details
    document.getElementById('successAmount').textContent = formatCurrency(amount);
    document.getElementById('successDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('successMethod').textContent = method;
    
    // Calculate next payment date (7 days from now)
    const nextPayment = new Date();
    nextPayment.setDate(nextPayment.getDate() + 7);
    document.getElementById('successNextDue').textContent = nextPayment.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// NAVIGATION
// ============================================================================

function goBackToMethodSelection() {
    // Hide all payment method sections
    document.getElementById('zellePaymentSection').classList.add('hidden');
    document.getElementById('cashappPaymentSection').classList.add('hidden');
    document.getElementById('cardPaymentSection').classList.add('hidden');
    
    // Show main payment section
    paymentSection.classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make functions globally accessible
window.selectPaymentType = selectPaymentType;
window.updateCustomAmount = updateCustomAmount;
window.selectPaymentMethod = selectPaymentMethod;
window.continueToPayment = continueToPayment;
window.goBackToMethodSelection = goBackToMethodSelection;
window.copyZelleEmail = copyZelleEmail;
