/* ============================================
   FLEETZY ADMIN - VEHICLE SWAP MODULE
   Add to rentals.js or include as separate file
   Created: January 22, 2025
   ============================================ */

// Add these functions to the Rentals object or as standalone

const VehicleSwap = {
    swapReasons: [
        { value: 'maintenance', label: 'Vehicle Needs Maintenance' },
        { value: 'breakdown', label: 'Vehicle Breakdown' },
        { value: 'customer_request', label: 'Customer Request' },
        { value: 'upgrade', label: 'Upgrade' },
        { value: 'downgrade', label: 'Downgrade' },
        { value: 'fleet_rotation', label: 'Fleet Rotation' },
        { value: 'accident', label: 'Accident/Damage' },
        { value: 'other', label: 'Other' }
    ],
    
    /**
     * Open vehicle swap modal
     */
    async openSwapModal(rentalId) {
        // Get rental details
        const { data: rental, error: rentalError } = await db
            .from('rentals')
            .select(`
                *,
                customer:customer_id(id, full_name, phone),
                vehicle:vehicle_id(id, vehicle_id, make, model, year, license_plate, current_mileage, weekly_rate)
            `)
            .eq('id', rentalId)
            .single();
        
        if (rentalError || !rental) {
            Utils.toastError('Rental not found');
            return;
        }
        
        if (rental.rental_status !== 'active') {
            Utils.toastError('Can only swap vehicles on active rentals');
            return;
        }
        
        // Get available vehicles
        const { data: availableVehicles, error: vehiclesError } = await db
            .from('vehicles')
            .select('*')
            .eq('status', 'Available')
            .order('vehicle_id');
        
        if (vehiclesError) {
            Utils.toastError('Failed to load available vehicles');
            return;
        }
        
        // Build modal HTML
        const modalHtml = `
            <div id="modal-vehicle-swap" class="modal active">
                <div class="modal-backdrop" onclick="VehicleSwap.closeModal()"></div>
                <div class="modal-content modal-lg">
                    <div class="modal-header">
                        <h2><i class="fas fa-exchange-alt"></i> Swap Vehicle</h2>
                        <button class="modal-close" onclick="VehicleSwap.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- Customer Info -->
                        <div class="swap-customer-info">
                            <div class="customer-badge">
                                <i class="fas fa-user"></i>
                                <span>${rental.customer?.full_name || 'Customer'}</span>
                            </div>
                            <div class="rental-badge">
                                <i class="fas fa-file-contract"></i>
                                <span>Rental ${rental.rental_id || rental.id.slice(0,8)}</span>
                            </div>
                        </div>
                        
                        <!-- Current Vehicle -->
                        <div class="swap-section current-vehicle">
                            <h3><i class="fas fa-car"></i> Current Vehicle</h3>
                            <div class="vehicle-card-swap">
                                <div class="vehicle-info-swap">
                                    <span class="vehicle-code">${rental.vehicle?.vehicle_id || 'N/A'}</span>
                                    <span class="vehicle-name">${rental.vehicle?.year} ${rental.vehicle?.make} ${rental.vehicle?.model}</span>
                                    <span class="vehicle-plate">${rental.vehicle?.license_plate || 'N/A'}</span>
                                </div>
                                <div class="vehicle-stats-swap">
                                    <span class="stat">
                                        <i class="fas fa-tachometer-alt"></i>
                                        ${(rental.vehicle?.current_mileage || 0).toLocaleString()} mi
                                    </span>
                                    <span class="stat">
                                        <i class="fas fa-dollar-sign"></i>
                                        $${rental.vehicle?.weekly_rate || rental.weekly_rate || 400}/wk
                                    </span>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="swap-end-mileage">Final Mileage on Current Vehicle *</label>
                                <input type="number" id="swap-end-mileage" 
                                       value="${rental.vehicle?.current_mileage || 0}"
                                       placeholder="Enter current odometer reading">
                            </div>
                        </div>
                        
                        <!-- Arrow -->
                        <div class="swap-arrow">
                            <i class="fas fa-arrow-down"></i>
                        </div>
                        
                        <!-- New Vehicle Selection -->
                        <div class="swap-section new-vehicle">
                            <h3><i class="fas fa-car-side"></i> New Vehicle</h3>
                            ${availableVehicles.length === 0 ? `
                                <div class="no-vehicles-warning">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <p>No vehicles available for swap</p>
                                    <small>All vehicles are currently rented or in maintenance</small>
                                </div>
                            ` : `
                                <div class="form-group">
                                    <label for="swap-new-vehicle">Select New Vehicle *</label>
                                    <select id="swap-new-vehicle" class="form-select">
                                        <option value="">Choose a vehicle...</option>
                                        ${availableVehicles.map(v => `
                                            <option value="${v.id}" 
                                                    data-mileage="${v.current_mileage}"
                                                    data-rate="${v.weekly_rate || 400}">
                                                ${v.vehicle_id} - ${v.year} ${v.make} ${v.model} (${v.license_plate}) - $${v.weekly_rate || 400}/wk
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="swap-start-mileage">Starting Mileage on New Vehicle *</label>
                                    <input type="number" id="swap-start-mileage" placeholder="Will auto-fill when vehicle selected">
                                </div>
                            `}
                        </div>
                        
                        <!-- Swap Details -->
                        <div class="swap-section swap-details">
                            <h3><i class="fas fa-clipboard-list"></i> Swap Details</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="swap-reason">Reason for Swap *</label>
                                    <select id="swap-reason" class="form-select">
                                        <option value="">Select reason...</option>
                                        ${this.swapReasons.map(r => `
                                            <option value="${r.value}">${r.label}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="swap-rate-change">New Weekly Rate</label>
                                    <div class="input-with-prefix">
                                        <span class="prefix">$</span>
                                        <input type="number" id="swap-rate-change" 
                                               value="${rental.current_weekly_rate || rental.weekly_rate || 400}"
                                               step="0.01">
                                    </div>
                                    <small class="form-hint">Adjust if vehicle class changed</small>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="swap-notes">Notes</label>
                                <textarea id="swap-notes" rows="3" placeholder="Add any notes about this swap..."></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" onclick="VehicleSwap.closeModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="VehicleSwap.executeSwap('${rentalId}')" ${availableVehicles.length === 0 ? 'disabled' : ''}>
                            <i class="fas fa-exchange-alt"></i> Complete Swap
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';
        
        // Auto-fill mileage when vehicle selected
        const vehicleSelect = document.getElementById('swap-new-vehicle');
        if (vehicleSelect) {
            vehicleSelect.addEventListener('change', function() {
                const selected = this.options[this.selectedIndex];
                const mileage = selected.dataset.mileage;
                const rate = selected.dataset.rate;
                
                document.getElementById('swap-start-mileage').value = mileage || '';
                
                // Update rate suggestion
                const rateInput = document.getElementById('swap-rate-change');
                if (rateInput && rate) {
                    rateInput.value = rate;
                }
            });
        }
    },
    
    /**
     * Close swap modal
     */
    closeModal() {
        const modal = document.getElementById('modal-vehicle-swap');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Execute the vehicle swap
     */
    async executeSwap(rentalId) {
        const newVehicleId = document.getElementById('swap-new-vehicle')?.value;
        const endMileage = parseInt(document.getElementById('swap-end-mileage')?.value);
        const startMileage = parseInt(document.getElementById('swap-start-mileage')?.value);
        const reason = document.getElementById('swap-reason')?.value;
        const notes = document.getElementById('swap-notes')?.value || '';
        const newRate = parseFloat(document.getElementById('swap-rate-change')?.value);
        
        // Validate
        if (!newVehicleId) {
            Utils.toastError('Please select a new vehicle');
            return;
        }
        if (!endMileage || endMileage < 0) {
            Utils.toastError('Please enter final mileage on current vehicle');
            return;
        }
        if (!startMileage || startMileage < 0) {
            Utils.toastError('Please enter starting mileage on new vehicle');
            return;
        }
        if (!reason) {
            Utils.toastError('Please select a reason for the swap');
            return;
        }
        
        try {
            Utils.toastInfo('Processing vehicle swap...');
            
            // Get current rental
            const { data: rental, error: rentalError } = await db
                .from('rentals')
                .select('*, vehicle:vehicle_id(*)')
                .eq('id', rentalId)
                .single();
            
            if (rentalError) throw rentalError;
            
            const oldVehicleId = rental.vehicle_id;
            const now = new Date().toISOString();
            
            // 1. Create history record for old vehicle
            const historyData = {
                rental_id: rentalId,
                vehicle_id: oldVehicleId,
                start_date: rental.start_date || rental.created_at,
                end_date: now,
                start_mileage: rental.start_mileage,
                end_mileage: endMileage,
                swap_reason: reason,
                swap_notes: notes,
                rate_at_time: rental.current_weekly_rate || rental.weekly_rate,
                swapped_by: 'Admin'
            };
            
            const { error: historyError } = await db
                .from('rental_vehicle_history')
                .insert([historyData]);
            
            if (historyError) {
                console.error('History insert error:', historyError);
                // Continue anyway - history is for tracking, not critical
            }
            
            // 2. Update old vehicle status to Available (or Maintenance if that's the reason)
            const oldVehicleStatus = ['maintenance', 'breakdown', 'accident'].includes(reason) 
                ? 'Maintenance' 
                : 'Available';
            
            await db.from('vehicles')
                .update({ 
                    status: oldVehicleStatus,
                    current_mileage: endMileage,
                    updated_at: now 
                })
                .eq('id', oldVehicleId);
            
            // 3. Update new vehicle status to Rented
            await db.from('vehicles')
                .update({ 
                    status: 'Rented',
                    updated_at: now 
                })
                .eq('id', newVehicleId);
            
            // 4. Update rental with new vehicle and rate
            const rentalUpdate = {
                vehicle_id: newVehicleId,
                start_mileage: startMileage,
                updated_at: now
            };
            
            // Update rate if changed
            if (newRate && newRate !== rental.weekly_rate) {
                rentalUpdate.current_weekly_rate = newRate;
                rentalUpdate.rate_change_date = now;
                rentalUpdate.rate_change_notes = `Vehicle swap: ${reason}`;
            }
            
            const { error: rentalUpdateError } = await db
                .from('rentals')
                .update(rentalUpdate)
                .eq('id', rentalId);
            
            if (rentalUpdateError) throw rentalUpdateError;
            
            Utils.toastSuccess('Vehicle swap completed!');
            this.closeModal();
            
            // Refresh rentals and vehicles
            if (typeof Rentals !== 'undefined') {
                await Rentals.load();
            }
            if (typeof Vehicles !== 'undefined') {
                await Vehicles.load();
            }
            
        } catch (error) {
            console.error('Error executing swap:', error);
            Utils.toastError('Failed to swap vehicle: ' + (error.message || 'Unknown error'));
        }
    },
    
    /**
     * View swap history for a rental
     */
    async viewHistory(rentalId) {
        try {
            const { data: history, error } = await db
                .from('rental_vehicle_history')
                .select(`
                    *,
                    vehicle:vehicle_id(vehicle_id, make, model, year, license_plate)
                `)
                .eq('rental_id', rentalId)
                .order('start_date', { ascending: true });
            
            if (error) throw error;
            
            if (!history || history.length === 0) {
                Utils.toastInfo('No vehicle swap history for this rental');
                return;
            }
            
            // Build history modal
            const modalHtml = `
                <div id="modal-swap-history" class="modal active">
                    <div class="modal-backdrop" onclick="VehicleSwap.closeHistoryModal()"></div>
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2><i class="fas fa-history"></i> Vehicle Swap History</h2>
                            <button class="modal-close" onclick="VehicleSwap.closeHistoryModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="swap-history-timeline">
                                ${history.map((h, index) => `
                                    <div class="history-item ${!h.end_date ? 'current' : ''}">
                                        <div class="history-marker">
                                            ${!h.end_date ? '<i class="fas fa-car"></i>' : '<i class="fas fa-check"></i>'}
                                        </div>
                                        <div class="history-content">
                                            <div class="history-vehicle">
                                                <strong>${h.vehicle?.vehicle_id || 'Vehicle'}</strong>
                                                <span>${h.vehicle?.year} ${h.vehicle?.make} ${h.vehicle?.model}</span>
                                            </div>
                                            <div class="history-dates">
                                                <span>${new Date(h.start_date).toLocaleDateString()}</span>
                                                ${h.end_date ? `<span>→ ${new Date(h.end_date).toLocaleDateString()}</span>` : '<span class="current-label">Current</span>'}
                                            </div>
                                            <div class="history-mileage">
                                                <span>Start: ${(h.start_mileage || 0).toLocaleString()} mi</span>
                                                ${h.end_mileage ? `<span>End: ${h.end_mileage.toLocaleString()} mi</span>` : ''}
                                            </div>
                                            ${h.swap_reason ? `
                                                <div class="history-reason">
                                                    <span class="reason-badge">${h.swap_reason.replace('_', ' ')}</span>
                                                    ${h.swap_notes ? `<p class="reason-notes">${h.swap_notes}</p>` : ''}
                                                </div>
                                            ` : ''}
                                            ${h.rate_at_time ? `
                                                <div class="history-rate">Rate: $${h.rate_at_time}/wk</div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="VehicleSwap.closeHistoryModal()">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.body.style.overflow = 'hidden';
            
        } catch (error) {
            console.error('Error loading swap history:', error);
            Utils.toastError('Failed to load swap history');
        }
    },
    
    /**
     * Close history modal
     */
    closeHistoryModal() {
        const modal = document.getElementById('modal-swap-history');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }
};

// Export
window.VehicleSwap = VehicleSwap;
