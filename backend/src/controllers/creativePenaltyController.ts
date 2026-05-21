import { Request, Response } from 'express';
import CreativePenalty, { PenaltyType, PENALTY_DEDUCTIONS } from '../models/CreativePenalty';
import CreativeScore from '../models/CreativeScore';
import Team from '../models/Team';
import Event from '../models/Event';
import { calculateCreativeScore } from '../utils/creativeScoring';
import { isElementaryTier } from '../utils/tournament';
import { broadcast } from '../sockets/index';

export async function updatePenalties(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, penalties } = req.body;
  // penalties: PenaltyType[] — 目前啟用的違例類型陣列

  if (!eventId || !teamId) {
    res.status(400).json({ success: false, error: '缺少 eventId 或 teamId' });
    return;
  }

  const validTypes: PenaltyType[] = ['overtime', 'undertime', 'props', 'attacks'];
  const requestedTypes: PenaltyType[] = Array.isArray(penalties) ? penalties : [];

  for (const t of requestedTypes) {
    if (!validTypes.includes(t)) {
      res.status(400).json({ success: false, error: `無效的違例類型：${t}` });
      return;
    }
  }

  // 國小組（EL/EM/EH）於 tournament 賽會時，超時/不足時間不扣分 — 後端過濾掉這兩種類型
  const [team, eventDoc] = await Promise.all([
    Team.findById(teamId).lean(),
    Event.findById(eventId).lean(),
  ]);
  const isTournamentElementary =
    eventDoc?.meetingType === 'tournament' && isElementaryTier(team?.tier);
  const effectiveTypes: PenaltyType[] = isTournamentElementary
    ? requestedTypes.filter((t) => t !== 'overtime' && t !== 'undertime')
    : requestedTypes;

  // 刪除現有違例，重新寫入
  await CreativePenalty.deleteMany({ eventId, teamId });

  const toInsert = effectiveTypes.map((penaltyType) => ({
    eventId,
    teamId,
    penaltyType,
    deduction: PENALTY_DEDUCTIONS[penaltyType],
    markedAt: new Date(),
  }));

  if (toInsert.length > 0) {
    await CreativePenalty.insertMany(toInsert);
  }

  const penaltyList = await CreativePenalty.find({ eventId, teamId }).lean();
  const totalDeduction = penaltyList.reduce((sum, p) => sum + p.deduction, 0);

  // 廣播格式需符合前端 PenaltyUpdatedEvent：penalties 為 string[]，penaltyDeduction 為 number
  broadcast.penaltyUpdated(eventId, {
    eventId,
    teamId,
    penalties: penaltyList.map((p) => p.penaltyType),
    penaltyDeduction: totalDeduction,
  });

  // 若 5 位裁判已評分，重新計算並廣播最新 finalScore
  const allScores = await CreativeScore.find({ eventId, teamId }).lean();
  if (allScores.length === 5) {
    const result = calculateCreativeScore(
      allScores.map((s) => ({
        judgeNo: s.judgeNo,
        technicalScore: s.technicalScore,
        artisticScore: s.artisticScore,
      })),
      totalDeduction
    );
    const penaltyItems = penaltyList.map((p) => ({ type: p.penaltyType, deduction: p.deduction, count: 1 }));
    broadcast.creativeScoreCalculated(eventId, { eventId, teamId, ...result, penalties: penaltyItems });
  }

  res.json({ success: true, penalties: penaltyList, totalDeduction });
}

export async function getPenalties(req: Request, res: Response): Promise<void> {
  const { eventId, teamId } = req.query;
  const filter: Record<string, unknown> = {};
  if (eventId) filter['eventId'] = eventId;
  if (teamId) filter['teamId'] = teamId;

  const penalties = await CreativePenalty.find(filter).lean();
  res.json({ success: true, data: penalties });
}
