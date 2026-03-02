import { Request, Response } from 'express';
import GameState from '../models/GameState';
import Team from '../models/Team';
import Event from '../models/Event';
import VRScore from '../models/VRScore';
import { broadcast } from '../sockets/index';
import { sortTeams } from '../utils/teamSort';

export async function openAction(req: Request, res: Response): Promise<void> {
  const { eventId, teamId, round, actionNo } = req.body;

  if (!eventId || !teamId || !round || !actionNo) {
    res.status(400).json({ success: false, error: '請填寫所有必填欄位' });
    return;
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

  // 棄權組跳過 VR 檢查；正常組需確認 VR 已送出
  if (!gameState.currentTeamAbstained) {
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

  // 取得賽事組別排序，依「組別優先、場次次之」排列隊伍清單
  const event = await Event.findById(eventId).lean();
  const categoryOrder = event?.categoryOrder ?? ['female', 'male', 'mixed'];
  const allTeams = await Team.find({ eventId }).lean();
  const sortedTeams = sortTeams(allTeams, categoryOrder);

  const currentTeam = sortedTeams.find((t) => String(t._id) === String(gameState.currentTeamId));
  if (!currentTeam) {
    res.status(404).json({ success: false, error: '當前隊伍不存在' });
    return;
  }

  const currentCategory = currentTeam.category;
  // 同組別的所有隊伍（依場次排序）
  const categoryTeams = sortedTeams.filter((t) => t.category === currentCategory);
  const currentIdxInCategory = categoryTeams.findIndex((t) => String(t._id) === String(gameState.currentTeamId));

  if (currentIdxInCategory < categoryTeams.length - 1) {
    // ── 情況 1：同組別同系列，換下一隊 ──
    const nextTeam = categoryTeams[currentIdxInCategory + 1];
    await GameState.findOneAndUpdate(
      { eventId },
      {
        currentTeamId: nextTeam._id,
        currentActionNo: undefined,
        currentActionOpen: false,
        currentTeamAbstained: false,
        status: 'idle',
      }
    );
    broadcast.groupChanged(eventId, { eventId, nextTeamId: nextTeam._id, round: gameState.currentRound });
    res.json({ success: true, data: { nextTeamId: nextTeam._id, round: gameState.currentRound } });

  } else {
    // 同組別本系列已全部完成
    const nextRound = gameState.currentRound + 1;

    if (nextRound <= 3) {
      // ── 情況 2：同組別進入下一系列（從本組第一隊重新開始）──
      const firstTeamInCategory = categoryTeams[0];
      await GameState.findOneAndUpdate(
        { eventId },
        {
          currentTeamId: firstTeamInCategory._id,
          currentRound: nextRound,
          currentActionNo: undefined,
          currentActionOpen: false,
          currentTeamAbstained: false,
          status: 'idle',
        }
      );
      broadcast.roundChanged(eventId, { eventId, round: nextRound });
      broadcast.groupChanged(eventId, { eventId, nextTeamId: firstTeamInCategory._id, round: nextRound });
      res.json({
        success: true,
        data: { nextTeamId: firstTeamInCategory._id, round: nextRound, message: `進入${['A','B','C'][nextRound-1]}系列` },
      });

    } else {
      // 本組別三系列全部完成，換下一組別
      const currentCategoryIdx = categoryOrder.indexOf(currentCategory);

      // 找下一個有隊伍的組別
      let nextFirstTeam = null;
      for (let ci = currentCategoryIdx + 1; ci < categoryOrder.length; ci++) {
        const nextCatTeams = sortedTeams.filter((t) => t.category === categoryOrder[ci]);
        if (nextCatTeams.length > 0) {
          nextFirstTeam = nextCatTeams[0];
          break;
        }
      }

      if (nextFirstTeam) {
        // ── 情況 3：換下一組別，從 Round 1（A 系列）重新開始 ──
        await GameState.findOneAndUpdate(
          { eventId },
          {
            currentTeamId: nextFirstTeam._id,
            currentRound: 1,
            currentActionNo: undefined,
            currentActionOpen: false,
            currentTeamAbstained: false,
            status: 'idle',
          }
        );
        broadcast.roundChanged(eventId, { eventId, round: 1 });
        broadcast.groupChanged(eventId, { eventId, nextTeamId: nextFirstTeam._id, round: 1 });
        res.json({
          success: true,
          data: { nextTeamId: nextFirstTeam._id, round: 1, message: '換下一組別' },
        });
      } else {
        // ── 情況 4：所有組別全部完成，賽事結束 ──
        await GameState.findOneAndUpdate(
          { eventId },
          { status: 'event_complete', currentActionOpen: false }
        );
        broadcast.roundChanged(eventId, { eventId, round: 0 }); // round 0 = 賽事結束
        res.json({ success: true, data: { message: '賽事已結束' } });
      }
    }
  }
}

export async function getGameState(req: Request, res: Response): Promise<void> {
  const gameState = await GameState.findOne({ eventId: req.params.eventId })
    .populate('currentTeamId');
  if (!gameState) {
    res.status(404).json({ success: false, error: '賽程狀態不存在' });
    return;
  }
  res.json({ success: true, data: gameState });
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
