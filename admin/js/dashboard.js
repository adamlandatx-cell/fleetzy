/* ============================================
   FLEETZY ADMIN - DASHBOARD
   Main dashboard with stats, charts, fleet overview
   ============================================ */

const Dashboard = {
    // Cached data
    data: {
        vehicles: [],
        rentals: [],
        payments: [],
        customers: []
    },
    
    /**
     * Load dashboard data
     */
    async load() {
        try {
            await this.fetchAllData();
            this.renderStats();
            this.renderFleetOverview();
            this.renderActivityFeed();
            this.renderAIInsights();
            this.initAnimations();
        } catch (error) {
            console.error('Dashboard load error:', error);
            Utils.toastError('Failed to load dashboard data');
        }
    },
    
    /**
     * Fetch all required data from Supabase
     */
    async fetchAllData() {
        const [vehicles, rentals, payments, customers] = await Promise.all([
            db.from('vehicles').select('*'),
            db.from('rentals').select('*, customers(full_name, phone, selfie_url)'),
            db.from('payments').select('*').order('created_at', { ascending: false }).limit(50),
            db.from('customers').select('*').order('created_at', { ascending: false }).limit(20)
        ]);
        
        this.data.vehicles = vehicles.data || [];
        this.data.rentals = rentals.data || [];
        this.data.payments = payments.data || [];
        this.data.customers = customers.data || [];
    },
    
    /**
     * Render stats cards with animated counters
     */
    renderStats() {
        const { vehicles, rentals, payments } = this.data;
        
        // Calculate stats
        const activeRentals = rentals.filter(r => r.rental_status === 'active').length;
        const totalVehicles = vehicles.length;
        const utilization = totalVehicles > 0 ? Math.round((activeRentals / totalVehicles) * 100) : 0;
        
        // Calculate monthly revenue (current month)
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyPayments = payments.filter(p => {
            const status = (p.payment_status || '').toLowerCase();
            const paidDate = p.paid_date ? new Date(p.paid_date) : null;
            // Accept both 'paid' and 'confirmed' as valid completed payment statuses
            const isCompleted = status === 'paid' || status === 'confirmed';
            return isCompleted && paidDate && paidDate >= monthStart;
        });
        const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0);
        
        // Count pending actions
        const pendingApprovals = rentals.filter(r => r.rental_status === 'pending_approval').length;
        const pendingPayments = payments.filter(p => {
            const status = (p.payment_status || p.status || '').toLowerCase();
            return status === 'pending';
        }).length;
        const pendingActions = pendingApprovals + pendingPayments;
        
        // Animate the stats
        setTimeout(() => {
            Animations.countUp(document.getElementById('stat-revenue'), 0, monthlyRevenue, 2000, '$');
            Animations.countUp(document.getElementById('stat-rentals'), 0, activeRentals, 1000);
            Animations.countUp(document.getElementById('stat-utilization'), 0, utilization, 1500, '', '%');
            Animations.countUp(document.getElementById('stat-pending'), 0, pendingActions, 800);
        }, 300);
        
        // Update change indicators
        this.updateStatChanges(monthlyRevenue, activeRentals, pendingActions);
    },
    
    /**
     * Update the stat change badges (would need historical data for real comparisons)
     */
    updateStatChanges(revenue, rentals, pending) {
        // For now, show placeholder changes
        // In production, compare to previous period
    },
    
    /**
     * Render fleet overview grid
     */
    renderFleetOverview() {
        const container = document.getElementById('fleet-grid');
        if (!container) return;
        
        const { vehicles, rentals } = this.data;
        
        if (vehicles.length === 0) {
            Utils.showEmpty(container, 'fa-car', 'No vehicles in fleet yet');
            return;
        }
        
        // Get active rentals for each vehicle
        const activeRentalsMap = {};
        rentals.filter(r => r.rental_status === 'active').forEach(r => {
            activeRentalsMap[r.vehicle_id] = r;
        });
        
        // Render vehicle cards (max 4 on dashboard)
        const displayVehicles = vehicles.slice(0, 4);
        
        container.innerHTML = displayVehicles.map(vehicle => {
            const rental = activeRentalsMap[vehicle.id];
            const status = rental ? 'rented' : 
                          vehicle.status === 'Maintenance' ? 'maintenance' :
                          vehicle.status === 'Reserved' ? 'reserved' : 'available';
            
            const statusLabel = status === 'rented' ? 'Rented' :
                               status === 'maintenance' ? 'Service' :
                               status === 'reserved' ? 'Reserved' : 'Available';
            
            return `
                <div class="vehicle-card" onclick="Sidebar.navigate('vehicles')">
                    <div class="vehicle-header">
                        <div class="vehicle-image">
                            ${vehicle.image_url 
                                ? `<img src="${vehicle.image_url}" alt="${vehicle.make}">` 
                                : '🚗'}
                        </div>
                        <span class="vehicle-status ${status}">${statusLabel}</span>
                    </div>
                    <div class="vehicle-name">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
                    <div class="vehicle-plate">${vehicle.license_plate || 'N/A'}</div>
                    <div class="vehicle-meta">
                        <div class="vehicle-meta-item">
                            <span>$${vehicle.weekly_rate || 400}</span>/week
                        </div>
                        <div class="vehicle-meta-item">
                            <span>${(vehicle.current_mileage || 0).toLocaleString()}</span> mi
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    /**
     * Render recent activity feed
     */
    renderActivityFeed() {
        const container = document.getElementById('activity-feed');
        if (!container) return;
        
        const { payments, rentals, customers } = this.data;
        
        // Combine and sort recent activities
        const activities = [];
        
        // Add recent payments
        payments.slice(0, 5).forEach(p => {
            const rental = rentals.find(r => r.id === p.rental_id);
            const customer = rental?.customers;
            activities.push({
                type: 'payment',
                icon: 'fa-dollar-sign',
                text: `<strong>${customer?.full_name || 'Customer'}</strong> paid weekly rental <strong>$${p.paid_amount}</strong>`,
                time: new Date(p.created_at),
                iconClass: 'payment'
            });
        });
        
        // Add recent rental status changes
        rentals.filter(r => r.rental_status === 'active').slice(0, 3).forEach(r => {
            activities.push({
                type: 'rental',
                icon: 'fa-key',
                text: `Rental started for <strong>${r.customers?.full_name || 'Customer'}</strong>`,
                time: new Date(r.start_date),
                iconClass: 'rental'
            });
        });
        
        // Sort by time (newest first)
        activities.sort((a, b) => b.time - a.time);
        
        if (activities.length === 0) {
            Utils.showEmpty(container, 'fa-stream', 'No recent activity');
            return;
        }
        
        container.innerHTML = activities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.iconClass}">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${Utils.timeAgo(activity.time)}</div>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Render AI insights panel
     */
    renderAIInsights() {
        const container = document.getElementById('ai-insights-list');
        if (!container) return;
        
        const { vehicles, rentals, payments } = this.data;
        const insights = [];
        
        // Maintenance prediction insight
        const vehiclesNeedingService = vehicles.filter(v => {
            const mileage = v.current_mileage || 0;
            const lastService = v.last_service_mileage || 0;
            return (mileage - lastService) > 4500; // Within 500 miles of 5000 mile service
        });
        
        if (vehiclesNeedingService.length > 0) {
            const v = vehiclesNeedingService[0];
            insights.push({
                type: 'warning',
                icon: 'fa-wrench',
                title: 'Maintenance Predicted',
                desc: `${v.year} ${v.make} ${v.model} will need service soon based on mileage patterns.`,
                action: 'Schedule now'
            });
        }
        
        // Revenue forecast insight
        const activeRentals = rentals.filter(r => r.rental_status === 'active');
        const projectedRevenue = activeRentals.reduce((sum, r) => sum + (r.weekly_rate || 400), 0) * 4;
        
        insights.push({
            type: 'success',
            icon: 'fa-chart-line',
            title: 'Revenue Forecast',
            desc: `Based on current rentals, projected monthly revenue is $${projectedRevenue.toLocaleString()}.`,
            action: 'View details'
        });
        
        // Fleet optimization insight
        const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
        if (availableVehicles > 1) {
            insights.push({
                type: 'info',
                icon: 'fa-lightbulb',
                title: 'Optimization Tip',
                desc: `You have ${availableVehicles} available vehicles. Consider marketing to increase bookings.`,
                action: 'Learn more'
            });
        }
        
        // Render insights
        container.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-icon ${insight.type}">
                    <i class="fas ${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <div class="insight-title">${insight.title}</div>
                    <div class="insight-desc">${insight.desc}</div>
                    <div class="insight-action">
                        ${insight.action} <i class="fas fa-arrow-right"></i>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    /**
     * Initialize animations
     */
    initAnimations() {
        // Stat cards fade in
        Animations.staggerFadeIn('.stat-card', 100);
        
        // Chart bars (if visible)
        setTimeout(() => {
            Animations.animateChartBars();
        }, 600);
    },
    
    /**
     * Refresh dashboard data
     */
    async refresh() {
        Utils.toastInfo('Refreshing dashboard...');
        await this.load();
        Utils.toastSuccess('Dashboard updated');
    }
};

// Export
window.Dashboard = Dashboard;
