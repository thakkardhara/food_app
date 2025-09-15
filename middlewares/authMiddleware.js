const jwt = require('jsonwebtoken');
const restaurantService = require('../services/restaurantService');

class AuthMiddleware {
  async authenticateToken(req, res, next) {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ error: 'Access token required' });
      }

      // Extract token (format: "Bearer TOKEN")
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
      }

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired' });
        }
        if (jwtError.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token' });
        }
        throw jwtError;
      }

      // Validate token payload
      if (!decoded.restaurant_id || !decoded.email) {
        return res.status(401).json({ error: 'Invalid token payload' });
      }

      // Verify restaurant exists and is active
      const restaurant = await restaurantService.getRestaurantByToken(decoded.restaurant_id);
      
      if (!restaurant) {
        return res.status(401).json({ error: 'Restaurant not found' });
      }

      if (restaurant.status === 'disabled') {
        return res.status(403).json({ error: 'Account disabled. Contact support' });
      }

      if (restaurant.status === 'pending_review') {
        return res.status(403).json({ error: 'Account pending approval' });
      }

      // Add restaurant info to request object
      req.restaurant = {
        restaurant_id: decoded.restaurant_id,
        email: decoded.email,
        name: decoded.name,
        status: decoded.status
      };

      next();

    } catch (error) {
      console.error('Authentication error:', error.message);
      
      if (error.message === 'Restaurant not found') {
        return res.status(401).json({ error: 'Restaurant not found' });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Optional: Admin only middleware (if needed)
  async adminOnly(req, res, next) {
    try {
      // This middleware should be used after authenticateToken
      if (!req.restaurant) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if restaurant was created by admin (you can add admin role field to DB)
      const restaurant = await restaurantService.getRestaurantByToken(req.restaurant.restaurant_id);
      
      if (restaurant.created_by !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      next();

    } catch (error) {
      console.error('Admin check error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Optional: Active status only middleware
  async activeRestaurantOnly(req, res, next) {
    try {
      if (!req.restaurant) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.restaurant.status !== 'active') {
        return res.status(403).json({ 
          error: req.restaurant.status === 'pending_review' 
            ? 'Account pending approval' 
            : 'Account not active' 
        });
      }

      next();

    } catch (error) {
      console.error('Active status check error:', error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

const authMiddleware = new AuthMiddleware();

module.exports = {
  authenticateToken: authMiddleware.authenticateToken.bind(authMiddleware),
  adminOnly: authMiddleware.adminOnly.bind(authMiddleware),
  activeRestaurantOnly: authMiddleware.activeRestaurantOnly.bind(authMiddleware)
};