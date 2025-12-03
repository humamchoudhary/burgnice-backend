const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// Try to load controller, but provide fallbacks if not available
let orderController;
try {
  orderController = require("../controllers/orderController");
} catch (error) {
  console.warn("orderController not found, using placeholder functions");
}

// Order routes
router.get(
  "/",
  authMiddleware.required,
  authMiddleware.isAdmin,
  orderController.getAllOrders,
);
router.get(
  "/paginated",
  authMiddleware.required,
  authMiddleware.isAdmin,
  orderController.getPaginatedOrders,
);

router.get(
  "/my-orders",
  authMiddleware.required,
  orderController.getUserOrders,
);
router.get(
  "/stats",
  authMiddleware.required,
  authMiddleware.isAdmin,
  orderController.getOrderStats,
);
router.get(
  "/loyalty-summary",
  authMiddleware.required,
  (req, res, next) => {
    console.log("✓ Loyalty summary route hit!");
    console.log("User:", req.user);
    next();
  },
  orderController.getLoyaltySummary,
);

router.get("/:id", authMiddleware.optional, orderController.getOrderById);
router.post("/", authMiddleware.optional, orderController.createOrder);
router.put(
  "/:id",
  authMiddleware.required,
  authMiddleware.isAdmin,
  orderController.updateOrder,
);
router.delete(
  "/:id",
  authMiddleware.required,
  authMiddleware.isAdmin,
  orderController.deleteOrder,
);
router.patch(
  "/:id/status",
  authMiddleware.required,
  authMiddleware.isAdmin,
  orderController.updateOrderStatus,
);
router.patch(
  "/:id/cancel",
  authMiddleware.optional,
  orderController.cancelOrder,
);

module.exports = router;
