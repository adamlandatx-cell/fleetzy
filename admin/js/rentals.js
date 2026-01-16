/* ============================================
   FLEETZY ADMIN - RENTALS MODULE
   Full rental management with status workflows
   ============================================ */

const Rentals = {
    // Cached data
    data: [],
    filtered: [],
    customers: [],
    vehicles: [],
    
    /**
     * Initialize rentals tab
     */
    async init() {
        console.log('📋 Initializing Rentals module...');
        await this.load();
        this.setupEventListeners();
    },
    
    /**
     * Load rentals from Supabase with customer and vehicle data
     */
    async load() {
        try {
            // Load rentals with related data
            const { data: rentals, error } = await db
                .from('rentals')
                .select(`
                    *,
                    customer:customer_id(id, customer_id, first_name, last_name, phone, email, selfie_url),
                    vehicle:vehicle_id(id, vehicle_id, make, model, year, license_plate, weekly_rate, image_url)
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.data = rentals || [];
            this.filtered = [...this.data];
            this.render();
            this.updateStats();
            this.updateSidebarBadge();
            
            console.log(`✅ Loaded ${this.data.length} rentals`);
        } catch (error) {
            console.error('❌ Error loading rentals:', error);
            Utils.toastError('Failed to load rentals');
        }
    },
    
    /**
     * Load available customers (approved, no active rental)
     */
    async loadAvailableCustomers() {
        try {
            const { data, error } = await db
                .from('customers')
                .select('*')
                .or('status.ilike.%approved%,application_status.ilike.%approved%')
                .order('first_name');
            
            if (error) throw error;
            
            // Filter out customers with active rentals
            const activeRentalCustomerIds = this.data
                .filter(r => ['active', 'pending_rental'].includes(r.rental_status))
                .map(r => r.customer_id);
            
            this.customers = (data || []).filter(c => !activeRentalCustomerIds.includes(c.id));
            
            return this.customers;
        } catch (error) {
            console.error('Error loading customers:', error);
            return [];
        }
    },
    
    /**
     * Load available vehicles
     */
    async loadAvailableVehicles() {
        try {
            const { data, error } = await db
                .from('vehicles')
                .select('*')
                .eq('vehicle_status', 'Available')
                .order('make');
            
            if (error) throw error;
            
            this.vehicles = data || [];
            return this.vehicles;
        } catch (error) {
            console.error('Error loading vehicles:', error);
            return [];
        }
    },
    
    /**
     * Setup event listeners for search and filters
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('rentals-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filter());
        }
        
        // Status filter
        const statusFilter = document.getElementById('rentals-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filter());
        }
    },
    
    /**
     * Filter rentals based on search and status
     */
    filter() {
        const searchTerm = document.getElementById('rentals-search')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('rentals-status-filter')?.value || '';
        
        this.filtered = this.data.filter(rental => {
            // Search filter - customer name, vehicle info
            const customerName = rental.customer 
                ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.toLowerCase()
                : '';
            const vehicleInfo = rental.vehicle
                ? `${rental.vehicle.year || ''} ${rental.vehicle.make || ''} ${rental.vehicle.model || ''} ${rental.vehicle.license_plate || ''}`.toLowerCase()
                : '';
            const rentalId = rental.rental_id?.toLowerCase() || '';
            
            const searchMatch = !searchTerm || 
                customerName.includes(searchTerm) ||
                vehicleInfo.includes(searchTerm) ||
                rentalId.includes(searchTerm);
            
            // Status filter
            const statusMatch = !statusFilter || rental.rental_status === statusFilter;
            
            return searchMatch && statusMatch;
        });
        
        this.render();
    },
    
    /**
     * Update stats cards
     */
    updateStats() {
        const pending = this.data.filter(r => r.rental_status === 'pending_approval').length;
        const awaiting = this.data.filter(r => r.rental_status === 'pending_rental').length;
        const active = this.data.filter(r => r.rental_status === 'active').length;
        
        // Calculate this month's revenue from active rentals
        const thisMonth = new Date();
        const revenue = this.data
            .filter(r => r.rental_status === 'active' || r.rental_status === 'completed')
            .filter(r => {
                const start = new Date(r.start_date);
                return start.getMonth() === thisMonth.getMonth() && 
                       start.getFullYear() === thisMonth.getFullYear();
            })
            .reduce((sum, r) => sum + (parseFloat(r.total_amount_paid) || 0), 0);
        
        // Update stat elements
        const pendingEl = document.getElementById('rentals-stat-pending');
        const awaitingEl = document.getElementById('rentals-stat-awaiting');
        const activeEl = document.getElementById('rentals-stat-active');
        const revenueEl = document.getElementById('rentals-stat-revenue');
        
        if (pendingEl) pendingEl.textContent = pending;
        if (awaitingEl) awaitingEl.textContent = awaiting;
        if (activeEl) activeEl.textContent = active;
        if (revenueEl) revenueEl.textContent = '$' + revenue.toLocaleString();
    },
    
    /**
     * Update sidebar badge with pending count
     */
    updateSidebarBadge() {
        const pendingCount = this.data.filter(r => r.rental_status === 'pending_approval').length;
        if (typeof Sidebar !== 'undefined') {
            Sidebar.updateBadge('rentals', pendingCount);
        }
    },
    
    /**
     * Render rentals table
     */
    render() {
        const container = document.getElementById('rentals-table-body');
        if (!container) return;
        
        if (this.filtered.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-file-contract"></i>
                        <p>No rentals found</p>
                        <button class="btn btn-primary" onclick="Rentals.openNewRentalModal()">
                            <i class="fas fa-plus"></i> New Rental
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = this.filtered.map(rental => this.renderRow(rental)).join('');
    },
    
    /**
     * Render single rental row
     */
    renderRow(rental) {
        const statusClass = this.getStatusClass(rental.rental_status);
        const statusLabel = this.formatStatus(rental.rental_status);
        
        // Customer info
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'Unknown Customer';
        const customerAvatar = rental.customer?.selfie_url || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=10b981&color=fff&size=64`;
        const customerId = rental.customer?.customer_id || 'N/A';
        
        // Vehicle info
        const vehicleName = rental.vehicle 
            ? `${rental.vehicle.year || ''} ${rental.vehicle.make || ''} ${rental.vehicle.model || ''}`.trim()
            : 'No Vehicle';
        const vehiclePlate = rental.vehicle?.license_plate || 'N/A';
        const vehicleId = rental.vehicle?.vehicle_id || '';
        
        // Dates
        const startDate = rental.start_date 
            ? new Date(rental.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Not started';
        const endDate = rental.end_date
            ? new Date(rental.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Ongoing';
        
        // Payment info
        const weeklyRate = parseFloat(rental.weekly_rate) || 400;
        const nextPayment = rental.next_payment_due
            ? new Date(rental.next_payment_due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '-';
        const isOverdue = rental.next_payment_due && new Date(rental.next_payment_due) < new Date();
        
        // Action buttons based on status
        const actionButtons = this.getActionButtons(rental);
        
        return `
            <tr data-rental-id="${rental.id}">
                <td>
                    <div class="rental-customer-cell">
                        <img src="${customerAvatar}" alt="${customerName}" class="customer-avatar"
                             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=10b981&color=fff&size=64'">
                        <div class="customer-info">
                            <div class="customer-name">${customerName}</div>
                            <div class="customer-id">${customerId}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="vehicle-info-compact">
                        <div class="vehicle-name">${vehicleName}</div>
                        <div class="vehicle-plate">${vehiclePlate}</div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </td>
                <td>
                    <div class="date-range">
                        <div class="start-date">${startDate}</div>
                        <div class="end-date">${endDate !== 'Ongoing' ? 'to ' + endDate : '<span class="ongoing">Ongoing</span>'}</div>
                    </div>
                </td>
                <td>
                    <span class="rate">$${weeklyRate}/wk</span>
                </td>
                <td>
                    <span class="next-payment ${isOverdue ? 'overdue' : ''}">${nextPayment}${isOverdue ? ' ⚠️' : ''}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    },
    
    /**
     * Get action buttons based on rental status
     */
    getActionButtons(rental) {
        const status = rental.rental_status;
        
        switch (status) {
            case 'pending_approval':
                return `
                    <button class="btn-icon success" onclick="Rentals.approve('${rental.id}')" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon danger" onclick="Rentals.openRejectModal('${rental.id}')" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn-icon" onclick="Rentals.view('${rental.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                `;
                
            case 'pending_rental':
                return `
                    <button class="btn-icon success" onclick="Rentals.openStartRentalModal('${rental.id}')" title="Start Rental">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn-icon" onclick="Rentals.viewContract('${rental.id}')" title="View Contract">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn-icon" onclick="Rentals.view('${rental.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                `;
                
            case 'active':
                return `
                    <button class="btn-icon success" onclick="Rentals.openRecordPaymentModal('${rental.id}')" title="Record Payment">
                        <i class="fas fa-dollar-sign"></i>
                    </button>
                    <button class="btn-icon warning" onclick="Rentals.openEndRentalModal('${rental.id}')" title="End Rental">
                        <i class="fas fa-stop"></i>
                    </button>
                    <button class="btn-icon" onclick="Rentals.view('${rental.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                `;
                
            case 'completed':
            case 'cancelled':
                return `
                    <button class="btn-icon" onclick="Rentals.view('${rental.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${rental.contract_url ? `
                        <button class="btn-icon" onclick="Rentals.viewContract('${rental.id}')" title="View Contract">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    ` : ''}
                `;
                
            default:
                return `
                    <button class="btn-icon" onclick="Rentals.view('${rental.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                `;
        }
    },
    
    /**
     * Get status badge class
     */
    getStatusClass(status) {
        const classes = {
            'pending_approval': 'status-pending-approval',
            'pending_rental': 'status-pending-rental',
            'active': 'status-active',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return classes[status] || 'status-unknown';
    },
    
    /**
     * Format status for display
     */
    formatStatus(status) {
        const labels = {
            'pending_approval': 'Pending Approval',
            'pending_rental': 'Awaiting Pickup',
            'active': 'Active',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return labels[status] || status || 'Unknown';
    },
    
    /* ============================================
       VIEW & DETAILS
    ============================================ */
    
    /**
     * View rental details
     */
    view(rentalId) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const modal = document.getElementById('modal-view-rental');
        if (!modal) {
            Utils.toastInfo('View modal coming soon');
            return;
        }
        
        // Populate modal with rental details
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'Unknown';
        const vehicleName = rental.vehicle 
            ? `${rental.vehicle.year} ${rental.vehicle.make} ${rental.vehicle.model}`
            : 'No Vehicle';
        
        const content = document.getElementById('view-rental-content');
        if (content) {
            content.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-section">
                        <h4><i class="fas fa-info-circle"></i> Rental Information</h4>
                        <div class="detail-row">
                            <span class="detail-label">Rental ID</span>
                            <span class="detail-value">${rental.rental_id || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status</span>
                            <span class="detail-value">
                                <span class="status-badge ${this.getStatusClass(rental.rental_status)}">${this.formatStatus(rental.rental_status)}</span>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Start Date</span>
                            <span class="detail-value">${rental.start_date ? new Date(rental.start_date).toLocaleDateString() : 'Not started'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">End Date</span>
                            <span class="detail-value">${rental.end_date ? new Date(rental.end_date).toLocaleDateString() : 'Ongoing'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Weeks Contracted</span>
                            <span class="detail-value">${rental.weeks_contracted || '-'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-user"></i> Customer</h4>
                        <div class="detail-row">
                            <span class="detail-label">Name</span>
                            <span class="detail-value">${customerName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Phone</span>
                            <span class="detail-value">${rental.customer?.phone || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email</span>
                            <span class="detail-value">${rental.customer?.email || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-car"></i> Vehicle</h4>
                        <div class="detail-row">
                            <span class="detail-label">Vehicle</span>
                            <span class="detail-value">${vehicleName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">License Plate</span>
                            <span class="detail-value">${rental.vehicle?.license_plate || 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Start Mileage</span>
                            <span class="detail-value">${rental.start_mileage?.toLocaleString() || '-'} mi</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Current/End Mileage</span>
                            <span class="detail-value">${rental.end_mileage?.toLocaleString() || '-'} mi</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-dollar-sign"></i> Financials</h4>
                        <div class="detail-row">
                            <span class="detail-label">Weekly Rate</span>
                            <span class="detail-value">$${parseFloat(rental.weekly_rate || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Deposit</span>
                            <span class="detail-value">$${parseFloat(rental.deposit_amount || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Total Due</span>
                            <span class="detail-value">$${parseFloat(rental.total_amount_due || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Total Paid</span>
                            <span class="detail-value">$${parseFloat(rental.total_amount_paid || 0).toLocaleString()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Balance</span>
                            <span class="detail-value ${parseFloat(rental.balance_remaining) > 0 ? 'text-red' : ''}">
                                $${parseFloat(rental.balance_remaining || 0).toLocaleString()}
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Next Payment</span>
                            <span class="detail-value">${rental.next_payment_due ? new Date(rental.next_payment_due).toLocaleDateString() : '-'}</span>
                        </div>
                    </div>
                </div>
                
                ${rental.notes ? `
                    <div class="detail-section full-width">
                        <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                        <p class="notes-text">${rental.notes}</p>
                    </div>
                ` : ''}
            `;
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close view modal
     */
    closeViewModal() {
        const modal = document.getElementById('modal-view-rental');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * View contract PDF
     */
    viewContract(rentalId) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        if (rental.contract_url) {
            window.open(rental.contract_url, '_blank');
        } else {
            Utils.toastInfo('No contract available for this rental');
        }
    },
    
    /* ============================================
       APPROVAL WORKFLOW
    ============================================ */
    
    /**
     * Approve rental application
     */
    async approve(rentalId) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'Customer';
        
        const confirmed = confirm(`Approve rental for ${customerName}?\n\nThis will move the rental to "Awaiting Pickup" status.`);
        if (!confirmed) return;
        
        try {
            Utils.toastInfo('Approving rental...');
            
            const { error } = await db
                .from('rentals')
                .update({
                    rental_status: 'pending_rental',
                    approved_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (error) throw error;
            
            // Update vehicle to Reserved if it exists
            if (rental.vehicle_id) {
                await db
                    .from('vehicles')
                    .update({ 
                        vehicle_status: 'Reserved',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', rental.vehicle_id);
            }
            
            Utils.toastSuccess(`Rental for ${customerName} approved!`);
            await this.load();
            
            // Refresh dashboard
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error approving rental:', error);
            Utils.toastError('Failed to approve rental: ' + error.message);
        }
    },
    
    /**
     * Open reject modal
     */
    openRejectModal(rentalId) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const modal = document.getElementById('modal-reject-rental');
        if (!modal) {
            // Fallback to confirm dialog
            this.reject(rentalId);
            return;
        }
        
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'this customer';
        
        document.getElementById('reject-rental-id').value = rentalId;
        document.getElementById('reject-rental-customer-name').textContent = customerName;
        document.getElementById('reject-rental-reason').value = '';
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close reject modal
     */
    closeRejectModal() {
        const modal = document.getElementById('modal-reject-rental');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Submit rejection from modal
     */
    async submitRejection() {
        const rentalId = document.getElementById('reject-rental-id')?.value;
        const reason = document.getElementById('reject-rental-reason')?.value || '';
        
        if (!rentalId) {
            Utils.toastError('Rental not found');
            return;
        }
        
        await this.reject(rentalId, reason);
    },
    
    /**
     * Reject rental
     */
    async reject(rentalId, reason = '') {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'Customer';
        
        if (!reason) {
            const confirmed = confirm(`Reject rental for ${customerName}?\n\nThis action cannot be easily undone.`);
            if (!confirmed) return;
        }
        
        try {
            Utils.toastInfo('Processing rejection...');
            
            const { error } = await db
                .from('rentals')
                .update({
                    rental_status: 'cancelled',
                    rejection_reason: reason,
                    cancelled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (error) throw error;
            
            // Release vehicle if reserved
            if (rental.vehicle_id) {
                await db
                    .from('vehicles')
                    .update({ 
                        vehicle_status: 'Available',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', rental.vehicle_id);
            }
            
            Utils.toastSuccess(`Rental for ${customerName} has been cancelled`);
            this.closeRejectModal();
            await this.load();
            
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error rejecting rental:', error);
            Utils.toastError('Failed to reject rental: ' + error.message);
        }
    },
    
    /* ============================================
       NEW RENTAL
    ============================================ */
    
    /**
     * Open new rental modal
     */
    async openNewRentalModal() {
        const modal = document.getElementById('modal-new-rental');
        if (!modal) {
            Utils.toastInfo('New rental modal coming soon');
            return;
        }
        
        // Load available customers and vehicles
        Utils.toastInfo('Loading options...');
        await Promise.all([
            this.loadAvailableCustomers(),
            this.loadAvailableVehicles()
        ]);
        
        // Populate customer dropdown
        const customerSelect = document.getElementById('new-rental-customer');
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">Select a customer...</option>' +
                this.customers.map(c => {
                    const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
                    return `<option value="${c.id}">${name} (${c.phone || 'No phone'})</option>`;
                }).join('');
        }
        
        // Populate vehicle dropdown
        const vehicleSelect = document.getElementById('new-rental-vehicle');
        if (vehicleSelect) {
            vehicleSelect.innerHTML = '<option value="">Select a vehicle...</option>' +
                this.vehicles.map(v => {
                    const name = `${v.year} ${v.make} ${v.model}`;
                    return `<option value="${v.id}" data-rate="${v.weekly_rate || 400}">${name} - ${v.license_plate} ($${v.weekly_rate || 400}/wk)</option>`;
                }).join('');
        }
        
        // Set defaults
        document.getElementById('new-rental-start-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('new-rental-weeks').value = '4';
        document.getElementById('new-rental-weekly-rate').value = '400';
        document.getElementById('new-rental-deposit').value = '500';
        this.calculateNewRentalTotal();
        
        // Generate rental ID
        await this.generateRentalId();
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close new rental modal
     */
    closeNewRentalModal() {
        const modal = document.getElementById('modal-new-rental');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Generate next rental ID
     */
    async generateRentalId() {
        try {
            const { data, error } = await db
                .from('rentals')
                .select('rental_id')
                .order('created_at', { ascending: false })
                .limit(1);
            
            let nextId = 'R001';
            if (data && data.length > 0 && data[0].rental_id) {
                const lastNum = parseInt(data[0].rental_id.replace('R', '')) || 0;
                nextId = 'R' + String(lastNum + 1).padStart(3, '0');
            }
            
            const el = document.getElementById('new-rental-id');
            if (el) el.value = nextId;
            
        } catch (error) {
            console.error('Error generating rental ID:', error);
        }
    },
    
    /**
     * Handle vehicle selection in new rental
     */
    onVehicleSelect() {
        const select = document.getElementById('new-rental-vehicle');
        const option = select.options[select.selectedIndex];
        const rate = option?.dataset?.rate || 400;
        document.getElementById('new-rental-weekly-rate').value = rate;
        this.calculateNewRentalTotal();
    },
    
    /**
     * Calculate total for new rental
     */
    calculateNewRentalTotal() {
        const weeks = parseInt(document.getElementById('new-rental-weeks')?.value) || 0;
        const rate = parseFloat(document.getElementById('new-rental-weekly-rate')?.value) || 0;
        const deposit = parseFloat(document.getElementById('new-rental-deposit')?.value) || 0;
        
        const total = (weeks * rate) + deposit;
        
        const el = document.getElementById('new-rental-total');
        if (el) el.textContent = '$' + total.toLocaleString();
    },
    
    /**
     * Create new rental
     */
    async createRental() {
        const customerId = document.getElementById('new-rental-customer')?.value;
        const vehicleId = document.getElementById('new-rental-vehicle')?.value;
        const startDate = document.getElementById('new-rental-start-date')?.value;
        const weeks = parseInt(document.getElementById('new-rental-weeks')?.value) || 4;
        const weeklyRate = parseFloat(document.getElementById('new-rental-weekly-rate')?.value) || 400;
        const deposit = parseFloat(document.getElementById('new-rental-deposit')?.value) || 500;
        const rentalId = document.getElementById('new-rental-id')?.value;
        const notes = document.getElementById('new-rental-notes')?.value || '';
        
        // Validation
        if (!customerId) {
            Utils.toastError('Please select a customer');
            return;
        }
        if (!vehicleId) {
            Utils.toastError('Please select a vehicle');
            return;
        }
        if (!startDate) {
            Utils.toastError('Please select a start date');
            return;
        }
        
        const totalDue = (weeks * weeklyRate) + deposit;
        const nextPaymentDue = new Date(startDate);
        nextPaymentDue.setDate(nextPaymentDue.getDate() + 7);
        
        const rentalData = {
            rental_id: rentalId,
            customer_id: customerId,
            vehicle_id: vehicleId,
            start_date: startDate,
            weeks_contracted: weeks,
            weekly_rate: weeklyRate,
            deposit_amount: deposit,
            total_amount_due: totalDue,
            total_amount_paid: 0,
            balance_remaining: totalDue,
            rental_status: 'pending_rental', // Already approved since admin is creating
            payment_frequency: 'Weekly',
            next_payment_due: nextPaymentDue.toISOString().split('T')[0],
            payments_missed: 0,
            notes: notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        try {
            Utils.toastInfo('Creating rental...');
            
            const { error } = await db
                .from('rentals')
                .insert([rentalData]);
            
            if (error) throw error;
            
            // Reserve the vehicle
            await db
                .from('vehicles')
                .update({ 
                    vehicle_status: 'Reserved',
                    updated_at: new Date().toISOString()
                })
                .eq('id', vehicleId);
            
            Utils.toastSuccess('Rental created successfully!');
            this.closeNewRentalModal();
            await this.load();
            
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error creating rental:', error);
            Utils.toastError('Failed to create rental: ' + error.message);
        }
    },
    
    /* ============================================
       START RENTAL
    ============================================ */
    
    /**
     * Open start rental modal
     */
    openStartRentalModal(rentalId) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const modal = document.getElementById('modal-start-rental');
        if (!modal) {
            // Fallback
            this.startRental(rentalId);
            return;
        }
        
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'Customer';
        const vehicleName = rental.vehicle 
            ? `${rental.vehicle.year} ${rental.vehicle.make} ${rental.vehicle.model}`
            : 'Vehicle';
        
        document.getElementById('start-rental-id').value = rentalId;
        document.getElementById('start-rental-customer-name').textContent = customerName;
        document.getElementById('start-rental-vehicle-name').textContent = vehicleName;
        document.getElementById('start-rental-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('start-rental-mileage').value = rental.vehicle?.current_mileage || '';
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close start rental modal
     */
    closeStartRentalModal() {
        const modal = document.getElementById('modal-start-rental');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Submit start rental
     */
    async submitStartRental() {
        const rentalId = document.getElementById('start-rental-id')?.value;
        const startDate = document.getElementById('start-rental-date')?.value;
        const startMileage = parseInt(document.getElementById('start-rental-mileage')?.value) || 0;
        
        if (!rentalId || !startDate) {
            Utils.toastError('Please fill all required fields');
            return;
        }
        
        await this.startRental(rentalId, startDate, startMileage);
    },
    
    /**
     * Start rental
     */
    async startRental(rentalId, startDate = null, startMileage = 0) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        if (!startDate) {
            startDate = new Date().toISOString().split('T')[0];
        }
        
        if (!startMileage && rental.vehicle?.current_mileage) {
            startMileage = rental.vehicle.current_mileage;
        }
        
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'Customer';
        
        try {
            Utils.toastInfo('Starting rental...');
            
            // Calculate next payment date
            const nextPayment = new Date(startDate);
            nextPayment.setDate(nextPayment.getDate() + 7);
            
            const { error } = await db
                .from('rentals')
                .update({
                    rental_status: 'active',
                    start_date: startDate,
                    start_mileage: startMileage,
                    next_payment_due: nextPayment.toISOString().split('T')[0],
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (error) throw error;
            
            // Update vehicle to Rented
            if (rental.vehicle_id) {
                await db
                    .from('vehicles')
                    .update({ 
                        vehicle_status: 'Rented',
                        current_mileage: startMileage || undefined,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', rental.vehicle_id);
            }
            
            Utils.toastSuccess(`Rental for ${customerName} is now active!`);
            this.closeStartRentalModal();
            await this.load();
            
            // Also refresh vehicles and dashboard
            if (typeof Vehicles !== 'undefined' && Vehicles.load) {
                Vehicles.load();
            }
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error starting rental:', error);
            Utils.toastError('Failed to start rental: ' + error.message);
        }
    },
    
    /* ============================================
       RECORD PAYMENT
    ============================================ */
    
    /**
     * Open record payment modal
     */
    openRecordPaymentModal(rentalId) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const modal = document.getElementById('modal-record-payment');
        if (!modal) {
            Utils.toastInfo('Payment modal coming soon');
            return;
        }
        
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'Customer';
        
        document.getElementById('payment-rental-id').value = rentalId;
        document.getElementById('payment-customer-id').value = rental.customer_id || '';
        document.getElementById('payment-customer-name').textContent = customerName;
        document.getElementById('payment-rental-rate').textContent = `$${rental.weekly_rate}/wk`;
        document.getElementById('payment-balance').textContent = `$${parseFloat(rental.balance_remaining || 0).toLocaleString()}`;
        document.getElementById('payment-amount').value = rental.weekly_rate || 400;
        document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('payment-method').value = 'Zelle';
        document.getElementById('payment-notes').value = '';
        
        // Clear any previous screenshot
        const screenshotPreview = document.getElementById('payment-screenshot-preview');
        if (screenshotPreview) screenshotPreview.innerHTML = '';
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close record payment modal
     */
    closeRecordPaymentModal() {
        const modal = document.getElementById('modal-record-payment');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Preview payment screenshot
     */
    previewPaymentScreenshot() {
        const input = document.getElementById('payment-screenshot');
        const preview = document.getElementById('payment-screenshot-preview');
        
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.innerHTML = `<img src="${e.target.result}" alt="Screenshot preview">`;
            };
            reader.readAsDataURL(input.files[0]);
        }
    },
    
    /**
     * Submit payment
     */
    async submitPayment() {
        const rentalId = document.getElementById('payment-rental-id')?.value;
        const customerId = document.getElementById('payment-customer-id')?.value;
        const amount = parseFloat(document.getElementById('payment-amount')?.value) || 0;
        const paymentDate = document.getElementById('payment-date')?.value;
        const paymentMethod = document.getElementById('payment-method')?.value;
        const notes = document.getElementById('payment-notes')?.value || '';
        
        if (!rentalId || amount <= 0 || !paymentDate) {
            Utils.toastError('Please fill all required fields');
            return;
        }
        
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        try {
            Utils.toastInfo('Recording payment...');
            
            // Handle screenshot upload if present
            let screenshotUrl = null;
            const screenshotInput = document.getElementById('payment-screenshot');
            if (screenshotInput?.files?.length > 0) {
                const file = screenshotInput.files[0];
                const fileName = `payment_${Date.now()}_${file.name}`;
                
                const { error: uploadError } = await db.storage
                    .from('payment-screenshots')
                    .upload(fileName, file);
                
                if (!uploadError) {
                    const { data: urlData } = db.storage
                        .from('payment-screenshots')
                        .getPublicUrl(fileName);
                    screenshotUrl = urlData?.publicUrl;
                }
            }
            
            // Generate payment ID
            const { data: lastPayment } = await db
                .from('payments')
                .select('payment_id')
                .order('created_at', { ascending: false })
                .limit(1);
            
            let paymentId = 'P001';
            if (lastPayment && lastPayment.length > 0 && lastPayment[0].payment_id) {
                const lastNum = parseInt(lastPayment[0].payment_id.replace('P', '')) || 0;
                paymentId = 'P' + String(lastNum + 1).padStart(3, '0');
            }
            
            // Check if late
            const isLate = rental.next_payment_due && new Date(paymentDate) > new Date(rental.next_payment_due);
            const daysLate = isLate 
                ? Math.floor((new Date(paymentDate) - new Date(rental.next_payment_due)) / (1000 * 60 * 60 * 24))
                : 0;
            
            // Insert payment record
            const paymentData = {
                payment_id: paymentId,
                rental_id: rentalId,
                customer_id: customerId,
                paid_amount: amount,
                paid_date: paymentDate,
                due_date: rental.next_payment_due,
                payment_method: paymentMethod,
                payment_screenshot_url: screenshotUrl,
                payment_status: 'Confirmed',
                is_late: isLate,
                days_late: daysLate,
                notes: notes,
                approved_by: 'Admin',
                approved_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            const { error: paymentError } = await db
                .from('payments')
                .insert([paymentData]);
            
            if (paymentError) throw paymentError;
            
            // Update rental
            const newPaid = (parseFloat(rental.total_amount_paid) || 0) + amount;
            const newBalance = (parseFloat(rental.total_amount_due) || 0) - newPaid;
            const nextPayment = new Date(paymentDate);
            nextPayment.setDate(nextPayment.getDate() + 7);
            
            const { error: updateError } = await db
                .from('rentals')
                .update({
                    total_amount_paid: newPaid,
                    balance_remaining: newBalance,
                    last_payment_date: paymentDate,
                    next_payment_due: nextPayment.toISOString().split('T')[0],
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (updateError) throw updateError;
            
            Utils.toastSuccess('Payment recorded successfully!');
            this.closeRecordPaymentModal();
            await this.load();
            
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error recording payment:', error);
            Utils.toastError('Failed to record payment: ' + error.message);
        }
    },
    
    /* ============================================
       END RENTAL
    ============================================ */
    
    /**
     * Open end rental modal
     */
    openEndRentalModal(rentalId) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const modal = document.getElementById('modal-end-rental');
        if (!modal) {
            Utils.toastInfo('End rental modal coming soon');
            return;
        }
        
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'Customer';
        const vehicleName = rental.vehicle 
            ? `${rental.vehicle.year} ${rental.vehicle.make} ${rental.vehicle.model}`
            : 'Vehicle';
        
        document.getElementById('end-rental-id').value = rentalId;
        document.getElementById('end-rental-customer-name').textContent = customerName;
        document.getElementById('end-rental-vehicle-name').textContent = vehicleName;
        document.getElementById('end-rental-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('end-rental-mileage').value = '';
        document.getElementById('end-rental-start-mileage').textContent = (rental.start_mileage || 0).toLocaleString();
        document.getElementById('end-rental-deposit').textContent = `$${parseFloat(rental.deposit_amount || 0).toLocaleString()}`;
        document.getElementById('end-rental-balance').textContent = `$${parseFloat(rental.balance_remaining || 0).toLocaleString()}`;
        document.getElementById('end-rental-deductions').value = '0';
        document.getElementById('end-rental-deduction-reason').value = '';
        this.calculateDepositReturn();
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close end rental modal
     */
    closeEndRentalModal() {
        const modal = document.getElementById('modal-end-rental');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Calculate deposit return amount
     */
    calculateDepositReturn() {
        const rentalId = document.getElementById('end-rental-id')?.value;
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) return;
        
        const deposit = parseFloat(rental.deposit_amount) || 0;
        const balance = parseFloat(rental.balance_remaining) || 0;
        const deductions = parseFloat(document.getElementById('end-rental-deductions')?.value) || 0;
        
        let returnAmount = deposit - balance - deductions;
        if (returnAmount < 0) returnAmount = 0;
        
        const el = document.getElementById('end-rental-return-amount');
        if (el) el.textContent = `$${returnAmount.toLocaleString()}`;
    },
    
    /**
     * Submit end rental
     */
    async submitEndRental() {
        const rentalId = document.getElementById('end-rental-id')?.value;
        const endDate = document.getElementById('end-rental-date')?.value;
        const endMileage = parseInt(document.getElementById('end-rental-mileage')?.value) || 0;
        const deductions = parseFloat(document.getElementById('end-rental-deductions')?.value) || 0;
        const deductionReason = document.getElementById('end-rental-deduction-reason')?.value || '';
        
        if (!rentalId || !endDate) {
            Utils.toastError('Please fill all required fields');
            return;
        }
        
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const customerName = rental.customer 
            ? `${rental.customer.first_name || ''} ${rental.customer.last_name || ''}`.trim()
            : 'Customer';
        
        const confirmed = confirm(`End rental for ${customerName}?\n\nThis will mark the rental as completed and make the vehicle available.`);
        if (!confirmed) return;
        
        try {
            Utils.toastInfo('Ending rental...');
            
            // Calculate total miles
            const startMileage = rental.start_mileage || 0;
            const totalMiles = endMileage > startMileage ? endMileage - startMileage : 0;
            
            // Calculate final deposit return
            const deposit = parseFloat(rental.deposit_amount) || 0;
            const balance = parseFloat(rental.balance_remaining) || 0;
            let depositReturn = deposit - balance - deductions;
            if (depositReturn < 0) depositReturn = 0;
            
            // Build notes
            let endNotes = rental.notes || '';
            if (deductions > 0) {
                endNotes += `\n\nDeductions at end: $${deductions}`;
                if (deductionReason) endNotes += ` - ${deductionReason}`;
            }
            endNotes += `\nDeposit returned: $${depositReturn}`;
            
            const { error } = await db
                .from('rentals')
                .update({
                    rental_status: 'completed',
                    end_date: endDate,
                    end_mileage: endMileage,
                    total_miles_driven: totalMiles,
                    notes: endNotes.trim(),
                    completed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (error) throw error;
            
            // Update vehicle to Available
            if (rental.vehicle_id) {
                await db
                    .from('vehicles')
                    .update({ 
                        vehicle_status: 'Available',
                        current_mileage: endMileage || undefined,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', rental.vehicle_id);
            }
            
            Utils.toastSuccess(`Rental for ${customerName} completed!`);
            this.closeEndRentalModal();
            await this.load();
            
            // Refresh vehicles and dashboard
            if (typeof Vehicles !== 'undefined' && Vehicles.load) {
                Vehicles.load();
            }
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error ending rental:', error);
            Utils.toastError('Failed to end rental: ' + error.message);
        }
    },
    
    /* ============================================
       UTILITIES
    ============================================ */
    
    /**
     * Refresh rentals data
     */
    async refresh() {
        Utils.toastInfo('Refreshing...');
        await this.load();
        Utils.toastSuccess('Rentals refreshed');
    }
};

// Export
window.Rentals = Rentals;
