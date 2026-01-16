/* ============================================
   FLEETZY ADMIN - PAYMENTS MODULE
   Full payment management with approval workflows
   ============================================ */

const Payments = {
    // Cached data
    data: [],
    filtered: [],
    
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
        try {
            // Load payments with related data
            const { data: payments, error } = await db
                .from('payments')
                .select(`
                    *,
                    customer:customer_id(id, customer_id, first_name, last_name, phone, email, selfie_url),
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
            const customerName = payment.customer 
                ? `${payment.customer.first_name} ${payment.customer.last_name}`.toLowerCase() 
                : '';
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
        
        // This Month (confirmed payments)
        const thisMonth = this.data.filter(p => {
            const paidDate = new Date(p.paid_date);
            return paidDate >= startOfMonth && 
                   (p.payment_status || '').toLowerCase() === 'confirmed';
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
        
        // Customer cell
        const customerName = customer 
            ? `${customer.first_name} ${customer.last_name}`
            : 'Unknown Customer';
        const customerPhoto = customer?.selfie_url || 'assets/default-avatar.png';
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
                        <img src="${customerPhoto}" alt="${customerName}" class="customer-photo" 
                             onerror="this.src='assets/default-avatar.png'">
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
                    <span class="status-badge ${statusClass}">${status}</span>
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
                <button class="btn-icon" onclick="Payments.view('${payment.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            `;
        }
        
        return `
            <button class="btn-icon" onclick="Payments.view('${payment.id}')" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        `;
    },
    
    /**
     * View payment details
     */
    view(paymentId) {
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
        
        // Late payment section
        const lateSection = payment.is_late
            ? `
                <div class="detail-section full-width late-alert">
                    <h4><i class="fas fa-exclamation-triangle"></i> Late Payment</h4>
                    <div class="detail-row">
                        <span class="detail-label">Days Late</span>
                        <span class="detail-value text-warning">${payment.days_late || 0} days</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Late Fee Charged</span>
                        <span class="detail-value text-warning">${Utils.formatCurrency(payment.late_fee_charged || 0)}</span>
                    </div>
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
                        <span class="detail-label">Amount</span>
                        <span class="detail-value">${Utils.formatCurrency(payment.paid_amount || 0)}</span>
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
                        <span class="detail-value">${customer ? `${customer.first_name} ${customer.last_name}` : '—'}</span>
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
                
                ${screenshotSection}
                ${lateSection}
                ${approvalSection}
                ${notesSection}
            </div>
        `;
        
        // Store current payment ID for modal actions
        this.currentPaymentId = paymentId;
        
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
     * Approve payment
     */
    async approve(paymentId) {
        const payment = this.data.find(p => p.id === paymentId);
        if (!payment) {
            Utils.toastError('Payment not found');
            return;
        }
        
        // Confirm action
        const customerName = payment.customer 
            ? `${payment.customer.first_name} ${payment.customer.last_name}`
            : 'Unknown';
        const amount = Utils.formatCurrency(payment.paid_amount || 0);
        
        if (!confirm(`Approve payment of ${amount} from ${customerName}?`)) {
            return;
        }
        
        try {
            // Update payment status
            const { error: paymentError } = await db
                .from('payments')
                .update({
                    payment_status: 'Confirmed',
                    approved_by: 'Admin',
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', paymentId);
            
            if (paymentError) throw paymentError;
            
            // Update rental totals if we have a rental
            if (payment.rental_id) {
                await this.updateRentalAfterPayment(payment.rental_id, payment.paid_amount);
            }
            
            Utils.toastSuccess('Payment approved successfully');
            await this.load(); // Refresh data
            
        } catch (error) {
            console.error('Error approving payment:', error);
            Utils.toastError('Failed to approve payment');
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
    async updateRentalAfterPayment(rentalId, paidAmount) {
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
            const newBalance = totalDue - newPaid;
            
            // Calculate next payment date
            const lastPayment = new Date();
            const nextPaymentDue = new Date(lastPayment);
            nextPaymentDue.setDate(nextPaymentDue.getDate() + 7);
            
            // Update rental
            const { error: updateError } = await db
                .from('rentals')
                .update({
                    total_amount_paid: newPaid,
                    balance_remaining: Math.max(0, newBalance),
                    last_payment_date: lastPayment.toISOString().split('T')[0],
                    next_payment_due: nextPaymentDue.toISOString().split('T')[0],
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (updateError) throw updateError;
            
            console.log(`✅ Updated rental ${rentalId} totals`);
            
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
        const customerName = payment.customer 
            ? `${payment.customer.first_name} ${payment.customer.last_name}`
            : 'Unknown';
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
        document.getElementById('new-payment-date').value = new Date().toISOString().split('T')[0];
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
     */
    async loadActiveRentals() {
        try {
            const { data, error } = await db
                .from('rentals')
                .select(`
                    *,
                    customer:customer_id(id, first_name, last_name),
                    vehicle:vehicle_id(make, model, year)
                `)
                .eq('rental_status', 'active')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            const select = document.getElementById('new-payment-rental');
            if (select) {
                select.innerHTML = '<option value="">Select rental...</option>' +
                    (data || []).map(rental => {
                        const customer = rental.customer;
                        const vehicle = rental.vehicle;
                        const name = customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown';
                        const vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : '';
                        return `<option value="${rental.id}" 
                                        data-customer="${name}"
                                        data-balance="${rental.balance_remaining || 0}"
                                        data-rate="${rental.weekly_rate || 0}">
                                    ${rental.rental_id} - ${name} (${vehicleInfo})
                                </option>`;
                    }).join('');
            }
            
            this.activeRentals = data || [];
            
        } catch (error) {
            console.error('Error loading rentals:', error);
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
            document.getElementById('new-payment-balance-display').textContent = Utils.formatCurrency(balance);
            document.getElementById('new-payment-amount').value = rate;
        } else {
            document.getElementById('new-payment-customer-display').textContent = '—';
            document.getElementById('new-payment-balance-display').textContent = '—';
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
     * Create new payment
     */
    async createPayment() {
        const rentalId = document.getElementById('new-payment-rental').value;
        const amount = parseFloat(document.getElementById('new-payment-amount').value);
        const date = document.getElementById('new-payment-date').value;
        const method = document.getElementById('new-payment-method').value;
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
        
        // Get rental info
        const rental = this.activeRentals.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        // Check if late
        const paidDate = new Date(date);
        const dueDate = rental.next_payment_due ? new Date(rental.next_payment_due) : null;
        const isLate = dueDate && paidDate > dueDate;
        const daysLate = isLate ? Math.floor((paidDate - dueDate) / (1000 * 60 * 60 * 24)) : 0;
        
        try {
            // Upload screenshot if provided
            let screenshotUrl = null;
            if (screenshotInput.files && screenshotInput.files[0]) {
                screenshotUrl = await this.uploadScreenshot(screenshotInput.files[0], rentalId);
            }
            
            // Generate payment ID
            const paymentId = await this.generatePaymentId();
            
            // Create payment record
            const { error } = await db
                .from('payments')
                .insert({
                    payment_id: paymentId,
                    rental_id: rentalId,
                    customer_id: rental.customer_id,
                    paid_amount: amount,
                    paid_date: date,
                    due_date: rental.next_payment_due,
                    payment_method: method,
                    payment_screenshot_url: screenshotUrl,
                    payment_status: 'Confirmed',
                    is_late: isLate,
                    days_late: daysLate,
                    notes: notes,
                    approved_by: 'Admin',
                    approved_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            // Update rental totals
            await this.updateRentalAfterPayment(rentalId, amount);
            
            Utils.toastSuccess('Payment recorded successfully');
            this.closeNewPaymentModal();
            await this.load();
            
        } catch (error) {
            console.error('Error creating payment:', error);
            Utils.toastError('Failed to record payment');
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
            p.customer ? `${p.customer.first_name} ${p.customer.last_name}` : '',
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
