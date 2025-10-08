const express = require("express");
const router = express.Router();
const categoryController = require("../controller/categoryController");
// No authentication required for public menu routes

// Public route (no token, no activeRestaurantOnly)
router.get("/:restaurant_id", categoryController.getFullMenu); // Public route

// All category/menu routes are public (no authentication required)
// Get categories list without items
router.get("/:restaurant_id/categories", categoryController.getCategories); // done

// 2.1 Add Category
router.post("/:restaurant_id/category", categoryController.addCategory); // done

// 2.2 Update Category
router.patch(
  "/:restaurant_id/category/:category_id",
  categoryController.updateCategory
); // done

// 2.3 Delete Category
router.delete(
  "/:restaurant_id/category/:category_id",
  categoryController.deleteCategory
);

// Get single category with items
router.get(
  "/:restaurant_id/category/:category_id",
  categoryController.getCategoryWithItems
);

// 2.4 Add Item to Category
router.post(
  "/:restaurant_id/category/:category_id/item",
  categoryController.addItem
); // done

// 2.5 Update Item
router.patch(
  "/:restaurant_id/category/:category_id/item/:item_id",
  categoryController.updateItem
); // done

// 2.6 Delete Item
router.delete(
  "/:restaurant_id/category/:category_id/item/:item_id",
  categoryController.deleteItem
); // done

// 2.8 Bulk Menu Update (Replace entire menu)
router.put("/:restaurant_id", categoryController.bulkUpdateMenu); // done

// Error handler for menu routes
router.use((error, req, res, next) => {
  console.error("Menu route error:", error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
