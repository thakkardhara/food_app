// controller/categoryController.js
const categoryService = require("../services/categoryService");
const { deleteMenuFile } = require("../configs/menuMulterConfig");

class CategoryController {
  // ========== CATEGORY OPERATIONS ==========
  
  // Add Category
  async addCategory(req, res) {
    try {
      const { restaurant_id } = req.params;
      const { name } = req.body;

      const result = await categoryService.addCategory(restaurant_id, name);
      res.status(201).json(result);
    } catch (error) {
      console.error("Add category error:", error.message);

      if (
        error.message.includes("already exists") ||
        error.message.includes("Invalid") ||
        error.message.includes("required")
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Update Category
  async updateCategory(req, res) {
    try {
      const { restaurant_id, category_id } = req.params;
      const updateData = req.body;

      const result = await categoryService.updateCategory(
        restaurant_id,
        category_id,
        updateData
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Update category error:", error.message);

      if (error.message === "Category not found") {
        return res.status(404).json({ error: error.message });
      }

      if (
        error.message.includes("Invalid") ||
        error.message.includes("required")
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Delete Category
  async deleteCategory(req, res) {
    try {
      const { restaurant_id, category_id } = req.params;

      const result = await categoryService.deleteCategory(
        restaurant_id,
        category_id
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Delete category error:", error.message);

      if (error.message === "Category not found") {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes("Cannot delete")) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // ========== ITEM OPERATIONS (WITH IMAGE) ==========

  // Add Item to Category (WITH IMAGE UPLOAD)
  async addItem(req, res) {
    try {
      console.log('Request body:', req.body);
      const { restaurant_id, category_id } = req.params;
      const itemData = {
        ...req.body,
        // Add photo path if file was uploaded
        photo: req.file ? req.file.path.replace(/\\/g, "/") : null,
      };

      const result = await categoryService.addItemToCategory(
        restaurant_id,
        category_id,
        itemData
      );
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Add item error:", error.message);

      // Clean up uploaded file on error
      if (req.file) {
        await deleteMenuFile(req.file.path);
      }

      if (error.message === "Category not found") {
        return res.status(404).json({ error: error.message });
      }

      if (
        error.message.includes("already exists") ||
        error.message.includes("Invalid") ||
        error.message.includes("required")
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Update Item (WITH IMAGE UPLOAD)
  async updateItem(req, res) {
    try {
      const { restaurant_id, category_id, item_id } = req.params;
      const updateData = { ...req.body };

      // Handle image if uploaded
      if (req.file) {
        updateData.photo = req.file.path.replace(/\\/g, "/");
      }

      const result = await categoryService.updateItem(
        restaurant_id,
        category_id,
        item_id,
        updateData
      );
      
      res.status(200).json(result);
    } catch (error) {
      console.error("Update item error:", error.message);

      // Clean up uploaded file on error
      if (req.file) {
        await deleteMenuFile(req.file.path);
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes("Invalid")) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Delete Item
  async deleteItem(req, res) {
    try {
      const { restaurant_id, category_id, item_id } = req.params;

      const result = await categoryService.deleteItem(
        restaurant_id,
        category_id,
        item_id
      );
      
      res.status(200).json(result);
    } catch (error) {
      console.error("Delete item error:", error.message);

      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // ========== GET OPERATIONS ==========

  // Get Full Menu
  async getFullMenu(req, res) {
    try {
      const { restaurant_id } = req.params;

      const menu = await categoryService.getFullMenu(restaurant_id);
      res.status(200).json(menu);
    } catch (error) {
      console.error("Get menu error:", error.message);

      if (error.message === "Restaurant not found") {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Bulk Menu Update
  async bulkUpdateMenu(req, res) {
    try {
      const { restaurant_id } = req.params;
      const { categories } = req.body;

      const result = await categoryService.bulkUpdateMenu(
        restaurant_id,
        categories
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Bulk update error:", error.message);

      if (
        error.message.includes("Invalid") ||
        error.message.includes("required")
      ) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get categories list (without items)
  async getCategories(req, res) {
    try {
      const { restaurant_id } = req.params;

      const categories = await categoryService.getCategories(restaurant_id);
      res.status(200).json({ categories });
    } catch (error) {
      console.error("Get categories error:", error.message);

      if (error.message === "Restaurant not found") {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get single category with items
  async getCategoryWithItems(req, res) {
    try {
      const { restaurant_id, category_id } = req.params;

      const category = await categoryService.getCategoryWithItems(
        restaurant_id,
        category_id
      );
      res.status(200).json(category);
    } catch (error) {
      console.error("Get category error:", error.message);

      if (error.message === "Category not found") {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new CategoryController();