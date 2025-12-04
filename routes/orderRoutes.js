const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

// Try to load controller, but provide fallbacks if not available
let orderController;
try {
  orderController = require("../controllers/orderController");
} catch (error) {
  console.warn("orderController not found, using placeholder functions");
  orderController = {};
  // Add placeholder functions for all methods
  const placeholder = (req, res) => res.status(501).json({ message: "Controller not implemented" });
  ['createOrder', 'getAllOrders', 'getPaginatedOrders', 'getOrderById', 'updateOrder', 
   'deleteOrder', 'updateOrderStatus', 'cancelOrder', 'getUserOrders', 'getOrderStats',
   'getLoyaltySummary', 'calculateLoyaltyDiscount', 'getUserOrderHistory', 
   'getOrderDetails', 'getOrderTracking'].forEach(method => {
    orderController[method] = placeholder;
  });
}

// Public routes
router.post("/", auth.optional, orderController.createOrder);

// User routes (require authentication)
router.get("/my-orders", auth.required, orderController.getUserOrders);
router.get("/history", auth.required, orderController.getUserOrderHistory);
router.get("/loyalty-summary", auth.required, orderController.getLoyaltySummary);
router.post("/calculate-loyalty-discount", auth.required, orderController.calculateLoyaltyDiscount);

// Order detail routes (with ID)
router.get("/:id", auth.optional, orderController.getOrderById); // Keep for backward compatibility
router.get("/:id/details", auth.required, orderController.getOrderDetails); // New detailed endpoint
router.get("/:id/tracking", auth.required, orderController.getOrderTracking);
router.patch("/:id/cancel", auth.required, orderController.cancelOrder);

// Admin routes - FIXED THESE LINES
router.get("/", auth.required, auth.isAdmin, orderController.getAllOrders);
router.get("/paginated", auth.required, auth.isAdmin, orderController.getPaginatedOrders);
router.put("/:id", auth.required, auth.isAdmin, orderController.updateOrder);
router.delete("/:id", auth.required, auth.isAdmin, orderController.deleteOrder);
router.patch("/:id/status", auth.required, auth.isAdmin, orderController.updateOrderStatus);
router.get("/stats", auth.required, auth.isAdmin, orderController.getOrderStats);

module.exports = router;