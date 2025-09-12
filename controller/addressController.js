const db = require('../db/db');
const TABLES = require('../utils/tables');

// Add new address
const addAddress = (req, res) => {
  const user_id = req.user_id;
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
    console.warn('Missing required address fields');
    return res.status(400).json({ message: 'Missing required address fields' });
  }

  const query = `
    INSERT INTO ${TABLES.USER_ADDRESS_TABLE} (
      user_id, 
      addressline1, 
      addressline2, 
      pincode, 
      city, 
      state, 
      country, 
      area, 
      delivery_instructions, 
      latitude, 
      longitude
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

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    return res.status(201).json({
      message: '✅ Address added successfully',
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
  });
};

// Get all addresses or single address by ID
const getAddress = (req, res) => {
  const addressId = req.params.id;

  let query = `SELECT * FROM ${TABLES.USER_ADDRESS_TABLE}`;
  let params = [];

  if (addressId) {
    query += ` WHERE id = ?`;
    params.push(addressId);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (addressId && results.length === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    return res.status(200).json({
      message: '✅ Address data fetched successfully',
      data: addressId ? results[0] : results
    });
  });
};

// Get all addresses for the logged-in user
const getMyAddresses = (req, res) => {
  const user_id = req.user_id;

  const query = `SELECT * FROM ${TABLES.USER_ADDRESS_TABLE} WHERE user_id = ?`;

  db.query(query, [user_id], (err, results) => {
    if (err) {
      console.error('DB Error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    return res.status(200).json({
      message: '✅ User addresses fetched successfully',
      data: results
    });
  });
};

module.exports = {
  addAddress,
  getAddress,
  getMyAddresses
};
