const orderService = require("../services/orderService");

class OrderController {
  // 1. Place Order
  async placeOrder(req, res) {
    try {
      const orderData = req.body;

      // Validate required fields
      const requiredFields = [
        "user_id",
        "restaurant_id",
        "location_id",
        "items",
        "total_price",
        "payment_type",
        "order_type",
      ];
      const missingFields = requiredFields.filter((field) => !orderData[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      const result = await orderService.createOrder(orderData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Place order error:", error.message);

      if (
        error.message.includes("Invalid") ||
        error.message.includes("required") ||
        error.message.includes("must be")
      ) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 2. Get Order by ID
  async getOrderById(req, res) {
    try {
      const { order_id } = req.params;

      if (!order_id) {
        return res.status(400).json({ error: "Order ID is required" });
      }

      const order = await orderService.getOrderById(order_id);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error("Get order error:", error.message);

      if (error.message === "Order not found") {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 3. Update Order Status
  async updateOrderStatus(req, res) {
    try {
      const { order_id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      // Check if user has permission to update this order
      // This depends on your auth system - for restaurants:
      if (req.restaurant) {
        // Restaurant can only update their own orders
        const order = await orderService.getOrderById(order_id);
        if (order && order.restaurant_id !== req.restaurant.restaurant_id) {
          return res
            .status(403)
            .json({ error: "Unauthorized to update this order" });
        }
      }

      // Allow restaurants (or callers) to pass optional ETA minutes and seconds when confirming
      const { eta_minutes = null, eta_seconds = null } = req.body || {};
      const result = await orderService.updateOrderStatus(
        order_id,
        status,
        eta_minutes,
        eta_seconds
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Update order status error:", error.message);

      if (error.message === "Order not found") {
        return res.status(404).json({ error: error.message });
      }

      if (
        error.message.includes("Invalid status") ||
        error.message.includes("Cannot update")
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 4. Get Orders by User
  async getOrdersByUser(req, res) {
    try {
      const { user_id } = req.params;
      const { status, limit, offset } = req.query;

      if (!user_id) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const orders = await orderService.getOrdersByUser(user_id, {
        status,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      });

      res.status(200).json(orders);
    } catch (error) {
      console.error("Get user orders error:", error.message);
      // If DB host unreachable or network error, return 503 to indicate service unavailable
      if (
        error.code === "EHOSTUNREACH" ||
        (error.message && error.message.includes("EHOSTUNREACH")) ||
        (error.message && error.message.includes("connect EHOSTUNREACH"))
      ) {
        return res
          .status(503)
          .json({ error: "Database unreachable. Please try again later." });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 5. Get Orders by Restaurant (Additional - for restaurant dashboard)
  // controller/orderController.js
  async getOrdersByRestaurant(req, res) {
    try {
      console.log("Restaurant from token:", req.restaurant);

      const restaurantId = req.restaurant?.restaurant_id;
      const { status, date, limit, offset } = req.query;

      if (!restaurantId) {
        return res
          .status(403)
          .json({ error: "Restaurant ID missing in token" });
      }

      const orders = await orderService.getOrdersByRestaurant(restaurantId, {
        status,
        date,
        limit: parseInt(limit, 10) || 50,
        offset: parseInt(offset, 10) || 0,
      });

      res.status(200).json(orders);
    } catch (error) {
      console.error("Get restaurant orders error:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 6. Cancel Order (User or Restaurant can cancel orders)
  async cancelOrder(req, res) {
    try {
      const { order_id } = req.params;
      const { reason } = req.body;

      // Determine who is cancelling: restaurant or user
      const cancelledBy = req.restaurant ? 'restaurant' : 'user';

      console.log('📝 Cancel Order Request:', { order_id, reason, cancelledBy });

      // Get order
      const order = await orderService.getOrderById(order_id);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if order can be cancelled
      if (order.status === "delivered" || order.status === "cancelled") {
        return res.status(400).json({
          error: `Cannot cancel order with status: ${order.status}`,
        });
      }

      // Cancel the order with reason and who cancelled it
      const result = await orderService.cancelOrder(order_id, reason, cancelledBy);
      
      console.log('✅ Order cancelled successfully:', result);
      
      res.status(200).json(result);
    } catch (error) {
      console.error("❌ Cancel order error:", error.message);

      if (error.message === "Order not found") {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes("Cannot cancel")) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 7. Get Order Statistics (for restaurant dashboard)
  async getOrderStats(req, res) {
    try {
      const { restaurant_id } = req.params;
      const { start_date, end_date } = req.query;

      // Verify restaurant ownership
      if (req.restaurant && req.restaurant.restaurant_id !== restaurant_id) {
        return res.status(403).json({ error: "Unauthorized access" });
      }

      const stats = await orderService.getOrderStatistics(restaurant_id, {
        start_date,
        end_date,
      });

      res.status(200).json(stats);
    } catch (error) {
      console.error("Get order stats error:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 8. Get Active Orders (Real-time tracking)
  async getActiveOrders(req, res) {
    try {
      const { restaurant_id } = req.params;

      // Verify restaurant ownership
      if (req.restaurant && req.restaurant.restaurant_id !== restaurant_id) {
        return res.status(403).json({ error: "Unauthorized access" });
      }

      const activeOrders = await orderService.getActiveOrders(restaurant_id);

      res.status(200).json(activeOrders);
    } catch (error) {
      console.error("Get active orders error:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 9. Submit Pickup Details (Customer submits when ready for collection)
  async submitPickupDetails(req, res) {
    try {
      const { order_id } = req.params;
      const { user_id } = req.body; // Should come from authenticated user in production
      const pickupDetails = {
        arrival_mode: req.body.arrival_mode,
        vehicle_number: req.body.vehicle_number,
        clothing_description: req.body.clothing_description,
        parking_location: req.body.parking_location,
        current_latitude: req.body.current_latitude,
        current_longitude: req.body.current_longitude,
        additional_notes: req.body.additional_notes,
      };

      if (!user_id) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const result = await orderService.submitPickupDetails(
        order_id,
        user_id,
        pickupDetails
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Submit pickup details error:", error.message);

      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }

      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("required") ||
        error.message.includes("must be") ||
        error.message.includes("can only be")
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 10. Get Pickup Details (For restaurant to view customer pickup info)
  async getPickupDetails(req, res) {
    try {
      const { order_id } = req.params;

      const pickupDetails = await orderService.getPickupDetails(order_id);

      if (!pickupDetails) {
        return res.status(404).json({ error: "Pickup details not found" });
      }

      res.status(200).json(pickupDetails);
    } catch (error) {
      console.error("Get pickup details error:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new OrderController();
