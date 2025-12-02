const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Ingredient = require('../models/Ingredient'); // This should work if file is Ingredient.js

// CATEGORY CRUD
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchCategories = async (req, res) => {
  try {
    const query = req.query.q || '';
    const categories = await Category.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// MENU ITEM CRUD
exports.getMenuItems = async (req, res) => {
  try {
    const filter = req.query.category ? { category: req.query.category } : {};
    const menuItems = await MenuItem.find(filter).populate('category');
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllMenuItems = exports.getMenuItems; // Alias for new routes

exports.getPaginatedMenuItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isAvailable !== undefined) filter.isAvailable = req.query.isAvailable === 'true';

    const total = await MenuItem.countDocuments(filter);
    const menuItems = await MenuItem.find(filter)
      .populate('category')
      .skip(skip)
      .limit(limit);

    res.json({
      data: menuItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMenuItemById = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id).populate('category');
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createMenuItem = async (req, res) => {
  try {
    // Handle file upload if present
    const menuItemData = { ...req.body };
    if (req.file) {
      menuItemData.image = `/uploads/${req.file.filename}`;
    }
    
    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const menuItemData = { ...req.body };
    if (req.file) {
      menuItemData.image = `/uploads/${req.file.filename}`;
    }
    
    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, menuItemData, { new: true });
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });
    res.json(menuItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { new: true }
    );
    
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });
    res.json(menuItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getMenuItemsByCategory = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ category: req.params.categoryId })
      .populate('category')
      .sort({ createdAt: -1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchMenuItems = async (req, res) => {
  try {
    const query = req.query.q || '';
    const menuItems = await MenuItem.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
    .populate('category')
    .sort({ createdAt: -1 });
    
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFeaturedItems = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const menuItems = await MenuItem.find({ isAvailable: true })
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// INGREDIENT CRUD
exports.getIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createIngredient = async (req, res) => {
  try {
    const ingredientData = { 
      name: req.body.name, 
      price: req.body.price 
    };
    if (req.file) {
      ingredientData.picture = `/uploads/${req.file.filename}`;
    }
    const ingredient = new Ingredient(ingredientData);
    await ingredient.save();
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndDelete(req.params.id);
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });
    res.json({ message: 'Ingredient deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllCategories = exports.getCategories;