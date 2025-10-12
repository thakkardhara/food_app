const pool = require("../db/db");

class DeliveryRepository {
  async createRange(data) {
    const { delivery_id, restaurant_id, min_km, max_km, charge } = data;
    const query = `INSERT INTO delivery_ranges (delivery_id, restaurant_id, min_km, max_km, charge) VALUES (?, ?, ?, ?, ?)`;
    try {
      const [result] = await pool.execute(query, [
        delivery_id,
        restaurant_id,
        min_km,
        max_km,
        charge,
      ]);
      return result;
    } catch (error) {
      console.error("Error creating delivery range:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getRangesByRestaurant(restaurantId) {
    const query = `SELECT * FROM delivery_ranges WHERE restaurant_id = ? ORDER BY min_km ASC`;
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows;
    } catch (error) {
      console.error("Error fetching delivery ranges:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getRangeById(deliveryId) {
    const query = `SELECT * FROM delivery_ranges WHERE delivery_id = ? LIMIT 1`;
    try {
      const [rows] = await pool.execute(query, [deliveryId]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching delivery range:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async updateRange(deliveryId, updateData) {
    const allowed = ["min_km", "max_km", "charge"];
    const updates = [];
    const values = [];

    Object.keys(updateData).forEach((k) => {
      if (allowed.includes(k) && updateData[k] !== undefined) {
        updates.push(`${k} = ?`);
        values.push(updateData[k]);
      }
    });

    if (updates.length === 0) return null;

    values.push(deliveryId);
    const query = `UPDATE delivery_ranges SET ${updates.join(
      ", "
    )}, updated_at = CURRENT_TIMESTAMP WHERE delivery_id = ?`;
    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      console.error("Error updating delivery range:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async deleteRange(deliveryId) {
    const query = `DELETE FROM delivery_ranges WHERE delivery_id = ?`;
    try {
      const [result] = await pool.execute(query, [deliveryId]);
      return result;
    } catch (error) {
      console.error("Error deleting delivery range:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getAllRanges() {
    const query = `SELECT * FROM delivery_ranges ORDER BY restaurant_id, min_km ASC`;
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      console.error("Error fetching all delivery ranges:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new DeliveryRepository();
