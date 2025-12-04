const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Register new user
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ 
                message: 'User already exists with this email or username' 
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        // Sync session cart to database for new user (if exists)
        if (req.session && req.session.cart && req.session.cart.length > 0) {
            await syncSessionCartToUser(user._id, req.session.cart);
            delete req.session.cart; // Clear session cart after sync
        }

        // Create token
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Get user with populated cart
        const populatedUser = await User.findById(user._id)
            .populate('cart.menuItem', 'name price image category')
            .populate('cart.menuItem.category', 'name');
        
        const cartItems = populatedUser.cart.map(item => ({
            id: item._id,
            menuItem: item.menuItem,
            quantity: item.quantity,
            customizations: item.customizations || {},
            addedAt: item.addedAt,
            total: item.menuItem ? item.menuItem.price * item.quantity : 0
        }));

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                loyaltyPoints: user.loyaltyPoints
            },
            cart: cartItems,
            cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            sessionCartSynced: req.session && req.session.cart ? true : false
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login user with cart sync
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Sync session cart to database if exists
        if (req.session && req.session.cart && req.session.cart.length > 0) {
            await syncSessionCartToUser(user._id, req.session.cart);
            delete req.session.cart; // Clear session cart after sync
        }

        // Create token
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Get user with populated cart
        const populatedUser = await User.findById(user._id)
            .populate('cart.menuItem', 'name price image category')
            .populate('cart.menuItem.category', 'name');
        
        const cartItems = populatedUser.cart.map(item => ({
            id: item._id,
            menuItem: item.menuItem,
            quantity: item.quantity,
            customizations: item.customizations || {},
            addedAt: item.addedAt,
            total: item.menuItem ? item.menuItem.price * item.quantity : 0
        }));

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                loyaltyPoints: user.loyaltyPoints
            },
            cart: cartItems,
            cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            sessionCartSynced: req.session && req.session.cart ? true : false
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Logout user
exports.logout = async (req, res) => {
    try {
        // In a stateless JWT system, we can't invalidate tokens on the server
        // The client should discard the token
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get user profile with cart
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('cart.menuItem', 'name price image category')
            .populate('cart.menuItem.category', 'name');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const cartItems = user.cart.map(item => ({
            id: item._id,
            menuItem: item.menuItem,
            quantity: item.quantity,
            customizations: item.customizations || {},
            addedAt: item.addedAt,
            total: item.menuItem ? item.menuItem.price * item.quantity : 0
        }));

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                loyaltyPoints: user.loyaltyPoints,
                totalSpent: user.totalSpent,
                loyaltyPointsUsed: user.loyaltyPointsUsed,
                createdAt: user.createdAt
            },
            cart: cartItems,
            cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            loyaltyPoints: user.loyaltyPoints
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const updates = {};
        
        if (req.body.username) updates.username = req.body.username;
        if (req.body.email) updates.email = req.body.email;
        // Note: password updates should be separate endpoint
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Refresh token (optional - for implementing refresh tokens)
exports.refreshToken = async (req, res) => {
    try {
        // This would require implementing refresh tokens
        // For now, return a simple response
        res.status(501).json({ message: 'Refresh token not implemented yet' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        // This would typically send a password reset email
        // For now, return a placeholder response
        res.status(501).json({ 
            message: 'Password reset functionality not implemented yet',
            note: 'Would typically send a reset email to: ' + email
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        // This would handle password reset with a token
        res.status(501).json({ 
            message: 'Password reset functionality not implemented yet' 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Sync cart explicitly (optional endpoint)
exports.syncCart = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const sessionCart = req.session?.cart || req.body.cart || [];
        
        if (sessionCart.length === 0) {
            // Return current cart from database
            const populatedUser = await User.findById(req.user.id)
                .populate('cart.menuItem', 'name price image category')
                .populate('cart.menuItem.category', 'name');
            
            return res.json({ 
                message: 'No cart items to sync',
                cart: populatedUser.cart 
            });
        }

        let syncedCount = 0;
        for (const sessionItem of sessionCart) {
            const existingItemIndex = user.cart.findIndex(
                item => item.menuItem && item.menuItem.toString() === sessionItem.menuItemId
            );

            if (existingItemIndex > -1) {
                // Merge quantities
                user.cart[existingItemIndex].quantity += sessionItem.quantity;
                user.cart[existingItemIndex].addedAt = new Date();
                syncedCount++;
            } else {
                // Add new item
                user.cart.push({
                    menuItem: sessionItem.menuItemId,
                    quantity: sessionItem.quantity,
                    customizations: sessionItem.customizations || {},
                    addedAt: new Date()
                });
                syncedCount++;
            }
        }

        user.lastCartUpdate = new Date();
        await user.save();

        // Clear session cart
        if (req.session) {
            delete req.session.cart;
        }

        // Get populated response
        const populatedUser = await User.findById(req.user.id)
            .populate('cart.menuItem', 'name price image category')
            .populate('cart.menuItem.category', 'name');

        const cartItems = populatedUser.cart.map(item => ({
            id: item._id,
            menuItem: item.menuItem,
            quantity: item.quantity,
            customizations: item.customizations || {},
            addedAt: item.addedAt,
            total: item.menuItem ? item.menuItem.price * item.quantity : 0
        }));

        res.json({
            message: `Synced ${syncedCount} items to database`,
            cart: cartItems,
            cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to sync session cart to user
async function syncSessionCartToUser(userId, sessionCart) {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        let syncedItems = 0;
        
        for (const sessionItem of sessionCart) {
            const existingItemIndex = user.cart.findIndex(
                item => item.menuItem && item.menuItem.toString() === sessionItem.menuItemId
            );

            if (existingItemIndex > -1) {
                // Merge quantities
                user.cart[existingItemIndex].quantity += sessionItem.quantity;
                user.cart[existingItemIndex].addedAt = new Date();
                syncedItems++;
            } else {
                // Add new item
                user.cart.push({
                    menuItem: sessionItem.menuItemId,
                    quantity: sessionItem.quantity,
                    customizations: sessionItem.customizations || {},
                    addedAt: new Date()
                });
                syncedItems++;
            }
        }

        user.lastCartUpdate = new Date();
        await user.save();
        
        console.log(`Synced ${syncedItems} cart items from session to user ${userId}`);
        return syncedItems;
    } catch (error) {
        console.error('Error syncing cart:', error);
        throw error;
    }
}