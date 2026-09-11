/**
 * 一次性 migration：去除既有資料中隊伍名稱、成員姓名、場次選手姓名的前後空白。
 *
 * Excel 匯入的儲存格常帶尾端空白（例：「余明翰 」），導致同一人在檢錄、
 * 重複檢查與場次比對時被視為兩個不同姓名。匯入端已在
 * teamController 加上 trim，此腳本負責清理匯入修正前既存的資料。
 *
 * Idempotent：已無空白的資料會被略過，可重複執行。
 *
 * 使用：cd backend && npx ts-node src/seeds/trimMemberNames.ts
 *   容器內：docker compose exec backend node dist/seeds/trimMemberNames.js
 */
import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/jju";

/** 回傳 trim 後的字串；非字串原樣回傳。 */
function trimValue(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

async function trimTeams(): Promise<number> {
  const teams = await mongoose.connection.collection("teams").find({}).toArray();
  let updated = 0;

  for (const doc of teams) {
    const set: Record<string, unknown> = {};

    const trimmedName = trimValue(doc.name);
    if (trimmedName !== doc.name) set["name"] = trimmedName;

    const members = doc.members as unknown;
    if (Array.isArray(members)) {
      // 同時支援 migrate 前的 string[] 與 migrate 後的 IMember[]
      const trimmedMembers = members.map((m) =>
        typeof m === "string"
          ? m.trim()
          : m && typeof m === "object"
            ? { ...m, name: trimValue((m as { name?: unknown }).name) }
            : m,
      );
      if (JSON.stringify(trimmedMembers) !== JSON.stringify(members)) {
        set["members"] = trimmedMembers;
      }
    }

    if (Object.keys(set).length > 0) {
      await mongoose.connection.collection("teams").updateOne({ _id: doc._id }, { $set: set });
      updated++;
    }
  }

  return updated;
}

async function trimMatches(): Promise<number> {
  const matches = await mongoose.connection.collection("matches").find({}).toArray();
  let updated = 0;

  for (const doc of matches) {
    const set: Record<string, unknown> = {};

    for (const side of ["redPlayer", "bluePlayer"] as const) {
      const player = doc[side] as { name?: unknown; teamName?: unknown } | undefined;
      if (!player || typeof player !== "object") continue;
      const name = trimValue(player.name);
      const teamName = trimValue(player.teamName);
      if (name !== player.name) set[`${side}.name`] = name;
      if (teamName !== player.teamName) set[`${side}.teamName`] = teamName;
    }

    if (Object.keys(set).length > 0) {
      await mongoose.connection.collection("matches").updateOne({ _id: doc._id }, { $set: set });
      updated++;
    }
  }

  return updated;
}

async function migrate(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log("[TrimNames] MongoDB 已連線");

  const teamsUpdated = await trimTeams();
  const matchesUpdated = await trimMatches();

  console.log(`[TrimNames] 完成：teams 更新 ${teamsUpdated} 筆、matches 更新 ${matchesUpdated} 筆`);
  await mongoose.disconnect();
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error("[TrimNames] 錯誤：", err);
    process.exit(1);
  });
}

export { migrate, trimTeams, trimMatches };
