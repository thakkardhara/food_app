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

  // Get All Restaurants with Filters
async getAllRestaurants(filters) {
  try {
    let { status, page = 1, limit = 20, search } = filters;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit <= 0) limit = 20;

    const offset = (page - 1) * limit;

    const restaurants = await adminRepository.getAllRestaurants({
      status,
      limit,
      offset,
      search
    });

    const totalCount = await adminRepository.getRestaurantCount({
      status,
      search
    });

    return {
      message: 'Restaurants retrieved successfully',
      data: restaurants,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(totalCount / limit),
        total_count: totalCount,
        per_page: limit
      }
    };
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

  // Get Dashboard Statistics
  async getDashboardStats() {
    try {
      const stats = await adminRepository.getDashboardStats();
      return stats;
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
}

module.exports = new AdminService();