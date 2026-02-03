/* ============================================
   FLEETZY ADMIN - ACTIVITY LOG MODULE
   Customer activity tracking and reporting
   Created: February 3, 2025
   ============================================ */

const ActivityLog = {
    // Cached data
    data: [],
    filtered: [],
    currentCustomerId: null,
    isLoading: false,

    /**
     * Activity type configurations
     */
    activityTypes: {
        'payment': {
            icon: 'fa-dollar-sign',
            color: 'text-green-400',
            bgColor: 'bg-green-500/20',
            label: 'Payment'
        },
        'late_payment': {
            icon: 'fa-clock',
            color: 'text-red-400',
            bgColor: 'bg-red-500/20',
            label: 'Late Payment'
        },
        'late_fee': {
            icon: 'fa-exclamation-triangle',
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/20',
            label: 'Late Fee'
        },
        'deposit': {
            icon: 'fa-shield-alt',
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/20',
            label: 'Deposit'
        },
        'deposit_adjustment': {
            icon: 'fa-balance-scale',
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/20',
            label: 'Deposit Adjustment'
        },
        'note': {
            icon: 'fa-sticky-note',
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-500/20',
            label: 'Note'
        },
        'status_change': {
            icon: 'fa-exchange-alt',
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/20',
            label: 'Status Change'
        },
        'rental_start': {
            icon: 'fa-car',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/20',
            label: 'Rental Started'
        },
        'rental_end': {
            icon: 'fa-flag-checkered',
            color: 'text-slate-400',
            bgColor: 'bg-slate-500/20',
            label: 'Rental Ended'
        }
    },

    /**
     * Log an activity to the database
     * @param {Object} activity - Activity data
     * @returns {Promise<Object>} Created activity record
     */
    async log(activity) {
        try {
            const record = {
                customer_id: activity.customerId,
                rental_id: activity.rentalId || null,
                activity_type: activity.type,
                activity_date: activity.date || new Date().toISOString(),
                description: activity.description,
                amount: activity.amount || null,
                metadata: activity.metadata || null,
                created_by: activity.createdBy || 'system'
            };

            const { data, error } = await db
                .from('customer_activity_log')
                .insert(record)
                .select()
                .single();

            if (error) throw error;

            console.log(`📝 Activity logged: ${activity.type} for customer ${activity.customerId}`);
            return data;

        } catch (error) {
            console.error('❌ Error logging activity:', error);
            // Don't throw - activity logging should not break main flows
            return null;
        }
    },

    /**
     * Log a payment activity
     */
    async logPayment(payment, isLate = false, daysLate = 0) {
        const customerName = payment.customer?.full_name || 'Customer';
        const amount = parseFloat(payment.paid_amount) || 0;
        
        let description;
        let activityType;
        
        if (isLate) {
            activityType = 'late_payment';
            description = `Payment of ${Utils.formatCurrency(amount)} received ${daysLate} day${daysLate > 1 ? 's' : ''} late`;
        } else {
            activityType = 'payment';
            description = `Payment of ${Utils.formatCurrency(amount)} received on time`;
        }

        return await this.log({
            customerId: payment.customer_id,
            rentalId: payment.rental_id,
            type: activityType,
            description: description,
            amount: amount,
            metadata: {
                payment_id: payment.id,
                payment_method: payment.payment_method,
                due_date: payment.due_date,
                paid_date: payment.paid_date,
                days_late: daysLate
            },
            createdBy: 'system'
        });
    },

    /**
     * Log a late fee charge
     */
    async logLateFee(customerId, rentalId, feeAmount, daysLate, chargeId = null) {
        return await this.log({
            customerId: customerId,
            rentalId: rentalId,
            type: 'late_fee',
            description: `Late fee of ${Utils.formatCurrency(feeAmount)} charged (${daysLate} day${daysLate > 1 ? 's' : ''} late)`,
            amount: feeAmount,
            metadata: {
                days_late: daysLate,
                charge_id: chargeId,
                fee_formula: '$50 + $10/day after day 1'
            },
            createdBy: 'system'
        });
    },

    /**
     * Log a manual note
     */
    async logNote(customerId, note, rentalId = null, createdBy = 'Admin') {
        return await this.log({
            customerId: customerId,
            rentalId: rentalId,
            type: 'note',
            description: note,
            createdBy: createdBy
        });
    },

    /**
     * Load activity log for a specific customer
     */
    async loadForCustomer(customerId) {
        if (this.isLoading) return;
        this.isLoading = true;
        this.currentCustomerId = customerId;

        try {
            const { data, error } = await db
                .from('customer_activity_log')
                .select(`
                    *,
                    rental:rental_id(rental_id, vehicle_id)
                `)
                .eq('customer_id', customerId)
                .order('activity_date', { ascending: false });

            if (error) throw error;

            this.data = data || [];
            this.filtered = [...this.data];
            
            console.log(`✅ Loaded ${this.data.length} activities for customer ${customerId}`);
            return this.data;

        } catch (error) {
            console.error('❌ Error loading activity log:', error);
            this.data = [];
            this.filtered = [];
            return [];
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Load all activities (for Activity Log tab)
     */
    async loadAll(limit = 100) {
        if (this.isLoading) return;
        this.isLoading = true;
        this.currentCustomerId = null;

        try {
            const { data, error } = await db
                .from('customer_activity_log')
                .select(`
                    *,
                    customer:customer_id(id, customer_id, full_name, phone),
                    rental:rental_id(rental_id)
                `)
                .order('activity_date', { ascending: false })
                .limit(limit);

            if (error) throw error;

            this.data = data || [];
            this.filtered = [...this.data];
            
            console.log(`✅ Loaded ${this.data.length} total activities`);
            return this.data;

        } catch (error) {
            console.error('❌ Error loading activity log:', error);
            this.data = [];
            this.filtered = [];
            return [];
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Filter activities
     */
    filter(searchTerm = '', typeFilter = '', dateFrom = '', dateTo = '', customerFilter = '') {
        this.filtered = this.data.filter(activity => {
            // Search filter
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const matchDescription = activity.description?.toLowerCase().includes(search);
                const matchCustomer = activity.customer?.full_name?.toLowerCase().includes(search);
                if (!matchDescription && !matchCustomer) return false;
            }

            // Type filter
            if (typeFilter && activity.activity_type !== typeFilter) {
                return false;
            }

            // Date range filter
            if (dateFrom) {
                const activityDate = new Date(activity.activity_date);
                const fromDate = new Date(dateFrom);
                if (activityDate < fromDate) return false;
            }

            if (dateTo) {
                const activityDate = new Date(activity.activity_date);
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (activityDate > toDate) return false;
            }

            return true;
        });

        return this.filtered;
    },

    /**
     * Render activity log table
     */
    render(containerId = 'activity-table-body') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (this.filtered.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-slate-400">
                        <i class="fas fa-history text-4xl mb-3 opacity-50"></i>
                        <p>No activity found</p>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = this.filtered.map(activity => {
            const typeConfig = this.activityTypes[activity.activity_type] || {
                icon: 'fa-circle',
                color: 'text-slate-400',
                bgColor: 'bg-slate-500/20',
                label: activity.activity_type
            };

            const date = new Date(activity.activity_date);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });

            const customerName = activity.customer?.full_name || '';
            const rentalId = activity.rental?.rental_id || '';
            const amount = activity.amount ? Utils.formatCurrency(activity.amount) : '';

            return `
                <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full ${typeConfig.bgColor} flex items-center justify-center">
                                <i class="fas ${typeConfig.icon} ${typeConfig.color} text-sm"></i>
                            </div>
                            <span class="text-xs font-medium ${typeConfig.color}">${typeConfig.label}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <div class="text-sm text-white">${activity.description}</div>
                        ${customerName ? `<div class="text-xs text-slate-400 mt-1">${customerName}</div>` : ''}
                    </td>
                    <td class="px-4 py-3 text-right">
                        ${amount ? `<span class="text-sm font-medium ${activity.activity_type === 'late_fee' ? 'text-orange-400' : 'text-white'}">${amount}</span>` : '<span class="text-slate-500">—</span>'}
                    </td>
                    <td class="px-4 py-3 text-center">
                        ${rentalId ? `<span class="text-xs bg-slate-700 px-2 py-1 rounded">${rentalId}</span>` : '<span class="text-slate-500">—</span>'}
                    </td>
                    <td class="px-4 py-3 text-right">
                        <div class="text-sm text-white">${formattedDate}</div>
                        <div class="text-xs text-slate-400">${formattedTime}</div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Render activity log for customer modal/panel
     */
    renderForCustomer(containerId = 'customer-activity-list') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (this.filtered.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-400">
                    <i class="fas fa-history text-3xl mb-2 opacity-50"></i>
                    <p>No activity recorded yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filtered.map(activity => {
            const typeConfig = this.activityTypes[activity.activity_type] || {
                icon: 'fa-circle',
                color: 'text-slate-400',
                bgColor: 'bg-slate-500/20',
                label: activity.activity_type
            };

            const date = new Date(activity.activity_date);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });

            const amount = activity.amount ? Utils.formatCurrency(activity.amount) : '';

            return `
                <div class="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-700/30 transition-colors">
                    <div class="w-8 h-8 rounded-full ${typeConfig.bgColor} flex items-center justify-center flex-shrink-0 mt-1">
                        <i class="fas ${typeConfig.icon} ${typeConfig.color} text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-medium ${typeConfig.color}">${typeConfig.label}</span>
                            ${amount ? `<span class="text-xs font-medium ${activity.activity_type === 'late_fee' ? 'text-orange-400' : 'text-green-400'}">${amount}</span>` : ''}
                        </div>
                        <p class="text-sm text-white mt-1">${activity.description}</p>
                        <p class="text-xs text-slate-400 mt-1">${formattedDate}</p>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Generate printable customer report
     */
    async generateCustomerReport(customerId) {
        try {
            // Load customer data
            const { data: customer, error: customerError } = await db
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single();

            if (customerError) throw customerError;

            // Load all payments for this customer
            const { data: payments, error: paymentsError } = await db
                .from('payments')
                .select('*')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (paymentsError) throw paymentsError;

            // Load activity log
            const activities = await this.loadForCustomer(customerId);

            // Load rentals
            const { data: rentals, error: rentalsError } = await db
                .from('rentals')
                .select('*')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (rentalsError) throw rentalsError;

            // Calculate statistics
            const totalPayments = payments?.length || 0;
            const latePayments = payments?.filter(p => p.is_late).length || 0;
            const onTimePayments = totalPayments - latePayments;
            const totalPaid = payments?.reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0) || 0;
            const totalLateFees = payments?.reduce((sum, p) => sum + (parseFloat(p.late_fees) || 0), 0) || 0;

            // Generate HTML report
            const reportHTML = this.generateReportHTML({
                customer,
                payments,
                activities,
                rentals,
                stats: {
                    totalPayments,
                    latePayments,
                    onTimePayments,
                    totalPaid,
                    totalLateFees,
                    reliabilityScore: customer.payment_reliability_score || 5
                }
            });

            return reportHTML;

        } catch (error) {
            console.error('❌ Error generating customer report:', error);
            throw error;
        }
    },

    /**
     * Generate the HTML for the printable report
     */
    generateReportHTML({ customer, payments, activities, rentals, stats }) {
        const generatedDate = new Date().toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short'
        });

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Customer Report - ${customer.full_name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #1a1a1a;
            padding: 20px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #10b981;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .logo { 
            font-size: 24px; 
            font-weight: bold; 
            color: #10b981; 
        }
        .report-title {
            text-align: right;
        }
        .report-title h1 {
            font-size: 18px;
            color: #333;
        }
        .report-title p {
            color: #666;
            font-size: 11px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #10b981;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        .info-item {
            display: flex;
            gap: 5px;
        }
        .info-label {
            font-weight: 600;
            color: #666;
            min-width: 120px;
        }
        .info-value {
            color: #1a1a1a;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        .stat-box {
            text-align: center;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #10b981;
        }
        .stat-value.warning { color: #f59e0b; }
        .stat-value.danger { color: #ef4444; }
        .stat-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            color: #666;
        }
        tr:hover { background: #fafafa; }
        .amount { text-align: right; font-family: monospace; }
        .status-late { 
            color: #ef4444; 
            font-weight: 600;
        }
        .status-ontime { 
            color: #10b981; 
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
        .activity-item {
            display: flex;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .activity-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            flex-shrink: 0;
        }
        .activity-icon.payment { background: #d1fae5; color: #10b981; }
        .activity-icon.late { background: #fee2e2; color: #ef4444; }
        .activity-icon.fee { background: #ffedd5; color: #f59e0b; }
        .activity-icon.note { background: #fef3c7; color: #d97706; }
        .activity-content { flex: 1; }
        .activity-date { font-size: 10px; color: #666; }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🚗 FLEETZY</div>
        <div class="report-title">
            <h1>Customer Payment Report</h1>
            <p>Generated: ${generatedDate}</p>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Customer Information</div>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Name:</span>
                <span class="info-value">${customer.full_name || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Customer ID:</span>
                <span class="info-value">${customer.customer_id || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Phone:</span>
                <span class="info-value">${customer.phone || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">${customer.email || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Member Since:</span>
                <span class="info-value">${customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Deposit Status:</span>
                <span class="info-value">${customer.deposit_status || 'N/A'} ${customer.deposit_amount ? `($${customer.deposit_amount})` : ''}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Payment Statistics</div>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-value">${stats.totalPayments}</div>
                <div class="stat-label">Total Payments</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${stats.onTimePayments}</div>
                <div class="stat-label">On-Time Payments</div>
            </div>
            <div class="stat-box">
                <div class="stat-value ${stats.latePayments > 0 ? 'danger' : ''}">${stats.latePayments}</div>
                <div class="stat-label">Late Payments</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">$${stats.totalPaid.toLocaleString()}</div>
                <div class="stat-label">Total Paid</div>
            </div>
            <div class="stat-box">
                <div class="stat-value ${stats.totalLateFees > 0 ? 'warning' : ''}">$${stats.totalLateFees.toLocaleString()}</div>
                <div class="stat-label">Total Late Fees</div>
            </div>
            <div class="stat-box">
                <div class="stat-value ${stats.reliabilityScore < 5 ? 'danger' : stats.reliabilityScore < 7 ? 'warning' : ''}">${stats.reliabilityScore.toFixed(1)}/10</div>
                <div class="stat-label">Reliability Score</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Payment History</div>
        <table>
            <thead>
                <tr>
                    <th>Date Paid</th>
                    <th>Due Date</th>
                    <th>Method</th>
                    <th class="amount">Amount</th>
                    <th class="amount">Late Fee</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${payments && payments.length > 0 ? payments.map(p => `
                    <tr>
                        <td>${p.paid_date ? new Date(p.paid_date).toLocaleDateString() : 'N/A'}</td>
                        <td>${p.due_date ? new Date(p.due_date + 'T00:00:00').toLocaleDateString() : 'N/A'}</td>
                        <td>${p.payment_method || 'N/A'}</td>
                        <td class="amount">$${(parseFloat(p.paid_amount) || 0).toFixed(2)}</td>
                        <td class="amount">${parseFloat(p.late_fees) > 0 ? '$' + parseFloat(p.late_fees).toFixed(2) : '—'}</td>
                        <td class="${p.is_late ? 'status-late' : 'status-ontime'}">${p.is_late ? `Late (${p.days_late}d)` : 'On Time'}</td>
                    </tr>
                `).join('') : '<tr><td colspan="6" style="text-align:center; color:#666;">No payments recorded</td></tr>'}
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Activity Log</div>
        ${activities && activities.length > 0 ? activities.slice(0, 20).map(a => `
            <div class="activity-item">
                <div class="activity-icon ${a.activity_type === 'payment' ? 'payment' : a.activity_type === 'late_payment' ? 'late' : a.activity_type === 'late_fee' ? 'fee' : 'note'}">
                    ${a.activity_type === 'payment' ? '✓' : a.activity_type === 'late_payment' ? '!' : a.activity_type === 'late_fee' ? '$' : '📝'}
                </div>
                <div class="activity-content">
                    <div>${a.description}</div>
                    <div class="activity-date">${new Date(a.activity_date).toLocaleString()}</div>
                </div>
            </div>
        `).join('') : '<p style="color:#666; text-align:center; padding:20px;">No activity recorded</p>'}
        ${activities && activities.length > 20 ? `<p style="color:#666; text-align:center; font-size:10px;">Showing 20 of ${activities.length} activities</p>` : ''}
    </div>

    <div class="footer">
        <p>Fleetzy Fleet Management • Houston, TX • (281) 271-3900</p>
        <p>This report is confidential and intended for authorized personnel only.</p>
    </div>
</body>
</html>
        `;
    },

    /**
     * Open print dialog with customer report
     */
    async printCustomerReport(customerId) {
        try {
            Utils.toastInfo('Generating report...');
            
            const reportHTML = await this.generateCustomerReport(customerId);
            
            // Open in new window for printing
            const printWindow = window.open('', '_blank');
            printWindow.document.write(reportHTML);
            printWindow.document.close();
            
            // Wait for content to load then print
            printWindow.onload = function() {
                printWindow.print();
            };
            
            Utils.toastSuccess('Report generated');
            
        } catch (error) {
            console.error('Error printing report:', error);
            Utils.toastError('Failed to generate report');
        }
    },

    /**
     * Initialize Activity Log tab
     */
    async init() {
        console.log('📋 Initializing Activity Log module...');
        await this.populateCustomerFilter();
        await this.loadAll();
        this.filtered = [...this.data];
        this.currentPage = 1;
        this.render();
        this.updatePagination();
        this.setupEventListeners();
    },

    /**
     * Setup event listeners for Activity Log tab
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('activity-search');
        if (searchInput) {
            let debounceTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimeout);
                debounceTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });
        }

        // Type filter
        const typeFilter = document.getElementById('activity-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.applyFilters());
        }

        // Date filters
        const dateFrom = document.getElementById('activity-date-from');
        const dateTo = document.getElementById('activity-date-to');
        if (dateFrom) dateFrom.addEventListener('change', () => this.applyFilters());
        if (dateTo) dateTo.addEventListener('change', () => this.applyFilters());
    },

    /**
     * Apply all filters
     */
    applyFilters() {
        const search = document.getElementById('activity-search')?.value || '';
        const type = document.getElementById('activity-type-filter')?.value || '';
        const dateFrom = document.getElementById('activity-date-from')?.value || '';
        const dateTo = document.getElementById('activity-date-to')?.value || '';

        this.filter(search, type, dateFrom, dateTo);
        this.render();
    },

    /**
     * Refresh activity log
     */
    async refresh() {
        if (this.currentCustomerId) {
            await this.loadForCustomer(this.currentCustomerId);
        } else {
            await this.loadAll();
        }
        this.render();
        Utils.toastSuccess('Activity log refreshed');
    },

    /**
     * Clear all filters and reload
     */
    async clearFilters() {
        document.getElementById('activity-search').value = '';
        document.getElementById('activity-type-filter').value = '';
        document.getElementById('activity-customer-filter').value = '';
        document.getElementById('activity-date-from').value = '';
        document.getElementById('activity-date-to').value = '';
        this.filtered = [...this.data];
        this.currentPage = 1;
        this.render();
        this.updatePagination();
    },

    /**
     * Populate customer filter dropdown
     */
    async populateCustomerFilter() {
        const select = document.getElementById('activity-customer-filter');
        if (!select) return;

        try {
            const { data: customers, error } = await db
                .from('customers')
                .select('id, full_name')
                .order('full_name');

            if (error) throw error;

            // Keep the first option (All Customers)
            select.innerHTML = '<option value="">All Customers</option>';
            
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.full_name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load customers for filter:', error);
        }
    },

    // Pagination
    currentPage: 1,
    pageSize: 25,

    /**
     * Update pagination info and buttons
     */
    updatePagination() {
        const total = this.filtered.length;
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, total);
        const totalPages = Math.ceil(total / this.pageSize);

        const info = document.getElementById('activity-pagination-info');
        if (info) {
            info.textContent = total > 0 
                ? `Showing ${start}-${end} of ${total} activities`
                : 'No activities to show';
        }

        const prevBtn = document.getElementById('activity-prev-btn');
        const nextBtn = document.getElementById('activity-next-btn');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    },

    /**
     * Go to previous page
     */
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.render();
            this.updatePagination();
        }
    },

    /**
     * Go to next page
     */
    nextPage() {
        const totalPages = Math.ceil(this.filtered.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.render();
            this.updatePagination();
        }
    }
};

// Make globally available
window.ActivityLog = ActivityLog;
