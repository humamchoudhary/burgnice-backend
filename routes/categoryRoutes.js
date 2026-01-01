const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const authMiddleware = require("../middleware/authMiddleware");
const Category = require("../models/Category");

router.get("/promotion", async (req, res) => {
  try {
    console.log("promo");
    // Get categories with promotion flag set to true
    const categories = await Category.find({ promotion: true });
    console.log(categories);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/categories - Get all categories
router.get("/", menuController.getCategories); // ✅ FIXED: Changed from getAllCategories to getCategories

// GET /api/categories/:id - Get category by ID

// POST /api/categories - Create category (admin only)
router.post(
  "/",
  authMiddleware.required,
  authMiddleware.isAdmin,
  menuController.createCategory,
);

// PUT /api/categories/:id - Update category (admin only)
router.put(
  "/:id",
  authMiddleware.required,
  authMiddleware.isAdmin,
  menuController.updateCategory,
);

// DELETE /api/categories/:id - Delete category (admin only)
router.delete(
  "/:id",
  authMiddleware.required,
  authMiddleware.isAdmin,
  menuController.deleteCategory,
);

// GET /api/categories/search?q= - Search categories
router.get("/search", menuController.searchCategories);

router.get("/:id", menuController.getCategoryById);

module.exports = router;
