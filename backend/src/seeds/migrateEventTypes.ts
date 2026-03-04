/**
 * Migration script: 將舊 competitionType 單值欄位轉為 competitionTypes 陣列
 * - 'kata'     → competitionTypes: ['Duo']
 * - 'creative' → competitionTypes: ['Show']
 * - 無欄位     → competitionTypes: ['Duo'] (Mongoose default 已處理)
 *
 * 執行方式：
 *   cd backend && npx ts-node src/seeds/migrateEventTypes.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env['MONGO_URI'] || 'mongodb://localhost:27017/jju';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;
  const eventsCollection = db.collection('events');

  // 將 competitionType: 'kata' 轉為 competitionTypes: ['Duo']
  const duoResult = await eventsCollection.updateMany(
    { competitionType: 'kata', competitionTypes: { $exists: false } },
    { $set: { competitionTypes: ['Duo'] }, $unset: { competitionType: '' } }
  );
  console.log(`kata → Duo: ${duoResult.modifiedCount} 筆`);

  // 將 competitionType: 'creative' 轉為 competitionTypes: ['Show']
  const showResult = await eventsCollection.updateMany(
    { competitionType: 'creative', competitionTypes: { $exists: false } },
    { $set: { competitionTypes: ['Show'] }, $unset: { competitionType: '' } }
  );
  console.log(`creative → Show: ${showResult.modifiedCount} 筆`);

  // 清除其他仍有 competitionType 欄位的文件
  const cleanupResult = await eventsCollection.updateMany(
    { competitionType: { $exists: true } },
    { $unset: { competitionType: '' } }
  );
  console.log(`清除舊 competitionType 欄位: ${cleanupResult.modifiedCount} 筆`);

  await mongoose.disconnect();
  console.log('Migration 完成');
}

migrate().catch((err) => {
  console.error('Migration 失敗:', err);
  process.exit(1);
});
