const deliveryRepository = require("../repository/deliveryRepository");
const crypto = require("crypto");

class DeliveryService {
  generateDeliveryId() {
    const ts = Date.now().toString().slice(-6);
    const rnd = crypto.randomBytes(2).toString("hex");
    return `d${ts}${rnd}`;
  }

  validateRange(data) {
    const { min_km, max_km, charge } = data;
    if (min_km === undefined || max_km === undefined || charge === undefined) {
      throw new Error("min_km, max_km and charge are required");
    }
    const min = parseFloat(min_km);
    const max = parseFloat(max_km);
    const ch = parseFloat(charge);
    if (isNaN(min) || isNaN(max) || isNaN(ch)) {
      throw new Error("min_km, max_km and charge must be numbers");
    }
    if (min < 0 || max <= min) {
      throw new Error("Invalid range values");
    }
    return { min_km: min, max_km: max, charge: ch };
  }

  async createRange(restaurantId, data) {
    try {
      const parsed = this.validateRange(data);
      const deliveryId = this.generateDeliveryId();
      await deliveryRepository.createRange({
        delivery_id: deliveryId,
        restaurant_id: restaurantId,
        min_km: parsed.min_km,
        max_km: parsed.max_km,
        charge: parsed.charge,
      });
      return { delivery_id: deliveryId, ...parsed };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getRangesByRestaurant(restaurantId) {
    return await deliveryRepository.getRangesByRestaurant(restaurantId);
  }

  async getAllRanges() {
    return await deliveryRepository.getAllRanges();
  }

  async updateRange(restaurantId, deliveryId, updateData) {
    try {
      const existing = await deliveryRepository.getRangeById(deliveryId);
      if (!existing) throw new Error("Delivery range not found");
      if (existing.restaurant_id !== restaurantId)
        throw new Error("Unauthorized");

      // Use incoming values when provided, otherwise fall back to existing values
      const newMin =
        updateData.min_km !== undefined
          ? parseFloat(updateData.min_km)
          : parseFloat(existing.min_km);
      const newMax =
        updateData.max_km !== undefined
          ? parseFloat(updateData.max_km)
          : parseFloat(existing.max_km);
      const newCharge =
        updateData.charge !== undefined
          ? parseFloat(updateData.charge)
          : parseFloat(existing.charge);

      if (isNaN(newMin) || isNaN(newMax) || isNaN(newCharge)) {
        throw new Error("min_km, max_km and charge must be numbers");
      }

      if (newMin < 0 || newMax <= newMin) {
        throw new Error("Invalid range values: ensure 0 <= min_km < max_km");
      }

      const validated = { min_km: newMin, max_km: newMax, charge: newCharge };

      await deliveryRepository.updateRange(deliveryId, validated);
      return { delivery_id: deliveryId, ...validated };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async deleteRange(restaurantId, deliveryId) {
    try {
      const existing = await deliveryRepository.getRangeById(deliveryId);
      if (!existing) throw new Error("Delivery range not found");
      if (existing.restaurant_id !== restaurantId)
        throw new Error("Unauthorized");

      await deliveryRepository.deleteRange(deliveryId);
      return { message: "Deleted" };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new DeliveryService();
