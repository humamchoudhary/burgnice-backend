const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String }, // URL or path
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
    ],
    isAvailable: { type: Boolean, default: true },
    isTopDeal: { type: Boolean, default: false }, // Add this line
  },
  { timestamps: true },
);

module.exports = mongoose.model("MenuItem", menuItemSchema);
