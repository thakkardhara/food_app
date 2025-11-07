const pool = require("../db/db");

class CollectionDetailsRepository {
  /**
   * Create collection details for an order
   */
  async createCollectionDetails(collectionData) {
    const {
      order_id,
      arrival_type,
      vehicle_number,
      alternate_phone,
      additional_notes,
    } = collectionData;

    const query = `
      INSERT INTO collection_details 
      (order_id, arrival_type, vehicle_number, alternate_phone, additional_notes)
      VALUES (?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await pool.execute(query, [
        order_id,
        arrival_type,
        vehicle_number || null,
        alternate_phone || null,
        additional_notes || null,
      ]);

      return {
        id: result.insertId,
        order_id,
        arrival_type,
        vehicle_number: vehicle_number || null,
        alternate_phone: alternate_phone || null,
        additional_notes: additional_notes || null,
      };
    } catch (error) {
      console.error("Error creating collection details:", error);

      if (error.code === "ER_DUP_ENTRY") {
        throw new Error("Collection details already exist for this order");
      }

      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        throw new Error("Order not found");
      }

      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get collection details by order_id
   */
  async getCollectionDetailsByOrderId(orderId) {
    const query = `
      SELECT * FROM collection_details 
      WHERE order_id = ?
      LIMIT 1
    `;

    try {
      const [rows] = await pool.execute(query, [orderId]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error fetching collection details:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get collection details by ID
   */
  async getCollectionDetailsById(id) {
    const query = `
      SELECT * FROM collection_details 
      WHERE id = ?
      LIMIT 1
    `;

    try {
      const [rows] = await pool.execute(query, [id]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("Error fetching collection details by ID:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Update collection details by order_id
   */
  async updateCollectionDetails(orderId, updateData) {
    const { arrival_type, vehicle_number, alternate_phone, additional_notes } =
      updateData;

    // Build dynamic update query
    const fields = [];
    const values = [];

    if (arrival_type !== undefined) {
      fields.push("arrival_type = ?");
      values.push(arrival_type);
    }

    if (vehicle_number !== undefined) {
      fields.push("vehicle_number = ?");
      values.push(vehicle_number || null);
    }

    if (alternate_phone !== undefined) {
      fields.push("alternate_phone = ?");
      values.push(alternate_phone || null);
    }

    if (additional_notes !== undefined) {
      fields.push("additional_notes = ?");
      values.push(additional_notes || null);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(orderId);

    const query = `
      UPDATE collection_details 
      SET ${fields.join(", ")}
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, values);

      if (result.affectedRows === 0) {
        throw new Error("Collection details not found for this order");
      }

      return await this.getCollectionDetailsByOrderId(orderId);
    } catch (error) {
      console.error("Error updating collection details:", error);

      if (error.message.includes("not found")) {
        throw error;
      }

      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Delete collection details by order_id
   */
  async deleteCollectionDetails(orderId) {
    const query = `
      DELETE FROM collection_details 
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [orderId]);

      if (result.affectedRows === 0) {
        throw new Error("Collection details not found for this order");
      }

      return { message: "Collection details deleted successfully" };
    } catch (error) {
      console.error("Error deleting collection details:", error);

      if (error.message.includes("not found")) {
        throw error;
      }

      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Link collection details to order
   */
  async linkCollectionDetailsToOrder(orderId, collectionDetailsId) {
    const query = `
      UPDATE orders 
      SET collection_details_id = ?
      WHERE order_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [
        collectionDetailsId,
        orderId,
      ]);

      if (result.affectedRows === 0) {
        throw new Error("Order not found");
      }

      return { message: "Collection details linked to order successfully" };
    } catch (error) {
      console.error("Error linking collection details to order:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get all collection details for a restaurant (via orders)
   */
  async getCollectionDetailsByRestaurant(restaurantId, filters = {}) {
    let query = `
      SELECT cd.*, o.restaurant_id, o.user_id, o.status as order_status
      FROM collection_details cd
      INNER JOIN orders o ON cd.order_id = o.order_id
      WHERE o.restaurant_id = ?
    `;

    const params = [restaurantId];

    if (filters.arrival_type) {
      query += " AND cd.arrival_type = ?";
      params.push(filters.arrival_type);
    }

    if (filters.date) {
      query += " AND DATE(cd.created_at) = DATE(?)";
      params.push(filters.date);
    }

    query += " ORDER BY cd.created_at DESC";

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
      return rows;
    } catch (error) {
      console.error("Error fetching restaurant collection details:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new CollectionDetailsRepository();
