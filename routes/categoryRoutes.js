const express = require('express');
const router = express.Router();
const categoryController = require('../controller/categoryController');
const { authenticateToken, activeRestaurantOnly } = require('../middlewares/authMiddleware');

// All menu routes require authentication
router.use(authenticateToken);

// 2.7 Get Full Menu (Public - doesn't require active status)
router.get('/:restaurant_id', categoryController.getFullMenu);

// Get categories list without items
router.get('/:restaurant_id/categories', categoryController.getCategories);

// All modification routes require active restaurant status
router.use(activeRestaurantOnly);

// 2.1 Add Category
router.post('/:restaurant_id/category', categoryController.addCategory);

// 2.2 Update Category
router.patch('/:restaurant_id/category/:category_id', categoryController.updateCategory);

// 2.3 Delete Category
router.delete('/:restaurant_id/category/:category_id', categoryController.deleteCategory);

// Get single category with items
router.get('/:restaurant_id/category/:category_id', categoryController.getCategoryWithItems);

// 2.4 Add Item to Category
router.post('/:restaurant_id/category/:category_id/item', categoryController.addItem);

// 2.5 Update Item
router.patch('/:restaurant_id/category/:category_id/item/:item_id', categoryController.updateItem);

// 2.6 Delete Item
router.delete('/:restaurant_id/category/:category_id/item/:item_id', categoryController.deleteItem);

// 2.8 Bulk Menu Update (Replace entire menu)
router.put('/:restaurant_id', categoryController.bulkUpdateMenu);

// Error handler for menu routes
router.use((error, req, res, next) => {
  console.error('Menu route error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;