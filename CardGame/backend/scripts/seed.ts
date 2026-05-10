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
  { username: 'test01',   email: 'test01@test.com', stats: { totalGames: 67,  totalWins: 44, winRate: 66, maxDamage: 2500 } },
  { username: 'test02',   email: 'test02@test.com', stats: { totalGames: 89,  totalWins: 55, winRate: 62, maxDamage: 2100 } },
  { username: 'test03',   email: 'test03@test.com', stats: { totalGames: 34,  totalWins: 21, winRate: 62, maxDamage: 1800 } },
  { username: 'player42', email: 'p42@test.com',    stats: { totalGames: 103, totalWins: 71, winRate: 69, maxDamage: 3200 } },
  { username: 'player77', email: 'p77@test.com',    stats: { totalGames: 56,  totalWins: 38, winRate: 68, maxDamage: 2800 } },
  { username: 'qwerty',   email: 'qw@test.com',      stats: { totalGames: 41,  totalWins: 16, winRate: 39, maxDamage: 900  } },
  { username: 'asdfgh',   email: 'as@test.com',      stats: { totalGames: 22,  totalWins: 7,  winRate: 32, maxDamage: 500  } },
  { username: 'newbie',   email: 'new@test.com',    stats: { totalGames: 5,   totalWins: 2,  winRate: 40, maxDamage: 250  } },
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
  console.log(`  Email:    test01@test.com`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`\nLeaderboard:  http://localhost:3000/api/leaderboard`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
