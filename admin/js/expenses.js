/* ============================================
   FLEETZY ADMIN - EXPENSES MODULE
   Full expense management with recurring support
   Created: January 22, 2025
   ============================================ */

const Expenses = {
    // Cached data
    data: [],
    filtered: [],
    recurring: [],
    vehicles: [],
    rentals: [], // Active rentals for linking expenses
    
    // Expense type definitions
    expenseTypes: [
        { value: 'loan_payment', label: 'Loan Payment', icon: '🏦', category: 'financing' },
        { value: 'lease_payment', label: 'Lease Payment', icon: '📋', category: 'financing' },
        { value: 'insurance', label: 'Insurance', icon: '🛡️', category: 'operating' },
        { value: 'registration', label: 'Registration', icon: '📄', category: 'operating' },
        { value: 'inspection', label: 'State Inspection', icon: '✅', category: 'operating' },
        { value: 'gps_subscription', label: 'GPS Subscription', icon: '📍', category: 'operating' },
        { value: 'oil_change', label: 'Oil Change', icon: '🛢️', category: 'maintenance' },
        { value: 'tire_rotation', label: 'Tire Rotation', icon: '🔄', category: 'maintenance' },
        { value: 'tire_replacement', label: 'Tire Replacement', icon: '🛞', category: 'maintenance' },
        { value: 'brakes', label: 'Brakes', icon: '🛑', category: 'maintenance' },
        { value: 'general_repair', label: 'General Repair', icon: '🔧', category: 'maintenance' },
        { value: 'cleaning', label: 'Cleaning', icon: '🧹', category: 'other' },
        { value: 'car_wash_membership', label: 'Car Wash Membership', icon: '🚿', category: 'other' },
        { value: 'fuel', label: 'Fuel', icon: '⛽', category: 'other' },
        { value: 'towing', label: 'Towing', icon: '🚛', category: 'other' },
        { value: 'parking_tolls', label: 'Parking/Tolls', icon: '🅿️', category: 'other' },
        { value: 'damage_repair', label: 'Damage Repair', icon: '💥', category: 'other' },
        { value: 'other', label: 'Other', icon: '📝', category: 'other' }
    ],
    
    /**
     * Initialize expenses tab
     */
    async init() {
        console.log('💰 Initializing Expenses module...');
        await this.loadVehicles();
        await this.loadRentals();
        await this.load();
        await this.loadRecurring();
        this.setupEventListeners();
    },
    
    /**
     * Load vehicles for dropdown
     */
    async loadVehicles() {
        try {
            const { data, error } = await db
                .from('vehicles')
                .select('id, vehicle_id, make, model, year, license_plate')
                .order('vehicle_id');
            
            if (error) throw error;
            this.vehicles = data || [];
            console.log(`✅ Loaded ${this.vehicles.length} vehicles for expenses`);
        } catch (error) {
            console.error('❌ Error loading vehicles:', error);
        }
    },
    
    /**
     * Load active rentals for dropdown
     */
    async loadRentals() {
        try {
            const { data, error } = await db
                .from('rentals')
                .select(`
                    id, 
                    rental_id, 
                    rental_status,
                    customer:customer_id(id, full_name),
                    vehicle:vehicle_id(id, vehicle_id, make, model, year)
                `)
                .in('rental_status', ['active', 'pending_rental', 'pending_approval'])
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            this.rentals = data || [];
            console.log(`✅ Loaded ${this.rentals.length} active rentals for expenses`);
        } catch (error) {
            console.error('❌ Error loading rentals:', error);
        }
    },
    
    /**
     * Load expenses from Supabase
     */
    async load() {
        try {
            const { data, error } = await db
                .from('expenses')
                .select(`
                    *,
                    vehicle:vehicle_id(id, vehicle_id, make, model, year, license_plate),
                    rental:rental_id(id, rental_id, customer:customer_id(full_name))
                `)
                .order('expense_date', { ascending: false });
            
            if (error) throw error;
            
            this.data = data || [];
            this.filtered = [...this.data];
            this.render();
            this.updateStats();
            
            console.log(`✅ Loaded ${this.data.length} expenses`);
        } catch (error) {
            console.error('❌ Error loading expenses:', error);
            Utils.toastError('Failed to load expenses');
        }
    },
    
    /**
     * Load recurring expenses
     */
    async loadRecurring() {
        try {
            const { data, error } = await db
                .from('recurring_expenses')
                .select(`
                    *,
                    vehicle:vehicle_id(id, vehicle_id, make, model, year, license_plate)
                `)
                .eq('is_active', true)
                .order('vehicle_id');
            
            if (error) throw error;
            
            this.recurring = data || [];
            this.renderRecurring();
            
            console.log(`✅ Loaded ${this.recurring.length} recurring expenses`);
        } catch (error) {
            console.error('❌ Error loading recurring expenses:', error);
        }
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('expenses-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filter());
        }
        
        // Vehicle filter
        const vehicleFilter = document.getElementById('expenses-vehicle-filter');
        if (vehicleFilter) {
            vehicleFilter.addEventListener('change', () => this.filter());
        }
        
        // Type filter
        const typeFilter = document.getElementById('expenses-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.filter());
        }
        
        // Recurring toggle in add modal
        const recurringCheckbox = document.getElementById('expense-recurring');
        if (recurringCheckbox) {
            recurringCheckbox.addEventListener('change', (e) => {
                const recurringFields = document.getElementById('recurring-expense-fields');
                const oneTimeFields = document.getElementById('onetime-expense-fields');
                if (recurringFields && oneTimeFields) {
                    recurringFields.style.display = e.target.checked ? 'block' : 'none';
                    oneTimeFields.style.display = e.target.checked ? 'none' : 'block';
                }
            });
        }
    },
    
    /**
     * Filter expenses
     */
    filter() {
        const searchTerm = document.getElementById('expenses-search')?.value?.toLowerCase() || '';
        const vehicleFilter = document.getElementById('expenses-vehicle-filter')?.value || '';
        const typeFilter = document.getElementById('expenses-type-filter')?.value || '';
        
        this.filtered = this.data.filter(expense => {
            // Search filter
            const searchMatch = !searchTerm || 
                expense.expense_type?.toLowerCase().includes(searchTerm) ||
                expense.vendor?.toLowerCase().includes(searchTerm) ||
                expense.description?.toLowerCase().includes(searchTerm) ||
                expense.vehicle?.make?.toLowerCase().includes(searchTerm) ||
                expense.vehicle?.model?.toLowerCase().includes(searchTerm);
            
            // Vehicle filter
            const vehicleMatch = !vehicleFilter || expense.vehicle_id === vehicleFilter;
            
            // Type filter
            const typeMatch = !typeFilter || expense.expense_type === typeFilter;
            
            return searchMatch && vehicleMatch && typeMatch;
        });
        
        this.render();
    },
    
    /**
     * Update stats
     */
    updateStats() {
        const now = new Date();
        const thisMonth = this.data.filter(e => {
            const expDate = new Date(e.expense_date);
            return expDate.getMonth() === now.getMonth() && 
                   expDate.getFullYear() === now.getFullYear();
        });
        
        const lastMonth = this.data.filter(e => {
            const expDate = new Date(e.expense_date);
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return expDate.getMonth() === lastMonthDate.getMonth() && 
                   expDate.getFullYear() === lastMonthDate.getFullYear();
        });
        
        const thisMonthTotal = thisMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
        const lastMonthTotal = lastMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalExpenses = this.data.reduce((sum, e) => sum + (e.amount || 0), 0);
        const recurringMonthly = this.recurring.reduce((sum, r) => sum + (r.amount || 0), 0);
        
        // Update stat elements
        const thisMonthEl = document.getElementById('expenses-stat-this-month');
        const lastMonthEl = document.getElementById('expenses-stat-last-month');
        const totalEl = document.getElementById('expenses-stat-total');
        const recurringEl = document.getElementById('expenses-stat-recurring');
        
        if (thisMonthEl) thisMonthEl.textContent = `$${thisMonthTotal.toLocaleString()}`;
        if (lastMonthEl) lastMonthEl.textContent = `$${lastMonthTotal.toLocaleString()}`;
        if (totalEl) totalEl.textContent = `$${totalExpenses.toLocaleString()}`;
        if (recurringEl) recurringEl.textContent = `$${recurringMonthly.toLocaleString()}/mo`;
    },
    
    /**
     * Get expense type info
     */
    getExpenseType(typeValue) {
        return this.expenseTypes.find(t => t.value === typeValue) || 
               { value: typeValue, label: typeValue, icon: '📝', category: 'other' };
    },
    
    /**
     * Render expenses table
     */
    render() {
        const container = document.getElementById('expenses-table-body');
        if (!container) return;
        
        if (this.filtered.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No expenses found</p>
                        <button class="btn btn-primary" onclick="Expenses.openAddModal()">
                            <i class="fas fa-plus"></i> Log Expense
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = this.filtered.map(expense => this.renderRow(expense)).join('');
    },
    
    /**
     * Render single expense row
     */
    renderRow(expense) {
        const typeInfo = this.getExpenseType(expense.expense_type);
        const vehicleName = expense.vehicle 
            ? `${expense.vehicle.year} ${expense.vehicle.make} ${expense.vehicle.model}`
            : 'Unknown Vehicle';
        const vehicleCode = expense.vehicle?.vehicle_id || '';
        
        const dateFormatted = expense.expense_date 
            ? new Date(expense.expense_date + 'T00:00:00').toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
              })
            : 'N/A';
        
        const isRecurring = expense.recurring_expense_id ? true : false;
        const isCustomerRelated = expense.rental_id ? true : false;
        
        return `
            <tr data-expense-id="${expense.id}">
                <td>
                    <div class="expense-date">
                        <span class="date-main">${dateFormatted}</span>
                        ${isRecurring ? '<span class="badge badge-sm badge-info">Recurring</span>' : ''}
                    </div>
                </td>
                <td>
                    <div class="expense-type">
                        <span class="expense-icon">${typeInfo.icon}</span>
                        <span class="expense-label">${typeInfo.label}</span>
                    </div>
                </td>
                <td>
                    <div class="vehicle-cell-mini">
                        <span class="vehicle-code">${vehicleCode}</span>
                        <span class="vehicle-name">${vehicleName}</span>
                    </div>
                </td>
                <td>
                    <span class="amount ${expense.is_customer_responsible ? 'customer-responsible' : ''}">
                        $${(expense.amount || 0).toFixed(2)}
                        ${expense.is_customer_responsible ? '<i class="fas fa-user-tag" title="Customer Responsible"></i>' : ''}
                    </span>
                </td>
                <td>
                    <span class="vendor">${expense.vendor || '-'}</span>
                </td>
                <td>
                    <span class="description" title="${expense.description || ''}">${expense.description || '-'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${expense.receipt_url ? `
                            <button class="btn-icon" onclick="Expenses.viewReceipt('${expense.receipt_url}')" title="View Receipt">
                                <i class="fas fa-file-image"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon" onclick="Expenses.edit('${expense.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon danger" onclick="Expenses.delete('${expense.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },
    
    /**
     * Render recurring expenses list
     */
    renderRecurring() {
        const container = document.getElementById('recurring-expenses-list');
        if (!container) return;
        
        if (this.recurring.length === 0) {
            container.innerHTML = `
                <div class="empty-recurring">
                    <i class="fas fa-sync-alt"></i>
                    <p>No recurring expenses</p>
                    <small>Add recurring expenses like loan payments, insurance, or subscriptions</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.recurring.map(rec => {
            const typeInfo = this.getExpenseType(rec.expense_type);
            const vehicleName = rec.vehicle 
                ? `${rec.vehicle.vehicle_id} - ${rec.vehicle.year} ${rec.vehicle.make}`
                : 'Unknown';
            
            return `
                <div class="recurring-item" data-recurring-id="${rec.id}">
                    <div class="recurring-info">
                        <span class="recurring-icon">${typeInfo.icon}</span>
                        <div class="recurring-details">
                            <span class="recurring-type">${typeInfo.label}</span>
                            <span class="recurring-vehicle">${vehicleName}</span>
                        </div>
                    </div>
                    <div class="recurring-amount">
                        <span class="amount">$${(rec.amount || 0).toFixed(2)}</span>
                        <span class="frequency">/month</span>
                    </div>
                    <div class="recurring-schedule">
                        <span class="day">Day ${rec.day_of_month || 1}</span>
                        <span class="since">Since ${new Date(rec.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="Expenses.endRecurring('${rec.id}')" title="End Recurring">
                        <i class="fas fa-stop-circle"></i> End
                    </button>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Populate vehicle dropdown
     */
    populateVehicleDropdown(selectId, selectedId = null) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = `
            <option value="">Select Vehicle</option>
            ${this.vehicles.map(v => `
                <option value="${v.id}" ${v.id === selectedId ? 'selected' : ''}>
                    ${v.vehicle_id} - ${v.year} ${v.make} ${v.model} (${v.license_plate})
                </option>
            `).join('')}
        `;
    },
    
    /**
     * Populate expense type dropdown
     */
    populateTypeDropdown(selectId, selectedValue = null) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const categories = {
            financing: 'Financing',
            operating: 'Operating Costs',
            maintenance: 'Maintenance',
            other: 'Other'
        };
        
        let html = '<option value="">Select Type</option>';
        
        Object.entries(categories).forEach(([catKey, catLabel]) => {
            const types = this.expenseTypes.filter(t => t.category === catKey);
            if (types.length > 0) {
                html += `<optgroup label="${catLabel}">`;
                types.forEach(t => {
                    html += `<option value="${t.value}" ${t.value === selectedValue ? 'selected' : ''}>${t.icon} ${t.label}</option>`;
                });
                html += '</optgroup>';
            }
        });
        
        select.innerHTML = html;
    },
    
    /**
     * Populate rental dropdown with active rentals
     */
    populateRentalDropdown(selectId, selectedId = null) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        let html = '<option value="">None (general expense)</option>';
        
        if (this.rentals.length > 0) {
            html += '<optgroup label="Active Rentals">';
            this.rentals.forEach(rental => {
                const customerName = rental.customer?.full_name || 'Unknown Customer';
                const vehicleInfo = rental.vehicle 
                    ? `${rental.vehicle.vehicle_id} - ${rental.vehicle.year} ${rental.vehicle.make} ${rental.vehicle.model}`
                    : 'Unknown Vehicle';
                const displayText = `${customerName} (${vehicleInfo})`;
                const selected = rental.id === selectedId ? 'selected' : '';
                
                html += `<option value="${rental.id}" ${selected}>${displayText}</option>`;
            });
            html += '</optgroup>';
        }
        
        select.innerHTML = html;
    },
    
    /**
     * Open add expense modal
     */
    openAddModal(vehicleId = null, rentalId = null) {
        const modal = document.getElementById('modal-add-expense');
        if (!modal) {
            Utils.toastError('Expense modal not found');
            return;
        }
        
        // Reset form
        const form = document.getElementById('form-add-expense');
        if (form) form.reset();
        
        // Populate dropdowns
        this.populateVehicleDropdown('expense-vehicle', vehicleId);
        this.populateTypeDropdown('expense-type');
        this.populateRentalDropdown('expense-rental', rentalId);
        
        // Set default date to today
        const dateInput = document.getElementById('expense-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Set default start date for recurring
        const startDateInput = document.getElementById('expense-start-date');
        if (startDateInput) {
            startDateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Reset recurring checkbox and fields visibility
        const recurringCheckbox = document.getElementById('expense-recurring');
        if (recurringCheckbox) recurringCheckbox.checked = false;
        
        const recurringFields = document.getElementById('recurring-expense-fields');
        const oneTimeFields = document.getElementById('onetime-expense-fields');
        if (recurringFields) recurringFields.style.display = 'none';
        if (oneTimeFields) oneTimeFields.style.display = 'block';
        
        // Reset customer responsible checkbox and charge option
        const customerResponsibleCheckbox = document.getElementById('expense-customer-responsible');
        if (customerResponsibleCheckbox) customerResponsibleCheckbox.checked = false;
        
        const chargeOption = document.getElementById('expense-charge-option');
        if (chargeOption) chargeOption.style.display = 'none';
        
        // Store rental ID if provided (for customer-related expenses)
        modal.dataset.rentalId = rentalId || '';
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close add expense modal
     */
    closeAddModal() {
        const modal = document.getElementById('modal-add-expense');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Toggle charge option visibility based on customer responsible checkbox
     */
    toggleChargeOption() {
        const isCustomerResponsible = document.getElementById('expense-customer-responsible')?.checked || false;
        const chargeOption = document.getElementById('expense-charge-option');
        
        if (chargeOption) {
            chargeOption.style.display = isCustomerResponsible ? 'block' : 'none';
        }
        
        // If customer is responsible, require a rental to be selected
        const rentalSelect = document.getElementById('expense-rental');
        if (rentalSelect) {
            if (isCustomerResponsible && !rentalSelect.value) {
                // Highlight the rental dropdown
                rentalSelect.focus();
                rentalSelect.style.borderColor = 'var(--accent-orange)';
                setTimeout(() => {
                    rentalSelect.style.borderColor = '';
                }, 3000);
            }
        }
    },
    
    /**
     * Set expense mode (one-time vs recurring)
     */
    setMode(mode) {
        const oneTimeFields = document.getElementById('onetime-expense-fields');
        const recurringFields = document.getElementById('recurring-expense-fields');
        const oneTimeLabel = document.querySelector('label[for="expense-mode-onetime"]');
        const recurringLabel = document.querySelector('label[for="expense-mode-recurring"]');
        
        if (mode === 'onetime') {
            if (oneTimeFields) oneTimeFields.style.display = 'block';
            if (recurringFields) recurringFields.style.display = 'none';
            if (oneTimeLabel) oneTimeLabel.classList.add('active');
            if (recurringLabel) recurringLabel.classList.remove('active');
            document.getElementById('expense-mode-onetime').checked = true;
        } else {
            if (oneTimeFields) oneTimeFields.style.display = 'none';
            if (recurringFields) recurringFields.style.display = 'block';
            if (oneTimeLabel) oneTimeLabel.classList.remove('active');
            if (recurringLabel) recurringLabel.classList.add('active');
            document.getElementById('expense-mode-recurring').checked = true;
        }
    },
    
    /**
     * Save expense
     */
    async save() {
        const form = document.getElementById('form-add-expense');
        if (!form) return;
        
        const modal = document.getElementById('modal-add-expense');
        
        // Get rental ID from dropdown (or from modal dataset as fallback)
        const rentalDropdownValue = document.getElementById('expense-rental')?.value || '';
        const rentalId = rentalDropdownValue || modal?.dataset?.rentalId || null;
        
        const isRecurring = document.getElementById('expense-recurring')?.checked || false;
        const vehicleId = document.getElementById('expense-vehicle')?.value;
        const expenseType = document.getElementById('expense-type')?.value;
        const amount = parseFloat(document.getElementById('expense-amount')?.value) || 0;
        const vendor = document.getElementById('expense-vendor')?.value || '';
        const description = document.getElementById('expense-description')?.value || '';
        const isCustomerResponsible = document.getElementById('expense-customer-responsible')?.checked || false;
        
        // Validate
        if (!vehicleId) {
            Utils.toastError('Please select a vehicle');
            return;
        }
        if (!expenseType) {
            Utils.toastError('Please select an expense type');
            return;
        }
        if (amount <= 0) {
            Utils.toastError('Please enter a valid amount');
            return;
        }
        
        try {
            Utils.toastInfo('Saving expense...');
            
            if (isRecurring) {
                // Save as recurring expense
                const startDate = document.getElementById('expense-start-date')?.value;
                const dayOfMonth = parseInt(document.getElementById('expense-day-of-month')?.value) || 1;
                
                if (!startDate) {
                    Utils.toastError('Please select a start date');
                    return;
                }
                
                const recurringData = {
                    vehicle_id: vehicleId,
                    expense_type: expenseType,
                    amount: amount,
                    frequency: 'monthly',
                    day_of_month: dayOfMonth,
                    vendor: vendor,
                    description: description,
                    start_date: startDate,
                    is_active: true
                };
                
                const { data: recurringResult, error: recurringError } = await db
                    .from('recurring_expenses')
                    .insert([recurringData])
                    .select()
                    .single();
                
                if (recurringError) throw recurringError;
                
                // Now backfill expenses from start date to today
                const backfillCount = await this.backfillRecurringExpense(recurringResult.id, startDate, dayOfMonth, vehicleId, expenseType, amount, vendor, description);
                
                Utils.toastSuccess(`Recurring expense created! ${backfillCount} past expenses generated.`);
                
            } else {
                // Save as one-time expense
                const expenseDate = document.getElementById('expense-date')?.value;
                
                if (!expenseDate) {
                    Utils.toastError('Please select a date');
                    return;
                }
                
                // Handle receipt upload
                let receiptUrl = null;
                const receiptInput = document.getElementById('expense-receipt');
                if (receiptInput?.files?.length > 0) {
                    const file = receiptInput.files[0];
                    const fileName = `receipt_${Date.now()}_${file.name}`;
                    
                    const { data: uploadData, error: uploadError } = await db.storage
                        .from('receipts')
                        .upload(fileName, file);
                    
                    if (!uploadError) {
                        const { data: urlData } = db.storage
                            .from('receipts')
                            .getPublicUrl(fileName);
                        receiptUrl = urlData?.publicUrl;
                    }
                }
                
                const expenseData = {
                    vehicle_id: vehicleId,
                    expense_type: expenseType,
                    amount: amount,
                    expense_date: expenseDate,
                    vendor: vendor,
                    description: description,
                    receipt_url: receiptUrl,
                    rental_id: rentalId || null,
                    is_customer_responsible: isCustomerResponsible
                };
                
                const { error: expenseError } = await db
                    .from('expenses')
                    .insert([expenseData]);
                
                if (expenseError) throw expenseError;
                
                Utils.toastSuccess('Expense saved!');
            }
            
            this.closeAddModal();
            await this.load();
            await this.loadRecurring();
            
        } catch (error) {
            console.error('Error saving expense:', error);
            Utils.toastError('Failed to save expense: ' + (error.message || 'Unknown error'));
        }
    },
    
    /**
     * Backfill recurring expenses from start date to today
     */
    async backfillRecurringExpense(recurringId, startDate, dayOfMonth, vehicleId, expenseType, amount, vendor, description) {
        const startDateObj = new Date(startDate + 'T00:00:00');
        const today = new Date();
        let count = 0;
        
        // Start from start date's month
        let currentDate = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), dayOfMonth);
        
        // If start date is after the day of month, start from next month
        if (startDateObj.getDate() > dayOfMonth) {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        const expenses = [];
        
        while (currentDate <= today) {
            // Only create if the date is >= start date
            if (currentDate >= startDateObj) {
                expenses.push({
                    vehicle_id: vehicleId,
                    expense_type: expenseType,
                    amount: amount,
                    expense_date: currentDate.toISOString().split('T')[0],
                    vendor: vendor,
                    description: (description || '') + ' (Auto-generated)',
                    recurring_expense_id: recurringId
                });
                count++;
            }
            
            // Move to next month
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        if (expenses.length > 0) {
            const { error } = await db.from('expenses').insert(expenses);
            if (error) {
                console.error('Backfill error:', error);
            }
        }
        
        // Update last_generated
        await db.from('recurring_expenses')
            .update({ last_generated: today.toISOString().split('T')[0] })
            .eq('id', recurringId);
        
        return count;
    },
    
    /**
     * End a recurring expense
     */
    async endRecurring(recurringId) {
        const recurring = this.recurring.find(r => r.id === recurringId);
        if (!recurring) {
            Utils.toastError('Recurring expense not found');
            return;
        }
        
        const typeInfo = this.getExpenseType(recurring.expense_type);
        const confirmed = confirm(`End recurring "${typeInfo.label}" ($${recurring.amount}/month)?\n\nNo more expenses will be auto-generated for this item.`);
        
        if (!confirmed) return;
        
        try {
            Utils.toastInfo('Ending recurring expense...');
            
            const { error } = await db
                .from('recurring_expenses')
                .update({ 
                    is_active: false,
                    end_date: new Date().toISOString().split('T')[0],
                    updated_at: new Date().toISOString()
                })
                .eq('id', recurringId);
            
            if (error) throw error;
            
            Utils.toastSuccess('Recurring expense ended');
            await this.loadRecurring();
            this.updateStats();
            
        } catch (error) {
            console.error('Error ending recurring:', error);
            Utils.toastError('Failed to end recurring expense');
        }
    },
    
    /**
     * View receipt
     */
    viewReceipt(url) {
        if (!url) {
            Utils.toastError('No receipt available');
            return;
        }
        window.open(url, '_blank');
    },
    
    /**
     * Edit expense (placeholder)
     */
    edit(expenseId) {
        Utils.toastInfo('Edit expense coming soon');
        // TODO: Implement edit modal
    },
    
    /**
     * Delete expense
     */
    async delete(expenseId) {
        const expense = this.data.find(e => e.id === expenseId);
        if (!expense) {
            Utils.toastError('Expense not found');
            return;
        }
        
        const typeInfo = this.getExpenseType(expense.expense_type);
        const confirmed = confirm(`Delete ${typeInfo.label} expense ($${expense.amount})?\n\nThis action cannot be undone.`);
        
        if (!confirmed) return;
        
        try {
            Utils.toastInfo('Deleting expense...');
            
            const { error } = await db
                .from('expenses')
                .delete()
                .eq('id', expenseId);
            
            if (error) throw error;
            
            Utils.toastSuccess('Expense deleted');
            await this.load();
            
        } catch (error) {
            console.error('Error deleting expense:', error);
            Utils.toastError('Failed to delete expense');
        }
    },
    
    /**
     * Generate monthly recurring expenses (called by n8n or manually)
     */
    async generateMonthlyExpenses() {
        try {
            Utils.toastInfo('Generating monthly expenses...');
            
            const today = new Date();
            const thisMonth = today.toISOString().slice(0, 7); // YYYY-MM
            
            let generated = 0;
            
            for (const recurring of this.recurring) {
                // Check if already generated this month
                const existingThisMonth = this.data.find(e => 
                    e.recurring_expense_id === recurring.id &&
                    e.expense_date?.startsWith(thisMonth)
                );
                
                if (!existingThisMonth) {
                    // Generate expense for this month
                    const expenseDate = new Date(today.getFullYear(), today.getMonth(), recurring.day_of_month || 1);
                    
                    // Only generate if the date hasn't passed yet, or if we're past the day
                    if (expenseDate <= today) {
                        const { error } = await db.from('expenses').insert([{
                            vehicle_id: recurring.vehicle_id,
                            expense_type: recurring.expense_type,
                            amount: recurring.amount,
                            expense_date: expenseDate.toISOString().split('T')[0],
                            vendor: recurring.vendor,
                            description: (recurring.description || '') + ' (Auto-generated)',
                            recurring_expense_id: recurring.id
                        }]);
                        
                        if (!error) generated++;
                    }
                }
            }
            
            await this.load();
            Utils.toastSuccess(`Generated ${generated} monthly expenses`);
            
        } catch (error) {
            console.error('Error generating monthly expenses:', error);
            Utils.toastError('Failed to generate monthly expenses');
        }
    },
    
    /**
     * Refresh data
     */
    async refresh() {
        Utils.toastInfo('Refreshing...');
        await this.load();
        await this.loadRecurring();
        Utils.toastSuccess('Expenses refreshed');
    }
};

// Export
window.Expenses = Expenses;
