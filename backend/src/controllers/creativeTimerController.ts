import { Request, Response } from 'express';
import CreativeGameState from '../models/CreativeGameState';
import Team from '../models/Team';
import { broadcast } from '../sockets/index';

export async function startTimer(req: Request, res: Response): Promise<void> {
  const { eventId, teamId: requestTeamId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  const now = new Date();

  // 若 request 攜帶 teamId，補設 currentTeamId（避免跳過 openScoring 時 state 無隊伍資訊）
  const updateFields: Record<string, unknown> = {
    timerStartedAt: now,
    timerElapsedMs: 0,
    timerStatus: 'running',
    status: 'timer_running',
  };
  if (requestTeamId) {
    updateFields['currentTeamId'] = requestTeamId;
  }

  const state = await CreativeGameState.findOneAndUpdate(
    { eventId },
    updateFields,
    { new: true, upsert: true }
  );

  // 查詢隊伍資訊，一同帶入 timer:started 廣播，讓觀眾端即時更新
  const teamId = state?.currentTeamId ?? requestTeamId;
  let teamName: string | undefined;
  let members: string[] | undefined;
  let category: string | undefined;
  if (teamId) {
    const team = await Team.findById(teamId).lean();
    if (team) {
      teamName = team.name;
      members = team.members;
      category = team.category;
    }
  }

  broadcast.timerStarted(eventId, {
    eventId,
    timerStartedAt: now.toISOString(),
    elapsedMs: 0,
    teamName,
    members,
    category,
  });
  res.json({ success: true, timerStartedAt: now.toISOString() });
}

export async function stopTimer(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  const state = await CreativeGameState.findOne({ eventId });
  if (!state || state.timerStatus !== 'running') {
    res.status(400).json({ success: false, error: '計時器未在執行中' });
    return;
  }

  const prevElapsed = state.timerElapsedMs ?? 0;
  const addedMs = state.timerStartedAt ? (Date.now() - state.timerStartedAt.getTime()) : 0;
  const totalElapsed = prevElapsed + addedMs;

  await CreativeGameState.findOneAndUpdate(
    { eventId },
    {
      timerElapsedMs: totalElapsed,
      timerStatus: 'idle',
      status: 'timer_stopped',
    }
  );

  broadcast.timerStopped(eventId, { eventId, elapsedMs: totalElapsed });
  res.json({ success: true, elapsedMs: totalElapsed });
}

// Sequence judge controls the performance timer — timer paused 情境
export async function pauseTimer(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  const state = await CreativeGameState.findOne({ eventId });
  if (!state || state.timerStatus !== 'running') {
    res.status(400).json({ success: false, error: '計時器未在執行中' });
    return;
  }

  const prevElapsed = state.timerElapsedMs ?? 0;
  const addedMs = state.timerStartedAt ? (Date.now() - state.timerStartedAt.getTime()) : 0;
  const totalElapsed = prevElapsed + addedMs;

  await CreativeGameState.findOneAndUpdate(
    { eventId },
    {
      timerElapsedMs: totalElapsed,
      timerStatus: 'paused',
      status: 'timer_stopped',
    }
  );

  broadcast.timerStopped(eventId, { eventId, elapsedMs: totalElapsed });
  res.json({ success: true, elapsedMs: totalElapsed });
}

// Sequence judge controls the performance timer — timer resumed 情境
export async function resumeTimer(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  const state = await CreativeGameState.findOne({ eventId });
  if (!state || state.timerStatus !== 'paused') {
    res.status(400).json({ success: false, error: '計時器未在暫停狀態' });
    return;
  }

  const now = new Date();
  const elapsedBase = state.timerElapsedMs ?? 0;

  await CreativeGameState.findOneAndUpdate(
    { eventId },
    {
      timerStartedAt: now,
      timerStatus: 'running',
      status: 'timer_running',
    }
  );

  // 查詢隊伍資訊，一同帶入廣播
  let teamName: string | undefined;
  let members: string[] | undefined;
  let category: string | undefined;
  if (state.currentTeamId) {
    const team = await Team.findById(state.currentTeamId).lean();
    if (team) {
      teamName = team.name;
      members = team.members;
      category = team.category;
    }
  }

  broadcast.timerStarted(eventId, {
    eventId,
    timerStartedAt: now.toISOString(),
    elapsedMs: elapsedBase,
    teamName,
    members,
    category,
  });
  res.json({ success: true, timerStartedAt: now.toISOString(), elapsedMs: elapsedBase });
}

// Sequence judge controls the performance timer — timer reset 情境
export async function resetTimer(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  await CreativeGameState.findOneAndUpdate(
    { eventId },
    {
      timerElapsedMs: 0,
      timerStatus: 'idle',
      status: 'timer_stopped',
    }
  );

  broadcast.timerStopped(eventId, { eventId, elapsedMs: 0 });
  res.json({ success: true, elapsedMs: 0 });
}
