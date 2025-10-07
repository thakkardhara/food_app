const restaurantRepository = require('../repository/restaurantRepository');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { deleteFile } = require('../configs/multerConfig');
class RestaurantService {
  generateRestaurantId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = crypto.randomBytes(2).toString('hex');
    return `r${timestamp}${random}`;
  }

  generateJWTToken(restaurantData) {
    const payload = {
      restaurant_id: restaurantData.restaurant_id,
      email: restaurantData.email,
      name: restaurantData.name,
      status: restaurantData.status
    };

    return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: process.env.API_TOKEN_EXPIRESIN || '8h'
    });
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhone(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  }

  validatePassword(password) {
    return password && password.length >= 6;
  }

  validateLocation(location) {
    return location && 
           typeof location.latitude === 'number' && 
           typeof location.longitude === 'number' &&
           location.latitude >= -90 && location.latitude <= 90 &&
           location.longitude >= -180 && location.longitude <= 180;
  }

async registerRestaurantByAdmin(restaurantData) {
    try {
      const { name, email, phone, location, cuisine, menu, password, profile_image } = restaurantData;

      // Validation
      if (!name || !email || !phone || !password) {
        throw new Error('Name, email, phone, and password are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (!this.validatePhone(phone)) {
        throw new Error('Phone must be 10 digits');
      }

      if (!this.validatePassword(password)) {
        throw new Error('Password must be at least 6 characters');
      }

      if (location && !this.validateLocation(location)) {
        throw new Error('Invalid location coordinates');
      }

      // Check if email already exists
      const existingRestaurant = await restaurantRepository.findByEmail(email);
      if (existingRestaurant) {
        throw new Error('Email already exists');
      }

      // Generate restaurant ID
      const restaurant_id = this.generateRestaurantId();

      // Set profile image or use default
      const finalProfileImage = profile_image || getDefaultImage();

      // Prepare data for storage
      const dataToStore = {
        restaurant_id,
        name,
        email,
        phone,
        password,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        cuisine: cuisine || [],
        menu: menu || [],
        profile_image: finalProfileImage,
        status: 'active',
        created_by: 'admin'
      };

      await restaurantRepository.create(dataToStore);

      return {
        restaurant_id,
        status: 'active',
        message: 'Restaurant registered successfully',
        profile_image: `/${finalProfileImage}`,
        Email: email,
        Pass: password
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async registerRestaurant(restaurantData) {
    try {
      const { name, email, phone, location, cuisine, menu, password, profile_image } = restaurantData;

      // Validation
      if (!name || !email || !phone || !password) {
        throw new Error('Name, email, phone, and password are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      if (!this.validatePhone(phone)) {
        throw new Error('Phone must be 10 digits');
      }

      if (!this.validatePassword(password)) {
        throw new Error('Password must be at least 6 characters');
      }

      let parsedLocation = location;
    if (typeof location === "string") {
      try {
        parsedLocation = JSON.parse(location);
      } catch {
        throw new Error("Invalid location format");
      }
    }
    if (parsedLocation && !this.validateLocation(parsedLocation)) {
      throw new Error("Invalid location coordinates");
    }

      // Check if email already exists
      const existingRestaurant = await restaurantRepository.findByEmail(email);
      if (existingRestaurant) {
        throw new Error('Email already exists');
      }

      // Generate restaurant ID
      const restaurant_id = this.generateRestaurantId();

      // Set profile image or use default
      const finalProfileImage = profile_image || getDefaultImage();

      // Prepare data for storage
      const dataToStore = {
        restaurant_id,
        name,
        email,
        phone,
        password,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        cuisine: cuisine || [],
        menu: menu || [],
        profile_image: finalProfileImage,
        status: 'pending',
        created_by: 'self'
      };

      await restaurantRepository.create(dataToStore);

      return {
        restaurant_id,
        status: 'pending_review',
        message: 'Registration submitted. Waiting for admin approval.',
        profile_image: `/${finalProfileImage}`
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }


  async updateAllRestaurantFields(restaurantId, updateData) {
  try {
    // Check if restaurant exists
    const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // If there's a new image and old one exists (not default)
    if (updateData.profile_image && restaurant.profile_image && 
        !restaurant.profile_image.includes('default')) {
      await deleteFile(restaurant.profile_image);
    }

    const allowedUpdates = {};
    
    // 1. Name validation
    if (updateData.name !== undefined) {
      if (!updateData.name || updateData.name.trim() === '') {
        throw new Error('Name cannot be empty');
      }
      allowedUpdates.name = updateData.name.trim();
    }

    // 2. Email validation
    if (updateData.email !== undefined) {
      if (!this.validateEmail(updateData.email)) {
        throw new Error('Invalid email format');
      }
      
      const existingRestaurant = await restaurantRepository.findByEmail(updateData.email);
      if (existingRestaurant && existingRestaurant.restaurant_id !== restaurantId) {
        throw new Error('Email already exists');
      }
      
      allowedUpdates.email = updateData.email.toLowerCase();
    }

    // 3. Phone validation
    if (updateData.phone !== undefined) {
      if (!this.validatePhone(updateData.phone)) {
        throw new Error('Phone must be 10 digits');
      }
      allowedUpdates.phone = updateData.phone;
    }

    // 4. Location validation
    if (updateData.location !== undefined) {
      let parsedLocation = updateData.location;
      
      if (typeof updateData.location === 'string') {
        try {
          parsedLocation = JSON.parse(updateData.location);
        } catch {
          throw new Error('Invalid location format');
        }
      }
      
      if (parsedLocation && !this.validateLocation(parsedLocation)) {
        throw new Error('Invalid location coordinates');
      }
      
      allowedUpdates.latitude = parsedLocation?.latitude || null;
      allowedUpdates.longitude = parsedLocation?.longitude || null;
    }

    // 5. Address
    if (updateData.address !== undefined) {
      allowedUpdates.address = updateData.address ? updateData.address.trim() : null;
    }

    // 6. Description
    if (updateData.description !== undefined) {
      allowedUpdates.description = updateData.description ? updateData.description.trim() : null;
    }

    // 7. Cuisine validation
    if (updateData.cuisine !== undefined) {
      let parsedCuisine = updateData.cuisine;
      
      if (typeof updateData.cuisine === 'string') {
        try {
          parsedCuisine = JSON.parse(updateData.cuisine);
        } catch {
          throw new Error('Invalid cuisine format');
        }
      }
      
      if (!Array.isArray(parsedCuisine)) {
        throw new Error('Cuisine must be an array');
      }
      
      allowedUpdates.cuisine = parsedCuisine;
    }

    // 8. Menu validation
    if (updateData.menu !== undefined) {
      let parsedMenu = updateData.menu;
      
      if (typeof updateData.menu === 'string') {
        try {
          parsedMenu = JSON.parse(updateData.menu);
        } catch {
          throw new Error('Invalid menu format');
        }
      }
      
      if (!Array.isArray(parsedMenu)) {
        throw new Error('Menu must be an array');
      }
      
      allowedUpdates.menu = parsedMenu;
    }

    // 9. Profile image
    if (updateData.profile_image !== undefined) {
      allowedUpdates.profile_image = updateData.profile_image;
    }

    // Check if there are any fields to update
    if (Object.keys(allowedUpdates).length === 0) {
      throw new Error('No fields to update');
    }

    // Call repository to update in database
    await restaurantRepository.updateAllFields(restaurantId, allowedUpdates);

    // Fetch updated restaurant data from repository
    const updatedRestaurant = await restaurantRepository.findByRestaurantId(restaurantId);

    return {
      message: 'Restaurant updated successfully',
      updated_fields: Object.keys(allowedUpdates),
      restaurant: {
        restaurant_id: updatedRestaurant.restaurant_id,
        name: updatedRestaurant.name,
        email: updatedRestaurant.email,
        phone: updatedRestaurant.phone,
        address: updatedRestaurant.address,
        description: updatedRestaurant.description,
        location: {
          latitude: updatedRestaurant.latitude,
          longitude: updatedRestaurant.longitude
        },
        cuisine: typeof updatedRestaurant.cuisine === 'string' 
          ? JSON.parse(updatedRestaurant.cuisine) 
          : updatedRestaurant.cuisine,
        menu: typeof updatedRestaurant.menu === 'string' 
          ? JSON.parse(updatedRestaurant.menu) 
          : updatedRestaurant.menu,
        profile_image: updatedRestaurant.profile_image 
          ? `/${updatedRestaurant.profile_image}` 
          : '/uploads/defaults/restaurant-default.png',
        status: updatedRestaurant.status
      }
    };

  } catch (error) {
    throw new Error(error.message);
  }
}


async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!this.validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Find restaurant by email
      const restaurant = await restaurantRepository.findByEmail(email);
      if (!restaurant) {
        throw new Error('Email not found');
      }

      // Verify password
      const isPasswordValid = await restaurantRepository.verifyPassword(password, restaurant.password);
      if (!isPasswordValid) {
        throw new Error('Password is wrong');
      }

      // Check restaurant status
      if (restaurant.status === 'pending_review' || restaurant.status === 'pending') {
        throw new Error('Account pending approval');
      }

      if (restaurant.status === 'disabled' || restaurant.status === 'inactive') {
        throw new Error('Account disabled. Contact support');
      }

      // Generate JWT token
      const token = this.generateJWTToken(restaurant);

      return {
        restaurant_id: restaurant.restaurant_id,
        token,
        message: 'Login successful',
        profile_image: restaurant.profile_image ? `/${restaurant.profile_image}` : '/uploads/defaults/restaurant-default.png'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async changePassword(email, oldPassword, newPassword) {
    try {
      if (!email || !oldPassword || !newPassword) {
        throw new Error('Email, old password, and new password are required');
      }

      if (!this.validatePassword(newPassword)) {
        throw new Error('New password must be at least 6 characters');
      }

      // Find restaurant by email
      const restaurant = await restaurantRepository.findByEmail(email);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Verify old password
      const isOldPasswordValid = await restaurantRepository.verifyPassword(oldPassword, restaurant.password);
      if (!isOldPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      await restaurantRepository.updatePassword(email, newPassword);

      return {
        message: 'Password updated successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

async getAllRestaurants() {
  try {
    const restaurants = await restaurantRepository.getAllRestaurants();
    return restaurants;
  } catch (error) {
    throw new Error(error.message);
  }
}



  async getRestaurantByToken(restaurantId) {
    try {
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }
      return restaurant;
    } catch (error) {
      throw new Error(error.message);
    }
  }




  async updateProfileImage(restaurantId, file) {
    try {
      // Check if restaurant exists
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Delete old image if exists (and not default)
      if (restaurant.profile_image && !restaurant.profile_image.includes('default')) {
        await deleteFile(restaurant.profile_image);
      }

      // Store new image path
      const imagePath = file.path.replace(/\\/g, '/');
      
      await restaurantRepository.updateProfileImage(restaurantId, imagePath);

      return {
        message: 'Profile image updated successfully',
        image_url: `/${imagePath}`
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteProfileImage(restaurantId) {
    try {
      // Check if restaurant exists
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // Delete current image if exists and not default
      if (restaurant.profile_image && !restaurant.profile_image.includes('default')) {
        await deleteFile(restaurant.profile_image);
      }

      // Set to default image
      const defaultImage = getDefaultImage();
      await restaurantRepository.updateProfileImage(restaurantId, defaultImage);

      return {
        message: 'Profile image reset to default',
        image_url: `/${defaultImage}`
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateRestaurantProfile(restaurantId, updateData) {
    try {
      // Check if restaurant exists
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      // If there's an old image and a new one is being uploaded
      if (updateData.profile_image && restaurant.profile_image && !restaurant.profile_image.includes('default')) {
        await deleteFile(restaurant.profile_image);
      }

      const allowedUpdates = {};
      
      // Validate and prepare updates
      if (updateData.name) {
        allowedUpdates.name = updateData.name.trim();
      }

      if (updateData.phone) {
        if (!this.validatePhone(updateData.phone)) {
          throw new Error('Phone must be 10 digits');
        }
        allowedUpdates.phone = updateData.phone;
      }

      if (updateData.email) {
        if (!this.validateEmail(updateData.email)) {
          throw new Error('Invalid email format');
        }
        
        const existingRestaurant = await restaurantRepository.findByEmail(updateData.email);
        if (existingRestaurant && existingRestaurant.restaurant_id !== restaurantId) {
          throw new Error('Email already exists');
        }
        
        allowedUpdates.email = updateData.email;
      }

      if (updateData.location) {
        if (!this.validateLocation(updateData.location)) {
          throw new Error('Invalid location coordinates');
        }
        allowedUpdates.latitude = updateData.location.latitude;
        allowedUpdates.longitude = updateData.location.longitude;
      }

      if (updateData.cuisine) {
        allowedUpdates.cuisine = updateData.cuisine;
      }

      if (updateData.profile_image) {
        allowedUpdates.profile_image = updateData.profile_image;
      }

      if (updateData.address) {
        allowedUpdates.address = updateData.address;
      }

      if (updateData.description) {
        allowedUpdates.description = updateData.description;
      }

      await restaurantRepository.updateProfile(restaurantId, allowedUpdates);

      return {
        message: 'Profile updated successfully',
        updated_fields: Object.keys(allowedUpdates)
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }


  // * Update restaurant settings

  async updateSettings(restaurantId, settings) {
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

      // Ensure at least one service is enabled if restaurant is online
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
        message: 'Settings updated successfully',
        settings: updatedSettings
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Toggle online/offline status
   */
  async toggleOnlineStatus(restaurantId, isOnline) {
    try {
      // Validate restaurant exists
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      if (restaurant.status !== 'active') {
        throw new Error('Only active restaurants can be set online');
      }

      // If going online, check if at least one service is enabled
      if (isOnline) {
        const settings = await restaurantRepository.getSettings(restaurantId);
        if (!settings.delivery_enabled && !settings.takeaway_enabled) {
          throw new Error('Please enable at least one service (delivery or takeaway) before going online');
        }
      }

      await restaurantRepository.toggleOnlineStatus(restaurantId, isOnline);

      return {
        message: `Restaurant is now ${isOnline ? 'online' : 'offline'}`,
        is_online: isOnline
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Get restaurant settings
   */
  async getSettings(restaurantId) {
    try {
      const settings = await restaurantRepository.getSettings(restaurantId);
      
      if (!settings) {
        throw new Error('Restaurant not found');
      }

      return settings;

    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Toggle individual service (delivery or takeaway)
   */
  async toggleService(restaurantId, serviceType, enabled) {
    try {
      const restaurant = await restaurantRepository.findByRestaurantId(restaurantId);
      if (!restaurant) {
        throw new Error('Restaurant not found');
      }

      const validServices = ['delivery', 'takeaway'];
      if (!validServices.includes(serviceType)) {
        throw new Error('Invalid service type. Must be "delivery" or "takeaway"');
      }

      const settingKey = `${serviceType}_enabled`;
      const settings = { [settingKey]: enabled };

      // If disabling a service and restaurant is online, ensure other service is enabled
      if (!enabled && restaurant.is_online) {
        const currentSettings = await restaurantRepository.getSettings(restaurantId);
        const otherService = serviceType === 'delivery' ? 'takeaway_enabled' : 'delivery_enabled';
        
        if (!currentSettings[otherService]) {
          throw new Error(`Cannot disable ${serviceType}. At least one service must be enabled when restaurant is online`);
        }
      }

      await restaurantRepository.updateSettings(restaurantId, settings);

      return {
        message: `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} service ${enabled ? 'enabled' : 'disabled'}`,
        [settingKey]: enabled
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new RestaurantService();