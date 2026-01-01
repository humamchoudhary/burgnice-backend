const MenuItem = require("../models/MenuItem");
const Category = require("../models/Category");

const menuItemController = {
  // Get all menu items with filters
  getAllMenuItems: async (req, res) => {
    try {
      const filter = {};

      // Handle category filtering - check if item belongs to any of the specified categories
      if (req.query.category) {
        filter.categories = req.query.category;
      }

      if (req.query.isAvailable !== undefined)
        filter.isAvailable = req.query.isAvailable === "true";
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: "i" } },
          { description: { $regex: req.query.search, $options: "i" } },
        ];
      }

      const menuItems = await MenuItem.find(filter)
        .populate("categories", "name slug") // Changed to populate categories array
        .sort({ createdAt: -1 });
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get paginated menu items
  getPaginatedMenuItems: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const filter = {};
      // Handle category filtering
      if (req.query.category) {
        filter.categories = req.query.category;
      }
      if (req.query.isAvailable !== undefined)
        filter.isAvailable = req.query.isAvailable === "true";
      if (req.query.search) {
        filter.$or = [
          { name: { $regex: req.query.search, $options: "i" } },
          { description: { $regex: req.query.search, $options: "i" } },
        ];
      }

      const total = await MenuItem.countDocuments(filter);
      const menuItems = await MenuItem.find(filter)
        .populate("categories", "name slug") // Changed to populate categories array
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      res.json({
        data: menuItems,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      });
    } catch (error) {
      console.error("Error fetching paginated menu items:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get menu item by ID
  getMenuItemById: async (req, res) => {
    try {
      const menuItem = await MenuItem.findById(req.params.id).populate(
        "categories",
        "name slug",
      ); // Changed to populate categories array

      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      res.json(menuItem);
    } catch (error) {
      console.error("Error fetching menu item:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Create menu item (admin only)
  createMenuItem: async (req, res) => {
    try {
      const { name, description, price, categories, isAvailable } = req.body;

      // Validate required fields
      if (!name || !price || !categories) {
        return res.status(400).json({
          message: "Name, price, and categories are required",
        });
      }

      // Parse categories if it's a string (from form data)
      let categoryArray;
      try {
        categoryArray = Array.isArray(categories)
          ? categories
          : JSON.parse(categories || "[]");
      } catch (e) {
        categoryArray = categories ? [categories] : [];
      }

      // Check if all categories exist
      if (categoryArray.length === 0) {
        return res
          .status(400)
          .json({ message: "At least one category is required" });
      }

      const categoriesExist = await Category.find({
        _id: { $in: categoryArray },
      });
      if (categoriesExist.length !== categoryArray.length) {
        return res
          .status(400)
          .json({ message: "One or more categories are invalid" });
      }

      const menuItemData = {
        name,
        description: description || "",
        price: parseFloat(price),
        categories: categoryArray,
        isAvailable: isAvailable !== undefined ? isAvailable : true,
      };

      // Handle image upload
      if (req.file) {
        menuItemData.image = `/uploads/${req.file.filename}`;
      }

      const menuItem = new MenuItem(menuItemData);
      await menuItem.save();

      const populatedItem = await MenuItem.findById(menuItem._id).populate(
        "categories",
        "name slug",
      ); // Changed to populate categories array

      res.status(201).json(populatedItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update menu item (admin only)
  updateMenuItem: async (req, res) => {
    try {
      const updates = req.body;

      if (updates.categories) {
        // Parse categories if it's a string
        let categoryArray;
        try {
          categoryArray = Array.isArray(updates.categories)
            ? updates.categories
            : JSON.parse(updates.categories || "[]");
        } catch (e) {
          categoryArray = updates.categories ? [updates.categories] : [];
        }

        // Check if all categories exist
        if (categoryArray.length === 0) {
          return res
            .status(400)
            .json({ message: "At least one category is required" });
        }

        const categoriesExist = await Category.find({
          _id: { $in: categoryArray },
        });
        if (categoriesExist.length !== categoryArray.length) {
          return res
            .status(400)
            .json({ message: "One or more categories are invalid" });
        }

        updates.categories = categoryArray;
      }

      if (req.file) {
        updates.image = `/uploads/${req.file.filename}`;
      }

      const menuItem = await MenuItem.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true },
      ).populate("categories", "name slug"); // Changed to populate categories array

      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      res.json(menuItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete menu item (admin only)
  deleteMenuItem: async (req, res) => {
    try {
      const menuItem = await MenuItem.findByIdAndDelete(req.params.id);

      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      res.json({ message: "Menu item deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Update availability (admin only)
  updateAvailability: async (req, res) => {
    try {
      const { isAvailable } = req.body;

      if (typeof isAvailable !== "boolean") {
        return res
          .status(400)
          .json({ message: "isAvailable must be a boolean" });
      }

      const menuItem = await MenuItem.findByIdAndUpdate(
        req.params.id,
        { isAvailable },
        { new: true },
      ).populate("categories", "name slug"); // Changed to populate categories array

      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      res.json(menuItem);
    } catch (error) {
      console.error("Error updating availability:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get items by category (for single category - backward compatibility)
  getMenuItemsByCategory: async (req, res) => {
    try {
      const menuItems = await MenuItem.find({
        categories: req.params.categoryId, // Changed from category to categories
        isAvailable: true,
      })
        .populate("categories", "name slug") // Changed to populate categories array
        .sort({ createdAt: -1 });

      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching items by category:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Search menu items
  searchMenuItems: async (req, res) => {
    try {
      const query = req.query.q || "";

      const menuItems = await MenuItem.find({
        isAvailable: true,
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      })
        .populate("categories", "name slug") // Changed to populate categories array
        .sort({ createdAt: -1 });

      res.json(menuItems);
    } catch (error) {
      console.error("Error searching menu items:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Get featured items
  getFeaturedItems: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 4;

      const menuItems = await MenuItem.find({ isAvailable: true })
        .populate("categories", "name slug") // Changed to populate categories array
        .sort({ createdAt: -1 })
        .limit(limit);

      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching featured items:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};

module.exports = menuItemController;
