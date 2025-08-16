const express = require('express');
const { register, login, getUsers, deleteUser, updateUser, verifyOtp, changePassword } = require('../controller/authController');
const authMiddleware = require('../utils/authValidation');
const router = express.Router();

router.post('/register',register)
router.post('/login',login)
router.get('/get-users',getUsers)
router.get('/get-users/:id',getUsers)
router.delete('/delete/:id',authMiddleware,deleteUser)
router.patch('/update/:id',authMiddleware,updateUser)
router.post('/verify-otp', verifyOtp);  
router.post('/change-password',changePassword)

module.exports = router;

