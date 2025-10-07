const pool = require('../db/db');

class CategoryRepository {
  async checkRestaurantExists(restaurantId) {
    const query = 'SELECT restaurant_id FROM restaurants WHERE restaurant_id = ?';
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows.length > 0;
    } catch (error) {
      console.error('Error checking restaurant:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async findCategoryByName(restaurantId, name) {
    const query = 'SELECT * FROM categories WHERE restaurant_id = ? AND LOWER(name) = LOWER(?)';
    try {
      const [rows] = await pool.execute(query, [restaurantId, name]);
      if (rows[0] && rows[0].items) {
        rows[0].items = JSON.parse(rows[0].items);
      }
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding category by name:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async findCategoryById(restaurantId, categoryId) {
    const query = 'SELECT * FROM categories WHERE restaurant_id = ? AND category_id = ?';
    try {
      const [rows] = await pool.execute(query, [restaurantId, categoryId]);
      if (rows[0] && rows[0].items) {
        rows[0].items = JSON.parse(rows[0].items);
      }
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding category by ID:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getNextDisplayOrder(restaurantId) {
    const query = 'SELECT MAX(display_order) as max_order FROM categories WHERE restaurant_id = ?';
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return (rows[0].max_order || 0) + 1;
    } catch (error) {
      console.error('Error getting display order:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async createCategory(categoryData) {
    const {
      category_id,
      restaurant_id,
      name,
      items,
      display_order,
      is_active
    } = categoryData;

    const query = `
      INSERT INTO categories 
      (category_id, restaurant_id, name, items, display_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await pool.execute(query, [
        category_id,
        restaurant_id,
        name,
        JSON.stringify(items),
        display_order,
        is_active
      ]);
      return result;
    } catch (error) {
      console.error('Error creating category:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Category already exists');
      }
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async updateCategory(restaurantId, categoryId, updateData) {
    const updates = [];
    const values = [];

    // Build dynamic update query
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updates.push(`${key} = ?`);
        
        // Handle JSON fields
        if (key === 'items') {
          values.push(JSON.stringify(updateData[key]));
        } else {
          values.push(updateData[key]);
        }
      }
    });

    if (updates.length === 0) {
      return null;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(restaurantId, categoryId);

    const query = `
      UPDATE categories 
      SET ${updates.join(', ')} 
      WHERE restaurant_id = ? AND category_id = ?
    `;

    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async deleteCategory(restaurantId, categoryId) {
    const query = 'DELETE FROM categories WHERE restaurant_id = ? AND category_id = ?';
    try {
      const [result] = await pool.execute(query, [restaurantId, categoryId]);
      return result;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async addItemToCategory(restaurantId, categoryId, newItem) {
    // First get current items
    const category = await this.findCategoryById(restaurantId, categoryId);
    const items = category.items || [];
    
    // Add new item
    items.push(newItem);
    
    // Update category with new items array
    const query = `
      UPDATE categories 
      SET items = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE restaurant_id = ? AND category_id = ?
    `;
    
    try {
      const [result] = await pool.execute(query, [
        JSON.stringify(items),
        restaurantId,
        categoryId
      ]);
      return result;
    } catch (error) {
      console.error('Error adding item to category:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async updateItem(restaurantId, categoryId, itemId, updateData) {
    // Get current category
    const category = await this.findCategoryById(restaurantId, categoryId);
    const items = category.items || [];
    
    // Find and update the item
    const itemIndex = items.findIndex(item => item.item_id === itemId);
    if (itemIndex !== -1) {
      items[itemIndex] = { ...items[itemIndex], ...updateData };
    }
    
    // Update category with modified items array
    const query = `
      UPDATE categories 
      SET items = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE restaurant_id = ? AND category_id = ?
    `;
    
    try {
      const [result] = await pool.execute(query, [
        JSON.stringify(items),
        restaurantId,
        categoryId
      ]);
      return result;
    } catch (error) {
      console.error('Error updating item:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async deleteItem(restaurantId, categoryId, itemId) {
    // Get current category
    const category = await this.findCategoryById(restaurantId, categoryId);
    const items = category.items || [];
    
    // Remove the item
    const filteredItems = items.filter(item => item.item_id !== itemId);
    
    // Update category with filtered items array
    const query = `
      UPDATE categories 
      SET items = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE restaurant_id = ? AND category_id = ?
    `;
    
    try {
      const [result] = await pool.execute(query, [
        JSON.stringify(filteredItems),
        restaurantId,
        categoryId
      ]);
      return result;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getAllCategoriesWithItems(restaurantId) {
    const query = `
      SELECT * FROM categories 
      WHERE restaurant_id = ? 
      ORDER BY display_order ASC, created_at ASC
    `;
    
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      
      // Parse JSON items for each category
      return rows.map(row => ({
        ...row,
        items: row.items ? JSON.parse(row.items) : []
      }));
    } catch (error) {
      console.error('Error getting all categories:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getCategoriesList(restaurantId) {
    const query = `
      SELECT category_id, name, display_order, is_active 
      FROM categories 
      WHERE restaurant_id = ? 
      ORDER BY display_order ASC, created_at ASC
    `;
    
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows;
    } catch (error) {
      console.error('Error getting categories list:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async bulkUpdateMenu(restaurantId, categories) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Delete all existing categories for this restaurant
      await connection.execute(
        'DELETE FROM categories WHERE restaurant_id = ?',
        [restaurantId]
      );
      
      // Insert new categories with items
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const categoryId = category.category_id || this.generateCategoryId();
        
        // Prepare items with IDs if not present
        const items = (category.items || []).map(item => ({
          item_id: item.item_id || this.generateItemId(),
          name: item.name,
          photo: item.photo || null,
          price: item.price,
          description: item.description || null,
          availability: item.availability !== undefined ? item.availability : true,
          created_at: new Date().toISOString()
        }));
        
        await connection.execute(
          `INSERT INTO categories 
          (category_id, restaurant_id, name, items, display_order, is_active) 
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            categoryId,
            restaurantId,
            category.name,
            JSON.stringify(items),
            i + 1,
            category.is_active !== undefined ? category.is_active : true
          ]
        );
      }
      
      await connection.commit();
      return true;
      
    } catch (error) {
      await connection.rollback();
      console.error('Error in bulk update:', error);
      throw new Error(`Database error: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  // Helper methods for ID generation (used in bulk update)
  generateCategoryId() {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 6);
    return `c${timestamp}${random}`;
  }

  generateItemId() {
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 6);
    return `i${timestamp}${random}`;
  }

  // Statistics methods
  async getCategoryStats(restaurantId) {
    const query = `
      SELECT 
        COUNT(*) as total_categories,
        SUM(JSON_LENGTH(items)) as total_items,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_categories
      FROM categories 
      WHERE restaurant_id = ?
    `;
    
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows[0];
    } catch (error) {
      console.error('Error getting category stats:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Search items across all categories
  async searchItems(restaurantId, searchTerm) {
    const query = `
      SELECT category_id, name as category_name, items 
      FROM categories 
      WHERE restaurant_id = ? AND is_active = 1
    `;
    
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      const results = [];
      
      rows.forEach(category => {
        const items = JSON.parse(category.items || '[]');
        const matchedItems = items.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        if (matchedItems.length > 0) {
          results.push({
            category_id: category.category_id,
            category_name: category.category_name,
            items: matchedItems
          });
        }
      });
      
      return results;
    } catch (error) {
      console.error('Error searching items:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new CategoryRepository();