/**
 * Timer Service
 * 
 * Handles all timer calculations for orders.
 * This is the single source of truth for timer logic.
 * 
 * Timer Behavior:
 * 
 * DELIVERY ORDERS:
 * - Total time = preparation time + delivery time
 * - During preparation phase: timer counts down total time
 * - If preparation takes longer than expected, timer sticks at delivery time remaining
 * - When order is marked "prepared", delivery phase timer starts
 * - If delivery takes longer than expected, timer sticks at 1 minute
 * - When order is marked "delivered", timer stops immediately
 * 
 * COLLECTION ORDERS:
 * - Total time = preparation time only
 * - Timer counts down until prepared
 * - If preparation takes longer, timer sticks at 1 minute
 * - When order is marked "prepared", shows "Ready for collection"
 */

class TimerService {
    // Timer phases
    PHASE = {
        PENDING: 'pending',
        PREPARATION: 'preparation',
        DELIVERY: 'delivery',
        COMPLETED: 'completed'
    };

    // Minimum time to show when timer is stuck
    MINIMUM_DISPLAY_TIME = 1;

    /**
     * Convert MM:SS string to minutes
     */
    convertTimeToMinutes(timeString) {
        if (!timeString) return 0;
        if (typeof timeString === 'number') return timeString;

        const parts = String(timeString).split(':');
        if (parts.length !== 2) return parseInt(timeString) || 0;

        const [minutes, seconds] = parts.map(Number);
        if (isNaN(minutes) || isNaN(seconds)) return 0;

        return minutes + (seconds / 60);
    }

    /**
     * Calculate the complete timer state for an order
     * This is the main method that returns all timer data for the frontend
     */
    calculateTimerState(order) {
        if (!order) {
            return null;
        }

        const now = new Date();
        const orderType = order.order_type === 'takeaway' ? 'collection' : order.order_type;
        const status = order.status;

        // Handle terminal statuses
        if (status === 'delivered' || status === 'collected' || status === 'cancelled') {
            return {
                order_id: order.order_id,
                order_type: orderType,
                status: status,
                timer_phase: this.PHASE.COMPLETED,
                time_remaining_minutes: 0,
                is_stuck: false,
                is_active: false,
                total_time_minutes: 0,
                preparation_time_minutes: order.timer_preparation_minutes || 0,
                delivery_time_minutes: order.timer_delivery_minutes || 0,
                display_text: this.getDisplayText(status, orderType, 0),
                started_at: order.timer_started_at
            };
        }

        // Handle pending status - timer not started yet
        if (status === 'pending') {
            return {
                order_id: order.order_id,
                order_type: orderType,
                status: status,
                timer_phase: this.PHASE.PENDING,
                time_remaining_minutes: 0,
                is_stuck: false,
                is_active: false,
                total_time_minutes: 0,
                preparation_time_minutes: 0,
                delivery_time_minutes: 0,
                display_text: 'Waiting for confirmation',
                started_at: null
            };
        }

        // Get timer configuration
        // Fallback for legacy orders: use delivery_time column if timer_preparation_minutes not set
        const prepMinutes = order.timer_preparation_minutes || this.convertTimeToMinutes(order.delivery_time) || 0;
        const deliveryMinutes = order.timer_delivery_minutes || 0;
        const totalMinutes = orderType === 'collection' ? prepMinutes : prepMinutes + deliveryMinutes;

        // Calculate elapsed time since order was confirmed (for prep time)
        // Priority: confirmed_at > timer_started_at > updated_at > created_at
        let confirmedAt = order.confirmed_at ? new Date(order.confirmed_at) :
            order.timer_started_at ? new Date(order.timer_started_at) :
                order.updated_at ? new Date(order.updated_at) :
                    order.created_at ? new Date(order.created_at) : null;

        let elapsedMinutes = 0;

        if (confirmedAt) {
            elapsedMinutes = (now - confirmedAt) / (1000 * 60);
        }

        // Determine current phase and remaining time based on status and elapsed time
        let phase = order.timer_phase || this.PHASE.PREPARATION;
        let timeRemaining = 0;
        let isStuck = false;
        let isActive = true;

        if (orderType === 'collection') {
            // COLLECTION ORDER LOGIC
            if (status === 'prepared') {
                // Order is ready for collection
                phase = this.PHASE.COMPLETED;
                timeRemaining = 0;
                isActive = false;
            } else {
                // Still preparing
                phase = this.PHASE.PREPARATION;
                timeRemaining = Math.max(0, prepMinutes - elapsedMinutes);

                // If prep time exceeded but not yet marked prepared, stick at 1 minute
                if (timeRemaining <= 0 && status !== 'prepared') {
                    timeRemaining = this.MINIMUM_DISPLAY_TIME;
                    isStuck = true;
                }
            }
        } else {
            // DELIVERY ORDER LOGIC
            if (status === 'confirmed') {
                // In preparation phase
                phase = this.PHASE.PREPARATION;

                // Prep time remaining = prep_minutes - elapsed since confirmed
                const prepTimeRemaining = Math.max(0, prepMinutes - elapsedMinutes);

                // Show prep time + delivery time as total remaining
                timeRemaining = prepTimeRemaining + deliveryMinutes;

                // If prep time exhausted but not yet out for delivery, stick at delivery time
                if (prepTimeRemaining <= 0) {
                    timeRemaining = deliveryMinutes;
                    isStuck = true;
                }
            } else if (status === 'prepared' || status === 'out_for_delivery') {
                // In delivery phase
                phase = this.PHASE.DELIVERY;

                // Use out_for_delivery_at as base for delivery timer
                const outForDeliveryAt = order.out_for_delivery_at ? new Date(order.out_for_delivery_at) : null;

                if (outForDeliveryAt) {
                    // Calculate elapsed since out_for_delivery
                    const deliveryElapsed = (now - outForDeliveryAt) / (1000 * 60);
                    timeRemaining = Math.max(0, deliveryMinutes - deliveryElapsed);
                } else {
                    // No out_for_delivery_at yet, show full delivery time
                    timeRemaining = deliveryMinutes;
                }

                // If delivery time exhausted but not yet delivered, stick at 1 minute
                if (timeRemaining <= 0) {
                    timeRemaining = this.MINIMUM_DISPLAY_TIME;
                    isStuck = true;
                }
            }
        }

        // Round to whole minutes for display
        timeRemaining = Math.round(timeRemaining);

        return {
            order_id: order.order_id,
            order_type: orderType,
            status: status,
            timer_phase: phase,
            time_remaining_minutes: timeRemaining,
            is_stuck: isStuck,
            is_active: isActive,
            total_time_minutes: Math.round(totalMinutes),
            preparation_time_minutes: Math.round(prepMinutes),
            delivery_time_minutes: Math.round(deliveryMinutes),
            display_text: this.getDisplayText(status, orderType, timeRemaining, isStuck, phase),
            started_at: order.timer_started_at,
            confirmed_at: order.confirmed_at,
            out_for_delivery_at: order.out_for_delivery_at,
            elapsed_minutes: Math.round(elapsedMinutes)
        };
    }

