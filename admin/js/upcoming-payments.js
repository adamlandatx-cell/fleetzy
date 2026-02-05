/* ============================================
   UPCOMING PAYMENTS - Dashboard Enhancement
   v2.1 - PAID badge + payment coverage check
   ============================================ */

/**
 * Parse a date string as LOCAL time (not UTC)
 * This fixes the timezone bug where "2025-01-24" shows as wrong day
 */
function parseLocalDate(dateStr) {
    if (!dateStr) return null;
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

    container.innerHTML = `
        <div class="upcoming-loading" style="padding: 20px; text-align: center;">
            <i class="fas fa-spinner fa-spin" style="color: var(--primary); margin-bottom: 8px;"></i>
            <p style="color: var(--text-secondary); font-size: 13px;">Loading payments...</p>
        </div>
    `;

    try {
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
                current_weekly_rate,
                next_payment_due,
                last_payment_date,
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

        // ============================================================
        // PAYMENT COVERAGE CHECK + RECENTLY PAID DETECTION
        //
        // 1. Safety net: If a confirmed payment's due_date matches
        //    next_payment_due (rental wasn't advanced), hide it.
        // 2. PAID badge: If the last confirmed payment was within
        //    the past 3 days, show a green "PAID" indicator so the
        //    admin knows this cycle is covered.
        // ============================================================
        const rentalIds = rentals.map(r => r.id);
        const { data: recentPayments } = await db
            .from('payments')
            .select('rental_id, paid_date, due_date, payment_status, paid_amount')
            .in('rental_id', rentalIds)
            .eq('payment_status', 'confirmed')
            .order('paid_date', { ascending: false });

        // Build map: rental_id -> array of confirmed payments (most recent first)
        const confirmedByRental = {};
        (recentPayments || []).forEach(p => {
            if (!confirmedByRental[p.rental_id]) confirmedByRental[p.rental_id] = [];
            confirmedByRental[p.rental_id].push(p);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 3 days ago for "recently paid" threshold
        const recentThreshold = new Date(today);
        recentThreshold.setDate(recentThreshold.getDate() - 3);

        // Filter + annotate
        const filteredRentals = [];
        rentals.forEach(rental => {
            const payments = confirmedByRental[rental.id] || [];
            const nextDue = parseLocalDate(rental.next_payment_due);

            // Safety net: skip if a confirmed payment's due_date
            // matches next_payment_due (rental wasn't updated)
            const alreadyCovered = payments.some(p => {
                if (p.due_date && nextDue) {
                    const paymentDue = parseLocalDate(p.due_date);
                    return paymentDue && paymentDue.getTime() === nextDue.getTime();
                }
                return false;
            });

            if (alreadyCovered) {
                console.log(`Rental ${rental.rental_id}: Confirmed payment covers ${rental.next_payment_due} — hiding`);
                return; // Skip entirely
            }

            // Check if recently paid (last confirmed payment within 3 days)
            let recentlyPaid = false;
            let lastPaidDate = null;
            if (payments.length > 0) {
                const lastPayment = payments[0];
                const paidDate = lastPayment.paid_date ?
                    parseLocalDate(lastPayment.paid_date.split('T')[0]) : null;
                if (paidDate && paidDate >= recentThreshold) {
                    recentlyPaid = true;
                    lastPaidDate = paidDate;
                }
            }

            rental._recentlyPaid = recentlyPaid;
            rental._lastPaidDate = lastPaidDate;
            filteredRentals.push(rental);
        });

        console.log(`Filtered: ${rentals.length} active → ${filteredRentals.length} shown`);

        // Enrich with customer, vehicle, charges
        const enrichedRentals = await Promise.all(filteredRentals.map(async (rental) => {
            let customer = null;
            if (rental.customer_id) {
                const { data: custData } = await db
                    .from('customers')
                    .select('id, full_name, phone')
                    .eq('id', rental.customer_id)
                    .single();
                customer = custData;
            }

            let vehicle = null;
            if (rental.vehicle_id) {
                const { data: vehData } = await db
                    .from('vehicles')
                    .select('id, make, model, license_plate')
                    .eq('id', rental.vehicle_id)
                    .single();
                vehicle = vehData;
            }

            let pendingCharges = [];
            let pendingChargesTotal = 0;
            if (rental.next_payment_due) {
                const { data: charges, error: chargesError } = await db
                    .from('rental_charges')
                    .select('*')
                    .eq('rental_id', rental.id)
                    .in('status', ['pending', 'unpaid'])
                    .neq('charge_type', 'rent');

                if (!chargesError && charges && charges.length > 0) {
                    pendingCharges = charges;
                    pendingChargesTotal = charges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
                    console.log(`Rental ${rental.rental_id}: ${charges.length} pending charges = $${pendingChargesTotal}`);
                }
            }

            const effectiveRate = parseFloat(rental.current_weekly_rate || rental.weekly_rate || 0);

            return {
                ...rental,
                customers: customer,
                vehicles: vehicle,
                pendingCharges,
                pendingChargesTotal,
                effectiveRate,
                totalDue: effectiveRate + pendingChargesTotal,
                recentlyPaid: rental._recentlyPaid,
                lastPaidDate: rental._lastPaidDate
            };
        }));

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        // Categorize
        const overdue = [];
        const dueToday = [];
        const dueTomorrow = [];
        const dueThisWeek = [];

        enrichedRentals.forEach(rental => {
            const dueDate = parseLocalDate(rental.next_payment_due);
            if (!dueDate) return;
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate.getTime() < today.getTime()) {
                overdue.push(rental);
            } else if (dueDate.getTime() === today.getTime()) {
                dueToday.push(rental);
            } else if (dueDate.getTime() === tomorrow.getTime()) {
                dueTomorrow.push(rental);
            } else if (dueDate <= endOfWeek) {
                dueThisWeek.push(rental);
            }
        });

        updateUpcomingStats(overdue, dueToday, dueTomorrow, dueThisWeek);

        // Render
        let html = '';

        if (overdue.length > 0) {
            html += `<div style="padding: 8px 16px; background: rgba(239, 68, 68, 0.15); font-size: 12px; font-weight: 600; color: #ef4444;">
                <i class="fas fa-exclamation-circle"></i> OVERDUE (${overdue.length})
            </div>`;
            overdue.forEach(r => { html += renderUpcomingPaymentItem(r, true, 'overdue'); });
        }

        if (dueToday.length > 0) {
            html += `<div style="padding: 8px 16px; background: rgba(245, 158, 11, 0.15); font-size: 12px; font-weight: 600; color: #f59e0b;">
                <i class="fas fa-clock"></i> DUE TODAY (${dueToday.length})
            </div>`;
            dueToday.forEach(r => { html += renderUpcomingPaymentItem(r, true, 'today'); });
        }

        if (dueTomorrow.length > 0) {
            html += `<div style="padding: 8px 16px; background: rgba(234, 179, 8, 0.1); font-size: 12px; font-weight: 600; color: #eab308;">
                <i class="fas fa-calendar-day"></i> DUE TOMORROW (${dueTomorrow.length})
            </div>`;
            dueTomorrow.forEach(r => { html += renderUpcomingPaymentItem(r, false, 'tomorrow'); });
        }

        if (dueThisWeek.length > 0) {
            html += `<div style="padding: 8px 16px; background: var(--bg-tertiary); font-size: 12px; font-weight: 600; color: var(--text-secondary);">
                <i class="fas fa-calendar-week"></i> THIS WEEK (${dueThisWeek.length})
            </div>`;
            dueThisWeek.forEach(r => { html += renderUpcomingPaymentItem(r, false, 'week'); });
        }

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
 * Includes pending charges, urgency type, and PAID badge
 */
function renderUpcomingPaymentItem(rental, isUrgent, urgencyType = 'week') {
    const customerName = rental.customers?.full_name || 'Unknown';
    const vehicleInfo = rental.vehicles ?
        `${rental.vehicles.make || ''} ${rental.vehicles.model || ''}`.trim() || 'Unknown' : 'Unknown';
    const licensePlate = rental.vehicles?.license_plate || 'N/A';

    const dueDate = parseLocalDate(rental.next_payment_due);
    const dueDateStr = dueDate ? dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A';

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

    const weeklyRate = parseFloat(rental.effectiveRate || rental.current_weekly_rate || rental.weekly_rate || 0);
    const chargesTotal = rental.pendingChargesTotal || 0;
    const totalDue = rental.totalDue || weeklyRate;
    const hasCharges = chargesTotal > 0;

    // PAID badge — shows when last confirmed payment was within 3 days
    let paidBadge = '';
    if (rental.recentlyPaid) {
        const paidStr = rental.lastPaidDate ? rental.lastPaidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        paidBadge = `
            <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-top: 3px; letter-spacing: 0.3px;">
                <i class="fas fa-check-circle" style="font-size: 9px;"></i> PAID${paidStr ? ' ' + paidStr : ''}
            </div>
        `;
    }

    // Charges breakdown
    let chargesBreakdown = '';
    if (hasCharges && rental.pendingCharges) {
        const chargeDetails = rental.pendingCharges.map(c => {
            const type = (c.charge_type || 'charge').charAt(0).toUpperCase() + (c.charge_type || 'charge').slice(1);
            return `${type}: $${parseFloat(c.amount).toFixed(2)}`;
        }).join('\n');

        const chargeCount = rental.pendingCharges.length;
        const chargeTypeLabel = chargeCount === 1
            ? rental.pendingCharges[0].charge_type || 'charge'
            : `${chargeCount} charges`;

        chargesBreakdown = `
            <div class="payment-charges-breakdown" style="font-size: 11px; color: var(--warning); margin-top: 2px; cursor: help;" title="${chargeDetails}">
                + $${chargesTotal.toFixed(2)} (${chargeTypeLabel})
            </div>
        `;
    }

    return `
        <div class="upcoming-payment-item ${urgencyClass}" ${rental.recentlyPaid ? 'style="opacity: 0.7;"' : ''}>
            <div class="payment-item-info">
                <div class="payment-item-name">${customerName} ${paidBadge}</div>
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
 */
function updateUpcomingStats(overdue, dueToday, dueTomorrow, dueThisWeek) {
    const allThisWeek = [...overdue, ...dueToday, ...dueTomorrow, ...dueThisWeek];
    const weekTotal = allThisWeek.reduce((sum, r) => {
        // Don't count recently-paid rentals in the expected total
        if (r.recentlyPaid) return sum;
        return sum + parseFloat(r.totalDue || r.effectiveRate || r.current_weekly_rate || r.weekly_rate || 0);
    }, 0);

    const urgentCount = overdue.length + dueToday.length;

    const statWeek = document.getElementById('stat-expected-week');
    const statTomorrow = document.getElementById('stat-due-tomorrow');

    if (statWeek) statWeek.textContent = '$' + weekTotal.toFixed(0);

    if (statTomorrow) {
        const label = statTomorrow.nextElementSibling || statTomorrow.previousElementSibling;

        if (urgentCount > 0) {
            statTomorrow.textContent = urgentCount;
            if (label) {
                if (overdue.length > 0) {
                    label.textContent = 'Overdue/Today';
                    statTomorrow.style.color = '#ef4444';
                } else {
                    label.textContent = 'Due Today';
                    statTomorrow.style.color = '#f59e0b';
                }
            }
        } else {
            statTomorrow.textContent = dueTomorrow.length;
            statTomorrow.style.color = dueTomorrow.length > 0 ? '#f59e0b' : '';
            if (label) {
                label.textContent = 'Due Tomorrow';
            }
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
                        Check Tolls Now!
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        ${urgentRentals.length} payment${urgentRentals.length > 1 ? 's' : ''} due today or overdue.
                        Check toll charges before collecting.
                    </div>
                </div>
            </div>
        </div>
    `;

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
