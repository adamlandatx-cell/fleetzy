/* ============================================
   UPCOMING PAYMENTS - Dashboard Enhancement
   FIXED VERSION - Better error handling
   ============================================ */

/**
 * Load and render upcoming payments
 */
async function loadUpcomingPayments() {
    const container = document.getElementById('upcoming-payments-list');
    if (!container) {
        console.warn('Upcoming payments container not found');
        return;
    }
    
    // Show loading state
    container.innerHTML = `
        <div class="upcoming-loading" style="padding: 20px; text-align: center;">
            <i class="fas fa-spinner fa-spin" style="color: var(--primary); margin-bottom: 8px;"></i>
            <p style="color: var(--text-secondary); font-size: 13px;">Loading payments...</p>
        </div>
    `;
    
    try {
        // First check if db is available
        if (typeof db === 'undefined') {
            throw new Error('Supabase client not initialized. Check if config.js is loaded.');
        }
        
        // Get active rentals with next_payment_due
        console.log('Fetching active rentals...');
        const { data: rentals, error } = await db
            .from('rentals')
            .select(`
                id,
                rental_id,
                weekly_rate,
                next_payment_due,
                rental_status,
                customer_id,
                vehicle_id
            `)
            .eq('rental_status', 'active')
            .not('next_payment_due', 'is', null)
            .order('next_payment_due', { ascending: true });
        
        if (error) {
            console.error('Supabase query error:', error);
            throw error;
        }
        
        console.log('Found rentals:', rentals?.length || 0);
        
        if (!rentals || rentals.length === 0) {
            container.innerHTML = `
                <div class="upcoming-empty" style="padding: 30px; text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 36px; color: var(--primary); margin-bottom: 12px;"></i>
                    <p style="color: var(--text-secondary);">No upcoming payments</p>
                    <p style="color: var(--text-tertiary); font-size: 12px;">Active rentals with due dates will appear here</p>
                </div>
            `;
            updateUpcomingStats([], []);
            return;
        }
        
        // Now fetch customer and vehicle data separately for each rental
        // This avoids issues with foreign key joins
        const enrichedRentals = await Promise.all(rentals.map(async (rental) => {
            // Get customer - NOTE: DB uses full_name, not first_name/last_name
            let customer = null;
            if (rental.customer_id) {
                const { data: custData } = await db
                    .from('customers')
                    .select('id, full_name, phone')
                    .eq('id', rental.customer_id)
                    .single();
                customer = custData;
            }
            
            // Get vehicle
            let vehicle = null;
            if (rental.vehicle_id) {
                const { data: vehData } = await db
                    .from('vehicles')
                    .select('id, make, model, license_plate')
                    .eq('id', rental.vehicle_id)
                    .single();
                vehicle = vehData;
            }
            
            return {
                ...rental,
                customers: customer,
                vehicles: vehicle
            };
        }));
        
        // Calculate dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        
        // Categorize rentals
        const dueTomorrow = [];
        const dueThisWeek = [];
        const dueLater = [];
        
        enrichedRentals.forEach(rental => {
            const dueDate = new Date(rental.next_payment_due);
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate.getTime() === tomorrow.getTime()) {
                dueTomorrow.push(rental);
            } else if (dueDate <= endOfWeek && dueDate > tomorrow) {
                dueThisWeek.push(rental);
            } else if (dueDate <= today) {
                // Overdue - treat as urgent
                dueTomorrow.push(rental);
            } else {
                dueLater.push(rental);
            }
        });
        
        // Update stats
        updateUpcomingStats(dueTomorrow, dueThisWeek);
        
        // Render list
        let html = '';
        
        // Due Tomorrow / Overdue (urgent)
        if (dueTomorrow.length > 0) {
            html += `<div style="padding: 8px 16px; background: rgba(245, 158, 11, 0.1); font-size: 12px; font-weight: 600; color: #f59e0b;">
                <i class="fas fa-exclamation-triangle"></i> DUE TOMORROW / OVERDUE (${dueTomorrow.length})
            </div>`;
            dueTomorrow.forEach(rental => {
                html += renderUpcomingPaymentItem(rental, true);
            });
        }
        
        // Due This Week
        if (dueThisWeek.length > 0) {
            html += `<div style="padding: 8px 16px; background: var(--bg-tertiary); font-size: 12px; font-weight: 600; color: var(--text-secondary);">
                <i class="fas fa-calendar-week"></i> THIS WEEK (${dueThisWeek.length})
            </div>`;
            dueThisWeek.forEach(rental => {
                html += renderUpcomingPaymentItem(rental, false);
            });
        }
        
        // Show message if nothing urgent
        if (dueTomorrow.length === 0 && dueThisWeek.length === 0) {
            html = `
                <div class="upcoming-empty" style="padding: 30px; text-align: center;">
                    <i class="fas fa-calendar-check" style="font-size: 36px; color: var(--primary); margin-bottom: 12px;"></i>
                    <p style="color: var(--text-secondary);">No payments due this week</p>
                    <p style="color: var(--text-tertiary); font-size: 12px;">${enrichedRentals.length} active rental(s)</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Update AI Insights if payments due tomorrow
        if (dueTomorrow.length > 0) {
            showTollCheckAlert(dueTomorrow);
        }
        
    } catch (error) {
        console.error('Error loading upcoming payments:', error);
        container.innerHTML = `
            <div class="upcoming-empty" style="padding: 30px; text-align: center;">
                <i class="fas fa-exclamation-circle" style="font-size: 36px; color: var(--danger); margin-bottom: 12px;"></i>
                <p style="color: var(--text-secondary);">Error loading payments</p>
                <p style="color: var(--text-tertiary); font-size: 12px; max-width: 200px; margin: 8px auto 0;">
                    ${error.message || 'Check console for details'}
                </p>
                <button onclick="loadUpcomingPayments()" 
                    style="margin-top: 12px; padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: 6px; color: var(--text-secondary); cursor: pointer; font-size: 12px;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
}

/**
 * Render a single upcoming payment item
 */
function renderUpcomingPaymentItem(rental, isUrgent) {
    // DB uses full_name, not first_name/last_name
    const customerName = rental.customers?.full_name || 'Unknown';
    const vehicleInfo = rental.vehicles ? 
        `${rental.vehicles.make || ''} ${rental.vehicles.model || ''}`.trim() || 'Unknown' : 'Unknown';
    const licensePlate = rental.vehicles?.license_plate || 'N/A';
    const dueDate = new Date(rental.next_payment_due);
    const dueDateStr = dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    
    // Check if overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = dueDate < today;
    
    return `
        <div class="upcoming-payment-item ${isUrgent ? 'due-tomorrow' : ''}">
            <div class="payment-item-info">
                <div class="payment-item-name">${customerName}</div>
                <div class="payment-item-vehicle">${vehicleInfo} • ${licensePlate}</div>
                <div class="payment-item-due ${isUrgent ? 'tomorrow' : ''}">
                    ${isOverdue ? '<i class="fas fa-exclamation-circle"></i> OVERDUE - ' : ''}${dueDateStr}
                </div>
            </div>
            <div class="payment-item-right">
                <div class="payment-item-amount">
                    <div class="payment-amount-base">$${parseFloat(rental.weekly_rate || 0).toFixed(0)}</div>
                </div>
                <div class="payment-item-actions">
                    ${isUrgent ? `
                        <button class="btn-icon-small toll-check" onclick="Charges.openAddChargeModal('${rental.id}')" title="Check Tolls / Add Charge">
                            <i class="fas fa-road"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon-small" onclick="Charges.openAddChargeModal('${rental.id}')" title="Add Charge">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Update the stats in the widget header
 */
function updateUpcomingStats(dueTomorrow, dueThisWeek) {
    const weekTotal = [...dueTomorrow, ...dueThisWeek].reduce((sum, r) => sum + parseFloat(r.weekly_rate || 0), 0);
    
    const statWeek = document.getElementById('stat-expected-week');
    const statTomorrow = document.getElementById('stat-due-tomorrow');
    
    if (statWeek) statWeek.textContent = '$' + weekTotal.toFixed(0);
    if (statTomorrow) statTomorrow.textContent = dueTomorrow.length;
}

/**
 * Show toll check alert in AI Insights panel
 */
function showTollCheckAlert(urgentRentals) {
    const insightsContainer = document.getElementById('ai-insights') || 
                              document.querySelector('.ai-insights') ||
                              document.querySelector('[data-insights]');
    
    if (!insightsContainer) {
        console.log('Toll Check Alert: ' + urgentRentals.length + ' payments due tomorrow');
        return;
    }
    
    const alertHtml = `
        <div class="insight-card toll-alert" style="margin-bottom: 12px;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div class="insight-icon" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-road"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
                        🚗 Check Tolls Now!
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        ${urgentRentals.length} payment${urgentRentals.length > 1 ? 's' : ''} due tomorrow. 
                        Check toll charges before collecting.
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing toll alerts first
    insightsContainer.querySelectorAll('.toll-alert').forEach(el => el.remove());
    insightsContainer.insertAdjacentHTML('afterbegin', alertHtml);
}

// Auto-load when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadUpcomingPayments();
    }, 500);
});

// Export functions
window.loadUpcomingPayments = loadUpcomingPayments;
window.renderUpcomingPaymentItem = renderUpcomingPaymentItem;
window.updateUpcomingStats = updateUpcomingStats;
window.showTollCheckAlert = showTollCheckAlert;
