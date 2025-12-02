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

        // Create token
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                loyaltyPoints: user.loyaltyPoints
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Login user
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

        // Create token
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                loyaltyPoints: user.loyaltyPoints
            }
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

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            user,
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