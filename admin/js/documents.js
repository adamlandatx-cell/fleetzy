/* ============================================
   FLEETZY ADMIN - DOCUMENTS MODULE
   Upload and manage documents for customers
   ============================================ */

const Documents = {
    // Currently selected customer
    currentCustomerId: null,
    currentCustomerName: '',
    
    // Cached documents
    data: [],
    
    /**
     * Open the Manage Documents modal for a customer
     */
    async openModal(customerId, customerName) {
        this.currentCustomerId = customerId;
        this.currentCustomerName = customerName || 'Customer';
        
        const modal = document.getElementById('modal-manage-documents');
        if (!modal) {
            Utils.toastError('Documents modal not found');
            return;
        }
        
        // Set customer info in header
        document.getElementById('docs-customer-name').textContent = this.currentCustomerName;
        document.getElementById('docs-customer-id').textContent = customerId;
        
        // Reset upload form
        this.resetUploadForm();
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Load documents
        await this.loadDocuments();
    },
    
    /**
     * Close the Manage Documents modal
     */
    closeModal() {
        const modal = document.getElementById('modal-manage-documents');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        this.currentCustomerId = null;
        this.currentCustomerName = '';
    },
    
    /**
     * Reset the upload form
     */
    resetUploadForm() {
        const nameInput = document.getElementById('doc-upload-name');
        const fileInput = document.getElementById('doc-upload-file');
        const preview = document.getElementById('doc-upload-preview');
        
        if (nameInput) nameInput.value = '';
        if (fileInput) fileInput.value = '';
        if (preview) {
            preview.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <span>Click to select file or drag & drop</span>
                <span class="file-types">Images, PDFs, Documents</span>
            `;
            preview.classList.remove('has-file');
        }
    },
    
    /**
     * Handle file selection
     */
    handleFileSelect(input) {
        const file = input.files[0];
        const preview = document.getElementById('doc-upload-preview');
        const nameInput = document.getElementById('doc-upload-name');
        
        if (!file) {
            this.resetUploadForm();
            return;
        }
        
        // Auto-fill name if empty (use filename without extension)
        if (nameInput && !nameInput.value) {
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            // Clean up and title case
            nameInput.value = fileName
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
        }
        
        // Update preview
        if (preview) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview" style="max-height: 120px; max-width: 100%; border-radius: 8px;">
                        <span class="file-name">${file.name}</span>
                    `;
                };
                reader.readAsDataURL(file);
            } else if (file.type === 'application/pdf') {
                preview.innerHTML = `
                    <i class="fas fa-file-pdf" style="font-size: 48px; color: var(--accent-red);"></i>
                    <span class="file-name">${file.name}</span>
                `;
            } else {
                preview.innerHTML = `
                    <i class="fas fa-file" style="font-size: 48px; color: var(--text-secondary);"></i>
                    <span class="file-name">${file.name}</span>
                `;
            }
            preview.classList.add('has-file');
        }
    },
    
    /**
     * Load documents for current customer
     */
    async loadDocuments() {
        const container = document.getElementById('docs-list-container');
        if (!container || !this.currentCustomerId) return;
        
        container.innerHTML = `
            <div class="docs-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading documents...</span>
            </div>
        `;
        
        try {
            // Load admin-uploaded documents
            const { data: adminDocs, error: docsError } = await db
                .from('documents')
                .select('*')
                .eq('customer_id', this.currentCustomerId)
                .order('uploaded_at', { ascending: false });
            
            if (docsError) throw docsError;
            
            // Load customer's application documents
            // FIXED: Using actual column names (dl_photo_front_url, etc.)
            const { data: customer, error: custError } = await db
                .from('customers')
                .select('selfie_url, dl_photo_front_url, dl_photo_back_url, gig_proof_url, weekly_earnings_proof_url')
                .eq('id', this.currentCustomerId)
                .single();
            
            // Combine into list
            this.data = adminDocs || [];
            
            // Build system documents list (from customer record)
            // FIXED: Using actual column names
            let systemDocs = [];
            if (customer) {
                if (customer.selfie_url) {
                    systemDocs.push({ type: 'system', name: 'Selfie Photo', url: customer.selfie_url, icon: 'fa-user' });
                }
                if (customer.dl_photo_front_url) {
                    systemDocs.push({ type: 'system', name: "Driver's License (Front)", url: customer.dl_photo_front_url, icon: 'fa-id-card' });
                }
                if (customer.dl_photo_back_url) {
                    systemDocs.push({ type: 'system', name: "Driver's License (Back)", url: customer.dl_photo_back_url, icon: 'fa-id-card' });
                }
                if (customer.gig_proof_url) {
                    systemDocs.push({ type: 'system', name: 'Gig Platform Proof', url: customer.gig_proof_url, icon: 'fa-car' });
                }
                if (customer.weekly_earnings_proof_url) {
                    systemDocs.push({ type: 'system', name: 'Earnings Proof', url: customer.weekly_earnings_proof_url, icon: 'fa-file-invoice-dollar' });
                }
            }
            
            this.renderDocuments(systemDocs);
            
        } catch (error) {
            console.error('Error loading documents:', error);
            container.innerHTML = `
                <div class="docs-empty">
                    <i class="fas fa-exclamation-circle" style="color: var(--accent-red);"></i>
                    <span>Error loading documents</span>
                </div>
            `;
        }
    },
    
    /**
     * Render documents list
     */
    renderDocuments(systemDocs) {
        const container = document.getElementById('docs-list-container');
        if (!container) return;
        
        let html = '';
        
        // Admin-uploaded documents section
        if (this.data.length > 0) {
            html += `
                <div class="docs-section">
                    <h4 class="docs-section-title">
                        <i class="fas fa-upload"></i> Uploaded Documents
                        <span class="docs-count">${this.data.length}</span>
                    </h4>
                    <div class="docs-grid">
            `;
            
            this.data.forEach(doc => {
                // FIXED: Using file_url instead of document_url
                const isImage = this.isImageUrl(doc.file_url);
                const isPdf = doc.file_url?.toLowerCase().includes('.pdf');
                const icon = isPdf ? 'fa-file-pdf' : (isImage ? 'fa-image' : 'fa-file');
                const iconColor = isPdf ? 'var(--accent-red)' : (isImage ? 'var(--accent-blue)' : 'var(--text-secondary)');
                
                html += `
                    <div class="doc-item" data-doc-id="${doc.id}">
                        <div class="doc-icon" style="color: ${iconColor};">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="doc-info">
                            <div class="doc-name">${doc.file_name || doc.document_type || 'Untitled'}</div>
                            <div class="doc-date">${this.formatDate(doc.uploaded_at)}</div>
                        </div>
                        <div class="doc-actions">
                            <button class="btn-icon" onclick="Documents.viewDocument('${doc.file_url}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon danger" onclick="Documents.confirmDelete('${doc.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
        
        // System documents section
        if (systemDocs.length > 0) {
            html += `
                <div class="docs-section">
                    <h4 class="docs-section-title">
                        <i class="fas fa-user-check"></i> Application Documents
                        <span class="docs-count">${systemDocs.length}</span>
                    </h4>
                    <div class="docs-grid">
            `;
            
            systemDocs.forEach(doc => {
                html += `
                    <div class="doc-item system">
                        <div class="doc-icon" style="color: var(--accent-green);">
                            <i class="fas ${doc.icon}"></i>
                        </div>
                        <div class="doc-info">
                            <div class="doc-name">${doc.name}</div>
                            <div class="doc-date">From application</div>
                        </div>
                        <div class="doc-actions">
                            <button class="btn-icon" onclick="Documents.viewDocument('${doc.url}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
        
        // Empty state
        if (this.data.length === 0 && systemDocs.length === 0) {
            html = `
                <div class="docs-empty">
                    <i class="fas fa-folder-open"></i>
                    <span>No documents yet</span>
                    <span class="docs-empty-hint">Upload a document above</span>
                </div>
            `;
        }
        
        container.innerHTML = html;
    },
    
    /**
     * Upload a new document
     */
    async upload() {
        const nameInput = document.getElementById('doc-upload-name');
        const fileInput = document.getElementById('doc-upload-file');
        
        const name = nameInput?.value?.trim();
        const file = fileInput?.files[0];
        
        if (!name) {
            Utils.toastError('Please enter a document name');
            nameInput?.focus();
            return;
        }
        
        if (!file) {
            Utils.toastError('Please select a file to upload');
            return;
        }
        
        if (!this.currentCustomerId) {
            Utils.toastError('No customer selected');
            return;
        }
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            Utils.toastError('File too large. Maximum size is 10MB');
            return;
        }
        
        const uploadBtn = document.getElementById('doc-upload-btn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        }
        
        try {
            // Generate unique filename
            const ext = file.name.split('.').pop();
            const fileName = `${this.currentCustomerId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
            
            // Upload to Supabase Storage (using contracts bucket for now, or create customer-documents)
            const { data: uploadData, error: uploadError } = await db.storage
                .from('contracts')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: urlData } = db.storage
                .from('contracts')
                .getPublicUrl(fileName);
            
            const publicUrl = urlData.publicUrl;
            
            // Save document record
            // FIXED: Using actual DB column names (verified Jan 2025)
            const { error: insertError } = await db
                .from('documents')
                .insert({
                    customer_id: this.currentCustomerId,
                    document_type: 'admin_upload',
                    file_name: name,
                    file_url: publicUrl,
                    file_size: file.size,
                    uploaded_at: new Date().toISOString()
                });
            
            if (insertError) throw insertError;
            
            Utils.toastSuccess('Document uploaded successfully!');
            
            // Reset form and reload
            this.resetUploadForm();
            await this.loadDocuments();
            
        } catch (error) {
            console.error('Error uploading document:', error);
            Utils.toastError('Failed to upload document: ' + error.message);
        } finally {
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Document';
            }
        }
    },
    
    /**
     * View document in modal (no new tab!)
     */
    viewDocument(url) {
        if (!url) {
            Utils.toastError('Document URL not available');
            return;
        }
        
        const modal = document.getElementById('modal-document-viewer');
        const content = document.getElementById('document-viewer-content');
        
        if (!modal || !content) {
            // Fallback: open in new tab (shouldn't happen if modal exists)
            window.open(url, '_blank');
            return;
        }
        
        const isImage = this.isImageUrl(url);
        const isPdf = url.toLowerCase().includes('.pdf');
        
        if (isImage) {
            content.innerHTML = `<img src="${url}" alt="Document" class="viewer-image">`;
        } else if (isPdf) {
            content.innerHTML = `<iframe src="${url}" class="viewer-pdf" frameborder="0"></iframe>`;
        } else {
            // For other file types, show download option
            content.innerHTML = `
                <div class="viewer-unsupported">
                    <i class="fas fa-file-download"></i>
                    <p>This file type cannot be previewed</p>
                    <a href="${url}" download class="btn btn-primary">
                        <i class="fas fa-download"></i> Download File
                    </a>
                </div>
            `;
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close document viewer modal
     */
    closeViewer() {
        const modal = document.getElementById('modal-document-viewer');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        // Clear content to stop any video/pdf loading
        const content = document.getElementById('document-viewer-content');
        if (content) content.innerHTML = '';
    },
    
    /**
     * Confirm before deleting
     */
    confirmDelete(docId) {
        const confirmed = confirm('Are you sure you want to delete this document? This cannot be undone.');
        if (confirmed) {
            this.delete(docId);
        }
    },
    
    /**
     * Delete a document
     */
    async delete(docId) {
        try {
            Utils.toastInfo('Deleting document...');
            
            const { error } = await db
                .from('documents')
                .delete()
                .eq('id', docId);
            
            if (error) throw error;
            
            Utils.toastSuccess('Document deleted');
            await this.loadDocuments();
            
        } catch (error) {
            console.error('Error deleting document:', error);
            Utils.toastError('Failed to delete document: ' + error.message);
        }
    },
    
    /**
     * Check if URL is an image
     */
    isImageUrl(url) {
        if (!url) return false;
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        const lower = url.toLowerCase();
        return imageExts.some(ext => lower.includes(ext));
    },
    
    /**
     * Format date for display
     */
    formatDate(dateStr) {
        if (!dateStr) return 'Unknown date';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
};

// Export
window.Documents = Documents;
