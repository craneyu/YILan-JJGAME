import { Request, Response } from 'express';
import Score from '../models/Score';
import GameState from '../models/GameState';
import { broadcast } from '../sockets/index';
import { calculateActionScores } from '../utils/scoring';

export async function submitScore(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, round, actionNo, items } = req.body;
  const user = req.user!;

  if (!eventId || !teamId || !round || !actionNo || !items) {
    res.status(400).json({ success: false, error: '請填寫所有必填欄位' });
    return;
  }

  // 確認動作已開放
  const gameState = await GameState.findOne({ eventId });
  if (!gameState?.currentActionOpen || gameState.currentActionNo !== actionNo) {
    res.status(403).json({ success: false, error: '此動作尚未開放評分' });
    return;
  }

  // 儲存評分（唯一索引防重複）
  const score = await Score.create({
    eventId,
    teamId,
    round,
    actionNo,
    judgeId: user.userId,
    judgeNo: user.judgeNo,
    items,
  });

  // 廣播「已送出」
  broadcast.scoreSubmitted(eventId, {
    judgeId: user.userId,
    judgeNo: user.judgeNo,
    teamId,
    round,
    actionNo,
    items,
  });

  // 檢查是否 5 位裁判全數送出
  const allScores = await Score.find({ eventId, teamId, round, actionNo });
  if (allScores.length === 5) {
    const calculated = calculateActionScores(
      allScores.map((s) => ({ judgeNo: s.judgeNo, items: s.items }))
    );
    broadcast.scoreCalculated(eventId, {
      teamId,
      round,
      actionNo,
      ...calculated,
    });

    // 更新賽程狀態
    await GameState.findOneAndUpdate(
      { eventId },
      { currentActionOpen: false, status: 'action_closed' }
    );
  }

  res.status(201).json({ success: true, data: score });
}

export async function getEventScores(req: Request, res: Response): Promise<void> {
  const scores = await Score.find({ eventId: req.params.id })
    .populate('judgeId', 'username judgeNo')
    .populate('teamId', 'name members');
  res.json({ success: true, data: scores });
}

// 查詢本裁判對特定隊伍/輪次的所有動作評分（頁面重整還原歷史紀錄用）
export async function getMyRoundScores(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, round } = req.query as Record<string, string>;
  const user = req.user!;

  if (!eventId || !teamId || !round) {
    res.status(400).json({ success: false, error: '缺少必要參數' });
    return;
  }

  const scores = await Score.find({
    eventId,
    teamId,
    round: Number(round),
    judgeId: user.userId,
  }).select('actionNo items').lean();

  res.json({ success: true, data: scores });
}

// 查詢本裁判對特定動作的評分（頁面重整還原「已送出」狀態用）
export async function getMyScore(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, round, actionNo } = req.query as Record<string, string>;
  const user = req.user!;

  if (!eventId || !teamId || !round || !actionNo) {
    res.status(400).json({ success: false, error: '缺少必要參數' });
    return;
  }

  const score = await Score.findOne({
    eventId,
    teamId,
    round: Number(round),
    actionNo,
    judgeId: user.userId,
  });

  res.json({ success: true, data: score ?? null });
}
