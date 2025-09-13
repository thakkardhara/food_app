const express = require('express');
const router = express.Router();
const authMiddleware = require('../utils/authValidation');
const { addAddress, getMyAddresses, getAddress, deleteAddress, updateAddress } = require('../controller/addressController');

router.post('/address', authMiddleware, addAddress);
router.get('/address', getAddress);          
router.get('/address/:id', getAddress);    

router.get('/my-addresses', authMiddleware, getMyAddresses); 

router.delete('/address/:id', authMiddleware, deleteAddress);

router.patch('/address/:id', authMiddleware, updateAddress);

module.exports = router;
