const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const upload = require('../config/upload');

// CATEGORY CRUD
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
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

exports.createMenuItem = async (req, res) => {
  try {
    // Handle file upload if present
    const menuItemData = { ...req.body };
    if (req.file) {
      menuItemData.image = `http://localhost:5000/${req.file.path}`;
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
      menuItemData.image = `http://localhost:5000/${req.file.path}`;
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

exports.getIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add new ingredient with name, price, picture
exports.createIngredient = async (req, res) => {
  try {
    const ingredientData = { name: req.body.name, price: req.body.price };
    if (req.file) {
      ingredientData.picture = `http://localhost:5000/${req.file.path}`;
    }
    const ingredient = new Ingredient(ingredientData);
    await ingredient.save();
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete ingredient by id
exports.deleteIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndDelete(req.params.id);
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });
    res.json({ message: 'Ingredient deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};