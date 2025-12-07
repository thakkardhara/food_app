const categoryRepository = require("../repository/categoryRepository");
const crypto = require("crypto");
const {
  deleteMenuFile,
  getDefaultMenuImage,
} = require("../configs/menuMulterConfig");

class CategoryService {
  generateCategoryId() {
    const timestamp = Date.now().toString().slice(-4);
    const random = crypto.randomBytes(2).toString("hex");
    return `c${timestamp}${random}`;
  }

  generateItemId() {
    const timestamp = Date.now().toString().slice(-4);
    const random = crypto.randomBytes(2).toString("hex");
    return `i${timestamp}${random}`;
  }

  validateCategoryName(name) {
    return name && name.trim().length >= 2 && name.trim().length <= 100;
  }

  validateItemData(itemData) {
    console.log("Validating item data:", itemData);
    const { name, price } = itemData;

    if (!name || name.trim().length < 2 || name.trim().length > 200) {
      throw new Error("Item name must be between 2 and 200 characters");
    }

    if (price === undefined || price === null || price < 0) {
      throw new Error("Invalid price. Price must be a positive number");
    }

    if (itemData.description && itemData.description.length > 500) {
      throw new Error("Description cannot exceed 500 characters");
    }

    return true;
  }

  // ========== CATEGORY OPERATIONS ==========

