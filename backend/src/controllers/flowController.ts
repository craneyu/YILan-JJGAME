import { Request, Response } from 'express';
import GameState from '../models/GameState';
import Team from '../models/Team';
import VRScore from '../models/VRScore';
import { broadcast } from '../sockets/index';

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

  // 找下一組隊伍（依 order 排序）
  const currentTeam = await Team.findById(gameState.currentTeamId);
  if (!currentTeam) {
    res.status(404).json({ success: false, error: '當前隊伍不存在' });
    return;
  }

  const nextTeam = await Team.findOne({
    eventId,
    order: { $gt: currentTeam.order },
  }).sort({ order: 1 });

  if (nextTeam) {
    // 同輪次下一組
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

    broadcast.groupChanged(eventId, {
      eventId,
      nextTeamId: nextTeam._id,
      round: gameState.currentRound,
    });

    res.json({ success: true, data: { nextTeamId: nextTeam._id, round: gameState.currentRound } });
  } else {
    // 本輪所有隊伍完成，進入下一輪
    const nextRound = gameState.currentRound + 1;

    if (nextRound > 3) {
      // 賽事結束
      await GameState.findOneAndUpdate(
        { eventId },
        { status: 'event_complete', currentActionOpen: false }
      );
      broadcast.roundChanged(eventId, { eventId, round: 0 }); // round 0 = 賽事結束
      res.json({ success: true, data: { message: '賽事已結束' } });
      return;
    }

    // 找本輪第一組
    const firstTeam = await Team.findOne({ eventId }).sort({ order: 1 });
    if (!firstTeam) {
      res.status(404).json({ success: false, error: '找不到隊伍' });
      return;
    }

    await GameState.findOneAndUpdate(
      { eventId },
      {
        currentTeamId: firstTeam._id,
        currentRound: nextRound,
        currentActionNo: undefined,
        currentActionOpen: false,
        currentTeamAbstained: false,
        status: 'idle',
      }
    );

    broadcast.roundChanged(eventId, { eventId, round: nextRound });
    broadcast.groupChanged(eventId, {
      eventId,
      nextTeamId: firstTeam._id,
      round: nextRound,
    });

    res.json({
      success: true,
      data: { nextTeamId: firstTeam._id, round: nextRound, message: '進入下一輪' },
    });
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
