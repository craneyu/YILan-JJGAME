import { Request, Response } from 'express';
import GameState from '../models/GameState';
import Team from '../models/Team';
import Event from '../models/Event';
import VRScore from '../models/VRScore';
import { broadcast } from '../sockets/index';
import { sortTeams, resolveCategoryOrder, tierRank } from '../utils/teamSort';
import {
  isElementaryTier,
  getElementaryMotions,
  computeNextAction,
} from '../utils/tournament';

export async function openAction(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, round, actionNo } = req.body;

  if (!eventId || !teamId || !round || !actionNo) {
    res.status(400).json({ success: false, error: '請填寫所有必填欄位' });
    return;
  }

  // 錦標賽國小組（EL/EM/EH）：動作必須在該 tier 允許的動作集合內
  const [team, eventDoc] = await Promise.all([
    Team.findById(teamId).lean(),
    Event.findById(eventId).lean(),
  ]);
  if (
    eventDoc?.meetingType === 'tournament' &&
    team?.tier &&
    isElementaryTier(team.tier)
  ) {
    const series = actionNo[0] as 'A' | 'B' | 'C';
    if (series !== 'A' && series !== 'B' && series !== 'C') {
      res.status(400).json({ success: false, error: `無效的動作編號：${actionNo}` });
      return;
    }
    const allowed = getElementaryMotions(team.tier as 'EL' | 'EM' | 'EH', series);
    if (!allowed.includes(actionNo)) {
      res.status(400).json({
        success: false,
        error: `${team.tier} 組別不支援動作 ${actionNo}（可用動作：${allowed.join(', ') || '無'}）`,
      });
      return;
    }
  }

  const gameState = await GameState.findOneAndUpdate(
    { eventId },
    {
      currentTeamId: teamId,
      currentRound: round,
      currentActionNo: actionNo,
      currentActionOpen: true,
      status: 'action_open',
    },
    { new: true, upsert: true }
  );

  broadcast.actionOpened(eventId, { eventId, teamId, round, actionNo });

  res.json({ success: true, data: gameState });
}

