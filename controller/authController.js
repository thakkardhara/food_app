const db = require('../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const TABLES = require('../utils/tables'); 
const { isValidGmail, isValidPhone, isValidPassword, uploadImage, generateOTP } = require('../utils/validation');
const JWT_SECRET = process.env.JWT_SECRET_KEY; 
 const sendMail = require('../utils/sendMail');







const register = async (req, res) => {
    try {
        let { username, email, phone, password } = req.body || {};

        if (!username || !email || !password || !phone) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }

        if (!isValidGmail(email)) {
            return res.status(400).json({ msg: 'Only @gmail.com emails are allowed' });
        }

        if (!isValidPhone(phone)) {
            return res.status(400).json({ msg: 'Phone number must be exactly 10 digits' });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters and include a letter, a number, and a special character' });
        }

        // ✅ Check if user already exists
        const [results] = await db.query(
            `SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, 
            [email]
        );
        if (results.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 🔢 Generate OTP and expiry
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // ✅ Insert user with OTP and expiry
        const sql = `INSERT INTO ${TABLES.USER_TABLE} (username, email, phone, password, otp, otp_expiry)
                     VALUES (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [username, email, phone, hashedPassword, otp, otpExpiry]);

        const user = {
            id: result.insertId,
            username,
            email,
            phone
        };

        // 🔑 Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET_KEY,  
            { expiresIn: "8h" }
        );

        // 📧 Send OTP email
        try {
            await sendMail({
                to: email,
                subject: "Your OTP Code",
                text: `Your OTP is: ${otp}`,
                html: `<p>Hello <b>${username}</b>,</p>
                       <p>Your OTP is: <b>${otp}</b></p>
                       <p>This OTP is valid for 10 minutes.</p>`
            });
            console.log("OTP email sent to:", email);
        } catch (mailErr) {
            console.error("Error sending OTP email:", mailErr);
        }

        return res.status(201).json({
            msg: 'User registered successfully. OTP sent to your email.',
            user,
            token
        });

    } catch (error) {
        console.error('Error in Registration:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};



const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, [email]);
    if (users.length === 0) {
      return res.status(400).json({ msg: 'Invalid email or password' });
    }

    const user = users[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '10h' }
    );

    // Generate OTP
    const otp = generateOTP(6);
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    // Store OTP in DB
    await db.query(
      `UPDATE ${TABLES.USER_TABLE} SET otp = ?, otp_expiry = ? WHERE id = ?`,
      [otp, expiry, user.id]
    );

    // Send OTP via email
    await sendMail({
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
      html: `<p>Your OTP is <b>${otp}</b>. It is valid for 5 minutes.</p>`
    });

    res.status(200).json({
      msg: 'Login successful. OTP sent to your email.',
      token,
      user: {
        id: user.id,
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || ''
      }
    });

  } catch (error) {
    console.error('Error in Login:', error);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ msg: 'Email and OTP are required' });
    }

    // Fetch user
    const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, [email]);
    if (users.length === 0) {
      return res.status(400).json({ msg: 'Invalid email' });
    }

    const user = users[0];

    // Check OTP and expiry
    if (user.otp !== otp) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ msg: 'OTP expired' });
    }

    // Mark verified
    await db.query(
      `UPDATE ${TABLES.USER_TABLE} SET isVerified = 1 WHERE id = ?`,
      [user.id]
    );

    res.status(200).json({ msg: 'OTP verified successfully.' });

  } catch (error) {
    console.error('Error in OTP Verification:', error);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};


