import { Request, Response } from 'express';
import GameState from '../models/GameState';
import Team from '../models/Team';
import Event from '../models/Event';
import VRScore from '../models/VRScore';
import { broadcast } from '../sockets/index';
import { sortTeams, resolveCategoryOrder, buildTournamentGroups } from '../utils/teamSort';
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

  const event = await Event.findById(eventId).lean();
  const allTeams = await Team.find({ eventId, competitionType: { $ne: 'Show' } }).lean();
  const isTournament = event?.meetingType === 'tournament';

  // Sports-day 走既有 sortTeams（含 categoryOrder）；錦標賽純依 team.order 升冪
  const sortedTeams = isTournament
    ? [...allTeams].sort((a, b) => a.order - b.order)
    : sortTeams(allTeams, resolveCategoryOrder(event, 'Duo'));

  const currentTeam = sortedTeams.find((t) => String(t._id) === String(gameState.currentTeamId));
  if (!currentTeam) {
    res.status(404).json({ success: false, error: '當前隊伍不存在' });
    return;
  }

  // VR 檢查：棄權組與錦標賽國小組（EL/EM/EH，無 VR 評分）皆跳過；其餘需確認 VR 已送出
  const skipVrCheck =
    gameState.currentTeamAbstained ||
    (isTournament && isElementaryTier(currentTeam.tier));
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

  const currentRound = gameState.currentRound;

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

  // ============================================
  // 錦標賽流程：依 Excel 列順序，每隊跑完所有 round 才換下一隊
  // ============================================
  if (isTournament) {
    const groups = buildTournamentGroups(sortedTeams);
    const currentTier = currentTeam.tier ?? null;
    const currentCategory = currentTeam.category;
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

    // EL/EM 採單輪連續演練：actionProgress 已涵蓋 A+B 所有動作，nextGroup 直接換下一隊
    // EH/JH/SH/OPEN 採多輪：同隊先跑 R1 → R2 → R3 才換下一隊
    const isElementaryAB = currentTier === 'EL' || currentTier === 'EM';
    const maxRound = isElementaryAB ? 1 : 3;

    // Case A：同隊伍尚有未完成的 round（僅 EH/JH/SH/OPEN）
    if (!isElementaryAB && currentRound < maxRound) {
      await advance(gameState.currentTeamId, currentRound + 1, true);
      return;
    }

    // Case B：同 (tier, category) 群組內換下一隊（round 重置為 1）
    if (teamIdxInGroup < currentGroup.teams.length - 1) {
      const nextTeam = currentGroup.teams[teamIdxInGroup + 1];
      await advance(nextTeam._id, 1, currentRound !== 1);
      return;
    }

    // Case C：本群組最後一隊已完成，換到下一個非空 (tier, category) 群組
    if (currentGroupIdx < groups.length - 1) {
      const nextGroup = groups[currentGroupIdx + 1];
      await advance(nextGroup.teams[0]._id, 1, true);
      return;
    }

    // Case D：所有群組完成，賽事結束
    await GameState.findOneAndUpdate(
      { eventId },
      { status: 'event_complete', currentActionOpen: false },
    );
    broadcast.roundChanged(eventId, { eventId, round: 0 });
    res.json({ success: true, data: { message: '賽事已結束' } });
    return;
  }

  // ============================================
  // Sports-day 流程：保留既有 category-major 行為（向後相容）
  // ============================================
  const sdCategoryOrder = resolveCategoryOrder(event, 'Duo');
  const sdCurrentCategory = currentTeam.category;
  const sdCategoryTeams = sortedTeams.filter((t) => t.category === sdCurrentCategory);
  const sdCurrentIdx = sdCategoryTeams.findIndex(
    (t) => String(t._id) === String(gameState.currentTeamId),
  );

  // Case 1: 同 category 內下一隊，round 維持
  if (sdCurrentIdx < sdCategoryTeams.length - 1) {
    await advance(sdCategoryTeams[sdCurrentIdx + 1]._id, currentRound, false);
    return;
  }

  // Case 2: 同 category 換 round
  if (currentRound + 1 <= 3) {
    await advance(sdCategoryTeams[0]._id, currentRound + 1, true);
    return;
  }

  // Case 3: 下一非空 category
  const sdCurrCatIdx = sdCategoryOrder.indexOf(sdCurrentCategory);
  for (let ci = sdCurrCatIdx + 1; ci < sdCategoryOrder.length; ci++) {
    const nextCatTeams = sortedTeams.filter((t) => t.category === sdCategoryOrder[ci]);
    if (nextCatTeams.length > 0) {
      await advance(nextCatTeams[0]._id, 1, true);
      return;
    }
  }

  // Case 4: 全部完成
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
