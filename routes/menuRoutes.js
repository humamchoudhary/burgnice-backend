const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const multer = require('multer');
const path = require('path');

// ==============================
// Multer Configuration
// ==============================

// Set up storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files in the /uploads directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File type filter — only allow images
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

// Create the upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// ==============================
// Category Endpoints
// ==============================
router.get('/categories', menuController.getCategories); // Get all categories
router.post('/categories', menuController.createCategory); // Create category
router.put('/categories/:id', menuController.updateCategory); // Update category
router.delete('/categories/:id', menuController.deleteCategory); // Delete category

// ==============================
// Menu Item Endpoints
// ==============================
router.get('/menu-items', menuController.getMenuItems); // Get all menu items
router.post('/menu-items', upload.single('image'), menuController.createMenuItem); // Create item (with image)
router.put('/menu-items/:id', upload.single('image'), menuController.updateMenuItem); // Update item (with image)
router.delete('/menu-items/:id', menuController.deleteMenuItem); // Delete item
router.get('/ingredients', menuController.getIngredients);
router.post('/ingredients', upload.single('picture'), menuController.createIngredient);
router.delete('/ingredients/:id', menuController.deleteIngredient);

// ==============================
// Export
// ==============================
module.exports = router;
