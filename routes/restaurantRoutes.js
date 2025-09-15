const express = require('express');
const router = express.Router();
const restaurantController = require('../controller/restaurantController');
const { authenticateToken, activeRestaurantOnly } = require('../middlewares/authMiddleware');



router.post('/register/admin', restaurantController.registerByAdmin);


router.post('/register', restaurantController.register);


router.post('/login', restaurantController.login);


router.patch('/change-password', authenticateToken, restaurantController.changePassword);



router.get('/profile', authenticateToken, restaurantController.getProfile);


router.get('/dashboard', authenticateToken, activeRestaurantOnly, (req, res) => {
  res.json({
    message: 'Welcome to restaurant dashboard',
    restaurant: req.restaurant
  });
});


router.use((error, req, res, next) => {
  console.error('Restaurant route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});


module.exports = router;