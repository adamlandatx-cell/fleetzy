/* ============================================
   FLEETZY ADMIN - RENTALS MODULE
   Full rental management with status workflows
   TIMEZONE FIX: Jan 18, 2025 - Fixed date calculations
   ============================================ */

/**
 * Parse a date string as LOCAL time (not UTC)
 * CRITICAL: "2025-01-16" must mean Jan 16 in Houston, not UTC
 * Without this fix, Friday becomes Saturday/Sunday due to timezone shift
 */
function parseLocalDateForRentals(dateStr) {
    if (!dateStr) return new Date();
    // Parse as local time by extracting components
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Format a Date object to YYYY-MM-DD string in LOCAL time
 * This ensures the date stored matches the date selected
 */
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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
     * FIXED: Using correct column names (full_name instead of first_name/last_name)
     * FIXED: Jan 19, 2025 - Filter out pending_approval applications from main view
     *        Those are NEW APPLICATIONS (shown in Customers tab), not actual rentals
     */
    async load() {
        try {
            // Load rentals with related data - using correct column names
            const { data: rentals, error } = await db
                .from('rentals')
                .select(`
                    *,
                    customer:customer_id(id, customer_id, full_name, phone, email, selfie_url),
                    vehicle:vehicle_id(id, vehicle_id, make, model, year, license_plate, image_url)
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Store ALL rentals for reference
            this.allData = rentals || [];
            
            // FILTER OUT pending_approval - those are NEW APPLICATIONS, not rentals!
            // They should appear in Customers tab, not Rentals tab
            // A rental only becomes a "real rental" after admin approves the application
            this.data = this.allData.filter(r => {
                // Include all rentals EXCEPT pending_approval (new applications)
                // pending_approval rentals have no vehicle assigned yet - they're just applications
                return r.rental_status !== 'pending_approval';
            });
            
            this.filtered = [...this.data];
            this.render();
            this.updateStats();
            this.updateSidebarBadge();
            
            const excludedCount = this.allData.length - this.data.length;
            console.log(`✅ Loaded ${this.data.length} rentals (${excludedCount} pending applications excluded - shown in Customers tab)`);
        } catch (error) {
            console.error('❌ Error loading rentals:', error);
            Utils.toastError('Failed to load rentals');
        }
    },
    
    /**
     * Load available customers for new rental dropdown
     * FIXED: Using correct column names and status values
     */
    async loadAvailableCustomers() {
        try {
            // Load all customers - filter in JS for flexibility
            const { data, error } = await db
                .from('customers')
                .select('*')
                .order('full_name');
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            console.log('📋 All customers from DB:', data?.length || 0);
            
            // Accept customers with status: approved, active, pending, or null/empty
            // This allows flexibility for manually added customers
            let availableCustomers = (data || []).filter(c => {
                const status = (c.status || '').toLowerCase();
                return status === 'approved' || 
                       status === 'active' || 
                       status === 'pending' ||
                       !status; // Include customers with no status
            });
            
            // Filter out customers who already have active rentals
            const activeRentalCustomerIds = this.data
                .filter(r => ['active', 'pending_rental'].includes(r.rental_status))
                .map(r => r.customer_id);
            
            this.customers = availableCustomers.filter(c => !activeRentalCustomerIds.includes(c.id));
            
            console.log('✅ Available customers for rental:', this.customers.length);
            
            return this.customers;
        } catch (error) {
            console.error('Error loading customers:', error);
            Utils.toastError('Failed to load customers');
            return [];
        }
    },
    
    /**
     * Load available vehicles for new rental dropdown
     */
    async loadAvailableVehicles() {
        try {
            // Load vehicles with status = 'Available' (available for rent)
            const { data, error } = await db
                .from('vehicles')
                .select('*')
                .eq('status', 'Available')
                .order('make');
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            this.vehicles = data || [];
            console.log('✅ Available vehicles for rental:', this.vehicles.length);
            
            return this.vehicles;
        } catch (error) {
            console.error('Error loading vehicles:', error);
            Utils.toastError('Failed to load vehicles');
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
     * FIXED: Using full_name for customer search
     */
    filter() {
        const searchTerm = document.getElementById('rentals-search')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('rentals-status-filter')?.value || '';
        
        this.filtered = this.data.filter(rental => {
            // Search filter - customer name, vehicle info (using full_name)
            const customerName = (rental.customer?.full_name || '').toLowerCase();
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
            .reduce((sum, r) => sum + (parseFloat(r.initial_payment) || 0), 0);
        
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
     * FIXED: Using full_name instead of first_name/last_name
     */
    renderRow(rental) {
        const statusClass = this.getStatusClass(rental.rental_status);
        const statusLabel = this.formatStatus(rental.rental_status);
        
        // Customer info - using full_name
        const customerName = rental.customer?.full_name || 'Unknown Customer';
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
        
        // Payment info - using actual column names
        const weeklyRate = parseFloat(rental.weekly_rate) || 400;
        // Note: next_payment_due doesn't exist in schema, calculate from start_date if needed
        const nextPayment = '-'; // Would need separate payments table logic
        const isOverdue = false; // Would need payment tracking logic
        
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
                    <button class="btn-icon" onclick="Rentals.openEditRentalModal('${rental.id}')" title="Edit Rental">
                        <i class="fas fa-edit"></i>
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
                    <button class="btn-icon" onclick="Rentals.openEditRentalModal('${rental.id}')" title="Edit Rental">
                        <i class="fas fa-edit"></i>
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
    /**
     * View rental details with full ledger
     * Enhanced to show payments, charges, and running balance
     */
    async view(rentalId) {
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
            ? rental.customer?.full_name || 'Customer'
            : 'Unknown';
        const vehicleName = rental.vehicle 
            ? `${rental.vehicle.year} ${rental.vehicle.make} ${rental.vehicle.model}`
            : 'No Vehicle';
        
        const content = document.getElementById('view-rental-content');
        if (content) {
            // Show loading first
            content.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--primary);"></i>
                    <p style="margin-top: 12px; color: var(--text-secondary);">Loading rental details...</p>
                </div>
            `;
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Fetch payments and charges
            let payments = [];
            let charges = [];
            
            try {
                const [paymentsRes, chargesRes] = await Promise.all([
                    db.from('payments')
                        .select('*')
                        .eq('rental_id', rentalId)
                        .order('paid_date', { ascending: true }),
                    db.from('rental_charges')
                        .select('*')
                        .eq('rental_id', rentalId)
                        .order('charge_date', { ascending: true })
                ]);
                
                payments = paymentsRes.data || [];
                charges = chargesRes.data || [];
            } catch (err) {
                console.log('Could not fetch ledger data:', err);
            }
            
            // Build ledger entries
            const ledgerEntries = [];
            const originalRate = parseFloat(rental.weekly_rate) || 400;
            const currentRate = parseFloat(rental.current_weekly_rate) || originalRate;
            const rateChangeDate = rental.rate_change_date ? parseLocalDateForRentals(rental.rate_change_date) : null;
            const depositAmount = parseFloat(rental.deposit_amount || rental.deposit_included) || 250;
            const startDate = rental.start_date ? parseLocalDateForRentals(rental.start_date) : new Date();
            
            // Calculate weeks since start
            const today = new Date();
            const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
            const weeksSinceStart = Math.max(0, Math.ceil(daysSinceStart / 7));
            
            // Add weekly rent due entries
            for (let week = 0; week <= weeksSinceStart; week++) {
                const weekDate = new Date(startDate);
                weekDate.setDate(weekDate.getDate() + (week * 7));
                
                // Skip if this week hasn't started yet
                if (weekDate > today) break;
                
                // Determine which rate to use for this week
                // Use original rate if: no rate change, OR week is before rate change date
                // Use current rate if: week is on or after rate change date
                const useOriginalRate = !rateChangeDate || weekDate < rateChangeDate;
                const weeklyRate = useOriginalRate ? originalRate : currentRate;
                
                // First week includes deposit
                if (week === 0) {
                    ledgerEntries.push({
                        type: 'rent',
                        date: weekDate,
                        description: 'Deposit + Week 1',
                        amount: weeklyRate + depositAmount,
                        isDebit: true
                    });
                } else {
                    // Show rate indicator if rate changed for this week
                    const rateNote = (!useOriginalRate && originalRate !== currentRate) ? ' ✓' : '';
                    ledgerEntries.push({
                        type: 'rent',
                        date: weekDate,
                        description: `Week ${week + 1} Rent${rateNote}`,
                        amount: weeklyRate,
                        isDebit: true
                    });
                }
            }
            
            // Add charges
            for (const charge of charges) {
                const chargeDate = charge.charge_date ? parseLocalDateForRentals(charge.charge_date) : new Date(charge.created_at);
                ledgerEntries.push({
                    type: 'charge',
                    date: chargeDate,
                    description: charge.description || charge.charge_type.replace('_', ' '),
                    amount: parseFloat(charge.amount),
                    isDebit: true,
                    chargeType: charge.charge_type,
                    status: charge.status,
                    id: charge.id
                });
            }
            
            // Add payments
            for (const payment of payments) {
                if (payment.payment_status === 'paid' && payment.paid_amount) {
                    const paidDate = payment.paid_date ? new Date(payment.paid_date) : new Date(payment.created_at);
                    ledgerEntries.push({
                        type: 'payment',
                        date: paidDate,
                        description: `Payment - ${payment.payment_method || 'Unknown'}`,
                        amount: parseFloat(payment.paid_amount),
                        isDebit: false,
                        paymentType: payment.payment_type
                    });
                }
            }
            
            // Sort by date
            ledgerEntries.sort((a, b) => a.date - b.date);
            
            // Calculate running balance
            let runningBalance = 0;
            for (const entry of ledgerEntries) {
                if (entry.isDebit) {
                    runningBalance += entry.amount;
                } else {
                    runningBalance -= entry.amount;
                }
                entry.balance = runningBalance;
            }
            
            // Calculate totals
            const totalPaid = payments.filter(p => p.payment_status === 'paid')
                .reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
            const totalCharges = charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
            const pendingCharges = charges.filter(c => c.status === 'pending');
            const pendingChargesTotal = pendingCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
            
            // Format balance display
            const balanceClass = runningBalance > 0 ? 'danger' : 'success';
            const balanceLabel = runningBalance > 0 ? 'Balance Due' : (runningBalance < 0 ? 'Credit' : 'Balanced');
            
            // Generate ledger HTML
            const ledgerHTML = ledgerEntries.length > 0 ? `
                <div class="ledger-table-container" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-primary); border-radius: 8px; margin-top: 8px;">
                    <table class="ledger-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead style="position: sticky; top: 0; background: var(--bg-secondary);">
                            <tr>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--border-primary); font-weight: 600;">Date</th>
                                <th style="padding: 10px; text-align: left; border-bottom: 1px solid var(--border-primary); font-weight: 600;">Description</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid var(--border-primary); font-weight: 600;">Amount</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 1px solid var(--border-primary); font-weight: 600;">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ledgerEntries.map(entry => {
                                const dateStr = entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                const icon = entry.type === 'payment' ? 'fa-check-circle' : 
                                             entry.type === 'charge' ? 'fa-exclamation-circle' : 
                                             'fa-calendar-week';
                                const iconColor = entry.type === 'payment' ? 'var(--success)' : 
                                                  entry.type === 'charge' ? 'var(--warning)' : 
                                                  'var(--primary)';
                                const amountColor = entry.isDebit ? 'var(--text-primary)' : 'var(--success)';
                                const amountPrefix = entry.isDebit ? '+' : '-';
                                const balColor = entry.balance > 0 ? 'var(--danger)' : 'var(--success)';
                                const statusBadge = entry.status === 'pending' ? '<span style="background: var(--warning); color: #000; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">PENDING</span>' : '';
                                
                                return `
                                    <tr style="border-bottom: 1px solid var(--border-primary);">
                                        <td style="padding: 10px; color: var(--text-secondary);">${dateStr}</td>
                                        <td style="padding: 10px;">
                                            <i class="fas ${icon}" style="color: ${iconColor}; margin-right: 6px;"></i>
                                            ${entry.description}${statusBadge}
                                        </td>
                                        <td style="padding: 10px; text-align: right; font-weight: 500; color: ${amountColor};">${amountPrefix}$${entry.amount.toFixed(2)}</td>
                                        <td style="padding: 10px; text-align: right; font-weight: 600; color: ${balColor};">
                                            ${entry.balance >= 0 ? '' : '-'}$${Math.abs(entry.balance).toFixed(2)}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p style="color: var(--text-secondary); padding: 20px; text-align: center;">No transactions yet</p>';
            
            // Generate pending charges HTML
            const pendingChargesHTML = pendingCharges.length > 0 ? `
                <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <div style="font-weight: 600; color: var(--warning); margin-bottom: 8px;">
                        <i class="fas fa-exclamation-triangle"></i> Pending Charges
                    </div>
                    ${pendingCharges.map(charge => `
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(245, 158, 11, 0.2);">
                            <span>${charge.description || charge.charge_type.replace('_', ' ')}</span>
                            <div>
                                <span style="font-weight: 600; color: var(--warning);">$${parseFloat(charge.amount).toFixed(2)}</span>
                                <button onclick="Charges.waiveCharge('${charge.id}')" style="margin-left: 8px; background: none; border: none; color: var(--text-tertiary); cursor: pointer;" title="Waive">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '';
            
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
                            <span class="detail-value">${rental.start_date ? new Date(rental.start_date + 'T00:00:00').toLocaleDateString() : 'Not started'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">End Date</span>
                            <span class="detail-value">${rental.end_date ? new Date(rental.end_date + 'T00:00:00').toLocaleDateString() : 'Ongoing'}</span>
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
                    </div>
                    
                    <div class="detail-section">
                        <h4><i class="fas fa-dollar-sign"></i> Account Summary</h4>
                        <div class="detail-row">
                            <span class="detail-label">Weekly Rate</span>
                            <span class="detail-value">${
                                originalRate !== currentRate 
                                    ? `<span style="text-decoration: line-through; color: var(--text-tertiary);">$${originalRate.toFixed(2)}</span> → <span style="color: var(--success);">$${currentRate.toFixed(2)}</span>`
                                    : `$${originalRate.toFixed(2)}`
                            }</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Total Paid</span>
                            <span class="detail-value" style="color: var(--success);">$${totalPaid.toFixed(2)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Total Charges</span>
                            <span class="detail-value" style="color: var(--warning);">$${totalCharges.toFixed(2)}</span>
                        </div>
                        <div class="detail-row" style="border-top: 1px solid var(--border-primary); padding-top: 8px; margin-top: 8px;">
                            <span class="detail-label" style="font-weight: 600;">${balanceLabel}</span>
                            <span class="detail-value" style="font-weight: 700; font-size: 18px; color: var(--${balanceClass});">
                                ${runningBalance >= 0 ? '' : '-'}$${Math.abs(runningBalance).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Pending Charges Section -->
                ${pendingChargesHTML}
                
                <!-- Transaction Ledger -->
                <div class="detail-section full-width" style="margin-top: 16px;">
                    <h4 style="display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fas fa-list-alt"></i> Transaction Ledger</span>
                        <button class="btn btn-sm btn-secondary" onclick="Charges.openAddChargeModal('${rental.id}')" style="font-size: 12px;">
                            <i class="fas fa-plus"></i> Add Charge
                        </button>
                    </h4>
                    ${ledgerHTML}
                </div>
                
                ${rental.pickup_inspection_notes ? `
                    <div class="detail-section full-width">
                        <h4><i class="fas fa-sticky-note"></i> Pickup Notes</h4>
                        <p class="notes-text">${rental.pickup_inspection_notes}</p>
                    </div>
                ` : ''}
            `;
        }
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
    async viewContract(rentalId) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        // First check if rental has contract_id
        if (rental.contract_id) {
            try {
                // Fetch contract details from contracts table
                const { data: contract, error } = await db
                    .from('contracts')
                    .select('contract_pdf_url')
                    .eq('id', rental.contract_id)
                    .single();
                
                if (error) throw error;
                
                if (contract?.contract_pdf_url) {
                    window.open(contract.contract_pdf_url, '_blank');
                    return;
                }
            } catch (error) {
                console.error('Error fetching contract:', error);
            }
        }
        
        // Fallback to legacy contract_url field
        if (rental.contract_url) {
            window.open(rental.contract_url, '_blank');
            return;
        }
        
        // No contract found - offer to generate one
        const confirmed = confirm('No contract found for this rental.\n\nWould you like to generate one now?');
        if (confirmed) {
            const customerName = rental.customer?.full_name || 'Customer';
            await this.generateContract(rentalId, customerName);
            // Reload to get updated data
            await this.load();
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
            ? rental.customer?.full_name || 'Customer'
            : 'Customer';
        
        const confirmed = confirm("Approve rental for " + customerName + "?\n\nThis will move the rental to 'Awaiting Pickup' status.");
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
                        status: 'Reserved',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', rental.vehicle_id);
            }
            
            Utils.toastSuccess(`Rental for ${customerName} approved!`);
            
            // Generate contract PDF
            await this.generateContract(rentalId, customerName);
            
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
     * Generate contract PDF via n8n webhook
     * Called after rental is approved or created
     */
    async generateContract(rentalId, customerName = 'Customer') {
        const webhookUrl = CONFIG.webhooks?.contractGeneration;
        
        if (!webhookUrl || webhookUrl === 'YOUR_N8N_WEBHOOK_URL_HERE') {
            console.warn('⚠️ Contract generation webhook not configured');
            Utils.toastInfo('Contract generation not yet configured - skipping');
            return null;
        }
        
        try {
            Utils.toastInfo('Generating contract PDF...');
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rental_id: rentalId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.pdf_url) {
                console.log('✅ Contract generated:', result.contract_id);
                Utils.toastSuccess(`Contract ready for ${customerName}!`);
                return result;
            } else {
                throw new Error(result.message || 'Contract generation failed');
            }
            
        } catch (error) {
            console.error('❌ Contract generation error:', error);
            Utils.toastError('Contract generation failed - you can generate it manually later');
            return null;
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
            ? rental.customer?.full_name || 'Customer'
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
            ? rental.customer?.full_name || 'Customer'
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
                        status: 'Available',
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
        
        // Populate customer dropdown - using full_name
        const customerSelect = document.getElementById('new-rental-customer');
        if (customerSelect) {
            if (this.customers.length === 0) {
                customerSelect.innerHTML = '<option value="">No customers available</option>';
            } else {
                customerSelect.innerHTML = '<option value="">Select a customer...</option>' +
                    this.customers.map(c => {
                        const name = c.full_name || 'Unknown';
                        const phone = c.phone || 'No phone';
                        const status = c.status ? ` [${c.status}]` : '';
                        return `<option value="${c.id}">${name} (${phone})${status}</option>`;
                    }).join('');
            }
        }
        
        // Populate vehicle dropdown - vehicles don't have weekly_rate, use default
        const vehicleSelect = document.getElementById('new-rental-vehicle');
        if (vehicleSelect) {
            if (this.vehicles.length === 0) {
                vehicleSelect.innerHTML = '<option value="">No vehicles available</option>';
            } else {
                vehicleSelect.innerHTML = '<option value="">Select a vehicle...</option>' +
                    this.vehicles.map(v => {
                        const name = `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim();
                        const plate = v.license_plate || 'No plate';
                        return `<option value="${v.id}">${name} - ${plate}</option>`;
                    }).join('');
            }
        }
        
        // Set defaults
        document.getElementById('new-rental-start-date').value = formatLocalDate(new Date());
        document.getElementById('new-rental-weeks').value = '4';
        document.getElementById('new-rental-weeks').disabled = false;
        document.getElementById('new-rental-weeks').placeholder = '';
        document.getElementById('new-rental-weekly-rate').value = '400';
        document.getElementById('new-rental-deposit').value = '500';
        document.getElementById('new-rental-notes').value = '';
        
        // Reset ongoing checkbox
        const ongoingCheckbox = document.getElementById('new-rental-ongoing');
        if (ongoingCheckbox) ongoingCheckbox.checked = false;
        
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
        // Auto-fill mileage from selected vehicle
        const vehicleId = document.getElementById('new-rental-vehicle')?.value;
        const vehicle = this.vehicles.find(v => v.id === vehicleId);
        
        if (vehicle && vehicle.current_mileage) {
            const mileageInput = document.getElementById('new-rental-start-mileage');
            if (mileageInput) {
                mileageInput.value = vehicle.current_mileage;
            }
        }
        
        this.calculateNewRentalTotal();
    },
    
    /**
     * Toggle ongoing rental checkbox
     */
    toggleOngoing() {
        const isOngoing = document.getElementById('new-rental-ongoing')?.checked;
        const weeksInput = document.getElementById('new-rental-weeks');
        
        if (weeksInput) {
            weeksInput.disabled = isOngoing;
            if (isOngoing) {
                weeksInput.value = '';
                weeksInput.placeholder = 'Ongoing';
            } else {
                weeksInput.value = '4';
                weeksInput.placeholder = '';
            }
        }
        
        this.calculateNewRentalTotal();
    },
    
    /**
     * Calculate total for new rental
     * Shows appropriate amount based on fixed-term vs ongoing
     */
    calculateNewRentalTotal() {
        const isOngoing = document.getElementById('new-rental-ongoing')?.checked;
        const weeks = parseInt(document.getElementById('new-rental-weeks')?.value) || 0;
        const rate = parseFloat(document.getElementById('new-rental-weekly-rate')?.value) || 0;
        const deposit = parseFloat(document.getElementById('new-rental-deposit')?.value) || 0;
        
        const totalEl = document.getElementById('new-rental-total');
        const noteEl = document.getElementById('new-rental-total-note');
        
        if (isOngoing) {
            // Ongoing rental: deposit + first week due at pickup
            const pickupAmount = deposit + rate;
            if (totalEl) totalEl.textContent = '$' + pickupAmount.toLocaleString();
            if (noteEl) {
                noteEl.style.display = 'block';
                noteEl.innerHTML = `Includes <strong>$${deposit.toLocaleString()}</strong> deposit + first week. Then <strong>$${rate.toLocaleString()}/week</strong> ongoing.`;
            }
        } else {
            // Fixed-term rental: total contract amount
            const total = (weeks * rate) + deposit;
            if (totalEl) totalEl.textContent = '$' + total.toLocaleString();
            if (noteEl) {
                noteEl.style.display = 'block';
                noteEl.innerHTML = `<strong>$${deposit.toLocaleString()}</strong> deposit + <strong>${weeks} weeks</strong> × $${rate.toLocaleString()}/week`;
            }
        }
    },
    
    /**
     * Create new rental
     * FIXED: Handles ongoing rentals properly
     */
    async createRental() {
        const customerId = document.getElementById('new-rental-customer')?.value;
        const vehicleId = document.getElementById('new-rental-vehicle')?.value;
        const startDate = document.getElementById('new-rental-start-date')?.value;
        const isOngoing = document.getElementById('new-rental-ongoing')?.checked;
        const weeks = isOngoing ? null : (parseInt(document.getElementById('new-rental-weeks')?.value) || 4);
        const weeklyRate = parseFloat(document.getElementById('new-rental-weekly-rate')?.value) || 400;
        const deposit = parseFloat(document.getElementById('new-rental-deposit')?.value) || 500;
        const rentalId = document.getElementById('new-rental-id')?.value;
        const startMileage = parseInt(document.getElementById('new-rental-start-mileage')?.value) || 0;
        let notes = document.getElementById('new-rental-notes')?.value || '';
        
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
        
        // Calculate amounts based on rental type
        let initialPaymentAmount;
        let totalAmountDue;
        
        if (isOngoing) {
            // Ongoing: initial payment = deposit + first week
            initialPaymentAmount = deposit + weeklyRate;
            // For ongoing rentals, total_amount_due = just first week (ongoing adds more each week)
            totalAmountDue = weeklyRate;
            notes = (notes ? notes + '\n' : '') + 'ONGOING RENTAL (Week-to-Week)';
        } else {
            // Fixed-term: initial payment = deposit + all weeks
            initialPaymentAmount = (weeks * weeklyRate) + deposit;
            // Total due = all weeks (deposit is separate/refundable)
            totalAmountDue = weeks * weeklyRate;
        }
        
        // Get payment method from form (defaults to Zelle if not specified)
        const paymentMethod = document.getElementById('new-rental-payment-method')?.value || 'Zelle';
        
        // Calculate first payment due date (7 days from start) - USE LOCAL DATE
        const firstPaymentDue = parseLocalDateForRentals(startDate);
        firstPaymentDue.setDate(firstPaymentDue.getDate() + 7);
        
        // Build rental data using ACTUAL column names from database
        const rentalData = {
            rental_id: rentalId,
            customer_id: customerId,
            vehicle_id: vehicleId,
            start_date: startDate,
            weekly_rate: weeklyRate,
            weeks_count: weeks,                    // actual column (not weeks_contracted)
            initial_payment: initialPaymentAmount, // actual column (not total_amount_due)
            deposit_included: deposit,             // actual column - NOT NULL
            deposit_amount: deposit,               // also store in deposit_amount
            deposit_status: 'held',
            deposit_balance: deposit,
            payment_method: paymentMethod,         // REQUIRED - NOT NULL in database
            start_mileage: startMileage,           // REQUIRED - NOT NULL in database
            rental_status: 'pending_rental',       // Already approved since admin is creating
            // NEW: Set balance tracking columns
            total_amount_due: totalAmountDue,      // Total rent owed (not including deposit)
            total_amount_paid: 0,                  // Nothing paid yet
            balance_remaining: totalAmountDue,     // Full amount still owed
            next_payment_due: formatLocalDate(firstPaymentDue), // First payment due in 7 days - USE LOCAL FORMAT
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Add notes if provided (check if column exists - may need to add via SQL)
        // For now, we'll skip notes if column doesn't exist
        
        try {
            Utils.toastInfo('Creating rental...');
            
            const { data: insertedRental, error } = await db
                .from('rentals')
                .insert([rentalData])
                .select()
                .single();
            
            if (error) throw error;
            
            // Reserve the vehicle
            await db
                .from('vehicles')
                .update({ 
                    status: 'Reserved',
                    updated_at: new Date().toISOString()
                })
                .eq('id', vehicleId);
            
            Utils.toastSuccess('Rental created successfully!');
            
            // Generate contract PDF for the new rental
            if (insertedRental?.id) {
                // Get customer name for the toast message
                const customer = this.customers.find(c => c.id === customerId);
                const customerName = customer?.full_name || 'Customer';
                await this.generateContract(insertedRental.id, customerName);
            }
            
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
            ? rental.customer?.full_name || 'Customer'
            : 'Customer';
        const vehicleName = rental.vehicle 
            ? `${rental.vehicle.year} ${rental.vehicle.make} ${rental.vehicle.model}`
            : 'Vehicle';
        
        document.getElementById('start-rental-id').value = rentalId;
        document.getElementById('start-rental-customer-name').textContent = customerName;
        document.getElementById('start-rental-vehicle-name').textContent = vehicleName;
        document.getElementById('start-rental-date').value = formatLocalDate(new Date());
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
     * Start rental - UPDATED: Now creates initial payment record
     */
    async startRental(rentalId, startDate = null, startMileage = 0) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        if (!startDate) {
            startDate = formatLocalDate(new Date());
        }
        
        if (!startMileage && rental.vehicle?.current_mileage) {
            startMileage = rental.vehicle.current_mileage;
        }
        
        const customerName = rental.customer 
            ? rental.customer?.full_name || 'Customer'
            : 'Customer';
        
        try {
            Utils.toastInfo('Starting rental...');
            
            // Calculate next payment due date (7 days from start) - USE LOCAL DATE
            const nextPaymentDue = parseLocalDateForRentals(startDate);
            nextPaymentDue.setDate(nextPaymentDue.getDate() + 7);
            
            // Calculate initial balance (weekly rate for first week - deposit already collected)
            const weeklyRate = parseFloat(rental.weekly_rate) || 400;
            const weeksCount = rental.weeks_count;
            
            // For ongoing rentals, total_amount_due starts at one week
            // For fixed-term, it's all weeks
            const totalAmountDue = weeksCount ? (weeksCount * weeklyRate) : weeklyRate;
            
            // Update rental with all tracking columns
            const { error } = await db
                .from('rentals')
                .update({
                    rental_status: 'active',
                    start_date: startDate,
                    start_mileage: startMileage,
                    next_payment_due: formatLocalDate(nextPaymentDue), // USE LOCAL FORMAT
                    // Set balance tracking
                    total_amount_due: totalAmountDue,
                    total_amount_paid: 0,
                    balance_remaining: totalAmountDue,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (error) throw error;
            
            // Update vehicle to Rented
            if (rental.vehicle_id) {
                await db
                    .from('vehicles')
                    .update({ 
                        status: 'Rented',
                        current_mileage: startMileage || undefined,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', rental.vehicle_id);
            }
            
            // CREATE INITIAL PAYMENT RECORD
            // This captures deposit + first week payment at rental start
            await this.createInitialPayment(rental, startDate);
            
            Utils.toastSuccess(`Rental for ${customerName} is now active!`);
            this.closeStartRentalModal();
            await this.load();
            
            // Also refresh vehicles, dashboard, and payments
            if (typeof Vehicles !== 'undefined' && Vehicles.load) {
                Vehicles.load();
            }
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            if (typeof Payments !== 'undefined' && Payments.load) {
                Payments.load();
            }
            
        } catch (error) {
            console.error('Error starting rental:', error);
            Utils.toastError('Failed to start rental: ' + error.message);
        }
    },
    
    /**
     * Create initial payment record when rental starts
     * Records deposit + first week as "initial" payment type
     */
    async createInitialPayment(rental, startDate) {
        try {
            const weeklyRate = parseFloat(rental.weekly_rate) || 400;
            const depositAmount = parseFloat(rental.deposit_amount) || 500;
            const initialTotal = weeklyRate + depositAmount;
            
            // Generate payment ID
            const paymentId = await this.generatePaymentIdForInitial();
            
            // Create the initial payment record
            const { error } = await db
                .from('payments')
                .insert({
                    payment_id: paymentId,
                    rental_id: rental.id,
                    customer_id: rental.customer_id,
                    paid_amount: initialTotal,
                    paid_date: startDate,
                    due_date: startDate, // Initial payment is due at start
                    payment_method: rental.payment_method || 'Cash',
                    payment_status: 'Confirmed',
                    payment_type: 'initial', // NEW: Payment type categorization
                    is_late: false,
                    days_late: 0,
                    notes: `Initial payment: $${depositAmount} deposit + $${weeklyRate} first week`,
                    approved_by: 'System (Rental Start)',
                    approved_at: new Date().toISOString()
                });
            
            if (error) {
                console.error('Error creating initial payment:', error);
                // Don't throw - rental start should still succeed
                Utils.toastInfo('Note: Initial payment record may need manual entry');
            } else {
                console.log(`✅ Initial payment created: ${paymentId} for $${initialTotal}`);
            }
        } catch (error) {
            console.error('Error in createInitialPayment:', error);
            // Don't throw - rental start should still succeed
        }
    },
    
    /**
     * Generate payment ID for initial payment
     */
    async generatePaymentIdForInitial() {
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
            ? rental.customer?.full_name || 'Customer'
            : 'Customer';
        
        document.getElementById('payment-rental-id').value = rentalId;
        document.getElementById('payment-customer-id').value = rental.customer_id || '';
        document.getElementById('payment-customer-name').textContent = customerName;
        document.getElementById('payment-rental-rate').textContent = `$${rental.weekly_rate}/wk`;
        // Show actual balance_remaining
        const balance = parseFloat(rental.balance_remaining) || 0;
        document.getElementById('payment-balance').textContent = Utils.formatCurrency(balance);
        document.getElementById('payment-amount').value = rental.weekly_rate || 400;
        document.getElementById('payment-date').value = formatLocalDate(new Date());
        document.getElementById('payment-method').value = rental.payment_method || 'Zelle';
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
            
            // Check if late based on next_payment_due
            const dueDate = rental.next_payment_due ? new Date(rental.next_payment_due) : null;
            const paidDateObj = new Date(paymentDate);
            const isLate = dueDate && paidDateObj > dueDate;
            const daysLate = isLate 
                ? Math.floor((paidDateObj - dueDate) / (1000 * 60 * 60 * 24))
                : 0;
            const lateFee = isLate ? daysLate * 10 : 0; // $10/day late fee
            
            // Insert payment record with ACTUAL column names from payments table
            const paymentData = {
                payment_id: paymentId,
                rental_id: rentalId,
                customer_id: customerId,
                due_date: rental.next_payment_due || paymentDate,  // NOT NULL
                amount_due: amount,                                 // NOT NULL
                toll_charges: 0,
                damage_charges: 0,
                late_fees: lateFee,
                total_amount: amount + lateFee,                     // NOT NULL
                paid_amount: amount,
                paid_date: paymentDate,
                payment_method: paymentMethod,
                payment_status: 'paid',
                payment_type: 'weekly_rent',
                is_late: isLate,
                days_late: daysLate,
                notes: notes || null,
                approved_by: 'Admin',
                approved_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            const { error: paymentError } = await db
                .from('payments')
                .insert([paymentData]);
            
            if (paymentError) throw paymentError;
            
            // Update rental balance tracking
            const currentPaid = parseFloat(rental.total_amount_paid) || 0;
            const newPaid = currentPaid + amount;
            const totalDue = parseFloat(rental.total_amount_due) || 0;
            
            // For ongoing rentals, add another week to total_amount_due
            let newTotalDue = totalDue;
            if (!rental.weeks_count) {
                // Ongoing rental - add another week
                newTotalDue = totalDue + parseFloat(rental.weekly_rate || 400);
            }
            
            const newBalance = newTotalDue - newPaid;
            
            // FIX: Calculate next payment due based on CURRENT due date, not payment date
            // This keeps rentals on their proper weekly schedule
            let nextDue;
            if (rental.next_payment_due) {
                // Parse current due date and add 7 days
                nextDue = parseLocalDateForRentals(rental.next_payment_due);
                nextDue.setDate(nextDue.getDate() + 7);
            } else {
                // Fallback: use payment date + 7 if no current due date
                nextDue = parseLocalDateForRentals(paymentDate);
                nextDue.setDate(nextDue.getDate() + 7);
            }
            
            const { error: updateError } = await db
                .from('rentals')
                .update({
                    total_amount_paid: newPaid,
                    total_amount_due: newTotalDue,
                    balance_remaining: Math.max(0, newBalance),
                    last_payment_date: paymentDate,
                    next_payment_due: formatLocalDate(nextDue), // USE LOCAL FORMAT
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (updateError) throw updateError;
            
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
            ? rental.customer?.full_name || 'Customer'
            : 'Customer';
        const vehicleName = rental.vehicle 
            ? `${rental.vehicle.year} ${rental.vehicle.make} ${rental.vehicle.model}`
            : 'Vehicle';
        
        document.getElementById('end-rental-id').value = rentalId;
        document.getElementById('end-rental-customer-name').textContent = customerName;
        document.getElementById('end-rental-vehicle-name').textContent = vehicleName;
        document.getElementById('end-rental-date').value = formatLocalDate(new Date());
        document.getElementById('end-rental-mileage').value = '';
        document.getElementById('end-rental-start-mileage').textContent = (rental.start_mileage || 0).toLocaleString();
        document.getElementById('end-rental-deposit').textContent = `$${parseFloat(rental.deposit_amount || rental.deposit_included || 0).toLocaleString()}`;
        // Note: balance_remaining doesn't exist, showing $0
        document.getElementById('end-rental-balance').textContent = '$0';
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
        
        const deposit = parseFloat(rental.deposit_amount || rental.deposit_included) || 0;
        const deductions = parseFloat(document.getElementById('end-rental-deductions')?.value) || 0;
        
        // Since balance_remaining doesn't exist, just use deposit - deductions
        let returnAmount = deposit - deductions;
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
            ? rental.customer?.full_name || 'Customer'
            : 'Customer';
        
        const confirmed = confirm(`End rental for ${customerName}?\n\nThis will mark the rental as completed and make the vehicle available.`);
        if (!confirmed) return;
        
        try {
            Utils.toastInfo('Ending rental...');
            
            // Calculate total miles
            const startMileage = rental.start_mileage || 0;
            const totalMiles = endMileage > startMileage ? endMileage - startMileage : 0;
            
            // Only update columns that EXIST in rentals table
            const { error } = await db
                .from('rentals')
                .update({
                    rental_status: 'completed',
                    end_date: endDate,
                    end_mileage: endMileage,
                    total_miles_driven: totalMiles,
                    return_inspection_notes: deductions > 0 ? `Deductions: $${deductions} - ${deductionReason || 'No reason specified'}` : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', rentalId);
            
            if (error) throw error;
            
            // Update vehicle to Available
            if (rental.vehicle_id) {
                await db
                    .from('vehicles')
                    .update({ 
                        status: 'Available',
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
       EDIT RENTAL
    ============================================ */
    
    /**
     * Open edit rental modal
     * Allows changing vehicle, dates, rates, etc.
     */
    async openEditRentalModal(rentalId) {
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const modal = document.getElementById('modal-edit-rental');
        if (!modal) {
            Utils.toastInfo('Edit rental modal not available');
            return;
        }
        
        // Show loading state
        Utils.toastInfo('Loading rental details...');
        
        // Load all vehicles (both available and the currently assigned one)
        await this.loadAllVehiclesForEdit(rental.vehicle_id);
        
        // Populate the form
        document.getElementById('edit-rental-id').value = rentalId;
        document.getElementById('edit-rental-display-id').textContent = rental.rental_id || 'N/A';
        
        // Customer name
        const customerName = rental.customer?.full_name || 'Unknown Customer';
        document.getElementById('edit-rental-customer-name').textContent = customerName;
        
        // Current vehicle info
        const currentVehicle = rental.vehicle 
            ? `${rental.vehicle.year} ${rental.vehicle.make} ${rental.vehicle.model} (${rental.vehicle.license_plate})`
            : 'No vehicle assigned';
        document.getElementById('edit-rental-current-vehicle').textContent = `Current: ${currentVehicle}`;
        
        // Set vehicle selection
        const vehicleSelect = document.getElementById('edit-rental-vehicle');
        if (vehicleSelect && rental.vehicle_id) {
            vehicleSelect.value = rental.vehicle_id;
        }
        
        // Dates
        if (rental.start_date) {
            document.getElementById('edit-rental-start-date').value = rental.start_date;
        }
        
        // Mileage
        document.getElementById('edit-rental-start-mileage').value = rental.start_mileage || '';
        
        // Weeks and ongoing
        const weeksInput = document.getElementById('edit-rental-weeks');
        const ongoingCheckbox = document.getElementById('edit-rental-ongoing');
        
        if (rental.weeks_contracted) {
            weeksInput.value = rental.weeks_contracted;
            weeksInput.disabled = false;
            ongoingCheckbox.checked = false;
        } else {
            // Ongoing rental
            weeksInput.value = '';
            weeksInput.placeholder = 'Ongoing';
            weeksInput.disabled = true;
            ongoingCheckbox.checked = true;
        }
        
        // Rate and deposit - use current_weekly_rate if available (for rate changes)
        const currentRate = parseFloat(rental.current_weekly_rate) || parseFloat(rental.weekly_rate) || 400;
        document.getElementById('edit-rental-weekly-rate').value = currentRate;
        document.getElementById('edit-rental-deposit').value = parseFloat(rental.deposit_amount || rental.deposit_included) || 500;
        
        // Next payment due
        if (rental.next_payment_due) {
            document.getElementById('edit-rental-next-payment').value = rental.next_payment_due;
        } else {
            document.getElementById('edit-rental-next-payment').value = '';
        }
        
        // Notes
        document.getElementById('edit-rental-notes').value = '';
        
        // Calculate total
        this.calculateEditRentalTotal();
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Load all vehicles for edit dropdown
     * Includes available vehicles AND the currently assigned vehicle
     */
    async loadAllVehiclesForEdit(currentVehicleId) {
        try {
            // Get available vehicles
            const { data: availableVehicles, error: availError } = await db
                .from('vehicles')
                .select('*')
                .eq('status', 'Available')
                .order('make');
            
            if (availError) throw availError;
            
            let allVehicles = availableVehicles || [];
            
            // If there's a current vehicle and it's not in the available list, add it
            if (currentVehicleId) {
                const currentInList = allVehicles.find(v => v.id === currentVehicleId);
                if (!currentInList) {
                    const { data: currentVehicle, error: currError } = await db
                        .from('vehicles')
                        .select('*')
                        .eq('id', currentVehicleId)
                        .single();
                    
                    if (!currError && currentVehicle) {
                        // Add current vehicle at the top with indicator
                        currentVehicle._isCurrent = true;
                        allVehicles.unshift(currentVehicle);
                    }
                }
            }
            
            // Populate dropdown
            const vehicleSelect = document.getElementById('edit-rental-vehicle');
            if (vehicleSelect) {
                vehicleSelect.innerHTML = '<option value="">Select a vehicle...</option>' +
                    allVehicles.map(v => {
                        const name = `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim();
                        const plate = v.license_plate || 'No plate';
                        const status = v._isCurrent ? ' (Currently Assigned)' : '';
                        const statusColor = v._isCurrent ? ' style="background: rgba(16, 185, 129, 0.1);"' : '';
                        return `<option value="${v.id}"${statusColor}>${name} - ${plate}${status}</option>`;
                    }).join('');
            }
            
            this.editVehicles = allVehicles;
            console.log('✅ Loaded vehicles for edit:', allVehicles.length);
            
        } catch (error) {
            console.error('Error loading vehicles for edit:', error);
            Utils.toastError('Failed to load vehicles');
        }
    },
    
    /**
     * Close edit rental modal
     */
    closeEditRentalModal() {
        const modal = document.getElementById('modal-edit-rental');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Toggle ongoing checkbox in edit modal
     */
    toggleEditOngoing() {
        const isOngoing = document.getElementById('edit-rental-ongoing')?.checked;
        const weeksInput = document.getElementById('edit-rental-weeks');
        
        if (weeksInput) {
            weeksInput.disabled = isOngoing;
            if (isOngoing) {
                weeksInput.value = '';
                weeksInput.placeholder = 'Ongoing';
            } else {
                weeksInput.value = '4';
                weeksInput.placeholder = '';
            }
        }
        
        this.calculateEditRentalTotal();
    },
    
    /**
     * Calculate total for edit rental form
     */
    calculateEditRentalTotal() {
        const isOngoing = document.getElementById('edit-rental-ongoing')?.checked;
        const weeks = parseInt(document.getElementById('edit-rental-weeks')?.value) || 0;
        const rate = parseFloat(document.getElementById('edit-rental-weekly-rate')?.value) || 0;
        const deposit = parseFloat(document.getElementById('edit-rental-deposit')?.value) || 0;
        
        const totalEl = document.getElementById('edit-rental-total');
        const noteEl = document.getElementById('edit-rental-total-note');
        
        if (isOngoing) {
            const pickupAmount = deposit + rate;
            if (totalEl) totalEl.textContent = '$' + pickupAmount.toLocaleString();
            if (noteEl) {
                noteEl.innerHTML = `$${deposit.toLocaleString()} deposit + $${rate.toLocaleString()}/week ongoing`;
            }
        } else {
            const total = (weeks * rate) + deposit;
            if (totalEl) totalEl.textContent = '$' + total.toLocaleString();
            if (noteEl) {
                noteEl.innerHTML = `$${deposit.toLocaleString()} deposit + ${weeks} weeks × $${rate.toLocaleString()}/week`;
            }
        }
    },
    
    /**
     * Submit edit rental changes
     */
    async submitEditRental() {
        const rentalId = document.getElementById('edit-rental-id')?.value;
        if (!rentalId) {
            Utils.toastError('Rental ID not found');
            return;
        }
        
        // Get form values
        const newVehicleId = document.getElementById('edit-rental-vehicle')?.value;
        const startDate = document.getElementById('edit-rental-start-date')?.value;
        const startMileage = parseInt(document.getElementById('edit-rental-start-mileage')?.value) || null;
        const weeklyRate = parseFloat(document.getElementById('edit-rental-weekly-rate')?.value) || 400;
        const deposit = parseFloat(document.getElementById('edit-rental-deposit')?.value) || 500;
        const nextPaymentDue = document.getElementById('edit-rental-next-payment')?.value || null;
        
        // Validation
        if (!newVehicleId) {
            Utils.toastError('Please select a vehicle');
            return;
        }
        if (!startDate) {
            Utils.toastError('Please enter a start date');
            return;
        }
        
        // Get current rental data
        const rental = this.data.find(r => r.id === rentalId);
        if (!rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        const oldVehicleId = rental.vehicle_id;
        const vehicleChanged = newVehicleId !== oldVehicleId;
        
        // Detect rate change
        const oldRate = parseFloat(rental.current_weekly_rate) || parseFloat(rental.weekly_rate) || 400;
        const rateChanged = weeklyRate !== oldRate;
        
        // Confirm changes
        let confirmMsg = 'Save changes to this rental?';
        if (vehicleChanged) {
            const newVehicle = this.editVehicles?.find(v => v.id === newVehicleId);
            const newVehicleName = newVehicle 
                ? `${newVehicle.year} ${newVehicle.make} ${newVehicle.model}`
                : 'selected vehicle';
            confirmMsg = `Change vehicle to ${newVehicleName}?\n\nThe previous vehicle will become available again.`;
        }
        if (rateChanged) {
            confirmMsg += `\n\n⚠️ Rate Change: $${oldRate} → $${weeklyRate}\nThis will apply to FUTURE weeks only.\nPast charges are not affected.`;
        }
        
        if (!confirm(confirmMsg)) return;
        
        try {
            Utils.toastInfo('Saving changes...');
            
            // Update rental record - use current_weekly_rate for rate changes
            const updateData = {
                vehicle_id: newVehicleId,
                start_date: startDate,
                start_mileage: startMileage,
                current_weekly_rate: weeklyRate, // Save to current_weekly_rate (not weekly_rate)
                deposit_amount: deposit,
                next_payment_due: nextPaymentDue,
                updated_at: new Date().toISOString()
            };
            
            // If rate changed, record when it changed
            if (rateChanged) {
                updateData.rate_change_date = new Date().toISOString().split('T')[0];
                updateData.rate_change_notes = `Rate changed from $${oldRate} to $${weeklyRate}`;
            }
            
            const { error: updateError } = await db
                .from('rentals')
                .update(updateData)
                .eq('id', rentalId);
            
            if (updateError) throw updateError;
            
            // If vehicle changed, update vehicle statuses
            if (vehicleChanged) {
                // Make old vehicle available (if it exists)
                if (oldVehicleId) {
                    await db
                        .from('vehicles')
                        .update({ 
                            status: 'Available',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', oldVehicleId);
                }
                
                // Mark new vehicle as rented/reserved based on rental status
                const newVehicleStatus = rental.rental_status === 'active' ? 'Currently Rented' : 'Reserved';
                await db
                    .from('vehicles')
                    .update({ 
                        status: newVehicleStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', newVehicleId);
            }
            
            Utils.toastSuccess(rateChanged 
                ? `Rental updated! New rate of $${weeklyRate}/week will apply to future charges.`
                : 'Rental updated successfully!');
            this.closeEditRentalModal();
            await this.load();
            
            // Refresh vehicles list
            if (typeof Vehicles !== 'undefined' && Vehicles.load) {
                Vehicles.load();
            }
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error updating rental:', error);
            Utils.toastError('Failed to update rental: ' + error.message);
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
