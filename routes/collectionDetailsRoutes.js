const express = require('express');
const router = express.Router();
const collectionDetailsController = require('../controller/collectionDetailsController');
const { authenticateToken, activeRestaurantOnly } = require('../middlewares/authMiddleware');

/* ============================
   USER/PUBLIC ENDPOINTS
   ============================ */

// 1. Create collection details for an order (when user arrives at restaurant)
router.post('/add', collectionDetailsController.createCollectionDetails);

// 2. Get collection details by order_id
router.get('/:order_id', collectionDetailsController.getCollectionDetailsByOrderId);

// 3. Update collection details by order_id
router.put('/:order_id', collectionDetailsController.updateCollectionDetails);

// 4. Delete collection details by order_id
router.delete('/:order_id', collectionDetailsController.deleteCollectionDetails);


/* ===============================
   RESTAURANT ENDPOINTS (Restricted)
   =============================== */

// Require authentication for restaurant routes
router.use(authenticateToken);

// 5. Get all collection details for a restaurant
router.get('/restaurant/all', activeRestaurantOnly, collectionDetailsController.getCollectionDetailsByRestaurant);


/* ===============================
   ERROR HANDLER
   =============================== */
router.use((error, req, res, next) => {
  console.error('Collection details route error:', error);

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;
