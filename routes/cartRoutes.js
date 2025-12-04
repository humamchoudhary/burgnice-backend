const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/authMiddleware');
console.log('Cart controller methods:', Object.keys(cartController));
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
router.get('/', auth.optional, getHandler('getCart'));

// POST /api/cart/add - Add to cart
router.post('/add', auth.optional, getHandler('addToCart'));

// PUT /api/cart/update - Update cart item
router.put('/update', auth.optional, getHandler('updateCartItem'));

// DELETE /api/cart/remove/:cartItemId - Remove item from cart
router.delete('/remove/:cartItemId', auth.optional, getHandler('removeFromCart'));

// DELETE /api/cart/clear - Clear cart
router.delete('/clear', auth.optional, getHandler('clearCart'));

// POST /api/cart/transfer - Transfer guest cart
router.post('/transfer', auth.required, getHandler('transferGuestCart'));

// GET /api/cart/count - Get cart count
router.get('/count', auth.optional, getHandler('getCartCount'));

// POST /api/cart/sync - Sync cart (new route from your changes)
router.post('/sync', auth.required, getHandler('syncCart'));

// DELETE /api/cart/:itemId - Legacy route (keep for backward compatibility)
router.delete('/:itemId', auth.optional, (req, res) => {
    res.status(410).json({
        message: 'This endpoint is deprecated. Use /remove/:cartItemId instead',
        newEndpoint: `/api/cart/remove/${req.params.itemId}`
    });
});

module.exports = router;