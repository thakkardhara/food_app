const express = require('express');
const router = express.Router();
const authMiddleware = require('../utils/authValidation');
const { addAddress } = require('../controller/addressController');

router.post('/address', authMiddleware, addAddress);

module.exports = router;
