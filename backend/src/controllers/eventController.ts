import { Request, Response } from 'express';
import Event from '../models/Event';
import GameState from '../models/GameState';
import Team from '../models/Team';
import Score from '../models/Score';
import VRScore from '../models/VRScore';
import WrongAttack from '../models/WrongAttack';
import { calculateActionScores, CalculatedScore } from '../utils/scoring';
import { sortTeams } from '../utils/teamSort';

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

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const eventId = req.params.id;
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404).json({ success: false, error: '賽事不存在' });
    return;
  }
  // 一併刪除所有相關資料
  await Promise.all([
    Team.deleteMany({ eventId }),
    Score.deleteMany({ eventId }),
    VRScore.deleteMany({ eventId }),
    GameState.deleteMany({ eventId }),
  ]);
  await event.deleteOne();
  res.json({ success: true, data: { message: '賽事已刪除' } });
}

export async function clearEventScores(req: Request, res: Response): Promise<void> {
  const eventId = req.params.id;
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404).json({ success: false, error: '賽事不存在' });
    return;
  }
  const [scoreResult, vrResult] = await Promise.all([
    Score.deleteMany({ eventId }),
    VRScore.deleteMany({ eventId }),
    WrongAttack.deleteMany({ eventId }),
    GameState.findOneAndUpdate(
      { eventId },
      { currentTeamId: null, currentRound: 1, currentActionNo: null, currentActionOpen: false },
      { new: true }
    ),
  ]);
  res.json({
    success: true,
    data: { message: '成績已清除', deletedScores: scoreResult.deletedCount, deletedVrScores: vrResult.deletedCount },
  });
}

export async function getEventSummary(req: Request, res: Response): Promise<void> {
  const eventId = req.params.id;
  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404).json({ success: false, error: '賽事不存在' });
    return;
  }

  const allTeams = await Team.find({ eventId });
  const teams = sortTeams(allTeams, event.categoryOrder ?? ['female', 'male', 'mixed']);
  const gameState = await GameState.findOne({ eventId });

  let vrScore = null;
  let submittedJudgeNos: number[] = [];
  let currentActionJudgeScores: { judgeNo: number; items: Record<string, number> }[] = [];
  let completedActionNos: string[] = [];
  let completedActionJudgeScores: Record<string, { judgeNo: number; items: Record<string, number> }[]> = {};
  let calculatedScores: CalculatedScore[] = [];
  let wrongAttackActionNos: string[] = [];

  if (gameState?.currentTeamId) {
    const teamId = gameState.currentTeamId;
    const round = gameState.currentRound;

    // 查詢 VR 是否已送出
    vrScore = await VRScore.findOne({ eventId, teamId, round }).lean();

    // 查詢本系列錯誤攻擊動作
    const wrongAttacks = await WrongAttack.find({ eventId, teamId, round }).lean();
    wrongAttackActionNos = wrongAttacks.map((wa) => wa.actionNo);

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
          const isWrongAttack = wrongAttackActionNos.includes(actionNo);
          const computed = calculateActionScores(
            scores.map((s) => ({ judgeNo: s.judgeNo, items: s.items })),
            isWrongAttack
          );
          calculatedScores.push({ actionNo, ...computed });
          // 儲存個別裁判分數供賽序裁判查看
          completedActionJudgeScores[actionNo] = scores
            .sort((a, b) => a.judgeNo - b.judgeNo)
            .map((s) => ({ judgeNo: s.judgeNo, items: s.items as Record<string, number> }));
        }
      }
    }

    // 若當前動作已開放，查詢已送出的裁判編號與各 PART 分數
    if (gameState.currentActionNo && gameState.currentActionOpen) {
      const scores = await Score.find({
        eventId, teamId, round,
        actionNo: gameState.currentActionNo,
      }).select('judgeNo items').lean();
      submittedJudgeNos = scores.map((s) => s.judgeNo);
      currentActionJudgeScores = scores.map((s) => ({ judgeNo: s.judgeNo, items: s.items as Record<string, number> }));
    }
  }

  res.json({
    success: true,
    data: { event, teams, gameState, vrScore, submittedJudgeNos, currentActionJudgeScores, completedActionNos, completedActionJudgeScores, calculatedScores, wrongAttackActionNos },
  });
}

