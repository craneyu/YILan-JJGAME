import { Request, Response } from 'express';
import CreativeGameState from '../models/CreativeGameState';
import CreativeScore from '../models/CreativeScore';
import CreativePenalty from '../models/CreativePenalty';
import Team from '../models/Team';
import Event from '../models/Event';
import { broadcast } from '../sockets/index';
import { sortTeams } from '../utils/teamSort';

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
    },
    { upsert: true, new: true }
  );

  broadcast.creativeScoringOpened(eventId, {
    eventId,
    teamId,
    teamName: team.name,
    members: team.members,
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
  const { eventId, currentTeamId: bodyTeamId } = req.body;
  if (!eventId) {
    res.status(400).json({ success: false, error: '缺少 eventId' });
    return;
  }

  const [state, event, allTeams, allScores] = await Promise.all([
    CreativeGameState.findOne({ eventId }),
    Event.findById(eventId).lean(),
    Team.find({ eventId, competitionType: 'Show' }).lean(),
    CreativeScore.find({ eventId }).lean(),
  ]);

  const categoryOrder = event?.categoryOrder ?? ['female', 'male', 'mixed'];
  const sortedTeams = sortTeams(allTeams, categoryOrder);

  // 計算已完賽隊伍（有 5 筆評分即視為完賽）
  const scoreCountByTeam = new Map<string, number>();
  for (const score of allScores) {
    const tid = String(score.teamId);
    scoreCountByTeam.set(tid, (scoreCountByTeam.get(tid) ?? 0) + 1);
  }
  const isFinished = (teamId: string) => (scoreCountByTeam.get(teamId) ?? 0) >= 5;

  // 優先使用前端傳入的 currentTeamId（手動選取），否則從 state 讀取
  const currentId = bodyTeamId || (state?.currentTeamId ? String(state.currentTeamId) : null);

  let nextTeamId = null;
  if (currentId) {
    const currentIdx = sortedTeams.findIndex(t => String(t._id) === currentId);
    // 從當前位置往後找第一個未完賽的隊伍
    const startIdx = currentIdx === -1 ? 0 : currentIdx + 1;
    for (let i = startIdx; i < sortedTeams.length; i++) {
      if (!isFinished(String(sortedTeams[i]._id))) {
        nextTeamId = sortedTeams[i]._id;
        break;
      }
    }
  } else {
    // 無當前隊伍：找第一個未完賽的隊伍
    for (const team of sortedTeams) {
      if (!isFinished(String(team._id))) {
        nextTeamId = team._id;
        break;
      }
    }
  }

  // 清空計時器與賽程狀態，切換至下一組
  await CreativeGameState.findOneAndUpdate(
    { eventId },
    {
      currentTeamId: nextTeamId,
      timerElapsedMs: 0,
      timerStatus: 'idle',
      status: 'idle',
    },
    { upsert: true }
  );

  broadcast.creativeTeamChanged(eventId, { eventId, nextTeamId: nextTeamId ? String(nextTeamId) : null });

  res.json({ success: true, message: '已切換至下一組', data: { nextTeamId } });
}

export async function getCreativeState(req: Request, res: Response): Promise<void> {
  const eventId = req.params['eventId'] as string;
  const state = await CreativeGameState.findOne({ eventId }).lean();

  let currentTeamName: string | undefined;
  let currentMembers: string[] | undefined;
  let currentCategory: string | undefined;

  if (state?.currentTeamId) {
    const team = await Team.findById(state.currentTeamId).lean();
    if (team) {
      currentTeamName = team.name;
      currentMembers = team.members;
      currentCategory = team.category;
    }
  }

  res.json({ success: true, data: { ...state, currentTeamName, currentMembers, currentCategory } });
}
