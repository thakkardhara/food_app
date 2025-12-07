const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const { authenticateAdmin } = require('../middlewares/authMiddleware');

// Public routes
router.post('/login', adminController.login);

// Protected routes (require admin authentication)
router.use(authenticateAdmin); // All routes below require admin token

// Admin profile
router.get('/profile', adminController.getProfile);
router.patch('/change-password', adminController.changePassword);

// Restaurant management
router.get('/restaurants', adminController.getAllRestaurants);
router.get('/restaurants/:restaurant_id', adminController.getRestaurantById);
router.patch('/restaurants/:restaurant_id/status', adminController.updateRestaurantStatus);
router.delete('/restaurants/:restaurant_id', adminController.deleteRestaurant);

// NEW: Restaurant settings management by admin
router.patch('/restaurants/:restaurant_id/settings', adminController.updateRestaurantSettings);
router.patch('/restaurants/:restaurant_id/force-offline', adminController.forceRestaurantOffline);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Orders management
router.get('/orders', adminController.getAllOrders);
router.get('/orders/by-restaurant', adminController.getOrdersByRestaurant);

// Users management
router.get('/users', adminController.getAllUsers);
router.get('/users/:user_id', adminController.getUserDetails);

// Analytics
router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/menu-sales', adminController.getMenuItemSales);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Admin route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;