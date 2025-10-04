const restaurantService = require("../services/restaurantService");
const { deleteFile } = require('../configs/multerConfig');

class RestaurantController {
  async registerByAdmin(req, res) {
    try {
      // Prepare restaurant data with image file if uploaded
      const restaurantData = {
        ...req.body,
        profile_image: req.file ? req.file.path.replace(/\\/g, '/') : null
      };

      const result = await restaurantService.registerRestaurantByAdmin(restaurantData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Admin registration error:', error.message);
      
      // Clean up uploaded file on error
      if (req.file) {
        await deleteFile(req.file.path);
      }
      
      if (error.message.includes('already exists') || 
          error.message.includes('Invalid') || 
          error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

async register(req, res) {
    try {
      // Prepare restaurant data with image file if uploaded
      const restaurantData = {
        ...req.body,
        profile_image: req.file ? req.file.path.replace(/\\/g, '/') : null
      };

      const result = await restaurantService.registerRestaurant(restaurantData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Self registration error:', error.message);
      
      // Clean up uploaded file on error
      if (req.file) {
        await deleteFile(req.file.path);
      }
      
      if (error.message.includes('already exists') || 
          error.message.includes('Invalid') || 
          error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }


  async updateAllFields(req, res) {
  try {
    const { restaurant_id } = req.restaurant;
    const updateData = req.body;
    
    // Handle image if uploaded
    if (req.file) {
      updateData.profile_image = req.file.path.replace(/\\/g, '/');
    }
    
    const result = await restaurantService.updateAllRestaurantFields(
      restaurant_id,
      updateData
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Update all fields error:', error.message);
    
    // Clean up uploaded file on error
    if (req.file) {
      await deleteFile(req.file.path);
    }
    
    if (error.message === 'Restaurant not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message === 'No fields to update') {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message.includes('Invalid') || 
        error.message.includes('already exists') ||
        error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
}

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await restaurantService.login(email, password);
      res.status(200).json(result);
    } catch (error) {
      console.error("Login error:", error.message);

      // Different error messages for email and password
      if (error.message === "Email not found") {
        return res.status(401).json({ error: "Email not found" });
      }

      if (error.message === "Password is wrong") {
        return res.status(401).json({ error: "Password is wrong" });
      }

      if (error.message === "Account pending approval") {
        return res.status(403).json({ error: "Account pending approval" });
      }

      if (error.message === "Account disabled. Contact support") {
        return res
          .status(403)
          .json({ error: "Account disabled. Contact support" });
      }

      if (
        error.message.includes("Invalid") ||
        error.message.includes("required")
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }
  async changePassword(req, res) {
    try {
      const { old_password, new_password } = req.body;
      const { email } = req.restaurant; // From auth middleware

      const result = await restaurantService.changePassword(
        email,
        old_password,
        new_password
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Change password error:", error.message);

      if (error.message === "Current password is incorrect") {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      if (error.message === "Restaurant not found") {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      if (
        error.message.includes("Invalid") ||
        error.message.includes("required") ||
        error.message.includes("must be")
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Optional: Get restaurant profile (protected route)
async getProfile(req, res) {
    try {
      const { restaurant_id } = req.restaurant;
      const restaurant = await restaurantService.getRestaurantByToken(restaurant_id);
      
      const { password, ...restaurantProfile } = restaurant;
      
      res.status(200).json({
        message: 'Profile retrieved successfully',
        restaurant: {
          ...restaurantProfile,
          cuisine: typeof restaurantProfile.cuisine === 'string' 
            ? JSON.parse(restaurantProfile.cuisine) 
            : restaurantProfile.cuisine,
          menu: typeof restaurantProfile.menu === 'string' 
            ? JSON.parse(restaurantProfile.menu) 
            : restaurantProfile.menu,
          profile_image: restaurantProfile.profile_image 
            ? `/${restaurantProfile.profile_image}` 
            : '/uploads/defaults/restaurant-default.png'
        }
      });
    } catch (error) {
      console.error('Get profile error:', error.message);
      
      if (error.message === 'Restaurant not found') {
        return res.status(404).json({ error: 'Restaurant not found' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }


  // async allRestaurants(res, req) {
  //   const getAllRestaurant = await restaurantService.getAllRestaurants();
  // }
async allRestaurants(req, res) {
  try {
    const restaurants = await restaurantService.getAllRestaurants();
    res.status(200).json({
      message: 'Restaurants fetched successfully',
      data: restaurants
    });
  } catch (error) {
    console.error('Get all restaurants error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

  async updateProfileImage(req, res) {
    try {
      const { restaurant_id } = req.restaurant;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      const result = await restaurantService.updateProfileImage(
        restaurant_id, 
        req.file
      );
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Update profile image error:', error.message);
      
      if (req.file) {
        await deleteFile(req.file.path);
      }
      
      if (error.message === 'Restaurant not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete profile image
  async deleteProfileImage(req, res) {
    try {
      const { restaurant_id } = req.restaurant;
      
      const result = await restaurantService.deleteProfileImage(restaurant_id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Delete profile image error:', error.message);
      
      if (error.message === 'Restaurant not found') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update profile fields
  async updateProfile(req, res) {
    try {
      const { restaurant_id } = req.restaurant;
      const updateData = req.body;
      
      // Handle image separately if included
      if (req.file) {
        updateData.profile_image = req.file.path.replace(/\\/g, '/');
      }
      
      const result = await restaurantService.updateRestaurantProfile(
        restaurant_id,
        updateData
      );
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Update profile error:', error.message);
      
      if (req.file) {
        await deleteFile(req.file.path);
      }
      
      if (error.message === 'Restaurant not found') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('Invalid') || 
          error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }



}

module.exports = new RestaurantController();
