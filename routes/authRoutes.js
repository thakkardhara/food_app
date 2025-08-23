// const express = require('express');
// const { register, login, getUsers, deleteUser, updateUser, verifyOtp, changePassword } = require('../controller/authController');
// const authMiddleware = require('../utils/authValidation');
// const router = express.Router();

// router.post('/register',register)
// router.post('/login',login)
// router.get('/get-users',getUsers)
// router.get('/get-users/:id',getUsers)
// router.delete('/delete/:id',authMiddleware,deleteUser)
// router.patch('/update/:id',authMiddleware,updateUser)
// router.post('/verify-otp', verifyOtp);  
// router.post('/change-password',changePassword)

// module.exports = router;


const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const authMiddleware = require('../utils/authValidation');

// Register (no token here)
router.post('/register', authController.register);

// Verify OTP (just mark verified)
router.post('/verify-otp', authController.verifyOtp);

// Login (generate 30d token if verified)
router.post('/login', authController.login);

// Verify token (optional)
router.get('/verify-token', authController.verifyToken);

// Logout (optional)
router.post('/logout', authController.logout);

//otp send [used for both forgot password and resend otp at login]
router.post('/otp-send',authController.forgotPassword)

//forgot password
router.post('/change-password',authController.changePassword)
router.get('/get-users',authController.getUsers)
router.get('/get-users/:id',authController.getUsers)
router.delete('/delete/:id',authMiddleware,authController.deleteUser)
router.patch('/update/:id',authMiddleware,authController.updateUser)

module.exports = router;
