const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  picture: { 
    type: String 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Ingredient', ingredientSchema);