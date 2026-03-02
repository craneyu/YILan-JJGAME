import { Request, Response } from 'express';
import WrongAttack from '../models/WrongAttack';
import Score from '../models/Score';
import { broadcast } from '../sockets/index';
import { calculateActionScores } from '../utils/scoring';

// Toggle 錯誤攻擊（標記／取消），同時重算該動作成績並廣播
export async function toggleWrongAttack(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, round, actionNo } = req.body;

  if (!eventId || !teamId || !round || !actionNo) {
    res.status(400).json({ success: false, error: '請填寫所有必填欄位' });
    return;
  }

  // 確認此動作已有 5 位裁判評分
  const scoreCount = await Score.countDocuments({ eventId, teamId, round, actionNo });
  if (scoreCount < 5) {
    res.status(403).json({ success: false, error: `${actionNo} 尚未完成評分（${scoreCount}/5）` });
    return;
  }

  // Toggle：已存在則刪除（取消），不存在則新增（標記）
  const existing = await WrongAttack.findOne({ eventId, teamId, round, actionNo });
  let isWrongAttack: boolean;
  if (existing) {
    await existing.deleteOne();
    isWrongAttack = false;
  } else {
    await WrongAttack.create({ eventId, teamId, round, actionNo });
    isWrongAttack = true;
  }

  // 重新計算此動作分數（若標記錯誤攻擊，所有裁判 p1 強制為 0）
  const allScores = await Score.find({ eventId, teamId, round, actionNo }).lean();
  const calculated = calculateActionScores(
    allScores.map((s) => ({ judgeNo: s.judgeNo, items: s.items })),
    isWrongAttack
  );

  // 廣播錯誤攻擊更新成績（使用專用事件，不干擾賽序裁判的 scoreCalculated 狀態機）
  broadcast.wrongAttackUpdated(eventId, {
    teamId,
    round,
    actionNo,
    wrongAttack: isWrongAttack,
    ...calculated,
  });

  res.json({ success: true, data: { actionNo, isWrongAttack, ...calculated } });
}

// 查詢某賽事/隊伍/輪次的錯誤攻擊清單
export async function getWrongAttacks(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, round } = req.query as Record<string, string>;

  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  const query: Record<string, unknown> = { eventId };
  if (teamId) query['teamId'] = teamId;
  if (round) query['round'] = Number(round);

  const results = await WrongAttack.find(query).select('teamId round actionNo').lean();
  res.json({ success: true, data: results });
}
