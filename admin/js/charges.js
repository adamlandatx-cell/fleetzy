/* ============================================
   FLEETZY ADMIN - CHARGES MODULE
   Manages tolls, damages, and other charges
   ============================================ */

const Charges = {
    selectedType: null,
    selectedRentalId: null,
    
    /**
     * Initialize the charges module
     */
    init() {
        this.bindEvents();
    },
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Charge type selection
        document.querySelectorAll('.charge-type-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectChargeType(btn));
        });
        
        // Quick amount buttons
        document.querySelectorAll('.quick-amount-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                document.getElementById('charge-amount').value = amount;
            });
        });
    },
    
    /**
     * Select a charge type
     */
    selectChargeType(btn) {
        // Remove selected from all
        document.querySelectorAll('.charge-type-btn').forEach(b => b.classList.remove('selected'));
        // Add selected to clicked
        btn.classList.add('selected');
        this.selectedType = btn.dataset.type;
    },
    
    /**
     * Open the Add Charge modal
     * @param {string} rentalId - Optional rental ID to pre-select
     */
    async openAddChargeModal(rentalId = null) {
        this.selectedRentalId = rentalId;
        this.selectedType = null;
        
        // Reset form
        document.querySelectorAll('.charge-type-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('charge-amount').value = '';
        document.getElementById('charge-description').value = '';
        document.getElementById('charge-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('charge-notes').value = '';
        
        // Load active rentals into dropdown
        await this.loadRentalsDropdown(rentalId);
        
        // Show modal
        document.getElementById('modal-add-charge').classList.add('active');
    },
    
    /**
     * Close the Add Charge modal
     */
    closeAddChargeModal() {
        document.getElementById('modal-add-charge').classList.remove('active');
        this.selectedType = null;
        this.selectedRentalId = null;
    },
    
    /**
     * Load active rentals into the dropdown
     */
    async loadRentalsDropdown(preselectedId = null) {
        const select = document.getElementById('charge-rental-select');
        select.innerHTML = '<option value="">Loading...</option>';
        
        try {
            const { data: rentals, error } = await db
                .from('rentals')
                .select(`
                    id,
                    rental_id,
                    weekly_rate,
                    next_payment_due,
                    customers (id, first_name, last_name),
                    vehicles (id, make, model, license_plate)
                `)
                .in('rental_status', ['active', 'pending_rental'])
                .order('next_payment_due', { ascending: true });
            
            if (error) throw error;
            
            if (!rentals || rentals.length === 0) {
                select.innerHTML = '<option value="">No active rentals</option>';
                return;
            }
            
            select.innerHTML = '<option value="">Select a rental...</option>';
            
            rentals.forEach(rental => {
                const customerName = rental.customers ? 
                    `${rental.customers.first_name} ${rental.customers.last_name}` : 'Unknown';
                const vehicleInfo = rental.vehicles ? 
                    `${rental.vehicles.make} ${rental.vehicles.model} (${rental.vehicles.license_plate})` : 'Unknown';
                const dueDate = rental.next_payment_due ? 
                    new Date(rental.next_payment_due).toLocaleDateString() : 'No date';
                
                const option = document.createElement('option');
                option.value = rental.id;
                option.textContent = `${customerName} - ${vehicleInfo} (Due: ${dueDate})`;
                option.dataset.customerId = rental.customers?.id || '';
                option.dataset.dueDate = rental.next_payment_due || '';
                
                if (preselectedId && rental.id === preselectedId) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
            
        } catch (error) {
            console.error('Error loading rentals:', error);
            select.innerHTML = '<option value="">Error loading rentals</option>';
        }
    },
    
    /**
     * Submit the Add Charge form
     */
    async submitAddCharge() {
        // Validate
        const rentalSelect = document.getElementById('charge-rental-select');
        const rentalId = rentalSelect.value;
        const customerId = rentalSelect.selectedOptions[0]?.dataset.customerId;
        const dueDate = rentalSelect.selectedOptions[0]?.dataset.dueDate;
        const amount = parseFloat(document.getElementById('charge-amount').value);
        const description = document.getElementById('charge-description').value.trim();
        const chargeDate = document.getElementById('charge-date').value;
        const notes = document.getElementById('charge-notes').value.trim();
        
        if (!rentalId) {
            Utils.toastError('Please select a rental');
            return;
        }
        
        if (!this.selectedType) {
            Utils.toastError('Please select a charge type');
            return;
        }
        
        if (!amount || amount <= 0) {
            Utils.toastError('Please enter a valid amount');
            return;
        }
        
        // Show loading
        const submitBtn = document.querySelector('#modal-add-charge .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        submitBtn.disabled = true;
        
        try {
            // Handle receipt upload if provided
            let receiptUrl = null;
            const receiptInput = document.getElementById('charge-receipt');
            if (receiptInput.files && receiptInput.files[0]) {
                receiptUrl = await this.uploadReceipt(receiptInput.files[0], rentalId);
            }
            
            // Insert charge
            const { data, error } = await db
                .from('rental_charges')
                .insert({
                    rental_id: rentalId,
                    customer_id: customerId || null,
                    charge_type: this.selectedType,
                    amount: amount,
                    description: description || null,
                    charge_date: chargeDate,
                    due_with_payment: dueDate || null,
                    receipt_url: receiptUrl,
                    notes: notes || null,
                    status: 'pending'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            Utils.toastSuccess(`Charge of $${amount.toFixed(2)} added successfully!`);
            this.closeAddChargeModal();
            
            // Refresh dashboard if on dashboard
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error adding charge:', error);
            Utils.toastError('Failed to add charge: ' + error.message);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    },
    
    /**
     * Upload a receipt image
     */
    async uploadReceipt(file, rentalId) {
        const fileExt = file.name.split('.').pop();
        const fileName = `charge-${rentalId}-${Date.now()}.${fileExt}`;
        const filePath = `receipts/${fileName}`;
        
        const { data, error } = await db.storage
            .from('payment-screenshots')
            .upload(filePath, file);
        
        if (error) throw error;
        
        // Get public URL
        const { data: urlData } = db.storage
            .from('payment-screenshots')
            .getPublicUrl(filePath);
        
        return urlData.publicUrl;
    },
    
    /**
     * Get pending charges for a rental
     */
    async getForRental(rentalId) {
        const { data, error } = await db
            .from('rental_charges')
            .select('*')
            .eq('rental_id', rentalId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching charges:', error);
            return [];
        }
        
        return data || [];
    },
    
    /**
     * Get all charges for a rental (any status)
     */
    async getAllForRental(rentalId) {
        const { data, error } = await db
            .from('rental_charges')
            .select('*')
            .eq('rental_id', rentalId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching charges:', error);
            return [];
        }
        
        return data || [];
    },
    
    /**
     * Apply a charge to a payment
     */
    async applyCharge(chargeId, paymentId) {
        const { error } = await db
            .from('rental_charges')
            .update({
                status: 'applied',
                applied_to_payment_id: paymentId,
                applied_at: new Date().toISOString()
            })
            .eq('id', chargeId);
        
        if (error) {
            console.error('Error applying charge:', error);
            Utils.toastError('Failed to apply charge');
            return false;
        }
        
        return true;
    },
    
    /**
     * Waive a charge
     */
    async waiveCharge(chargeId, reason = '') {
        const confirmWaive = confirm('Are you sure you want to waive this charge? This cannot be undone.');
        if (!confirmWaive) return;
        
        const { error } = await db
            .from('rental_charges')
            .update({
                status: 'waived',
                waived_at: new Date().toISOString(),
                waived_reason: reason || 'Waived by admin'
            })
            .eq('id', chargeId);
        
        if (error) {
            console.error('Error waiving charge:', error);
            Utils.toastError('Failed to waive charge');
            return false;
        }
        
        Utils.toastSuccess('Charge waived');
        
        // Refresh dashboard if on dashboard
        if (typeof Dashboard !== 'undefined' && Dashboard.load) {
            Dashboard.load();
        }
        
        return true;
    },
    
    /**
     * Calculate total pending charges for a rental
     */
    async getTotalPending(rentalId) {
        const charges = await this.getForRental(rentalId);
        return charges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
    },
    
    /**
     * Render charges list HTML
     */
    renderChargesList(charges) {
        if (!charges || charges.length === 0) {
            return '<p class="text-muted" style="padding: 10px; font-size: 13px;">No pending charges</p>';
        }
        
        const typeIcons = {
            toll: 'fa-road',
            damage: 'fa-car-crash',
            cleaning: 'fa-broom',
            late_fee: 'fa-clock',
            deposit_replenish: 'fa-piggy-bank',
            mileage_overage: 'fa-tachometer-alt',
            other: 'fa-file-invoice-dollar'
        };
        
        return `
            <div class="charges-list">
                <div class="charges-list-title">Pending Charges</div>
                ${charges.map(charge => {
                    const icon = typeIcons[charge.charge_type] || 'fa-dollar-sign';
                    return `
                        <div class="charge-item">
                            <div class="charge-item-info">
                                <div class="charge-item-icon ${charge.charge_type}">
                                    <i class="fas ${icon}"></i>
                                </div>
                                <div class="charge-item-details">
                                    <span class="charge-item-type">${charge.charge_type.replace('_', ' ')}</span>
                                    <span class="charge-item-desc">${charge.description || 'No description'}</span>
                                </div>
                            </div>
                            <div class="charge-item-right">
                                <span class="charge-item-amount">$${parseFloat(charge.amount).toFixed(2)}</span>
                                ${charge.status === 'pending' ? `
                                    <button class="btn-icon-small" onclick="Charges.waiveCharge('${charge.id}')" title="Waive">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : `
                                    <span class="charge-status ${charge.status}">${charge.status}</span>
                                `}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Charges.init();
});

// Export
window.Charges = Charges;
