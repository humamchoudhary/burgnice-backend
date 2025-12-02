const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/categories - Get all categories
router.get('/', menuController.getCategories); // ✅ FIXED: Changed from getAllCategories to getCategories

// GET /api/categories/:id - Get category by ID
router.get('/:id', menuController.getCategoryById);

// POST /api/categories - Create category (admin only)
router.post('/', authMiddleware.required, authMiddleware.isAdmin, menuController.createCategory);

// PUT /api/categories/:id - Update category (admin only)
router.put('/:id', authMiddleware.required, authMiddleware.isAdmin, menuController.updateCategory);

// DELETE /api/categories/:id - Delete category (admin only)
router.delete('/:id', authMiddleware.required, authMiddleware.isAdmin, menuController.deleteCategory);

// GET /api/categories/search?q= - Search categories
router.get('/search', menuController.searchCategories);

module.exports = router;