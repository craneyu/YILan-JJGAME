import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jju';

const users = [
  { username: 'admin',    password: 'admin123',    role: 'admin' as const },
  { username: 'judge1',   password: 'judge123',    role: 'scoring_judge' as const, judgeNo: 1 },
  { username: 'judge2',   password: 'judge123',    role: 'scoring_judge' as const, judgeNo: 2 },
  { username: 'judge3',   password: 'judge123',    role: 'scoring_judge' as const, judgeNo: 3 },
  { username: 'judge4',   password: 'judge123',    role: 'scoring_judge' as const, judgeNo: 4 },
  { username: 'judge5',   password: 'judge123',    role: 'scoring_judge' as const, judgeNo: 5 },
  { username: 'vr',       password: 'vr123',       role: 'vr_judge' as const },
  { username: 'seq',      password: 'seq123',      role: 'sequence_judge' as const },
  { username: 'audience', password: 'audience123', role: 'audience' as const },
];

// 可被 index.ts 引用，在 MongoDB 已連線的情況下執行種子
export async function seedIfNeeded(): Promise<void> {
  const count = await User.countDocuments();
  if (count > 0) {
    console.log('[Seed] 使用者已存在，略過初始化');
    return;
  }
  console.log('[Seed] 初始化預設使用者...');
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, passwordHash });
    console.log(`[Seed] 建立使用者：${u.username}（${u.role}）`);
  }
  console.log('[Seed] 完成');
}

// 獨立執行：npm run seed
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[Seed] MongoDB 已連線');
  for (const u of users) {
    const exists = await User.findOne({ username: u.username });
    if (exists) {
      console.log(`[Seed] 略過已存在的使用者：${u.username}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, passwordHash });
    console.log(`[Seed] 建立使用者：${u.username}（${u.role}）`);
  }
  console.log('[Seed] 完成');
  await mongoose.disconnect();
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('[Seed] 錯誤：', err);
    process.exit(1);
  });
}
