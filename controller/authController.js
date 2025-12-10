const db = require('../db/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const TABLES = require('../utils/tables');
const { isValidEmail, isValidPhone, isValidPassword, generateOTP } = require('../utils/validation');
const sendMail = require('../utils/sendMail');
const { getRegistrationOTPEmail, getPasswordResetOTPEmail, getPasswordChangedEmail } = require('../utils/emailTemplates');

const JWT_SECRET = process.env.JWT_SECRET_KEY;

const generateToken = (userId, email) => {
    return jwt.sign(
        { id: userId, email },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
};

const register = async (req, res) => {
    try {
        let { username, email, phone, password } = req.body || {};

        if (!username || !email || !password || !phone) {
            return res.status(400).json({ msg: 'Missing required fields' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ msg: 'Invalid email format' });
        }
        if (!isValidPhone(phone)) {
            return res.status(400).json({ msg: 'Phone number must be exactly 10 digits' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ msg: 'Password must be at least 6 chars with letter, number & special char' });
        }

        const [existing] = await db.query(
            `SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`,
            [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        const sql = `INSERT INTO ${TABLES.USER_TABLE} 
                     (username, email, phone, password, otp, otp_expiry, isVerified, status) 
                     VALUES (?, ?, ?, ?, ?, ?, 0, 1)`;

        const [result] = await db.query(sql, [
            username,
            email,
            phone,
            hashedPassword,
            otp,
            otpExpiry
        ]);

        // Send OTP email with professional template
        await sendMail({
            to: email,
            subject: "Welcome to 92 Eats - Verify Your Email",
            text: `Hello ${username}, Your OTP is: ${otp}. This code is valid for 10 minutes.`,
            html: getRegistrationOTPEmail(username, otp)
        });

        res.status(201).json({
            msg: 'User registered successfully. Please verify OTP sent to your email.',
            user: { id: result.insertId, username, email, phone }
        });

    } catch (error) {
        console.error('Error in Registration:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ msg: 'Email and OTP are required' });
        }

        const [users] = await db.query(
            `SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`,
            [email]
        );
        if (users.length === 0) {
            return res.status(400).json({ msg: 'Invalid email' });
        }

        const user = users[0];

        // Check OTP validity
        if (String(user.otp) !== String(otp)) {
            return res.status(400).json({ msg: 'Invalid OTP' });
        }
        if (new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ msg: 'OTP expired' });
        }

        await db.query(
            `UPDATE ${TABLES.USER_TABLE} SET isVerified = 1, otp = NULL, otp_expiry = NULL WHERE id = ?`,
            [user.id]
        );

        res.status(200).json({
            msg: 'OTP verified successfully. Now you can login.',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Error in OTP Verification:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ msg: 'Email and password are required' });
        }

        const [users] = await db.query(
            `SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`,
            [email]
        );
        if (users.length === 0) {
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        const user = users[0];

        if (!user.isVerified) {
            return res.status(403).json({ msg: 'Please verify your email first' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        const token = generateToken(user.id, user.email);

        res.status(200).json({
            msg: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone
            }
        });

    } catch (error) {
        console.error('Error in Login:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};

const verifyToken = (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ msg: 'Invalid or expired token' });
        res.status(200).json({
            msg: 'Token is valid',
            user_id: decoded.id,
            email: decoded.email
        });
    });
};

const logout = (req, res) => {
    res.status(200).json({ msg: 'Logged out successfully (delete token on client side)' });
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required', status: false });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format', status: false });
        }
        const [users] = await db.query(`SELECT * FROM ${TABLES.USER_TABLE} WHERE email = ?`, [email]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found', status: false });
        }
        const user = users[0];
        const otp = Math.floor(100000 + Math.random() * 900000);
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        await db.query(`UPDATE ${TABLES.USER_TABLE} SET otp = ?, otp_expiry = ? WHERE id = ?`, [otp, expiry, user.id]);

        // Send OTP email with professional template
        try {
            await sendMail({
                to: email,
                subject: '92 Eats - Password Reset Request',
                text: `Your OTP for password reset is: ${otp}. It is valid for 15 minutes.`,
                html: getPasswordResetOTPEmail(otp)
            });
        } catch (mailErr) {
            console.error('Email sending error:', mailErr);
            return res.status(500).json({ error: 'Failed to send OTP email', status: false });
        }

        return res.status(200).json({ message: 'OTP sent successfully', status: true });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Server error', status: false });
    }
};

const changePassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ msg: 'Email, OTP, and new password are required' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ msg: 'Invalid email format' });
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
        
        // Send password change confirmation email
        try {
            await sendMail({
                to: email,
                subject: '92 Eats - Password Changed Successfully',
                text: `Your password has been successfully changed. If you didn't make this change, please contact support immediately.`,
                html: getPasswordChangedEmail(user.username)
            });
        } catch (mailErr) {
            console.error('Confirmation email error:', mailErr);
            // Don't fail the request if confirmation email fails
        }
            
        res.status(200).json({ msg: 'Password changed successfully' });

        
    } catch (error) {
        console.error('Error in changePassword:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
        
    }
}


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

        // Validations
        if (email && !isValidEmail(email)) {
            return res.status(400).json({ msg: 'Invalid email format' });
        }

        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({ msg: 'Phone number must be exactly 10 digits' });
        }

        if (password && !isValidPassword(password)) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters and include a letter, a number, and a special character' });
        }

        let hashedPassword = password ? await bcrypt.hash(password, 10) : userCheck[0].password;


        let profilePhoto = userCheck[0].profile || null;
        if (req.file) {
            profilePhoto = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        }

        const sql = `UPDATE ${TABLES.USER_TABLE} 
                     SET username = ?, email = ?, phone = ?, password = ?, profile = ?
                     WHERE id = ?`;

        await db.query(sql, [
            username || userCheck[0].username,
            email || userCheck[0].email,
            phone || userCheck[0].phone,
            hashedPassword,
            profilePhoto,
            id
        ]);

        res.status(200).json({
            msg: 'User updated successfully',
            user: {
                id,
                username: username || userCheck[0].username,
                email: email || userCheck[0].email,
                phone: phone || userCheck[0].phone,
                profile: profilePhoto
            }
        });
    } catch (error) {
        console.error('Error in Update:', error);
        res.status(500).json({ msg: 'Internal Server Error' });
    }
};





module.exports = {
    register,
    verifyOtp,
    login,
    verifyToken,
    logout,
    forgotPassword,
    changePassword,
    updateUser,
    getUsers,
    deleteUser
};
