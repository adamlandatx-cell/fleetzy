/* ============================================
   FLEETZY ADMIN - CUSTOMERS MODULE
   Full customer management with approval workflow
   ============================================ */

const Customers = {
    // Cached data
    data: [],
    filtered: [],
    
    /**
     * Initialize customers tab
     */
    async init() {
        console.log('👥 Initializing Customers module...');
        await this.load();
        this.setupEventListeners();
    },
    
    /**
     * Load customers from Supabase
     */
    async load() {
        try {
            const { data, error } = await db
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.data = data || [];
            this.filtered = [...this.data];
            this.render();
            this.updateStats();
            this.updateSidebarBadge();
            
            console.log(`✅ Loaded ${this.data.length} customers`);
        } catch (error) {
            console.error('❌ Error loading customers:', error);
            Utils.toastError('Failed to load customers');
        }
    },
    
    /**
     * Setup event listeners for search and filters
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('customers-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filter());
        }
        
        // Status filter
        const statusFilter = document.getElementById('customers-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filter());
        }
    },
    
    /**
     * Normalize status for comparison
     */
    normalizeStatus(customer) {
        const status = (customer.status || customer.application_status || '').toLowerCase();
        if (status.includes('pending') || status === 'pending_verification') return 'pending';
        if (status.includes('approved') || status === 'active') return 'approved';
        if (status.includes('rejected')) return 'rejected';
        return 'unknown';
    },
    
    /**
     * Filter customers based on search and status
     */
    filter() {
        const searchTerm = document.getElementById('customers-search')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('customers-status-filter')?.value || '';
        
        this.filtered = this.data.filter(customer => {
            // Search filter - DB uses full_name, not first_name/last_name
            const fullName = (customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`).toLowerCase();
            const searchMatch = !searchTerm || 
                fullName.includes(searchTerm) ||
                customer.phone?.toLowerCase().includes(searchTerm) ||
                customer.email?.toLowerCase().includes(searchTerm) ||
                customer.customer_id?.toLowerCase().includes(searchTerm);
            
            // Status filter
            const normalizedStatus = this.normalizeStatus(customer);
            const statusMatch = !statusFilter || normalizedStatus === statusFilter;
            
            return searchMatch && statusMatch;
        });
        
        this.render();
    },
    
    /**
     * Update stats cards
     */
    updateStats() {
        const total = this.data.length;
        const pending = this.data.filter(c => this.normalizeStatus(c) === 'pending').length;
        const approved = this.data.filter(c => this.normalizeStatus(c) === 'approved').length;
        // Active renters would require joining with rentals table - for now show approved
        const activeRenters = approved; // Placeholder
        
        const totalEl = document.getElementById('customers-stat-total');
        const pendingEl = document.getElementById('customers-stat-pending');
        const approvedEl = document.getElementById('customers-stat-approved');
        const activeEl = document.getElementById('customers-stat-active');
        
        if (totalEl) totalEl.textContent = total;
        if (pendingEl) pendingEl.textContent = pending;
        if (approvedEl) approvedEl.textContent = approved;
        if (activeEl) activeEl.textContent = activeRenters;
    },
    
    /**
     * Update sidebar badge with pending count
     */
    updateSidebarBadge() {
        const pendingCount = this.data.filter(c => this.normalizeStatus(c) === 'pending').length;
        if (typeof Sidebar !== 'undefined') {
            Sidebar.updateBadge('customers', pendingCount);
        }
    },
    
    /**
     * Render customers table
     */
    render() {
        const container = document.getElementById('customers-table-body');
        if (!container) return;
        
        if (this.filtered.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>No customers found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = this.filtered.map(customer => this.renderRow(customer)).join('');
    },
    
    /**
     * Render single customer row
     * UPDATED: Uses actual column names (full_name, is_company_rental)
     */
    renderRow(customer) {
        const normalizedStatus = this.normalizeStatus(customer);
        const statusClass = this.getStatusClass(normalizedStatus);
        const statusLabel = this.formatStatus(normalizedStatus);
        // DB uses full_name, not first_name/last_name
        const fullName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
        
        // Get avatar - use selfie if available, otherwise generate initial avatar
        const avatarUrl = customer.selfie_url || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff&size=64`;
        
        // Format applied date
        const appliedDate = customer.created_at 
            ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'N/A';
        
        // Corporate badge - DB uses is_company_rental, not is_corporate_rental
        const corporateBadge = (customer.is_company_rental || customer.is_corporate_rental)
            ? '<span class="badge-corporate">Corporate</span>' 
            : '';
        
        // Generate action buttons based on status
        const actionButtons = this.getActionButtons(customer, normalizedStatus);
        
        return `
            <tr data-customer-id="${customer.id}">
                <td>
                    <div class="customer-cell">
                        <img src="${avatarUrl}" alt="${fullName}" class="customer-avatar" 
                             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff&size=64'">
                        <div class="customer-info">
                            <div class="customer-name">${fullName} ${corporateBadge}</div>
                            <div class="customer-id">${customer.customer_id || 'No ID'}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="contact-info">
                        <div class="contact-phone">
                            <i class="fas fa-phone"></i>
                            ${customer.phone || 'N/A'}
                        </div>
                        <div class="contact-email">
                            <i class="fas fa-envelope"></i>
                            ${customer.email || 'N/A'}
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </td>
                <td>
                    <div class="dl-info">
                        <div>${customer.dl_state || ''} ${customer.dl_number ? '•••' + customer.dl_number.slice(-4) : 'N/A'}</div>
                        <div class="dl-expiry">${customer.dl_expiry_date ? 'Exp: ' + customer.dl_expiry_date : ''}</div>
                    </div>
                </td>
                <td>
                    <span class="date-applied">${appliedDate}</span>
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
     * Get action buttons based on customer status
     */
    getActionButtons(customer, status) {
        let buttons = [];
        // DB uses full_name
        const fullName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';
        
        // View button (always available)
        buttons.push(`
            <button class="btn-icon" onclick="Customers.view('${customer.id}')" title="View Details">
                <i class="fas fa-eye"></i>
            </button>
        `);
        
        // Documents button (always available) - NEW!
        buttons.push(`
            <button class="btn-icon docs" onclick="Documents.openModal('${customer.id}', '${fullName.replace(/'/g, "\\'")}')" title="Manage Documents">
                <i class="fas fa-folder-open"></i>
            </button>
        `);
        
        if (status === 'pending') {
            // Pending: Review, Approve, Reject
            buttons.push(`
                <button class="btn-icon review" onclick="Customers.openReviewModal('${customer.id}')" title="Review Application">
                    <i class="fas fa-clipboard-check"></i>
                </button>
            `);
            buttons.push(`
                <button class="btn-icon success" onclick="Customers.approve('${customer.id}')" title="Approve">
                    <i class="fas fa-check"></i>
                </button>
            `);
            buttons.push(`
                <button class="btn-icon danger" onclick="Customers.openRejectModal('${customer.id}')" title="Reject">
                    <i class="fas fa-times"></i>
                </button>
            `);
        } else if (status === 'approved') {
            // Approved: Edit
            buttons.push(`
                <button class="btn-icon" onclick="Customers.edit('${customer.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            `);
        } else if (status === 'rejected') {
            // Rejected: Reinstate
            buttons.push(`
                <button class="btn-icon" onclick="Customers.reinstate('${customer.id}')" title="Reinstate">
                    <i class="fas fa-undo"></i>
                </button>
            `);
        }
        
        // Delete button (always available - at the end for all statuses)
        buttons.push(`
            <button class="btn-icon delete" onclick="Customers.delete('${customer.id}')" title="Delete Customer">
                <i class="fas fa-trash"></i>
            </button>
        `);
        
        return buttons.join('');
    },
    
    /**
     * Get status badge class
     */
    getStatusClass(status) {
        const classes = {
            'pending': 'status-pending',
            'approved': 'status-approved',
            'rejected': 'status-rejected',
            'unknown': 'status-unknown'
        };
        return classes[status] || 'status-unknown';
    },
    
    /**
     * Format status for display
     */
    formatStatus(status) {
        const labels = {
            'pending': 'Pending Review',
            'approved': 'Approved',
            'rejected': 'Rejected',
            'unknown': 'Unknown'
        };
        return labels[status] || 'Unknown';
    },
    
    /**
     * View customer details
     */
    view(customerId) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        // Open view modal (same as review but read-only style)
        this.openReviewModal(customerId, true);
    },
    
    /**
     * Open review application modal
     * FIXED: Uses actual DB column names (verified Jan 2025)
     */
    openReviewModal(customerId, viewOnly = false) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        const modal = document.getElementById('modal-review-customer');
        if (!modal) {
            Utils.toastInfo('Review modal not available');
            return;
        }
        
        // Populate modal with customer data
        // DB uses full_name, not first_name/last_name
        const fullName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
        
        // Basic info
        document.getElementById('review-customer-name').textContent = fullName;
        document.getElementById('review-customer-id').textContent = customer.customer_id || 'Pending';
        document.getElementById('review-customer-phone').textContent = customer.phone || 'N/A';
        document.getElementById('review-customer-email').textContent = customer.email || 'N/A';
        document.getElementById('review-customer-dob').textContent = customer.date_of_birth || 'N/A';
        
        // Address - DB has 'address' or 'current_address' as single text field
        const address = customer.current_address || customer.address || 'N/A';
        document.getElementById('review-customer-address').textContent = address;
        
        // Driver's License - DB uses dl_ prefix, not drivers_license_
        document.getElementById('review-dl-number').textContent = customer.dl_number || 'N/A';
        document.getElementById('review-dl-state').textContent = customer.dl_state || 'N/A';
        document.getElementById('review-dl-expiry').textContent = customer.dl_expiry_date || 'N/A';
        
        // Background check status
        const bgStatus = customer.background_check_status || 'Not Started';
        const bgStatusEl = document.getElementById('review-bg-status');
        if (bgStatusEl) {
            bgStatusEl.textContent = bgStatus;
            bgStatusEl.className = 'status-badge ' + this.getBgStatusClass(bgStatus);
        }
        
        // Corporate info - DB uses is_company_rental, not is_corporate_rental
        const corporateSection = document.getElementById('review-corporate-section');
        if (corporateSection) {
            if (customer.is_company_rental || customer.is_corporate_rental) {
                corporateSection.style.display = 'block';
                document.getElementById('review-company-name').textContent = customer.company_name || 'N/A';
                document.getElementById('review-company-rep').textContent = customer.company_contact_person || customer.company_rep_name || 'N/A';
                document.getElementById('review-company-phone').textContent = customer.company_phone || 'N/A';
            } else {
                corporateSection.style.display = 'none';
            }
        }
        
        // Document images - DB uses dl_photo_front_url, dl_photo_back_url
        this.loadDocumentImage('review-dl-front', customer.dl_photo_front_url);
        this.loadDocumentImage('review-dl-back', customer.dl_photo_back_url);
        this.loadDocumentImage('review-selfie', customer.selfie_url);
        this.loadDocumentImage('review-income-proof', customer.weekly_earnings_proof_url || customer.gig_proof_url);
        
        // Income proof section visibility
        const incomeSection = document.getElementById('review-income-section');
        if (incomeSection) {
            incomeSection.style.display = (customer.is_company_rental || customer.is_corporate_rental) ? 'none' : 'block';
        }
        
        // Store customer ID for approval/rejection
        modal.dataset.customerId = customerId;
        
        // Show/hide action buttons based on status and viewOnly
        const actionsSection = document.getElementById('review-actions');
        if (actionsSection) {
            const status = this.normalizeStatus(customer);
            actionsSection.style.display = (viewOnly || status !== 'pending') ? 'none' : 'flex';
        }
        
        // Update modal title
        const modalTitle = modal.querySelector('.modal-header h3');
        if (modalTitle) {
            modalTitle.innerHTML = viewOnly 
                ? '<i class="fas fa-user"></i> Customer Details'
                : '<i class="fas fa-clipboard-check"></i> Review Application';
        }
        
        // Show modal - clear any inline display:none set by sidebar.closeAllModals()
        modal.style.display = '';  // Clear inline style so CSS can work
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Load document image into preview
     */
    loadDocumentImage(elementId, url) {
        const container = document.getElementById(elementId);
        if (!container) return;
        
        if (url) {
            container.innerHTML = `
                <img src="${url}" alt="Document" onclick="Customers.openImageModal('${url}')" 
                     onerror="this.parentElement.innerHTML='<div class=\'doc-placeholder\'><i class=\'fas fa-image\'></i><span>Failed to load</span></div>'">
            `;
        } else {
            container.innerHTML = `
                <div class="doc-placeholder">
                    <i class="fas fa-image"></i>
                    <span>Not uploaded</span>
                </div>
            `;
        }
    },
    
    /**
     * Open full-size image modal
     */
    openImageModal(url) {
        const modal = document.getElementById('modal-image-viewer');
        if (!modal) {
            // Fallback: open in new tab
            window.open(url, '_blank');
            return;
        }
        
        const img = modal.querySelector('.image-viewer-content img');
        if (img) {
            img.src = url;
        }
        
        modal.classList.add('active');
    },
    
    /**
     * Close image modal
     */
    closeImageModal() {
        const modal = document.getElementById('modal-image-viewer');
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    /**
     * Get background check status class
     */
    getBgStatusClass(status) {
        const statusLower = (status || '').toLowerCase();
        if (statusLower === 'clear' || statusLower === 'passed') return 'status-approved';
        if (statusLower === 'failed') return 'status-rejected';
        if (statusLower === 'in progress') return 'status-pending';
        return 'status-unknown';
    },
    
    /**
     * Close review modal
     */
    closeReviewModal() {
        const modal = document.getElementById('modal-review-customer');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            delete modal.dataset.customerId;
        }
    },
    
    /**
     * Approve customer
     * VERIFIED: Uses only columns that exist in DB (status, customer_id, updated_at)
     */
    async approve(customerId, fromModal = false) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        // DB uses full_name
        const fullName = customer.full_name || 'Customer';
        
        // Confirm if not from modal
        if (!fromModal) {
            const confirmed = confirm(`Approve ${fullName} for rental?`);
            if (!confirmed) return;
        }
        
        try {
            Utils.toastInfo('Approving customer...');
            
            // Generate customer ID if doesn't exist
            let newCustomerId = customer.customer_id;
            if (!newCustomerId) {
                newCustomerId = await this.generateCustomerId();
            }
            
            // ONLY these columns exist in the customers table
            const { error } = await db
                .from('customers')
                .update({
                    status: 'approved',
                    customer_id: newCustomerId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', customerId);
            
            if (error) throw error;
            
            Utils.toastSuccess(`${fullName} has been approved!`);
            
            // Close modal if open
            this.closeReviewModal();
            
            // Reload data
            await this.load();
            
            // Update dashboard pending count
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error approving customer:', error);
            Utils.toastError('Failed to approve customer: ' + error.message);
        }
    },
    
    /**
     * Generate next customer ID (C001, C002, etc.)
     */
    async generateCustomerId() {
        const existingIds = this.data
            .map(c => c.customer_id)
            .filter(id => id && id.startsWith('C'))
            .map(id => parseInt(id.replace('C', '')) || 0);
        
        const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        return `C${String(nextNum).padStart(3, '0')}`;
    },
    
    /**
     * Open reject modal
     * FIXED: Uses full_name instead of first_name/last_name
     */
    openRejectModal(customerId) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        const modal = document.getElementById('modal-reject-customer');
        if (!modal) {
            // Fallback: simple prompt
            const reason = prompt('Reason for rejection (optional):');
            this.reject(customerId, reason || '');
            return;
        }
        
        // DB uses full_name, not first_name/last_name
        const fullName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';
        document.getElementById('reject-customer-name').textContent = fullName;
        document.getElementById('reject-reason').value = '';
        
        modal.dataset.customerId = customerId;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close reject modal
     */
    closeRejectModal() {
        const modal = document.getElementById('modal-reject-customer');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            delete modal.dataset.customerId;
        }
    },
    
    /**
     * Confirm rejection from modal
     */
    async confirmReject() {
        const modal = document.getElementById('modal-reject-customer');
        const customerId = modal?.dataset.customerId;
        const reason = document.getElementById('reject-reason')?.value || '';
        
        if (!customerId) {
            Utils.toastError('Customer not found');
            return;
        }
        
        await this.reject(customerId, reason);
    },
    
    /**
     * Reject customer
     * VERIFIED: Uses only columns that exist in DB (status, updated_at)
     */
    async reject(customerId, reason = '') {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        // DB uses full_name
        const fullName = customer.full_name || 'Customer';
        
        try {
            Utils.toastInfo('Processing rejection...');
            
            // ONLY these columns exist in the customers table
            // Note: rejection_reason doesn't exist, so we can't store it
            const { error } = await db
                .from('customers')
                .update({
                    status: 'rejected',
                    updated_at: new Date().toISOString()
                })
                .eq('id', customerId);
            
            if (error) throw error;
            
            Utils.toastSuccess(`${fullName} has been rejected`);
            
            // Close modals
            this.closeRejectModal();
            this.closeReviewModal();
            
            // Reload data
            await this.load();
            
            // Update dashboard
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error rejecting customer:', error);
            Utils.toastError('Failed to reject customer: ' + error.message);
        }
    },
    
    /**
     * Reinstate rejected customer
     * VERIFIED: Uses only columns that exist in DB (status, updated_at)
     */
    async reinstate(customerId) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        // DB uses full_name
        const fullName = customer.full_name || 'Customer';
        const confirmed = confirm(`Reinstate ${fullName} to pending status?`);
        if (!confirmed) return;
        
        try {
            Utils.toastInfo('Reinstating customer...');
            
            // ONLY these columns exist in the customers table
            const { error } = await db
                .from('customers')
                .update({
                    status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', customerId);
            
            if (error) throw error;
            
            Utils.toastSuccess(`${fullName} reinstated to pending`);
            await this.load();
            
        } catch (error) {
            console.error('Error reinstating customer:', error);
            Utils.toastError('Failed to reinstate customer: ' + error.message);
        }
    },
    
    /**
     * Delete customer from database
     * WARNING: This permanently removes the customer record
     */
    async delete(customerId) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        // DB uses full_name
        const fullName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';
        
        // Double confirm for safety - this is a destructive action
        const confirmed = confirm(`⚠️ DELETE CUSTOMER\n\nAre you sure you want to permanently delete "${fullName}"?\n\nThis action cannot be undone and will remove all their data from the system.`);
        if (!confirmed) return;
        
        // Second confirmation for extra safety
        const doubleConfirm = confirm(`FINAL CONFIRMATION\n\nType OK to permanently delete "${fullName}".\n\nAll customer data, documents, and history will be lost.`);
        if (!doubleConfirm) return;
        
        try {
            Utils.toastInfo('Deleting customer...');
            
            // Delete from Supabase
            const { error } = await db
                .from('customers')
                .delete()
                .eq('id', customerId);
            
            if (error) throw error;
            
            Utils.toastSuccess(`${fullName} has been deleted`);
            
            // Reload customer list
            await this.load();
            
            // Update dashboard stats if available
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error deleting customer:', error);
            Utils.toastError('Failed to delete customer: ' + error.message);
        }
    },
    
    /**
     * Open edit customer modal
     * FIXED: Uses actual DB columns (full_name, address, dl_number, etc.)
     */
    edit(customerId) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        const modal = document.getElementById('modal-edit-customer');
        if (!modal) {
            Utils.toastInfo('Edit modal coming soon');
            return;
        }
        
        // Parse full_name into first/last for form display
        const fullName = customer.full_name || '';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Parse address into components (format: "Street, City, State ZIP" or just "Street")
        const addressStr = customer.address || customer.current_address || '';
        let street = '', city = '', state = '', zip = '';
        
        if (addressStr) {
            // Try to parse "8615 Doris Oaks Circle, Houston, TX 77028" format
            const parts = addressStr.split(',').map(p => p.trim());
            if (parts.length >= 3) {
                street = parts[0];
                city = parts[1];
                // Last part might be "TX 77028"
                const stateZip = parts[2].trim().split(' ');
                state = stateZip[0] || '';
                zip = stateZip[1] || '';
            } else if (parts.length === 2) {
                street = parts[0];
                const cityStateZip = parts[1].trim().split(' ');
                city = cityStateZip[0] || '';
                state = cityStateZip[1] || '';
                zip = cityStateZip[2] || '';
            } else {
                street = addressStr;
            }
        }
        
        // Populate form with correct field mappings
        document.getElementById('edit-customer-id').value = customer.id;
        document.getElementById('edit-customer-display-id').value = customer.customer_id || '';
        document.getElementById('edit-customer-first-name').value = firstName;
        document.getElementById('edit-customer-last-name').value = lastName;
        document.getElementById('edit-customer-phone').value = customer.phone || '';
        document.getElementById('edit-customer-email').value = customer.email || '';
        document.getElementById('edit-customer-dob').value = customer.date_of_birth || '';
        document.getElementById('edit-customer-address').value = street;
        document.getElementById('edit-customer-city').value = city;
        document.getElementById('edit-customer-state').value = state;
        document.getElementById('edit-customer-zip').value = zip;
        // DB uses dl_number, dl_state, dl_expiry_date (not drivers_license_*)
        document.getElementById('edit-customer-dl-number').value = customer.dl_number || '';
        document.getElementById('edit-customer-dl-state').value = customer.dl_state || '';
        document.getElementById('edit-customer-dl-expiry').value = customer.dl_expiry_date || '';
        document.getElementById('edit-customer-notes').value = customer.notes || '';
        
        console.log('📝 Editing customer:', customer.id, 'Full name:', fullName, 'Address:', addressStr);
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close edit modal
     */
    closeEditModal() {
        const modal = document.getElementById('modal-edit-customer');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Update customer
     * FIXED: Uses actual DB columns (full_name, address, dl_number, etc.)
     */
    async update() {
        const customerId = document.getElementById('edit-customer-id')?.value;
        if (!customerId) {
            Utils.toastError('Customer ID not found');
            return;
        }
        
        // Get form values
        const firstName = document.getElementById('edit-customer-first-name')?.value?.trim() || '';
        const lastName = document.getElementById('edit-customer-last-name')?.value?.trim() || '';
        const phone = document.getElementById('edit-customer-phone')?.value?.trim() || '';
        const email = document.getElementById('edit-customer-email')?.value?.trim() || '';
        const dob = document.getElementById('edit-customer-dob')?.value || null;
        const street = document.getElementById('edit-customer-address')?.value?.trim() || '';
        const city = document.getElementById('edit-customer-city')?.value?.trim() || '';
        const state = document.getElementById('edit-customer-state')?.value?.trim() || '';
        const zip = document.getElementById('edit-customer-zip')?.value?.trim() || '';
        const dlNumber = document.getElementById('edit-customer-dl-number')?.value?.trim() || '';
        const dlState = document.getElementById('edit-customer-dl-state')?.value?.trim() || '';
        const dlExpiry = document.getElementById('edit-customer-dl-expiry')?.value || null;
        const notes = document.getElementById('edit-customer-notes')?.value?.trim() || '';
        
        // Validate required fields
        if (!firstName || !lastName || !phone) {
            Utils.toastError('First name, last name, and phone are required');
            return;
        }
        
        // Combine name and address for DB columns
        const fullName = `${firstName} ${lastName}`.trim();
        const fullAddress = [street, city, `${state} ${zip}`.trim()].filter(Boolean).join(', ');
        
        // Build update object with CORRECT column names
        const updateData = {
            full_name: fullName,
            phone: phone,
            email: email || null,
            date_of_birth: dob,
            address: fullAddress,
            current_address: fullAddress,
            dl_number: dlNumber || null,
            dl_state: dlState || null,
            dl_expiry_date: dlExpiry,
            notes: notes || null,
            updated_at: new Date().toISOString()
        };
        
        console.log('📤 Updating customer with:', updateData);
        
        try {
            Utils.toastInfo('Updating customer...');
            
            const { error } = await db
                .from('customers')
                .update(updateData)
                .eq('id', customerId);
            
            if (error) throw error;
            
            Utils.toastSuccess('Customer updated successfully!');
            this.closeEditModal();
            await this.load();
            
        } catch (error) {
            console.error('Error updating customer:', error);
            Utils.toastError('Failed to update customer: ' + error.message);
        }
    },
    
    /**
     * Refresh customers data
     */
    async refresh() {
        Utils.toastInfo('Refreshing...');
        await this.load();
        Utils.toastSuccess('Customers refreshed');
    },
    
    // ============================================
    // ADD CUSTOMER FUNCTIONALITY
    // ============================================
    
    /**
     * Open add customer modal
     */
    async openAddModal() {
        const modal = document.getElementById('modal-add-customer');
        if (!modal) {
            Utils.toastError('Add customer modal not found');
            return;
        }
        
        // Reset form
        const form = document.getElementById('form-add-customer');
        if (form) form.reset();
        
        // Generate next customer ID
        const nextId = await this.generateCustomerId();
        document.getElementById('add-customer-id').value = nextId;
        
        // Reset previews
        this.resetImagePreviews();
        
        // Hide corporate section by default
        const corporateSection = document.getElementById('add-customer-corporate-section');
        if (corporateSection) corporateSection.style.display = 'none';
        
        // Uncheck corporate toggle
        const corporateToggle = document.getElementById('add-customer-is-corporate');
        if (corporateToggle) corporateToggle.checked = false;
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('add-customer-first-name')?.focus();
        }, 100);
    },
    
    /**
     * Close add customer modal
     */
    closeAddModal() {
        const modal = document.getElementById('modal-add-customer');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },
    
    /**
     * Toggle corporate fields visibility
     */
    toggleCorporateFields() {
        const isCorpate = document.getElementById('add-customer-is-corporate')?.checked;
        const corporateSection = document.getElementById('add-customer-corporate-section');
        
        if (corporateSection) {
            corporateSection.style.display = isCorpate ? 'block' : 'none';
        }
        
        // Toggle required on company name
        const companyName = document.getElementById('add-customer-company-name');
        if (companyName) {
            companyName.required = isCorpate;
        }
    },
    
    /**
     * Preview image when file selected
     */
    previewImage(input, previewId) {
        const preview = document.getElementById(previewId);
        if (!preview) return;
        
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.classList.add('has-image');
            };
            reader.readAsDataURL(input.files[0]);
        }
    },
    
    /**
     * Reset all image previews
     */
    resetImagePreviews() {
        const previews = [
            { id: 'preview-dl-front', icon: 'fa-id-card', text: 'Click to upload front' },
            { id: 'preview-dl-back', icon: 'fa-id-card', text: 'Click to upload back' },
            { id: 'preview-selfie', icon: 'fa-camera', text: 'Click to upload selfie' }
        ];
        
        previews.forEach(p => {
            const el = document.getElementById(p.id);
            if (el) {
                el.innerHTML = `<i class="fas ${p.icon}"></i><span>${p.text}</span>`;
                el.classList.remove('has-image');
            }
        });
    },
    
    /**
     * Upload file to Supabase storage
     */
    async uploadFile(file, bucket, fileName) {
        if (!file) return null;
        
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${fileName}.${fileExt}`;
            
            const { data, error } = await db.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });
            
            if (error) throw error;
            
            // Get public URL
            const { data: urlData } = db.storage
                .from(bucket)
                .getPublicUrl(filePath);
            
            return urlData.publicUrl;
        } catch (error) {
            console.error(`Error uploading to ${bucket}:`, error);
            return null;
        }
    },
    
    /**
     * Create new customer
     * UPDATED: Uses actual Supabase column names (verified Jan 2025)
     */
    async create() {
        // Validate required fields
        const firstName = document.getElementById('add-customer-first-name')?.value?.trim();
        const lastName = document.getElementById('add-customer-last-name')?.value?.trim();
        const phone = document.getElementById('add-customer-phone')?.value?.trim();
        const email = document.getElementById('add-customer-email')?.value?.trim();
        const dlNumber = document.getElementById('add-customer-dl-number')?.value?.trim();
        const dlState = document.getElementById('add-customer-dl-state')?.value;
        const dlExpiry = document.getElementById('add-customer-dl-expiry')?.value;
        
        if (!firstName || !lastName || !phone) {
            Utils.toastError('First name, last name, and phone are required');
            return;
        }
        
        if (!email) {
            Utils.toastError('Email is required');
            return;
        }
        
        if (!dlNumber || !dlState || !dlExpiry) {
            Utils.toastError('Driver\'s license information is required');
            return;
        }
        
        // Check for duplicate phone
        const existingCustomer = this.data.find(c => c.phone === phone);
        if (existingCustomer) {
            Utils.toastError('A customer with this phone number already exists');
            return;
        }
        
        try {
            Utils.toastInfo('Creating customer...');
            
            const customerId = document.getElementById('add-customer-id')?.value;
            const isCorporate = document.getElementById('add-customer-is-corporate')?.checked || false;
            
            // Upload files
            const timestamp = Date.now();
            const baseFileName = `${customerId}-${timestamp}`;
            
            const dlFrontFile = document.getElementById('add-customer-dl-front')?.files?.[0];
            const dlBackFile = document.getElementById('add-customer-dl-back')?.files?.[0];
            const selfieFile = document.getElementById('add-customer-selfie')?.files?.[0];
            
            let dlFrontUrl = null;
            let dlBackUrl = null;
            let selfieUrl = null;
            
            if (dlFrontFile) {
                Utils.toastInfo('Uploading DL front...');
                dlFrontUrl = await this.uploadFile(dlFrontFile, 'drivers-licenses', `${baseFileName}-front`);
            }
            
            if (dlBackFile) {
                Utils.toastInfo('Uploading DL back...');
                dlBackUrl = await this.uploadFile(dlBackFile, 'drivers-licenses', `${baseFileName}-back`);
            }
            
            if (selfieFile) {
                Utils.toastInfo('Uploading selfie...');
                selfieUrl = await this.uploadFile(selfieFile, 'selfies', `${baseFileName}-selfie`);
            }
            
            // Build address string from form fields
            const street = document.getElementById('add-customer-address')?.value?.trim() || '';
            const city = document.getElementById('add-customer-city')?.value?.trim() || '';
            const state = document.getElementById('add-customer-state')?.value || '';
            const zip = document.getElementById('add-customer-zip')?.value?.trim() || '';
            const fullAddress = [street, city, state, zip].filter(Boolean).join(', ');
            
            // Build customer data object using ACTUAL Supabase column names
            // Schema verified: January 2025
            const customerData = {
                // Identity
                customer_id: customerId,
                full_name: `${firstName} ${lastName}`,  // DB uses full_name, not first_name/last_name
                phone: phone,
                email: email,
                date_of_birth: document.getElementById('add-customer-dob')?.value || null,
                
                // Address - DB has 'address' and 'current_address' as single text fields
                address: fullAddress || null,
                current_address: fullAddress || null,
                
                // Driver's License - DB uses dl_ prefix, not drivers_license_
                dl_number: dlNumber,
                dl_state: dlState,
                dl_expiry_date: dlExpiry,
                dl_photo_front_url: dlFrontUrl,
                dl_photo_back_url: dlBackUrl,
                
                // Selfie
                selfie_url: selfieUrl,
                
                // Corporate - DB uses is_company_rental, not is_corporate_rental
                is_company_rental: isCorporate,
                company_name: isCorporate ? document.getElementById('add-customer-company-name')?.value?.trim() : null,
                company_phone: isCorporate ? document.getElementById('add-customer-company-phone')?.value?.trim() : null,
                company_email: isCorporate ? document.getElementById('add-customer-rep-email')?.value?.trim() : null,
                company_contact_person: isCorporate ? document.getElementById('add-customer-rep-name')?.value?.trim() : null,
                
                // Application type
                application_type: isCorporate ? 'corporate' : 'individual',
                
                // Status - Admin-added customers are pre-approved
                status: 'approved',
                background_check_status: 'pending',
                dl_verification_status: 'pending',
                
                // Defaults
                payment_reliability_score: 5.0,
                late_payment_count: 0
            };
            
            // Insert into Supabase
            const { data, error } = await db
                .from('customers')
                .insert([customerData])
                .select()
                .single();
            
            if (error) throw error;
            
            Utils.toastSuccess(`Customer ${firstName} ${lastName} created successfully!`);
            
            // Close modal
            this.closeAddModal();
            
            // Reload data
            await this.load();
            
            // Update dashboard
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
        } catch (error) {
            console.error('Error creating customer:', error);
            Utils.toastError('Failed to create customer: ' + error.message);
        }
    },
    
    /**
     * Delete customer from database
     * Shows confirmation dialog before deleting
     */
    async delete(customerId) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        const fullName = customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'this customer';
        
        // Show confirmation dialog
        const confirmed = confirm(
            `⚠️ DELETE CUSTOMER\n\n` +
            `Are you sure you want to permanently delete "${fullName}"?\n\n` +
            `This will also delete:\n` +
            `• All their documents\n` +
            `• All their payment history\n` +
            `• All their rental records\n\n` +
            `This action CANNOT be undone!`
        );
        
        if (!confirmed) {
            Utils.toastInfo('Delete cancelled');
            return;
        }
        
        // Double confirmation for safety
        const doubleConfirm = confirm(
            `🚨 FINAL CONFIRMATION\n\n` +
            `You are about to PERMANENTLY DELETE:\n\n` +
            `"${fullName}"\n` +
            `ID: ${customer.customer_id || 'N/A'}\n` +
            `Phone: ${customer.phone || 'N/A'}\n\n` +
            `Type "DELETE" in the next prompt to confirm.`
        );
        
        if (!doubleConfirm) {
            Utils.toastInfo('Delete cancelled');
            return;
        }
        
        // Ask for DELETE confirmation
        const typeDelete = prompt('Type DELETE to confirm permanent deletion:');
        if (typeDelete !== 'DELETE') {
            Utils.toastInfo('Delete cancelled - confirmation text did not match');
            return;
        }
        
        try {
            Utils.toastInfo('Deleting customer...');
            
            // Delete related records first (to avoid foreign key constraints)
            // 1. Delete payments
            const { error: paymentsError } = await db
                .from('payments')
                .delete()
                .eq('customer_id', customerId);
            
            if (paymentsError) {
                console.warn('Error deleting payments:', paymentsError);
            }
            
            // 2. Delete rentals
            const { error: rentalsError } = await db
                .from('rentals')
                .delete()
                .eq('customer_id', customerId);
            
            if (rentalsError) {
                console.warn('Error deleting rentals:', rentalsError);
            }
            
            // 3. Delete customer documents from storage (optional - files will be orphaned but not accessible)
            // Storage cleanup can be done later if needed
            
            // 4. Delete the customer
            const { error: customerError } = await db
                .from('customers')
                .delete()
                .eq('id', customerId);
            
            if (customerError) throw customerError;
            
            Utils.toastSuccess(`✅ ${fullName} has been permanently deleted`);
            
            // Reload customers list
            await this.load();
            
            // Update dashboard
            if (typeof Dashboard !== 'undefined' && Dashboard.load) {
                Dashboard.load();
            }
            
            console.log(`🗑️ Deleted customer: ${fullName} (${customerId})`);
            
        } catch (error) {
            console.error('Error deleting customer:', error);
            Utils.toastError('Failed to delete customer: ' + error.message);
        }
    }
};

// Export
window.Customers = Customers;