    /**
     * Get display text for the timer
     */
    getDisplayText(status, orderType, timeRemaining, isStuck = false, phase = null) {
        // Terminal statuses
        if (status === 'delivered') {
            return 'Delivered!';
        }
        if (status === 'collected') {
            return 'Collected!';
        }
        if (status === 'cancelled') {
            return 'Cancelled';
        }

        // Pending
        if (status === 'pending') {
            return 'Pending confirmation';
        }

        // Collection ready
        if (orderType === 'collection' && status === 'prepared') {
            return 'Ready for collection!';
        }

        // Active timer
        if (timeRemaining <= 0) {
            if (orderType === 'collection') {
                return 'Ready soon';
            }
            return phase === 'delivery' ? 'Arriving soon' : 'Preparing...';
        }

        // Format time display
        if (timeRemaining >= 60) {
            const hours = Math.floor(timeRemaining / 60);
            const mins = Math.round(timeRemaining % 60);
            return `${hours}h ${mins}m`;
        }

        return `${Math.round(timeRemaining)} min`;
    }

    /**
     * Get the timer data to store when order is confirmed
     */
    getInitialTimerData(preparationMinutes, deliveryMinutes, orderType) {
        const prepMins = this.convertTimeToMinutes(preparationMinutes);
        const delMins = orderType === 'collection' || orderType === 'takeaway' ? 0 : (deliveryMinutes || 0);

        return {
            timer_started_at: new Date(),
            timer_preparation_minutes: Math.round(prepMins),
            timer_delivery_minutes: Math.round(delMins),
            timer_phase: this.PHASE.PREPARATION,
            timer_stuck_at_minutes: null
        };
    }

    /**
     * Get the timer data updates when order status changes
     */
    getTimerDataForStatusChange(currentOrder, newStatus) {
        const orderType = currentOrder.order_type === 'takeaway' ? 'collection' : currentOrder.order_type;
        const updates = {};

        switch (newStatus) {
            case 'confirmed':
                // Timer starts when order is confirmed
                // Note: preparation and delivery times should be set separately
                if (!currentOrder.timer_started_at) {
                    updates.timer_started_at = new Date();
                    updates.timer_phase = this.PHASE.PREPARATION;
                }
                break;

            case 'prepared':
                // Move to delivery phase (or completed for collection)
                if (orderType === 'collection') {
                    updates.timer_phase = this.PHASE.COMPLETED;
                } else {
                    updates.timer_phase = this.PHASE.DELIVERY;
                }
                break;

            case 'out_for_delivery':
                // Ensure we're in delivery phase
                updates.timer_phase = this.PHASE.DELIVERY;
                break;

            case 'delivered':
            case 'collected':
                // Timer completed
                updates.timer_phase = this.PHASE.COMPLETED;
                break;

            case 'cancelled':
                // Timer stopped
                updates.timer_phase = this.PHASE.COMPLETED;
                break;
        }

        return updates;
    }
}

module.exports = new TimerService();
