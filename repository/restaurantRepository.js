const pool = require("../db/db");
const bcrypt = require("bcrypt");

class RestaurantRepository {
  async findByEmail(email) {
    const query = "SELECT * FROM restaurants WHERE email = ?";
    try {
      const [rows] = await pool.execute(query, [email]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error finding restaurant by email:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async findByRestaurantId(restaurantId) {
    const query = "SELECT * FROM restaurants WHERE restaurant_id = ?";
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error finding restaurant by ID:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async create(restaurantData) {
    const {
      restaurant_id,
      name,
      email,
      phone,
      password,
      latitude,
      longitude,
      cuisine,
      menu,
      profile_image,
      status,
      created_by,
    } = restaurantData;

    const query = `
      INSERT INTO restaurants 
      (restaurant_id, name, email, phone, password, latitude, longitude, cuisine, menu, profile_image, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      // Hash password before storing
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const [result] = await pool.execute(query, [
        restaurant_id,
        name,
        email,
        phone,
        hashedPassword,
        latitude,
        longitude,
        JSON.stringify(cuisine),
        JSON.stringify(menu),
        profile_image,
        status,
        created_by,
      ]);

      return result;
    } catch (error) {
      console.error("Error creating restaurant:", error);

      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("email")) {
          throw new Error("Email already exists");
        }
        if (error.message.includes("restaurant_id")) {
          throw new Error("Restaurant ID already exists");
        }
      }
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async updateProfileImage(restaurantId, imagePath) {
    const query = `
      UPDATE restaurants 
      SET profile_image = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE restaurant_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [imagePath, restaurantId]);
      return result;
    } catch (error) {
      console.error("Error updating profile image:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async updateAllFields(restaurantId, updateData) {
    try {
      const updates = [];
      const values = [];

      // Build dynamic update query
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          updates.push(`${key} = ?`);

          // Handle JSON fields (cuisine and menu)
          if (key === "cuisine" || key === "menu") {
            values.push(JSON.stringify(updateData[key]));
          } else {
            values.push(updateData[key]);
          }
        }
      });

      if (updates.length === 0) {
        throw new Error("No valid fields to update");
      }

      // Add timestamp update
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(restaurantId);

      const query = `UPDATE restaurants SET ${updates.join(
        ", "
      )} WHERE restaurant_id = ?`;

      const [result] = await pool.execute(query, values);

      if (result.affectedRows === 0) {
        throw new Error("Restaurant not found");
      }

      return result;
    } catch (error) {
      console.error("Error updating all restaurant fields:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async updateProfile(restaurantId, updateData) {
    const updates = [];
    const values = [];

    // Build dynamic update query
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        updates.push(`${key} = ?`);

        // Handle JSON fields
        if (key === "cuisine" || key === "menu") {
          values.push(JSON.stringify(updateData[key]));
        } else {
          values.push(updateData[key]);
        }
      }
    });

    if (updates.length === 0) {
      throw new Error("No valid fields to update");
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(restaurantId);

    const query = `UPDATE restaurants SET ${updates.join(
      ", "
    )} WHERE restaurant_id = ?`;

    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      console.error("Error updating restaurant details:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async updatePassword(email, newPassword) {
    const query =
      "UPDATE restaurants SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?";
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const [result] = await pool.execute(query, [hashedPassword, email]);
      return result;
    } catch (error) {
      console.error("Error updating password:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async updateStatus(restaurantId, status) {
    const query =
      "UPDATE restaurants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE restaurant_id = ?";
    try {
      const [result] = await pool.execute(query, [status, restaurantId]);
      return result;
    } catch (error) {
      console.error("Error updating restaurant status:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error("Error verifying password:", error);
      throw new Error(`Password verification error: ${error.message}`);
    }
  }
  // Additional useful methods
  async getAllRestaurants() {
    const query = `
    SELECT 
      id,
      restaurant_id,
      name,
      profile_image,
      email,
      phone,
      latitude,
      longitude,
      cuisine,
      status,
      created_by,
      created_at,
      updated_at
    FROM restaurants
    ORDER BY created_at DESC
  `;

    try {
      const [rows] = await pool.execute(query);

      // ✅ Parse cuisine if it’s stored as a JSON string
      return rows;
    } catch (error) {
      console.error("Error getting all restaurants:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async getAllRestaurantsWithCategories() {
    const restaurantQuery =
      "SELECT * FROM restaurants ORDER BY created_at DESC";
    const categoryQuery =
      "SELECT * FROM categories WHERE restaurant_id = ? ORDER BY display_order ASC";

    try {
      const [restaurants] = await pool.execute(restaurantQuery);

      for (let restaurant of restaurants) {
        const [categories] = await pool.execute(categoryQuery, [
          restaurant.restaurant_id,
        ]);

        for (let category of categories) {
          // Safely parse the JSON items field
          if (!category.items) {
            category.items = [];
          } else if (typeof category.items === "string") {
            try {
              category.items = JSON.parse(category.items || "[]");
            } catch (err) {
              console.error(
                "Error parsing items JSON for category:",
                category.category_id,
                err
              );
              category.items = [];
            }
          } else if (!Array.isArray(category.items)) {
            // If somehow stored as object, convert to array
            category.items = Array.isArray(category.items)
              ? category.items
              : [];
          }
        }

        restaurant.categories = categories;
      }

      return restaurants;
    } catch (error) {
      console.error(
        "Error getting all restaurants with categories and items:",
        error
      );
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async getItemsByCategoryId(categoryId) {
    const query =
      "SELECT * FROM items WHERE category_id = ? ORDER BY created_at DESC";
    try {
      const [rows] = await pool.execute(query, [categoryId]);
      return rows;
    } catch (error) {
      console.error("Error getting items by category ID:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async getRestaurantsByStatus(status, limit = 50, offset = 0) {
    const query =
      "SELECT * FROM restaurants WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?";
    try {
      const [rows] = await pool.execute(query, [status, limit, offset]);
      return rows;
    } catch (error) {
      console.error("Error getting restaurants by status:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async searchRestaurants(searchTerm, limit = 20, offset = 0) {
    const query = `
      SELECT * FROM restaurants 
      WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?) 
      AND status = 'active'
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const searchPattern = `%${searchTerm}%`;

    try {
      const [rows] = await pool.execute(query, [
        searchPattern,
        searchPattern,
        searchPattern,
        limit,
        offset,
      ]);
      return rows;
    } catch (error) {
      console.error("Error searching restaurants:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async getRestaurantStats() {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        created_by
      FROM restaurants 
      GROUP BY status, created_by
      ORDER BY status, created_by
    `;

    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      console.error("Error getting restaurant stats:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async deleteRestaurant(restaurantId) {
    const query = "DELETE FROM restaurants WHERE restaurant_id = ?";
    try {
      const [result] = await pool.execute(query, [restaurantId]);
      return result;
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
  async updateRestaurantDetails(restaurantId, updateData) {
    const allowedFields = [
      "name",
      "phone",
      "latitude",
      "longitude",
      "cuisine",
      "menu",
    ];
    const updates = [];
    const values = [];

    // Build dynamic update query
    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = ?`);

        // Handle JSON fields
        if (key === "cuisine" || key === "menu") {
          values.push(JSON.stringify(updateData[key]));
        } else {
          values.push(updateData[key]);
        }
      }
    });

    if (updates.length === 0) {
      throw new Error("No valid fields to update");
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(restaurantId);

    const query = `UPDATE restaurants SET ${updates.join(
      ", "
    )} WHERE restaurant_id = ?`;

    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      console.error("Error updating restaurant details:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  //  * Update restaurant settings (payment and service options)

  async updateSettings(restaurantId, settings) {
    const updates = [];
    const values = [];

    // Build dynamic update query based on provided settings
    if (settings.card_payment_enabled !== undefined) {
      updates.push("card_payment_enabled = ?");
      values.push(settings.card_payment_enabled);
    }

    if (settings.cash_payment_enabled !== undefined) {
      updates.push("cash_payment_enabled = ?");
      values.push(settings.cash_payment_enabled);
    }

    if (settings.delivery_enabled !== undefined) {
      updates.push("delivery_enabled = ?");
      values.push(settings.delivery_enabled);
    }

    if (settings.takeaway_enabled !== undefined) {
      updates.push("takeaway_enabled = ?");
      values.push(settings.takeaway_enabled);
    }

    if (settings.is_online !== undefined) {
      updates.push("is_online = ?");
      values.push(settings.is_online);
    }

    if (updates.length === 0) {
      return null;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(restaurantId);

    const query = `
      UPDATE restaurants 
      SET ${updates.join(", ")} 
      WHERE restaurant_id = ?
    `;

    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      console.error("Error updating restaurant settings:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Toggle restaurant online/offline status
   */
  async toggleOnlineStatus(restaurantId, isOnline) {
    const query = `
      UPDATE restaurants 
      SET is_online = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE restaurant_id = ?
    `;

    try {
      const [result] = await pool.execute(query, [isOnline, restaurantId]);
      return result;
    } catch (error) {
      console.error("Error toggling online status:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get restaurant settings only
   */
  async getSettings(restaurantId) {
    const query = `
      SELECT 
        restaurant_id,
        card_payment_enabled,
        cash_payment_enabled,
        delivery_enabled,
        takeaway_enabled,
        is_online
      FROM restaurants 
      WHERE restaurant_id = ?
    `;

    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error getting restaurant settings:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Check if restaurant is accepting orders
   */
  async canAcceptOrders(restaurantId, orderType) {
    const query = `
      SELECT 
        is_online,
        delivery_enabled,
        takeaway_enabled,
        status
      FROM restaurants 
      WHERE restaurant_id = ?
    `;

    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      const restaurant = rows[0];

      if (!restaurant) {
        return { canAccept: false, reason: "Restaurant not found" };
      }

      if (!restaurant.is_online) {
        return { canAccept: false, reason: "Restaurant is currently offline" };
      }

      if (restaurant.status !== "active") {
        return { canAccept: false, reason: "Restaurant is not active" };
      }

      if (orderType === "delivery" && !restaurant.delivery_enabled) {
        return {
          canAccept: false,
          reason: "Delivery service is currently unavailable",
        };
      }

      if (orderType === "takeaway" && !restaurant.takeaway_enabled) {
        return {
          canAccept: false,
          reason: "Takeaway service is currently unavailable",
        };
      }

      return { canAccept: true, reason: null };
    } catch (error) {
      console.error("Error checking order acceptance:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Get all online restaurants only
   */
  async getOnlineRestaurants(limit = 50, offset = 0) {
    const query = `
      SELECT * FROM restaurants 
      WHERE is_online = true AND status = 'active'
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    try {
      const [rows] = await pool.execute(query, [limit, offset]);
      return rows;
    } catch (error) {
      console.error("Error getting online restaurants:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new RestaurantRepository();
