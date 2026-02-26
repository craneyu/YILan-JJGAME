import { Request, Response } from 'express';
import Event from '../models/Event';
import GameState from '../models/GameState';
import Team from '../models/Team';
import Score from '../models/Score';
import VRScore from '../models/VRScore';
import { calculateActionScores, CalculatedScore } from '../utils/scoring';

export async function listEvents(req: Request, res: Response): Promise<void> {
  // open=true：只回傳 pending / active（排除 closed），供登入頁觀眾使用
  const filter = req.query['open'] === 'true' ? { status: { $in: ['pending', 'active'] } } : {};
  const events = await Event.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: events });
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const { name, date, venue } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: '賽事名稱為必填' });
    return;
  }
  const event = await Event.create({ name, date, venue });
  // 同時初始化賽程狀態
  await GameState.create({ eventId: event._id });
  res.status(201).json({ success: true, data: event });
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  const event = await Event.findById(req.params.id);
  if (!event) {
    res.status(404).json({ success: false, error: '賽事不存在' });
    return;
  }
  res.json({ success: true, data: event });
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const { status, name, date, venue } = req.body;
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { ...(status && { status }), ...(name && { name }), ...(date && { date }), ...(venue && { venue }) },
    { new: true }
  );
  if (!event) {
    res.status(404).json({ success: false, error: '賽事不存在' });
    return;
  }
  res.json({ success: true, data: event });
}

export async function getEventSummary(req: Request, res: Response): Promise<void> {
  const eventId = req.params.id;
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404).json({ success: false, error: '賽事不存在' });
    return;
  }

  const teams = await Team.find({ eventId }).sort({ order: 1 });
  const gameState = await GameState.findOne({ eventId });

  let vrScore = null;
  let submittedJudgeNos: number[] = [];
  let completedActionNos: string[] = [];
  let calculatedScores: CalculatedScore[] = [];

  if (gameState?.currentTeamId) {
    const teamId = gameState.currentTeamId;
    const round = gameState.currentRound;

    // 查詢 VR 是否已送出
    vrScore = await VRScore.findOne({ eventId, teamId, round }).lean();

    // 查詢本系列已完成的動作（5 位裁判均送出）並計算成績
    const currentTeam = teams.find((t) => String(t._id) === String(teamId));
    if (currentTeam) {
      const actionCount = currentTeam.category === 'male' ? 4 : 3;
      const series = ['A', 'B', 'C'][round - 1] ?? 'A';
      for (let i = 1; i <= actionCount; i++) {
        const actionNo = `${series}${i}`;
        const scores = await Score.find({ eventId, teamId, round, actionNo }).lean();
        if (scores.length >= 5) {
          completedActionNos.push(actionNo);
          const computed = calculateActionScores(
            scores.map((s) => ({ judgeNo: s.judgeNo, items: s.items }))
          );
          calculatedScores.push({ actionNo, ...computed });
        }
      }
    }

    // 若當前動作已開放，查詢已送出的裁判編號
    if (gameState.currentActionNo && gameState.currentActionOpen) {
      const scores = await Score.find({
        eventId, teamId, round,
        actionNo: gameState.currentActionNo,
      }).select('judgeNo');
      submittedJudgeNos = scores.map((s) => s.judgeNo);
    }
  }

  res.json({
    success: true,
    data: { event, teams, gameState, vrScore, submittedJudgeNos, completedActionNos, calculatedScores },
  });
}

export async function getEventRankings(req: Request, res: Response): Promise<void> {
  const eventId = req.params.id;

  const teams = await Team.find({ eventId }).sort({ order: 1 }).lean();
  const allScores = await Score.find({ eventId }).lean();

  // 依 teamId+round+actionNo 分組
  const groups: Record<string, Array<{ judgeNo: number; items: { p1: number; p2: number; p3: number; p4: number; p5?: number } }>> = {};
  for (const s of allScores) {
    const key = `${String(s.teamId)}|${s.round}|${s.actionNo}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ judgeNo: s.judgeNo, items: s.items });
  }

  // 計算各隊累計動作分數（僅計算已有 5 位裁判送出的動作）
  const teamTotals: Record<string, number> = {};
  for (const [key, judges] of Object.entries(groups)) {
    if (judges.length < 5) continue;
    const teamId = key.split('|')[0];
    const computed = calculateActionScores(judges);
    teamTotals[teamId] = (teamTotals[teamId] || 0) + computed.actionTotal;
  }

  // 加入 VR 分數
  const vrScores = await VRScore.find({ eventId }).lean();
  for (const vr of vrScores) {
    const teamId = String(vr.teamId);
    teamTotals[teamId] = (teamTotals[teamId] || 0) + vr.throwVariety + vr.groundVariety;
  }

  const result = teams.map((team) => ({
    teamId: String(team._id),
    name: team.name,
    category: team.category,
    total: teamTotals[String(team._id)] || 0,
  }));

  res.json({ success: true, data: result });
}
