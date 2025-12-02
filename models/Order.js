const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  }
});

const orderSchema = new mongoose.Schema({
  user: { type: String, required: true },  
  orderItems: [orderItemSchema],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'completed', 'cancelled'],
    default: 'pending'
  },
  deliveryAddress: { type: String, required: true },
  contactPhone: { type: String, required: true },
  paymentMethod: { type: String, default: 'COD' }, // added
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
