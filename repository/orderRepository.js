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
    // Select order and some restaurant fields (LEFT JOIN so we still return the order
    // even if the restaurant row is missing)
    // Now includes pickup details columns
    const query = `
      SELECT
        o.*, 
        r.restaurant_id AS r_restaurant_id,
        r.name AS restaurant_name,
        r.email AS restaurant_email,
        r.phone AS restaurant_phone,
        r.profile_image AS restaurant_profile_image,
        r.latitude AS restaurant_latitude,
        r.longitude AS restaurant_longitude,
        r.cuisine AS restaurant_cuisine,
        r.status AS restaurant_status,
        ua.id AS user_address_id,
        ua.addressline1 AS user_addressline1,
        ua.addressline2 AS user_addressline2,
        ua.pincode AS user_pincode,
        ua.city AS user_city,
        ua.state AS user_state,
        ua.country AS user_country,
        ua.area AS user_area,
        ua.delivery_instructions AS user_delivery_instructions,
        ua.latitude AS user_latitude,
        ua.longitude AS user_longitude
      FROM orders o
      LEFT JOIN restaurants r ON o.restaurant_id = r.restaurant_id
      LEFT JOIN user_address ua ON o.location_id = ua.id
      WHERE o.order_id = ?
      LIMIT 1
    `;

    try {
      const [rows] = await pool.execute(query, [orderId]);
      const row = rows[0];

      if (!row) return null;

      // parse items
      let items = [];
      if (row.items) {
        if (typeof row.items === "string") {
          try {
            items = JSON.parse(row.items);
          } catch (err) {
            console.error("Failed to parse items JSON:", err);
            items = [];
          }
        } else if (typeof row.items === "object") {
          items = row.items;
        }
      }

      // parse restaurant cuisine (may be JSON)
      let cuisine = [];
      if (row.restaurant_cuisine) {
        if (typeof row.restaurant_cuisine === "string") {
          try {
            cuisine = JSON.parse(row.restaurant_cuisine || "[]");
          } catch (err) {
            console.error("Failed to parse restaurant cuisine JSON:", err);
            cuisine = [];
          }
        } else if (typeof row.restaurant_cuisine === "object") {
          cuisine = row.restaurant_cuisine;
        }
      }

      // build restaurant object
      const restaurant = {
        restaurant_id: row.r_restaurant_id || row.restaurant_id || null,
        name: row.restaurant_name || null,
        email: row.restaurant_email || null,
        phone: row.restaurant_phone || null,
        profile_image: row.restaurant_profile_image || null,
        latitude:
          row.restaurant_latitude !== null &&
            row.restaurant_latitude !== undefined
            ? parseFloat(row.restaurant_latitude)
            : null,
        longitude:
          row.restaurant_longitude !== null &&
            row.restaurant_longitude !== undefined
            ? parseFloat(row.restaurant_longitude)
            : null,
        cuisine,
        status: row.restaurant_status || null,
      };

      // build user_location if available
      const user_location = row.user_address_id
        ? {
          id: row.user_address_id,
          addressline1: row.user_addressline1 || null,
          addressline2: row.user_addressline2 || null,
          pincode: row.user_pincode || null,
          city: row.user_city || null,
          state: row.user_state || null,
          country: row.user_country || null,
          area: row.user_area || null,
          delivery_instructions: row.user_delivery_instructions || null,
          latitude:
            row.user_latitude !== null && row.user_latitude !== undefined
              ? parseFloat(row.user_latitude)
              : null,
          longitude:
            row.user_longitude !== null && row.user_longitude !== undefined
              ? parseFloat(row.user_longitude)
              : null,
        }
        : null;

      // remove the raw joined fields from the result to avoid duplication
      const cleaned = { ...row, items };
      delete cleaned.r_restaurant_id;
      delete cleaned.restaurant_name;
      delete cleaned.restaurant_email;
      delete cleaned.restaurant_phone;
      delete cleaned.restaurant_profile_image;
      delete cleaned.restaurant_latitude;
      delete cleaned.restaurant_longitude;
      delete cleaned.restaurant_cuisine;
      delete cleaned.restaurant_status;
      delete cleaned.user_address_id;
      delete cleaned.user_addressline1;
      delete cleaned.user_addressline2;
      delete cleaned.user_pincode;
      delete cleaned.user_city;
      delete cleaned.user_state;
      delete cleaned.user_country;
      delete cleaned.user_area;
      delete cleaned.user_delivery_instructions;
      delete cleaned.user_latitude;
      delete cleaned.user_longitude;

      return { ...cleaned, restaurant, user_location };
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

  async updateCancellationReason(orderId, reason, cancelledBy = null) {
    const query = `
      UPDATE orders 
      SET cancellation_reason = ?, cancelled_by = ? 
      WHERE order_id = ?
    `;

    try {
      console.log('🗄️ Executing DB query:', { orderId, reason, cancelledBy });
      const [result] = await pool.execute(query, [reason, cancelledBy, orderId]);
      console.log('✅ DB Update Result:', { affectedRows: result.affectedRows });
      return result;
    } catch (error) {
      console.error("❌ Error updating cancellation reason:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async findOrdersByUser(userId, filters = {}) {
    let query = `
    SELECT o.*, 
      r.name as restaurant_name, r.phone as restaurant_phone, r.latitude as restaurant_latitude, r.longitude as restaurant_longitude,
      ua.id as user_address_id, ua.addressline1 as user_addressline1, ua.addressline2 as user_addressline2, ua.pincode as user_pincode,
      ua.city as user_city, ua.state as user_state, ua.country as user_country, ua.area as user_area,
      ua.delivery_instructions as user_delivery_instructions, ua.latitude as user_latitude, ua.longitude as user_longitude
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.restaurant_id
    LEFT JOIN user_address ua ON o.location_id = ua.id
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

        // Build restaurant and user_location objects
        const restaurant = {
          name: row.restaurant_name || null,
          phone: row.restaurant_phone || null,
          latitude: row.restaurant_latitude || null,
          longitude: row.restaurant_longitude || null,
        };

        const user_location = row.user_address_id
          ? {
            id: row.user_address_id,
            addressline1: row.user_addressline1 || null,
            addressline2: row.user_addressline2 || null,
            pincode: row.user_pincode || null,
            city: row.user_city || null,
            state: row.user_state || null,
            country: row.user_country || null,
            area: row.user_area || null,
            delivery_instructions: row.user_delivery_instructions || null,
            latitude: row.user_latitude || null,
            longitude: row.user_longitude || null,
          }
          : null;

        // Remove the joined address/restaurant raw fields to avoid duplication
        const cleaned = { ...row, items };
        delete cleaned.restaurant_name;
        delete cleaned.restaurant_phone;
        delete cleaned.restaurant_latitude;
        delete cleaned.restaurant_longitude;
        delete cleaned.user_address_id;
        delete cleaned.user_addressline1;
        delete cleaned.user_addressline2;
        delete cleaned.user_pincode;
        delete cleaned.user_city;
        delete cleaned.user_state;
        delete cleaned.user_country;
        delete cleaned.user_area;
        delete cleaned.user_delivery_instructions;
        delete cleaned.user_latitude;
        delete cleaned.user_longitude;

        return {
          ...cleaned,
          items,
          restaurant,
          user_location,
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

  // Pickup Details Methods
  async updatePickupDetails(orderId, pickupDetails) {
    const {
      arrival_mode,
      vehicle_number,
      clothing_description,
      parking_location,
      current_latitude,
      current_longitude,
      additional_notes,
    } = pickupDetails;

    const query = `
      UPDATE orders 
      SET 
        pickup_arrival_mode = ?,
        pickup_vehicle_number = ?,
        pickup_clothing_description = ?,
        pickup_parking_location = ?,
        pickup_current_latitude = ?,
        pickup_current_longitude = ?,
        pickup_additional_notes = ?,
        pickup_details_submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [
        arrival_mode,
        vehicle_number || null,
        clothing_description || null,
        parking_location || null,
        current_latitude || null,
        current_longitude || null,
        additional_notes || null,
        orderId,
      ]);

      if (result.affectedRows === 0) {
        throw new Error("Order not found");
      }

      return result;
    } catch (error) {
      console.error("Error updating pickup details:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getPickupDetails(orderId) {
    const query = `
      SELECT 
        pickup_arrival_mode,
        pickup_vehicle_number,
        pickup_clothing_description,
        pickup_parking_location,
        pickup_current_latitude,
        pickup_current_longitude,
        pickup_additional_notes,
        pickup_details_submitted_at
      FROM orders 
      WHERE order_id = ?
    `;

    try {
      const [rows] = await pool.execute(query, [orderId]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error getting pickup details:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Timer-related methods

  /**
   * Update timer fields when order is confirmed
   */
  async updateTimerData(orderId, timerData) {
    const {
      timer_started_at,
      timer_preparation_minutes,
      timer_delivery_minutes,
      timer_phase,
      timer_stuck_at_minutes,
      delivery_distance_km
    } = timerData;

    const query = `
      UPDATE orders 
      SET 
        timer_started_at = COALESCE(?, timer_started_at),
        timer_preparation_minutes = COALESCE(?, timer_preparation_minutes),
        timer_delivery_minutes = COALESCE(?, timer_delivery_minutes),
        timer_phase = COALESCE(?, timer_phase),
        timer_stuck_at_minutes = ?,
        delivery_distance_km = COALESCE(?, delivery_distance_km),
        updated_at = CURRENT_TIMESTAMP
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [
        timer_started_at || null,
        timer_preparation_minutes !== undefined ? timer_preparation_minutes : null,
        timer_delivery_minutes !== undefined ? timer_delivery_minutes : null,
        timer_phase || null,
        timer_stuck_at_minutes !== undefined ? timer_stuck_at_minutes : null,
        delivery_distance_km !== undefined ? delivery_distance_km : null,
        orderId
      ]);

      if (result.affectedRows === 0) {
        throw new Error("Order not found");
      }

      return result;
    } catch (error) {
      console.error("Error updating timer data:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Update timer phase when order status changes
   */
  async updateTimerPhase(orderId, phase) {
    const query = `
      UPDATE orders 
      SET timer_phase = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [phase, orderId]);
      return result;
    } catch (error) {
      console.error("Error updating timer phase:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Store delivery distance and calculated delivery time
   */
  async updateDeliveryDistanceData(orderId, distanceKm, deliveryTimeMinutes) {
    const query = `
      UPDATE orders 
      SET 
        delivery_distance_km = ?,
        timer_delivery_minutes = ?,
        updated_at = CURRENT_TIMESTAMP 
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [
        distanceKm,
        deliveryTimeMinutes,
        orderId
      ]);
      return result;
    } catch (error) {
      console.error("Error updating delivery distance data:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Update confirmed_at timestamp when order is confirmed
   */
  async updateConfirmedAt(orderId, timestamp = new Date()) {
    const query = `
      UPDATE orders 
      SET confirmed_at = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [timestamp, orderId]);
      return result;
    } catch (error) {
      console.error("Error updating confirmed_at:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Update out_for_delivery_at timestamp when order is out for delivery
   */
  async updateOutForDeliveryAt(orderId, timestamp = new Date()) {
    const query = `
      UPDATE orders 
      SET out_for_delivery_at = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [timestamp, orderId]);
      return result;
    } catch (error) {
      console.error("Error updating out_for_delivery_at:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new OrderRepository();

