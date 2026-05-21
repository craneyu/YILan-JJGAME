import { Request, Response } from 'express';
import Team, { TeamTier } from '../models/Team';
import Event from '../models/Event';
import CreativeScore from '../models/CreativeScore';
import CreativePenalty from '../models/CreativePenalty';
import { calculateCreativeScore } from '../utils/creativeScoring';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';

const VALID_TIERS: ReadonlyArray<TeamTier> = ['EL', 'EM', 'EH', 'JH', 'SH', 'OPEN', 'ELEM'];

const TIER_LABEL_MAP: Record<string, TeamTier> = {
  EL: 'EL', EM: 'EM', EH: 'EH', JH: 'JH', SH: 'SH', OPEN: 'OPEN', ELEM: 'ELEM',
  國小低年級: 'EL', 國小低年級組: 'EL', 國小低: 'EL',
  國小中年級: 'EM', 國小中年級組: 'EM', 國小中: 'EM',
  國小高年級: 'EH', 國小高年級組: 'EH', 國小高: 'EH',
  // JH = 青少年國中組（重新定義）；保留「國高中」「國高中組」為向後相容（既有 Excel 仍可匯入）
  青少年國中: 'JH', 青少年國中組: 'JH', 國中: 'JH', 國中組: 'JH',
  國高中: 'JH', 國高中組: 'JH',
  // SH = 青少年高中組（新增）
  青少年高中: 'SH', 青少年高中組: 'SH', 高中: 'SH', 高中組: 'SH',
  公開: 'OPEN', 公開組: 'OPEN',
  國小: 'ELEM', 國小組: 'ELEM',
};

function parseTier(raw: string | undefined | null): TeamTier | undefined {
  if (raw === undefined || raw === null) return undefined;
  const trimmed = String(raw).trim();
  if (trimmed === '') return undefined;
  const upper = trimmed.toUpperCase();
  if (VALID_TIERS.includes(upper as TeamTier)) return upper as TeamTier;
  return TIER_LABEL_MAP[trimmed];
}

export async function listTeams(req: Request, res: Response): Promise<void> {
  const eventId = req.params.id;
  const filter: Record<string, unknown> = { eventId };
  const qType = req.query['competitionType'];
  if (qType === 'Show') filter['competitionType'] = 'Show';
  else if (qType === 'Duo') filter['competitionType'] = { $ne: 'Show' };

  const teams = await Team.find(filter).sort({ order: 1 }).lean();

  if (qType === 'Show') {
    // 獲取所有創意演武的計分與扣分
    const allScores = await CreativeScore.find({ eventId }).lean();
    const allPenalties = await CreativePenalty.find({ eventId }).lean();

    const teamsWithStatus = teams.map((team) => {
      const teamId = team._id.toString();
      const teamScores = allScores.filter((s) => s.teamId.toString() === teamId);
      const teamPenalties = allPenalties.filter((p) => p.teamId.toString() === teamId);

      const isFinished = teamScores.length >= 5;
      let result = null;

      if (isFinished) {
        const totalPenalty = teamPenalties.reduce((sum, p) => sum + p.deduction, 0);
        result = calculateCreativeScore(
          teamScores.map((s) => ({
            judgeNo: s.judgeNo,
            technicalScore: s.technicalScore,
            artisticScore: s.artisticScore,
          })),
          totalPenalty
        );
      }

      return {
        ...team,
        isFinished,
        scoreSummary: result ? {
          technicalTotal: result.technicalTotal,
          artisticTotal: result.artisticTotal,
          finalScore: result.finalScore,
          penaltyDeduction: result.penaltyDeduction,
          penalties: teamPenalties.map(p => p.penaltyType)
        } : null
      };
    });

    res.json({ success: true, data: teamsWithStatus });
    return;
  }

  res.json({ success: true, data: teams });
}

