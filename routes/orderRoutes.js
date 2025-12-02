const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Try to load controller, but provide fallbacks if not available
let orderController;
try {
    orderController = require('../controllers/orderController');
} catch (error) {
    console.warn('orderController not found, using placeholder functions');
    orderController = {
        getAllOrders: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        getPaginatedOrders: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        getOrderById: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        createOrder: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        updateOrder: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        deleteOrder: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        updateOrderStatus: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        cancelOrder: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        getUserOrders: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        getOrderStats: (req, res) => res.status(501).json({ message: 'Not implemented' }),
        getLoyaltySummary: (req, res) => res.status(501).json({ message: 'Not implemented' })
    };
}

// Order routes
router.get('/', authMiddleware.required, authMiddleware.isAdmin, orderController.getAllOrders);
router.get('/paginated', authMiddleware.required, authMiddleware.isAdmin, orderController.getPaginatedOrders);
router.get('/:id', authMiddleware.optional, orderController.getOrderById);
router.post('/', authMiddleware.optional, orderController.createOrder);
router.put('/:id', authMiddleware.required, authMiddleware.isAdmin, orderController.updateOrder);
router.delete('/:id', authMiddleware.required, authMiddleware.isAdmin, orderController.deleteOrder);
router.patch('/:id/status', authMiddleware.required, authMiddleware.isAdmin, orderController.updateOrderStatus);
router.patch('/:id/cancel', authMiddleware.optional, orderController.cancelOrder);
router.get('/my-orders', authMiddleware.required, orderController.getUserOrders);
router.get('/stats', authMiddleware.required, authMiddleware.isAdmin, orderController.getOrderStats);
router.get('/loyalty-summary', authMiddleware.optional, orderController.getLoyaltySummary);

module.exports = router;