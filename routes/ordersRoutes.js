const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');
const { authenticateToken, activeRestaurantOnly } = require('../middlewares/authMiddleware');

// Public endpoints (user endpoints - might need different auth)
// 1. Place Order
router.post('/add', orderController.placeOrder);

// 2. Get Order by ID
router.get('/:order_id', orderController.getOrderById);

// 4. Get Orders by User
router.get('/user/:user_id', orderController.getOrdersByUser);

// Protected endpoints (restaurant management)
// 3. Update Order Status
router.patch('/:order_id/status', authenticateToken, orderController.updateOrderStatus);

// Restaurant specific endpoints
router.use(authenticateToken); // All routes below require authentication

// 5. Get Orders by Restaurant
router.get('/restaurant/:restaurant_id', activeRestaurantOnly, orderController.getOrdersByRestaurant);

// 6. Cancel Order
router.post('/:order_id/cancel', orderController.cancelOrder);

// 7. Get Order Statistics
router.get('/restaurant/:restaurant_id/stats', activeRestaurantOnly, orderController.getOrderStats);

// 8. Get Active Orders (for real-time tracking)
router.get('/restaurant/:restaurant_id/active', activeRestaurantOnly, orderController.getActiveOrders);

// Error handler for order routes
router.use((error, req, res, next) => {
  console.error('Order route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;