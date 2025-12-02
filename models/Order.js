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
    },
    price: {
        type: Number,
        required: true
    },
    notes: {
        type: String,
        default: ''
    }
});

const orderSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false  // Changed to false for guest orders
    },
    customerName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    orderItems: [orderItemSchema],
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'preparing', 'completed', 'cancelled'],
        default: 'pending'
    },
    deliveryAddress: { type: String, required: true },
    paymentMethod: { type: String, default: 'COD' },
    notes: { type: String, default: '' },
    loyaltyPointsEarned: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);