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
  { username: 'FireMage',    email: 'fire@test.com',    stats: { totalGames: 156, totalWins: 103, winRate: 66, maxDamage: 2500 } },
  { username: 'WaterLord',   email: 'water@test.com',   stats: { totalGames: 234, totalWins: 149, winRate: 64, maxDamage: 3200 } },
  { username: 'GrassKing',   email: 'grass@test.com',   stats: { totalGames: 98,  totalWins: 57,  winRate: 58, maxDamage: 1800 } },
  { username: 'NoobPlayer',  email: 'noob@test.com',    stats: { totalGames: 47,  totalWins: 18,  winRate: 38, maxDamage: 600  } },
  { username: 'DeckMaster',  email: 'deck@test.com',    stats: { totalGames: 312, totalWins: 218, winRate: 70, maxDamage: 4100 } },
  { username: 'CasualGamer', email: 'casual@test.com',   stats: { totalGames: 73,  totalWins: 34,  winRate: 47, maxDamage: 1200 } },
  { username: 'BossSlayer',  email: 'slayer@test.com',   stats: { totalGames: 189, totalWins: 125, winRate: 66, maxDamage: 3500 } },
  { username: 'FreshStart',  email: 'fresh@test.com',    stats: { totalGames: 8,   totalWins: 4,   winRate: 50, maxDamage: 300  } },
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

  // 清空已有种子数据（按 email 匹配 @test.com，避免误删真实数据）
  const seedEmails = SEED_USERS.map(u => u.email);
  const deletedUsers = await User.deleteMany({ email: { $in: seedEmails } });
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

  // 给每个用户生成多场 Match 记录（模拟测试历史）
  const bosses = ['boss_layer_1', 'boss_layer_2', 'boss_layer_3', 'boss_layer_4', 'boss_layer_5'];
  const elements = ['WATER', 'FIRE', 'GRASS'] as const;
  const matches = [];
  for (const user of users) {
    const count = 8 + Math.floor(Math.random() * 12); // 每人 8~19 场
    for (let i = 0; i < count; i++) {
      matches.push({
        matchType: 'PVE',
        userId: user._id,
        bossId: bosses[i % bosses.length],
        layer: (i % 5) + 1,
        isWin: Math.random() < (user.stats.winRate / 100),
        chosenElement: elements[i % 3],
        totalDamageDealt: 400 + Math.floor(Math.random() * 2500),
        roundsPlayed: 3 + Math.floor(Math.random() * 15),
        endedAt: new Date(Date.now() - i * 43200000), // 每半天下沉一场
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
