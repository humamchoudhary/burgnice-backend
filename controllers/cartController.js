const User = require("../models/User");
const MenuItem = require("../models/MenuItem");

// Helper functions for consistent calculations
const calculateCartItemTotal = (item) => {
  // For database items
  if (item.menuItem && item.menuItem.price) {
    return item.menuItem.price * item.quantity;
  }
  // For session items or items with direct price
  return (item.price || 0) * item.quantity;
};

const calculateCartTotal = (cartItems) => {
  return cartItems.reduce((sum, item) => sum + calculateCartItemTotal(item), 0);
};

const calculateItemCount = (cartItems) => {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
};

const formatCartItem = (item) => {
  return {
    id: item._id || item.id,
    menuItem: item.menuItem || item,
    quantity: item.quantity,
    customizations: item.customizations || {},
    addedAt: item.addedAt,
    total: calculateCartItemTotal(item),
  };
};
// Get cart for user from database
exports.getCart = async (req, res) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user.id)
        .populate("cart.menuItem", "name price image category")
        .populate("cart.menuItem.category", "name");

      const cartItems = user.cart.map(formatCartItem);
      const cartTotal = calculateCartTotal(cartItems);
      const itemCount = calculateItemCount(cartItems);

      return res.json({
        cart: cartItems,
        cartTotal,
        itemCount,
        isLoggedIn: true,
        loyaltyPoints: user.loyaltyPoints,
      });
    } else {
      // Guest user - ensure consistent structure
      const guestCart = req.body.cart || req.session?.cart || [];
      const cartItems = guestCart.map(formatCartItem);
      const cartTotal = calculateCartTotal(cartItems);
      const itemCount = calculateItemCount(cartItems);

      return res.json({
        cart: cartItems,
        cartTotal,
        itemCount,
        isLoggedIn: false,
        loyaltyPoints: 0,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add item to cart (database for logged-in users)
exports.addToCart = async (req, res) => {
  try {
    const { menuItemId, quantity = 1, customizations = {} } = req.body;

    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    if (req.user) {
      const user = await User.findById(req.user.id);
      await user.addToCart(menuItemId, quantity, customizations);

      const populatedUser = await User.findById(req.user.id).populate(
        "cart.menuItem",
        "name price image category",
      );

      const cartItems = populatedUser.cart.map(formatCartItem);
      const cartTotal = calculateCartTotal(cartItems);
      const itemCount = calculateItemCount(cartItems);

      res.json({
        message: "Item added to cart",
        cart: cartItems,
        cartTotal,
        itemCount,
        loyaltyPoints: user.loyaltyPoints,
      });
    } else {
      if (!req.session.cart) req.session.cart = [];

      const existingItemIndex = req.session.cart.findIndex(
        (item) => item.menuItemId === menuItemId,
      );

      if (existingItemIndex > -1) {
        req.session.cart[existingItemIndex].quantity += quantity;
      } else {
        req.session.cart.push({
          menuItemId,
          menuItem, // Include menuItem data for calculation
          quantity,
          customizations,
          addedAt: new Date(),
        });
      }

      const cartItems = req.session.cart.map(formatCartItem);
      const cartTotal = calculateCartTotal(cartItems);
      const itemCount = calculateItemCount(cartItems);

      res.json({
        message: "Item added to cart",
        cart: cartItems,
        cartTotal,
        itemCount,
        loyaltyPoints: 0,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Add item to cart (database for logged-in users)

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  try {
    const { cartItemId, quantity } = req.body;

    if (req.user) {
      const user = await User.findById(req.user.id).populate(
        "cart.menuItem",
        "name price image category",
      );

      const itemIndex = user.cart.findIndex(
        (item) => item._id.toString() === cartItemId,
      );

      if (quantity <= 0) {
        user.cart.splice(itemIndex, 1);
      } else {
        user.cart[itemIndex].quantity = quantity;
      }

      await user.save();

      const cartItems = user.cart.map(formatCartItem);
      const cartTotal = calculateCartTotal(cartItems);
      const itemCount = calculateItemCount(cartItems);

      res.json({
        message: "Cart updated",
        cart: cartItems,
        cartTotal,
        itemCount,
      });
    } else {
      // Similar logic for guest cart
      const cartItems = req.session.cart.map(formatCartItem);
      const cartTotal = calculateCartTotal(cartItems);
      const itemCount = calculateItemCount(cartItems);

      res.json({
        message: "Cart updated",
        cart: cartItems,
        cartTotal,
        itemCount,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { cartItemId } = req.params;

    if (req.user) {
      const user = await User.findById(req.user.id).populate(
        "cart.menuItem",
        "name price image category",
      );

      const itemIndex = user.cart.findIndex(
        (item) => item._id.toString() === cartItemId,
      );

      user.cart.splice(itemIndex, 1);
      await user.save();

      const cartItems = user.cart.map(formatCartItem);
      const cartTotal = calculateCartTotal(cartItems);
      const itemCount = calculateItemCount(cartItems);

      res.json({
        message: "Item removed from cart",
        cart: cartItems,
        cartTotal,
        itemCount,
      });
    } else {
      // Similar for guest cart
      const cartItems = req.session.cart.map(formatCartItem);
      const cartTotal = calculateCartTotal(cartItems);
      const itemCount = calculateItemCount(cartItems);

      res.json({
        message: "Item removed from cart",
        cart: cartItems,
        cartTotal,
        itemCount,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user.id);
      user.cart = [];
      user.lastCartUpdate = new Date();
      await user.save();
    } else {
      req.session.cart = [];
    }

    res.json({
      message: "Cart cleared successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Transfer guest cart to user cart after login
exports.transferGuestCart = async (req, res) => {
  try {
    const guestCart = req.session.cart || [];

    if (guestCart.length === 0) {
      return res.json({
        message: "No items to transfer",
        cart: [],
      });
    }

    const user = await User.findById(req.user.id);

    for (const guestItem of guestCart) {
      const existingItemIndex = user.cart.findIndex(
        (item) => item.menuItem.toString() === guestItem.menuItemId,
      );

      if (existingItemIndex > -1) {
        user.cart[existingItemIndex].quantity += guestItem.quantity;
        user.cart[existingItemIndex].addedAt = new Date();
      } else {
        user.cart.push({
          menuItem: guestItem.menuItemId,
          quantity: guestItem.quantity,
          customizations: guestItem.customizations || {},
          addedAt: new Date(),
        });
      }
    }

    user.lastCartUpdate = new Date();
    await user.save();

    // Clear session cart
    req.session.cart = [];

    // Get populated cart
    const populatedUser = await User.findById(req.user.id)
      .populate("cart.menuItem", "name price image category")
      .populate("cart.menuItem.category", "name");

    res.json({
      message: "Cart transferred successfully",
      cart: populatedUser.cart,
      itemCount: populatedUser.cart.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get cart count
exports.getCartCount = async (req, res) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user.id);
      const count = calculateItemCount(user.cart);
      return res.json({ count });
    } else {
      const guestCart = req.session.cart || [];
      const count = calculateItemCount(guestCart);
      return res.json({ count });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Sync session cart with database (for login)
exports.syncCart = async (req, res) => {
  try {
    const { cartItems } = req.body;
    console.log(cartItems);

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user.id);

    if (!Array.isArray(cartItems)) {
      return res.status(400).json({ message: "Invalid cart data" });
    }

    for (const incomingItem of cartItems) {
      const menuItem = await MenuItem.findById(incomingItem.menuItemId);
      if (!menuItem) continue;

      // Find existing cart item with same menuItem & customizations
      const existingItem = user.cart.find(
        (item) =>
          item.menuItem.toString() === incomingItem.menuItemId &&
          JSON.stringify(item.customizations || {}) ===
            JSON.stringify(incomingItem.customizations || {}),
      );

      if (existingItem) {
        // Increase quantity
        existingItem.quantity += incomingItem.quantity;
      } else {
        // Add as new cart item
        user.cart.push({
          menuItem: incomingItem.menuItemId,
          quantity: incomingItem.quantity,
          customizations: incomingItem.customizations || {},
          addedAt: new Date(),
        });
      }
    }
    console.log(user.cart);

    user.lastCartUpdate = new Date();
    await user.save();

    res.status(200).json({
      message: "Cart synced successfully",
      cart: user.cart,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
