/**
 * 手動驗證 bulkCreateMatches：87 筆寢技測試樣本，含分級/source/bye。
 * 模擬 controller 直接呼叫。
 *
 * 執行：cd backend && npx ts-node src/utils/__test__/bulkCreateMatches.test.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Match from '../../models/Match';
import Event from '../../models/Event';
import { bulkCreateMatches } from '../../controllers/matchController';

dotenv.config();
const MONGO_URI = process.env['MONGO_URI'] || 'mongodb://localhost:27017/jju';

function makeReq(eventId: string, body: unknown) {
  return {
    params: { eventId },
    body,
    user: { role: 'admin' },
  } as unknown as Parameters<typeof bulkCreateMatches>[0];
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
  };
}

async function main(): Promise<void> {
  await mongoose.connect(MONGO_URI);

  const ev = await Event.create({
    name: 'Test 115 寢技',
    meetingType: 'tournament',
    competitionTypes: ['Duo'],
  });

  const rows = [
    {
      matchType: 'ne-waza',
      category: 'male',
      tier: 'KID',
      weightClass: '-26kg',
      round: 1,
      matchNo: 1,
      scheduledOrder: 1,
      redPlayer: { name: '董子璿', teamName: 'Jabari' },
      bluePlayer: { name: '', teamName: '' },
      isBye: true,
    },
    {
      matchType: 'ne-waza',
      category: 'male',
      tier: 'EL',
      weightClass: '-26kg',
      round: 1,
      matchNo: 3,
      scheduledOrder: 3,
      redPlayer: { name: '陳冠茗', teamName: 'Jabari' },
      bluePlayer: { name: '黃晞恩', teamName: '大隱國小' },
      isBye: false,
    },
    {
      matchType: 'ne-waza',
      category: 'male',
      tier: 'EL',
      weightClass: '-26kg',
      round: 1,
      matchNo: 16,
      scheduledOrder: 16,
      redPlayer: { name: '3 勝者', teamName: '' },
      bluePlayer: { name: '許程睿', teamName: '大隱國小' },
      redSource: { fromMatchNo: 3, resolved: false },
      isBye: false,
    },
  ];

  const req = makeReq(String(ev._id), rows);
  const res = makeRes();
  await bulkCreateMatches(
    req,
    res as unknown as Parameters<typeof bulkCreateMatches>[1],
  );
  console.log(
    'statusCode =',
    res.statusCode,
    'body.count =',
    (res.jsonBody as { count?: number })?.count,
  );

  const all = await Match.find({ eventId: ev._id }).sort({ matchNo: 1 }).lean();
  for (const m of all) {
    console.log(
      `  #${m.matchNo} tier=${m.tier} red=${m.redPlayer.name}/${m.redPlayer.teamName} blue=${m.bluePlayer.name}/${m.bluePlayer.teamName} isBye=${m.isBye} redSource=${JSON.stringify(m.redSource ?? null)} matchDuration=${m.matchDuration}`,
    );
  }

  // 清理
  await Match.deleteMany({ eventId: ev._id });
  await Event.findByIdAndDelete(ev._id);
  await mongoose.disconnect();
  console.log('\n測試完成。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
