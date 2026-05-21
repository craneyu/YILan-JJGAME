/**
 * 手動驗證 propagateMatchWinner 三情境的腳本（連線開發 DB）。
 *
 * 執行：
 *   cd backend && npx ts-node src/utils/__test__/matchPropagation.test.ts
 *
 * 此腳本不是正式 Jest 單元測試 — 專案目前無設定 Jest，採用獨立 ts-node 腳本驗收。
 * 結束時會清掉測試資料。
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from '../../models/Match';
import { propagateMatchWinner } from '../matchPropagation';

dotenv.config();
const MONGO_URI = process.env['MONGO_URI'] || 'mongodb://localhost:27017/jju';

async function main(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  const testEventId = new mongoose.Types.ObjectId();

  // Scenario A: 單筆下游
  await Match.create({
    eventId: testEventId,
    matchType: 'ne-waza',
    category: 'male',
    tier: 'EL',
    weightClass: '-26kg',
    round: 1,
    matchNo: 3,
    redPlayer: { name: '陳冠茗', teamName: 'Jabari' },
    bluePlayer: { name: '黃晞恩', teamName: '大隱國小' },
    scheduledOrder: 3,
    status: 'completed',
    result: { winner: 'red', method: 'judge' },
  });
  const downstream16 = await Match.create({
    eventId: testEventId,
    matchType: 'ne-waza',
    category: 'male',
    tier: 'EL',
    weightClass: '-26kg',
    round: 1,
    matchNo: 16,
    redPlayer: { name: '3 勝者', teamName: '' },
    bluePlayer: { name: '許程睿', teamName: '大隱國小' },
    scheduledOrder: 16,
    redSource: { fromMatchNo: 3, resolved: false },
  });

  const targetsA = await propagateMatchWinner({
    eventId: String(testEventId),
    completedMatchNo: 3,
    winnerName: '陳冠茗',
    winnerTeamName: 'Jabari',
  });
  console.log('Scenario A 單筆下游 — targets:', targetsA);
  const after16 = await Match.findById(downstream16._id);
  console.log(
    '  match16.red:',
    after16?.redPlayer.name,
    after16?.redPlayer.teamName,
    'redSource.resolved =',
    after16?.redSource?.resolved,
  );

  // Scenario B: 多筆下游（一場被 red 與 blue 各引一次）
  await Match.create({
    eventId: testEventId,
    matchType: 'ne-waza',
    category: 'male',
    tier: 'OPEN',
    weightClass: '-77kg',
    round: 2,
    matchNo: 76,
    redPlayer: { name: '4 勝者', teamName: '' },
    bluePlayer: { name: '其他', teamName: '某隊' },
    scheduledOrder: 76,
    redSource: { fromMatchNo: 4, resolved: false },
  });
  await Match.create({
    eventId: testEventId,
    matchType: 'ne-waza',
    category: 'male',
    tier: 'OPEN',
    weightClass: '-77kg',
    round: 2,
    matchNo: 80,
    redPlayer: { name: '其他 X', teamName: '某隊 X' },
    bluePlayer: { name: '4 勝者', teamName: '' },
    scheduledOrder: 80,
    blueSource: { fromMatchNo: 4, resolved: false },
  });
  const targetsB = await propagateMatchWinner({
    eventId: String(testEventId),
    completedMatchNo: 4,
    winnerName: '高昊宇',
    winnerTeamName: '柯林國小',
  });
  console.log('Scenario B 多筆下游 — targets count:', targetsB.length);
  console.log('  targets:', targetsB.map(t => `match=${t.matchId.slice(-6)} side=${t.side}`).join(', '));

  // Scenario C: 已 resolved 不再 propagate
  const targetsC = await propagateMatchWinner({
    eventId: String(testEventId),
    completedMatchNo: 3,
    winnerName: '其他選手',
    winnerTeamName: '其他隊',
  });
  console.log('Scenario C 已 resolved — targets:', targetsC.length, '（應為 0）');

  // 清理
  await Match.deleteMany({ eventId: testEventId });
  await mongoose.disconnect();
  console.log('測試完成。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
