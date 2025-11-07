const collectionDetailsService = require("../services/collectionDetailsService");

class CollectionDetailsController {
  async createCollectionDetails(req, res) {
    try {
      const collectionData = req.body;

      const requiredFields = ["order_id", "arrival_type"];
      const missingFields = requiredFields.filter(
        (field) => !collectionData[field]
      );

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required fields: ${missingFields.join(", ")}`,
        });
      }

      const result = await collectionDetailsService.createCollectionDetails(
        collectionData
      );

      res.status(201).json(result);
    } catch (error) {
      console.error("Create collection details error:", error.message);

      if (
        error.message.includes("required") ||
        error.message.includes("Invalid") ||
        error.message.includes("already exist")
      ) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getCollectionDetailsByOrderId(req, res) {
    try {
      const { order_id } = req.params;

      if (!order_id) {
        return res.status(400).json({ error: "order_id is required" });
      }

      const collectionDetails = await collectionDetailsService.getCollectionDetailsByOrderId(
        order_id
      );

      res.status(200).json(collectionDetails);
    } catch (error) {
      console.error("Get collection details error:", error.message);

      if (error.message.includes("not found") || error.message.includes("not a collection")) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  async updateCollectionDetails(req, res) {
    try {
      const { order_id } = req.params;
      const updateData = req.body;

      if (!order_id) {
        return res.status(400).json({ error: "order_id is required" });
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No update data provided" });
      }

      const result = await collectionDetailsService.updateCollectionDetails(
        order_id,
        updateData
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Update collection details error:", error.message);

      if (
        error.message.includes("required") ||
        error.message.includes("Invalid") ||
        error.message.includes("Use create endpoint")
      ) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  async deleteCollectionDetails(req, res) {
    try {
      const { order_id } = req.params;

      if (!order_id) {
        return res.status(400).json({ error: "order_id is required" });
      }

      const result = await collectionDetailsService.deleteCollectionDetails(
        order_id
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Delete collection details error:", error.message);

      if (error.message.includes("not found")) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ error: "Internal server error" });
    }
  }

  async getCollectionDetailsByRestaurant(req, res) {
    try {
      const restaurantId = req.restaurant?.restaurant_id;
      const { arrival_type, date, limit, offset } = req.query;

      if (!restaurantId) {
        return res
          .status(403)
          .json({ error: "Restaurant ID missing in token" });
      }

      const collectionDetails = await collectionDetailsService.getCollectionDetailsByRestaurant(
        restaurantId,
        {
          arrival_type,
          date,
          limit: parseInt(limit, 10) || 50,
          offset: parseInt(offset, 10) || 0,
        }
      );

      res.status(200).json(collectionDetails);
    } catch (error) {
      console.error("Get restaurant collection details error:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new CollectionDetailsController();
