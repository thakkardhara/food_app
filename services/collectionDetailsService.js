const collectionDetailsRepository = require("../repository/collectionDetailsRepository");
const orderRepository = require("../repository/orderRepository");

class CollectionDetailsService {
  async createCollectionDetails(collectionData) {
    const { order_id, arrival_type, vehicle_number, alternate_phone, additional_notes } = collectionData;

    if (!order_id) {
      throw new Error("order_id is required");
    }

    if (!arrival_type) {
      throw new Error("arrival_type is required");
    }

    const validArrivalTypes = ["car", "bike", "walk"];
    if (!validArrivalTypes.includes(arrival_type)) {
      throw new Error(
        `Invalid arrival_type. Must be one of: ${validArrivalTypes.join(", ")}`
      );
    }

    const order = await orderRepository.findOrderById(order_id);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.order_type !== "collection") {
      throw new Error(
        "Collection details can only be added for orders with order_type 'collection'"
      );
    }

    const existingDetails = await collectionDetailsRepository.getCollectionDetailsByOrderId(order_id);
    if (existingDetails) {
      throw new Error("Collection details already exist for this order. Use update endpoint instead.");
    }

    const collectionDetails = await collectionDetailsRepository.createCollectionDetails({
      order_id,
      arrival_type,
      vehicle_number: vehicle_number || null,
      alternate_phone: alternate_phone || null,
      additional_notes: additional_notes || null,
    });

    await collectionDetailsRepository.linkCollectionDetailsToOrder(
      order_id,
      collectionDetails.id
    );

    return {
      message: "Collection details created successfully",
      data: collectionDetails,
    };
  }

  async getCollectionDetailsByOrderId(orderId) {
    if (!orderId) {
      throw new Error("order_id is required");
    }

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.order_type !== "collection") {
      throw new Error(
        "This order is not a collection type order"
      );
    }

    const collectionDetails = await collectionDetailsRepository.getCollectionDetailsByOrderId(orderId);

    if (!collectionDetails) {
      throw new Error("Collection details not found for this order");
    }

    return collectionDetails;
  }

  async updateCollectionDetails(orderId, updateData) {
    if (!orderId) {
      throw new Error("order_id is required");
    }

    const { arrival_type, vehicle_number, alternate_phone, additional_notes } = updateData;

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.order_type !== "collection") {
      throw new Error(
        "Collection details can only be updated for orders with order_type 'collection'"
      );
    }

    if (arrival_type) {
      const validArrivalTypes = ["car", "bike", "walk"];
      if (!validArrivalTypes.includes(arrival_type)) {
        throw new Error(
          `Invalid arrival_type. Must be one of: ${validArrivalTypes.join(", ")}`
        );
      }
    }

    const existingDetails = await collectionDetailsRepository.getCollectionDetailsByOrderId(orderId);
    if (!existingDetails) {
      throw new Error("Collection details not found for this order. Use create endpoint instead.");
    }

    // vehicle_number is optional for all arrival types
    // Note: For car/bike it's recommended but not mandatory

    const updatedDetails = await collectionDetailsRepository.updateCollectionDetails(
      orderId,
      {
        arrival_type,
        vehicle_number,
        alternate_phone,
        additional_notes,
      }
    );

    return {
      message: "Collection details updated successfully",
      data: updatedDetails,
    };
  }

  async deleteCollectionDetails(orderId) {
    if (!orderId) {
      throw new Error("order_id is required");
    }

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.order_type !== "collection") {
      throw new Error(
        "Collection details can only be deleted for orders with order_type 'collection'"
      );
    }

    const existingDetails = await collectionDetailsRepository.getCollectionDetailsByOrderId(orderId);
    if (!existingDetails) {
      throw new Error("Collection details not found for this order");
    }

    await collectionDetailsRepository.linkCollectionDetailsToOrder(orderId, null);

    const result = await collectionDetailsRepository.deleteCollectionDetails(orderId);

    return result;
  }

  async getCollectionDetailsByRestaurant(restaurantId, filters = {}) {
    if (!restaurantId) {
      throw new Error("restaurant_id is required");
    }

    const collectionDetails = await collectionDetailsRepository.getCollectionDetailsByRestaurant(
      restaurantId,
      filters
    );

    return collectionDetails;
  }
}

module.exports = new CollectionDetailsService();
