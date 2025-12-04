const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register - Register new user
router.post('/register', authController.register);

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// POST /api/auth/sync-cart - Sync session cart to database (optional)
router.post('/sync-cart', authMiddleware.required, authController.syncCart);

// POST /api/auth/logout - Logout user
router.post('/logout', authMiddleware.required, authController.logout);

// GET /api/auth/profile - Get user profile
router.get('/profile', authMiddleware.required, authController.getProfile);

// PUT /api/auth/profile - Update user profile
router.put('/profile', authMiddleware.required, authController.updateProfile);

// POST /api/auth/refresh-token - Refresh access token
router.post('/refresh-token', authController.refreshToken);

// POST /api/auth/forgot-password - Forgot password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password - Reset password
router.post('/reset-password', authController.resetPassword);

module.exports = router;