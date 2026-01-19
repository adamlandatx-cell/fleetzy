/* ============================================
   FLEETZY ADMIN - VEHICLES MODULE
   Full vehicle management with CRUD operations
   ============================================ */

const Vehicles = {
    // Cached data
    data: [],
    filtered: [],
    
    /**
     * Initialize vehicles tab
     */
    async init() {
        console.log('🚗 Initializing Vehicles module...');
        await this.load();
        this.setupEventListeners();
    },
    
    /**
     * Load vehicles from Supabase
     */
    async load() {
        try {
            const { data, error } = await db
                .from('vehicles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.data = data || [];
            this.filtered = [...this.data];
            this.render();
            this.updateStats();
            
            console.log(`✅ Loaded ${this.data.length} vehicles`);
        } catch (error) {
            console.error('❌ Error loading vehicles:', error);
            Utils.toastError('Failed to load vehicles');
        }
    },
    
    /**
     * Setup event listeners for search and filters
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('vehicles-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filter());
        }
        
        // Status filter
        const statusFilter = document.getElementById('vehicles-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => this.filter());
        }
    },
    
    /**
     * Get the status of a vehicle (handles both 'status' and 'vehicle_status' columns)
     */
    getVehicleStatus(vehicle) {
        return vehicle.status || vehicle.vehicle_status || 'Unknown';
    },
    
    /**
     * Filter vehicles based on search and status
     */
    filter() {
        const searchTerm = document.getElementById('vehicles-search')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('vehicles-status-filter')?.value || '';
        
        this.filtered = this.data.filter(vehicle => {
            // Search filter
            const searchMatch = !searchTerm || 
                vehicle.make?.toLowerCase().includes(searchTerm) ||
                vehicle.model?.toLowerCase().includes(searchTerm) ||
                vehicle.license_plate?.toLowerCase().includes(searchTerm) ||
                vehicle.vehicle_id?.toLowerCase().includes(searchTerm) ||
                vehicle.vin?.toLowerCase().includes(searchTerm);
            
            // Status filter - handle both 'status' and 'vehicle_status' columns
            const vehicleStatus = this.getVehicleStatus(vehicle);
            const statusMatch = !statusFilter || vehicleStatus === statusFilter;
            
            return searchMatch && statusMatch;
        });
        
        this.render();
    },
    
    /**
     * Update stats cards
     */
    updateStats() {
        const total = this.data.length;
        const available = this.data.filter(v => this.getVehicleStatus(v) === 'Available').length;
        const rented = this.data.filter(v => this.getVehicleStatus(v) === 'Rented').length;
        const maintenance = this.data.filter(v => this.getVehicleStatus(v) === 'Maintenance').length;
        
        // Update stat elements if they exist
        const totalEl = document.getElementById('vehicles-stat-total');
        const availableEl = document.getElementById('vehicles-stat-available');
        const rentedEl = document.getElementById('vehicles-stat-rented');
        const maintenanceEl = document.getElementById('vehicles-stat-maintenance');
        
        if (totalEl) totalEl.textContent = total;
        if (availableEl) availableEl.textContent = available;
        if (rentedEl) rentedEl.textContent = rented;
        if (maintenanceEl) maintenanceEl.textContent = maintenance;
    },
    
    /**
     * Render vehicles table
     */
    render() {
        const container = document.getElementById('vehicles-table-body');
        if (!container) return;
        
        if (this.filtered.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-car"></i>
                        <p>No vehicles found</p>
                        <button class="btn btn-primary" onclick="Vehicles.openAddModal()">
                            <i class="fas fa-plus"></i> Add Vehicle
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = this.filtered.map(vehicle => this.renderRow(vehicle)).join('');
    },
    
    /**
     * Render single vehicle row
     */
    renderRow(vehicle) {
        const vehicleStatus = this.getVehicleStatus(vehicle);
        const statusClass = this.getStatusClass(vehicleStatus);
        const statusLabel = vehicleStatus || 'Unknown';
        
        return `
            <tr data-vehicle-id="${vehicle.id}">
                <td>
                    <div class="vehicle-cell">
                        <div class="vehicle-image-small">
                            ${vehicle.image_url 
                                ? `<img src="${vehicle.image_url}" alt="${vehicle.make}" onerror="this.parentElement.innerHTML='🚗'">`
                                : '🚗'}
                        </div>
                        <div class="vehicle-info">
                            <div class="vehicle-name">${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}</div>
                            <div class="vehicle-id">${vehicle.vehicle_id || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="license-plate">${vehicle.license_plate || 'N/A'}</span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </td>
                <td>
                    <span class="mileage">${(vehicle.current_mileage || 0).toLocaleString()} mi</span>
                </td>
                <td>
                    <span class="rate">$${vehicle.weekly_rate || CONFIG.business.weeklyRate}/wk</span>
                </td>
                <td>
                    <span class="vin-short" title="${vehicle.vin || 'N/A'}">${vehicle.vin ? '...' + vehicle.vin.slice(-6) : 'N/A'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="Vehicles.view('${vehicle.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon" onclick="Vehicles.edit('${vehicle.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="Vehicles.toggleStatus('${vehicle.id}')" title="Change Status">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button class="btn-icon danger" onclick="Vehicles.delete('${vehicle.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },
    
    /**
     * Get status badge class
     */
    getStatusClass(status) {
        const classes = {
            'Available': 'status-available',
            'Rented': 'status-rented',
            'Maintenance': 'status-maintenance',
            'Reserved': 'status-reserved'
        };
        return classes[status] || 'status-unknown';
    },
    
    /**
     * Open add vehicle modal
     */
    openAddModal() {
        const modal = document.getElementById('modal-add-vehicle');
        if (modal) {
            // Reset form
            const form = document.getElementById('form-add-vehicle');
            if (form) form.reset();
            
            // Generate next vehicle ID
            this.generateVehicleId();
            
            // Show modal
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    /**
     * Close add vehicle modal
     */
    closeAddModal() {
        const modal = document.getElementById('modal-add-vehicle');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Generate next vehicle ID (V001, V002, etc.)
     */
    generateVehicleId() {
        const existingIds = this.data
            .map(v => v.vehicle_id)
            .filter(id => id && id.startsWith('V'))
            .map(id => parseInt(id.replace('V', '')) || 0);
        
        const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        const nextId = `V${String(nextNum).padStart(3, '0')}`;
        
        const idInput = document.getElementById('add-vehicle-id');
        if (idInput) idInput.value = nextId;
        
        return nextId;
    },
    
    /**
     * Save new vehicle
     */
    async save() {
        const form = document.getElementById('form-add-vehicle');
        if (!form) return;
        
        // Gather form data
        const formData = new FormData(form);
        const vehicleData = {
            vehicle_id: formData.get('vehicle_id') || this.generateVehicleId(),
            make: formData.get('make'),
            model: formData.get('model'),
            year: parseInt(formData.get('year')) || null,
            vin: formData.get('vin'),
            license_plate: formData.get('license_plate'),
            color: formData.get('color'),
            status: formData.get('status') || 'Available',
            weekly_rate: parseFloat(formData.get('weekly_rate')) || CONFIG.business.weeklyRate,
            current_mileage: parseInt(formData.get('current_mileage')) || 0,
            purchase_price: parseFloat(formData.get('purchase_price')) || null,
            monthly_payment: parseFloat(formData.get('monthly_payment')) || null,
            insurance_cost: parseFloat(formData.get('insurance_cost')) || null,
            gps_device_id: formData.get('gps_device_id'),
            notes: formData.get('notes')
        };
        
        // Validate required fields
        if (!vehicleData.make || !vehicleData.model) {
            Utils.toastError('Make and Model are required');
            return;
        }
        
        try {
            Utils.toastInfo('Saving vehicle...');
            
            // Handle image upload if present
            const imageInput = document.getElementById('add-vehicle-image');
            if (imageInput?.files?.length > 0) {
                const file = imageInput.files[0];
                const fileName = `${vehicleData.vehicle_id}_${Date.now()}.${file.name.split('.').pop()}`;
                
                const { data: uploadData, error: uploadError } = await db.storage
                    .from(CONFIG.buckets.vehicleImages)
                    .upload(fileName, file);
                
                if (uploadError) {
                    console.error('Image upload error:', uploadError);
                } else {
                    const { data: urlData } = db.storage
                        .from(CONFIG.buckets.vehicleImages)
                        .getPublicUrl(fileName);
                    vehicleData.image_url = urlData.publicUrl;
                }
            }
            
            // Insert into database
            const { data, error } = await db
                .from('vehicles')
                .insert([vehicleData])
                .select();
            
            if (error) throw error;
            
            Utils.toastSuccess('Vehicle added successfully!');
            this.closeAddModal();
            await this.load();
            
            // Refresh dashboard if visible
            if (typeof Dashboard !== 'undefined') {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error saving vehicle:', error);
            Utils.toastError('Failed to save vehicle: ' + error.message);
        }
    },
    
    /**
     * View vehicle details
     */
    view(vehicleId) {
        const vehicle = this.data.find(v => v.id === vehicleId);
        if (!vehicle) {
            Utils.toastError('Vehicle not found');
            return;
        }
        
        const modal = document.getElementById('modal-view-vehicle');
        if (!modal) {
            Utils.toastError('View modal not found');
            return;
        }
        
        // Populate the modal with vehicle data
        const imageContainer = document.getElementById('view-vehicle-image');
        const status = this.getVehicleStatus(vehicle);
        const statusClass = status.toLowerCase().replace(' ', '-');
        
        if (vehicle.image_url) {
            imageContainer.innerHTML = `
                <img src="${vehicle.image_url}" alt="${vehicle.make} ${vehicle.model}">
                <span class="vehicle-detail-status ${statusClass}">${status}</span>
            `;
        } else {
            imageContainer.innerHTML = `
                <div class="no-image">
                    <i class="fas fa-car"></i>
                    <span>No image available</span>
                </div>
                <span class="vehicle-detail-status ${statusClass}">${status}</span>
            `;
        }
        
        document.getElementById('view-vehicle-title').textContent = 
            `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        document.getElementById('view-vehicle-id').textContent = vehicle.vehicle_id || 'N/A';
        document.getElementById('view-vehicle-color').textContent = vehicle.color || 'N/A';
        document.getElementById('view-vehicle-plate').textContent = vehicle.license_plate || 'N/A';
        document.getElementById('view-vehicle-vin').textContent = vehicle.vin || 'N/A';
        document.getElementById('view-vehicle-mileage').textContent = 
            `${(vehicle.current_mileage || 0).toLocaleString()} mi`;
        document.getElementById('view-vehicle-rate').textContent = 
            `$${vehicle.weekly_rate || 400}/wk`;
        document.getElementById('view-vehicle-status').textContent = status;
        document.getElementById('view-vehicle-service').textContent = 
            vehicle.last_service_date 
                ? new Date(vehicle.last_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Not recorded';
        document.getElementById('view-vehicle-uuid').value = vehicle.id;
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    closeViewModal() {
        const modal = document.getElementById('modal-view-vehicle');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Open edit vehicle modal
     */
    edit(vehicleId) {
        const vehicle = this.data.find(v => v.id === vehicleId);
        if (!vehicle) {
            Utils.toastError('Vehicle not found');
            return;
        }
        
        const modal = document.getElementById('modal-edit-vehicle');
        if (!modal) {
            Utils.toastInfo('Edit modal coming in next update');
            return;
        }
        
        // Populate form with vehicle data
        document.getElementById('edit-vehicle-id').value = vehicle.id;
        document.getElementById('edit-vehicle-display-id').value = vehicle.vehicle_id || '';
        document.getElementById('edit-vehicle-make').value = vehicle.make || '';
        document.getElementById('edit-vehicle-model').value = vehicle.model || '';
        document.getElementById('edit-vehicle-year').value = vehicle.year || '';
        document.getElementById('edit-vehicle-vin').value = vehicle.vin || '';
        document.getElementById('edit-vehicle-license-plate').value = vehicle.license_plate || '';
        document.getElementById('edit-vehicle-color').value = vehicle.color || '';
        document.getElementById('edit-vehicle-status').value = this.getVehicleStatus(vehicle);
        document.getElementById('edit-vehicle-weekly-rate').value = vehicle.weekly_rate || 400;
        document.getElementById('edit-vehicle-mileage').value = vehicle.current_mileage || 0;
        document.getElementById('edit-vehicle-purchase-price').value = vehicle.purchase_price || '';
        document.getElementById('edit-vehicle-monthly-payment').value = vehicle.monthly_payment || '';
        document.getElementById('edit-vehicle-insurance').value = vehicle.insurance_cost || '';
        document.getElementById('edit-vehicle-gps').value = vehicle.gps_device_id || '';
        document.getElementById('edit-vehicle-notes').value = vehicle.notes || '';
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close edit modal
     */
    closeEditModal() {
        const modal = document.getElementById('modal-edit-vehicle');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Update existing vehicle
     */
    async update() {
        const vehicleId = document.getElementById('edit-vehicle-id')?.value;
        if (!vehicleId) {
            Utils.toastError('Vehicle ID not found');
            return;
        }
        
        const statusValue = document.getElementById('edit-vehicle-status')?.value;
        const updateData = {
            vehicle_id: document.getElementById('edit-vehicle-display-id')?.value,
            make: document.getElementById('edit-vehicle-make')?.value,
            model: document.getElementById('edit-vehicle-model')?.value,
            year: parseInt(document.getElementById('edit-vehicle-year')?.value) || null,
            vin: document.getElementById('edit-vehicle-vin')?.value,
            license_plate: document.getElementById('edit-vehicle-license-plate')?.value,
            color: document.getElementById('edit-vehicle-color')?.value,
            status: statusValue,
            vehicle_status: statusValue, // Update both columns for consistency
            weekly_rate: parseFloat(document.getElementById('edit-vehicle-weekly-rate')?.value) || 400,
            current_mileage: parseInt(document.getElementById('edit-vehicle-mileage')?.value) || 0,
            purchase_price: parseFloat(document.getElementById('edit-vehicle-purchase-price')?.value) || null,
            monthly_payment: parseFloat(document.getElementById('edit-vehicle-monthly-payment')?.value) || null,
            insurance_cost: parseFloat(document.getElementById('edit-vehicle-insurance')?.value) || null,
            gps_device_id: document.getElementById('edit-vehicle-gps')?.value,
            notes: document.getElementById('edit-vehicle-notes')?.value,
            updated_at: new Date().toISOString()
        };
        
        try {
            Utils.toastInfo('Updating vehicle...');
            
            const { error } = await db
                .from('vehicles')
                .update(updateData)
                .eq('id', vehicleId);
            
            if (error) throw error;
            
            Utils.toastSuccess('Vehicle updated successfully!');
            this.closeEditModal();
            await this.load();
            
        } catch (error) {
            console.error('Error updating vehicle:', error);
            Utils.toastError('Failed to update vehicle: ' + error.message);
        }
    },
    
    /**
     * Toggle vehicle status
     */
    async toggleStatus(vehicleId) {
        const vehicle = this.data.find(v => v.id === vehicleId);
        if (!vehicle) {
            Utils.toastError('Vehicle not found');
            return;
        }
        
        // Cycle through statuses - handle both column names
        const statuses = CONFIG.vehicleStatuses;
        const currentStatus = this.getVehicleStatus(vehicle);
        const currentIndex = statuses.findIndex(s => 
            s.toLowerCase() === currentStatus.toLowerCase()
        );
        
        // If current status not found (including null/empty), start at 'Available'
        let newStatus;
        if (currentIndex === -1) {
            newStatus = statuses[0]; // Default to 'Available'
            console.log(`⚠️ Vehicle status "${currentStatus}" not recognized, setting to ${newStatus}`);
        } else {
            const nextIndex = (currentIndex + 1) % statuses.length;
            newStatus = statuses[nextIndex];
        }
        
        try {
            // Update BOTH status columns to ensure consistency
            const { error } = await db
                .from('vehicles')
                .update({ 
                    status: newStatus,
                    vehicle_status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', vehicleId);
            
            if (error) throw error;
            
            Utils.toastSuccess(`Status changed to ${newStatus}`);
            await this.load();
            
        } catch (error) {
            console.error('Error toggling status:', error);
            Utils.toastError('Failed to change status: ' + (error.message || 'Unknown error'));
        }
    },
    
    /**
     * Delete vehicle
     */
    async delete(vehicleId) {
        const vehicle = this.data.find(v => v.id === vehicleId);
        if (!vehicle) {
            Utils.toastError('Vehicle not found');
            return;
        }
        
        const confirmed = confirm(`Are you sure you want to delete ${vehicle.year} ${vehicle.make} ${vehicle.model}?\n\nThis action cannot be undone.`);
        if (!confirmed) return;
        
        try {
            Utils.toastInfo('Deleting vehicle...');
            
            const { error } = await db
                .from('vehicles')
                .delete()
                .eq('id', vehicleId);
            
            if (error) throw error;
            
            Utils.toastSuccess('Vehicle deleted');
            await this.load();
            
            // Refresh dashboard
            if (typeof Dashboard !== 'undefined') {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            Utils.toastError('Failed to delete vehicle: ' + error.message);
        }
    },
    
    /**
     * Refresh vehicles data
     */
    async refresh() {
        Utils.toastInfo('Refreshing...');
        await this.load();
        Utils.toastSuccess('Vehicles refreshed');
    }
};

// Export
window.Vehicles = Vehicles;
