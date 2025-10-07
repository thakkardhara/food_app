const orderRepository = require('../repository/orderRepository');
const restaurantRepository = require('../repository/restaurantRepository');
const crypto = require('crypto');

class OrderService {
  // Order status flow
  ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARED: 'prepared',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  };

  // Valid status transitions
  VALID_TRANSITIONS = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['prepared', 'cancelled'],
    'prepared': ['out_for_delivery', 'cancelled'],
    'out_for_delivery': ['delivered', 'cancelled'],
    'delivered': [],
    'cancelled': []
  };

  generateOrderId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = crypto.randomBytes(3).toString('hex');
    return `o${timestamp}${random}`;
  }

  validateOrderData(orderData) {
    const errors = [];

    // Validate user_id
    if (!orderData.user_id) {
      errors.push('User ID is required');
    }

    // Validate restaurant_id
    if (!orderData.restaurant_id) {
      errors.push('Restaurant ID is required');
    }

    // Validate location_id
    if (!orderData.location_id) {
      errors.push('Location ID is required');
    }

    // Validate items
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      // Validate each item
      orderData.items.forEach((item, index) => {
        if (!item.item_id) {
          errors.push(`Item ${index + 1}: item_id is required`);
        }
        if (!item.quantity || item.quantity < 1) {
          errors.push(`Item ${index + 1}: quantity must be at least 1`);
        }
        if (item.price === undefined || item.price < 0) {
          errors.push(`Item ${index + 1}: valid price is required`);
        }
      });
    }

    // Validate total_price
    if (orderData.total_price === undefined || orderData.total_price <= 0) {
      errors.push('Total price must be greater than 0');
    }

    // Validate payment_type
    const validPaymentTypes = ['card', 'cash', 'upi', 'wallet'];
    if (!orderData.payment_type || !validPaymentTypes.includes(orderData.payment_type)) {
      errors.push('Valid payment type is required (card, cash, upi, wallet)');
    }

    // Validate order_type
    const validOrderTypes = ['delivery', 'takeaway', 'dine_in'];
    if (!orderData.order_type || !validOrderTypes.includes(orderData.order_type)) {
      errors.push('Valid order type is required (delivery, takeaway, dine_in)');
    }

    // Calculate and verify total price
    const calculatedTotal = orderData.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    if (Math.abs(calculatedTotal - orderData.total_price) > 0.01) {
      errors.push(`Total price mismatch. Expected: ${calculatedTotal}, Received: ${orderData.total_price}`);
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    return true;
  }

  canTransitionStatus(currentStatus, newStatus) {
    const validTransitions = this.VALID_TRANSITIONS[currentStatus];
    return validTransitions && validTransitions.includes(newStatus);
  }

  async createOrder(orderData) {
    try {
      // Validate order data
      this.validateOrderData(orderData);

      // Check if restaurant exists and is active
      const restaurantExists = await orderRepository.checkRestaurantExists(orderData.restaurant_id);
      if (!restaurantExists) {
        throw new Error('Restaurant not found or inactive');
      }

      // Generate order ID
      const orderId = this.generateOrderId();

      // Prepare order data for storage
      const orderToStore = {
        order_id: orderId,
        user_id: orderData.user_id,
        restaurant_id: orderData.restaurant_id,
        location_id: orderData.location_id,
        items: orderData.items,
        total_price: parseFloat(orderData.total_price),
        payment_type: orderData.payment_type,
        order_type: orderData.order_type,
        status: this.ORDER_STATUS.PENDING,
        delivery_time: orderData.delivery_time || null,
        special_instructions: orderData.special_instructions || null,
        created_at: new Date()
      };

      await orderRepository.createOrder(orderToStore);

      // Create order history entry
      await orderRepository.createOrderHistory(orderId, this.ORDER_STATUS.PENDING, 'Order placed');

      return {
        order_id: orderId,
        status: this.ORDER_STATUS.PENDING,
        message: 'Order placed successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getOrderById(orderId) {
    try {
      const order = await orderRepository.findOrderById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      return order;

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateOrderStatus(orderId, newStatus) {
    try {
      // Validate status value
      const validStatuses = Object.values(this.ORDER_STATUS);
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Get current order
      const order = await orderRepository.findOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if status transition is valid
      if (order.status === newStatus) {
        throw new Error(`Order is already in ${newStatus} status`);
      }

      if (!this.canTransitionStatus(order.status, newStatus)) {
        throw new Error(`Cannot update status from ${order.status} to ${newStatus}`);
      }

      // Update status
      await orderRepository.updateOrderStatus(orderId, newStatus);

      // Add to order history
      await orderRepository.createOrderHistory(orderId, newStatus, `Status updated to ${newStatus}`);

      // If order is confirmed, set estimated delivery time
      if (newStatus === this.ORDER_STATUS.CONFIRMED) {
        const estimatedTime = new Date();
        estimatedTime.setMinutes(estimatedTime.getMinutes() + 45); // 45 minutes default
        await orderRepository.updateDeliveryTime(orderId, estimatedTime);
      }

      return {
        order_id: orderId,
        status: newStatus,
        message: 'Order status updated successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getOrdersByUser(userId, filters = {}) {
    try {
      const { status, limit, offset } = filters;
      
      const orders = await orderRepository.findOrdersByUser(userId, {
        status,
        limit: limit || 50,
        offset: offset || 0
      });

      return orders;

    } catch (error) {
      throw new Error(error.message);
    }
  }

async getOrdersByRestaurant(restaurantId, filters = {}) {
  try {
    const { status, date, limit, offset } = filters;
    
    return await orderRepository.findOrdersByRestaurant(restaurantId, {
      status,
      date,
      limit: limit || 50,
      offset: offset || 0
    });

  } catch (error) {
    throw new Error(error.message);
  }
}


  async cancelOrder(orderId, reason = null) {
    try {
      // Get order
      const order = await orderRepository.findOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if order can be cancelled
      if (order.status === this.ORDER_STATUS.DELIVERED) {
        throw new Error('Cannot cancel delivered order');
      }

      if (order.status === this.ORDER_STATUS.CANCELLED) {
        throw new Error('Order is already cancelled');
      }

      // Update status to cancelled
      await orderRepository.updateOrderStatus(orderId, this.ORDER_STATUS.CANCELLED);

      // Add cancellation reason to history
      const historyNote = reason ? `Order cancelled. Reason: ${reason}` : 'Order cancelled';
      await orderRepository.createOrderHistory(orderId, this.ORDER_STATUS.CANCELLED, historyNote);

      // Store cancellation details
      if (reason) {
        await orderRepository.updateCancellationReason(orderId, reason);
      }

      return {
        order_id: orderId,
        status: this.ORDER_STATUS.CANCELLED,
        message: 'Order cancelled successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getOrderStatistics(restaurantId, dateRange = {}) {
    try {
      const stats = await orderRepository.getOrderStats(restaurantId, dateRange);
      
      return {
        total_orders: stats.total_orders || 0,
        pending_orders: stats.pending_orders || 0,
        confirmed_orders: stats.confirmed_orders || 0,
        delivered_orders: stats.delivered_orders || 0,
        cancelled_orders: stats.cancelled_orders || 0,
        total_revenue: stats.total_revenue || 0,
        average_order_value: stats.average_order_value || 0,
        order_types: {
          delivery: stats.delivery_orders || 0,
          takeaway: stats.takeaway_orders || 0,
          dine_in: stats.dine_in_orders || 0
        },
        payment_types: {
          card: stats.card_payments || 0,
          cash: stats.cash_payments || 0,
          upi: stats.upi_payments || 0,
          wallet: stats.wallet_payments || 0
        }
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getActiveOrders(restaurantId) {
    try {
      const activeStatuses = [
        this.ORDER_STATUS.PENDING,
        this.ORDER_STATUS.CONFIRMED,
        this.ORDER_STATUS.PREPARED,
        this.ORDER_STATUS.OUT_FOR_DELIVERY
      ];

      const orders = await orderRepository.findActiveOrders(restaurantId, activeStatuses);
      
      return orders;

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getOrderHistory(orderId) {
    try {
      const history = await orderRepository.getOrderHistory(orderId);
      return history;

    } catch (error) {
      throw new Error(error.message);
    }
  }




  async placeOrder(orderData) {
    try {
      // Validate order data
      const errors = this.validateOrderData(orderData);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // ========================================
      // CHECK IF RESTAURANT CAN ACCEPT ORDERS
      // ========================================
      const restaurant = await restaurantRepository.findByRestaurantId(orderData.restaurant_id);
      
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Check if restaurant is online
      if (!restaurant.is_online) {
        throw new Error('Restaurant is currently offline and not accepting orders');
      }

      // Check if restaurant status is active
      if (restaurant.status !== 'active') {
        throw new Error('Restaurant is not available for orders');
      }

      // Check if order type is supported
      if (orderData.order_type === 'delivery' && !restaurant.delivery_enabled) {
        throw new Error('Restaurant is not accepting delivery orders at the moment');
      }

      if (orderData.order_type === 'takeaway' && !restaurant.takeaway_enabled) {
        throw new Error('Restaurant is not accepting takeaway orders at the moment');
      }

      // Check payment method
      if (orderData.payment_type === 'card' && !restaurant.card_payment_enabled) {
        throw new Error('Card payment is not available. Please choose another payment method');
      }

      // Generate order ID
      const orderId = this.generateOrderId();

      // Prepare order data
      const order = {
        order_id: orderId,
        user_id: orderData.user_id,
        restaurant_id: orderData.restaurant_id,
        location_id: orderData.location_id,
        items: JSON.stringify(orderData.items),
        total_price: orderData.total_price,
        payment_type: orderData.payment_type,
        payment_status: 'pending',
        order_type: orderData.order_type,
        order_status: 'pending',
        special_instructions: orderData.special_instructions || null,
        estimated_delivery_time: orderData.estimated_delivery_time || null
      };

      // Create order
      await orderRepository.createOrder(order);

      // Get created order
      const createdOrder = await orderRepository.findOrderById(orderId);

      return {
        message: 'Order placed successfully',
        order: {
          ...createdOrder,
          items: JSON.parse(createdOrder.items)
        }
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new OrderService();