/**
 * 手動驗證 updateMatch 的三情境：
 *   (a) bye match：PATCH pending → completed 成功
 *   (b) 非 bye match：PATCH pending → completed 回 409（沿用既有狀態機）
 *   (c) 完賽含 redSource 引用的下游場次 → 下游 player.name 更新
 *
 * 直接呼叫 controller，模擬 Express req/res。
 *
 * 執行：cd backend && npx ts-node src/utils/__test__/updateMatchPropagation.test.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import Match from '../../models/Match';
import { updateMatch } from '../../controllers/matchController';
import { initSocketIO } from '../../sockets/index';

dotenv.config();
const MONGO_URI = process.env['MONGO_URI'] || 'mongodb://localhost:27017/jju';

function makeReq(matchId: string, body: object) {
  return {
    params: { matchId },
    body,
    user: { role: 'admin' },
  } as unknown as Parameters<typeof updateMatch>[0];
}

function makeRes() {
  let _status = 200;
  let _body: unknown = null;
  return {
    status(code: number) {
      _status = code;
      return this;
    },
    json(payload: unknown) {
      _body = payload;
      return this;
    },
    get statusCode() {
      return _status;
    },
    get jsonBody() {
      return _body;
    },
  } as unknown as Parameters<typeof updateMatch>[1] & {
    statusCode: number;
    jsonBody: unknown;
  };
}

async function main(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  const httpServer = createServer();
  initSocketIO(httpServer);
  const eventId = new mongoose.Types.ObjectId();

  console.log('--- Scenario A: bye match pending → completed 應成功 ---');
  const bye = await Match.create({
    eventId,
    matchType: 'ne-waza',
    category: 'male',
    tier: 'EL',
    weightClass: '-26kg',
    round: 1,
    matchNo: 1,
    redPlayer: { name: '董子璿', teamName: 'Jabari' },
    bluePlayer: { name: '', teamName: '' },
    isBye: true,
    scheduledOrder: 1,
  });
  const reqA = makeReq(String(bye._id), {
    status: 'completed',
    result: { winner: 'red', method: 'judge' },
  });
  const resA = makeRes() as ReturnType<typeof makeRes>;
  await updateMatch(reqA, resA as unknown as Parameters<typeof updateMatch>[1]);
  console.log(
    '  statusCode =',
    (resA as unknown as { statusCode: number }).statusCode,
    '預期 200',
  );
  const byeReloaded = await Match.findById(bye._id);
  console.log(
    '  match.status =',
    byeReloaded?.status,
    'result =',
    JSON.stringify(byeReloaded?.result),
  );

  console.log('\n--- Scenario B: 非 bye match pending → completed 應 409 ---');
  const normal = await Match.create({
    eventId,
    matchType: 'ne-waza',
    category: 'male',
    tier: 'EL',
    weightClass: '-26kg',
    round: 1,
    matchNo: 3,
    redPlayer: { name: '陳冠茗', teamName: 'Jabari' },
    bluePlayer: { name: '黃晞恩', teamName: '大隱國小' },
    isBye: false,
    scheduledOrder: 3,
  });
  const reqB = makeReq(String(normal._id), {
    status: 'completed',
    result: { winner: 'red', method: 'judge' },
  });
  const resB = makeRes() as ReturnType<typeof makeRes>;
  await updateMatch(reqB, resB as unknown as Parameters<typeof updateMatch>[1]);
  console.log(
    '  statusCode =',
    (resB as unknown as { statusCode: number }).statusCode,
    '預期 409',
  );

  console.log('\n--- Scenario C: completed 同時 propagate 下游 ---');
  const downstream = await Match.create({
    eventId,
    matchType: 'ne-waza',
    category: 'male',
    tier: 'EL',
    weightClass: '-26kg',
    round: 1,
    matchNo: 16,
    redPlayer: { name: '3 勝者', teamName: '' },
    bluePlayer: { name: '許程睿', teamName: '大隱國小' },
    redSource: { fromMatchNo: 3, resolved: false },
    isBye: false,
    scheduledOrder: 16,
  });
  // 先把 #3 走到 in-progress 才能 completed（遵循狀態機）
  normal.status = 'in-progress';
  await normal.save();
  const reqC = makeReq(String(normal._id), {
    status: 'completed',
    result: { winner: 'red', method: 'submission' },
  });
  const resC = makeRes() as ReturnType<typeof makeRes>;
  await updateMatch(reqC, resC as unknown as Parameters<typeof updateMatch>[1]);
  const dsReloaded = await Match.findById(downstream._id);
  console.log(
    '  下游 #16 redPlayer =',
    dsReloaded?.redPlayer.name,
    dsReloaded?.redPlayer.teamName,
    'redSource.resolved =',
    dsReloaded?.redSource?.resolved,
  );

  // 清理
  await Match.deleteMany({ eventId });
  await mongoose.disconnect();
  httpServer.close();
  console.log('\n測試完成。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
