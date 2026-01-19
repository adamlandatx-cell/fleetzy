/* ============================================
   UPCOMING PAYMENTS - Dashboard Enhancement
   Add these functions to your dashboard.js
   OR include this file after dashboard.js
   ============================================ */

/**
 * Load and render upcoming payments
 * Call this from your Dashboard.load() function
 */
async function loadUpcomingPayments() {
    const container = document.getElementById('upcoming-payments-list');
    if (!container) return;
    
    try {
        // Get active rentals with next_payment_due
        const { data: rentals, error } = await db
            .from('rentals')
            .select(`
                id,
                rental_id,
                weekly_rate,
                next_payment_due,
                rental_status,
                customers (id, first_name, last_name, phone),
                vehicles (id, make, model, license_plate)
            `)
            .eq('rental_status', 'active')
            .not('next_payment_due', 'is', null)
            .order('next_payment_due', { ascending: true });
        
        if (error) throw error;
        
        if (!rentals || rentals.length === 0) {
            container.innerHTML = `
                <div class="upcoming-empty">
                    <i class="fas fa-check-circle"></i>
                    <p>No upcoming payments</p>
                </div>
            `;
            updateUpcomingStats([], []);
            return;
        }
        
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
        
        rentals.forEach(rental => {
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
                <div class="upcoming-empty">
                    <i class="fas fa-calendar-check" style="color: var(--primary);"></i>
                    <p>No payments due this week</p>
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
            <div class="upcoming-empty">
                <i class="fas fa-exclamation-circle" style="color: var(--danger);"></i>
                <p>Error loading payments</p>
            </div>
        `;
    }
}

/**
 * Render a single upcoming payment item
 */
function renderUpcomingPaymentItem(rental, isUrgent) {
    const customerName = rental.customers ? 
        `${rental.customers.first_name} ${rental.customers.last_name}` : 'Unknown';
    const vehicleInfo = rental.vehicles ? 
        `${rental.vehicles.make} ${rental.vehicles.model}` : 'Unknown';
    const licensePlate = rental.vehicles?.license_plate || '';
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
                    <div class="payment-amount-base">$${parseFloat(rental.weekly_rate).toFixed(0)}</div>
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
 * Show toll check alert in AI Insights panel (if it exists)
 */
function showTollCheckAlert(urgentRentals) {
    // Look for an AI insights container
    const insightsContainer = document.getElementById('ai-insights') || 
                              document.querySelector('.ai-insights') ||
                              document.querySelector('[data-insights]');
    
    if (!insightsContainer) {
        // No AI insights panel, just log
        console.log('Toll Check Alert: ' + urgentRentals.length + ' payments due tomorrow');
        return;
    }
    
    // Create alert HTML
    const customerNames = urgentRentals.map(r => 
        r.customers ? `${r.customers.first_name} ${r.customers.last_name}` : 'Unknown'
    ).join(', ');
    
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
                    <div class="toll-alert-customers">
                        ${urgentRentals.slice(0, 3).map(r => `
                            <span class="toll-alert-customer">
                                <i class="fas fa-user"></i>
                                ${r.customers?.first_name || 'Unknown'}
                            </span>
                        `).join('')}
                        ${urgentRentals.length > 3 ? `<span class="toll-alert-customer">+${urgentRentals.length - 3} more</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Prepend to insights container
    insightsContainer.insertAdjacentHTML('afterbegin', alertHtml);
}

// Auto-load when DOM is ready (if Dashboard exists, hook into it)
document.addEventListener('DOMContentLoaded', () => {
    // Try to load after a short delay to let other scripts initialize
    setTimeout(() => {
        loadUpcomingPayments();
    }, 500);
});

// Export functions
window.loadUpcomingPayments = loadUpcomingPayments;
window.renderUpcomingPaymentItem = renderUpcomingPaymentItem;
window.updateUpcomingStats = updateUpcomingStats;
window.showTollCheckAlert = showTollCheckAlert;
