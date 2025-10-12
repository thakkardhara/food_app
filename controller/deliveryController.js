const deliveryService = require("../services/deliveryService");

class DeliveryController {
  // Public: get ranges for a restaurant (by restaurant id in URL)
  async getByRestaurant(req, res) {
    try {
      const restaurantId = req.params.restaurant_id;
      if (!restaurantId)
        return res.status(400).json({ error: "restaurant_id is required" });
      const ranges = await deliveryService.getRangesByRestaurant(restaurantId);
      res.status(200).json(ranges);
    } catch (error) {
      console.error("Get ranges error:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Public: get all ranges across restaurants
  async getAll(req, res) {
    try {
      const rows = await deliveryService.getAllRanges();
      res.status(200).json(rows);
    } catch (error) {
      console.error("Get all ranges error:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Protected: create range for authenticated restaurant
  async create(req, res) {
    try {
      const restaurantId = req.restaurant && req.restaurant.restaurant_id;
      if (!restaurantId)
        return res.status(403).json({ error: "Authentication required" });

      const data = req.body;
      const created = await deliveryService.createRange(restaurantId, data);
      res.status(201).json(created);
    } catch (error) {
      console.error("Create range error:", error.message);
      if (
        error.message === "min_km, max_km and charge are required" ||
        error.message === "Invalid range values"
      ) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === "Unauthorized")
        return res.status(403).json({ error: "Unauthorized" });
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Protected: update range
  async update(req, res) {
    try {
      const restaurantId = req.restaurant && req.restaurant.restaurant_id;
      if (!restaurantId)
        return res.status(403).json({ error: "Authentication required" });
      const deliveryId = req.params.delivery_id;
      const updated = await deliveryService.updateRange(
        restaurantId,
        deliveryId,
        req.body
      );
      res.status(200).json(updated);
    } catch (error) {
      console.error("Update range error:", error.message);
      if (error.message === "Unauthorized")
        return res.status(403).json({ error: "Unauthorized" });
      if (error.message === "Delivery range not found")
        return res.status(404).json({ error: "Not found" });
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Protected: delete range
  async delete(req, res) {
    try {
      const restaurantId = req.restaurant && req.restaurant.restaurant_id;
      if (!restaurantId)
        return res.status(403).json({ error: "Authentication required" });
      const deliveryId = req.params.delivery_id;
      const result = await deliveryService.deleteRange(
        restaurantId,
        deliveryId
      );
      res.status(200).json(result);
    } catch (error) {
      console.error("Delete range error:", error.message);
      if (error.message === "Unauthorized")
        return res.status(403).json({ error: "Unauthorized" });
      if (error.message === "Delivery range not found")
        return res.status(404).json({ error: "Not found" });
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new DeliveryController();