  async addCategory(restaurantId, name) {
    try {
      if (!name) {
        throw new Error("Category name is required");
      }

      if (!this.validateCategoryName(name)) {
        throw new Error(
          "Invalid category name. Must be between 2 and 100 characters"
        );
      }

      // Check if restaurant exists
      const restaurantExists = await categoryRepository.checkRestaurantExists(
        restaurantId
      );
      if (!restaurantExists) {
        throw new Error("Restaurant not found");
      }

      // Check if category already exists for this restaurant
      const existingCategory = await categoryRepository.findCategoryByName(
        restaurantId,
        name.trim()
      );
      if (existingCategory) {
        throw new Error("Category already exists");
      }

      // Generate category ID
      const categoryId = this.generateCategoryId();

      // Create category
      const categoryData = {
        category_id: categoryId,
        restaurant_id: restaurantId,
        name: name.trim(),
        items: [],
        display_order: await categoryRepository.getNextDisplayOrder(
          restaurantId
        ),
        is_active: true,
      };

      await categoryRepository.createCategory(categoryData);

      return {
        category_id: categoryId,
        name: name.trim(),
        items: [],
        message: "Category added successfully",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateCategory(restaurantId, categoryId, updateData) {
    try {
      // Check if category exists
      const category = await categoryRepository.findCategoryById(
        restaurantId,
        categoryId
      );
      if (!category) {
        throw new Error("Category not found");
      }

      const allowedUpdates = {};

      if (updateData.name) {
        if (!this.validateCategoryName(updateData.name)) {
          throw new Error(
            "Invalid category name. Must be between 2 and 100 characters"
          );
        }

        // Check if new name already exists
        const existingCategory = await categoryRepository.findCategoryByName(
          restaurantId,
          updateData.name.trim()
        );
        if (existingCategory && existingCategory.category_id !== categoryId) {
          throw new Error("Category name already exists");
        }

        allowedUpdates.name = updateData.name.trim();
      }

      if (updateData.display_order !== undefined) {
        allowedUpdates.display_order = updateData.display_order;
      }

      if (updateData.is_active !== undefined) {
        allowedUpdates.is_active = updateData.is_active;
      }

      if (updateData.items !== undefined) {
        if (!Array.isArray(updateData.items)) {
          throw new Error("Items must be an array");
        }
        allowedUpdates.items = updateData.items;
      }

      await categoryRepository.updateCategory(
        restaurantId,
        categoryId,
        allowedUpdates
      );

      return {
        category_id: categoryId,
        ...allowedUpdates,
        message: "Category updated successfully",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteCategory(restaurantId, categoryId) {
    try {
      // Check if category exists
      const category = await categoryRepository.findCategoryById(
        restaurantId,
        categoryId
      );
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if category has items and delete their images
      const items = category.items || [];

      // Delete all item images before deleting category
      for (const item of items) {
        if (item.photo && !item.photo.includes("default")) {
          await deleteMenuFile(item.photo);
        }
      }

      // Delete category (items will be deleted with it since they're stored in the same row)
      await categoryRepository.deleteCategory(restaurantId, categoryId);

      return {
        message: "Category deleted successfully",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // ========== ITEM OPERATIONS (WITH IMAGE HANDLING) ==========

  async addItemToCategory(restaurantId, categoryId, itemData) {
    try {
      // Validate item data
      this.validateItemData(itemData);

      // Check if category exists
      const category = await categoryRepository.findCategoryById(
        restaurantId,
        categoryId
      );
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if item name already exists in this category
      const items = category.items || [];
      const existingItem = items.find(
        (item) => item.name.toLowerCase() === itemData.name.trim().toLowerCase()
      );

      if (existingItem) {
        throw new Error("Item with this name already exists in this category");
      }

      // Generate item ID
      const itemId = this.generateItemId();

      // Normalize and prepare item data (photo path comes from controller via req.file)
      const price =
        itemData.price !== undefined ? parseFloat(itemData.price) : null;
      const availability =
        itemData.availability === undefined
          ? true
          : itemData.availability === true ||
            itemData.availability === "true" ||
            itemData.availability === "1" ||
            itemData.availability === 1;

      let photoPath = itemData.photo || null;
      // If no photo provided, use default menu image
      if (!photoPath) {
        photoPath = getDefaultMenuImage();
      }

      const newItem = {
        item_id: itemId,
        name: itemData.name.trim(),
        photo: photoPath, // File path
        price: price,
        description: itemData.description ? itemData.description.trim() : null,
        availability: availability,
        created_at: new Date().toISOString(),
      };

      // Add item to category
      await categoryRepository.addItemToCategory(
        restaurantId,
        categoryId,
        newItem
      );

      return {
        item_id: itemId,
        category_id: categoryId,
        ...newItem,
        // Return photo URL format for frontend (always non-null)
        photo: `/${newItem.photo}`,
        message: "Item added successfully",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateItem(restaurantId, categoryId, itemId, updateData) {
    try {
      // Check if category exists
      const category = await categoryRepository.findCategoryById(
        restaurantId,
        categoryId
      );
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if item exists
      const items = category.items || [];
      const itemIndex = items.findIndex((item) => item.item_id === itemId);

      if (itemIndex === -1) {
        throw new Error("Item not found");
      }

      const existingItem = items[itemIndex];
      const allowedUpdates = {};

      // Name validation
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length < 2) {
          throw new Error("Invalid item name");
        }

        // Check if new name already exists
        const duplicateItem = items.find(
          (item) =>
            item.name.toLowerCase() === updateData.name.trim().toLowerCase() &&
            item.item_id !== itemId
        );

        if (duplicateItem) {
          throw new Error(
            "Item with this name already exists in this category"
          );
        }

        allowedUpdates.name = updateData.name.trim();
      }

      // Price validation
      if (updateData.price !== undefined) {
        if (updateData.price < 0) {
          throw new Error("Invalid price. Price must be a positive number");
        }
        allowedUpdates.price = parseFloat(updateData.price);
      }

      // Description validation
      if (updateData.description !== undefined) {
        if (updateData.description && updateData.description.length > 500) {
          throw new Error("Description cannot exceed 500 characters");
        }
        allowedUpdates.description = updateData.description
          ? updateData.description.trim()
          : null;
      }

      // Photo handling (image update)
      if (updateData.photo !== undefined) {
        // If there's a new photo and old photo exists (not default), delete old one
        if (
          updateData.photo &&
          existingItem.photo &&
          !existingItem.photo.includes("default")
        ) {
          await deleteMenuFile(existingItem.photo);
        }
        // If new photo is empty/null, fall back to default image
        allowedUpdates.photo = updateData.photo || getDefaultMenuImage();
      }

      // Availability
      if (updateData.availability !== undefined) {
        allowedUpdates.availability =
          updateData.availability === true ||
          updateData.availability === "true" ||
          updateData.availability === "1" ||
          updateData.availability === 1;
      }

      allowedUpdates.updated_at = new Date().toISOString();

      await categoryRepository.updateItem(
        restaurantId,
        categoryId,
        itemId,
        allowedUpdates
      );

      // Determine final photo to return (updated -> existing -> default)
      const finalPhoto =
        allowedUpdates.photo || existingItem.photo || getDefaultMenuImage();

      return {
        item_id: itemId,
        category_id: categoryId,
        ...allowedUpdates,
        // Return photo URL format for frontend (always non-null)
        photo: `/${finalPhoto}`,
        message: "Item updated successfully",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateItemAvailability(restaurantId, categoryId, itemId, availability) {
    try {
      // Check if category exists
      const category = await categoryRepository.findCategoryById(
        restaurantId,
        categoryId
      );
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if item exists
      const items = category.items || [];
      const itemIndex = items.findIndex((item) => item.item_id === itemId);

      if (itemIndex === -1) {
        throw new Error("Item not found");
      }

      const existingItem = items[itemIndex];

      // Normalize availability value
      const normalizedAvailability =
        availability === true ||
        availability === "true" ||
        availability === "1" ||
        availability === 1;

      const allowedUpdates = {
        availability: normalizedAvailability,
        updated_at: new Date().toISOString(),
      };

      await categoryRepository.updateItem(
        restaurantId,
        categoryId,
        itemId,
        allowedUpdates
      );

      return {
        item_id: itemId,
        category_id: categoryId,
        name: existingItem.name,
        availability: normalizedAvailability,
        message: "Item availability updated successfully",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteItem(restaurantId, categoryId, itemId) {
    try {
      // Check if category exists
      const category = await categoryRepository.findCategoryById(
        restaurantId,
        categoryId
      );
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if item exists
      const items = category.items || [];
      const item = items.find((item) => item.item_id === itemId);

      if (!item) {
        throw new Error("Item not found");
      }

      // Delete item's image if it exists (not default)
      if (item.photo && !item.photo.includes("default")) {
        await deleteMenuFile(item.photo);
      }

      await categoryRepository.deleteItem(restaurantId, categoryId, itemId);

      return {
        message: "Item deleted successfully",
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // ========== GET OPERATIONS ==========

  async getFullMenu(restaurantId) {
    try {
      // Check if restaurant exists
      const restaurantExists = await categoryRepository.checkRestaurantExists(
        restaurantId
      );
      if (!restaurantExists) {
        throw new Error("Restaurant not found");
      }

      const categories = await categoryRepository.getAllCategoriesWithItems(
        restaurantId
      );

      return {
        restaurant_id: restaurantId,
        categories: categories.map((cat) => ({
          category_id: cat.category_id,
          name: cat.name,
          display_order: cat.display_order,
          is_active: cat.is_active,
          items: (cat.items || []).map((item) => ({
            ...item,
            category_id: cat.category_id, // Add category_id to each item
            // Format photo URL for frontend
            photo: item.photo ? `/${item.photo}` : null,
          })),
        })),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async bulkUpdateMenu(restaurantId, categories) {
    try {
      if (!Array.isArray(categories)) {
        throw new Error("Categories must be an array");
      }

      // Validate all categories and items
      for (const category of categories) {
        if (!category.name || !this.validateCategoryName(category.name)) {
          throw new Error(`Invalid category name: ${category.name}`);
        }

        if (category.items && Array.isArray(category.items)) {
          for (const item of category.items) {
            this.validateItemData(item);
          }
        }
      }

      // Process bulk update
      await categoryRepository.bulkUpdateMenu(restaurantId, categories);

      return {
        message: "Menu updated successfully",
        categories_count: categories.length,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getCategories(restaurantId) {
    try {
      const restaurantExists = await categoryRepository.checkRestaurantExists(
        restaurantId
      );
      if (!restaurantExists) {
        throw new Error("Restaurant not found");
      }

      const categories = await categoryRepository.getCategoriesList(
        restaurantId
      );
      return categories;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getCategoryWithItems(restaurantId, categoryId) {
    try {
      const category = await categoryRepository.findCategoryById(
        restaurantId,
        categoryId
      );
      if (!category) {
        throw new Error("Category not found");
      }

      return {
        category_id: category.category_id,
        name: category.name,
        display_order: category.display_order,
        is_active: category.is_active,
        items: (category.items || []).map((item) => ({
          ...item,
          category_id: category.category_id, // Add category_id to each item
          // Format photo URL for frontend
          photo: item.photo ? `/${item.photo}` : null,
        })),
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new CategoryService();
