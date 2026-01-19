/* ============================================
   FLEETZY ADMIN - DASHBOARD
   Main dashboard with stats, charts, fleet overview
   FIXED: Jan 19, 2025
   - Revenue chart now shows REAL data from payments
   - Notification bell updates for new applications
   - Pending actions card is clickable with modal
   ============================================ */

const Dashboard = {
    // Cached data
    data: {
        vehicles: [],
        rentals: [],
        payments: [],
        customers: []
    },
    
    // Pending data for modal
    pendingData: {
        applications: [],
        payments: [],
        rentals: []
    },
    
    /**
     * Load dashboard data
     */
    async load() {
        try {
            await this.fetchAllData();
            this.renderStats();
            this.renderRevenueChart();  // NEW: Render real revenue chart
            this.renderFleetOverview();
            this.renderActivityFeed();
            this.renderAIInsights();
            this.updateNotificationBell();  // NEW: Update notification badge
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
            db.from('payments').select('*').order('created_at', { ascending: false }).limit(100),
            db.from('customers').select('*').order('created_at', { ascending: false }).limit(50)
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
        const { vehicles, rentals, payments, customers } = this.data;
        
        // Calculate stats
        const activeRentals = rentals.filter(r => r.rental_status === 'active').length;
        const totalVehicles = vehicles.length;
        const utilization = totalVehicles > 0 ? Math.round((activeRentals / totalVehicles) * 100) : 0;
        
        // Calculate monthly revenue (current month)
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyPayments = payments.filter(p => {
            const status = (p.payment_status || p.status || '').toLowerCase();
            const paidDate = p.paid_date ? new Date(p.paid_date) : null;
            const isCompleted = status === 'paid' || status === 'confirmed' || status === 'completed' || status === 'approved';
            return isCompleted && paidDate && paidDate >= monthStart;
        });
        const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0);
        
        // Count pending applications (customers waiting for approval)
        const pendingApplications = customers.filter(c => {
            const status = (c.status || c.application_status || '').toLowerCase();
            return status === 'pending' || status === 'pending_verification' || status === 'submitted' || status === 'new';
        });
        
        // Count pending payment approvals
        const pendingPayments = payments.filter(p => {
            const status = (p.payment_status || p.status || '').toLowerCase();
            return status === 'pending' || status === 'pending_approval';
        });
        
        // Count pending rental approvals
        const pendingRentals = rentals.filter(r => r.rental_status === 'pending_approval');
        
        // Store pending data for modal
        this.pendingData = {
            applications: pendingApplications,
            payments: pendingPayments,
            rentals: pendingRentals
        };
        
        const pendingActions = pendingApplications.length + pendingPayments.length + pendingRentals.length;
        
        // Animate the stats
        setTimeout(() => {
            Animations.countUp(document.getElementById('stat-revenue'), 0, monthlyRevenue, 2000, '$');
            Animations.countUp(document.getElementById('stat-rentals'), 0, activeRentals, 1000);
            Animations.countUp(document.getElementById('stat-utilization'), 0, utilization, 1500, '', '%');
            Animations.countUp(document.getElementById('stat-pending'), 0, pendingActions, 800);
        }, 300);
        
        // Update pending card subtitle
        const pendingChange = document.getElementById('pending-change');
        if (pendingChange) {
            if (pendingActions > 0) {
                pendingChange.innerHTML = `<i class="fas fa-exclamation"></i> ${pendingActions} need attention`;
                pendingChange.className = 'stat-change negative';
            } else {
                pendingChange.innerHTML = `<i class="fas fa-check"></i> All caught up!`;
                pendingChange.className = 'stat-change positive';
            }
        }
        
        // Update change indicators
        this.updateStatChanges(monthlyRevenue, activeRentals, pendingActions);
    },
    
    /**
     * NEW: Render revenue chart with REAL data from payments
     */
    renderRevenueChart() {
        const container = document.getElementById('revenue-chart');
        if (!container) return;
        
        const { payments } = this.data;
        
        // Get last 12 months of data
        const now = new Date();
        const monthsData = [];
        
        for (let i = 11; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            
            // Filter payments for this month
            const monthPayments = payments.filter(p => {
                const status = (p.payment_status || p.status || '').toLowerCase();
                const paidDate = p.paid_date ? new Date(p.paid_date) : null;
                const isCompleted = status === 'paid' || status === 'confirmed' || status === 'completed' || status === 'approved';
                return isCompleted && paidDate && paidDate >= monthDate && paidDate <= monthEnd;
            });
            
            const total = monthPayments.reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0);
            
            monthsData.push({
                month: monthDate.toLocaleString('default', { month: 'short' }),
                value: total
            });
        }
        
        // Find max value for scaling
        const maxValue = Math.max(...monthsData.map(m => m.value), 1);
        
        // Render chart bars
        container.innerHTML = monthsData.map(month => {
            const heightPercent = maxValue > 0 ? Math.round((month.value / maxValue) * 100) : 0;
            const displayHeight = Math.max(heightPercent, 5); // Minimum 5% height for visibility
            
            return `
                <div class="chart-bar-wrapper">
                    <div class="chart-bar" style="height: ${displayHeight}%;" data-height="${displayHeight}%" data-value="$${month.value.toLocaleString()}"></div>
                    <span class="chart-label">${month.month}</span>
                </div>
            `;
        }).join('');
        
        // Add tooltip behavior
        container.querySelectorAll('.chart-bar').forEach(bar => {
            bar.addEventListener('mouseenter', (e) => {
                const value = e.target.dataset.value;
                e.target.setAttribute('title', value);
            });
        });
        
        console.log('📊 Revenue chart rendered with real data:', monthsData.map(m => `${m.month}: $${m.value}`).join(', '));
    },
    
    /**
     * NEW: Update notification bell badge
     */
    updateNotificationBell() {
        const { applications, payments, rentals } = this.pendingData;
        const totalPending = applications.length + payments.length;
        
        // Find the notification badge in the top bar
        const bellBtn = document.querySelector('.icon-btn[onclick*="toggleNotifications"], .icon-btn .fa-bell')?.closest('.icon-btn');
        if (bellBtn) {
            let badge = bellBtn.querySelector('.badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge';
                bellBtn.appendChild(badge);
            }
            
            if (totalPending > 0) {
                badge.textContent = totalPending > 99 ? '99+' : totalPending;
                badge.style.display = 'flex';
                badge.style.background = 'var(--accent-red, #ef4444)';
            } else {
                badge.style.display = 'none';
            }
        }
        
        // Also update the customers sidebar badge for pending applications
        if (applications.length > 0) {
            Sidebar.updateBadge('customers', applications.length);
        }
        
        console.log(`🔔 Notification bell updated: ${totalPending} pending (${applications.length} apps, ${payments.length} payments)`);
    },
    
    /**
     * NEW: Open pending actions modal
     */
    openPendingActionsModal() {
        const { applications, payments, rentals } = this.pendingData;
        const total = applications.length + payments.length + rentals.length;
        
        if (total === 0) {
            Utils.toastSuccess('All caught up! No pending actions.');
            return;
        }
        
        // Create modal content
        let modalHTML = `
            <div class="modal" id="modal-pending-actions" style="display: block;">
                <div class="modal-backdrop" onclick="Dashboard.closePendingActionsModal()"></div>
                <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="fas fa-clock" style="color: var(--accent-amber);"></i>
                            Pending Actions (${total})
                        </h3>
                        <button class="modal-close" onclick="Dashboard.closePendingActionsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 0;">
        `;
        
        // Pending Applications Section
        if (applications.length > 0) {
            modalHTML += `
                <div class="pending-section">
                    <div class="pending-section-header" onclick="Sidebar.navigate('customers'); Dashboard.closePendingActionsModal();">
                        <span><i class="fas fa-user-plus"></i> New Applications (${applications.length})</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="pending-items">
            `;
            applications.slice(0, 5).forEach(app => {
                const name = app.full_name || `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Unknown';
                const date = app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A';
                modalHTML += `
                    <div class="pending-item" onclick="Sidebar.navigate('customers'); Dashboard.closePendingActionsModal();">
                        <div class="pending-item-avatar">
                            ${app.selfie_url 
                                ? `<img src="${app.selfie_url}" alt="${name}">` 
                                : `<i class="fas fa-user"></i>`}
                        </div>
                        <div class="pending-item-info">
                            <div class="pending-item-name">${name}</div>
                            <div class="pending-item-detail">Applied ${date}</div>
                        </div>
                        <span class="status-badge pending">Review</span>
                    </div>
                `;
            });
            if (applications.length > 5) {
                modalHTML += `<div class="pending-more">+${applications.length - 5} more applications</div>`;
            }
            modalHTML += `</div></div>`;
        }
        
        // Pending Payments Section
        if (payments.length > 0) {
            modalHTML += `
                <div class="pending-section">
                    <div class="pending-section-header" onclick="Sidebar.navigate('payments'); Dashboard.closePendingActionsModal();">
                        <span><i class="fas fa-credit-card"></i> Pending Payments (${payments.length})</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="pending-items">
            `;
            payments.slice(0, 5).forEach(payment => {
                const amount = parseFloat(payment.paid_amount || 0).toLocaleString();
                const date = payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : 'N/A';
                modalHTML += `
                    <div class="pending-item" onclick="Sidebar.navigate('payments'); Dashboard.closePendingActionsModal();">
                        <div class="pending-item-avatar payment">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="pending-item-info">
                            <div class="pending-item-name">$${amount}</div>
                            <div class="pending-item-detail">Submitted ${date}</div>
                        </div>
                        <span class="status-badge pending">Approve</span>
                    </div>
                `;
            });
            if (payments.length > 5) {
                modalHTML += `<div class="pending-more">+${payments.length - 5} more payments</div>`;
            }
            modalHTML += `</div></div>`;
        }
        
        // Pending Rentals Section
        if (rentals.length > 0) {
            modalHTML += `
                <div class="pending-section">
                    <div class="pending-section-header" onclick="Sidebar.navigate('rentals'); Dashboard.closePendingActionsModal();">
                        <span><i class="fas fa-file-contract"></i> Rental Approvals (${rentals.length})</span>
                        <i class="fas fa-chevron-right"></i>
                    </div>
                    <div class="pending-items">
            `;
            rentals.slice(0, 5).forEach(rental => {
                const customer = rental.customers?.full_name || 'Unknown Customer';
                const date = rental.created_at ? new Date(rental.created_at).toLocaleDateString() : 'N/A';
                modalHTML += `
                    <div class="pending-item" onclick="Sidebar.navigate('rentals'); Dashboard.closePendingActionsModal();">
                        <div class="pending-item-avatar rental">
                            <i class="fas fa-key"></i>
                        </div>
                        <div class="pending-item-info">
                            <div class="pending-item-name">${customer}</div>
                            <div class="pending-item-detail">Requested ${date}</div>
                        </div>
                        <span class="status-badge pending">Approve</span>
                    </div>
                `;
            });
            if (rentals.length > 5) {
                modalHTML += `<div class="pending-more">+${rentals.length - 5} more rentals</div>`;
            }
            modalHTML += `</div></div>`;
        }
        
        modalHTML += `
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to body
        const existingModal = document.getElementById('modal-pending-actions');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Close pending actions modal
     */
    closePendingActionsModal() {
        const modal = document.getElementById('modal-pending-actions');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
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
                          vehicle.vehicle_status === 'Maintenance' ? 'maintenance' :
                          vehicle.vehicle_status === 'Reserved' ? 'reserved' : 'available';
            
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
        
        // Add new applications
        customers.filter(c => {
            const status = (c.status || c.application_status || '').toLowerCase();
            return status === 'pending' || status === 'pending_verification' || status === 'submitted';
        }).slice(0, 3).forEach(c => {
            activities.push({
                type: 'application',
                icon: 'fa-user-plus',
                text: `New application from <strong>${c.full_name || 'Customer'}</strong>`,
                time: new Date(c.created_at),
                iconClass: 'application'
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
        const availableVehicles = vehicles.filter(v => v.vehicle_status === 'Available').length;
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
