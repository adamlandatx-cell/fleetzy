/* ============================================
   UPCOMING PAYMENTS - Dashboard Enhancement
   FIXED VERSION - Timezone bug fixed
   ============================================ */

/**
 * Parse a date string as LOCAL time (not UTC)
 * This fixes the timezone bug where "2025-01-24" shows as wrong day
 */
function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    // Append T00:00:00 to force local time interpretation
    // Without this, "2025-01-24" is treated as UTC midnight
    return new Date(dateStr + 'T00:00:00');
}

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
        
        // Now fetch customer, vehicle, and pending charges for each rental
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
            
            // Note: We no longer add pending charges to upcoming payment display
            // Pending charges are shown in the overall balance/ledger, not in "upcoming payments"
            // This avoids confusion where past-due charges appear added to future payments
            
            return {
                ...rental,
                customers: customer,
                vehicles: vehicle,
                pendingCharges: [],
                pendingChargesTotal: 0,
                totalDue: parseFloat(rental.weekly_rate || 0)
            };
        }));
        
        // Calculate dates - use local dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        
        // Categorize rentals
        const overdue = [];
        const dueToday = [];
        const dueTomorrow = [];
        const dueThisWeek = [];
        const dueLater = [];
        
        enrichedRentals.forEach(rental => {
            // FIX: Use parseLocalDate to avoid timezone shift
            const dueDate = parseLocalDate(rental.next_payment_due);
            if (!dueDate) return;
            dueDate.setHours(0, 0, 0, 0);
            
            if (dueDate.getTime() < today.getTime()) {
                // Past due - overdue
                overdue.push(rental);
            } else if (dueDate.getTime() === today.getTime()) {
                // Due today
                dueToday.push(rental);
            } else if (dueDate.getTime() === tomorrow.getTime()) {
                // Due tomorrow
                dueTomorrow.push(rental);
            } else if (dueDate <= endOfWeek) {
                // Due this week (but after tomorrow)
                dueThisWeek.push(rental);
            } else {
                dueLater.push(rental);
            }
        });
        
        // Update stats - combine overdue + today + tomorrow for urgent count
        updateUpcomingStats(overdue, dueToday, dueTomorrow, dueThisWeek);
        
        // Render list
        let html = '';
        
        // OVERDUE (most urgent - red)
        if (overdue.length > 0) {
            html += `<div style="padding: 8px 16px; background: rgba(239, 68, 68, 0.15); font-size: 12px; font-weight: 600; color: #ef4444;">
                <i class="fas fa-exclamation-circle"></i> OVERDUE (${overdue.length})
            </div>`;
            overdue.forEach(rental => {
                html += renderUpcomingPaymentItem(rental, true, 'overdue');
            });
        }
        
        // DUE TODAY (urgent - orange/amber)
        if (dueToday.length > 0) {
            html += `<div style="padding: 8px 16px; background: rgba(245, 158, 11, 0.15); font-size: 12px; font-weight: 600; color: #f59e0b;">
                <i class="fas fa-clock"></i> DUE TODAY (${dueToday.length})
            </div>`;
            dueToday.forEach(rental => {
                html += renderUpcomingPaymentItem(rental, true, 'today');
            });
        }
        
        // DUE TOMORROW (warning - yellow)
        if (dueTomorrow.length > 0) {
            html += `<div style="padding: 8px 16px; background: rgba(234, 179, 8, 0.1); font-size: 12px; font-weight: 600; color: #eab308;">
                <i class="fas fa-calendar-day"></i> DUE TOMORROW (${dueTomorrow.length})
            </div>`;
            dueTomorrow.forEach(rental => {
                html += renderUpcomingPaymentItem(rental, false, 'tomorrow');
            });
        }
        
        // Due This Week
        if (dueThisWeek.length > 0) {
            html += `<div style="padding: 8px 16px; background: var(--bg-tertiary); font-size: 12px; font-weight: 600; color: var(--text-secondary);">
                <i class="fas fa-calendar-week"></i> THIS WEEK (${dueThisWeek.length})
            </div>`;
            dueThisWeek.forEach(rental => {
                html += renderUpcomingPaymentItem(rental, false, 'week');
            });
        }
        
        // Show message if nothing urgent
        if (overdue.length === 0 && dueToday.length === 0 && dueTomorrow.length === 0 && dueThisWeek.length === 0) {
            html = `
                <div class="upcoming-empty" style="padding: 30px; text-align: center;">
                    <i class="fas fa-calendar-check" style="font-size: 36px; color: var(--primary); margin-bottom: 12px;"></i>
                    <p style="color: var(--text-secondary);">No payments due this week</p>
                    <p style="color: var(--text-tertiary); font-size: 12px;">${enrichedRentals.length} active rental(s)</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Update AI Insights for urgent payments (overdue or due today)
        const urgentRentals = [...overdue, ...dueToday];
        if (urgentRentals.length > 0) {
            showTollCheckAlert(urgentRentals);
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
 * Now includes pending charges in total and urgency type
 * @param {Object} rental - Rental object
 * @param {boolean} isUrgent - Whether this is an urgent payment
 * @param {string} urgencyType - 'overdue', 'today', 'tomorrow', or 'week'
 */
function renderUpcomingPaymentItem(rental, isUrgent, urgencyType = 'week') {
    // DB uses full_name, not first_name/last_name
    const customerName = rental.customers?.full_name || 'Unknown';
    const vehicleInfo = rental.vehicles ? 
        `${rental.vehicles.make || ''} ${rental.vehicles.model || ''}`.trim() || 'Unknown' : 'Unknown';
    const licensePlate = rental.vehicles?.license_plate || 'N/A';
    
    // FIX: Use parseLocalDate to avoid timezone shift
    const dueDate = parseLocalDate(rental.next_payment_due);
    const dueDateStr = dueDate ? dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A';
    
    // Determine CSS class and label based on urgency type
    let urgencyClass = '';
    let urgencyLabel = '';
    if (urgencyType === 'overdue') {
        urgencyClass = 'overdue';
        urgencyLabel = '<i class="fas fa-exclamation-circle"></i> OVERDUE - ';
    } else if (urgencyType === 'today') {
        urgencyClass = 'due-today';
        urgencyLabel = '<i class="fas fa-clock"></i> TODAY - ';
    } else if (urgencyType === 'tomorrow') {
        urgencyClass = 'due-tomorrow';
        urgencyLabel = '';
    }
    
    // Calculate totals
    const weeklyRate = parseFloat(rental.weekly_rate || 0);
    const chargesTotal = rental.pendingChargesTotal || 0;
    const totalDue = rental.totalDue || weeklyRate;
    const hasCharges = chargesTotal > 0;
    
    // Build charges breakdown HTML
    let chargesBreakdown = '';
    if (hasCharges && rental.pendingCharges) {
        chargesBreakdown = `
            <div class="payment-charges-breakdown" style="font-size: 11px; color: var(--warning); margin-top: 2px;">
                + $${chargesTotal.toFixed(2)} charges
            </div>
        `;
    }
    
    return `
        <div class="upcoming-payment-item ${urgencyClass}">
            <div class="payment-item-info">
                <div class="payment-item-name">${customerName}</div>
                <div class="payment-item-vehicle">${vehicleInfo} • ${licensePlate}</div>
                <div class="payment-item-due ${urgencyClass}">
                    ${urgencyLabel}${dueDateStr}
                </div>
            </div>
            <div class="payment-item-right">
                <div class="payment-item-amount">
                    ${hasCharges ? `
                        <div class="payment-amount-base" style="font-size: 11px; color: var(--text-tertiary); text-decoration: line-through;">$${weeklyRate.toFixed(0)}</div>
                        <div class="payment-amount-total" style="font-size: 16px; font-weight: 700; color: ${hasCharges ? 'var(--warning)' : 'var(--text-primary)'};">$${totalDue.toFixed(0)}</div>
                    ` : `
                        <div class="payment-amount-base">$${weeklyRate.toFixed(0)}</div>
                    `}
                    ${chargesBreakdown}
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
 * Now includes charges in totals and separate urgency levels
 */
function updateUpcomingStats(overdue, dueToday, dueTomorrow, dueThisWeek) {
    // Calculate total including charges - all payments this week
    const allThisWeek = [...overdue, ...dueToday, ...dueTomorrow, ...dueThisWeek];
    const weekTotal = allThisWeek.reduce((sum, r) => sum + parseFloat(r.totalDue || r.weekly_rate || 0), 0);
    
    // Urgent count = overdue + today (needs immediate attention)
    const urgentCount = overdue.length + dueToday.length;
    
    const statWeek = document.getElementById('stat-expected-week');
    const statTomorrow = document.getElementById('stat-due-tomorrow');
    
    if (statWeek) statWeek.textContent = '$' + weekTotal.toFixed(0);
    
    // Update the urgent stat - show overdue + today count
    if (statTomorrow) {
        statTomorrow.textContent = urgentCount;
        // Update label if element exists
        const label = statTomorrow.previousElementSibling;
        if (label && urgentCount > 0) {
            if (overdue.length > 0) {
                label.textContent = 'Overdue/Today';
                statTomorrow.style.color = '#ef4444'; // Red for overdue
            } else {
                label.textContent = 'Due Today';
                statTomorrow.style.color = '#f59e0b'; // Orange for today
            }
        } else if (label) {
            label.textContent = 'Due Tomorrow';
            statTomorrow.textContent = dueTomorrow.length;
            statTomorrow.style.color = ''; // Reset color
        }
    }
}

/**
 * Show toll check alert in AI Insights panel
 */
function showTollCheckAlert(urgentRentals) {
    const insightsContainer = document.getElementById('ai-insights') || 
                              document.querySelector('.ai-insights') ||
                              document.querySelector('[data-insights]');
    
    if (!insightsContainer) {
        console.log('Toll Check Alert: ' + urgentRentals.length + ' payments need attention');
        return;
    }
    
    const alertHtml = `
        <div class="insight-card toll-alert" style="margin-bottom: 12px;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div class="insight-icon" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-road"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
                        🚗 Check Tolls Now!
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        ${urgentRentals.length} payment${urgentRentals.length > 1 ? 's' : ''} due today or overdue. 
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
window.parseLocalDate = parseLocalDate;
