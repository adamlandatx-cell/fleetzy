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
            await this.renderActivityFeed();  // FIXED: Add await for async function
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
        console.log('🔥 openPendingActionsModal called!');
        
        const { applications = [], payments = [], rentals = [] } = this.pendingData || {};
        const total = applications.length + payments.length + rentals.length;
        
        console.log('📋 Pending data:', { applications: applications.length, payments: payments.length, rentals: rentals.length, total });
        
        // Always show modal, even if empty
        let emptyMessage = '';
        if (total === 0) {
            emptyMessage = `
                <div style="padding: 40px; text-align: center; color: var(--text-muted, #888);">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981; margin-bottom: 16px; display: block;"></i>
                    <h3 style="margin: 0 0 8px 0; color: var(--text-primary, #fff);">All Caught Up!</h3>
                    <p style="margin: 0;">No pending actions at this time.</p>
                </div>
            `;
        }
        
        // Create modal content with proper inline styles for visibility
        let modalHTML = `
            <div id="modal-pending-actions" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                " onclick="Dashboard.closePendingActionsModal()"></div>
                <div style="
                    position: relative;
                    background: var(--bg-card-solid, #1a1a2e);
                    border: 1px solid var(--border-medium, #333);
                    border-radius: 16px;
                    width: 100%;
                    max-width: 500px;
                    max-height: 80vh;
                    overflow: hidden;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                    animation: modalSlideIn 0.3s ease;
                ">
                    <style>
                        @keyframes modalSlideIn {
                            from { opacity: 0; transform: scale(0.95) translateY(-20px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                    </style>
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 20px 24px;
                        border-bottom: 1px solid var(--border-subtle, #2a2a3e);
                    ">
                        <h3 style="font-size: 18px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-clock" style="color: #f59e0b;"></i>
                            Pending Actions (${total})
                        </h3>
                        <button onclick="Dashboard.closePendingActionsModal()" style="
                            width: 36px;
                            height: 36px;
                            border: none;
                            background: transparent;
                            border-radius: 8px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: var(--text-tertiary, #888);
                            transition: all 0.2s;
                        " onmouseover="this.style.background='var(--bg-tertiary, #2a2a3e)'" onmouseout="this.style.background='transparent'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div style="max-height: calc(80vh - 80px); overflow-y: auto;">
        `;
        
        // Show empty state if no pending items
        if (total === 0) {
            modalHTML += emptyMessage;
        }
        
        // Pending Applications Section
        if (applications.length > 0) {
            modalHTML += `
                <div style="border-bottom: 1px solid var(--border-subtle, #2a2a3e);">
                    <div onclick="Sidebar.navigate('customers'); Dashboard.closePendingActionsModal();" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 14px 24px;
                        background: var(--bg-secondary, #1e1e32);
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='var(--bg-tertiary, #2a2a3e)'" onmouseout="this.style.background='var(--bg-secondary, #1e1e32)'">
                        <span style="font-weight: 500;"><i class="fas fa-user-plus" style="color: #8b5cf6; margin-right: 8px;"></i> New Applications (${applications.length})</span>
                        <i class="fas fa-chevron-right" style="color: var(--text-muted, #666); font-size: 12px;"></i>
                    </div>
                    <div style="padding: 8px 0;">
            `;
            applications.slice(0, 5).forEach(app => {
                const name = app.full_name || `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Unknown';
                const date = app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A';
                modalHTML += `
                    <div onclick="Sidebar.navigate('customers'); Dashboard.closePendingActionsModal();" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 10px 24px;
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='var(--bg-secondary, #1e1e32)'" onmouseout="this.style.background='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            background: var(--bg-tertiary, #2a2a3e);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            overflow: hidden;
                            flex-shrink: 0;
                        ">
                            ${app.selfie_url 
                                ? `<img src="${app.selfie_url}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover;">` 
                                : `<i class="fas fa-user" style="color: var(--text-muted, #666);"></i>`}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                            <div style="font-size: 12px; color: var(--text-muted, #888);">Applied ${date}</div>
                        </div>
                        <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;">Review</span>
                    </div>
                `;
            });
            if (applications.length > 5) {
                modalHTML += `<div style="padding: 10px 24px; text-align: center; color: #8b5cf6; font-size: 13px; cursor: pointer;" onclick="Sidebar.navigate('customers'); Dashboard.closePendingActionsModal();">+${applications.length - 5} more applications</div>`;
            }
            modalHTML += `</div></div>`;
        }
        
        // Pending Payments Section
        if (payments.length > 0) {
            modalHTML += `
                <div style="border-bottom: 1px solid var(--border-subtle, #2a2a3e);">
                    <div onclick="Sidebar.navigate('payments'); Dashboard.closePendingActionsModal();" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 14px 24px;
                        background: var(--bg-secondary, #1e1e32);
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='var(--bg-tertiary, #2a2a3e)'" onmouseout="this.style.background='var(--bg-secondary, #1e1e32)'">
                        <span style="font-weight: 500;"><i class="fas fa-credit-card" style="color: #10b981; margin-right: 8px;"></i> Pending Payments (${payments.length})</span>
                        <i class="fas fa-chevron-right" style="color: var(--text-muted, #666); font-size: 12px;"></i>
                    </div>
                    <div style="padding: 8px 0;">
            `;
            payments.slice(0, 5).forEach(payment => {
                const amount = parseFloat(payment.paid_amount || 0).toLocaleString();
                const date = payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : 'N/A';
                modalHTML += `
                    <div onclick="Sidebar.navigate('payments'); Dashboard.closePendingActionsModal();" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 10px 24px;
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='var(--bg-secondary, #1e1e32)'" onmouseout="this.style.background='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            background: rgba(16, 185, 129, 0.15);
                            color: #10b981;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                        ">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 500;">$${amount}</div>
                            <div style="font-size: 12px; color: var(--text-muted, #888);">Submitted ${date}</div>
                        </div>
                        <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;">Approve</span>
                    </div>
                `;
            });
            if (payments.length > 5) {
                modalHTML += `<div style="padding: 10px 24px; text-align: center; color: #8b5cf6; font-size: 13px; cursor: pointer;" onclick="Sidebar.navigate('payments'); Dashboard.closePendingActionsModal();">+${payments.length - 5} more payments</div>`;
            }
            modalHTML += `</div></div>`;
        }
        
        // Pending Rentals Section
        if (rentals.length > 0) {
            modalHTML += `
                <div>
                    <div onclick="Sidebar.navigate('rentals'); Dashboard.closePendingActionsModal();" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 14px 24px;
                        background: var(--bg-secondary, #1e1e32);
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='var(--bg-tertiary, #2a2a3e)'" onmouseout="this.style.background='var(--bg-secondary, #1e1e32)'">
                        <span style="font-weight: 500;"><i class="fas fa-file-contract" style="color: #3b82f6; margin-right: 8px;"></i> Rental Approvals (${rentals.length})</span>
                        <i class="fas fa-chevron-right" style="color: var(--text-muted, #666); font-size: 12px;"></i>
                    </div>
                    <div style="padding: 8px 0;">
            `;
            rentals.slice(0, 5).forEach(rental => {
                const customer = rental.customers?.full_name || 'Unknown Customer';
                const date = rental.created_at ? new Date(rental.created_at).toLocaleDateString() : 'N/A';
                modalHTML += `
                    <div onclick="Sidebar.navigate('rentals'); Dashboard.closePendingActionsModal();" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 10px 24px;
                        cursor: pointer;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='var(--bg-secondary, #1e1e32)'" onmouseout="this.style.background='transparent'">
                        <div style="
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            background: rgba(59, 130, 246, 0.15);
                            color: #3b82f6;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                        ">
                            <i class="fas fa-key"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${customer}</div>
                            <div style="font-size: 12px; color: var(--text-muted, #888);">Requested ${date}</div>
                        </div>
                        <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;">Approve</span>
                    </div>
                `;
            });
            if (rentals.length > 5) {
                modalHTML += `<div style="padding: 10px 24px; text-align: center; color: #8b5cf6; font-size: 13px; cursor: pointer;" onclick="Sidebar.navigate('rentals'); Dashboard.closePendingActionsModal();">+${rentals.length - 5} more rentals</div>`;
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
        
        console.log('✅ Pending actions modal opened');
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
            const vehicleStatus = vehicle.status || vehicle.vehicle_status; // Handle both column names
            const status = rental ? 'rented' : 
                          vehicleStatus === 'Maintenance' ? 'maintenance' :
                          vehicleStatus === 'Reserved' ? 'reserved' : 'available';
            
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
    async renderActivityFeed() {
        const container = document.getElementById('activity-feed');
        if (!container) return;
        
        try {
            // Try to load from customer_activity_log table (where ActivityLog writes)
            const { data: activityData, error } = await db
                .from('customer_activity_log')
                .select(`
                    *,
                    customer:customer_id(full_name)
                `)
                .order('activity_date', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            if (activityData && activityData.length > 0) {
                // Use activity log data (preferred source)
                const activities = activityData.map(a => {
                    const config = ActivityLog?.activityTypes?.[a.activity_type] || {
                        icon: 'fa-circle',
                        color: 'text-slate-400',
                        iconClass: 'note'
                    };
                    
                    return {
                        type: a.activity_type,
                        icon: config.icon,
                        text: a.description,
                        time: new Date(a.activity_date),
                        iconClass: this.getActivityIconClass(a.activity_type)
                    };
                });
                
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
                
                return;
            }
        } catch (error) {
            console.warn('Activity log table not available, using fallback:', error);
        }
        
        // Fallback: Use old method (payments, rentals, customers tables)
        const { payments, rentals, customers } = this.data;
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
     * Get CSS class for activity icon based on type
     */
    getActivityIconClass(activityType) {
        const classMap = {
            'payment': 'payment',
            'late_payment': 'late',
            'late_fee': 'fee',
            'deposit': 'payment',
            'deposit_adjustment': 'note',
            'note': 'note',
            'status_change': 'note',
            'rental_start': 'rental',
            'rental_end': 'note'
        };
        return classMap[activityType] || 'note';
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
        const availableVehicles = vehicles.filter(v => (v.status || v.vehicle_status) === 'Available').length;
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
