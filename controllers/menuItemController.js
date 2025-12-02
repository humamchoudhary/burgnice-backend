const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

const menuItemController = {
    // Get all menu items with filters
    getAllMenuItems: async (req, res) => {
        try {
            const filter = {};
            
            if (req.query.category) filter.category = req.query.category;
            if (req.query.isAvailable !== undefined) filter.isAvailable = req.query.isAvailable === 'true';
            if (req.query.search) {
                filter.$or = [
                    { name: { $regex: req.query.search, $options: 'i' } },
                    { description: { $regex: req.query.search, $options: 'i' } }
                ];
            }
            
            const menuItems = await MenuItem.find(filter)
                .populate('category', 'name')
                .sort({ createdAt: -1 });
            res.json(menuItems);
        } catch (error) {
            console.error('Error fetching menu items:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get paginated menu items
    getPaginatedMenuItems: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const filter = {};
            if (req.query.category) filter.category = req.query.category;
            if (req.query.isAvailable !== undefined) filter.isAvailable = req.query.isAvailable === 'true';
            if (req.query.search) {
                filter.$or = [
                    { name: { $regex: req.query.search, $options: 'i' } },
                    { description: { $regex: req.query.search, $options: 'i' } }
                ];
            }

            const total = await MenuItem.countDocuments(filter);
            const menuItems = await MenuItem.find(filter)
                .populate('category', 'name')
                .sort({ createdAt: -1 })
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
            console.error('Error fetching paginated menu items:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get menu item by ID
    getMenuItemById: async (req, res) => {
        try {
            const menuItem = await MenuItem.findById(req.params.id).populate('category', 'name');
            
            if (!menuItem) {
                return res.status(404).json({ message: 'Menu item not found' });
            }

            res.json(menuItem);
        } catch (error) {
            console.error('Error fetching menu item:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create menu item (admin only)
    createMenuItem: async (req, res) => {
        try {
            const { name, description, price, category, isAvailable } = req.body;

            // Validate required fields
            if (!name || !price || !category) {
                return res.status(400).json({ 
                    message: 'Name, price, and category are required' 
                });
            }

            // Check if category exists
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.status(400).json({ message: 'Invalid category' });
            }

            const menuItemData = {
                name,
                description: description || '',
                price: parseFloat(price),
                category,
                isAvailable: isAvailable !== undefined ? isAvailable : true
            };

            // Handle image upload
            if (req.file) {
                menuItemData.image = `/uploads/${req.file.filename}`;
            }

            const menuItem = new MenuItem(menuItemData);
            await menuItem.save();

            const populatedItem = await MenuItem.findById(menuItem._id)
                .populate('category', 'name');

            res.status(201).json(populatedItem);
        } catch (error) {
            console.error('Error creating menu item:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Update menu item (admin only)
    updateMenuItem: async (req, res) => {
        try {
            const updates = req.body;
            
            if (updates.category) {
                // Check if category exists
                const categoryExists = await Category.findById(updates.category);
                if (!categoryExists) {
                    return res.status(400).json({ message: 'Invalid category' });
                }
            }

            if (req.file) {
                updates.image = `/uploads/${req.file.filename}`;
            }

            const menuItem = await MenuItem.findByIdAndUpdate(
                req.params.id,
                updates,
                { new: true, runValidators: true }
            ).populate('category', 'name');

            if (!menuItem) {
                return res.status(404).json({ message: 'Menu item not found' });
            }

            res.json(menuItem);
        } catch (error) {
            console.error('Error updating menu item:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Delete menu item (admin only)
    deleteMenuItem: async (req, res) => {
        try {
            const menuItem = await MenuItem.findByIdAndDelete(req.params.id);

            if (!menuItem) {
                return res.status(404).json({ message: 'Menu item not found' });
            }

            res.json({ message: 'Menu item deleted successfully' });
        } catch (error) {
            console.error('Error deleting menu item:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Update availability (admin only)
    updateAvailability: async (req, res) => {
        try {
            const { isAvailable } = req.body;

            if (typeof isAvailable !== 'boolean') {
                return res.status(400).json({ message: 'isAvailable must be a boolean' });
            }

            const menuItem = await MenuItem.findByIdAndUpdate(
                req.params.id,
                { isAvailable },
                { new: true }
            ).populate('category', 'name');

            if (!menuItem) {
                return res.status(404).json({ message: 'Menu item not found' });
            }

            res.json(menuItem);
        } catch (error) {
            console.error('Error updating availability:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get items by category
    getMenuItemsByCategory: async (req, res) => {
        try {
            const menuItems = await MenuItem.find({ 
                category: req.params.categoryId,
                isAvailable: true 
            })
            .populate('category', 'name')
            .sort({ createdAt: -1 });

            res.json(menuItems);
        } catch (error) {
            console.error('Error fetching items by category:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Search menu items
    searchMenuItems: async (req, res) => {
        try {
            const query = req.query.q || '';
            
            const menuItems = await MenuItem.find({
                isAvailable: true,
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ]
            })
            .populate('category', 'name')
            .sort({ createdAt: -1 });

            res.json(menuItems);
        } catch (error) {
            console.error('Error searching menu items:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get featured items
    getFeaturedItems: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 4;
            
            const menuItems = await MenuItem.find({ isAvailable: true })
                .populate('category', 'name')
                .sort({ createdAt: -1 })
                .limit(limit);

            res.json(menuItems);
        } catch (error) {
            console.error('Error fetching featured items:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = menuItemController;