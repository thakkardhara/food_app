const db = require('../db/db');
const TABLES = require('../utils/tables');

// Add new address
const addAddress = async (req, res) => {
  try {
    const user_id = req.user_id;

    if (!user_id) {
      return res.status(401).json({ message: 'Authentication failed. Please log in.' });
    }

    const {
      addressline1,
      addressline2,
      pincode,
      city,
      state,
      country,
      area,
      deliveryInstructions,
      latitude,
      longitude,
    } = req.body;

    if (!addressline1 || !pincode || !state || !country) {
      return res.status(400).json({ message: 'Missing required address fields' });
    }

    const query = `
      INSERT INTO ${TABLES.USER_ADDRESS_TABLE} (
        user_id, addressline1, addressline2, pincode, city, state, country, area,
        delivery_instructions, latitude, longitude
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      user_id,
      addressline1,
      addressline2 || null,
      pincode,
      city || null,
      state,
      country,
      area || null,
      deliveryInstructions || null,
      latitude || null,
      longitude || null,
    ];

    console.log("Executing DB query with values:", values);

    const [result] = await db.query(query, values);

    return res.status(201).json({
      message: 'Address added successfully',
      address_id: result.insertId,
      data: {
        addressline1,
        addressline2,
        pincode,
        city,
        state,
        country,
        area,
        deliveryInstructions,
        latitude,
        longitude,
      }
    });

  } catch (err) {
    console.error('DB Error:', err);
    return res.status(500).json({ message: 'Database error', error: err.sqlMessage });
  }
};


// Get all addresses or single address by ID
const getAddress = async (req, res) => {
  const addressId = req.params.id;

  let query = `SELECT * FROM ${TABLES.USER_ADDRESS_TABLE}`;
  let params = [];

  if (addressId) {
    query += ` WHERE id = ?`;
    params.push(addressId);
  }

  try {
    const [results] = await db.query(query, params);

    if (addressId && results.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    return res.status(200).json({
      message: '✅ Address data fetched successfully',
      data: addressId ? results[0] : results
    });

  } catch (err) {
    console.error('DB Error:', err);
    return res.status(500).json({ message: 'Database error' });
  }
};

const getMyAddresses = async (req, res) => {
  const user_id = req.user_id;

  if (!user_id) {
    return res.status(401).json({
      message: 'Authentication failed',
      data: null,
    });
  }

  const query = `SELECT * FROM ${TABLES.USER_ADDRESS_TABLE} WHERE user_id = ?`;

  try {
    // Await the DB query (assuming db.query returns a promise)
    const [results] = await db.query(query, [user_id]);

    return res.status(200).json({
      message: '✅ User addresses fetched successfully',
      data: results,
    });
  } catch (err) {
    console.error('DB Error:', err);
    return res.status(500).json({
      message: 'Database error',
      data: null,
    });
  }
};


//delete address
const deleteAddress = async (req, res) => {
  const user_id = req.user_id;      // Logged-in user id from middleware
  const addressId = req.params.id;  // Address id from URL params

  if (!user_id) {
    return res.status(401).json({
      message: 'Authentication failed',
      data: null,
    });
  }

  if (!addressId) {
    return res.status(400).json({
      message: 'Address ID is required',
      data: null,
    });
  }

  const query = `DELETE FROM ${TABLES.USER_ADDRESS_TABLE} WHERE id = ? AND user_id = ?`;

  try {
    const [result] = await db.query(query, [addressId, user_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Address not found or not authorized to delete',
        data: null,
      });
    }

    return res.status(200).json({
      message: '✅ Address deleted successfully',
      data: null,
    });
  } catch (err) {
    console.error('DB Error:', err);
    return res.status(500).json({
      message: 'Database error',
      data: null,
    });
  }
};


const updateAddress = async (req, res) => {
  const user_id = req.user_id;      
  const addressId = req.params.id; 

  if (!user_id) {
    return res.status(401).json({
      message: 'Authentication failed',
      data: null,
    });
  }

  if (!addressId) {
    return res.status(400).json({
      message: 'Address ID is required',
      data: null,
    });
  }

  // Extract fields to update from req.body
  const {
    addressline1,
    addressline2,
    pincode,
    city,
    state,
    country,
    area,
    deliveryInstructions,
    latitude,
    longitude,
  } = req.body;

  // Basic validation - you can extend this as needed
  if (!addressline1 || !pincode || !state || !country) {
    return res.status(400).json({
      message: 'Missing required address fields: addressline1, pincode, state, country',
      data: null,
    });
  }

  // Prepare query and values
  const query = `
    UPDATE ${TABLES.USER_ADDRESS_TABLE}
    SET 
      addressline1 = ?, 
      addressline2 = ?, 
      pincode = ?, 
      city = ?, 
      state = ?, 
      country = ?, 
      area = ?, 
      delivery_instructions = ?, 
      latitude = ?, 
      longitude = ?
    WHERE id = ? AND user_id = ?
  `;

  const values = [
    addressline1,
    addressline2 || null,
    pincode,
    city || null,
    state,
    country,
    area || null,
    deliveryInstructions || null,
    latitude || null,
    longitude || null,
    addressId,
    user_id,
  ];

  try {
    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Address not found or not authorized to update',
        data: null,
      });
    }

    return res.status(200).json({
      message: '✅ Address updated successfully',
      data: {
        id: addressId,
        addressline1,
        addressline2,
        pincode,
        city,
        state,
        country,
        area,
        deliveryInstructions,
        latitude,
        longitude,
      },
    });
  } catch (err) {
    console.error('DB Error:', err);
    return res.status(500).json({
      message: 'Database error',
      data: null,
    });
  }
};




module.exports = {
  addAddress,
  getAddress,
  getMyAddresses,
  deleteAddress,
  updateAddress
};