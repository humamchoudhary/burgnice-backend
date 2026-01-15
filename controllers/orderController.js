const Order = require("../models/Order");
const User = require("../models/User");
const MenuItem = require("../models/MenuItem");

// Create new order with cart clearing
exports.createOrder = async (req, res) => {
  try {
    console.log("Creating order with body:", req.body);

    const {
      orderItems,
      subtotal,
      discountAmount = 0,
      loyaltyPointsUsed = 0,
      total,
      deliveryAddress,
      paymentMethod,
      notes,
      contactPhone,
      customerName,
      loyaltyPointsEarned = 0,
    } = req.body;

    // Create order object
    const orderData = {
      user: req.user ? req.user.id : null,
      orderItems,
      subtotal,
      discountAmount,
      loyaltyPointsUsed,
      total,
      deliveryAddress,
      contactPhone,
      customerName,
      paymentMethod,
      notes,
      status: "pending",
    };

    const order = new Order(orderData);

    let userData = null;
    let pointsEarned = loyaltyPointsEarned || 0;

    // If user is logged in, handle loyalty points and cart
    if (req.user) {
      const user = await User.findById(req.user.id);
      userData = user;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate points earned if not provided
      if (!loyaltyPointsEarned) {
        pointsEarned = Math.floor(subtotal / 10);
      }
      order.loyaltyPointsEarned = pointsEarned;

      // Deduct loyalty points used for discount
      if (loyaltyPointsUsed > 0) {
        if (user.loyaltyPoints < loyaltyPointsUsed) {
          return res.status(400).json({
            message: "Insufficient loyalty points",
          });
        }

        user.loyaltyPoints -= loyaltyPointsUsed;
        user.loyaltyPointsUsed =
          (user.loyaltyPointsUsed || 0) + loyaltyPointsUsed;
      }

      // Add earned points
      user.loyaltyPoints += pointsEarned;
      user.totalSpent += total;

      // Clear user's cart after successful order
      user.cart = [];
      user.lastCartUpdate = new Date();

      await user.save();
      await order.save();

      return res.status(201).json({
        message: "Order created successfully",
        order,
        loyaltyPointsEarned: pointsEarned,
        loyaltyPointsUsed: loyaltyPointsUsed,
        discountAmount: discountAmount,
        totalLoyaltyPoints: user.loyaltyPoints,
        cartCleared: true,
        user: {
          id: user._id,
          username: user.username,
          loyaltyPoints: user.loyaltyPoints,
        },
      });
    }

    // For guest users
    await order.save();
    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get user's order history - OPTIMIZED
exports.getUserOrderHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Fetch user and orders in parallel
    const [user, orders] = await Promise.all([
      User.findById(req.user.id).select("loyaltyPoints totalSpent").lean(),
      Order.find({ user: req.user.id })
        .populate("orderItems.menuItem", "name price image")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Format response with order tracking
    const orderHistory = orders.map((order) => ({
      _id: order._id,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      total: order.total,
      status: order.status,
      statusText: getStatusText(order.status),
      items: order.orderItems.map((oi) => ({
        name: oi.menuItem?.name || "Item",
        quantity: oi.quantity,
        price: oi.price,
      })),
      itemCount: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
      deliveryAddress: order.deliveryAddress,
      contactPhone: order.contactPhone,
      customerName: order.customerName,
      createdAt: order.createdAt,
      estimatedDelivery: getEstimatedDelivery(order.createdAt, order.status),
      discountApplied: order.discountAmount,
      loyaltyPointsEarned: order.loyaltyPointsEarned,
      loyaltyPointsUsed: order.loyaltyPointsUsed,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
    }));

    res.json({
      orders: orderHistory,
      totalOrders: orderHistory.length,
      totalSpent: user.totalSpent,
      loyaltyPoints: user.loyaltyPoints,
      recentOrder: orderHistory.length > 0 ? orderHistory[0] : null,
    });
  } catch (error) {
    console.error("Error fetching order history:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get order details with tracking information - OPTIMIZED
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("orderItems.menuItem", "name price image category")
      .populate("user", "username email")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization
    if (
      req.user &&
      req.user.role !== "admin" &&
      order.user?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get tracking information
    const trackingInfo = getOrderTrackingInfo(order);

    res.json({
      order: {
        ...order,
        orderNumber: order._id.toString().slice(-8).toUpperCase(),
        trackingInfo,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order tracking status - OPTIMIZED
exports.getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select("status createdAt updatedAt user")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization
    if (
      req.user &&
      req.user.role !== "admin" &&
      order.user?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const trackingInfo = getOrderTrackingInfo(order);

    res.json({
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      status: order.status,
      statusText: getStatusText(order.status),
      trackingInfo,
      estimatedDelivery: getEstimatedDelivery(order.createdAt, order.status),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all orders (admin only) - OPTIMIZED
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("orderItems.menuItem", "name price image")
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get paginated orders (admin only) - OPTIMIZED
exports.getPaginatedOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [total, orders] = await Promise.all([
      Order.countDocuments(),
      Order.find()
        .populate("orderItems.menuItem", "name price image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      data: orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by ID - OPTIMIZED
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("orderItems.menuItem")
      .populate("user", "username email")
      .lean();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if user is authorized
    if (
      req.user &&
      req.user.role !== "admin" &&
      order.user?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user orders with loyalty points summary - OPTIMIZED
exports.getUserOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const [orders, user] = await Promise.all([
      Order.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .populate("orderItems.menuItem", "name price image")
        .lean(),
      User.findById(req.user.id)
        .select("loyaltyPoints loyaltyPointsUsed totalSpent")
        .lean(),
    ]);

    res.json({
      orders,
      loyaltyPoints: user.loyaltyPoints,
      loyaltyPointsUsed: user.loyaltyPointsUsed || 0,
      totalSpent: user.totalSpent,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order (admin only)
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate("orderItems.menuItem")
      .populate("user", "username email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
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
      return res.status(404).json({ message: "Order not found" });
    }

    // If order had loyalty points used, restore them
    if (order.user && order.loyaltyPointsUsed > 0) {
      await User.findByIdAndUpdate(order.user, {
        $inc: {
          loyaltyPoints: order.loyaltyPointsUsed,
          totalSpent: -order.total,
        },
      });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status (admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "preparing", "completed", "cancelled"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Valid status required: pending, preparing, completed, cancelled",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("orderItems.menuItem")
      .populate("user", "username email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If order is cancelled and loyalty points were used, restore them
    if (status === "cancelled" && order.user && order.loyaltyPointsUsed > 0) {
      await User.findByIdAndUpdate(order.user._id, {
        $inc: { loyaltyPoints: order.loyaltyPointsUsed },
      });
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
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization
    if (
      req.user &&
      req.user.role !== "admin" &&
      order.user?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Only allow cancellation of pending orders
    if (order.status !== "pending") {
      return res.status(400).json({
        message: `Cannot cancel order with status: ${order.status}`,
      });
    }

    order.status = "cancelled";
    await order.save();

    // Restore loyalty points if used
    if (order.user && order.loyaltyPointsUsed > 0) {
      await User.findByIdAndUpdate(order.user, {
        $inc: { loyaltyPoints: order.loyaltyPointsUsed },
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order statistics (admin only) - OPTIMIZED
exports.getOrderStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Use aggregation pipeline for better performance
    const [statusCounts, dateCounts, revenue] = await Promise.all([
      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $facet: {
            today: [
              { $match: { createdAt: { $gte: today } } },
              { $count: "count" },
            ],
            week: [
              { $match: { createdAt: { $gte: weekAgo } } },
              { $count: "count" },
            ],
            month: [
              { $match: { createdAt: { $gte: monthAgo } } },
              { $count: "count" },
            ],
          },
        },
      ]),
      Order.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$total" },
            totalDiscounts: { $sum: "$discountAmount" },
            totalLoyaltyPointsUsed: { $sum: "$loyaltyPointsUsed" },
          },
        },
      ]),
    ]);

    // Map status counts
    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const stats = {
      totalOrders: Object.values(statusMap).reduce(
        (sum, count) => sum + count,
        0,
      ),
      pendingOrders: statusMap.pending || 0,
      preparingOrders: statusMap.preparing || 0,
      completedOrders: statusMap.completed || 0,
      cancelledOrders: statusMap.cancelled || 0,
      todayOrders: dateCounts[0].today[0]?.count || 0,
      weekOrders: dateCounts[0].week[0]?.count || 0,
      monthOrders: dateCounts[0].month[0]?.count || 0,
      totalRevenue: revenue[0]?.totalRevenue || 0,
      totalDiscounts: revenue[0]?.totalDiscounts || 0,
      totalLoyaltyPointsUsed: revenue[0]?.totalLoyaltyPointsUsed || 0,
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get loyalty points summary - OPTIMIZED
exports.getLoyaltySummary = async (req, res) => {
  console.log("Getting loyalty summary for user:", req.user?.id);
  try {
    if (!req.user) {
      return res.json({
        isLoggedIn: false,
        message: "Login to view loyalty points",
      });
    }

    const [user, orders] = await Promise.all([
      User.findById(req.user.id)
        .select("loyaltyPoints loyaltyPointsUsed totalSpent")
        .lean(),
      Order.find({
        user: req.user.id,
        $or: [
          { loyaltyPointsEarned: { $gt: 0 } },
          { loyaltyPointsUsed: { $gt: 0 } },
        ],
      })
        .select(
          "_id createdAt total loyaltyPointsEarned loyaltyPointsUsed discountAmount status",
        )
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({
      isLoggedIn: true,
      loyaltyPoints: user.loyaltyPoints,
      loyaltyPointsUsed: user.loyaltyPointsUsed || 0,
      totalSpent: user.totalSpent,
      pointsHistory: orders.map((order) => ({
        orderId: order._id,
        date: order.createdAt,
        amount: order.total,
        pointsEarned: order.loyaltyPointsEarned || 0,
        pointsUsed: order.loyaltyPointsUsed || 0,
        discountApplied: order.discountAmount || 0,
        status: order.status,
      })),
    });
  } catch (error) {
    console.error("Error in getLoyaltySummary:", error);
    res.status(500).json({ message: error.message });
  }
};

// Calculate loyalty discount
exports.calculateLoyaltyDiscount = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { orderTotal } = req.body;

    if (!orderTotal || orderTotal < 0) {
      return res.status(400).json({ message: "Valid order total required" });
    }

    const user = await User.findById(req.user.id)
      .select("loyaltyPoints")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if eligible for discount (min 10 points and min £10 order)
    if (user.loyaltyPoints < 10 || orderTotal < 10) {
      return res.json({
        eligible: false,
        message:
          user.loyaltyPoints < 10
            ? "Minimum 10 loyalty points required"
            : "Minimum £10 order required for loyalty discount",
        discountAmount: 0,
        pointsUsed: 0,
        discountPercentage: 0,
      });
    }

    // Calculate discount
    const maxStacks = Math.floor(user.loyaltyPoints / 10);
    const discountPercentage = Math.min(maxStacks * 10, 50);
    const discountAmount = (orderTotal * discountPercentage) / 100;
    const pointsUsed = Math.floor(maxStacks * 10);

    res.json({
      eligible: true,
      discountAmount,
      pointsUsed,
      discountPercentage,
      finalTotal: orderTotal - discountAmount,
      remainingPoints: user.loyaltyPoints - pointsUsed,
    });
  } catch (error) {
    console.error("Error calculating discount:", error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function for order tracking
function getOrderTrackingInfo(order) {
  const status = order.status;
  const createdAt = new Date(order.createdAt);

  let timeline = [
    {
      status: "ordered",
      title: "Order Placed",
      description: "Your order has been received",
      time: createdAt,
      completed: true,
    },
  ];

  if (status === "pending") {
    timeline.push(
      {
        status: "confirmed",
        title: "Order Confirmed",
        description: "We are preparing your order",
        time: new Date(createdAt.getTime() + 5 * 60000),
        completed: false,
      },
      {
        status: "preparing",
        title: "In Preparation",
        description: "Your food is being prepared",
        time: null,
        completed: false,
      },
      {
        status: "delivered",
        title: "Out for Delivery",
        description: "Your order is on the way",
        time: null,
        completed: false,
      },
    );
  } else if (status === "preparing") {
    const preparingTime = new Date(
      order.updatedAt || createdAt.getTime() + 10 * 60000,
    );
    timeline.push(
      {
        status: "confirmed",
        title: "Order Confirmed",
        description: "We are preparing your order",
        time: new Date(createdAt.getTime() + 5 * 60000),
        completed: true,
      },
      {
        status: "preparing",
        title: "In Preparation",
        description: "Your food is being prepared",
        time: preparingTime,
        completed: true,
      },
      {
        status: "delivered",
        title: "Out for Delivery",
        description: "Your order is on the way",
        time: null,
        completed: false,
      },
    );
  } else if (status === "completed") {
    const completedTime = new Date(order.updatedAt);
    timeline.push(
      {
        status: "confirmed",
        title: "Order Confirmed",
        description: "We are preparing your order",
        time: new Date(createdAt.getTime() + 5 * 60000),
        completed: true,
      },
      {
        status: "preparing",
        title: "In Preparation",
        description: "Your food is being prepared",
        time: new Date(createdAt.getTime() + 15 * 60000),
        completed: true,
      },
      {
        status: "delivered",
        title: "Out for Delivery",
        description: "Your order is on the way",
        time: new Date(createdAt.getTime() + 25 * 60000),
        completed: true,
      },
      {
        status: "completed",
        title: "Delivered",
        description: "Your order has been delivered",
        time: completedTime,
        completed: true,
      },
    );
  } else if (status === "cancelled") {
    timeline.push({
      status: "cancelled",
      title: "Order Cancelled",
      description: "Your order has been cancelled",
      time: new Date(order.updatedAt),
      completed: true,
    });
  }

  return {
    timeline,
    currentStatus: status,
    estimatedPreparationTime: 25,
    deliveryTime: 45,
    isDelayed: false,
    riderInfo:
      status === "preparing" || status === "completed"
        ? {
            name: "John Doe",
            phone: "+1234567890",
            vehicle: "Motorcycle",
            rating: 4.8,
          }
        : null,
  };
}

// Helper function for status text
function getStatusText(status) {
  const statusMap = {
    pending: "Order Placed",
    preparing: "Preparing Your Order",
    completed: "Delivered",
    cancelled: "Cancelled",
  };
  return statusMap[status] || "Processing";
}

// Helper function for estimated delivery
function getEstimatedDelivery(createdAt, status) {
  const orderTime = new Date(createdAt);
  const deliveryTime = new Date(orderTime.getTime() + 45 * 60000);

  if (status === "completed") {
    return {
      estimated: deliveryTime,
      isDelivered: true,
      deliveredAt: new Date(orderTime.getTime() + 40 * 60000),
    };
  }

  return {
    estimated: deliveryTime,
    isDelivered: false,
    timeRemaining: Math.max(0, Math.floor((deliveryTime - new Date()) / 60000)),
  };
}
