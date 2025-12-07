// routes/categoryRoutes.js
const express = require("express");
const router = express.Router();
const categoryController = require("../controller/categoryController");
const {
  menuUpload,
  handleMenuUploadError,
} = require("../configs/menuMulterConfig");

// ========== PUBLIC ROUTES (No authentication) ==========

// Get full menu with categories and items
router.get("/:restaurant_id", categoryController.getFullMenu);

// Get categories list without items
router.get("/:restaurant_id/categories", categoryController.getCategories);

// Get single category with items
router.get(
  "/:restaurant_id/category/:category_id",
  categoryController.getCategoryWithItems
);

// ========== CATEGORY MANAGEMENT (PUBLIC) ==========

// Add Category
router.post("/:restaurant_id/category", categoryController.addCategory);

// Update Category
router.patch(
  "/:restaurant_id/category/:category_id",
  categoryController.updateCategory
);

// Delete Category
router.delete(
  "/:restaurant_id/category/:category_id",
  categoryController.deleteCategory
);

// ========== ITEM MANAGEMENT WITH IMAGE UPLOAD (PUBLIC) ==========

// Add Item to Category (WITH IMAGE)
router.post(
  "/:restaurant_id/category/:category_id/item",
  menuUpload.single("photo"),
  handleMenuUploadError,
  categoryController.addItem
);

// Update Item (WITH IMAGE)
router.patch(
  "/:restaurant_id/category/:category_id/item/:item_id",
  menuUpload.single("photo"),
  handleMenuUploadError,
  categoryController.updateItem
);

// Also accept PUT for update (some clients/tools send PUT instead of PATCH)
router.put(
  "/:restaurant_id/category/:category_id/item/:item_id",
  menuUpload.single("photo"),
  handleMenuUploadError,
  categoryController.updateItem
);

// Update Item Availability (PATCH - only availability)
router.patch(
  "/:restaurant_id/category/:category_id/item/:item_id/availability",
  categoryController.updateItemAvailability
);

// Delete Item
router.delete(
  "/:restaurant_id/category/:category_id/item/:item_id",
  categoryController.deleteItem
);

// Support POST-based delete for clients that can't send DELETE
router.post(
  "/:restaurant_id/category/:category_id/item/:item_id/delete",
  categoryController.deleteItem
);

// ========== BULK OPERATIONS (PUBLIC) ==========

// Bulk Menu Update (Replace entire menu)
router.put("/:restaurant_id", categoryController.bulkUpdateMenu);

// Error handler for menu routes
router.use((error, req, res, next) => {
  console.error("Menu route error:", error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
