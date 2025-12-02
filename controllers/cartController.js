const User = require('../models/User');
const MenuItem = require('../models/MenuItem');

// Get cart for user or guest
exports.getCart = async (req, res) => {
    try {
        if (req.user) {
            // User is logged in
            const user = await User.findById(req.user.id).populate('cart.menuItem');
            return res.json({
                cart: user.cart || [],
                isLoggedIn: true,
                loyaltyPoints: user.loyaltyPoints
            });
        } else {
            // Guest user - get cart from session/cookies
            const guestCart = req.cookies.cart || [];
            return res.json({
                cart: guestCart,
                isLoggedIn: false,
                loyaltyPoints: 0
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add item to cart
exports.addToCart = async (req, res) => {
    try {
        const { menuItemId, quantity, customizations } = req.body;
        
        if (req.user) {
            // User is logged in
            const user = await User.findById(req.user.id);
            const existingItemIndex = user.cart.findIndex(
                item => item.menuItem.toString() === menuItemId
            );

            if (existingItemIndex > -1) {
                user.cart[existingItemIndex].quantity += quantity || 1;
            } else {
                user.cart.push({
                    menuItem: menuItemId,
                    quantity: quantity || 1,
                    customizations: customizations || {}
                });
            }

            await user.save();
            
            // Send response with loyalty points
            res.json({
                message: 'Item added to cart',
                cart: user.cart,
                loyaltyPoints: user.loyaltyPoints
            });
        } else {
            // Guest user - store in cookie
            const guestCart = req.cookies.cart || [];
            const existingItemIndex = guestCart.findIndex(
                item => item.menuItem === menuItemId
            );

            if (existingItemIndex > -1) {
                guestCart[existingItemIndex].quantity += quantity || 1;
            } else {
                guestCart.push({
                    menuItem: menuItemId,
                    quantity: quantity || 1,
                    customizations: customizations || {}
                });
            }

            // Set cookie for 7 days
            res.cookie('cart', guestCart, {
                maxAge: 7 * 24 * 60 * 60 * 1000,
                httpOnly: true
            });
            
            res.json({
                message: 'Item added to cart',
                cart: guestCart,
                loyaltyPoints: 0
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update cart item
exports.updateCartItem = async (req, res) => {
    try {
        const { itemId, quantity } = req.body;

        if (req.user) {
            const user = await User.findById(req.user.id);
            const itemIndex = user.cart.findIndex(
                item => item._id.toString() === itemId
            );

            if (itemIndex > -1) {
                if (quantity <= 0) {
                    user.cart.splice(itemIndex, 1);
                } else {
                    user.cart[itemIndex].quantity = quantity;
                }
                await user.save();
            }

            res.json({ message: 'Cart updated', cart: user.cart });
        } else {
            const guestCart = req.cookies.cart || [];
            const itemIndex = guestCart.findIndex(
                item => item._id === itemId
            );

            if (itemIndex > -1) {
                if (quantity <= 0) {
                    guestCart.splice(itemIndex, 1);
                } else {
                    guestCart[itemIndex].quantity = quantity;
                }
                res.cookie('cart', guestCart, {
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    httpOnly: true
                });
            }

            res.json({ message: 'Cart updated', cart: guestCart });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Clear cart
exports.clearCart = async (req, res) => {
    try {
        if (req.user) {
            const user = await User.findById(req.user.id);
            user.cart = [];
            await user.save();
        } else {
            res.clearCookie('cart');
        }

        res.json({ message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Transfer guest cart to user cart after login
exports.transferGuestCart = async (req, res) => {
    try {
        const guestCart = req.cookies.cart || [];
        const user = await User.findById(req.user.id).populate('cart.menuItem');

        for (const guestItem of guestCart) {
            const existingItemIndex = user.cart.findIndex(
                item => item.menuItem._id.toString() === guestItem.menuItem
            );

            if (existingItemIndex > -1) {
                user.cart[existingItemIndex].quantity += guestItem.quantity;
            } else {
                user.cart.push({
                    menuItem: guestItem.menuItem,
                    quantity: guestItem.quantity,
                    customizations: guestItem.customizations || {}
                });
            }
        }

        await user.save();
        res.clearCookie('cart');
        
        res.json({
            message: 'Cart transferred successfully',
            cart: user.cart
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
// Remove item from cart
exports.removeFromCart = async (req, res) => {
    try {
        const { itemId } = req.params;

        if (req.user) {
            // User is logged in
            const user = await User.findById(req.user.id);
            const itemIndex = user.cart.findIndex(
                item => item._id.toString() === itemId
            );

            if (itemIndex > -1) {
                user.cart.splice(itemIndex, 1);
                await user.save();
            }

            return res.json({ 
                message: 'Item removed from cart', 
                cart: user.cart 
            });
        } else {
            // Guest user
            const guestCart = req.cookies.cart || [];
            const itemIndex = guestCart.findIndex(
                item => item._id === itemId
            );

            if (itemIndex > -1) {
                guestCart.splice(itemIndex, 1);
                res.cookie('cart', guestCart, {
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    httpOnly: true
                });
            }

            return res.json({ 
                message: 'Item removed from cart', 
                cart: guestCart 
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get cart count
exports.getCartCount = async (req, res) => {
    try {
        if (req.user) {
            const user = await User.findById(req.user.id);
            const count = user.cart.reduce((total, item) => total + item.quantity, 0);
            return res.json({ count });
        } else {
            const guestCart = req.cookies.cart || [];
            const count = guestCart.reduce((total, item) => total + item.quantity, 0);
            return res.json({ count });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
    // Add this method to your existing cartController.js
exports.getCartCount = async (req, res) => {
    try {
        if (req.user) {
            // User is logged in
            const user = await User.findById(req.user.id);
            const count = user.cart.reduce((total, item) => total + item.quantity, 0);
            return res.json({ count });
        } else {
            // Guest user
            const guestCart = req.cookies.cart || [];
            const count = guestCart.reduce((total, item) => total + item.quantity, 0);
            return res.json({ count });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
};