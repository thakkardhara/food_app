const express = require('express');
const router = express.Router();
const authMiddleware = require('../utils/authValidation');
const authController = require('../controller/authController');

router.post('/login/send-code', authController.sendLoginCode);
router.post('/login/verify-code', authController.verifyLoginCode);
router.post('/device-token', authMiddleware, authController.saveDeviceToken);

module.exports = router;