export async function getEventRankings(req: Request, res: Response): Promise<void> {
  const eventId = req.params.id;

  const eventDoc = await Event.findById(eventId).lean();
  const categoryOrder = eventDoc?.categoryOrder ?? ['female', 'male', 'mixed'];
  const rawTeams = await Team.find({ eventId }).lean();
  const teams = sortTeams(rawTeams, categoryOrder);
  const allScores = await Score.find({ eventId }).lean();

  // 依 teamId+round+actionNo 分組
  const groups: Record<string, Array<{ judgeNo: number; items: { p1: number; p2: number; p3: number; p4: number; p5?: number } }>> = {};
  for (const s of allScores) {
    // 驗證 actionNo 的系列字母是否與 round 一致（A=1, B=2, C=3）
    const expectedRound = s.actionNo.startsWith('A') ? 1 : s.actionNo.startsWith('B') ? 2 : s.actionNo.startsWith('C') ? 3 : -1;
    if (expectedRound !== s.round) continue; // 忽略 round 與 actionNo 不一致的資料
    const key = `${String(s.teamId)}|${s.round}|${s.actionNo}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ judgeNo: s.judgeNo, items: s.items });
  }

  // 查詢所有錯誤攻擊記錄
  const wrongAttacks = await WrongAttack.find({ eventId }).lean();
  const wrongAttackSet = new Set(
    wrongAttacks.map((wa) => `${String(wa.teamId)}|${wa.round}|${wa.actionNo}`)
  );

  // 計算各隊各系列分數，同時收集各動作 PART 詳細分數（僅計算已有 5 位裁判送出的動作）
  const teamSeriesScore: Record<string, { A: number; B: number; C: number }> = {};
  const teamActionDetails: Record<string, Record<string, { p1?: number; p2?: number; p3?: number; p4?: number; p5?: number; total: number }>> = {};
  for (const [key, judges] of Object.entries(groups)) {
    if (judges.length < 5) continue;
    const parts = key.split('|');
    const teamId = parts[0];
    const actionNo = parts[2];
    const series = actionNo[0] as 'A' | 'B' | 'C';
    const isWrongAttack = wrongAttackSet.has(key);
    const computed = calculateActionScores(judges, isWrongAttack);
    if (!teamSeriesScore[teamId]) teamSeriesScore[teamId] = { A: 0, B: 0, C: 0 };
    teamSeriesScore[teamId][series] = (teamSeriesScore[teamId][series] || 0) + computed.actionTotal;
    if (!teamActionDetails[teamId]) teamActionDetails[teamId] = {};
    teamActionDetails[teamId][actionNo] = {
      p1: computed.p1, p2: computed.p2, p3: computed.p3, p4: computed.p4, p5: computed.p5,
      total: computed.actionTotal,
    };
  }

  // 加入 VR 分數（依輪次對應系列 A/B/C），同時儲存投技/寢技明細
  const teamVrScore: Record<string, { A: number; B: number; C: number }> = {};
  const teamVrDetails: Record<string, { A?: { throwVariety: number; groundVariety: number }; B?: { throwVariety: number; groundVariety: number }; C?: { throwVariety: number; groundVariety: number } }> = {};
  const vrScores = await VRScore.find({ eventId }).lean();
  for (const vr of vrScores) {
    const teamId = String(vr.teamId);
    const s = vr.round === 1 ? 'A' : vr.round === 2 ? 'B' : 'C';
    if (!teamVrScore[teamId]) teamVrScore[teamId] = { A: 0, B: 0, C: 0 };
    teamVrScore[teamId][s] += vr.throwVariety + vr.groundVariety;
    if (!teamVrDetails[teamId]) teamVrDetails[teamId] = {};
    teamVrDetails[teamId][s] = { throwVariety: vr.throwVariety, groundVariety: vr.groundVariety };
  }

  const result = teams.map((team) => {
    const teamId = String(team._id);
    const series = teamSeriesScore[teamId] ?? { A: 0, B: 0, C: 0 };
    const vr = teamVrScore[teamId] ?? { A: 0, B: 0, C: 0 };
    const total = series.A + vr.A + series.B + vr.B + series.C + vr.C;
    return {
      teamId,
      name: team.name,
      members: team.members,
      category: team.category,
      seriesA: series.A,
      vrScoreA: vr.A,
      seriesB: series.B,
      vrScoreB: vr.B,
      seriesC: series.C,
      vrScoreC: vr.C,
      total,
      actionDetails: teamActionDetails[teamId] ?? {},
      vrDetails: teamVrDetails[teamId] ?? {},
    };
  });

  res.json({ success: true, data: result });
}

export async function updateCategoryOrder(req: Request, res: Response): Promise<void> {
  const { categoryOrder } = req.body;
  if (!Array.isArray(categoryOrder) || categoryOrder.length === 0) {
    res.status(400).json({ success: false, error: 'categoryOrder 為必填陣列' });
    return;
  }
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { categoryOrder },
    { new: true }
  );
  if (!event) {
    res.status(404).json({ success: false, error: '賽事不存在' });
    return;
  }
  res.json({ success: true, data: event });
}
