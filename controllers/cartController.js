const User = require("../models/User");
const MenuItem = require("../models/MenuItem");

// Get cart for user from database
exports.getCart = async (req, res) => {
  try {
    if (req.user) {
      // User is logged in - get from database
      const user = await User.findById(req.user.id)
        .populate("cart.menuItem", "name price image category")
        .populate("cart.menuItem.category", "name");

      // Calculate cart total
      const cartItems = user.cart.map((item) => ({
        id: item._id,
        menuItem: item.menuItem,
        quantity: item.quantity,
        customizations: item.customizations || {},
        addedAt: item.addedAt,
        total: item.menuItem.price * item.quantity,
      }));

      const cartTotal = cartItems.reduce((sum, item) => sum + item.total, 0);
      console.log("Cart: ", {
        cart: cartItems,
        cartTotal,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        isLoggedIn: true,
        loyaltyPoints: user.loyaltyPoints,
      });

      return res.json({
        cart: cartItems,
        cartTotal,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        isLoggedIn: true,
        loyaltyPoints: user.loyaltyPoints,
      });
    } else {
      // Guest user - get from session storage (via frontend)
      // Frontend should send guest cart in request body or session
      const guestCart = req.body.cart || req.session?.cart || [];
      return res.json({
        cart: guestCart,
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

    if (!menuItemId) {
      return res.status(400).json({ message: "Menu item ID is required" });
    }

    // Check if menu item exists
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    if (req.user) {
      // User is logged in - store in database using schema method
      const user = await User.findById(req.user.id);
      await user.addToCart(menuItemId, quantity, customizations);

      // Get populated cart for response
      const populatedUser = await User.findById(req.user.id)
        .populate("cart.menuItem", "name price image category")
        .populate("cart.menuItem.category", "name");

      const cartItems = populatedUser.cart.map((item) => ({
        id: item._id,
        menuItem: item.menuItem,
        quantity: item.quantity,
        customizations: item.customizations || {},
        addedAt: item.addedAt,
        total: item.menuItem.price * item.quantity,
      }));

      res.json({
        message: "Item added to cart",
        cart: cartItems,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        loyaltyPoints: user.loyaltyPoints,
        source: "database",
      });
    } else {
      // Guest user - store in session
      if (!req.session.cart) {
        req.session.cart = [];
      }

      const existingItemIndex = req.session.cart.findIndex(
        (item) => item.menuItemId === menuItemId,
      );

      if (existingItemIndex > -1) {
        req.session.cart[existingItemIndex].quantity += quantity;
      } else {
        req.session.cart.push({
          menuItemId,
          quantity,
          customizations,
          addedAt: new Date(),
        });
      }

      res.json({
        message: "Item added to cart",
        cart: req.session.cart,
        itemCount: req.session.cart.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        loyaltyPoints: 0,
        source: "session",
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

    if (!menuItemId) {
      return res.status(400).json({ message: "Menu item ID is required" });
    }

    // Check if menu item exists
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    if (req.user) {
      // User is logged in - store in database
      const user = await User.findById(req.user.id);

      // Check if item already exists in cart
      const existingItemIndex = user.cart.findIndex(
        (item) => item.menuItem.toString() === menuItemId,
      );

      if (existingItemIndex > -1) {
        // Update existing item
        user.cart[existingItemIndex].quantity += quantity;
        user.cart[existingItemIndex].customizations = customizations;
        user.cart[existingItemIndex].addedAt = new Date();
      } else {
        // Add new item
        user.cart.push({
          menuItem: menuItemId,
          quantity,
          customizations,
          addedAt: new Date(),
        });
      }

      user.lastCartUpdate = new Date();
      await user.save();

      // Return populated cart
      const populatedUser = await User.findById(req.user.id)
        .populate("cart.menuItem", "name price image category")
        .populate("cart.menuItem.category", "name");

      const cartItems = populatedUser.cart.map((item) => ({
        id: item._id,
        menuItem: item.menuItem,
        quantity: item.quantity,
        customizations: item.customizations,
        addedAt: item.addedAt,
      }));

      res.json({
        message: "Item added to cart",
        cart: cartItems,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        loyaltyPoints: user.loyaltyPoints,
      });
    } else {
      // Guest user - store in session
      if (!req.session.cart) {
        req.session.cart = [];
      }

      const existingItemIndex = req.session.cart.findIndex(
        (item) => item.menuItemId === menuItemId,
      );

      if (existingItemIndex > -1) {
        req.session.cart[existingItemIndex].quantity += quantity;
      } else {
        req.session.cart.push({
          menuItemId,
          quantity,
          customizations,
          addedAt: new Date(),
        });
      }

      res.json({
        message: "Item added to cart",
        cart: req.session.cart,
        itemCount: req.session.cart.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
        loyaltyPoints: 0,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  try {
    const { cartItemId, quantity } = req.body;

    if (!cartItemId || quantity === undefined) {
      return res
        .status(400)
        .json({ message: "Cart item ID and quantity are required" });
    }

    if (req.user) {
      const user = await User.findById(req.user.id);
      const itemIndex = user.cart.findIndex(
        (item) => item._id.toString() === cartItemId,
      );

      if (itemIndex === -1) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      if (quantity <= 0) {
        user.cart.splice(itemIndex, 1);
      } else {
        user.cart[itemIndex].quantity = quantity;
        user.cart[itemIndex].addedAt = new Date();
      }

      user.lastCartUpdate = new Date();
      await user.save();

      res.json({
        message: "Cart updated",
        cart: user.cart,
      });
    } else {
      if (!req.session.cart) {
        return res.status(404).json({ message: "Cart is empty" });
      }

      const itemIndex = req.session.cart.findIndex(
        (item) => item._id === cartItemId,
      );

      if (itemIndex === -1) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      if (quantity <= 0) {
        req.session.cart.splice(itemIndex, 1);
      } else {
        req.session.cart[itemIndex].quantity = quantity;
      }

      res.json({
        message: "Cart updated",
        cart: req.session.cart,
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
      const user = await User.findById(req.user.id);
      const itemIndex = user.cart.findIndex(
        (item) => item._id.toString() === cartItemId,
      );

      if (itemIndex === -1) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      user.cart.splice(itemIndex, 1);
      user.lastCartUpdate = new Date();
      await user.save();

      res.json({
        message: "Item removed from cart",
        cart: user.cart,
      });
    } else {
      if (!req.session.cart) {
        return res.status(404).json({ message: "Cart is empty" });
      }

      const itemIndex = req.session.cart.findIndex(
        (item) => item._id === cartItemId,
      );

      if (itemIndex === -1) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      req.session.cart.splice(itemIndex, 1);

      res.json({
        message: "Item removed from cart",
        cart: req.session.cart,
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
      const count = user.cart.reduce((total, item) => total + item.quantity, 0);
      return res.json({ count });
    } else {
      const guestCart = req.session.cart || [];
      const count = guestCart.reduce((total, item) => total + item.quantity, 0);
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

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user.id);

    // Clear existing cart
    user.cart = [];

    // Add items from session
    for (const item of cartItems) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (menuItem) {
        user.cart.push({
          menuItem: item.menuItemId,
          quantity: item.quantity,
          customizations: item.customizations || {},
          addedAt: new Date(),
        });
      }
    }

    user.lastCartUpdate = new Date();
    await user.save();

    res.json({
      message: "Cart synced successfully",
      cart: user.cart,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
