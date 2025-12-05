const User = require('../models/User');
const Order = require('../models/Order');

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -cart -__v');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get order statistics
    const orders = await Order.find({ user: req.user.id });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

    res.json({
      ...user.toObject(),
      totalOrders,
      totalSpent,
      tier: user.loyaltyPoints > 1000 ? "Gold" : user.loyaltyPoints > 500 ? "Silver" : "Bronze"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user.id })
      .populate('orderItems.menuItem', 'name price image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ user: req.user.id });

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

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user.id
    })
    .populate('orderItems.menuItem', 'name price image')
    .populate('user', 'username email');

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};