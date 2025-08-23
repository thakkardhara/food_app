const db = require('../db/db');
const TABLES = require('../utils/tables');

 const addAddress = async (req, res) => {
  try {
    const user_id = req.user_id; 
    const { addressline1, addressline2, pincode } = req.body;

    if (!addressline1 || !pincode) {
      return res.status(400).json({ message: 'addressline1 and pincode are required' });
    }

    const query = `
      INSERT INTO ${TABLES.USER_ADDRESS_TABLE} (user_id, addressline1, addressline2, pincode)
      VALUES (?, ?, ?, ?)
    `;

    db.query(query, [user_id, addressline1, addressline2 || null, pincode], (err, result) => {
      if (err) {
        console.error('DB Error: ', err);
        return res.status(500).json({ message: 'Database error' });
      }

      return res.status(201).json({
        message: 'Address added successfully',
        address_id: result.insertId,
      });
    });
  } catch (error) {
    console.error('Error creating address: ', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


module.exports = {addAddress}