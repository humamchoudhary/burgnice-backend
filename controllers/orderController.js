const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

exports.createOrder = async (req, res) => {
  try {
    const { orderItems, total, deliveryAddress, contactPhone, user } = req.body;
    const order = new Order({ orderItems, total, deliveryAddress, contactPhone, user });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    // Optionally filter by user
    const filter = req.query.user ? { user: req.query.user } : {};
    const orders = await Order.find(filter).populate('orderItems.menuItem').populate('user');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('orderItems.menuItem').populate('user');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
