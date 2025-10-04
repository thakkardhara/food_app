const pool = require("../db/db");

class OrderRepository {
  async checkRestaurantExists(restaurantId) {
    const query =
      'SELECT restaurant_id, status FROM restaurants WHERE restaurant_id = ? AND status = "active"';
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows.length > 0;
    } catch (error) {
      console.error("Error checking restaurant:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async createOrder(orderData) {
    const {
      order_id,
      user_id,
      restaurant_id,
      location_id,
      items,
      total_price,
      payment_type,
      order_type,
      status,
      delivery_time,
      special_instructions,
    } = orderData;

    const query = `
      INSERT INTO orders 
      (order_id, user_id, restaurant_id, location_id, items, total_price, 
       payment_type, order_type, status, delivery_time, special_instructions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await pool.execute(query, [
        order_id,
        user_id,
        restaurant_id,
        location_id,
        JSON.stringify(items),
        total_price,
        payment_type,
        order_type,
        status,
        delivery_time,
        special_instructions,
      ]);
      return result;
    } catch (error) {
      console.error("Error creating order:", error);

      if (error.code === "ER_DUP_ENTRY") {
        throw new Error("Order ID already exists");
      }
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async findOrderById(orderId) {
    const query = "SELECT * FROM orders WHERE order_id = ?";
    try {
      const [rows] = await pool.execute(query, [orderId]);

      if (rows[0] && rows[0].items) {
        if (typeof rows[0].items === "string") {
          try {
            rows[0].items = JSON.parse(rows[0].items);
          } catch (err) {
            console.error("Failed to parse items JSON:", err);
          }
        }
      }

      return rows[0] || null;
    } catch (error) {
      console.error("Error finding order:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async updateOrderStatus(orderId, status) {
    const query = `
      UPDATE orders 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [status, orderId]);
      return result;
    } catch (error) {
      console.error("Error updating order status:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async updateDeliveryTime(orderId, deliveryTime) {
    const query = `
      UPDATE orders 
      SET delivery_time = ? 
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [deliveryTime, orderId]);
      return result;
    } catch (error) {
      console.error("Error updating delivery time:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async updateCancellationReason(orderId, reason) {
    const query = `
      UPDATE orders 
      SET cancellation_reason = ? 
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [reason, orderId]);
      return result;
    } catch (error) {
      console.error("Error updating cancellation reason:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async findOrdersByUser(userId, filters = {}) {
    let query = `
    SELECT o.*, r.name as restaurant_name 
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.restaurant_id
    WHERE o.user_id = ?
  `;

    const params = [userId];

    if (filters.status) {
      query += " AND o.status = ?";
      params.push(filters.status);
    }

    query += " ORDER BY o.created_at DESC";

    // ✅ safer handling for LIMIT/OFFSET
    if (filters.limit) {
      const limit = parseInt(filters.limit, 10);
      if (!isNaN(limit)) {
        query += ` LIMIT ${limit}`;
      }
    }

    if (filters.offset) {
      const offset = parseInt(filters.offset, 10);
      if (!isNaN(offset)) {
        query += ` OFFSET ${offset}`;
      }
    }

    try {
      const [rows] = await pool.execute(query, params);

      return rows.map((row) => {
        let items = [];

        if (row.items) {
          if (typeof row.items === "string") {
            try {
              items = JSON.parse(row.items);
            } catch (err) {
              console.error("Failed to parse items JSON:", row.items, err);
              items = [];
            }
          } else if (typeof row.items === "object") {
            items = row.items; // already parsed by MySQL
          }
        }

        return {
          ...row,
          items,
        };
      });
    } catch (error) {
      console.error("Error finding user orders:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async findOrdersByRestaurant(restaurantId, filters = {}) {
    let query = `
    SELECT * FROM orders 
    WHERE restaurant_id = ?
  `;

    const params = [restaurantId];

    if (filters.status) {
      query += " AND status = ?";
      params.push(filters.status);
    }

    if (filters.date) {
      query += " AND DATE(created_at) = DATE(?)";
      params.push(filters.date);
    }

    query += " ORDER BY created_at DESC";

    if (filters.limit) {
      query += ` LIMIT ${parseInt(filters.limit, 10)}`;
    }

    if (filters.offset) {
      query += ` OFFSET ${parseInt(filters.offset, 10)}`;
    }

    try {
      const [rows] = await pool.execute(query, params);

      return rows.map((row) => {
        let items = [];
        if (row.items) {
          if (typeof row.items === "string") {
            try {
              items = JSON.parse(row.items);
            } catch {
              items = [];
            }
          } else if (typeof row.items === "object") {
            items = row.items;
          }
        }
        return { ...row, items };
      });
    } catch (error) {
      console.error("Error finding restaurant orders:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async findActiveOrders(restaurantId, activeStatuses) {
    const placeholders = activeStatuses.map(() => "?").join(", ");
    const query = `
    SELECT * FROM orders 
    WHERE restaurant_id = ? 
    AND status IN (${placeholders})
    ORDER BY 
      CASE status
        WHEN 'out_for_delivery' THEN 1
        WHEN 'prepared' THEN 2
        WHEN 'confirmed' THEN 3
        WHEN 'pending' THEN 4
        ELSE 5
      END,
      created_at ASC
  `;

    try {
      const [rows] = await pool.execute(query, [
        restaurantId,
        ...activeStatuses,
      ]);

      // Safely parse JSON for items
      const formattedOrders = rows.map((row) => {
        let parsedItems;

        try {
          // Try parsing JSON (valid if stored properly)
          parsedItems = JSON.parse(row.items);
        } catch {
          // Fallback: handle "[object Object]" or plain object cases
          if (typeof row.items === "object") {
            parsedItems = Array.isArray(row.items) ? row.items : [row.items];
          } else {
            parsedItems = [];
          }
        }

        return {
          ...row,
          items: parsedItems,
        };
      });

      return formattedOrders;
    } catch (error) {
      console.error("Error finding active orders:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getOrderStats(restaurantId, dateRange = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(CASE WHEN status = 'delivered' THEN total_price ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'delivered' THEN total_price ELSE NULL END) as average_order_value,
        SUM(CASE WHEN order_type = 'delivery' THEN 1 ELSE 0 END) as delivery_orders,
        SUM(CASE WHEN order_type = 'takeaway' THEN 1 ELSE 0 END) as takeaway_orders,
        SUM(CASE WHEN order_type = 'dine_in' THEN 1 ELSE 0 END) as dine_in_orders,
        SUM(CASE WHEN payment_type = 'card' THEN 1 ELSE 0 END) as card_payments,
        SUM(CASE WHEN payment_type = 'cash' THEN 1 ELSE 0 END) as cash_payments,
        SUM(CASE WHEN payment_type = 'upi' THEN 1 ELSE 0 END) as upi_payments,
        SUM(CASE WHEN payment_type = 'wallet' THEN 1 ELSE 0 END) as wallet_payments
      FROM orders 
      WHERE restaurant_id = ?
    `;

    const params = [restaurantId];

    if (dateRange.start_date && dateRange.end_date) {
      query += " AND created_at BETWEEN ? AND ?";
      params.push(dateRange.start_date, dateRange.end_date);
    } else if (dateRange.start_date) {
      query += " AND created_at >= ?";
      params.push(dateRange.start_date);
    } else if (dateRange.end_date) {
      query += " AND created_at <= ?";
      params.push(dateRange.end_date);
    }

    try {
      const [rows] = await pool.execute(query, params);
      return rows[0];
    } catch (error) {
      console.error("Error getting order stats:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Order History tracking
  async createOrderHistory(orderId, status, notes = null) {
    const query = `
      INSERT INTO order_history (order_id, status, notes, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;

    try {
      const [result] = await pool.execute(query, [orderId, status, notes]);
      return result;
    } catch (error) {
      console.error("Error creating order history:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getOrderHistory(orderId) {
    const query = `
      SELECT * FROM order_history 
      WHERE order_id = ? 
      ORDER BY created_at ASC
    `;

    try {
      const [rows] = await pool.execute(query, [orderId]);
      return rows;
    } catch (error) {
      console.error("Error getting order history:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Additional utility methods
  async getTodaysOrders(restaurantId) {
    const query = `
      SELECT * FROM orders 
      WHERE restaurant_id = ? 
      AND DATE(created_at) = CURDATE()
      ORDER BY created_at DESC
    `;

    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows.map((row) => ({
        ...row,
        items: row.items ? JSON.parse(row.items) : [],
      }));
    } catch (error) {
      console.error("Error getting today orders:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getOrderCountByStatus(restaurantId) {
    const query = `
      SELECT status, COUNT(*) as count 
      FROM orders 
      WHERE restaurant_id = ? 
      GROUP BY status
    `;

    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows;
    } catch (error) {
      console.error("Error getting order counts:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async searchOrders(restaurantId, searchTerm) {
    const query = `
      SELECT * FROM orders 
      WHERE restaurant_id = ? 
      AND (order_id LIKE ? OR user_id LIKE ?)
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const searchPattern = `%${searchTerm}%`;

    try {
      const [rows] = await pool.execute(query, [
        restaurantId,
        searchPattern,
        searchPattern,
      ]);
      return rows.map((row) => ({
        ...row,
        items: row.items ? JSON.parse(row.items) : [],
      }));
    } catch (error) {
      console.error("Error searching orders:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new OrderRepository();