export async function nextGroup(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;

  if (!eventId) {
    res.status(400).json({ success: false, error: '請填寫 eventId' });
    return;
  }

  const gameState = await GameState.findOne({ eventId });
  if (!gameState) {
    res.status(404).json({ success: false, error: '賽程狀態不存在' });
    return;
  }

  // 取得隊伍清單（排除 Show 隊伍），依 tier 主、category 次、order 末排序
  const event = await Event.findById(eventId).lean();
  const categoryOrder = resolveCategoryOrder(event, 'Duo');
  const allTeams = await Team.find({ eventId, competitionType: { $ne: 'Show' } }).lean();
  const sortedTeams = sortTeams(allTeams, categoryOrder);

  const currentTeam = sortedTeams.find((t) => String(t._id) === String(gameState.currentTeamId));
  if (!currentTeam) {
    res.status(404).json({ success: false, error: '當前隊伍不存在' });
    return;
  }

  // VR 檢查：棄權組與錦標賽國小組（EL/EM/EH，無 VR 評分）皆跳過；其餘需確認 VR 已送出
  const skipVrCheck =
    gameState.currentTeamAbstained ||
    (event?.meetingType === 'tournament' && isElementaryTier(currentTeam.tier));
  if (!skipVrCheck) {
    const vrScore = await VRScore.findOne({
      eventId,
      teamId: gameState.currentTeamId,
      round: gameState.currentRound,
    });
    if (!vrScore) {
      res.status(403).json({ success: false, error: 'VR 裁判尚未送出評分，無法換組' });
      return;
    }
  }

  // 建構 (tier, category) 群組的執行序：tier-major、category-secondary、依 categoryOrder
  // 自動跳過空群組
  type Group = { tier: string | null; category: string; teams: typeof sortedTeams };
  const groups: Group[] = [];
  const distinctTiers = Array.from(
    new Set(sortedTeams.map((t) => t.tier ?? null)),
  ).sort((a, b) => tierRank(a) - tierRank(b));
  for (const tier of distinctTiers) {
    for (const cat of categoryOrder) {
      const teams = sortedTeams.filter(
        (t) => (t.tier ?? null) === tier && t.category === cat,
      );
      if (teams.length > 0) groups.push({ tier, category: cat, teams });
    }
  }

  const currentTier = currentTeam.tier ?? null;
  const currentCategory = currentTeam.category;
  const currentRound = gameState.currentRound;
  const currentGroupIdx = groups.findIndex(
    (g) => g.tier === currentTier && g.category === currentCategory,
  );
  if (currentGroupIdx === -1) {
    res.status(404).json({ success: false, error: '當前隊伍所在群組不存在' });
    return;
  }
  const currentGroup = groups[currentGroupIdx];
  const teamIdxInGroup = currentGroup.teams.findIndex(
    (t) => String(t._id) === String(gameState.currentTeamId),
  );

  // 共用：更新 GameState 並廣播 group/round 變更
  const advance = async (
    nextTeamId: unknown,
    nextRound: number,
    roundChanged: boolean,
  ) => {
    await GameState.findOneAndUpdate(
      { eventId },
      {
        currentTeamId: nextTeamId,
        currentRound: nextRound,
        currentActionNo: undefined,
        currentActionOpen: false,
        currentTeamAbstained: false,
        status: 'idle',
      },
    );
    if (roundChanged) {
      broadcast.roundChanged(eventId, { eventId, round: nextRound });
    }
    broadcast.groupChanged(eventId, {
      eventId,
      nextTeamId: nextTeamId as string,
      round: nextRound,
    });
    res.json({ success: true, data: { nextTeamId, round: nextRound } });
  };

  // ── Case A：同 (tier, category, round) 內換下一隊 ──
  if (teamIdxInGroup < currentGroup.teams.length - 1) {
    const nextTeam = currentGroup.teams[teamIdxInGroup + 1];
    await advance(nextTeam._id, currentRound, false);
    return;
  }

  // 該 (tier, category) 群組最後一隊已完成。
  // 國小低/中年級（EL/EM）：單輪連續演練模型，直接推進到下一非空 (tier, category) 群組，round=1
  const isElementaryAB =
    event?.meetingType === 'tournament' &&
    (currentTier === 'EL' || currentTier === 'EM');

  if (isElementaryAB) {
    if (currentGroupIdx < groups.length - 1) {
      const nextGroup = groups[currentGroupIdx + 1];
      await advance(nextGroup.teams[0]._id, 1, true);
    } else {
      await GameState.findOneAndUpdate(
        { eventId },
        { status: 'event_complete', currentActionOpen: false },
      );
      broadcast.roundChanged(eventId, { eventId, round: 0 });
      res.json({ success: true, data: { message: '賽事已結束' } });
    }
    return;
  }

  // EH / JH / SH / OPEN / sports-day(tier=null) 多輪流程
  // 同 tier 內其他群組（依 category 順序）
  const groupsInSameTier = groups.filter((g) => g.tier === currentTier);
  const currentIdxInTier = groupsInSameTier.findIndex(
    (g) => g.category === currentCategory,
  );

  // ── Case B：同 tier 同 round，下一非空 category ──
  if (currentIdxInTier < groupsInSameTier.length - 1) {
    const nextGroup = groupsInSameTier[currentIdxInTier + 1];
    await advance(nextGroup.teams[0]._id, currentRound, false);
    return;
  }

  // 同 tier 同 round 已完成所有 category
  // ── Case C：同 tier 換 round R+1，從 tier 第一 category 開始 ──
  if (currentRound < 3) {
    const firstGroupInTier = groupsInSameTier[0];
    await advance(firstGroupInTier.teams[0]._id, currentRound + 1, true);
    return;
  }

  // ── Case D：同 tier round=3 已完成，換下一非空 tier 第一 category, round=1 ──
  // groups 已按 tier 排序，找出第一個 tier 不同於 currentTier 且 idx 大於 current 的群組
  let nextTierFirstGroup: Group | undefined;
  for (let i = currentGroupIdx + 1; i < groups.length; i++) {
    if (groups[i].tier !== currentTier) {
      nextTierFirstGroup = groups[i];
      break;
    }
  }
  if (nextTierFirstGroup) {
    await advance(nextTierFirstGroup.teams[0]._id, 1, true);
    return;
  }

  // ── Case E：所有 tier 完成，賽事結束 ──
  await GameState.findOneAndUpdate(
    { eventId },
    { status: 'event_complete', currentActionOpen: false },
  );
  broadcast.roundChanged(eventId, { eventId, round: 0 });
  res.json({ success: true, data: { message: '賽事已結束' } });
}

