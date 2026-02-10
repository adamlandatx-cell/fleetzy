/* ============================================
   FLEETZY ADMIN - PAYMENTS MODULE
   Full payment management with approval workflows
   TIMEZONE FIX: Jan 18, 2025 - Fixed date calculations
   ============================================ */

/**
 * Format a Date object to YYYY-MM-DD string in LOCAL time
 * This ensures the date stored matches the actual local date
 */
function formatLocalDateForPayments(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const Payments = {
    // Cached data
    data: [],
    filtered: [],
    isLoading: false,  // Prevent multiple simultaneous loads
    
    /**
     * Initialize payments tab
     */
    async init() {
        console.log('💳 Initializing Payments module...');
        await this.load();
        this.setupEventListeners();
    },
    
    /**
     * Load payments from Supabase with customer and rental data
     */
    async load() {
        // Prevent multiple simultaneous loads (fixes flickering)
        if (this.isLoading) {
            console.log('⏳ Load already in progress, skipping...');
            return;
        }
        this.isLoading = true;
        
        try {
            // Load payments with related data - using full_name (not first_name/last_name)
            const { data: payments, error } = await db
                .from('payments')
                .select(`
                    *,
                    customer:customer_id(id, customer_id, full_name, phone, email, selfie_url),
                    rental:rental_id(id, rental_id, weekly_rate, vehicle_id, start_date)
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.data = payments || [];
            this.filtered = [...this.data];
            this.render();
            this.updateStats();
            this.updateSidebarBadge();
            
            console.log(`✅ Loaded ${this.data.length} payments`);
        } catch (error) {
            console.error('❌ Error loading payments:', error);
            Utils.toastError('Failed to load payments');
        } finally {
            this.isLoading = false;  // Reset loading flag
        }
    },
    
    /**
     * Refresh data
     */
    async refresh() {
        const refreshBtn = document.querySelector('#section-payments .btn-secondary');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
        }
        
        await this.load();
        
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            refreshBtn.disabled = false;
        }
        
        Utils.toastSuccess('Payments refreshed');
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('payments-search');
        if (searchInput) {
            let debounceTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => this.filter(), 300);
            });
        }
    },
    
    /**
     * Filter payments based on search and filters
     */
    filter() {
        const search = document.getElementById('payments-search')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('payments-status-filter')?.value || '';
        const methodFilter = document.getElementById('payments-method-filter')?.value || '';
        
        this.filtered = this.data.filter(payment => {
            // Search filter - customer name, rental ID, payment ID
            const customerName = payment.customer?.full_name?.toLowerCase() || '';
            const rentalId = payment.rental?.rental_id?.toLowerCase() || '';
            const paymentId = payment.payment_id?.toLowerCase() || '';
            const matchesSearch = !search || 
                customerName.includes(search) || 
                rentalId.includes(search) ||
                paymentId.includes(search);
            
            // Status filter
            const matchesStatus = !statusFilter || 
                (payment.payment_status || 'Pending').toLowerCase() === statusFilter.toLowerCase();
            
            // Method filter
            const matchesMethod = !methodFilter || 
                (payment.payment_method || '').toLowerCase() === methodFilter.toLowerCase();
            
            return matchesSearch && matchesStatus && matchesMethod;
        });
        
        this.render();
    },
    
    /**
     * Update stats in the header
     */
    updateStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // This Month (paid/confirmed payments)
        const thisMonth = this.data.filter(p => {
            const paidDate = new Date(p.paid_date);
            const status = (p.payment_status || '').toLowerCase();
            // Accept both 'paid' and 'confirmed' as valid completed payment statuses
            const isCompleted = status === 'paid' || status === 'confirmed';
            return paidDate >= startOfMonth && isCompleted;
        });
        const thisMonthTotal = thisMonth.reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0);
        
        // Pending Approval
        const pendingCount = this.data.filter(p => 
            (p.payment_status || 'Pending').toLowerCase() === 'pending'
        ).length;
        
        // Overdue - calculate from rentals that have overdue payments
        let overdueAmount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // We need to calculate overdue from rentals data
        // For now, sum late fees from payments
        const overduePayments = this.data.filter(p => p.is_late);
        overdueAmount = overduePayments.reduce((sum, p) => sum + (parseFloat(p.late_fee_charged) || 0), 0);
        
        // Total payments this month
        const paymentsCount = thisMonth.length;
        
        // Update DOM
        const statThisMonth = document.getElementById('payments-stat-thismonth');
        const statPending = document.getElementById('payments-stat-pending');
        const statOverdue = document.getElementById('payments-stat-overdue');
        const statCount = document.getElementById('payments-stat-count');
        
        if (statThisMonth) statThisMonth.textContent = Utils.formatCurrency(thisMonthTotal);
        if (statPending) statPending.textContent = pendingCount;
        if (statOverdue) statOverdue.textContent = Utils.formatCurrency(overdueAmount);
        if (statCount) statCount.textContent = paymentsCount;
    },
    
    /**
     * Update sidebar badge with pending count
     */
    updateSidebarBadge() {
        const pendingCount = this.data.filter(p => 
            (p.payment_status || 'Pending').toLowerCase() === 'pending'
        ).length;
        
        // Use Sidebar badge manager if available
        if (typeof Sidebar !== 'undefined') {
            Sidebar.updateBadge('payments', pendingCount);
        }
        
        // Also update the direct badge element as fallback
        const badge = document.getElementById('payments-badge');
        if (badge) {
            if (pendingCount > 0) {
                badge.textContent = pendingCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },
    
    /**
     * Render payments table
     */
    render() {
        const tbody = document.getElementById('payments-table-body');
        if (!tbody) return;
        
        if (this.filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No payments found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filtered.map(payment => this.renderRow(payment)).join('');
    },
    
    /**
     * Render a single payment row
     */
    renderRow(payment) {
        const customer = payment.customer;
        const rental = payment.rental;
        const status = payment.payment_status || 'Pending';
        const method = payment.payment_method || 'Unknown';
        
        // Normalize status display text (capitalize first letter, show "Paid" for both "paid" and "confirmed")
        const normalizedStatus = status.toLowerCase();
        const displayStatus = (normalizedStatus === 'paid' || normalizedStatus === 'confirmed') 
            ? 'Paid' 
            : status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
        
        // Default avatar as data URI (no external file needed)
        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23374151'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%236B7280'/%3E%3Cpath d='M6 36c0-8 6-12 14-12s14 4 14 12' fill='%236B7280'/%3E%3C/svg%3E";
        
        // Customer cell - using full_name
        const customerName = customer?.full_name || 'Unknown Customer';
        const customerPhoto = customer?.selfie_url || defaultAvatar;
        const customerId = customer?.customer_id || '—';
        
        // Rental reference
        const rentalId = rental?.rental_id || '—';
        
        // Format amount
        const amount = Utils.formatCurrency(payment.paid_amount || 0);
        
        // Format date
        const paidDate = payment.paid_date 
            ? new Date(payment.paid_date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            })
            : '—';
        
        // Status badge
        const statusClass = this.getStatusClass(status);
        
        // Method badge
        const methodBadge = this.getMethodBadge(method);
        
        // Screenshot preview
        const screenshotPreview = payment.payment_screenshot_url
            ? `<button class="btn-icon" onclick="Payments.viewScreenshot('${payment.id}')" title="View Screenshot">
                   <i class="fas fa-image"></i>
               </button>`
            : '';
        
        // Late indicator
        const lateIndicator = payment.is_late 
            ? `<span class="late-indicator" title="${payment.days_late || 0} days late">
                   <i class="fas fa-exclamation-triangle"></i>
               </span>`
            : '';
        
        // Action buttons based on status
        const actions = this.getActionButtons(payment, status);
        
        return `
            <tr data-id="${payment.id}">
                <td>
                    <div class="customer-cell">
                        <img src="${customerPhoto}" alt="${customerName}" class="customer-avatar" 
                             onerror="this.onerror=null; this.src='${defaultAvatar}'">
                        <div class="customer-info">
                            <div class="customer-name">${customerName}</div>
                            <div class="customer-id">${customerId}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="rental-ref">${rentalId}</span>
                </td>
                <td>
                    <div class="amount-cell">
                        <span class="amount-value">${amount}</span>
                        ${lateIndicator}
                    </div>
                </td>
                <td>
                    ${methodBadge}
                </td>
                <td>${paidDate}</td>
                <td>
                    <span class="status-badge ${statusClass}">${displayStatus}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${screenshotPreview}
                        ${actions}
                    </div>
                </td>
            </tr>
        `;
    },
    
    /**
     * Get status CSS class
     */
    getStatusClass(status) {
        const classes = {
            'pending': 'status-payment-pending',
            'confirmed': 'status-payment-confirmed',
            'approved': 'status-payment-confirmed',
            'paid': 'status-payment-confirmed',
            'failed': 'status-payment-failed',
            'rejected': 'status-payment-failed'
        };
        return classes[status.toLowerCase()] || 'status-unknown';
    },
    
    /**
     * Get payment method badge HTML
     */
    getMethodBadge(method) {
        const normalizedMethod = (method || 'unknown').toLowerCase();
        
        const icons = {
            'zelle': '<i class="fas fa-bolt"></i>',
            'cashapp': '<i class="fas fa-dollar-sign"></i>',
            'venmo': '<i class="fas fa-v"></i>',
            'paypal': '<i class="fab fa-paypal"></i>',
            'stripe': '<i class="fab fa-stripe-s"></i>',
            'cash': '<i class="fas fa-money-bill"></i>',
            'check': '<i class="fas fa-money-check"></i>',
            'card': '<i class="fas fa-credit-card"></i>',
            'other': '<i class="fas fa-ellipsis-h"></i>',
            'unknown': '<i class="fas fa-question"></i>'
        };
        
        const icon = icons[normalizedMethod] || icons['unknown'];
        
        return `
            <span class="method-badge method-${normalizedMethod}">
                ${icon}
                <span>${method}</span>
            </span>
        `;
    },
    
    /**
     * Get action buttons based on payment status
     */
    getActionButtons(payment, status) {
        const normalizedStatus = status.toLowerCase();
        
        if (normalizedStatus === 'pending') {
            return `
                <button class="btn-icon success" onclick="Payments.approve('${payment.id}')" title="Approve Payment">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-icon danger" onclick="Payments.openRejectModal('${payment.id}')" title="Reject Payment">
                    <i class="fas fa-times"></i>
                </button>
                <button class="btn-icon" onclick="Payments.edit('${payment.id}')" title="Edit Payment">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="Payments.view('${payment.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;
        }
        
        return `
            <button class="btn-icon" onclick="Payments.edit('${payment.id}')" title="Edit Payment">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon" onclick="Payments.view('${payment.id}')" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        `;
    },
    
    /**
     * View payment details
     */
async view(paymentId) {
    const payment = this.data.find(p => p.id === paymentId);
    if (!payment) {
        Utils.toastError('Payment not found');
        return;
    }

    const customer = payment.customer;
    const rental = payment.rental;
    const status = payment.payment_status || 'Pending';
    const statusClass = this.getStatusClass(status);

    const content = document.getElementById('view-payment-content');
    if (!content) return;

    // Load rental charges for this payment
    let rentalCharges = [];
    let appliedCharges = [];
    let rentalData = null;
    
    if (payment.rental_id) {
        try {
            // Load rental data
            const { data: rentals } = await db
                .from('rentals')
                .select('*')
                .eq('id', payment.rental_id)
                .single();
            
            rentalData = rentals;
            
            // Load all charges for this rental
            const { data: charges } = await db
                .from('rental_charges')
                .select('*')
                .eq('rental_id', payment.rental_id)
                .order('charge_date', { ascending: true });
            
            rentalCharges = charges || [];
            
            // Filter charges applied to THIS payment
            appliedCharges = rentalCharges.filter(c => c.applied_to_payment_id === payment.id);
            
        } catch (error) {
            console.error('Error loading charges:', error);
        }
    }

    // Format dates
    const paidDate = payment.paid_date 
        ? new Date(payment.paid_date).toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        })
        : '—';
    
    const dueDate = payment.due_date 
        ? new Date(payment.due_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        })
        : '—';
    
    const approvedAt = payment.approved_at
        ? new Date(payment.approved_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })
        : '—';

    // Calculate late fee if payment is late and fee not set
    let calculatedLateFee = 0;
    let daysLate = 0;
    
    if (payment.paid_date && payment.due_date) {
        const paidDateObj = new Date(payment.paid_date);
        const dueDateObj = new Date(payment.due_date);
        
        if (paidDateObj > dueDateObj) {
            const diffTime = Math.abs(paidDateObj - dueDateObj);
            daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Check if there's already a late fee charge
            const existingLateFee = rentalCharges.find(c => 
                c.charge_type === 'late_fee' && 
                c.applied_to_payment_id === payment.id
            );
            
            if (!existingLateFee && daysLate > 0) {
                // Calculate late fee: $50 first day + $10/day after
                calculatedLateFee = this.calculateLateFee(daysLate);
            } else if (existingLateFee) {
                calculatedLateFee = parseFloat(existingLateFee.amount) || 0;
            }
        }
    }

    // Screenshot section
    const screenshotSection = payment.payment_screenshot_url
        ? `
            <div class="detail-section full-width">
                <h4><i class="fas fa-image"></i> Payment Screenshot</h4>
                <div class="screenshot-preview">
                    <img src="${payment.payment_screenshot_url}" alt="Payment Screenshot" 
                         onclick="Payments.openScreenshotFullscreen('${payment.payment_screenshot_url}')"
                         onerror="this.parentElement.innerHTML='<p class=\\'text-secondary\\'>Screenshot unavailable</p>'">
                    <p class="screenshot-hint">Click to enlarge</p>
                </div>
            </div>
        `
        : '';

    // Itemized Charges Section - THE KEY FIX
    let chargesSection = '';
    if (appliedCharges.length > 0 || status.toLowerCase() === 'pending') {
        const chargesList = appliedCharges.map(charge => {
            const chargeDate = new Date(charge.charge_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
            
            return `
                <div class="charge-item">
                    <div class="charge-header">
                        <span class="charge-type">${this.formatChargeType(charge.charge_type)}</span>
                        <span class="charge-amount">${Utils.formatCurrency(charge.amount)}</span>
                    </div>
                    <div class="charge-details">
                        <span class="charge-date">${chargeDate}</span>
                        ${charge.description ? `<span class="charge-desc">${charge.description}</span>` : ''}
                        <span class="charge-status status-${charge.status}">${charge.status}</span>
                    </div>
                    ${status.toLowerCase() === 'pending' ? `
                        <button class="btn-icon-sm text-danger" 
                                onclick="Payments.removeCharge('${charge.id}')"
                                title="Remove charge">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');

        const subtotal = appliedCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        
        chargesSection = `
            <div class="detail-section full-width charges-breakdown">
                <div class="charges-header">
                    <h4><i class="fas fa-list-ul"></i> Itemized Charges</h4>
                    ${status.toLowerCase() === 'pending' ? `
                        <button class="btn btn-sm btn-secondary" 
                                onclick="Payments.addCharge('${payment.id}')">
                            <i class="fas fa-plus"></i> Add Charge
                        </button>
                    ` : ''}
                </div>
                
                <div class="charges-list">
                    ${chargesList || '<p class="text-secondary">No itemized charges yet</p>'}
                </div>
                
                ${appliedCharges.length > 0 ? `
                    <div class="charges-summary">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span>${Utils.formatCurrency(subtotal)}</span>
                        </div>
                        ${calculatedLateFee > 0 ? `
                            <div class="summary-row late-fee">
                                <span>Late Fee (${daysLate} day${daysLate > 1 ? 's' : ''} late):</span>
                                <span>${Utils.formatCurrency(calculatedLateFee)}</span>
                            </div>
                        ` : ''}
                        <div class="summary-row total">
                            <span>Total Due:</span>
                            <span>${Utils.formatCurrency(subtotal + calculatedLateFee)}</span>
                        </div>
                        <div class="summary-row paid">
                            <span>Amount Paid:</span>
                            <span>${Utils.formatCurrency(payment.paid_amount || 0)}</span>
                        </div>
                        <div class="summary-row balance ${(subtotal + calculatedLateFee - (payment.paid_amount || 0)) > 0 ? 'text-danger' : 'text-success'}">
                            <span>Balance:</span>
                            <span>${Utils.formatCurrency(subtotal + calculatedLateFee - (payment.paid_amount || 0))}</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Late payment warning
    const lateSection = (daysLate > 0 || calculatedLateFee > 0)
        ? `
            <div class="detail-section full-width late-alert">
                <h4><i class="fas fa-exclamation-triangle"></i> Late Payment</h4>
                <div class="detail-row">
                    <span class="detail-label">Days Late</span>
                    <span class="detail-value text-warning">${daysLate} days</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Late Fee</span>
                    <span class="detail-value text-warning">${Utils.formatCurrency(calculatedLateFee)}</span>
                </div>
                ${status.toLowerCase() === 'pending' && calculatedLateFee > 0 && !rentalCharges.find(c => c.charge_type === 'late_fee') ? `
                    <div class="late-fee-action">
                        <button class="btn btn-sm btn-warning" 
                                onclick="Payments.addLateFee('${payment.id}', ${calculatedLateFee}, ${daysLate})">
                            <i class="fas fa-plus"></i> Add Late Fee to Charges
                        </button>
                    </div>
                ` : ''}
            </div>
        `
        : '';

    // Approval section
    const approvalSection = status.toLowerCase() === 'confirmed' || status.toLowerCase() === 'approved'
        ? `
            <div class="detail-section full-width">
                <h4><i class="fas fa-check-circle"></i> Approval Information</h4>
                <div class="detail-row">
                    <span class="detail-label">Approved By</span>
                    <span class="detail-value">${payment.approved_by || 'System'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Approved At</span>
                    <span class="detail-value">${approvedAt}</span>
                </div>
            </div>
        `
        : '';

    // Notes section
    const notesSection = payment.notes
        ? `
            <div class="detail-section full-width">
                <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                <p class="notes-text">${payment.notes}</p>
            </div>
        `
        : '';

    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-section">
                <h4><i class="fas fa-receipt"></i> Payment Information</h4>
                <div class="detail-row">
                    <span class="detail-label">Payment ID</span>
                    <span class="detail-value">${payment.payment_id || '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">
                        <span class="status-badge ${statusClass}">${status}</span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Method</span>
                    <span class="detail-value">${payment.payment_method || '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Paid Date</span>
                    <span class="detail-value">${paidDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Due Date</span>
                    <span class="detail-value">${dueDate}</span>
                </div>
                ${payment.transaction_id ? `
                    <div class="detail-row">
                        <span class="detail-label">Transaction ID</span>
                        <span class="detail-value">${payment.transaction_id}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> Customer</h4>
                <div class="detail-row">
                    <span class="detail-label">Name</span>
                    <span class="detail-value">${customer?.full_name || '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Customer ID</span>
                    <span class="detail-value">${customer?.customer_id || '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone</span>
                    <span class="detail-value">${customer?.phone || '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${customer?.email || '—'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Rental ID</span>
                    <span class="detail-value">${rental?.rental_id || '—'}</span>
                </div>
            </div>
            
            ${chargesSection}
            ${screenshotSection}
            ${lateSection}
            ${approvalSection}
            ${notesSection}
        </div>
    `;

    // Store current payment ID for modal actions
    this.currentPaymentId = paymentId;
    this.currentPaymentData = {
        payment,
        rental: rentalData,
        charges: rentalCharges,
        appliedCharges,
        calculatedLateFee,
        daysLate
    };

    // Update modal footer buttons based on status
    const modalFooter = document.querySelector('#modal-view-payment .modal-footer');
    if (modalFooter && status.toLowerCase() === 'pending') {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="Payments.closeViewModal()">Close</button>
            <button class="btn btn-danger" onclick="Payments.closeViewModal(); Payments.openRejectModal('${paymentId}')">
                <i class="fas fa-times"></i> Reject
            </button>
            <button class="btn btn-success" onclick="Payments.approveFromModal()">
                <i class="fas fa-check"></i> Approve
            </button>
        `;
    } else {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="Payments.closeViewModal()">Close</button>
        `;
    }

    // Show modal
    document.getElementById('modal-view-payment').classList.add('active');
},
/**
 * Format charge type for display
 */
formatChargeType(type) {
    const types = {
        'weekly_rent': 'Weekly Rent',
        'toll': 'Toll',
        'late_fee': 'Late Fee',
        'damage': 'Damage Fee',
        'cleaning': 'Cleaning Fee',
        'fuel': 'Fuel Charge',
        'other': 'Other'
    };
    return types[type] || type;
},

/**
 * Add late fee charge to rental
 */
async addLateFee(paymentId, amount, daysLate) {
    try {
        const payment = this.data.find(p => p.id === paymentId);
        if (!payment || !payment.rental_id) {
            Utils.toastError('Cannot add late fee - rental not found');
            return;
        }

        // Create late fee charge
        const { data, error } = await db
            .from('rental_charges')
            .insert({
                rental_id: payment.rental_id,
                charge_type: 'late_fee',
                description: `Late fee - ${daysLate} days overdue`,
                amount: amount,
                charge_date: payment.paid_date || new Date().toISOString().split('T')[0],
                status: 'pending',
                notes: `Auto-generated late fee for payment ${payment.payment_id}`
            })
            .select()
            .single();

        if (error) throw error;

        Utils.toastSuccess('Late fee added to charges');
        
        // Reload the modal to show updated charges
        await this.view(paymentId);

    } catch (error) {
        console.error('Error adding late fee:', error);
        Utils.toastError('Failed to add late fee');
    }
},

/**
 * Add custom charge to payment
 */
async addCharge(paymentId) {
    // Show a quick modal for adding charges
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'modal-quick-charge';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="document.getElementById('modal-quick-charge').remove()"></div>
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-plus"></i> Add Charge</h3>
                <button class="modal-close" onclick="document.getElementById('modal-quick-charge').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Charge Type</label>
                    <select id="quick-charge-type" class="form-control">
                        <option value="toll">Toll</option>
                        <option value="damage">Damage Fee</option>
                        <option value="cleaning">Cleaning Fee</option>
                        <option value="fuel">Fuel Charge</option>
                        <option value="late_fee">Late Fee</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" id="quick-charge-amount" class="form-control" 
                           placeholder="0.00" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" id="quick-charge-desc" class="form-control" 
                           placeholder="Brief description">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="quick-charge-date" class="form-control" 
                           value="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" 
                        onclick="document.getElementById('modal-quick-charge').remove()">
                    Cancel
                </button>
                <button class="btn btn-primary" onclick="Payments.submitQuickCharge('${paymentId}')">
                    <i class="fas fa-plus"></i> Add Charge
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
},

/**
 * Submit quick charge
 */
async submitQuickCharge(paymentId) {
    try {
        const type = document.getElementById('quick-charge-type').value;
        const amount = parseFloat(document.getElementById('quick-charge-amount').value);
        const description = document.getElementById('quick-charge-desc').value;
        const date = document.getElementById('quick-charge-date').value;

        if (!amount || amount <= 0) {
            Utils.toastError('Please enter a valid amount');
            return;
        }

        const payment = this.data.find(p => p.id === paymentId);
        if (!payment || !payment.rental_id) {
            Utils.toastError('Rental not found');
            return;
        }

        // Create charge
        const { error } = await db
            .from('rental_charges')
            .insert({
                rental_id: payment.rental_id,
                charge_type: type,
                description: description || this.formatChargeType(type),
                amount: amount,
                charge_date: date,
                status: 'pending'
            });

        if (error) throw error;

        // Close quick charge modal
        document.getElementById('modal-quick-charge').remove();

        Utils.toastSuccess('Charge added');
        
        // Reload payment modal
        await this.view(paymentId);

    } catch (error) {
        console.error('Error adding charge:', error);
        Utils.toastError('Failed to add charge');
    }
},

/**
 * Remove charge from payment
 */
async removeCharge(chargeId) {
    if (!confirm('Remove this charge? This cannot be undone.')) {
        return;
    }

    try {
        const { error } = await db
            .from('rental_charges')
            .delete()
            .eq('id', chargeId);

        if (error) throw error;

        Utils.toastSuccess('Charge removed');
        
        // Reload modal
        if (this.currentPaymentId) {
            await this.view(this.currentPaymentId);
        }

    } catch (error) {
        console.error('Error removing charge:', error);
        Utils.toastError('Failed to remove charge');
    }
},
    
    /**
     * Close view modal
     */
    closeViewModal() {
        document.getElementById('modal-view-payment').classList.remove('active');
        this.currentPaymentId = null;
    },
    
    /**
     * View screenshot in table
     */
    viewScreenshot(paymentId) {
        const payment = this.data.find(p => p.id === paymentId);
        if (!payment || !payment.payment_screenshot_url) {
            Utils.toastError('Screenshot not available');
            return;
        }
        
        this.openScreenshotFullscreen(payment.payment_screenshot_url);
    },
    
    /**
     * Open screenshot in fullscreen modal
     */
    openScreenshotFullscreen(url) {
        const modal = document.getElementById('modal-screenshot');
        const img = document.getElementById('screenshot-fullscreen-img');
        
        if (modal && img) {
            img.src = url;
            modal.classList.add('active');
        }
    },
    
    /**
     * Close screenshot modal
     */
    closeScreenshotModal() {
        const modal = document.getElementById('modal-screenshot');
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    /**
     * Edit payment
     */
    edit(paymentId) {
        const payment = this.data.find(p => p.id === paymentId);
        if (!payment) {
            Utils.toastError('Payment not found');
            return;
        }
        
        // Store current payment for saving
        this.editingPayment = payment;
        
        const content = document.getElementById('edit-payment-content');
        if (!content) {
            // Create the modal if it doesn't exist
            this.createEditModal();
        }
        
        const modal = document.getElementById('modal-edit-payment');
        const editContent = document.getElementById('edit-payment-content');
        
        if (!modal || !editContent) {
            Utils.toastError('Edit modal not available');
            return;
        }
        
        // Format date for input (YYYY-MM-DD)
        const paidDate = payment.paid_date ? payment.paid_date.split('T')[0] : '';
        
        // Build edit form
        editContent.innerHTML = `
            <form id="edit-payment-form" onsubmit="Payments.saveEdit(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="edit-payment-amount">Amount <span class="required">*</span></label>
                        <input type="number" id="edit-payment-amount" step="0.01" min="0" 
                               value="${payment.paid_amount || ''}" required placeholder="Enter amount">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-payment-date">Payment Date <span class="required">*</span></label>
                        <input type="date" id="edit-payment-date" value="${paidDate}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-payment-method">Payment Method</label>
                        <select id="edit-payment-method">
                            <option value="Zelle" ${payment.payment_method === 'Zelle' ? 'selected' : ''}>Zelle</option>
                            <option value="CashApp" ${payment.payment_method === 'CashApp' ? 'selected' : ''}>CashApp</option>
                            <option value="Venmo" ${payment.payment_method === 'Venmo' ? 'selected' : ''}>Venmo</option>
                            <option value="PayPal" ${payment.payment_method === 'PayPal' ? 'selected' : ''}>PayPal</option>
                            <option value="Stripe" ${payment.payment_method === 'Stripe' ? 'selected' : ''}>Stripe (Card)</option>
                            <option value="Cash" ${payment.payment_method === 'Cash' ? 'selected' : ''}>Cash</option>
                            <option value="Check" ${payment.payment_method === 'Check' ? 'selected' : ''}>Check</option>
                            <option value="Other" ${payment.payment_method === 'Other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-payment-status">Status</label>
                        <select id="edit-payment-status">
                            <option value="pending" ${(payment.payment_status || '').toLowerCase() === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${(payment.payment_status || '').toLowerCase() === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="rejected" ${(payment.payment_status || '').toLowerCase() === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="edit-payment-notes">Notes</label>
                        <textarea id="edit-payment-notes" rows="3" placeholder="Optional notes...">${payment.notes || ''}</textarea>
                    </div>
                </div>
            </form>
        `;
        
        modal.classList.add('active');
    },
    
    /**
     * Create edit payment modal dynamically
     */
    createEditModal() {
        const existingModal = document.getElementById('modal-edit-payment');
        if (existingModal) return;
        
        const modalHTML = `
            <div id="modal-edit-payment" class="modal">
                <div class="modal-backdrop" onclick="Payments.closeEditModal()"></div>
                <div class="modal-content modal-sm">
                    <div class="modal-header">
                        <h3><i class="fas fa-edit"></i> Edit Payment</h3>
                        <button class="modal-close" onclick="Payments.closeEditModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="edit-payment-content">
                        <!-- Form content injected by edit() -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="Payments.closeEditModal()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="Payments.saveEdit(event)">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    /**
     * Close edit modal
     */
    closeEditModal() {
        const modal = document.getElementById('modal-edit-payment');
        if (modal) {
            modal.classList.remove('active');
        }
        this.editingPayment = null;
    },
    
    /**
     * Save payment edits
     */
    async saveEdit(event) {
        event.preventDefault();
        
        if (!this.editingPayment) {
            Utils.toastError('No payment selected for editing');
            return;
        }
        
        const amount = parseFloat(document.getElementById('edit-payment-amount').value);
        const paidDate = document.getElementById('edit-payment-date').value;
        const method = document.getElementById('edit-payment-method').value;
        const status = document.getElementById('edit-payment-status').value;
        const notes = document.getElementById('edit-payment-notes').value.trim();
        
        if (!amount || amount <= 0) {
            Utils.toastError('Please enter a valid amount');
            return;
        }
        
        if (!paidDate) {
            Utils.toastError('Please enter a payment date');
            return;
        }
        
        const oldAmount = parseFloat(this.editingPayment.paid_amount) || 0;
        const amountDiff = amount - oldAmount;
        
        // Recalculate late status based on new paid_date vs due_date
        let isLate = false;
        let daysLate = 0;
        
        if (this.editingPayment.due_date && paidDate) {
            const dueDate = new Date(this.editingPayment.due_date + 'T00:00:00');
            const paidDateObj = new Date(paidDate + 'T00:00:00');
            
            if (paidDateObj > dueDate) {
                isLate = true;
                daysLate = Math.floor((paidDateObj - dueDate) / (1000 * 60 * 60 * 24));
            }
        }
        
        try {
            // Update payment record including late status
            const { error: updateError } = await db
                .from('payments')
                .update({
                    paid_amount: amount,
                    paid_date: paidDate,
                    payment_method: method,
                    payment_status: status,
                    notes: notes,
                    is_late: isLate,
                    days_late: daysLate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.editingPayment.id);
            
            if (updateError) throw updateError;
            
            // If amount changed and payment is confirmed, update rental totals
            if (amountDiff !== 0 && this.editingPayment.rental_id && 
                (status.toLowerCase() === 'confirmed' || this.editingPayment.payment_status?.toLowerCase() === 'confirmed')) {
                await this.adjustRentalForPaymentEdit(this.editingPayment.rental_id, amountDiff);
            }
            
            Utils.toastSuccess('Payment updated successfully');
            this.closeEditModal();
            await this.load(); // Refresh data
            
        } catch (error) {
            console.error('Error updating payment:', error);
            Utils.toastError('Failed to update payment');
        }
    },
    
    /**
     * Adjust rental totals when a payment amount is edited
     */
    async adjustRentalForPaymentEdit(rentalId, amountDiff) {
        try {
            // Get current rental
            const { data: rental, error: fetchError } = await db
                .from('rentals')
                .select('*')
                .eq('id', rentalId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // Adjust totals
            const currentPaid = parseFloat(rental.total_amount_paid) || 0;
            const newPaid = currentPaid + amountDiff;
            const totalDue = parseFloat(rental.total_amount_due) || 0;
            
            // Exclude deposit from balance calculation
            const depositAmount = parseFloat(rental.deposit_included || rental.deposit_amount) || 0;
            const rentPaid = newPaid - depositAmount;
            const newBalance = totalDue - rentPaid;
            
            // Update rental
            const { error: updateError } = await db
                .from('rentals')
                .update({
                    total_amount_paid: newPaid,
                    balance_remaining: Math.max(0, newBalance),
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (updateError) throw updateError;
            
            console.log(`✅ Adjusted rental ${rentalId}: paid changed by $${amountDiff}, new balance=$${newBalance}`);
            
        } catch (error) {
            console.error('Error adjusting rental for payment edit:', error);
            // Don't throw - payment was saved, just log the error
        }
    },

    /**
     * Calculate late fee based on days late
     * Formula: $50 flat on day 1, then +$10 per additional day
     * Day 1 = $50, Day 2 = $60, Day 3 = $70, etc.
     */
    calculateLateFee(daysLate) {
        if (daysLate <= 0) return 0;
        return 50 + (Math.max(0, daysLate - 1) * 10);
    },

    /**
     * Calculate days late between due date and paid date
     */
    calculateDaysLate(dueDate, paidDate) {
        if (!dueDate || !paidDate) return 0;
        
        // Parse dates carefully to avoid timezone issues
        const due = new Date(dueDate + 'T00:00:00');
        const paid = new Date(paidDate);
        paid.setHours(0, 0, 0, 0);
        
        const diffTime = paid - due;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays);
    },

    /**
     * Approve payment with late fee calculation and activity logging
     */
    async approve(paymentId) {
        const payment = this.data.find(p => p.id === paymentId);
        if (!payment) {
            Utils.toastError('Payment not found');
            return;
        }
        
        // Confirm action
        const customerName = payment.customer?.full_name || 'Unknown';
        const amount = Utils.formatCurrency(payment.paid_amount || 0);
        
        // Calculate if payment is late
        const daysLate = this.calculateDaysLate(payment.due_date, payment.paid_date);
        const isLate = daysLate > 0;
        const lateFee = this.calculateLateFee(daysLate);
        
        // Build confirmation message
        let confirmMsg = `Approve payment of ${amount} from ${customerName}?`;
        if (isLate) {
            confirmMsg += `\n\n⚠️ LATE PAYMENT: ${daysLate} day${daysLate > 1 ? 's' : ''} late`;
            confirmMsg += `\n💰 Auto Late Fee: ${Utils.formatCurrency(lateFee)}`;
            confirmMsg += `\n(Formula: $50 + $10/day after day 1)`;
        }
        
        if (!confirm(confirmMsg)) {
            return;
        }
        
        try {
            // Update payment status with late info
            const paymentUpdate = {
                payment_status: 'confirmed',
                approved_by: 'Admin',
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_late: isLate,
                days_late: daysLate,
                late_fees: lateFee
            };

            const { error: paymentError } = await db
                .from('payments')
                .update(paymentUpdate)
                .eq('id', paymentId);
            
            if (paymentError) throw paymentError;
            
            // If late, create late fee charge in rental_charges
            if (isLate && lateFee > 0 && payment.rental_id) {
                await this.createLateFeeCharge(payment, daysLate, lateFee);
            }
            
            // Mark any pending charges for this rental as applied to this payment
            if (payment.rental_id) {
                const { error: chargesError } = await db
                    .from('rental_charges')
                    .update({
                        status: 'applied',
                        applied_to_payment_id: paymentId,
                        applied_at: new Date().toISOString()
                    })
                    .eq('rental_id', payment.rental_id)
                    .eq('status', 'pending')
                    .neq('charge_type', 'late_fee'); // Don't auto-apply the fee we just created
                
                if (chargesError) {
                    console.warn('Could not update charges:', chargesError);
                }
            }
            
            // Update rental totals if we have a rental
            if (payment.rental_id) {
                await this.updateRentalAfterPayment(payment.rental_id, payment.paid_amount, payment.paid_date);
            }
            
            // Update customer stats and log activity
            await this.updateCustomerAfterPayment(payment, isLate, daysLate, lateFee);
            
            // Show success message
            if (isLate) {
                Utils.toastSuccess(`Payment approved. Late fee of ${Utils.formatCurrency(lateFee)} added.`);
            } else {
                Utils.toastSuccess('Payment approved successfully');
            }
            
            await this.load(); // Refresh data
            
        } catch (error) {
            console.error('Error approving payment:', error);
            Utils.toastError('Failed to approve payment');
        }
    },

    /**
     * Create late fee charge in rental_charges table
     */
    async createLateFeeCharge(payment, daysLate, lateFee) {
        try {
            // Generate charge ID
            const { data: existingCharges } = await db
                .from('rental_charges')
                .select('charge_id')
                .order('created_at', { ascending: false })
                .limit(1);
            
            let nextNum = 1;
            if (existingCharges && existingCharges.length > 0 && existingCharges[0].charge_id) {
                const match = existingCharges[0].charge_id.match(/CHG-(\d+)/);
                if (match) nextNum = parseInt(match[1]) + 1;
            }
            const chargeId = `CHG-${String(nextNum).padStart(4, '0')}`;
            
            const chargeRecord = {
                charge_id: chargeId,
                rental_id: payment.rental_id,
                customer_id: payment.customer_id,
                charge_type: 'late_fee',
                amount: lateFee,
                description: `Late fee: ${daysLate} day${daysLate > 1 ? 's' : ''} late ($50 + $${Math.max(0, daysLate - 1) * 10})`,
                charge_date: new Date().toISOString().split('T')[0],
                status: 'pending', // Will need to be collected with next payment
                notes: `Auto-generated for payment ${payment.payment_id || payment.id}`
            };
            
            const { data: charge, error } = await db
                .from('rental_charges')
                .insert(chargeRecord)
                .select()
                .single();
            
            if (error) {
                console.error('Error creating late fee charge:', error);
                return null;
            }
            
            console.log(`✅ Late fee charge created: ${chargeId} for $${lateFee}`);
            
            // Log to activity log
            if (typeof ActivityLog !== 'undefined') {
                await ActivityLog.logLateFee(
                    payment.customer_id, 
                    payment.rental_id, 
                    lateFee, 
                    daysLate,
                    charge?.id
                );
            }
            
            return charge;
            
        } catch (error) {
            console.error('Error in createLateFeeCharge:', error);
            return null;
        }
    },

    /**
     * Update customer stats after payment and log activity
     */
    async updateCustomerAfterPayment(payment, isLate, daysLate, lateFee) {
        try {
            // Get current customer data
            const { data: customer, error: fetchError } = await db
                .from('customers')
                .select('late_payment_count, payment_reliability_score')
                .eq('id', payment.customer_id)
                .single();
            
            if (fetchError) {
                console.warn('Could not fetch customer:', fetchError);
                return;
            }
            
            // Calculate new stats
            const currentLateCount = customer.late_payment_count || 0;
            const currentScore = parseFloat(customer.payment_reliability_score) || 5.0;
            
            let newLateCount = currentLateCount;
            let newScore = currentScore;
            
            if (isLate) {
                // Increment late count
                newLateCount = currentLateCount + 1;
                // Decrease reliability score (-0.5 for late, capped at 0)
                newScore = Math.max(0, currentScore - 0.5);
            } else {
                // Increase reliability score (+0.5 for on-time, capped at 10)
                newScore = Math.min(10, currentScore + 0.5);
            }
            
            // Update customer
            const { error: updateError } = await db
                .from('customers')
                .update({
                    late_payment_count: newLateCount,
                    payment_reliability_score: newScore,
                    updated_at: new Date().toISOString()
                })
                .eq('id', payment.customer_id);
            
            if (updateError) {
                console.warn('Could not update customer stats:', updateError);
            } else {
                console.log(`✅ Customer stats updated: late_count=${newLateCount}, score=${newScore}`);
            }
            
            // Log payment activity
            if (typeof ActivityLog !== 'undefined') {
                await ActivityLog.logPayment(payment, isLate, daysLate);
            }
            
        } catch (error) {
            console.error('Error updating customer after payment:', error);
        }
    },
    
    /**
     * Approve from view modal
     */
    async approveFromModal() {
        if (this.currentPaymentId) {
            await this.approve(this.currentPaymentId);
            this.closeViewModal();
        }
    },
    
    /**
     * Update rental after payment approval
     */
    /**
     * Update rental after payment - FIXED: next_payment_due calculation
     * BUG FIX: Was using "today + 7 days" instead of "current due date + 7 days"
     * 
     * The correct logic:
     * - next_payment_due should be CURRENT next_payment_due + 7 days
     * - This ensures payments stay on their weekly schedule regardless of when recorded
     * 
     * Example: If payment was due Jan 14, next due is Jan 21 (not Jan 27 because recorded Jan 20)
     */
    async updateRentalAfterPayment(rentalId, paidAmount, paidDate = null) {
        try {
            // Get current rental
            const { data: rental, error: fetchError } = await db
                .from('rentals')
                .select('*')
                .eq('id', rentalId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // Calculate new totals
            const currentPaid = parseFloat(rental.total_amount_paid) || 0;
            const newPaid = currentPaid + parseFloat(paidAmount);
            const totalDue = parseFloat(rental.total_amount_due) || 0;
            
            // For ongoing rentals (no weeks_count), add another week to total_amount_due
            let newTotalDue = totalDue;
            if (!rental.weeks_count) {
                // Ongoing rental - add another week's worth
                newTotalDue = totalDue + parseFloat(rental.current_weekly_rate || rental.weekly_rate || 400);
            }
            
            // FIX: Exclude deposit from rent balance calculation
            // total_amount_paid includes deposit, but total_amount_due is rent only
            const depositAmount = parseFloat(rental.deposit_included || rental.deposit_amount) || 0;
            const rentPaid = newPaid - depositAmount;
            const newBalance = newTotalDue - rentPaid;
            
            // NOTE: We don't track credit_balance separately anymore
            // The ledger's negative balance IS the credit (Option A - simple approach)
            // If customer overpays, the ledger will show negative balance = their credit
            
            // FIX: Calculate next payment date based on CURRENT due date, not today
            // This keeps rentals on their proper weekly schedule
            let nextPaymentDue;
            
            if (rental.next_payment_due) {
                // Parse current due date and add 7 days
                const [year, month, day] = rental.next_payment_due.split('-').map(Number);
                nextPaymentDue = new Date(year, month - 1, day);
                nextPaymentDue.setDate(nextPaymentDue.getDate() + 7);
            } else if (paidDate) {
                // Fallback: use paid date + 7 if no current due date
                const [year, month, day] = paidDate.split('-').map(Number);
                nextPaymentDue = new Date(year, month - 1, day);
                nextPaymentDue.setDate(nextPaymentDue.getDate() + 7);
            } else {
                // Last resort: use start_date based calculation
                const startDate = rental.start_date ? new Date(rental.start_date + 'T00:00:00') : new Date();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Calculate weeks since start
                const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
                const weeksSinceStart = Math.floor(daysSinceStart / 7);
                
                // Next due = start + (weeks + 1) * 7 days
                nextPaymentDue = new Date(startDate);
                nextPaymentDue.setDate(nextPaymentDue.getDate() + ((weeksSinceStart + 1) * 7));
            }
            
            // Record when payment was actually made
            const lastPaymentDate = paidDate || formatLocalDateForPayments(new Date());
            
            // Update rental totals
            const { error: updateError } = await db
                .from('rentals')
                .update({
                    total_amount_paid: newPaid,
                    total_amount_due: newTotalDue,
                    balance_remaining: newBalance, // Can be negative if overpaid (that's their credit)
                    last_payment_date: lastPaymentDate,
                    next_payment_due: formatLocalDateForPayments(nextPaymentDue),
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (updateError) throw updateError;
            
            console.log(`✅ Updated rental ${rentalId}: paid=$${newPaid}, due=$${newTotalDue}, balance=$${newBalance}, next_due=${formatLocalDateForPayments(nextPaymentDue)}`);
            
        } catch (error) {
            console.error('Error updating rental:', error);
            // Don't throw - payment was approved, rental update is secondary
        }
    },
    
    /**
     * Open reject payment modal
     */
    openRejectModal(paymentId) {
        const payment = this.data.find(p => p.id === paymentId);
        if (!payment) {
            Utils.toastError('Payment not found');
            return;
        }
        
        // Store payment ID
        this.rejectingPaymentId = paymentId;
        
        // Populate modal
        const customerName = payment.customer?.full_name || 'Unknown';
        const amount = Utils.formatCurrency(payment.paid_amount || 0);
        
        const customerNameEl = document.getElementById('reject-payment-customer');
        const amountEl = document.getElementById('reject-payment-amount');
        const reasonEl = document.getElementById('reject-payment-reason');
        
        if (customerNameEl) customerNameEl.textContent = customerName;
        if (amountEl) amountEl.textContent = amount;
        if (reasonEl) reasonEl.value = '';
        
        // Show modal
        document.getElementById('modal-reject-payment').classList.add('active');
    },
    
    /**
     * Close reject modal
     */
    closeRejectModal() {
        document.getElementById('modal-reject-payment').classList.remove('active');
        this.rejectingPaymentId = null;
    },
    
    /**
     * Confirm payment rejection
     */
    async confirmReject() {
        if (!this.rejectingPaymentId) {
            Utils.toastError('No payment selected');
            return;
        }
        
        const reason = document.getElementById('reject-payment-reason')?.value || '';
        
        try {
            const { error } = await db
                .from('payments')
                .update({
                    payment_status: 'Failed',
                    notes: reason ? `Rejected: ${reason}` : 'Payment rejected',
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.rejectingPaymentId);
            
            if (error) throw error;
            
            Utils.toastSuccess('Payment rejected');
            this.closeRejectModal();
            await this.load();
            
        } catch (error) {
            console.error('Error rejecting payment:', error);
            Utils.toastError('Failed to reject payment');
        }
    },
    
    /**
     * Generate next payment ID
     */
    async generatePaymentId() {
        try {
            const { data, error } = await db
                .from('payments')
                .select('payment_id')
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            
            if (data && data.length > 0 && data[0].payment_id) {
                const lastId = data[0].payment_id;
                const num = parseInt(lastId.replace('P', '')) || 0;
                return `P${String(num + 1).padStart(3, '0')}`;
            }
            
            return 'P001';
        } catch (error) {
            console.error('Error generating payment ID:', error);
            return `P${Date.now()}`;
        }
    },
    
    /**
     * Open new payment modal (manual payment entry)
     */
    async openNewPaymentModal() {
        // Generate payment ID
        const paymentId = await this.generatePaymentId();
        document.getElementById('new-payment-id').value = paymentId;
        
        // Load active rentals for dropdown
        await this.loadActiveRentals();
        
        // Reset form
        document.getElementById('form-new-payment').reset();
        document.getElementById('new-payment-id').value = paymentId;
        document.getElementById('new-payment-date').value = formatLocalDateForPayments(new Date());
        document.getElementById('new-payment-customer-display').textContent = '—';
        document.getElementById('new-payment-balance-display').textContent = '—';
        
        // Clear screenshot preview
        const preview = document.getElementById('new-payment-screenshot-preview');
        if (preview) {
            preview.innerHTML = '';
            preview.style.display = 'none';
        }
        
        // Show modal
        document.getElementById('modal-new-payment').classList.add('active');
    },
    
    /**
     * Close new payment modal
     */
    closeNewPaymentModal() {
        document.getElementById('modal-new-payment').classList.remove('active');
    },
    
    /**
     * Load active rentals for dropdown
     * FIXED: Now calculates actual balance from charges and payments (not stored field)
     */
    async loadActiveRentals() {
        try {
            const { data, error } = await db
                .from('rentals')
                .select(`
                    *,
                    customer:customer_id(id, customer_id, full_name, phone),
                    vehicle:vehicle_id(id, vehicle_id, make, model, year, license_plate)
                `)
                .in('rental_status', ['active', 'Active', 'pending_rental', 'Pending Rental'])
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error loading rentals:', error);
                throw error;
            }
            
            console.log('📋 Active rentals loaded:', data?.length || 0, data);
            
            // For each rental, calculate actual balance from charges and payments
            const rentalsWithBalance = await Promise.all((data || []).map(async (rental) => {
                try {
                    // Get all extra charges for this rental (tolls, late fees, etc.)
                    const { data: charges } = await db
                        .from('rental_charges')
                        .select('amount')
                        .eq('rental_id', rental.id);
                    
                    // Get all confirmed payments for this rental
                    const { data: payments } = await db
                        .from('payments')
                        .select('paid_amount, payment_status')
                        .eq('rental_id', rental.id)
                        .eq('payment_status', 'confirmed');
                    
                    // Calculate weekly rent charges based on weeks elapsed
                    const startDate = rental.start_date ? new Date(rental.start_date + 'T00:00:00') : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    let rentCharges = 0;
                    if (startDate) {
                        const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
                        const weeksElapsed = Math.max(1, Math.ceil((daysSinceStart + 1) / 7)); // At least 1 week
                        
                        const weeklyRate = parseFloat(rental.current_weekly_rate || rental.weekly_rate) || 400;
                        const depositAmount = parseFloat(rental.deposit_amount) || 0;
                        
                        // Week 1 = deposit + rent, subsequent weeks = rent only
                        rentCharges = depositAmount + (weeksElapsed * weeklyRate);
                    }
                    
                    const extraCharges = (charges || []).reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                    const totalCharges = rentCharges + extraCharges;
                    const totalPaid = (payments || []).reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
                    const calculatedBalance = totalCharges - totalPaid;
                    
                    return { ...rental, calculatedBalance };
                } catch (e) {
                    console.error('Error calculating balance for rental:', rental.id, e);
                    return { ...rental, calculatedBalance: parseFloat(rental.balance_remaining) || 0 };
                }
            }));
            
            const select = document.getElementById('new-payment-rental');
            if (select) {
                if (!rentalsWithBalance || rentalsWithBalance.length === 0) {
                    select.innerHTML = '<option value="">No active rentals found</option>';
                } else {
                    select.innerHTML = '<option value="">Select rental...</option>' +
                        rentalsWithBalance.map(rental => {
                            const customer = rental.customer;
                            const vehicle = rental.vehicle;
                            const name = customer?.full_name || 'Unknown Customer';
                            const vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'No Vehicle';
                            const rentalId = rental.rental_id || rental.id.substring(0, 8);
                            const balance = rental.calculatedBalance;
                            const balanceDisplay = balance < 0 ? `-$${Math.abs(balance).toFixed(2)} (Credit)` : `$${balance.toFixed(2)}`;
                            return `<option value="${rental.id}" 
                                            data-customer="${name}"
                                            data-balance="${balance}"
                                            data-rate="${rental.current_weekly_rate || rental.weekly_rate || 400}"
                                            data-deposit="${rental.deposit_amount || 500}">
                                        ${rentalId} - ${name} (${vehicleInfo}) - Balance: ${balanceDisplay}
                                    </option>`;
                        }).join('');
                }
            }
            
            this.activeRentals = rentalsWithBalance || [];
            
        } catch (error) {
            console.error('Error loading rentals:', error);
            Utils.toastError('Failed to load rentals');
        }
    },
    
    /**
     * Handle rental selection in new payment form
     */
    onRentalSelect() {
        const select = document.getElementById('new-payment-rental');
        const option = select.options[select.selectedIndex];
        
        if (option && option.value) {
            const customer = option.dataset.customer;
            const balance = parseFloat(option.dataset.balance) || 0;
            const rate = parseFloat(option.dataset.rate) || 400;
            
            document.getElementById('new-payment-customer-display').textContent = customer;
            
            // Display balance with credit indication
            const balanceDisplay = document.getElementById('new-payment-balance-display');
            if (balance < 0) {
                balanceDisplay.textContent = `-$${Math.abs(balance).toFixed(2)} (Credit)`;
                balanceDisplay.style.color = 'var(--success)';
            } else {
                balanceDisplay.textContent = `$${balance.toFixed(2)}`;
                balanceDisplay.style.color = balance > 0 ? 'var(--danger)' : 'var(--text-primary)';
            }
            
            document.getElementById('new-payment-amount').value = rate;
            
            // Also trigger payment type change to update amount based on type
            this.onPaymentTypeChange();
        } else {
            document.getElementById('new-payment-customer-display').textContent = '—';
            document.getElementById('new-payment-balance-display').textContent = '—';
            document.getElementById('new-payment-balance-display').style.color = '';
            document.getElementById('new-payment-amount').value = '';
        }
    },
    
    /**
     * Handle screenshot file selection
     */
    onScreenshotSelect(input) {
        const preview = document.getElementById('new-payment-screenshot-preview');
        if (!preview) return;
        
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Screenshot preview">`;
                preview.style.display = 'block';
            };
            
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
            preview.style.display = 'none';
        }
    },
    
    /**
     * Create new payment - UPDATED: Now includes payment_type
     */
    async createPayment() {
        const rentalId = document.getElementById('new-payment-rental').value;
        const amount = parseFloat(document.getElementById('new-payment-amount').value);
        const date = document.getElementById('new-payment-date').value;
        const method = document.getElementById('new-payment-method').value;
        const paymentType = document.getElementById('new-payment-type')?.value || 'weekly';
        const notes = document.getElementById('new-payment-notes').value;
        const screenshotInput = document.getElementById('new-payment-screenshot');
        
        // Validation
        if (!rentalId) {
            Utils.toastError('Please select a rental');
            return;
        }
        if (!amount || amount <= 0) {
            Utils.toastError('Please enter a valid amount');
            return;
        }
        if (!date) {
            Utils.toastError('Please select a date');
            return;
        }
        if (!method) {
            Utils.toastError('Please select a payment method');
            return;
        }
        if (!paymentType) {
            Utils.toastError('Please select a payment type');
            return;
        }
        
        // Get rental info
        const rental = this.activeRentals.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        // Check if late (only for weekly payments)
        const paidDate = new Date(date);
        const dueDate = rental.next_payment_due ? new Date(rental.next_payment_due) : null;
        const isLate = (paymentType === 'weekly' && dueDate && paidDate > dueDate);
        const daysLate = isLate ? Math.floor((paidDate - dueDate) / (1000 * 60 * 60 * 24)) : 0;
        
        // Generate auto-notes based on payment type
        let autoNotes = this.getPaymentTypeLabel(paymentType);
        if (notes) {
            autoNotes += ': ' + notes;
        }
        
        try {
            // Upload screenshot if provided
            let screenshotUrl = null;
            if (screenshotInput.files && screenshotInput.files[0]) {
                screenshotUrl = await this.uploadScreenshot(screenshotInput.files[0], rentalId);
            }
            
            // Generate payment ID
            const paymentId = await this.generatePaymentId();
            
            // Calculate late fee
            const lateFee = isLate ? daysLate * 10 : 0; // $10/day
            
            // Generate auto-notes based on payment type
            let autoNotes = this.getPaymentTypeLabel(paymentType);
            if (notes) {
                autoNotes += ': ' + notes;
            }
            
            // Create payment record with ACTUAL column names
            const { error } = await db
                .from('payments')
                .insert({
                    payment_id: paymentId,
                    rental_id: rentalId,
                    customer_id: rental.customer_id,
                    due_date: rental.next_payment_due || date,
                    amount_due: amount,
                    toll_charges: 0,
                    damage_charges: 0,
                    late_fees: lateFee,
                    total_amount: amount + lateFee,
                    paid_amount: amount,
                    paid_date: date,
                    payment_method: method,
                    payment_type: paymentType,
                    payment_screenshot_url: screenshotUrl,
                    payment_status: 'pending',  // Start as pending, admin must confirm
                    is_late: isLate,
                    days_late: daysLate,
                    notes: autoNotes
                    // No approved_by or approved_at until admin confirms
                });
            
            if (error) throw error;
            
            // NOTE: Rental totals are NOT updated here
            // They are updated when admin CONFIRMS the payment
            // This allows for review before the payment affects balances
            
            Utils.toastSuccess('Payment recorded - pending confirmation');
            this.closeNewPaymentModal();
            await this.load();
            
        } catch (error) {
            console.error('Error creating payment:', error);
            Utils.toastError('Failed to record payment');
        }
    },
    
    /**
     * Get human-readable label for payment type
     */
    getPaymentTypeLabel(type) {
        const labels = {
            'initial': 'Initial Payment (Deposit + First Week)',
            'weekly': 'Weekly Rent',
            'toll_deposit': 'Toll Deposit Replenishment',
            'late_fee': 'Late Fee Payment',
            'damage_fee': 'Damage/Cleaning Fee',
            'other': 'Other Payment'
        };
        return labels[type] || 'Payment';
    },
    
    /**
     * Handle payment type change - auto-fill amounts
     */
    onPaymentTypeChange() {
        const paymentType = document.getElementById('new-payment-type')?.value;
        const amountInput = document.getElementById('new-payment-amount');
        const rentalId = document.getElementById('new-payment-rental')?.value;
        
        if (!paymentType || !amountInput) return;
        
        // Get rental if selected
        const rental = rentalId ? this.activeRentals.find(r => r.id === rentalId) : null;
        const weeklyRate = rental ? parseFloat(rental.weekly_rate) || 400 : 400;
        const depositAmount = rental ? parseFloat(rental.deposit_amount) || 500 : 500;
        
        // Auto-fill amount based on type
        switch (paymentType) {
            case 'initial':
                amountInput.value = weeklyRate + depositAmount;
                break;
            case 'weekly':
                amountInput.value = weeklyRate;
                break;
            case 'late_fee':
                amountInput.value = 50;
                break;
            case 'toll_deposit':
            case 'damage_fee':
            case 'other':
                // Leave amount empty for manual entry
                amountInput.value = '';
                break;
        }
    },
    
    /**
     * Upload screenshot to Supabase storage
     */
    async uploadScreenshot(file, rentalId) {
        try {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop();
            const fileName = `payment_${rentalId}_${timestamp}.${ext}`;
            
            const { data, error } = await db.storage
                .from('payment-screenshots')
                .upload(fileName, file);
            
            if (error) throw error;
            
            // Get public URL
            const { data: urlData } = db.storage
                .from('payment-screenshots')
                .getPublicUrl(fileName);
            
            return urlData.publicUrl;
            
        } catch (error) {
            console.error('Error uploading screenshot:', error);
            return null;
        }
    },
    
    /**
     * Export payments to CSV
     */
    exportToCSV() {
        const headers = [
            'Payment ID',
            'Customer',
            'Rental ID',
            'Amount',
            'Method',
            'Date',
            'Status',
            'Late',
            'Days Late',
            'Late Fee'
        ];
        
        const rows = this.filtered.map(p => [
            p.payment_id || '',
            p.customer?.full_name || '',
            p.rental?.rental_id || '',
            p.paid_amount || 0,
            p.payment_method || '',
            p.paid_date || '',
            p.payment_status || '',
            p.is_late ? 'Yes' : 'No',
            p.days_late || 0,
            p.late_fee_charged || 0
        ]);
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fleetzy-payments-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        Utils.toastSuccess('Payments exported to CSV');
    }
};

// Initialize when document ready and section shown
document.addEventListener('DOMContentLoaded', () => {
    // Will be initialized by sidebar when section is shown
});
