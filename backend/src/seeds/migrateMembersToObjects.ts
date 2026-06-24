/**
 * 一次性 migration：Team.members 由 string[] 升級為 IMember[]。
 *
 * 對已是 IMember 物件的 team 跳過；對舊資料用 buildMembersFromNames 套上預設狀態。
 * 演武 team（competitionType: 'Duo' | 'Show'）成員預設 weighInStatus = 'n/a'，其他預設 'pending'。
 *
 * 使用：cd backend && ts-node src/seeds/migrateMembersToObjects.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import Team, { buildMembersFromNames } from "../models/Team";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/jju";

async function migrate(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log("[Migrate] MongoDB 已連線");

  // 用 .lean() 取原始 BSON，避免 mongoose schema 在讀取時就 coerce 成 IMember。
  const docs = await mongoose.connection
    .collection("teams")
    .find({})
    .toArray();
  let upgraded = 0;
  let skipped = 0;

  for (const doc of docs) {
    const members = doc.members as unknown;
    if (!Array.isArray(members) || members.length === 0) {
      skipped++;
      continue;
    }
    const first = members[0];
    if (first && typeof first === "object" && "name" in first) {
      skipped++;
      continue;
    }
    if (typeof first !== "string") {
      console.warn(`[Migrate] 略過異常 team ${doc._id}：members[0] type=${typeof first}`);
      skipped++;
      continue;
    }
    const competitionType = (doc.competitionType ?? "Duo") as "Duo" | "Show";
    const upgradedMembers = buildMembersFromNames(members as string[], competitionType);
    await mongoose.connection.collection("teams").updateOne(
      { _id: doc._id },
      { $set: { members: upgradedMembers } },
    );
    upgraded++;
  }

  console.log(`[Migrate] 完成：升級 ${upgraded} 筆、略過 ${skipped} 筆`);
  await mongoose.disconnect();
  // 防止 Team model 在 import 時 lint 警告：執行時用得到。
  void Team;
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error("[Migrate] 錯誤：", err);
    process.exit(1);
  });
}