export async function getGameState(req: Request, res: Response): Promise<void> {
  const eventId = req.params.eventId;
  const gameState = await GameState.findOne({ eventId }).populate('currentTeamId');
  if (!gameState) {
    res.status(404).json({ success: false, error: '賽程狀態不存在' });
    return;
  }

  // 推算 nextAction：依當前隊伍 tier、currentActionNo、單隊組別狀態、VR 是否送出
  let nextAction: string | null = null;
  if (gameState.currentTeamId && gameState.currentActionNo) {
    // populate 後 currentTeamId 可能是 ObjectId 或 Team document
    const teamDoc = (typeof gameState.currentTeamId === 'object' && '_id' in gameState.currentTeamId)
      ? (gameState.currentTeamId as unknown as { category: string; tier?: string | null })
      : await Team.findById(gameState.currentTeamId).lean();
    const eventDoc = await Event.findById(eventId).lean();

    if (teamDoc && eventDoc) {
      // 該 (category, tier) 群組是否為單隊
      const groupTeams = await Team.countDocuments({
        eventId,
        category: teamDoc.category,
        tier: teamDoc.tier ?? null,
        competitionType: { $ne: 'Show' },
      });
      const isSingleTeamGroup =
        eventDoc.meetingType === 'tournament' && groupTeams === 1;

      // VR 是否已送出（當前 round）
      const vr = await VRScore.findOne({
        eventId,
        teamId: (teamDoc as { _id?: unknown })._id ?? gameState.currentTeamId,
        round: gameState.currentRound,
      }).lean();
      const vrSubmittedForCurrentRound = !!vr;

      nextAction = computeNextAction(
        teamDoc,
        eventDoc,
        gameState.currentActionNo,
        { isSingleTeamGroup, vrSubmittedForCurrentRound }
      );
    }
  }

  // 將 gameState 攤平成普通物件再附加 nextAction
  const data = gameState.toObject();
  res.json({ success: true, data: { ...data, nextAction } });
}

export async function setAbstain(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '請填寫 eventId' });
    return;
  }

  const gameState = await GameState.findOneAndUpdate(
    { eventId },
    { currentTeamAbstained: true, currentActionOpen: false },
    { new: true }
  );
  if (!gameState) {
    res.status(404).json({ success: false, error: '賽程狀態不存在' });
    return;
  }

  broadcast.teamAbstained(eventId, { eventId, teamId: String(gameState.currentTeamId) });
  res.json({ success: true, data: gameState });
}

export async function cancelAbstain(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '請填寫 eventId' });
    return;
  }

  const gameState = await GameState.findOneAndUpdate(
    { eventId },
    { currentTeamAbstained: false },
    { new: true }
  );
  if (!gameState) {
    res.status(404).json({ success: false, error: '賽程狀態不存在' });
    return;
  }

  broadcast.teamAbstainCancelled(eventId, { eventId, teamId: String(gameState.currentTeamId) });
  res.json({ success: true, data: gameState });
}
