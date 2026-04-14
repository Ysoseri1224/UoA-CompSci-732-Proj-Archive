import mongoose from 'mongoose';

const CardSchema = new mongoose.Schema({
  rank: { type: String, required: true }, // 2-10, J, Q, K, A
  suit: { type: String, required: true }, // Spades, Hearts, Clubs, Diamonds
  
  // 5.1 增强 (Enhancement) - 最多1种
  enhancement: { 
    type: String, 
    enum: ['none', 'bonus', 'multi', 'wild', 'glass', 'steel', 'stone', 'gold', 'lucky'], 
    default: 'none' 
  },
  
  // 5.2 蜡封 (Seal) - 最多1种
  seal: { 
    type: String, 
    enum: ['none', 'gold', 'red', 'blue', 'purple'], 
    default: 'none' 
  },
  
  // 5.3 版本 (Edition) - 最多1种
  edition: { 
    type: String, 
    enum: ['none', 'foil', 'holographic', 'polychrome'], 
    default: 'none' 
  }
});

export default CardSchema;