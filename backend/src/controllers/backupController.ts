import { Request, Response } from 'express';
import Event from '../models/Event';
import Team from '../models/Team';
import Score from '../models/Score';
import VRScore from '../models/VRScore';
import GameState from '../models/GameState';

export async function downloadBackup(req: Request, res: Response): Promise<void> {
  const [events, teams, scores, vrScores, gameStates] = await Promise.all([
    Event.find().lean(),
    Team.find().lean(),
    Score.find().lean(),
    VRScore.find().lean(),
    GameState.find().lean(),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    collections: { events, teams, scores, vrScores, gameStates },
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `jju-backup-${timestamp}.json`;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(backup);
}
