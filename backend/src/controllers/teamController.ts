import { Request, Response } from 'express';
import Team from '../models/Team';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';

export async function listTeams(req: Request, res: Response): Promise<void> {
  const teams = await Team.find({ eventId: req.params.id }).sort({ order: 1 });
  res.json({ success: true, data: teams });
}

export async function createTeam(req: Request, res: Response): Promise<void> {
  const { name, members, category, order } = req.body;
  if (!name || !members || !category || order === undefined) {
    res.status(400).json({ success: false, error: '請填寫所有必填欄位' });
    return;
  }

  // 同組別內檢查隊員唯一性（同單位可在同組派多支隊伍，故不限隊名）
  const duplicateMembers = await checkConflictInCategory(req.params.id as string, category, members);
  if (duplicateMembers.length > 0) {
    res.status(409).json({
      success: false,
      error: `以下隊員在此組別已存在：${duplicateMembers.join('、')}`,
    });
    return;
  }

  const team = await Team.create({
    eventId: req.params.id,
    name,
    members,
    category,
    order,
  });
  res.status(201).json({ success: true, data: team });
}

export async function updateTeam(req: Request, res: Response): Promise<void> {
  const { name, members, category, order } = req.body;
  const team = await Team.findOneAndUpdate(
    { _id: req.params.teamId, eventId: req.params.id },
    { ...(name && { name }), ...(members && { members }), ...(category && { category }), ...(order !== undefined && { order }) },
    { new: true }
  );
  if (!team) {
    res.status(404).json({ success: false, error: '隊伍不存在' });
    return;
  }
  res.json({ success: true, data: team });
}

export async function deleteTeam(req: Request, res: Response): Promise<void> {
  const team = await Team.findOneAndDelete({
    _id: req.params.teamId,
    eventId: req.params.id,
  });
  if (!team) {
    res.status(404).json({ success: false, error: '隊伍不存在' });
    return;
  }
  res.json({ success: true, data: { message: '已刪除' } });
}

export async function batchUpdateOrder(req: Request, res: Response): Promise<void> {
  const { orders } = req.body as { orders: Array<{ id: string; order: number }> };
  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    res.status(400).json({ success: false, error: '請提供場次資料' });
    return;
  }

  await Promise.all(
    orders.map(({ id, order }) =>
      Team.findOneAndUpdate(
        { _id: id, eventId: req.params.id },
        { order },
        { new: true }
      )
    )
  );

  const teams = await Team.find({ eventId: req.params.id }).sort({ order: 1 });
  res.json({ success: true, data: teams });
}

export async function batchDeleteTeams(req: Request, res: Response): Promise<void> {
  const { ids } = req.body as { ids?: string[] };
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ success: false, error: '請提供要刪除的隊伍 ID 清單' });
    return;
  }
  const result = await Team.deleteMany({ _id: { $in: ids }, eventId: req.params.id });
  res.json({ success: true, data: { deleted: result.deletedCount } });
}

// 同組別內檢查隊員姓名是否重複（不同組別的同名隊員允許存在）
// 注意：同組別允許同單位多支隊伍，故不檢查隊名唯一性
async function checkConflictInCategory(
  eventId: string,
  category: string,
  newMembers: string[]
): Promise<string[]> {
  const teamsInCategory = await Team.find({ eventId, category });
  const existingMembers = new Set(teamsInCategory.flatMap((t) => t.members));
  return newMembers.filter((m: string) => existingMembers.has(m));
}

export const upload = multer({ storage: multer.memoryStorage() });

interface ImportRow {
  隊伍名稱?: string;
  team?: string;
  隊員一姓名?: string;
  隊員一?: string;
  member1?: string;
  隊員二姓名?: string;
  隊員二?: string;
  member2?: string;
  組別?: string;
  category?: string;
}

export async function importTeams(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: '請上傳檔案' });
    return;
  }

  const eventId = req.params.id as string;
  const filename = req.file.originalname.toLowerCase();
  let rows: ImportRow[] = [];

  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<ImportRow>(sheet);
  } else if (filename.endsWith('.csv')) {
    rows = await new Promise<ImportRow[]>((resolve, reject) => {
      const results: ImportRow[] = [];
      Readable.from(req.file!.buffer.toString())
        .pipe(csvParser())
        .on('data', (row: ImportRow) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  } else {
    res.status(400).json({ success: false, error: '僅支援 .xlsx 或 .csv 格式' });
    return;
  }

  const successList: string[] = [];
  const conflictList: string[] = [];
  const existingCount = await Team.countDocuments({ eventId });
  let orderCounter = existingCount + 1;

  for (const row of rows) {
    const teamName = row['隊伍名稱'] || row['team'] || '';
    // 同時支援「隊員一姓名」（SPEC 格式）與「隊員一」（簡略格式）
    const member1 = row['隊員一姓名'] || row['隊員一'] || row['member1'] || '';
    const member2 = row['隊員二姓名'] || row['隊員二'] || row['member2'] || '';
    const categoryRaw = (row['組別'] || row['category'] || '').toString().toLowerCase();
    const members = [member1, member2].filter((m) => m.trim() !== '');

    if (!teamName || members.length === 0) continue;

    const categoryMap: Record<string, 'male' | 'female' | 'mixed'> = {
      male: 'male', 男子組: 'male', 男: 'male',
      female: 'female', 女子組: 'female', 女: 'female',
      mixed: 'mixed', 混合組: 'mixed', 混合: 'mixed',
    };
    const category = categoryMap[categoryRaw] || 'male';

    const duplicateMembers = await checkConflictInCategory(eventId, category, members);
    if (duplicateMembers.length > 0) {
      conflictList.push(`${teamName}（隊員重複：${duplicateMembers.join('、')}）`);
      continue;
    }

    await Team.create({ eventId, name: teamName, members, category, order: orderCounter++ });
    successList.push(teamName);
  }

  res.json({
    success: true,
    data: {
      imported: successList.length,
      conflicts: conflictList.length,
      successList,
      conflictList,
    },
  });
}
