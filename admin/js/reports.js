/* ============================================
   FLEETZY ADMIN - REPORTS & ANALYTICS
   Comprehensive financial reports, trends, and insights
   Session 6 - January 2025
   ============================================ */

const Reports = {
    // Cached data
    data: {
        payments: [],
        rentals: [],
        vehicles: [],
        customers: []
    },
    
    // Current view state
    state: {
        revenueView: 'monthly', // 'weekly' | 'monthly' | 'yearly'
        dateRange: 'thisMonth', // 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom'
        startDate: null,
        endDate: null
    },
    
    // Chart configurations
    charts: {
        revenue: null,
        methods: null,
        utilization: null
    },

    /**
     * Initialize reports module
     */
    async init() {
        console.log('📊 Reports module initializing...');
        this.bindEvents();
    },

    /**
     * Load reports data
     */
    async load() {
        const container = document.getElementById('section-reports');
        if (!container) return;
        
        try {
            Utils.showLoading(container, 'Loading reports data...');
            await this.fetchAllData();
            Utils.hideLoading(container);
            
            this.render();
            this.updateStats();
            this.renderRevenueChart();
            this.renderMethodsChart();
            this.renderTopCustomers();
            this.renderFleetMetrics();
            
            // Animate elements
            setTimeout(() => {
                Animations.staggerFadeIn('#section-reports .stat-card', 80);
                Animations.staggerFadeIn('#section-reports .report-card', 100);
            }, 100);
            
            console.log('✅ Reports loaded successfully');
        } catch (error) {
            console.error('❌ Reports load error:', error);
            Utils.toastError('Failed to load reports data');
        }
    },

    /**
     * Fetch all required data from Supabase
     */
    async fetchAllData() {
        const [payments, rentals, vehicles, customers] = await Promise.all([
            db.from('payments')
                .select('*, rentals(customer_id, vehicle_id, weekly_rate), customers(first_name, last_name, phone, email, selfie_url)')
                .order('paid_date', { ascending: false }),
            db.from('rentals')
                .select('*, vehicles(make, model, year, license_plate), customers(first_name, last_name)')
                .order('created_at', { ascending: false }),
            db.from('vehicles').select('*'),
            db.from('customers').select('*')
        ]);
        
        this.data.payments = payments.data || [];
        this.data.rentals = rentals.data || [];
        this.data.vehicles = vehicles.data || [];
        this.data.customers = customers.data || [];
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Delegated events
        document.addEventListener('click', (e) => {
            // Revenue view toggle
            if (e.target.closest('[data-revenue-view]')) {
                const view = e.target.closest('[data-revenue-view]').dataset.revenueView;
                this.changeRevenueView(view);
            }
            
            // Date range selector
            if (e.target.closest('[data-date-range]')) {
                const range = e.target.closest('[data-date-range]').dataset.dateRange;
                this.changeDateRange(range);
            }
            
            // Export buttons
            if (e.target.closest('[data-export]')) {
                const type = e.target.closest('[data-export]').dataset.export;
                this.exportReport(type);
            }
        });
    },

    /**
     * Render the reports section HTML
     */
    render() {
        const container = document.getElementById('section-reports');
        if (!container) return;
        
        container.innerHTML = `
            <!-- Reports Header with Date Range -->
            <div class="reports-header">
                <div class="reports-title-section">
                    <h2 class="reports-main-title">
                        <i class="fas fa-chart-line"></i>
                        Financial Reports
                    </h2>
                    <p class="reports-subtitle">Track revenue, analyze trends, and make data-driven decisions.</p>
                </div>
                
                <div class="reports-controls">
                    <div class="date-range-selector">
                        <button class="date-btn active" data-date-range="thisMonth">This Month</button>
                        <button class="date-btn" data-date-range="lastMonth">Last Month</button>
                        <button class="date-btn" data-date-range="thisQuarter">This Quarter</button>
                        <button class="date-btn" data-date-range="thisYear">This Year</button>
                    </div>
                    
                    <button class="btn-export-main" data-export="full">
                        <i class="fas fa-download"></i>
                        Export Report
                    </button>
                </div>
            </div>
            
            <!-- Key Metrics Cards -->
            <div class="reports-stats-grid">
                <div class="stat-card report-stat" style="opacity: 0;">
                    <div class="stat-header">
                        <span class="stat-label">Total Revenue</span>
                        <div class="stat-icon gradient-green">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                    </div>
                    <div class="stat-value gradient" id="report-total-revenue">$0</div>
                    <div class="stat-change positive" id="report-revenue-change">
                        <i class="fas fa-arrow-up"></i>
                        <span>+0% vs last period</span>
                    </div>
                </div>
                
                <div class="stat-card report-stat" style="opacity: 0;">
                    <div class="stat-header">
                        <span class="stat-label">Total Payments</span>
                        <div class="stat-icon gradient-blue">
                            <i class="fas fa-receipt"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="report-payment-count">0</div>
                    <div class="stat-change neutral">
                        <span id="report-avg-payment">Avg: $0 per payment</span>
                    </div>
                </div>
                
                <div class="stat-card report-stat" style="opacity: 0;">
                    <div class="stat-header">
                        <span class="stat-label">Collection Rate</span>
                        <div class="stat-icon gradient-amber">
                            <i class="fas fa-percentage"></i>
                        </div>
                    </div>
                    <div class="stat-value" id="report-collection-rate">0%</div>
                    <div class="stat-change" id="report-collection-change">
                        <span>Based on confirmed payments</span>
                    </div>
                </div>
                
                <div class="stat-card report-stat" style="opacity: 0;">
                    <div class="stat-header">
                        <span class="stat-label">Outstanding</span>
                        <div class="stat-icon gradient-red">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value text-warning" id="report-outstanding">$0</div>
                    <div class="stat-change negative" id="report-overdue-count">
                        <span>0 overdue payments</span>
                    </div>
                </div>
            </div>
            
            <!-- Charts Row -->
            <div class="reports-charts-grid">
                <!-- Revenue Trend Chart -->
                <div class="report-card chart-card" style="opacity: 0;">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-chart-area"></i>
                            Revenue Trend
                        </h3>
                        <div class="card-actions">
                            <div class="view-toggle">
                                <button class="toggle-btn active" data-revenue-view="monthly">Monthly</button>
                                <button class="toggle-btn" data-revenue-view="weekly">Weekly</button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container revenue-chart" id="revenue-chart-container">
                            <div class="chart-y-axis" id="revenue-y-axis"></div>
                            <div class="chart-area" id="revenue-chart-area">
                                <div class="chart-bars" id="revenue-bars"></div>
                                <div class="chart-line-overlay" id="revenue-line"></div>
                            </div>
                            <div class="chart-x-axis" id="revenue-x-axis"></div>
                        </div>
                        <div class="chart-legend" id="revenue-legend">
                            <div class="legend-item">
                                <span class="legend-color" style="background: var(--accent-green);"></span>
                                <span>Revenue</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-color" style="background: var(--accent-blue);"></span>
                                <span>Target</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Payment Methods Breakdown -->
                <div class="report-card chart-card" style="opacity: 0;">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-pie-chart"></i>
                            Payment Methods
                        </h3>
                        <div class="card-actions">
                            <button class="btn btn-ghost btn-sm" data-export="methods">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="donut-chart-container">
                            <div class="donut-chart" id="methods-chart">
                                <div class="donut-center">
                                    <span class="donut-total" id="methods-total">0</span>
                                    <span class="donut-label">Payments</span>
                                </div>
                            </div>
                            <div class="donut-legend" id="methods-legend"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Second Row: Top Customers & Fleet Metrics -->
            <div class="reports-details-grid">
                <!-- Top Customers by Revenue -->
                <div class="report-card" style="opacity: 0;">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-trophy"></i>
                            Top Customers
                        </h3>
                        <div class="card-actions">
                            <span class="badge-info">By Revenue</span>
                        </div>
                    </div>
                    <div class="card-body no-padding">
                        <div class="top-customers-list" id="top-customers-list">
                            <!-- Populated by JS -->
                        </div>
                    </div>
                </div>
                
                <!-- Fleet Performance Metrics -->
                <div class="report-card" style="opacity: 0;">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-car"></i>
                            Fleet Performance
                        </h3>
                        <div class="card-actions">
                            <span class="badge-info">This Period</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="fleet-metrics" id="fleet-metrics">
                            <!-- Populated by JS -->
                        </div>
                    </div>
                </div>
                
                <!-- Revenue by Vehicle -->
                <div class="report-card" style="opacity: 0;">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-car-side"></i>
                            Revenue by Vehicle
                        </h3>
                        <div class="card-actions">
                            <button class="btn btn-ghost btn-sm" data-export="vehicles">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body no-padding">
                        <div class="vehicle-revenue-list" id="vehicle-revenue-list">
                            <!-- Populated by JS -->
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Payment Timeline -->
            <div class="report-card timeline-card" style="opacity: 0;">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fas fa-stream"></i>
                        Recent Transactions
                    </h3>
                    <div class="card-actions">
                        <button class="btn btn-ghost btn-sm" data-export="transactions">
                            <i class="fas fa-download"></i>
                            Export CSV
                        </button>
                    </div>
                </div>
                <div class="card-body no-padding">
                    <div class="transactions-table-container">
                        <table class="transactions-table" id="transactions-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Vehicle</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="transactions-tbody">
                                <!-- Populated by JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Update the key statistics
     */
    updateStats() {
        const { payments } = this.data;
        const dateRange = this.getDateRange();
        
        // Filter payments by date range and confirmed status
        const periodPayments = payments.filter(p => {
            const payDate = new Date(p.paid_date);
            return payDate >= dateRange.start && payDate <= dateRange.end;
        });
        
        const confirmedPayments = periodPayments.filter(p => 
            (p.payment_status || p.status || '').toLowerCase() === 'confirmed'
        );
        
        // Calculate metrics
        const totalRevenue = confirmedPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
        const paymentCount = confirmedPayments.length;
        const avgPayment = paymentCount > 0 ? totalRevenue / paymentCount : 0;
        
        // Collection rate (confirmed / total for period)
        const collectionRate = periodPayments.length > 0 
            ? Math.round((confirmedPayments.length / periodPayments.length) * 100) 
            : 100;
        
        // Outstanding (pending + failed payments)
        const pendingPayments = periodPayments.filter(p => 
            (p.payment_status || p.status || '').toLowerCase() === 'pending'
        );
        const outstanding = pendingPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
        
        // Overdue count
        const today = new Date();
        const overdueCount = periodPayments.filter(p => {
            const status = (p.payment_status || p.status || '').toLowerCase();
            const dueDate = p.due_date ? new Date(p.due_date) : null;
            return status === 'pending' && dueDate && dueDate < today;
        }).length;
        
        // Calculate change vs previous period
        const prevRange = this.getPreviousPeriodRange();
        const prevPayments = payments.filter(p => {
            const payDate = new Date(p.paid_date);
            const status = (p.payment_status || p.status || '').toLowerCase();
            return payDate >= prevRange.start && payDate <= prevRange.end && status === 'confirmed';
        });
        const prevRevenue = prevPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
        const revenueChange = prevRevenue > 0 
            ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) 
            : 0;
        
        // Animate the values
        Animations.countUp(document.getElementById('report-total-revenue'), 0, totalRevenue, 1500, '$');
        Animations.countUp(document.getElementById('report-payment-count'), 0, paymentCount, 1200);
        Animations.countUp(document.getElementById('report-collection-rate'), 0, collectionRate, 1000, '', '%');
        Animations.countUp(document.getElementById('report-outstanding'), 0, outstanding, 1000, '$');
        
        // Update change indicators
        const changeEl = document.getElementById('report-revenue-change');
        if (changeEl) {
            const isPositive = revenueChange >= 0;
            changeEl.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
            changeEl.innerHTML = `
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                <span>${isPositive ? '+' : ''}${revenueChange}% vs last period</span>
            `;
        }
        
        // Update avg payment
        const avgEl = document.getElementById('report-avg-payment');
        if (avgEl) avgEl.textContent = `Avg: ${Utils.formatCurrency(avgPayment)} per payment`;
        
        // Update overdue count
        const overdueEl = document.getElementById('report-overdue-count');
        if (overdueEl) {
            overdueEl.innerHTML = `<span>${overdueCount} overdue payment${overdueCount !== 1 ? 's' : ''}</span>`;
        }
    },

    /**
     * Render revenue trend chart
     */
    renderRevenueChart() {
        const { payments } = this.data;
        const view = this.state.revenueView;
        
        // Get data points based on view
        const chartData = this.calculateRevenueData(payments, view);
        
        // Render Y-axis
        const yAxisEl = document.getElementById('revenue-y-axis');
        if (yAxisEl) {
            const maxValue = Math.max(...chartData.map(d => d.value), 1);
            const step = Math.ceil(maxValue / 4);
            const yLabels = [0, step, step * 2, step * 3, step * 4].reverse();
            
            yAxisEl.innerHTML = yLabels.map(val => `
                <div class="y-label">$${this.formatShortCurrency(val)}</div>
            `).join('');
        }
        
        // Render bars
        const barsEl = document.getElementById('revenue-bars');
        if (barsEl) {
            const maxValue = Math.max(...chartData.map(d => d.value), 1);
            
            barsEl.innerHTML = chartData.map((data, index) => {
                const height = Math.max((data.value / maxValue) * 100, 2);
                const isCurrentPeriod = index === chartData.length - 1;
                
                return `
                    <div class="bar-wrapper" data-value="${data.value}" data-label="${data.label}">
                        <div class="chart-bar ${isCurrentPeriod ? 'current' : ''}" 
                             style="height: 0%;" 
                             data-height="${height}%"
                             title="${data.label}: ${Utils.formatCurrency(data.value)}">
                            <div class="bar-tooltip">
                                ${Utils.formatCurrency(data.value)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Animate bars after render
            setTimeout(() => {
                Animations.animateChartBars('#revenue-bars .chart-bar', 60);
            }, 200);
        }
        
        // Render X-axis labels
        const xAxisEl = document.getElementById('revenue-x-axis');
        if (xAxisEl) {
            xAxisEl.innerHTML = chartData.map(data => `
                <div class="x-label">${data.shortLabel || data.label}</div>
            `).join('');
        }
    },

    /**
     * Calculate revenue data for chart
     */
    calculateRevenueData(payments, view) {
        const confirmedPayments = payments.filter(p => 
            (p.payment_status || p.status || '').toLowerCase() === 'confirmed'
        );
        
        const data = [];
        const now = new Date();
        
        if (view === 'weekly') {
            // Last 8 weeks
            for (let i = 7; i >= 0; i--) {
                const weekStart = new Date(now);
                weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
                weekStart.setHours(0, 0, 0, 0);
                
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
                
                const weekPayments = confirmedPayments.filter(p => {
                    const payDate = new Date(p.paid_date);
                    return payDate >= weekStart && payDate <= weekEnd;
                });
                
                const total = weekPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
                const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
                
                data.push({
                    label: `Week of ${weekLabel}`,
                    shortLabel: weekLabel,
                    value: total,
                    start: weekStart,
                    end: weekEnd
                });
            }
        } else {
            // Last 6 months (default monthly view)
            for (let i = 5; i >= 0; i--) {
                const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
                
                const monthPayments = confirmedPayments.filter(p => {
                    const payDate = new Date(p.paid_date);
                    return payDate >= monthStart && payDate <= monthEnd;
                });
                
                const total = monthPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                
                data.push({
                    label: monthNames[monthStart.getMonth()],
                    shortLabel: monthNames[monthStart.getMonth()],
                    value: total,
                    start: monthStart,
                    end: monthEnd
                });
            }
        }
        
        return data;
    },

    /**
     * Render payment methods donut chart
     */
    renderMethodsChart() {
        const { payments } = this.data;
        const dateRange = this.getDateRange();
        
        // Filter by date and confirmed status
        const periodPayments = payments.filter(p => {
            const payDate = new Date(p.paid_date);
            const status = (p.payment_status || p.status || '').toLowerCase();
            return payDate >= dateRange.start && payDate <= dateRange.end && status === 'confirmed';
        });
        
        // Count by method
        const methodCounts = {};
        periodPayments.forEach(p => {
            const method = (p.payment_method || 'Other').toLowerCase();
            methodCounts[method] = (methodCounts[method] || 0) + 1;
        });
        
        // Method colors
        const methodColors = {
            'zelle': '#8247e5',
            'cashapp': '#00c853',
            'venmo': '#008cd3',
            'paypal': '#003087',
            'stripe': '#635bff',
            'cash': '#10b981',
            'check': '#3b82f6',
            'other': '#71717a'
        };
        
        // Convert to array and sort
        const methodData = Object.entries(methodCounts)
            .map(([method, count]) => ({
                method: method.charAt(0).toUpperCase() + method.slice(1),
                count,
                color: methodColors[method] || methodColors.other,
                percentage: periodPayments.length > 0 ? Math.round((count / periodPayments.length) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);
        
        // Update total
        const totalEl = document.getElementById('methods-total');
        if (totalEl) totalEl.textContent = periodPayments.length;
        
        // Render donut chart
        const chartEl = document.getElementById('methods-chart');
        if (chartEl) {
            // Create conic gradient for donut
            let gradientStops = [];
            let currentAngle = 0;
            
            methodData.forEach(item => {
                const angle = (item.count / periodPayments.length) * 360;
                gradientStops.push(`${item.color} ${currentAngle}deg ${currentAngle + angle}deg`);
                currentAngle += angle;
            });
            
            // If no data, show gray
            if (gradientStops.length === 0) {
                gradientStops.push('var(--bg-tertiary) 0deg 360deg');
            }
            
            chartEl.style.setProperty('--donut-gradient', `conic-gradient(${gradientStops.join(', ')})`);
        }
        
        // Render legend
        const legendEl = document.getElementById('methods-legend');
        if (legendEl) {
            if (methodData.length === 0) {
                legendEl.innerHTML = '<div class="legend-empty">No payment data</div>';
            } else {
                legendEl.innerHTML = methodData.map(item => `
                    <div class="legend-item">
                        <span class="legend-color" style="background: ${item.color};"></span>
                        <span class="legend-label">${item.method}</span>
                        <span class="legend-value">${item.count}</span>
                        <span class="legend-percent">${item.percentage}%</span>
                    </div>
                `).join('');
            }
        }
    },

    /**
     * Render top customers by revenue
     */
    renderTopCustomers() {
        const { payments, customers } = this.data;
        const dateRange = this.getDateRange();
        
        // Filter confirmed payments in range
        const periodPayments = payments.filter(p => {
            const payDate = new Date(p.paid_date);
            const status = (p.payment_status || p.status || '').toLowerCase();
            return payDate >= dateRange.start && payDate <= dateRange.end && status === 'confirmed';
        });
        
        // Calculate revenue by customer
        const customerRevenue = {};
        periodPayments.forEach(p => {
            const customerId = p.customer_id || p.rentals?.customer_id;
            if (customerId) {
                if (!customerRevenue[customerId]) {
                    customerRevenue[customerId] = {
                        id: customerId,
                        total: 0,
                        paymentCount: 0,
                        customer: p.customers || customers.find(c => c.id === customerId)
                    };
                }
                customerRevenue[customerId].total += (p.paid_amount || 0);
                customerRevenue[customerId].paymentCount += 1;
            }
        });
        
        // Sort by revenue and take top 5
        const topCustomers = Object.values(customerRevenue)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
        
        const maxRevenue = topCustomers[0]?.total || 1;
        
        const listEl = document.getElementById('top-customers-list');
        if (!listEl) return;
        
        if (topCustomers.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No customer data for this period</p>
                </div>
            `;
            return;
        }
        
        listEl.innerHTML = topCustomers.map((item, index) => {
            const customer = item.customer;
            const name = customer 
                ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() 
                : 'Unknown';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
            const avatar = customer?.selfie_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff&size=64`;
            const barWidth = (item.total / maxRevenue) * 100;
            
            return `
                <div class="top-customer-item">
                    <div class="customer-rank">${index + 1}</div>
                    <div class="customer-avatar">
                        <img src="${avatar}" alt="${name}" onerror="this.src='https://ui-avatars.com/api/?name=${initials}&background=10b981&color=fff&size=64'">
                    </div>
                    <div class="customer-info">
                        <div class="customer-name">${name}</div>
                        <div class="customer-payments">${item.paymentCount} payment${item.paymentCount !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="customer-revenue">
                        <div class="revenue-amount">${Utils.formatCurrency(item.total)}</div>
                        <div class="revenue-bar">
                            <div class="revenue-bar-fill" style="width: ${barWidth}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render fleet performance metrics
     */
    renderFleetMetrics() {
        const { vehicles, rentals } = this.data;
        
        // Calculate metrics
        const totalVehicles = vehicles.length;
        const activeRentals = rentals.filter(r => r.rental_status === 'active').length;
        const utilizationRate = totalVehicles > 0 ? Math.round((activeRentals / totalVehicles) * 100) : 0;
        
        // Vehicles by status
        const statusCounts = {
            available: vehicles.filter(v => v.vehicle_status === 'Available').length,
            rented: vehicles.filter(v => v.vehicle_status === 'Rented' || v.vehicle_status === 'Currently Rented').length,
            maintenance: vehicles.filter(v => v.vehicle_status === 'Maintenance').length,
            reserved: vehicles.filter(v => v.vehicle_status === 'Reserved').length
        };
        
        // Calculate average mileage
        const avgMileage = totalVehicles > 0 
            ? Math.round(vehicles.reduce((sum, v) => sum + (v.current_mileage || 0), 0) / totalVehicles)
            : 0;
        
        // Vehicles needing service (mileage based)
        const needService = vehicles.filter(v => {
            const mileage = v.current_mileage || 0;
            const lastService = v.last_service_mileage || 0;
            return (mileage - lastService) > 4500;
        }).length;
        
        const metricsEl = document.getElementById('fleet-metrics');
        if (!metricsEl) return;
        
        metricsEl.innerHTML = `
            <div class="metric-row">
                <div class="metric-item">
                    <div class="metric-icon green">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="metric-content">
                        <div class="metric-value">${utilizationRate}%</div>
                        <div class="metric-label">Utilization Rate</div>
                    </div>
                    <div class="metric-indicator ${utilizationRate >= 80 ? 'good' : utilizationRate >= 60 ? 'medium' : 'low'}">
                        ${utilizationRate >= 80 ? '●' : utilizationRate >= 60 ? '◐' : '○'} ${utilizationRate >= 80 ? 'Excellent' : utilizationRate >= 60 ? 'Good' : 'Low'}
                    </div>
                </div>
            </div>
            
            <div class="fleet-status-grid">
                <div class="status-item available">
                    <div class="status-count">${statusCounts.available}</div>
                    <div class="status-label">Available</div>
                </div>
                <div class="status-item rented">
                    <div class="status-count">${statusCounts.rented + activeRentals}</div>
                    <div class="status-label">Rented</div>
                </div>
                <div class="status-item maintenance">
                    <div class="status-count">${statusCounts.maintenance}</div>
                    <div class="status-label">Service</div>
                </div>
                <div class="status-item reserved">
                    <div class="status-count">${statusCounts.reserved}</div>
                    <div class="status-label">Reserved</div>
                </div>
            </div>
            
            <div class="metric-divider"></div>
            
            <div class="metric-row">
                <div class="metric-item small">
                    <span class="metric-label">Avg. Mileage:</span>
                    <span class="metric-value">${avgMileage.toLocaleString()} mi</span>
                </div>
                <div class="metric-item small ${needService > 0 ? 'warning' : ''}">
                    <span class="metric-label">Need Service:</span>
                    <span class="metric-value">${needService} vehicle${needService !== 1 ? 's' : ''}</span>
                </div>
            </div>
        `;
        
        // Also render vehicle revenue list
        this.renderVehicleRevenue();
    },

    /**
     * Render revenue by vehicle
     */
    renderVehicleRevenue() {
        const { vehicles, rentals, payments } = this.data;
        const dateRange = this.getDateRange();
        
        // Filter confirmed payments in range
        const periodPayments = payments.filter(p => {
            const payDate = new Date(p.paid_date);
            const status = (p.payment_status || p.status || '').toLowerCase();
            return payDate >= dateRange.start && payDate <= dateRange.end && status === 'confirmed';
        });
        
        // Calculate revenue by vehicle through rentals
        const vehicleRevenue = {};
        vehicles.forEach(v => {
            vehicleRevenue[v.id] = {
                vehicle: v,
                total: 0,
                rentalCount: 0
            };
        });
        
        // Link payments to vehicles through rentals
        periodPayments.forEach(p => {
            const rental = rentals.find(r => r.id === p.rental_id);
            if (rental && vehicleRevenue[rental.vehicle_id]) {
                vehicleRevenue[rental.vehicle_id].total += (p.paid_amount || 0);
                vehicleRevenue[rental.vehicle_id].rentalCount += 1;
            }
        });
        
        // Sort by revenue
        const sortedVehicles = Object.values(vehicleRevenue)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
        
        const maxRevenue = sortedVehicles[0]?.total || 1;
        
        const listEl = document.getElementById('vehicle-revenue-list');
        if (!listEl) return;
        
        if (sortedVehicles.length === 0 || sortedVehicles.every(v => v.total === 0)) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-car"></i>
                    <p>No vehicle revenue data</p>
                </div>
            `;
            return;
        }
        
        listEl.innerHTML = sortedVehicles.map(item => {
            const v = item.vehicle;
            const barWidth = (item.total / maxRevenue) * 100;
            
            return `
                <div class="vehicle-revenue-item">
                    <div class="vehicle-info">
                        <div class="vehicle-image">
                            ${v.image_url 
                                ? `<img src="${v.image_url}" alt="${v.make}">` 
                                : '<i class="fas fa-car"></i>'}
                        </div>
                        <div class="vehicle-details">
                            <div class="vehicle-name">${v.year} ${v.make} ${v.model}</div>
                            <div class="vehicle-plate">${v.license_plate || 'N/A'}</div>
                        </div>
                    </div>
                    <div class="vehicle-revenue">
                        <div class="revenue-amount">${Utils.formatCurrency(item.total)}</div>
                        <div class="revenue-bar vehicle-bar">
                            <div class="revenue-bar-fill" style="width: ${barWidth}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Render transactions table
     */
    renderTransactionsTable() {
        const { payments } = this.data;
        const dateRange = this.getDateRange();
        
        // Filter by date range and limit to 10
        const periodPayments = payments
            .filter(p => {
                const payDate = new Date(p.paid_date);
                return payDate >= dateRange.start && payDate <= dateRange.end;
            })
            .slice(0, 10);
        
        const tbody = document.getElementById('transactions-tbody');
        if (!tbody) return;
        
        if (periodPayments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-cell">
                        <div class="empty-state small">
                            <i class="fas fa-receipt"></i>
                            <p>No transactions in this period</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = periodPayments.map(p => {
            const customer = p.customers;
            const customerName = customer 
                ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                : 'Unknown';
            const rental = this.data.rentals.find(r => r.id === p.rental_id);
            const vehicle = rental?.vehicles;
            const vehicleName = vehicle 
                ? `${vehicle.year} ${vehicle.make}` 
                : 'N/A';
            const status = (p.payment_status || p.status || 'pending').toLowerCase();
            const method = p.payment_method || 'Other';
            
            return `
                <tr>
                    <td class="date-cell">${Utils.formatDate(p.paid_date, 'short')}</td>
                    <td class="customer-cell">
                        <div class="cell-content">
                            <span class="primary">${customerName}</span>
                        </div>
                    </td>
                    <td class="vehicle-cell">${vehicleName}</td>
                    <td class="amount-cell">${Utils.formatCurrency(p.paid_amount || 0)}</td>
                    <td class="method-cell">
                        <span class="method-badge method-${method.toLowerCase()}">${method}</span>
                    </td>
                    <td class="status-cell">
                        <span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * Change revenue view (weekly/monthly)
     */
    changeRevenueView(view) {
        this.state.revenueView = view;
        
        // Update active button
        document.querySelectorAll('[data-revenue-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.revenueView === view);
        });
        
        // Re-render chart
        this.renderRevenueChart();
    },

    /**
     * Change date range
     */
    changeDateRange(range) {
        this.state.dateRange = range;
        
        // Update active button
        document.querySelectorAll('[data-date-range]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.dateRange === range);
        });
        
        // Re-render all components with new date range
        this.updateStats();
        this.renderRevenueChart();
        this.renderMethodsChart();
        this.renderTopCustomers();
        this.renderFleetMetrics();
    },

    /**
     * Get current date range based on state
     */
    getDateRange() {
        const now = new Date();
        let start, end;
        
        switch (this.state.dateRange) {
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'lastMonth':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'thisQuarter':
                const quarter = Math.floor(now.getMonth() / 3);
                start = new Date(now.getFullYear(), quarter * 3, 1);
                end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
                break;
            case 'thisYear':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            default:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        
        return { start, end };
    },

    /**
     * Get previous period range for comparison
     */
    getPreviousPeriodRange() {
        const current = this.getDateRange();
        const duration = current.end - current.start;
        
        return {
            start: new Date(current.start.getTime() - duration - 1),
            end: new Date(current.start.getTime() - 1)
        };
    },

    /**
     * Format currency for short display (K, M)
     */
    formatShortCurrency(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(0) + 'K';
        }
        return value.toString();
    },

    /**
     * Export report
     */
    exportReport(type) {
        const dateRange = this.getDateRange();
        const { payments, vehicles, customers, rentals } = this.data;
        
        switch (type) {
            case 'full':
                this.exportFullReport();
                break;
            case 'transactions':
                this.exportTransactionsCSV();
                break;
            case 'methods':
                this.exportMethodsCSV();
                break;
            case 'vehicles':
                this.exportVehiclesCSV();
                break;
            default:
                this.exportFullReport();
        }
    },

    /**
     * Export full report
     */
    exportFullReport() {
        const dateRange = this.getDateRange();
        const { payments, vehicles, rentals } = this.data;
        
        // Filter payments
        const periodPayments = payments.filter(p => {
            const payDate = new Date(p.paid_date);
            return payDate >= dateRange.start && payDate <= dateRange.end;
        });
        
        // Build CSV
        const headers = ['Date', 'Customer', 'Vehicle', 'Amount', 'Method', 'Status', 'Rental ID'];
        const rows = periodPayments.map(p => {
            const customer = p.customers;
            const customerName = customer 
                ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                : 'Unknown';
            const rental = rentals.find(r => r.id === p.rental_id);
            const vehicle = rental?.vehicles;
            const vehicleName = vehicle 
                ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                : 'N/A';
            
            return [
                Utils.formatDate(p.paid_date, 'short'),
                customerName,
                vehicleName,
                p.paid_amount || 0,
                p.payment_method || 'Other',
                p.payment_status || p.status || 'pending',
                p.rental_id || ''
            ];
        });
        
        this.downloadCSV([headers, ...rows], 'fleetzy-report');
        Utils.toastSuccess('Report exported successfully');
    },

    /**
     * Export transactions to CSV
     */
    exportTransactionsCSV() {
        const dateRange = this.getDateRange();
        const { payments, rentals } = this.data;
        
        const periodPayments = payments.filter(p => {
            const payDate = new Date(p.paid_date);
            return payDate >= dateRange.start && payDate <= dateRange.end;
        });
        
        const headers = ['Payment ID', 'Date', 'Customer', 'Amount', 'Method', 'Status', 'Late', 'Days Late', 'Late Fee'];
        const rows = periodPayments.map(p => {
            const customer = p.customers;
            const customerName = customer 
                ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                : 'Unknown';
            
            return [
                p.payment_id || p.id,
                Utils.formatDate(p.paid_date, 'short'),
                customerName,
                p.paid_amount || 0,
                p.payment_method || 'Other',
                p.payment_status || p.status || 'pending',
                p.is_late ? 'Yes' : 'No',
                p.days_late || 0,
                p.late_fee_charged || 0
            ];
        });
        
        this.downloadCSV([headers, ...rows], 'fleetzy-transactions');
        Utils.toastSuccess('Transactions exported');
    },

    /**
     * Export methods breakdown to CSV
     */
    exportMethodsCSV() {
        const dateRange = this.getDateRange();
        const { payments } = this.data;
        
        const periodPayments = payments.filter(p => {
            const payDate = new Date(p.paid_date);
            const status = (p.payment_status || p.status || '').toLowerCase();
            return payDate >= dateRange.start && payDate <= dateRange.end && status === 'confirmed';
        });
        
        const methodCounts = {};
        periodPayments.forEach(p => {
            const method = (p.payment_method || 'Other');
            if (!methodCounts[method]) {
                methodCounts[method] = { count: 0, total: 0 };
            }
            methodCounts[method].count += 1;
            methodCounts[method].total += (p.paid_amount || 0);
        });
        
        const headers = ['Payment Method', 'Count', 'Total Amount', 'Percentage'];
        const rows = Object.entries(methodCounts).map(([method, data]) => [
            method,
            data.count,
            data.total,
            `${Math.round((data.count / periodPayments.length) * 100)}%`
        ]);
        
        this.downloadCSV([headers, ...rows], 'fleetzy-payment-methods');
        Utils.toastSuccess('Payment methods exported');
    },

    /**
     * Export vehicles revenue to CSV
     */
    exportVehiclesCSV() {
        const { vehicles, rentals, payments } = this.data;
        const dateRange = this.getDateRange();
        
        const periodPayments = payments.filter(p => {
            const payDate = new Date(p.paid_date);
            const status = (p.payment_status || p.status || '').toLowerCase();
            return payDate >= dateRange.start && payDate <= dateRange.end && status === 'confirmed';
        });
        
        const vehicleRevenue = {};
        vehicles.forEach(v => {
            vehicleRevenue[v.id] = {
                vehicle: v,
                total: 0,
                rentalCount: 0
            };
        });
        
        periodPayments.forEach(p => {
            const rental = rentals.find(r => r.id === p.rental_id);
            if (rental && vehicleRevenue[rental.vehicle_id]) {
                vehicleRevenue[rental.vehicle_id].total += (p.paid_amount || 0);
                vehicleRevenue[rental.vehicle_id].rentalCount += 1;
            }
        });
        
        const headers = ['Vehicle', 'License Plate', 'Total Revenue', 'Payment Count', 'Weekly Rate', 'Status'];
        const rows = Object.values(vehicleRevenue).map(item => {
            const v = item.vehicle;
            return [
                `${v.year} ${v.make} ${v.model}`,
                v.license_plate || 'N/A',
                item.total,
                item.rentalCount,
                v.weekly_rate || 400,
                v.vehicle_status || 'Unknown'
            ];
        });
        
        this.downloadCSV([headers, ...rows], 'fleetzy-vehicle-revenue');
        Utils.toastSuccess('Vehicle revenue exported');
    },

    /**
     * Download CSV helper
     */
    downloadCSV(data, filename) {
        const csv = data.map(row => 
            row.map(cell => {
                const escaped = String(cell).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}-${date}.csv`;
        link.click();
        
        URL.revokeObjectURL(link.href);
    },

    /**
     * Refresh reports data
     */
    async refresh() {
        Utils.toastInfo('Refreshing reports...');
        await this.load();
        Utils.toastSuccess('Reports updated');
    }
};

// Initialize on module load
Reports.init();

// Export
window.Reports = Reports;
