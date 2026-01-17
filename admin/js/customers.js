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
            // Search filter
            const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
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
     */
    renderRow(customer) {
        const normalizedStatus = this.normalizeStatus(customer);
        const statusClass = this.getStatusClass(normalizedStatus);
        const statusLabel = this.formatStatus(normalizedStatus);
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown';
        
        // Get avatar - use selfie if available, otherwise generate initial avatar
        const avatarUrl = customer.selfie_url || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff&size=64`;
        
        // Format applied date
        const appliedDate = customer.created_at 
            ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'N/A';
        
        // Corporate badge
        const corporateBadge = customer.is_corporate_rental 
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
                        <div>${customer.drivers_license_state || ''} ${customer.drivers_license_number ? '•••' + customer.drivers_license_number.slice(-4) : 'N/A'}</div>
                        <div class="dl-expiry">${customer.drivers_license_expiry ? 'Exp: ' + customer.drivers_license_expiry : ''}</div>
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
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer';
        
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
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        
        // Basic info
        document.getElementById('review-customer-name').textContent = fullName;
        document.getElementById('review-customer-id').textContent = customer.customer_id || 'Pending';
        document.getElementById('review-customer-phone').textContent = customer.phone || 'N/A';
        document.getElementById('review-customer-email').textContent = customer.email || 'N/A';
        document.getElementById('review-customer-dob').textContent = customer.date_of_birth || 'N/A';
        
        // Address
        const address = [
            customer.address_street,
            customer.address_city,
            customer.address_state,
            customer.address_zip
        ].filter(Boolean).join(', ') || 'N/A';
        document.getElementById('review-customer-address').textContent = address;
        
        // Driver's License
        document.getElementById('review-dl-number').textContent = customer.drivers_license_number || 'N/A';
        document.getElementById('review-dl-state').textContent = customer.drivers_license_state || 'N/A';
        document.getElementById('review-dl-expiry').textContent = customer.drivers_license_expiry || 'N/A';
        
        // Background check status
        const bgStatus = customer.background_check_status || 'Not Started';
        const bgStatusEl = document.getElementById('review-bg-status');
        if (bgStatusEl) {
            bgStatusEl.textContent = bgStatus;
            bgStatusEl.className = 'status-badge ' + this.getBgStatusClass(bgStatus);
        }
        
        // Corporate info
        const corporateSection = document.getElementById('review-corporate-section');
        if (corporateSection) {
            if (customer.is_corporate_rental) {
                corporateSection.style.display = 'block';
                document.getElementById('review-company-name').textContent = customer.company_name || 'N/A';
                document.getElementById('review-company-rep').textContent = customer.company_rep_name || 'N/A';
                document.getElementById('review-company-phone').textContent = customer.company_rep_phone || 'N/A';
            } else {
                corporateSection.style.display = 'none';
            }
        }
        
        // Document images
        this.loadDocumentImage('review-dl-front', customer.drivers_license_front_url);
        this.loadDocumentImage('review-dl-back', customer.drivers_license_back_url);
        this.loadDocumentImage('review-selfie', customer.selfie_url);
        this.loadDocumentImage('review-income-proof', customer.income_proof_url);
        
        // Income proof section visibility
        const incomeSection = document.getElementById('review-income-section');
        if (incomeSection) {
            incomeSection.style.display = customer.is_corporate_rental ? 'none' : 'block';
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
        
        // Show modal
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
     */
    async approve(customerId, fromModal = false) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        
        // Confirm if not from modal (modal has its own button)
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
            
            const { error } = await db
                .from('customers')
                .update({
                    application_status: 'Approved',
                    status: 'Approved',
                    customer_id: newCustomerId,
                    approved_at: new Date().toISOString(),
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
        
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
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
     */
    async reject(customerId, reason = '') {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        
        try {
            Utils.toastInfo('Processing rejection...');
            
            const { error } = await db
                .from('customers')
                .update({
                    application_status: 'Rejected',
                    status: 'Rejected',
                    rejected_at: new Date().toISOString(),
                    rejection_reason: reason,
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
     */
    async reinstate(customerId) {
        const customer = this.data.find(c => c.id === customerId);
        if (!customer) {
            Utils.toastError('Customer not found');
            return;
        }
        
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        const confirmed = confirm(`Reinstate ${fullName} to pending status?`);
        if (!confirmed) return;
        
        try {
            Utils.toastInfo('Reinstating customer...');
            
            const { error } = await db
                .from('customers')
                .update({
                    application_status: 'Pending',
                    status: 'Pending',
                    rejected_at: null,
                    rejection_reason: null,
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
     * Open edit customer modal
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
        
        // Populate form
        document.getElementById('edit-customer-id').value = customer.id;
        document.getElementById('edit-customer-display-id').value = customer.customer_id || '';
        document.getElementById('edit-customer-first-name').value = customer.first_name || '';
        document.getElementById('edit-customer-last-name').value = customer.last_name || '';
        document.getElementById('edit-customer-phone').value = customer.phone || '';
        document.getElementById('edit-customer-email').value = customer.email || '';
        document.getElementById('edit-customer-dob').value = customer.date_of_birth || '';
        document.getElementById('edit-customer-address').value = customer.address_street || '';
        document.getElementById('edit-customer-city').value = customer.address_city || '';
        document.getElementById('edit-customer-state').value = customer.address_state || '';
        document.getElementById('edit-customer-zip').value = customer.address_zip || '';
        document.getElementById('edit-customer-dl-number').value = customer.drivers_license_number || '';
        document.getElementById('edit-customer-dl-state').value = customer.drivers_license_state || '';
        document.getElementById('edit-customer-dl-expiry').value = customer.drivers_license_expiry || '';
        document.getElementById('edit-customer-notes').value = customer.notes || '';
        
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
     */
    async update() {
        const customerId = document.getElementById('edit-customer-id')?.value;
        if (!customerId) {
            Utils.toastError('Customer ID not found');
            return;
        }
        
        const updateData = {
            first_name: document.getElementById('edit-customer-first-name')?.value,
            last_name: document.getElementById('edit-customer-last-name')?.value,
            phone: document.getElementById('edit-customer-phone')?.value,
            email: document.getElementById('edit-customer-email')?.value,
            date_of_birth: document.getElementById('edit-customer-dob')?.value || null,
            address_street: document.getElementById('edit-customer-address')?.value,
            address_city: document.getElementById('edit-customer-city')?.value,
            address_state: document.getElementById('edit-customer-state')?.value,
            address_zip: document.getElementById('edit-customer-zip')?.value,
            drivers_license_number: document.getElementById('edit-customer-dl-number')?.value,
            drivers_license_state: document.getElementById('edit-customer-dl-state')?.value,
            drivers_license_expiry: document.getElementById('edit-customer-dl-expiry')?.value || null,
            notes: document.getElementById('edit-customer-notes')?.value,
            updated_at: new Date().toISOString()
        };
        
        // Validate required fields
        if (!updateData.first_name || !updateData.last_name || !updateData.phone) {
            Utils.toastError('First name, last name, and phone are required');
            return;
        }
        
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
    }
};

// Export
window.Customers = Customers;
