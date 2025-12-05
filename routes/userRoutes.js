// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/user/profile - Get user profile (detailed)
router.get('/profile', authMiddleware.required, userController.getUserProfile);

// GET /api/user/orders - Get user orders with pagination
router.get('/orders', authMiddleware.required, userController.getUserOrders);

// GET /api/user/orders/:orderId - Get specific order details
router.get('/orders/:orderId', authMiddleware.required, userController.getOrderDetails);

module.exports = router;