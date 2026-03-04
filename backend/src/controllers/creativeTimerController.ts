import { Request, Response } from 'express';
import CreativeGameState from '../models/CreativeGameState';
import { broadcast } from '../sockets/index';

export async function startTimer(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  const now = new Date();
  const state = await CreativeGameState.findOneAndUpdate(
    { eventId },
    {
      timerStartedAt: now,
      timerStoppedAt: undefined,
      timerElapsedMs: undefined,
      status: 'timer_running',
    },
    { new: true }
  );

  if (!state) {
    res.status(404).json({ success: false, error: '賽程狀態不存在' });
    return;
  }

  broadcast.timerStarted(eventId, { eventId, startedAt: now.toISOString() });
  res.json({ success: true, startedAt: now.toISOString() });
}

export async function stopTimer(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  const state = await CreativeGameState.findOne({ eventId });
  if (!state || !state.timerStartedAt) {
    res.status(400).json({ success: false, error: '計時器尚未啟動' });
    return;
  }

  const now = new Date();
  const elapsedMs = now.getTime() - state.timerStartedAt.getTime();

  await CreativeGameState.findOneAndUpdate(
    { eventId },
    {
      timerStoppedAt: now,
      timerElapsedMs: elapsedMs,
      status: 'timer_stopped',
    }
  );

  broadcast.timerStopped(eventId, { eventId, elapsedMs });
  res.json({ success: true, elapsedMs });
}
