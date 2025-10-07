const pool = require('../db/db');
const bcrypt = require('bcrypt');

class AdminRepository {
  // Find admin by email
  async findByEmail(email) {
    const query = 'SELECT * FROM admins WHERE email = ?';
    try {
      const [rows] = await pool.execute(query, [email]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding admin by email:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Find admin by ID
  async findByAdminId(adminId) {
    const query = 'SELECT * FROM admins WHERE admin_id = ?';
    try {
      const [rows] = await pool.execute(query, [adminId]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding admin by ID:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Verify password
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw new Error(`Password verification error: ${error.message}`);
    }
  }

// Get all restaurants with filters
async getAllRestaurants(filters = {}) {
  try {
    let { status, limit, offset, search } = filters;

    // Ensure limit and offset are valid integers
    limit = parseInt(limit, 10);
    offset = parseInt(offset, 10);
    if (isNaN(limit) || limit <= 0) limit = 50;
    if (isNaN(offset) || offset < 0) offset = 0;

    let query = `
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
        menu,
        status,
        created_by,
        created_at,
        updated_at
      FROM restaurants
      WHERE 1=1
    `;
    const params = [];

    // Optional filters
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Interpolate limit and offset directly
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.execute(query, params);

    // Parse JSON safely
    return rows.map((restaurant) => {
      let cuisineParsed;
      let menuParsed;

      try {
        cuisineParsed =
          typeof restaurant.cuisine === 'string' ? JSON.parse(restaurant.cuisine) : restaurant.cuisine;
      } catch {
        cuisineParsed = restaurant.cuisine?.split(',') || [];
      }

      try {
        menuParsed =
          typeof restaurant.menu === 'string' ? JSON.parse(restaurant.menu) : restaurant.menu;
      } catch {
        menuParsed = [];
      }

      return {
        ...restaurant,
        cuisine: cuisineParsed,
        menu: menuParsed,
        profile_image: restaurant.profile_image
          ? `/${restaurant.profile_image}`
          : '/uploads/defaults/restaurant-default.png',
        location: {
          latitude: restaurant.latitude,
          longitude: restaurant.longitude
        }
      };
    });
  } catch (error) {
    console.error('Error getting all restaurants:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}





  // Get restaurant count
  async getRestaurantCount(filters) {
    const { status, search } = filters;
    
    let query = 'SELECT COUNT(*) as count FROM restaurants WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    try {
      const [rows] = await pool.execute(query, params);
      return rows[0].count;
    } catch (error) {
      console.error('Error getting restaurant count:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Update restaurant status
  async updateRestaurantStatus(restaurantId, status) {
    const query = `
      UPDATE restaurants 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE restaurant_id = ?
    `;
    
    try {
      const [result] = await pool.execute(query, [status, restaurantId]);
      
      if (result.affectedRows === 0) {
        throw new Error('Restaurant not found');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating restaurant status:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Get dashboard statistics
  async getDashboardStats() {
    const query = `
      SELECT 
        COUNT(*) as total_restaurants,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_restaurants,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_restaurants,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive_restaurants,
        SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled_restaurants,
        SUM(CASE WHEN created_by = 'admin' THEN 1 ELSE 0 END) as admin_created,
        SUM(CASE WHEN created_by = 'self' THEN 1 ELSE 0 END) as self_registered
      FROM restaurants
      `;
    
    try {
      const [rows] = await pool.execute(query);
      return rows[0];
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Update admin password
  async updatePassword(email, newPassword) {
    const query = 'UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?';
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      const [result] = await pool.execute(query, [hashedPassword, email]);
      return result;
    } catch (error) {
      console.error('Error updating admin password:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Delete restaurant
  async deleteRestaurant(restaurantId) {
    const query = 'DELETE FROM restaurants WHERE restaurant_id = ?';
    try {
      const [result] = await pool.execute(query, [restaurantId]);
      
      if (result.affectedRows === 0) {
        throw new Error('Restaurant not found');
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new AdminRepository();