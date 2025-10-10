const categoryService = require("../services/categoryService");

class CategoryController {
  // 2.1 Add Category
  async addCategory(req, res) {
    try {
      const { restaurant_id } = req.params;
      const { name } = req.body;

      // If request is authenticated, verify restaurant ownership
      if (req.restaurant) {
        if (req.restaurant.restaurant_id !== restaurant_id) {
          return res
            .status(403)
            .json({ error: "Unauthorized access to this restaurant" });
        }
      }

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

  // 2.2 Update Category
  async updateCategory(req, res) {
    try {
      const { restaurant_id, category_id } = req.params;
      const updateData = req.body;

      // Verify restaurant ownership
      if (req.restaurant.restaurant_id !== restaurant_id) {
        return res
          .status(403)
          .json({ error: "Unauthorized access to this restaurant" });
      }

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

  // 2.3 Delete Category
  async deleteCategory(req, res) {
    try {
      const { restaurant_id, category_id } = req.params;

      // Verify restaurant ownership
      if (req.restaurant.restaurant_id !== restaurant_id) {
        return res
          .status(403)
          .json({ error: "Unauthorized access to this restaurant" });
      }

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

  // 2.4 Add Item to Category
  async addItem(req, res) {
    try {
      const { restaurant_id, category_id } = req.params;
      const itemData = req.body;

      // Verify restaurant ownership
      if (req.restaurant.restaurant_id !== restaurant_id) {
        return res
          .status(403)
          .json({ error: "Unauthorized access to this restaurant" });
      }

      const result = await categoryService.addItemToCategory(
        restaurant_id,
        category_id,
        itemData
      );
      res.status(201).json(result);
    } catch (error) {
      console.error("Add item error:", error.message);

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

  // 2.5 Update Item
  async updateItem(req, res) {
    try {
      const { restaurant_id, category_id, item_id } = req.params;
      const updateData = req.body;

      // Verify restaurant ownership
      if (req.restaurant.restaurant_id !== restaurant_id) {
        return res
          .status(403)
          .json({ error: "Unauthorized access to this restaurant" });
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

      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }

      if (error.message.includes("Invalid")) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  // 2.6 Delete Item
  async deleteItem(req, res) {
    try {
      const { restaurant_id, category_id, item_id } = req.params;

      // Verify restaurant ownership
      if (req.restaurant.restaurant_id !== restaurant_id) {
        return res
          .status(403)
          .json({ error: "Unauthorized access to this restaurant" });
      }

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

  // 2.7 Get Full Menu
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

  // 2.8 Bulk Menu Update
  async bulkUpdateMenu(req, res) {
    try {
      const { restaurant_id } = req.params;
      const { categories } = req.body;

      // Verify restaurant ownership
      if (req.restaurant.restaurant_id !== restaurant_id) {
        return res
          .status(403)
          .json({ error: "Unauthorized access to this restaurant" });
      }

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
