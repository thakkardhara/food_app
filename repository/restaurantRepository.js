const pool = require('../db/db');
const bcrypt = require('bcrypt');

class RestaurantRepository {
  async findByEmail(email) {
    const query = 'SELECT * FROM restaurants WHERE email = ?';
    try {
      const [rows] = await pool.execute(query, [email]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding restaurant by email:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async findByRestaurantId(restaurantId) {
    const query = 'SELECT * FROM restaurants WHERE restaurant_id = ?';
    try {
      const [rows] = await pool.execute(query, [restaurantId]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding restaurant by ID:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

async create(restaurantData) {
    const {
      restaurant_id,
      name,
      email,
      phone,
      password,
      latitude,
      longitude,
      cuisine,
      menu,
      profile_image,
      status,
      created_by
    } = restaurantData;

    const query = `
      INSERT INTO restaurants 
      (restaurant_id, name, email, phone, password, latitude, longitude, cuisine, menu, profile_image, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      // Hash password before storing
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const [result] = await pool.execute(query, [
        restaurant_id,
        name,
        email,
        phone,
        hashedPassword,
        latitude,
        longitude,
        JSON.stringify(cuisine),
        JSON.stringify(menu),
        profile_image,
        status,
        created_by
      ]);
      
      return result;
    } catch (error) {
      console.error('Error creating restaurant:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('email')) {
          throw new Error('Email already exists');
        }
        if (error.message.includes('restaurant_id')) {
          throw new Error('Restaurant ID already exists');
        }
      }
      throw new Error(`Database error: ${error.message}`);
    }
  }
   async updateProfileImage(restaurantId, imagePath) {
    const query = `
      UPDATE restaurants 
      SET profile_image = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE restaurant_id = ?
    `;
    
    try {
      const [result] = await pool.execute(query, [imagePath, restaurantId]);
      return result;
    } catch (error) {
      console.error('Error updating profile image:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async updateProfile(restaurantId, updateData) {
    const updates = [];
    const values = [];

    // Build dynamic update query
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updates.push(`${key} = ?`);
        
        // Handle JSON fields
        if (key === 'cuisine' || key === 'menu') {
          values.push(JSON.stringify(updateData[key]));
        } else {
          values.push(updateData[key]);
        }
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(restaurantId);

    const query = `UPDATE restaurants SET ${updates.join(', ')} WHERE restaurant_id = ?`;

    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      console.error('Error updating restaurant details:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }


  async updatePassword(email, newPassword) {
    const query = 'UPDATE restaurants SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?';
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      const [result] = await pool.execute(query, [hashedPassword, email]);
      return result;
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async updateStatus(restaurantId, status) {
    const query = 'UPDATE restaurants SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE restaurant_id = ?';
    try {
      const [result] = await pool.execute(query, [status, restaurantId]);
      return result;
    } catch (error) {
      console.error('Error updating restaurant status:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw new Error(`Password verification error: ${error.message}`);
    }
  }

  // Additional useful methods
async getAllRestaurants() {
  const query = `
    SELECT 
      id,
      restaurant_id,
      name,
      profile_image,
      email,
      phone,
      latitude,
      longitude,
      cuisine,
      status,
      created_by,
      created_at,
      updated_at
    FROM restaurants
    ORDER BY created_at DESC
  `;
  
  try {
    const [rows] = await pool.execute(query);
    
    // ✅ Parse cuisine if it’s stored as a JSON string
    return rows
  } catch (error) {
    console.error('Error getting all restaurants:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}


async getAllRestaurantsWithCategories() {
  const restaurantQuery = 'SELECT * FROM restaurants ORDER BY created_at DESC';
  const categoryQuery = 'SELECT * FROM categories WHERE restaurant_id = ? ORDER BY display_order ASC';

  try {
    const [restaurants] = await pool.execute(restaurantQuery);

    for (let restaurant of restaurants) {
      const [categories] = await pool.execute(categoryQuery, [restaurant.restaurant_id]);

      for (let category of categories) {
        // Safely parse the JSON items field
        if (!category.items) {
          category.items = [];
        } else if (typeof category.items === 'string') {
          try {
            category.items = JSON.parse(category.items || '[]');
          } catch (err) {
            console.error('Error parsing items JSON for category:', category.category_id, err);
            category.items = [];
          }
        } else if (!Array.isArray(category.items)) {
          // If somehow stored as object, convert to array
          category.items = Array.isArray(category.items) ? category.items : [];
        }
      }

      restaurant.categories = categories;
    }

    return restaurants;

  } catch (error) {
    console.error('Error getting all restaurants with categories and items:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}





async getItemsByCategoryId(categoryId) {
  const query = 'SELECT * FROM items WHERE category_id = ? ORDER BY created_at DESC';
  try {
    const [rows] = await pool.execute(query, [categoryId]);
    return rows;
  } catch (error) {
    console.error('Error getting items by category ID:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}



  async getRestaurantsByStatus(status, limit = 50, offset = 0) {
    const query = 'SELECT * FROM restaurants WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?';
    try {
      const [rows] = await pool.execute(query, [status, limit, offset]);
      return rows;
    } catch (error) {
      console.error('Error getting restaurants by status:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async searchRestaurants(searchTerm, limit = 20, offset = 0) {
    const query = `
      SELECT * FROM restaurants 
      WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?) 
      AND status = 'active'
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const searchPattern = `%${searchTerm}%`;
    
    try {
      const [rows] = await pool.execute(query, [
        searchPattern, 
        searchPattern, 
        searchPattern, 
        limit, 
        offset
      ]);
      return rows;
    } catch (error) {
      console.error('Error searching restaurants:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getRestaurantStats() {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        created_by
      FROM restaurants 
      GROUP BY status, created_by
      ORDER BY status, created_by
    `;
    
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      console.error('Error getting restaurant stats:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async deleteRestaurant(restaurantId) {
    const query = 'DELETE FROM restaurants WHERE restaurant_id = ?';
    try {
      const [result] = await pool.execute(query, [restaurantId]);
      return result;
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async updateRestaurantDetails(restaurantId, updateData) {
    const allowedFields = ['name', 'phone', 'latitude', 'longitude', 'cuisine', 'menu'];
    const updates = [];
    const values = [];

    // Build dynamic update query
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = ?`);
        
        // Handle JSON fields
        if (key === 'cuisine' || key === 'menu') {
          values.push(JSON.stringify(updateData[key]));
        } else {
          values.push(updateData[key]);
        }
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(restaurantId);

    const query = `UPDATE restaurants SET ${updates.join(', ')} WHERE restaurant_id = ?`;

    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      console.error('Error updating restaurant details:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = new RestaurantRepository();