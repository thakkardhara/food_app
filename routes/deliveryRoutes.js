const express = require("express");
const router = express.Router();
const deliveryController = require("../controller/deliveryController");
const { authenticateToken } = require("../middlewares/authMiddleware");

// Public: get ranges for a specific restaurant
router.get("/restaurant/:restaurant_id", deliveryController.getByRestaurant);

// Public: get all ranges
router.get("/", deliveryController.getAll);

// Protected: create new range (restaurant creates for itself using token)
router.post("/", authenticateToken, deliveryController.create);

// Protected: update range by delivery_id
router.put("/:delivery_id", authenticateToken, deliveryController.update);

// Protected: delete range
router.delete("/:delivery_id", authenticateToken, deliveryController.delete);

module.exports = router;
