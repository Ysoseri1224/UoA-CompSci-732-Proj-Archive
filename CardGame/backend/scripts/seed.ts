import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';
import { Match } from '../src/models/Match.js';
import { Achievement } from '../src/models/Achievement.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/balatro_db';
const PASSWORD = 'test123456'; // 所有测试用户同一密码

// ══════════════════════════════════════════════════════════════════
//  测试用户数据
// ══════════════════════════════════════════════════════════════════

interface SeedUser {
  username: string;
  email: string;
  stats: { totalGames: number; totalWins: number; winRate: number; maxDamage: number };
}

const SEED_USERS: SeedUser[] = [
  { username: 'FireMage',    email: 'fire@test.com',    stats: { totalGames: 45, totalWins: 38, winRate: 84, maxDamage: 2500 } },
  { username: 'WaterLord',   email: 'water@test.com',   stats: { totalGames: 62, totalWins: 48, winRate: 77, maxDamage: 3200 } },
  { username: 'GrassKing',   email: 'grass@test.com',   stats: { totalGames: 30, totalWins: 22, winRate: 73, maxDamage: 1800 } },
  { username: 'NoobPlayer',  email: 'noob@test.com',    stats: { totalGames: 12, totalWins: 3,  winRate: 25, maxDamage: 600  } },
  { username: 'DeckMaster',  email: 'deck@test.com',    stats: { totalGames: 88, totalWins: 70, winRate: 79, maxDamage: 4100 } },
  { username: 'CasualGamer', email: 'casual@test.com',   stats: { totalGames: 20, totalWins: 11, winRate: 55, maxDamage: 1200 } },
  { username: 'BOSSslayer',  email: 'slayer@test.com',   stats: { totalGames: 55, totalWins: 44, winRate: 80, maxDamage: 3500 } },
  { username: 'FreshStart',  email: 'fresh@test.com',    stats: { totalGames: 1,  totalWins: 1,  winRate: 100,maxDamage: 300  } },
];

// ══════════════════════════════════════════════════════════════════
//  Achievement 数据
// ══════════════════════════════════════════════════════════════════

const SEED_ACHIEVEMENTS = [
  { achievementId: 'first_win',     name: '初战告捷', description: '赢下第一局游戏',           conditionType: 'totalWins',  conditionValue: 1 },
  { achievementId: 'ten_wins',      name: '十连胜',   description: '累计赢得 10 场胜利',        conditionType: 'totalWins',  conditionValue: 10 },
  { achievementId: 'fifty_wins',    name: '百战老将', description: '累计赢得 50 场胜利',        conditionType: 'totalWins',  conditionValue: 50 },
  { achievementId: 'reach_layer5',  name: '深渊行者', description: '达到第 5 层',               conditionType: 'maxLayer',   conditionValue: 5 },
  { achievementId: 'reach_layer10', name: '塔顶之人', description: '达到第 10 层',              conditionType: 'maxLayer',   conditionValue: 10 },
  { achievementId: 'dmg_1k',        name: '新手之力', description: '单局造成 1000 伤害',         conditionType: 'maxDamage',  conditionValue: 1000 },
  { achievementId: 'dmg_3k',        name: '毁灭之力', description: '单局造成 3000 伤害',         conditionType: 'maxDamage',  conditionValue: 3000 },
  { achievementId: 'play_50',       name: '常客',     description: '累计进行 50 场游戏',        conditionType: 'totalGames', conditionValue: 50 },
];

// ══════════════════════════════════════════════════════════════════
//  Seed 主函数
// ══════════════════════════════════════════════════════════════════

async function seed() {
  console.log(`Connecting to ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  // 清空已有种子数据（按 username 精确清理，避免误删真实数据）
  const seedUsernames = SEED_USERS.map(u => u.username);
  const deletedUsers = await User.deleteMany({ username: { $in: seedUsernames } });
  console.log(`Cleared ${deletedUsers.deletedCount} existing seed users.`);

  // 创建用户
  const hash = await bcrypt.hash(PASSWORD, 10);
  const users = await User.insertMany(
    SEED_USERS.map(u => ({
      username: u.username,
      email: u.email,
      passwordHash: hash,
      stats: u.stats,
    })),
  );
  console.log(`Inserted ${users.length} test users.`);

  // 创建 Achievements（upsert 防重复）
  for (const a of SEED_ACHIEVEMENTS) {
    await Achievement.findOneAndUpdate(
      { achievementId: a.achievementId },
      a,
      { upsert: true, new: true },
    );
  }
  console.log(`Upserted ${SEED_ACHIEVEMENTS.length} achievements.`);

  // 给高胜率用户创建几场 Match 记录
  const topUsers = users.filter(u =>
    ['FireMage', 'DeckMaster', 'BOSSslayer'].includes(u.username),
  );
  const bosses = ['boss_layer_1', 'boss_layer_3', 'boss_layer_5'];
  const matches = [];
  for (const user of topUsers) {
    for (let i = 0; i < 3; i++) {
      matches.push({
        matchType: 'PVE',
        userId: user._id,
        bossId: bosses[i],
        layer: i * 2 + 1,
        isWin: Math.random() > 0.3,
        chosenElement: ['WATER', 'FIRE', 'GRASS'][i],
        totalDamageDealt: 500 + Math.floor(Math.random() * 2000),
        roundsPlayed: 5 + Math.floor(Math.random() * 10),
        endedAt: new Date(Date.now() - (i + 1) * 86400000),
      });
    }
  }
  const insertedMatches = await Match.insertMany(matches);
  console.log(`Inserted ${insertedMatches.length} sample matches.`);

  console.log('\nSeed complete. Test login:');
  console.log(`  Email:    fire@test.com`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`\nLeaderboard:  http://localhost:3000/api/leaderboard`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
