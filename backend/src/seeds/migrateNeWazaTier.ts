/**
 * Migration script: 將寢技 Match 文件的 tier 從舊「ELEM」轉為新的 EL/EM/EH。
 * 因為 ELEM 對應 Excel 三個年級（國小低/中/高），無法自動推測 — 預設僅列出受影響筆數。
 *
 * 執行方式：
 *   cd backend && npx ts-node src/seeds/migrateNeWazaTier.ts             # dry-run（預設）
 *   cd backend && npx ts-node src/seeds/migrateNeWazaTier.ts --map ELEM=EL  # 將所有 ELEM 改為 EL
 *   cd backend && npx ts-node src/seeds/migrateNeWazaTier.ts --map ELEM=EM
 *   cd backend && npx ts-node src/seeds/migrateNeWazaTier.ts --map ELEM=EH
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env['MONGO_URI'] || 'mongodb://localhost:27017/jju';

const ALLOWED_TARGETS = ['KID', 'EL', 'EM', 'EH', 'JH', 'SH', 'OPEN'] as const;
type AllowedTarget = (typeof ALLOWED_TARGETS)[number];

function parseMapArg(argv: string[]): AllowedTarget | null {
  const idx = argv.indexOf('--map');
  if (idx === -1) return null;
  const value = argv[idx + 1];
  if (!value) {
    throw new Error('--map 需要參數，例如：--map ELEM=EL');
  }
  const [from, to] = value.split('=');
  if (from !== 'ELEM') {
    throw new Error(`--map 來源必須為 ELEM，收到 "${from}"`);
  }
  if (!ALLOWED_TARGETS.includes(to as AllowedTarget)) {
    throw new Error(`--map 目標必須為 ${ALLOWED_TARGETS.join('|')}，收到 "${to}"`);
  }
  return to as AllowedTarget;
}

async function migrate(): Promise<void> {
  const target = parseMapArg(process.argv);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;
  const matches = db.collection('matches');

  const affected = await matches
    .find({ matchType: 'ne-waza', tier: 'ELEM' })
    .project({ matchNo: 1, category: 1, weightClass: 1, redPlayer: 1, bluePlayer: 1 })
    .toArray();

  console.log(`找到 ${affected.length} 筆 tier=ELEM 寢技場次：`);
  for (const m of affected) {
    console.log(
      `  matchNo=${m['matchNo']} category=${m['category']} weight=${m['weightClass']} red=${m['redPlayer']?.name ?? ''} blue=${m['bluePlayer']?.name ?? ''}`,
    );
  }

  if (!target) {
    console.log('\n[dry-run] 未指定 --map，未實際更新。');
    console.log('如要批次轉換，執行：');
    console.log('  npx ts-node src/seeds/migrateNeWazaTier.ts --map ELEM=EL  # 或 EM / EH');
    await mongoose.disconnect();
    return;
  }

  const result = await matches.updateMany(
    { matchType: 'ne-waza', tier: 'ELEM' },
    { $set: { tier: target } },
  );
  console.log(`\n已將 ${result.modifiedCount} 筆 tier=ELEM → ${target}`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration 失敗:', err);
  process.exit(1);
});
