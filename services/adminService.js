const adminRepository = require('../repository/adminRepository');
const restaurantRepository = require('../repository/restaurantRepository');
const jwt = require('jsonwebtoken');

class AdminService {
  generateJWTToken(adminData) {
    const payload = {
      admin_id: adminData.admin_id,
      email: adminData.email,
      name: adminData.name,
      role: 'admin'
    };

    return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: process.env.API_TOKEN_EXPIRESIN || '8h'
    });
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password) {
    return password && password.length >= 6;
  }

  // Admin Login
  async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      const admin = await adminRepository.findByEmail(email);
      if (!admin) {
        throw new Error('Email not found');
      }

      const isPasswordValid = await adminRepository.verifyPassword(
        password,
        admin.password
      );
      if (!isPasswordValid) {
        throw new Error('Password is wrong');
      }

      if (admin.status === 'inactive') {
        throw new Error('Account is inactive');
      }

      const token = this.generateJWTToken(admin);

      return {
        admin_id: admin.admin_id,
        token,
        message: 'Admin login successful',
        admin: {
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Get Admin Profile
  async getAdminProfile(adminId) {
    try {
      const admin = await adminRepository.findByAdminId(adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }
      return admin;
    } catch (error) {
      throw new Error(error.message);
    }
  }


  
  
  // Update Restaurant Status
  async updateRestaurantStatus(restaurantId, status, adminId) {
    try {
      if (!status) {
        throw new Error('Status is required');
      }
      
      const validStatuses = ['active', 'inactive', 'pending', 'disabled'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status. Must be: active, inactive, pending, or disabled');
      }
      
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      
      await adminRepository.updateRestaurantStatus(restaurantId, status);
      
      return {
        message: 'Restaurant status updated successfully',
        restaurant_id: restaurantId,
        new_status: status
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
  
async getAllRestaurants(options = {}) {
    try {
      const {
        status,
        is_online,
        page = 1,
        limit = 20,
        search
      } = options;

      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM restaurants WHERE 1=1';
      const params = [];

      // Filter by status
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      // Filter by online status
      if (is_online !== undefined) {
        query += ' AND is_online = ?';
        params.push(is_online);
      }

      // Search by name, email, or phone
      if (search) {
        query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const pool = require('../db/db');
      const [restaurants] = await pool.execute(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM restaurants WHERE 1=1';
      const countParams = [];

      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }

      if (is_online !== undefined) {
        countQuery += ' AND is_online = ?';
        countParams.push(is_online);
      }

      if (search) {
        countQuery += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      // Remove passwords from results
      const sanitizedRestaurants = restaurants.map(r => {
        const { password, ...rest } = r;
        return rest;
      });

      return {
        restaurants: sanitizedRestaurants,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }
  // Get Restaurant by ID
  async getRestaurantById(restaurantId) {
    try {
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const { password, ...restaurantData } = restaurant;

      return {
        ...restaurantData,
        cuisine: typeof restaurantData.cuisine === 'string' 
          ? JSON.parse(restaurantData.cuisine) 
          : restaurantData.cuisine,
        menu: typeof restaurantData.menu === 'string' 
          ? JSON.parse(restaurantData.menu) 
          : restaurantData.menu,
        profile_image: restaurantData.profile_image 
          ? `/${restaurantData.profile_image}` 
          : '/uploads/defaults/restaurant-default.png'
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateRestaurantSettings(restaurantId, settings) {
    try {
      // Validate restaurant exists
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Validate boolean values
      const validSettings = {};
      
      if (settings.card_payment_enabled !== undefined) {
        if (typeof settings.card_payment_enabled !== 'boolean') {
          throw new Error('card_payment_enabled must be a boolean');
        }
        validSettings.card_payment_enabled = settings.card_payment_enabled;
      }

      if (settings.delivery_enabled !== undefined) {
        if (typeof settings.delivery_enabled !== 'boolean') {
          throw new Error('delivery_enabled must be a boolean');
        }
        validSettings.delivery_enabled = settings.delivery_enabled;
      }

      if (settings.takeaway_enabled !== undefined) {
        if (typeof settings.takeaway_enabled !== 'boolean') {
          throw new Error('takeaway_enabled must be a boolean');
        }
        validSettings.takeaway_enabled = settings.takeaway_enabled;
      }

      if (settings.is_online !== undefined) {
        if (typeof settings.is_online !== 'boolean') {
          throw new Error('is_online must be a boolean');
        }
        validSettings.is_online = settings.is_online;
      }

      // Admin can force changes, but still validate at least one service is enabled if going online
      if (validSettings.is_online === true) {
        const currentSettings = await restaurantRepository.getSettings(restaurantId);
        const deliveryWillBeEnabled = validSettings.delivery_enabled ?? currentSettings.delivery_enabled;
        const takeawayWillBeEnabled = validSettings.takeaway_enabled ?? currentSettings.takeaway_enabled;

        if (!deliveryWillBeEnabled && !takeawayWillBeEnabled) {
          throw new Error('At least one service (delivery or takeaway) must be enabled when restaurant is online');
        }
      }

      await restaurantRepository.updateSettings(restaurantId, validSettings);

      // Get updated settings
      const updatedSettings = await restaurantRepository.getSettings(restaurantId);

      return {
        message: 'Restaurant settings updated successfully by admin',
        settings: updatedSettings
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Force restaurant offline (admin override)
   */
  async forceRestaurantOffline(restaurantId, reason = null) {
    try {
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      await restaurantRepository.toggleOnlineStatus(restaurantId, false);

      // Optionally log the reason in a separate audit table
      // await auditRepository.logAdminAction({
      //   admin_id,
      //   action: 'force_offline',
      //   restaurant_id: restaurantId,
      //   reason
      // });

      return {
        message: 'Restaurant forced offline by admin',
        restaurant_id: restaurantId,
        is_online: false,
        reason: reason || 'Admin action'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

 
  // Change Admin Password
  async changePassword(email, oldPassword, newPassword) {
    try {
      if (!email || !oldPassword || !newPassword) {
        throw new Error('Email, old password, and new password are required');
      }

      if (!this.validatePassword(newPassword)) {
        throw new Error('New password must be at least 6 characters');
      }

      const admin = await adminRepository.findByEmail(email);
      if (!admin) {
        throw new Error('Admin not found');
      }

      const isOldPasswordValid = await adminRepository.verifyPassword(
        oldPassword,
        admin.password
      );
      if (!isOldPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      await adminRepository.updatePassword(email, newPassword);

      return {
        message: 'Password updated successfully'
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Delete Restaurant
  async deleteRestaurant(restaurantId, adminId) {
    try {
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      await adminRepository.deleteRestaurant(restaurantId);

      return {
        message: 'Restaurant deleted successfully',
        restaurant_id: restaurantId
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }



   // Get Dashboard Statistics
async getDashboardStats() {
    try {
      const pool = require('../db/db');
      
      // Get restaurant stats by status and online status
      const [restaurantStats] = await pool.execute(`
        SELECT 
          status,
          is_online,
          COUNT(*) as count
        FROM restaurants 
        GROUP BY status, is_online
      `);

      // Get total restaurants
      const [totalResult] = await pool.execute('SELECT COUNT(*) as total FROM restaurants');
      const totalRestaurants = totalResult[0].total;

      // Get online restaurants count
      const [onlineResult] = await pool.execute(
        'SELECT COUNT(*) as count FROM restaurants WHERE is_online = true AND status = "active"'
      );
      const onlineRestaurants = onlineResult[0].count;

      // Get offline restaurants count
      const [offlineResult] = await pool.execute(
        'SELECT COUNT(*) as count FROM restaurants WHERE is_online = false AND status = "active"'
      );
      const offlineRestaurants = offlineResult[0].count;

      // Get service availability stats
      const [serviceStats] = await pool.execute(`
        SELECT 
          SUM(delivery_enabled) as delivery_enabled_count,
          SUM(takeaway_enabled) as takeaway_enabled_count,
          SUM(card_payment_enabled) as card_payment_enabled_count
        FROM restaurants 
        WHERE status = 'active'
      `);

      return {
        total_restaurants: totalRestaurants,
        online_restaurants: onlineRestaurants,
        offline_restaurants: offlineRestaurants,
        by_status: restaurantStats,
        service_availability: {
          delivery_enabled: serviceStats[0].delivery_enabled_count || 0,
          takeaway_enabled: serviceStats[0].takeaway_enabled_count || 0,
          card_payment_enabled: serviceStats[0].card_payment_enabled_count || 0
        }
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

}

module.exports = new AdminService();