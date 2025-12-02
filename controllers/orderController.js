const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');

// Create new order with loyalty points
exports.createOrder = async (req, res) => {
    try {
        const { items, totalAmount, deliveryAddress, paymentMethod, notes, contactPhone, customerName } = req.body;
        
        const order = new Order({
            user: req.user ? req.user.id : null,
            items,
            totalAmount,
            deliveryAddress,
            contactPhone,
            customerName,
            paymentMethod,
            notes,
            status: 'pending'
        });

        await order.save();

        // If user is logged in, add loyalty points
        if (req.user) {
            const user = await User.findById(req.user.id);
            
            // Calculate loyalty points: 1 point per $10 spent
            const pointsEarned = Math.floor(totalAmount / 10);
            user.loyaltyPoints += pointsEarned;
            user.totalSpent += totalAmount;
            
            // Clear user's cart
            user.cart = [];
            
            await user.save();

            // Update order with points earned
            order.loyaltyPointsEarned = pointsEarned;
            await order.save();

            return res.status(201).json({
                message: 'Order created successfully',
                order,
                loyaltyPointsEarned: pointsEarned,
                totalLoyaltyPoints: user.loyaltyPoints
            });
        }

        // For guest users
        res.status(201).json({
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all orders (admin only)
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('items.menuItem')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get paginated orders (admin only)
exports.getPaginatedOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Order.countDocuments();
        const orders = await Order.find()
            .populate('items.menuItem')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: orders,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.menuItem');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user is authorized
        if (req.user && req.user.role !== 'admin' && order.user !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update order (admin only)
exports.updateOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('items.menuItem');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete order (admin only)
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update order status (admin only)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'preparing', 'completed', 'cancelled'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Valid status required: pending, preparing, completed, cancelled' 
            });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('items.menuItem');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check authorization
        if (req.user && req.user.role !== 'admin' && order.user !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Only allow cancellation of pending orders
        if (order.status !== 'pending') {
            return res.status(400).json({ 
                message: `Cannot cancel order with status: ${order.status}` 
            });
        }

        order.status = 'cancelled';
        await order.save();

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get user orders with loyalty points summary
exports.getUserOrders = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const orders = await Order.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate('items.menuItem');

        const user = await User.findById(req.user.id);
        
        res.json({
            orders,
            loyaltyPoints: user.loyaltyPoints,
            totalSpent: user.totalSpent
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get order statistics (admin only)
exports.getOrderStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);

        const stats = {
            totalOrders: await Order.countDocuments(),
            pendingOrders: await Order.countDocuments({ status: 'pending' }),
            preparingOrders: await Order.countDocuments({ status: 'preparing' }),
            completedOrders: await Order.countDocuments({ status: 'completed' }),
            cancelledOrders: await Order.countDocuments({ status: 'cancelled' }),
            todayOrders: await Order.countDocuments({ createdAt: { $gte: today } }),
            weekOrders: await Order.countDocuments({ createdAt: { $gte: weekAgo } }),
            monthOrders: await Order.countDocuments({ createdAt: { $gte: monthAgo } }),
            totalRevenue: await Order.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]).then(result => result[0]?.total || 0)
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get loyalty points summary
exports.getLoyaltySummary = async (req, res) => {
    try {
        if (!req.user) {
            return res.json({
                isLoggedIn: false,
                message: 'Login to view loyalty points'
            });
        }

        const user = await User.findById(req.user.id);
        const orders = await Order.find({ 
            user: req.user.id,
            loyaltyPointsEarned: { $gt: 0 }
        }).sort({ createdAt: -1 });

        res.json({
            isLoggedIn: true,
            loyaltyPoints: user.loyaltyPoints,
            totalSpent: user.totalSpent,
            pointsHistory: orders.map(order => ({
                orderId: order._id,
                date: order.createdAt,
                amount: order.totalAmount,
                pointsEarned: order.loyaltyPointsEarned
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};