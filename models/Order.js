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
        required: false
    },
    customerName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    orderItems: [orderItemSchema],
    subtotal: { type: Number, required: true }, // Added subtotal
    discountAmount: { type: Number, default: 0 }, // Added discount from loyalty points
    loyaltyPointsUsed: { type: Number, default: 0 }, // Added points used
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