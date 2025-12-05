const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  loyaltyPointsUsed: {
    type: Number,
    default: 0,
  },
  cart: [
    {
      menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem",
        required: true
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1
      },
      customizations: {
        type: Map,
        of: String,
        default: {}
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    },
  ],
  orderHistory: [{
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastCartUpdate: {
    type: Date
  },
  shippingAddress: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  phoneNumber: String,
  preferences: {
    newsletter: {
      type: Boolean,
      default: true
    },
    notifications: {
      type: Boolean,
      default: true
    }
  }
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changePassword = async function(newPassword) {
  // Password validation
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  // Additional password strength validation
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumbers = /\d/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  
  if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
    throw new Error('Password must contain uppercase, lowercase, number, and special character');
  }
  
  this.password = newPassword;
  return await this.save();
};
// Method to apply loyalty discount
userSchema.methods.applyLoyaltyDiscount = function(orderTotal) {
  if (this.loyaltyPoints < 10 || orderTotal < 10) {
    return {
      discountAmount: 0,
      pointsUsed: 0,
      discountPercentage: 0
    };
  }
  
  const maxStacks = Math.floor(this.loyaltyPoints / 10);
  const discountPercentage = Math.min(maxStacks * 10, 50);
  const discountAmount = (orderTotal * discountPercentage) / 100;
  const pointsUsed = Math.floor(maxStacks * 10);
  
  return {
    discountAmount,
    pointsUsed,
    discountPercentage
  };
};

// Method to add order to history
userSchema.methods.addToOrderHistory = async function(orderId) {
  if (!this.orderHistory.some(item => item.order.toString() === orderId.toString())) {
    this.orderHistory.push({
      order: orderId,
      addedAt: new Date()
    });
    
    // Keep only last 50 orders
    if (this.orderHistory.length > 50) {
      this.orderHistory = this.orderHistory.slice(-50);
    }
    
    await this.save();
  }
};

// Method to add item to cart
userSchema.methods.addToCart = async function(menuItemId, quantity = 1, customizations = {}) {
  const existingItemIndex = this.cart.findIndex(
    item => item.menuItem.toString() === menuItemId.toString()
  );

  if (existingItemIndex > -1) {
    // Update existing item
    this.cart[existingItemIndex].quantity += quantity;
    this.cart[existingItemIndex].customizations = customizations;
    this.cart[existingItemIndex].addedAt = new Date();
  } else {
    // Add new item
    this.cart.push({
      menuItem: menuItemId,
      quantity,
      customizations,
      addedAt: new Date()
    });
  }

  this.lastCartUpdate = new Date();
  return await this.save();
};

// Method to remove item from cart
userSchema.methods.removeFromCart = async function(cartItemId) {
  const itemIndex = this.cart.findIndex(
    item => item._id.toString() === cartItemId
  );

  if (itemIndex === -1) {
    throw new Error('Cart item not found');
  }

  this.cart.splice(itemIndex, 1);
  this.lastCartUpdate = new Date();
  return await this.save();
};

// Method to update cart item quantity
userSchema.methods.updateCartItem = async function(cartItemId, quantity) {
  const itemIndex = this.cart.findIndex(
    item => item._id.toString() === cartItemId
  );

  if (itemIndex === -1) {
    throw new Error('Cart item not found');
  }

  if (quantity <= 0) {
    this.cart.splice(itemIndex, 1);
  } else {
    this.cart[itemIndex].quantity = quantity;
    this.cart[itemIndex].addedAt = new Date();
  }

  this.lastCartUpdate = new Date();
  return await this.save();
};

// Method to clear cart
userSchema.methods.clearCart = async function() {
  this.cart = [];
  this.lastCartUpdate = new Date();
  return await this.save();
};

module.exports = mongoose.model("User", userSchema);