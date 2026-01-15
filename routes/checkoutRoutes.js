const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

// Try to load controller, but provide fallbacks if not available
let checkoutController;
try {
  checkoutController = require("../controllers/checkoutController");
} catch (error) {
  console.warn("checkoutController not found, using placeholder functions");
  checkoutController = {};
  // Add placeholder functions for all methods
  const placeholder = (req, res) =>
    res.status(501).json({ message: "Controller not implemented" });
  [
    "createCheckout",
    "getCheckoutById",
    "updateCheckout",
    "deleteCheckout",
    "updateCheckoutStatus",
    "cancelCheckout",
  ].forEach((method) => {
    checkoutController[method] = placeholder;
  });
}

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  checkoutController.handleWebhook,
);

router.post("/create-session", auth.required, checkoutController.createSession);
router.get("/status", auth.required, checkoutController.checkStatus);

module.exports = router;
