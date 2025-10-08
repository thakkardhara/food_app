const express = require("express");
const router = express.Router();
const restaurantController = require("../controller/restaurantController");
const {
  authenticateToken,
  activeRestaurantOnly,
} = require("../middlewares/authMiddleware");

const { upload, handleUploadError } = require("../configs/multerConfig");

router.post(
  "/register/admin",
  upload.single("profile_image"),
  handleUploadError,
  restaurantController.registerByAdmin
);

router.post(
  "/register",
  upload.single("profile_image"),
  handleUploadError,
  restaurantController.register
);

// UPDATE THE ALL FILD

router.put(
  "/update",
  authenticateToken,
  activeRestaurantOnly,
  upload.single("profile_image"),
  handleUploadError,
  restaurantController.updateAllFields
);
// Profile image management routes
router.post(
  "/profile-image",
  authenticateToken,
  activeRestaurantOnly,
  upload.single("profile_image"),
  handleUploadError,
  restaurantController.updateProfileImage
);

router.delete(
  "/profile-image",
  authenticateToken,
  activeRestaurantOnly,
  restaurantController.deleteProfileImage
);

// Update profile with optional image
router.patch(
  "/profile",
  authenticateToken,
  activeRestaurantOnly,
  upload.single("profile_image"),
  handleUploadError,
  restaurantController.updateProfile
);

// get all restaurant

// router.get('/getAllRestaurnt', restaurantController.allRestaurants)
router.get("/getAllRestaurant", restaurantController.allRestaurants);
// router.get('/getAllRestaurant/:restaurantId', restaurantController.getRestaurantById);

router.post("/login", restaurantController.login);

router.patch(
  "/change-password",
  authenticateToken,
  restaurantController.changePassword
);

router.get("/profile", authenticateToken, restaurantController.getProfile);

router.get(
  "/dashboard",
  authenticateToken,
  activeRestaurantOnly,
  (req, res) => {
    res.json({
      message: "Welcome to restaurant dashboard",
      restaurant: req.restaurant,
    });
  }
);

router.use(authenticateToken);

router.get("/settings", restaurantController.getSettings);

// Update all settings at once
router.patch("/settings", restaurantController.updateSettings);

// Toggle online/offline status
router.patch("/toggle-online", restaurantController.toggleOnlineStatus);

// Toggle card payment
router.patch("/toggle-card-payment", restaurantController.toggleCardPayment);

// Toggle cash payment
router.patch("/toggle-cash-payment", restaurantController.toggleCashPayment);

// Toggle delivery service
router.patch("/toggle-delivery", restaurantController.toggleDelivery);

// Toggle takeaway service
router.patch("/toggle-takeaway", restaurantController.toggleTakeaway);

router.use((error, req, res, next) => {
  console.error("Restaurant route error:", error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }

  res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
