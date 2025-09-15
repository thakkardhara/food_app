const categoryRepository = require('../repository/categoryRepository');
const crypto = require('crypto');

class CategoryService {
  generateCategoryId() {
    const timestamp = Date.now().toString().slice(-4);
    const random = crypto.randomBytes(2).toString('hex');
    return `c${timestamp}${random}`;
  }

  generateItemId() {
    const timestamp = Date.now().toString().slice(-4);
    const random = crypto.randomBytes(2).toString('hex');
    return `i${timestamp}${random}`;
  }

  validateCategoryName(name) {
    return name && name.trim().length >= 2 && name.trim().length <= 100;
  }

  validateItemData(itemData) {
    const { name, price } = itemData;
    
    if (!name || name.trim().length < 2 || name.trim().length > 200) {
      throw new Error('Item name must be between 2 and 200 characters');
    }
    
    if (price === undefined || price === null || price < 0) {
      throw new Error('Invalid price. Price must be a positive number');
    }
    
    if (itemData.description && itemData.description.length > 500) {
      throw new Error('Description cannot exceed 500 characters');
    }
    
    if (itemData.photo && !this.isValidUrl(itemData.photo)) {
      throw new Error('Invalid photo URL');
    }
    
    return true;
  }

  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  async addCategory(restaurantId, name) {
    try {
      if (!name) {
        throw new Error('Category name is required');
      }

      if (!this.validateCategoryName(name)) {
        throw new Error('Invalid category name. Must be between 2 and 100 characters');
      }

      // Check if restaurant exists
      const restaurantExists = await categoryRepository.checkRestaurantExists(restaurantId);
      if (!restaurantExists) {
        throw new Error('Restaurant not found');
      }

      // Check if category already exists for this restaurant
      const existingCategory = await categoryRepository.findCategoryByName(restaurantId, name.trim());
      if (existingCategory) {
        throw new Error('Category already exists');
      }

      // Generate category ID
      const categoryId = this.generateCategoryId();

      // Create category
      const categoryData = {
        category_id: categoryId,
        restaurant_id: restaurantId,
        name: name.trim(),
        items: [],
        display_order: await categoryRepository.getNextDisplayOrder(restaurantId),
        is_active: true
      };

      await categoryRepository.createCategory(categoryData);

      return {
        category_id: categoryId,
        name: name.trim(),
        items: [],
        message: 'Category added successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateCategory(restaurantId, categoryId, updateData) {
    try {
      // Check if category exists
      const category = await categoryRepository.findCategoryById(restaurantId, categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      const allowedUpdates = {};

      if (updateData.name) {
        if (!this.validateCategoryName(updateData.name)) {
          throw new Error('Invalid category name. Must be between 2 and 100 characters');
        }
        
        // Check if new name already exists
        const existingCategory = await categoryRepository.findCategoryByName(restaurantId, updateData.name.trim());
        if (existingCategory && existingCategory.category_id !== categoryId) {
          throw new Error('Category name already exists');
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
        // If items array is provided, validate it
        if (!Array.isArray(updateData.items)) {
          throw new Error('Items must be an array');
        }
        allowedUpdates.items = updateData.items;
      }

      await categoryRepository.updateCategory(restaurantId, categoryId, allowedUpdates);

      return {
        category_id: categoryId,
        ...allowedUpdates,
        message: 'Category updated successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteCategory(restaurantId, categoryId) {
    try {
      // Check if category exists
      const category = await categoryRepository.findCategoryById(restaurantId, categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Check if category has items
      const items = category.items || [];
      if (items.length > 0) {
        throw new Error('Cannot delete category with items. Please delete all items first');
      }

      await categoryRepository.deleteCategory(restaurantId, categoryId);

      return {
        message: 'Category deleted successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async addItemToCategory(restaurantId, categoryId, itemData) {
    try {
      // Validate item data
      this.validateItemData(itemData);

      // Check if category exists
      const category = await categoryRepository.findCategoryById(restaurantId, categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Check if item name already exists in this category
      const items = category.items || [];
      const existingItem = items.find(item => 
        item.name.toLowerCase() === itemData.name.trim().toLowerCase()
      );
      
      if (existingItem) {
        throw new Error('Item with this name already exists in this category');
      }

      // Generate item ID
      const itemId = this.generateItemId();

      // Prepare item data
      const newItem = {
        item_id: itemId,
        name: itemData.name.trim(),
        photo: itemData.photo || null,
        price: parseFloat(itemData.price),
        description: itemData.description ? itemData.description.trim() : null,
        availability: itemData.availability !== undefined ? itemData.availability : true,
        created_at: new Date().toISOString()
      };

      // Add item to category
      await categoryRepository.addItemToCategory(restaurantId, categoryId, newItem);

      return {
        item_id: itemId,
        category_id: categoryId,
        ...newItem,
        message: 'Item added successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async updateItem(restaurantId, categoryId, itemId, updateData) {
    try {
      // Check if category exists
      const category = await categoryRepository.findCategoryById(restaurantId, categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Check if item exists
      const items = category.items || [];
      const itemIndex = items.findIndex(item => item.item_id === itemId);
      
      if (itemIndex === -1) {
        throw new Error('Item not found');
      }

      const allowedUpdates = {};

      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length < 2) {
          throw new Error('Invalid item name');
        }
        
        // Check if new name already exists
        const duplicateItem = items.find(item => 
          item.name.toLowerCase() === updateData.name.trim().toLowerCase() && 
          item.item_id !== itemId
        );
        
        if (duplicateItem) {
          throw new Error('Item with this name already exists in this category');
        }
        
        allowedUpdates.name = updateData.name.trim();
      }

      if (updateData.price !== undefined) {
        if (updateData.price < 0) {
          throw new Error('Invalid price. Price must be a positive number');
        }
        allowedUpdates.price = parseFloat(updateData.price);
      }

      if (updateData.description !== undefined) {
        if (updateData.description && updateData.description.length > 500) {
          throw new Error('Description cannot exceed 500 characters');
        }
        allowedUpdates.description = updateData.description ? updateData.description.trim() : null;
      }

      if (updateData.photo !== undefined) {
        if (updateData.photo && !this.isValidUrl(updateData.photo)) {
          throw new Error('Invalid photo URL');
        }
        allowedUpdates.photo = updateData.photo;
      }

      if (updateData.availability !== undefined) {
        allowedUpdates.availability = Boolean(updateData.availability);
      }

      allowedUpdates.updated_at = new Date().toISOString();

      await categoryRepository.updateItem(restaurantId, categoryId, itemId, allowedUpdates);

      return {
        item_id: itemId,
        category_id: categoryId,
        ...allowedUpdates,
        message: 'Item updated successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteItem(restaurantId, categoryId, itemId) {
    try {
      // Check if category exists
      const category = await categoryRepository.findCategoryById(restaurantId, categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Check if item exists
      const items = category.items || [];
      const itemExists = items.some(item => item.item_id === itemId);
      
      if (!itemExists) {
        throw new Error('Item not found');
      }

      await categoryRepository.deleteItem(restaurantId, categoryId, itemId);

      return {
        message: 'Item deleted successfully'
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getFullMenu(restaurantId) {
    try {
      // Check if restaurant exists
      const restaurantExists = await categoryRepository.checkRestaurantExists(restaurantId);
      if (!restaurantExists) {
        throw new Error('Restaurant not found');
      }

      const categories = await categoryRepository.getAllCategoriesWithItems(restaurantId);

      return {
        restaurant_id: restaurantId,
        categories: categories.map(cat => ({
          category_id: cat.category_id,
          name: cat.name,
          display_order: cat.display_order,
          is_active: cat.is_active,
          items: cat.items || []
        }))
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async bulkUpdateMenu(restaurantId, categories) {
    try {
      if (!Array.isArray(categories)) {
        throw new Error('Categories must be an array');
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
        message: 'Menu updated successfully',
        categories_count: categories.length
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getCategories(restaurantId) {
    try {
      const restaurantExists = await categoryRepository.checkRestaurantExists(restaurantId);
      if (!restaurantExists) {
        throw new Error('Restaurant not found');
      }

      const categories = await categoryRepository.getCategoriesList(restaurantId);
      return categories;

    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getCategoryWithItems(restaurantId, categoryId) {
    try {
      const category = await categoryRepository.findCategoryById(restaurantId, categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      return {
        category_id: category.category_id,
        name: category.name,
        display_order: category.display_order,
        is_active: category.is_active,
        items: category.items || []
      };

    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new CategoryService();