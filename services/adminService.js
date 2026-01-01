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

      // Get order stats
      const [orderStats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders
        FROM orders
      `);

      // Get user stats
      const [userStats] = await pool.execute('SELECT COUNT(*) as total_users FROM users');

      // Get revenue stats
      const [revenueStats] = await pool.execute(`
        SELECT 
          SUM(CASE WHEN status = 'delivered' AND DATE(created_at) = CURDATE() THEN total_price ELSE 0 END) as revenue_today,
          SUM(CASE WHEN status = 'delivered' THEN total_price ELSE 0 END) as total_revenue,
          SUM(CASE WHEN status = 'delivered' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN total_price ELSE 0 END) as revenue_this_month
        FROM orders
      `);

      return {
        total_restaurants: totalRestaurants,
        online_restaurants: onlineRestaurants,
        offline_restaurants: offlineRestaurants,
        total_orders: orderStats[0].total_orders || 0,
        delivered_orders: orderStats[0].delivered_orders || 0,
        cancelled_orders: orderStats[0].cancelled_orders || 0,
        pending_orders: orderStats[0].pending_orders || 0,
        total_users: userStats[0].total_users || 0,
        revenue_today: parseFloat(revenueStats[0].revenue_today || 0),
        total_revenue: parseFloat(revenueStats[0].total_revenue || 0),
        revenue_this_month: parseFloat(revenueStats[0].revenue_this_month || 0),
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

  // Get Top Restaurants by Revenue
  async getTopRestaurantsByRevenue(limit = 3) {
    try {
      const pool = require('../db/db');

      // Ensure limit is a valid integer for safe interpolation
      const safeLimit = parseInt(limit, 10) || 3;

      const query = `
        SELECT 
          r.restaurant_id,
          r.name,
          r.email,
          r.phone,
          r.profile_image,
          r.latitude,
          r.longitude,
          r.cuisine,
          r.status,
          r.is_online,
          r.delivery_enabled,
          r.takeaway_enabled,
          r.card_payment_enabled,
          r.cash_payment_enabled,
          COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_price ELSE 0 END), 0) as total_revenue,
          COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as total_orders,
          COALESCE((SELECT COUNT(*) FROM categories c WHERE c.restaurant_id = r.restaurant_id), 0) as categories_count,
          COALESCE((SELECT SUM(JSON_LENGTH(c.items)) FROM categories c WHERE c.restaurant_id = r.restaurant_id), 0) as menu_items_count
        FROM restaurants r
        LEFT JOIN orders o ON r.restaurant_id = o.restaurant_id
        WHERE r.status = 'active'
        GROUP BY r.restaurant_id
        ORDER BY total_revenue DESC
        LIMIT ${safeLimit}
      `;

      const [restaurants] = await pool.execute(query);

      // Parse cuisine JSON and format profile image
      const formattedRestaurants = restaurants.map(r => {
        let cuisineParsed = [];
        try {
          cuisineParsed = typeof r.cuisine === 'string' ? JSON.parse(r.cuisine) : (r.cuisine || []);
        } catch {
          cuisineParsed = [];
        }

        return {
          ...r,
          cuisine: cuisineParsed,
          profile_image: r.profile_image ? `/${r.profile_image}` : '/uploads/defaults/restaurant-default.png',
          // Add categories array with menu_items_count for frontend compatibility
          categories: [],
          menu_items_count: parseInt(r.menu_items_count) || 0,
          categories_count: parseInt(r.categories_count) || 0
        };
      });

      return {
        restaurants: formattedRestaurants,
        total: formattedRestaurants.length
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Get All Orders
  async getAllOrders(options = {}) {
    try {
      const { status, restaurant_id, page = 1, limit = 50 } = options;

      // Ensure limit and offset are valid integers for safe interpolation
      const safeLimit = parseInt(limit, 10) || 50;
      const safePage = parseInt(page, 10) || 1;
      const safeOffset = (safePage - 1) * safeLimit;

      const pool = require('../db/db');

      let query = `
        SELECT 
          o.*,
          r.name as restaurant_name,
          u.email as user_email,
          u.phone as user_phone
        FROM orders o
        LEFT JOIN restaurants r ON o.restaurant_id = r.restaurant_id
        LEFT JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND o.status = ?';
        params.push(status);
      }

      if (restaurant_id) {
        query += ' AND o.restaurant_id = ?';
        params.push(restaurant_id);
      }

      query += ` ORDER BY o.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

      const [orders] = await pool.execute(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM orders o WHERE 1=1';
      const countParams = [];

      if (status) {
        countQuery += ' AND o.status = ?';
        countParams.push(status);
      }

      if (restaurant_id) {
        countQuery += ' AND o.restaurant_id = ?';
        countParams.push(restaurant_id);
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      // Parse items JSON
      const parsedOrders = orders.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      }));

      return {
        orders: parsedOrders,
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

  // Get Orders Grouped by Restaurant
  async getOrdersGroupedByRestaurant() {
    try {
      const pool = require('../db/db');

      const query = `
        SELECT 
          r.restaurant_id,
          r.name as restaurant_name,
          COUNT(o.order_id) as total_orders,
          SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as successful_orders,
          SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as canceled_orders,
          SUM(CASE WHEN o.status = 'delivered' THEN o.total_price ELSE 0 END) as total_revenue
        FROM restaurants r
        LEFT JOIN orders o ON r.restaurant_id = o.restaurant_id
        GROUP BY r.restaurant_id, r.name
        HAVING total_orders > 0
        ORDER BY total_orders DESC
      `;

      const [results] = await pool.execute(query);

      // Get cancelled by information for each restaurant
      const restaurantsWithDetails = await Promise.all(
        results.map(async (restaurant) => {
          const cancelQuery = `
            SELECT DISTINCT o.cancelled_by
            FROM orders o
            WHERE o.restaurant_id = ? AND o.status = 'cancelled' AND o.cancelled_by IS NOT NULL
          `;
          const [cancelledBy] = await pool.execute(cancelQuery, [restaurant.restaurant_id]);

          return {
            ...restaurant,
            cancelled_by: cancelledBy.map(row => row.cancelled_by)
          };
        })
      );

      return {
        message: 'Orders grouped by restaurant retrieved successfully',
        data: restaurantsWithDetails
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Get All Users
  async getAllUsers(options = {}) {
    try {
      const { page = 1, limit = 50, search } = options;

      // Ensure limit and offset are valid integers for safe interpolation
      const safeLimit = parseInt(limit, 10) || 50;
      const safePage = parseInt(page, 10) || 1;
      const safeOffset = (safePage - 1) * safeLimit;

      const pool = require('../db/db');

      let query = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      if (search) {
        query += ' AND (username LIKE ? OR email LIKE ? OR phone LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      query += ` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

      const [users] = await pool.execute(query, params);

      // Get order statistics for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const statsQuery = `
            SELECT 
              COUNT(*) as total_orders,
              SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as successful_orders,
              SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as canceled_orders,
              SUM(CASE WHEN status = 'delivered' THEN total_price ELSE 0 END) as total_spent
            FROM orders
            WHERE user_id = ?
          `;
          const [stats] = await pool.execute(statsQuery, [user.id]);

          const { password, ...userWithoutPassword } = user;

          return {
            ...userWithoutPassword,
            total_orders: stats[0].total_orders || 0,
            successful_orders: stats[0].successful_orders || 0,
            canceled_orders: stats[0].canceled_orders || 0,
            total_spent: parseFloat(stats[0].total_spent || 0)
          };
        })
      );

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const countParams = [];

      if (search) {
        countQuery += ' AND (username LIKE ? OR email LIKE ? OR phone LIKE ?)';
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      return {
        users: usersWithStats,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit)
        }
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Get User Details with Orders
  async getUserDetails(userId) {
    try {
      const pool = require('../db/db');

      // Get user info
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const { password, ...user } = users[0];

      // Get user's orders
      const [orders] = await pool.execute(
        `SELECT 
          o.*,
          r.name as restaurant_name,
          r.profile_image as restaurant_image
        FROM orders o
        LEFT JOIN restaurants r ON o.restaurant_id = r.restaurant_id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC`,
        [userId]
      );

      // Parse items JSON
      const parsedOrders = orders.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      }));

      // Get statistics
      const [stats] = await pool.execute(
        `SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as successful_orders,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as canceled_orders,
          SUM(CASE WHEN status = 'delivered' THEN total_price ELSE 0 END) as total_spent
        FROM orders
        WHERE user_id = ?`,
        [userId]
      );

      return {
        message: 'User details retrieved successfully',
        user: {
          ...user,
          total_orders: stats[0].total_orders || 0,
          successful_orders: stats[0].successful_orders || 0,
          canceled_orders: stats[0].canceled_orders || 0,
          total_spent: parseFloat(stats[0].total_spent || 0)
        },
        orders: parsedOrders
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Get Analytics Data
  async getAnalytics(options = {}) {
    try {
      const { restaurant_id, year } = options;
      const pool = require('../db/db');

      if (restaurant_id) {
        // Get analytics for specific restaurant
        return await this.getRevenueAnalytics(restaurant_id, year);
      }

      // Get overall analytics
      const query = `
        SELECT 
          r.restaurant_id,
          r.name as restaurant_name,
          COUNT(o.order_id) as total_orders,
          SUM(CASE WHEN o.status = 'delivered' THEN o.total_price ELSE 0 END) as total_revenue,
          AVG(CASE WHEN o.status = 'delivered' THEN o.total_price ELSE NULL END) as avg_order_value
        FROM restaurants r
        LEFT JOIN orders o ON r.restaurant_id = o.restaurant_id
        WHERE YEAR(o.created_at) = ?
        GROUP BY r.restaurant_id, r.name
        ORDER BY total_revenue DESC
      `;

      const [results] = await pool.execute(query, [year]);

      return {
        message: 'Analytics retrieved successfully',
        year,
        data: results
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Get Revenue Analytics
  async getRevenueAnalytics(restaurantId, year) {
    try {
      const pool = require('../db/db');

      const query = `
        SELECT 
          MONTH(created_at) as month,
          MONTHNAME(created_at) as month_name,
          SUM(CASE WHEN status = 'delivered' THEN total_price ELSE 0 END) as revenue,
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as successful_orders
        FROM orders
        WHERE restaurant_id = ? AND YEAR(created_at) = ?
        GROUP BY MONTH(created_at), MONTHNAME(created_at)
        ORDER BY MONTH(created_at)
      `;

      const [results] = await pool.execute(query, [restaurantId, year]);

      // Fill in missing months with zero values
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData = months.map((month, index) => {
        const existing = results.find(r => r.month === index + 1);
        return {
          month,
          revenue: existing ? parseFloat(existing.revenue) : 0,
          total_orders: existing ? existing.total_orders : 0,
          successful_orders: existing ? existing.successful_orders : 0
        };
      });

      return {
        message: 'Revenue analytics retrieved successfully',
        restaurant_id: restaurantId,
        year,
        data: monthlyData
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Get Menu Item Sales Analytics
  async getMenuItemSales(restaurantId, year) {
    try {
      const pool = require('../db/db');

      const query = `
        SELECT 
          MONTH(o.created_at) as month,
          MONTHNAME(o.created_at) as month_name,
          o.items
        FROM orders o
        WHERE o.restaurant_id = ? 
          AND YEAR(o.created_at) = ?
          AND o.status = 'delivered'
        ORDER BY MONTH(o.created_at)
      `;

      const [orders] = await pool.execute(query, [restaurantId, year]);

      // Process items to count sales by month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const itemSales = {};

      orders.forEach(order => {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        const monthIndex = order.month - 1;

        items.forEach(item => {
          if (!itemSales[item.name]) {
            itemSales[item.name] = months.map(() => 0);
          }
          itemSales[item.name][monthIndex] += item.quantity || 1;
        });
      });

      // Format data for charts
      const monthlyData = months.map((month, index) => {
        const data = { month };
        Object.keys(itemSales).forEach(itemName => {
          data[itemName] = itemSales[itemName][index];
        });
        return data;
      });

      return {
        message: 'Menu item sales retrieved successfully',
        restaurant_id: restaurantId,
        year,
        data: monthlyData,
        items: Object.keys(itemSales)
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

}

module.exports = new AdminService();