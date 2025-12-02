const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

// Check if method exists, otherwise use placeholder
const getHandler = (methodName) => {
    if (cartController[methodName] && typeof cartController[methodName] === 'function') {
        return cartController[methodName];
    }
    console.warn(`Method ${methodName} not found, using placeholder`);
    return (req, res) => res.status(501).json({ 
        message: `Method ${methodName} not implemented yet` 
    });
};

// GET /api/cart - Get cart
router.get('/', authMiddleware.optional, getHandler('getCart'));

// POST /api/cart/add - Add to cart
router.post('/add', authMiddleware.optional, getHandler('addToCart'));

// PUT /api/cart/update - Update cart item
router.put('/update', authMiddleware.optional, getHandler('updateCartItem'));

// DELETE /api/cart/clear - Clear cart
router.delete('/clear', authMiddleware.optional, getHandler('clearCart'));

// POST /api/cart/transfer - Transfer guest cart
router.post('/transfer', authMiddleware.required, getHandler('transferGuestCart'));

// DELETE /api/cart/:itemId - Remove item from cart (if method exists)
router.delete('/:itemId', authMiddleware.optional, getHandler('removeFromCart'));

// GET /api/cart/count - Get cart count (if method exists)
router.get('/count', authMiddleware.optional, getHandler('getCartCount'));

module.exports = router;