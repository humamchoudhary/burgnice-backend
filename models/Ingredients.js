const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  picture: { type: String } // URL or file path for the ingredient image
}, { timestamps: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);