const getUsers = async (req, res) => {
    try {
        const userId = req.params.id;
        let sql, params;

        if (userId) {
            sql = `SELECT * FROM ${TABLES.USER_TABLE} WHERE id = ? AND status = 1`;
            params = [userId];
        } else {
            sql = `SELECT * FROM ${TABLES.USER_TABLE} WHERE status = 1`;
            params = [];
        }

        const [users] = await db.query(sql, params);

        if (userId && users.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Helper to build full user details (like login response)
        const buildUserDetails = async (user) => {
            if (!user) return null;
            // Remove password
            user = { ...user, password: false };

            return {
                id: user.id,
                username: user.username || '',
                email: user.email || '',
                phone: user.phone || '',                
                created_at: user.created_at || null,
                updated_at: user.updated_at || null
            };
        };

        if (userId) {
            const userDetails = await buildUserDetails(users[0]);
            res.status(200).json(userDetails);
        } else {
            const allDetails = await Promise.all(users.map(buildUserDetails));
            res.status(200).json(allDetails);
        }
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({ msg: 'User ID is required' });
        }

        // Check if user exists and is active
        const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE id = ? AND status = 1`, [userId]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'User not found or already deleted' });
        }

        // Soft delete: set status = 0
        await db.query(`UPDATE ${TABLES.USER_TABLE} SET status = 0 WHERE id = ?`, [userId]);
        res.status(200).json({ msg: 'User deleted (soft delete) successfully' });
    } catch (error) {
        console.error('Error in soft delete:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};


const updateUser = async (req, res) => {
    try {
        const { id } = req.params;  
        let { username, email, phone, password } = req.body || {};

        const [userCheck] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE id = ?`, [id]);
        if (userCheck.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (email && !isValidGmail(email)) {
            return res.status(400).json({ msg: 'Only @gmail.com emails are allowed' });
        }

        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({ msg: 'Phone number must be exactly 10 digits' });
        }

        if (password && !isValidPassword(password)) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters and include a letter, a number, and a special character' });
        }

        let hashedPassword = password ? await bcrypt.hash(password, 10) : userCheck[0].password;

        const sql = `UPDATE ${TABLES.USER_TABLE} 
                     SET username = ?, email = ?, phone = ?, password = ?
                     WHERE id = ?`;

        await db.query(sql, [
            username || userCheck[0].username,
            email || userCheck[0].email,
            phone || userCheck[0].phone,
            hashedPassword,
            id
        ]);

        res.status(200).json({
            msg: 'User updated successfully',
            user: {
                id,
                username: username || userCheck[0].username,
                email: email || userCheck[0].email,
                phone: phone || userCheck[0].phone
            }
        });
    } catch (error) {
        console.error('Error in Update:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};



// const forgotPassword = async (req, res) => {
//     try {
//         const { email } = req.body;
//         if (!email) {
//             return res.status(400).json({ error: 'Email is required', status: false });
//         }
//         if (!isValidGmail(email)) {
//             return res.status(400).json({ error: 'Only @gmail.com emails are allowed', status: false });
//         }
//         const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, [email]);
//         if (users.length === 0) {
//             return res.status(404).json({ error: 'User not found', status: false });
//         }
//         const user = users[0];
//         const otp = Math.floor(100000 + Math.random() * 900000);
//         const expiry = new Date(Date.now() + 15 * 60 * 1000);
//         await db.query(`UPDATE ${TABLES.USER_TABLE} SET otp = ?, otp_expiry = ? WHERE id = ?`, [otp, expiry, user.id]);

//         // Send OTP email
       
//         try {
//             await sendMail({
//                 to: email,
//                 subject: 'Your OTP for Password Reset',
//                 text: `Your OTP for password reset is: ${otp}. It is valid for 15 minutes.`,
//                 html: `<p>Your OTP for password reset is: <b>${otp}</b>. It is valid for 15 minutes.</p>`
//             });
//         } catch (mailErr) {
//             return res.status(500).json({ error: 'Failed to send OTP email', status: false });
//         }

//         return res.status(200).json({ message: 'OTP sent successfully', status: true });
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({ error: 'Server error', status: false });
//     }
// };

const changePassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ msg: 'Email, OTP, and new password are required' });
        }
        if (!isValidGmail(email)) {
            return res.status(400).json({ msg: 'Only @gmail.com emails are allowed' });
        }
        if (!isValidPassword(newPassword)) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters and include a letter, a number, and a special character' });
        }
        const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, [email]);
        if (users.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        const user = users[0];
        if (String(user.otp) !== String(otp) || new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
 
    await db.query(`UPDATE ${TABLES.USER_TABLE} SET password = ?, otp = NULL, otp_expiry = NULL WHERE id = ?`, [hashedPassword, user.id]);
            
        res.status(200).json({ msg: 'Password changed successfully' });

        
    } catch (error) {
        console.error('Error in changePassword:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
        
    }
}

const verifyToken = (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ msg: 'No token provided' });
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ msg: 'Invalid or expired token' });
        }
        // Token is valid
        res.status(200).json({ msg: 'Token is valid', user_id: decoded.id, email: decoded.email });
    });
};




module.exports = { verifyToken, register, login, updateUser, getUsers, deleteUser  ,changePassword , verifyOtp};