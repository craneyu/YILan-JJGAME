import { Request, Response } from 'express';
import CreativeGameState from '../models/CreativeGameState';
import CreativeScore from '../models/CreativeScore';
import CreativePenalty from '../models/CreativePenalty';
import Team from '../models/Team';
import Event from '../models/Event';
import { broadcast } from '../sockets/index';

export async function openScoring(req: Request, res: Response): Promise<void> {
  const { eventId, teamId } = req.body;
  if (!eventId || !teamId) {
    res.status(400).json({ success: false, error: '缺少 eventId 或 teamId' });
    return;
  }

  const event = await Event.findById(eventId);
  if (!event) {
    res.status(404).json({ success: false, error: '賽事不存在' });
    return;
  }

  const team = await Team.findOne({ _id: teamId, eventId });
  if (!team) {
    res.status(404).json({ success: false, error: '隊伍不存在或不屬於此賽事' });
    return;
  }

  await CreativeGameState.findOneAndUpdate(
    { eventId },
    {
      currentTeamId: teamId,
      status: 'scoring_open',
      timerStartedAt: undefined,
      timerStoppedAt: undefined,
      timerElapsedMs: undefined,
    },
    { upsert: true, new: true }
  );

  broadcast.creativeScoringOpened(eventId, {
    eventId,
    teamId,
    teamName: team.name,
    category: team.category,
  });

  res.json({ success: true, message: '評分已開放' });
}

export async function confirmScores(req: Request, res: Response): Promise<void> {
  const { eventId, teamId } = req.body;
  if (!eventId || !teamId) {
    res.status(400).json({ success: false, error: '缺少 eventId 或 teamId' });
    return;
  }

  const allScores = await CreativeScore.find({ eventId, teamId }).lean();
  if (allScores.length < 5) {
    res.status(400).json({
      success: false,
      error: `尚有 ${5 - allScores.length} 位裁判未送出評分`,
    });
    return;
  }

  await CreativeGameState.findOneAndUpdate(
    { eventId },
    { status: 'complete' }
  );

  res.json({ success: true, message: '已確認收分，可進行下一組' });
}

export async function nextTeam(req: Request, res: Response): Promise<void> {
  const { eventId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  // 清空計時器與賽程狀態，等待賽序裁判選下一組
  await CreativeGameState.findOneAndUpdate(
    { eventId },
    {
      currentTeamId: undefined,
      timerStartedAt: undefined,
      timerStoppedAt: undefined,
      timerElapsedMs: undefined,
      status: 'idle',
    }
  );

  broadcast.creativeTeamChanged(eventId, { eventId });

  res.json({ success: true, message: '已切換至下一組' });
}

export async function getCreativeState(req: Request, res: Response): Promise<void> {
  const eventId = req.params['eventId'] as string;
  const state = await CreativeGameState.findOne({ eventId }).lean();
  res.json({ success: true, data: state });
}
