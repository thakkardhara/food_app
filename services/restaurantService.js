const restaurantRepository = require('../repository/restaurantRepository');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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
      const { name, email, phone, location, cuisine, menu, password } = restaurantData;

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
        status: 'active',
        created_by: 'admin'
      };

      await restaurantRepository.create(dataToStore);

      return {
        restaurant_id,
        status: 'active',
        message: 'Restaurant registered successfully',
        Email: email,
        Pass: password
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async registerRestaurant(restaurantData) {
    try {
      const { name, email, phone, location, cuisine, menu, password } = restaurantData;

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
        status: 'pending',
        created_by: 'self'
      };

      await restaurantRepository.create(dataToStore);

      return {
        restaurant_id,
        status: 'pending_review',
        message: 'Registration submitted. Waiting for admin approval.'
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

    // Verify password (only check if email exists)
    const isPasswordValid = await restaurantRepository.verifyPassword(password, restaurant.password);
    if (!isPasswordValid) {
      throw new Error('Password is wrong');
    }
    // Check restaurant status
    if (restaurant.status === 'pending') {
      throw new Error('Account pending approval');
    }

    if (restaurant.status === 'inactive') {
      throw new Error('Account disabled. Contact support');
    }

    // Generate JWT token
    const token = this.generateJWTToken(restaurant);

    return {
      restaurant_id: restaurant.restaurant_id,
      token,
      message: 'Login successful'
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
}

module.exports = new RestaurantService();