export async function createTeam(req: Request, res: Response): Promise<void> {
  const { name, members, category, order } = req.body;
  if (!name || !members || !category || order === undefined) {
    res.status(400).json({ success: false, error: '請填寫所有必填欄位' });
    return;
  }

  // 同運動項目、同組別內檢查隊員唯一性
  const competitionType: 'Duo' | 'Show' = req.body['competitionType'] === 'Show' ? 'Show' : 'Duo';

  // 錦標賽必須帶 tier，運動會忽略 tier
  const eventDoc = await Event.findById(req.params.id).lean();
  const isTournament = eventDoc?.meetingType === 'tournament';
  const parsedTier = parseTier(req.body['tier']);
  if (isTournament && !parsedTier) {
    res.status(400).json({ success: false, error: '錦標賽隊伍必須指定 tier（二級分組）' });
    return;
  }
  if (req.body['tier'] && !parsedTier && isTournament) {
    res.status(400).json({ success: false, error: `tier 值無效：${req.body['tier']}` });
    return;
  }

  const duplicateMembers = await checkConflictInCategory(req.params.id as string, category, competitionType, members);
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
    ...(isTournament && parsedTier && { tier: parsedTier }),
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

// 同運動項目、同組別內檢查隊員姓名是否重複
// 不同運動項目（Duo/Show）視為獨立，允許同名隊員跨項目參賽
async function checkConflictInCategory(
  eventId: string,
  category: string,
  competitionType: 'Duo' | 'Show',
  newMembers: string[]
): Promise<string[]> {
  const teamsInCategory = await Team.find({ eventId, category, competitionType });
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
  分級?: string;
  分組?: string;
  二級分組?: string;
  tier?: string;
  level?: string;
}

export async function importTeams(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: '請上傳檔案' });
    return;
  }

  const eventId = req.params.id as string;
  const competitionType: 'Duo' | 'Show' = req.body['competitionType'] === 'Show' ? 'Show' : 'Duo';
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

  // 錦標賽必須在每列有合法 tier；運動會則忽略 tier 欄位
  const eventDoc = await Event.findById(eventId).lean();
  const isTournament = eventDoc?.meetingType === 'tournament';

  // Phase 1：tournament event 預檢所有列 tier 是否存在且合法，全通過才開始 insert
  if (isTournament) {
    const missingTierRows: number[] = [];
    const invalidTierRows: Array<{ row: number; value: string }> = [];
    rows.forEach((row, idx) => {
      const tierRaw =
        row['分級'] ?? row['分組'] ?? row['二級分組'] ?? row['tier'] ?? row['level'];
      if (tierRaw === undefined || tierRaw === null || String(tierRaw).trim() === '') {
        missingTierRows.push(idx + 2); // +2: 1-based + skip header
        return;
      }
      if (!parseTier(tierRaw)) {
        invalidTierRows.push({ row: idx + 2, value: String(tierRaw) });
      }
    });
    if (missingTierRows.length > 0 || invalidTierRows.length > 0) {
      const parts: string[] = [];
      if (missingTierRows.length > 0) {
        parts.push(`第 ${missingTierRows.join(', ')} 列缺少 tier（二級分組）欄位`);
      }
      if (invalidTierRows.length > 0) {
        parts.push(
          `tier 值無效：${invalidTierRows.map((r) => `第${r.row}列「${r.value}」`).join('、')}`
        );
      }
      res.status(400).json({
        success: false,
        error: `錦標賽匯入失敗：${parts.join('；')}`,
      });
      return;
    }
  }

  const successList: string[] = [];
  const conflictList: string[] = [];
  const existingCount = await Team.countDocuments({ eventId, competitionType });
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

    // tier：tournament 必填、sports-day 忽略
    const tierRaw =
      row['分級'] ?? row['分組'] ?? row['二級分組'] ?? row['tier'] ?? row['level'];
    const parsedTier = isTournament ? parseTier(tierRaw) : undefined;

    const duplicateMembers = await checkConflictInCategory(eventId, category, competitionType, members);
    if (duplicateMembers.length > 0) {
      conflictList.push(`${teamName}（隊員重複：${duplicateMembers.join('、')}）`);
      continue;
    }

    await Team.create({
      eventId,
      name: teamName,
      members,
      category,
      order: orderCounter++,
      competitionType,
      ...(isTournament && parsedTier && { tier: parsedTier }),
    });
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
