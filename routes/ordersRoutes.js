const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');
const { authenticateToken, activeRestaurantOnly } = require('../middlewares/authMiddleware');

/* ============================
   USER ENDPOINTS (Public/User)
   ============================ */

// 1. Place Order (user places order)
router.post('/add', orderController.placeOrder);

// 2. Get Order by ID (user checks single order)
router.get('/:order_id', orderController.getOrderById);

// 3. Get Orders by User (user sees all their orders)
router.get('/user/:user_id', orderController.getOrdersByUser);

// 4. Cancel Order (user can cancel their own orders)
router.post('/:order_id/cancel', orderController.cancelOrder);

// 5. Submit Pickup Details (user submits when ready for collection)
router.post('/:order_id/pickup-details', orderController.submitPickupDetails);

// 6. Get Order Timer State (user gets timer data for an order)
router.get('/:order_id/timer', orderController.getOrderTimer);

// 7. Get Order with Timer Data (user gets full order with timer)
router.get('/:order_id/with-timer', orderController.getOrderWithTimer);

// 8. Update Delivery Distance Data (sent when order is placed)
router.post('/:order_id/delivery-distance', orderController.updateDeliveryDistance);


/* ===============================
   RESTAURANT ENDPOINTS (Restricted)
   =============================== */

// Require authentication for all restaurant routes
router.use(authenticateToken);

// 5. Update Order Status (restaurant only)
router.patch('/:order_id/status', orderController.updateOrderStatus);

// 6. Get Orders by Restaurant (no param, use token restaurant_id)
router.get('/restaurant/orders', activeRestaurantOnly, orderController.getOrdersByRestaurant);

// 7. Get Order Statistics (restaurant analytics)
router.get('/restaurant/:restaurant_id/stats', activeRestaurantOnly, orderController.getOrderStats);

// 8. Get Active Orders (real-time tracking for restaurant)
router.get('/restaurant/:restaurant_id/active', activeRestaurantOnly, orderController.getActiveOrders);

// 9. Get Pickup Details (restaurant views customer pickup info)
router.get('/:order_id/pickup-details', orderController.getPickupDetails);


/* ===============================
   ERROR HANDLER
   =============================== */
router.use((error, req, res, next) => {
   console.error('Order route error:', error);

   if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON in request body' });
   }

   res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;
