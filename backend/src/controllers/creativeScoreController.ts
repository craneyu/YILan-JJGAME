import { Request, Response } from 'express';
import CreativeScore from '../models/CreativeScore';
import CreativePenalty from '../models/CreativePenalty';
import CreativeGameState from '../models/CreativeGameState';
import { isValidCreativeScore, calculateCreativeScore } from '../utils/creativeScoring';
import { broadcast } from '../sockets/index';

export async function submitCreativeScore(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, technicalScore, artisticScore } = req.body;
  const judgeId = (req as any).user.userId;
  const judgeNo = (req as any).user.judgeNo;

  if (!eventId || !teamId) {
    res.status(400).json({ success: false, error: '缺少 eventId 或 teamId' });
    return;
  }

  if (!isValidCreativeScore(Number(technicalScore))) {
    res.status(400).json({ success: false, error: '技術分無效，必須為 0–9.5 且為 0.5 的倍數' });
    return;
  }
  if (!isValidCreativeScore(Number(artisticScore))) {
    res.status(400).json({ success: false, error: '表演分無效，必須為 0–9.5 且為 0.5 的倍數' });
    return;
  }

  // 確認賽程已開放評分
  const gameState = await CreativeGameState.findOne({ eventId });
  if (!gameState || (gameState.status !== 'scoring_open' && gameState.status !== 'timer_running' && gameState.status !== 'timer_stopped')) {
    res.status(400).json({ success: false, error: '目前尚未開放評分' });
    return;
  }
  if (gameState.currentTeamId?.toString() !== teamId) {
    res.status(400).json({ success: false, error: '隊伍不符合目前賽程' });
    return;
  }

  // 嘗試新增（Unique Index 防重複）
  try {
    await CreativeScore.create({
      eventId,
      teamId,
      judgeId,
      judgeNo,
      technicalScore: Number(technicalScore),
      artisticScore: Number(artisticScore),
      submittedAt: new Date(),
    });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(409).json({ success: false, error: '已提交過評分，無法重複送出' });
      return;
    }
    throw err;
  }

  // 廣播已送出事件（含分數，供賽序裁判即時顯示）
  broadcast.creativeScoreSubmitted(eventId, { eventId, teamId, judgeNo, technicalScore: Number(technicalScore), artisticScore: Number(artisticScore) });

  // 檢查是否 5 位裁判全部送出
  const allScores = await CreativeScore.find({ eventId, teamId }).lean();
  if (allScores.length === 5) {
    // 取得違例扣分
    const penalties = await CreativePenalty.find({ eventId, teamId }).lean();
    const penaltyDeduction = penalties.reduce((sum, p) => sum + p.deduction, 0);

    const result = calculateCreativeScore(
      allScores.map((s) => ({
        judgeNo: s.judgeNo,
        technicalScore: s.technicalScore,
        artisticScore: s.artisticScore,
      })),
      penaltyDeduction
    );

    // 更新賽程狀態
    await CreativeGameState.findOneAndUpdate(
      { eventId },
      { status: 'scores_collected' }
    );

    const penaltyItems = penalties.map((p) => ({
      type: p.penaltyType,
      deduction: p.deduction,
      count: 1,
    }));
    broadcast.creativeScoreCalculated(eventId, { eventId, teamId, ...result, penalties: penaltyItems });
  }

  res.status(201).json({ success: true, message: '評分已送出' });
}

export async function getCreativeScores(req: Request, res: Response): Promise<void> {
  const { eventId, teamId } = req.query;
  const filter: Record<string, unknown> = {};
  if (eventId) filter['eventId'] = eventId;
  if (teamId) filter['teamId'] = teamId;

  const scores = await CreativeScore.find(filter).lean();
  res.json({ success: true, data: scores });
}
