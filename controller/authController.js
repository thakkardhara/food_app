const pool = require('../db/db');
const TABLES = require('../utils/tables');
const jwt = require('jsonwebtoken');
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Correct path

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const sendSMS = async (phone, code) => {

  console.log(`Sending SMS to ${phone}: Your login code is ${code}`);
  return true;
};


const sendPushNotification = async (deviceToken, code) => {
  const message = {
    notification: {
      title: 'Login OTP',
      body: `Your login code is ${code}`
    },
    token: deviceToken
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Push notification sent:', response);
    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
};

exports.sendLoginCode = async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  try {
    // Save OTP in DB
    await pool.query(
      `INSERT INTO ${TABLES.USER_TABLE} (phone, otp, otp_expiry) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE)) 
      ON DUPLICATE KEY UPDATE otp=?, otp_expiry=DATE_ADD(NOW(), INTERVAL 10 MINUTE)`,
      [phone, otp, otp]
    );

    // Get device token from DB
    const [rows] = await pool.query(
      `SELECT device_token FROM ${TABLES.USER_TABLE} WHERE phone=?`,
      [phone]
    );
    const deviceToken = rows[0]?.device_token;

    if (deviceToken) {
      await sendPushNotification(deviceToken, otp);
      return res.json({ message: 'Login OTP sent via push notification' });
    } else {
      return res.status(400).json({ message: 'Device token not found for this user' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error sending OTP' });
  }
};

exports.verifyLoginCode = async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ message: 'Phone number and code are required' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM ${TABLES.USER_TABLE} WHERE phone=? AND otp=? AND otp_expiry > NOW()`,
      [phone, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Generate JWT token
    const user = rows[0];
    const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET_KEY, { expiresIn: '7d' });

    return res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error verifying OTP' });
  }
};

exports.saveDeviceToken = async (req, res) => {
  const userId = req.user_id; 
  const { device_token } = req.body;

  if (!device_token) {
    return res.status(400).json({ message: 'Device token is required' });
  }

  try {
    await pool.query(
      `UPDATE ${TABLES.USER_TABLE} SET device_token=? WHERE id=?`,
      [device_token, userId]
    );
    return res.json({ message: 'Device token saved successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error saving device token' });
  }
};
