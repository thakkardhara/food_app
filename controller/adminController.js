

const adminService = require('../services/adminService');

class AdminController {
  // Admin Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await adminService.login(email, password);
      res.status(200).json(result);
    } catch (error) {
      console.error('Admin login error:', error.message);

      if (error.message === 'Email not found') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (error.message === 'Password is wrong') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (error.message === 'Account is inactive') {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      if (error.message.includes('Invalid') || error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get Admin Profile
  async getProfile(req, res) {
    try {
      const { admin_id } = req.admin;
      const admin = await adminService.getAdminProfile(admin_id);
      
      const { password, ...adminProfile } = admin;
      
      res.status(200).json({
        message: 'Profile retrieved successfully',
        admin: adminProfile
      });
    } catch (error) {
      console.error('Get admin profile error:', error.message);
      
      if (error.message === 'Admin not found') {
        return res.status(404).json({ error: 'Admin not found' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get All Restaurants
  async getAllRestaurants(req, res) {
    try {
      const { status, page = 1, limit = 20, search } = req.query;
      
      const result = await adminService.getAllRestaurants({
        status,
        page: parseInt(page),
        limit: parseInt(limit),
        search
      });
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Get all restaurants error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update Restaurant Status
  async updateRestaurantStatus(req, res) {
    try {
      const { restaurant_id } = req.params;
      const { status } = req.body;
      const { admin_id } = req.admin;
      
      const result = await adminService.updateRestaurantStatus(
        restaurant_id,
        status,
        admin_id
      );
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Update restaurant status error:', error.message);
      
      if (error.message === 'Restaurant not found') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Invalid status') || 
          error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get Restaurant Details
  async getRestaurantById(req, res) {
    try {
      const { restaurant_id } = req.params;
      const restaurant = await adminService.getRestaurantById(restaurant_id);
      
      res.status(200).json({
        message: 'Restaurant details retrieved successfully',
        restaurant
      });
    } catch (error) {
      console.error('Get restaurant by ID error:', error.message);
      
      if (error.message === 'Restaurant not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get Dashboard Statistics
  async getDashboardStats(req, res) {
    try {
      const stats = await adminService.getDashboardStats();
      
      res.status(200).json({
        message: 'Dashboard statistics retrieved successfully',
        stats
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Change Admin Password
  async changePassword(req, res) {
    try {
      const { old_password, new_password } = req.body;
      const { email } = req.admin;

      const result = await adminService.changePassword(
        email,
        old_password,
        new_password
      );
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Admin change password error:', error.message);

      if (error.message === 'Current password is incorrect') {
        return res.status(401).json({ error: error.message });
      }

      if (error.message === 'Admin not found') {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes('Invalid') || 
          error.message.includes('required') ||
          error.message.includes('must be')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete Restaurant
  async deleteRestaurant(req, res) {
    try {
      const { restaurant_id } = req.params;
      const { admin_id } = req.admin;
      
      const result = await adminService.deleteRestaurant(restaurant_id, admin_id);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Delete restaurant error:', error.message);
      
      if (error.message === 'Restaurant not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new AdminController();