const mongoose = require('mongoose');
const CardSchema = require('./Card');

const RunSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  
  // 1.2 手牌机制
  hands: { type: Number, default: 4 },      // 剩余出牌次数
  discards: { type: Number, default: 3 },   // 剩余弃牌次数
  handLimit: { type: Number, default: 8 },  // 手牌上限
  
  // 牌组与当前手牌
  deck: [CardSchema], 
  hand: [CardSchema],
  
  // 2.3 牌型等级：记录每种牌型当前的筹码和倍率
  pokerLevels: {
    type: Map,
    of: new mongoose.Schema({
      level: { type: Number, default: 1 },
      chips: { type: Number },
      mult: { type: Number }
    }),
    default: {
      "High Card": { level: 1, chips: 5, mult: 1 },
      "Pair": { level: 1, chips: 10, mult: 2 },
      "Flush": { level: 1, chips: 35, mult: 4 }
    }
  },
  
  // 4.1 小丑牌（有序数组，位置决定结算顺序）
  jokers: [{
    jokerId: String,
    name: String,
    effect: mongoose.Schema.Types.Mixed
  }]
}, { timestamps: true });

module.exports = mongoose.model('Run', RunSchema);