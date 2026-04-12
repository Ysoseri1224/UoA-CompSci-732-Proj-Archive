const mongoose = require('mongoose');
const Run = require('../src/models/Run');

async function test() {
  try {
    // 1. 连接数据库 (注意这里用 localhost 因为你是从宿主机发起的)
    await mongoose.connect('mongodb://mongo:27017/balatro_db');
    console.log("连接成功...");

    // 2. 模拟创建一个带有“幻彩红蜡封倍率牌”的 K
    const testRun = new Run({
      userId: "newbie_01",
      deck: [{
        rank: "K",
        suit: "Hearts",
        enhancement: "multi", // 倍率牌
        seal: "red",          // 红蜡封
        edition: "polychrome" // 幻彩
      }]
    });

    await testRun.save();
    console.log("✅ 数据层测试：成功存入一张三维强化卡牌！");

    const found = await Run.findOne({ userId: "newbie_01" });
    console.log("验证读取：", found.deck[0]);

    process.exit(0);
  } catch (err) {
    console.error("❌ 错误：", err);
    process.exit(1);
  }
}

test();