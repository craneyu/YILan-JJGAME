import { Request, Response } from 'express';
import VRScore from '../models/VRScore';
import Score from '../models/Score';
import GameState from '../models/GameState';
import Team from '../models/Team';
import { broadcast } from '../sockets/index';

// 取得某系列應有的動作數量
function getActionCount(round: number, category: string): number {
  if (category === 'male') return 4;
  // female / mixed 每系列 3 個動作
  return 3;
}

// 取得系列字母
function getSeriesLetter(round: number): string {
  return ['A', 'B', 'C'][round - 1] ?? 'A';
}

export async function submitVRScore(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, round, throwVariety, groundVariety } = req.body;

  if (!eventId || !teamId || !round || throwVariety === undefined || groundVariety === undefined) {
    res.status(400).json({ success: false, error: '請填寫所有必填欄位' });
    return;
  }

  // 確認本系列所有動作均已完成（5 位裁判全送出）
  const team = await Team.findById(teamId);
  if (!team) {
    res.status(404).json({ success: false, error: '隊伍不存在' });
    return;
  }
  const actionCount = getActionCount(round, team.category);
  const series = getSeriesLetter(round);

  for (let i = 1; i <= actionCount; i++) {
    const actionNo = `${series}${i}`;
    const count = await Score.countDocuments({ eventId, teamId, round, actionNo });
    if (count < 5) {
      res.status(403).json({
        success: false,
        error: `${actionNo} 尚未完成（已收到 ${count}/5 份評分）`,
      });
      return;
    }
  }

  // 儲存 VR 評分（upsert 以防重複送出）
  const vrScore = await VRScore.findOneAndUpdate(
    { eventId, teamId, round },
    { throwVariety, groundVariety, submittedAt: new Date() },
    { upsert: true, new: true }
  );

  // 廣播
  broadcast.vrSubmitted(eventId, {
    teamId,
    round,
    throwVariety,
    groundVariety,
  });

  // 更新賽程狀態
  await GameState.findOneAndUpdate(
    { eventId },
    { status: 'series_complete' }
  );

  res.status(201).json({ success: true, data: vrScore });
}
