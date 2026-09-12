import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/jju";

const users = [
  { username: "admin", password: "admin123", role: "admin" as const },
  {
    username: "judge1",
    password: "judge123",
    role: "scoring_judge" as const,
    judgeNo: 1,
  },
  {
    username: "judge2",
    password: "judge123",
    role: "scoring_judge" as const,
    judgeNo: 2,
  },
  {
    username: "judge3",
    password: "judge123",
    role: "scoring_judge" as const,
    judgeNo: 3,
  },
  {
    username: "judge4",
    password: "judge123",
    role: "scoring_judge" as const,
    judgeNo: 4,
  },
  {
    username: "judge5",
    password: "judge123",
    role: "scoring_judge" as const,
    judgeNo: 5,
  },
  { username: "vr", password: "vr123", role: "vr_judge" as const },
  { username: "seq", password: "seq123", role: "sequence_judge" as const },
  { username: "audience", password: "audience123", role: "audience" as const },
  { username: "match", password: "match123", role: "match_referee" as const },
  { username: "checkin", password: "checkin123", role: "check_in_officer" as const },
];

// 可被 index.ts 引用，在 MongoDB 已連線的情況下執行種子
export async function seedIfNeeded(): Promise<void> {
  // 逐一補建缺少的帳號，不可用「已有任何使用者就整個略過」判斷：
  // 那會讓清單後來新增的角色（例如檢錄人員 check_in_officer）
  // 在既有資料庫上永遠不會被建立，必須手動補。
  // 既有帳號一律不動，不會覆寫已變更的密碼或指派的賽事。
  const created: string[] = [];
  for (const u of users) {
    if (await User.findOne({ username: u.username })) continue;
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, passwordHash });
    created.push(`${u.username}（${u.role}）`);
  }
  if (created.length === 0) {
    console.log("[Seed] 預設使用者皆已存在");
    return;
  }
  console.log(`[Seed] 補建預設使用者：${created.join("、")}`);
}

// 獨立執行：npm run seed
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("[Seed] MongoDB 已連線");
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
  console.log("[Seed] 完成");
  await mongoose.disconnect();
}

if (require.main === module) {
  seed().catch((err) => {
    console.error("[Seed] 錯誤：", err);
    process.exit(1);
  });
}
