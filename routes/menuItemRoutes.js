const express = require('express');
const router = express.Router();
const menuItemController = require('../controllers/menuItemController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `menu-item-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET /api/menu-items - Get all menu items with filters
router.get('/', menuItemController.getAllMenuItems);

// GET /api/menu-items/paginated - Get paginated menu items
router.get('/paginated', menuItemController.getPaginatedMenuItems);

// GET /api/menu-items/:id - Get menu item by ID
router.get('/:id', menuItemController.getMenuItemById);

// POST /api/menu-items - Create menu item (admin only)
router.post('/', authMiddleware.required, authMiddleware.isAdmin, upload.single('image'), menuItemController.createMenuItem);

// PUT /api/menu-items/:id - Update menu item (admin only)
router.put('/:id', authMiddleware.required, authMiddleware.isAdmin, upload.single('image'), menuItemController.updateMenuItem);

// DELETE /api/menu-items/:id - Delete menu item (admin only)
router.delete('/:id', authMiddleware.required, authMiddleware.isAdmin, menuItemController.deleteMenuItem);

// PATCH /api/menu-items/:id/availability - Update availability (admin only)
router.patch('/:id/availability', authMiddleware.required, authMiddleware.isAdmin, menuItemController.updateAvailability);

// GET /api/menu-items/category/:categoryId - Get items by category
router.get('/category/:categoryId', menuItemController.getMenuItemsByCategory);

// GET /api/menu-items/search?q= - Search menu items
router.get('/search', menuItemController.searchMenuItems);

// GET /api/menu-items/featured - Get featured items
router.get('/featured', menuItemController.getFeaturedItems);

module.exports = router;