import { Request, Response } from 'express';
import Team from '../models/Team';
import CreativeScore from '../models/CreativeScore';
import CreativePenalty from '../models/CreativePenalty';
import { calculateCreativeScore } from '../utils/creativeScoring';

interface TeamRankEntry {
  teamId: string;
  name: string;
  members: string[];
  category: string;
  technicalTotal: number;
  artisticTotal: number;
  grandTotal: number;
  penaltyDeduction: number;
  finalScore: number;
  rank: number;
}

export async function getCreativeRankings(req: Request, res: Response): Promise<void> {
  const eventId = req.params['id'] as string;

  const teams = await Team.find({ eventId, competitionType: 'Show' }).lean();
  const allScores = await CreativeScore.find({ eventId }).lean();
  const allPenalties = await CreativePenalty.find({ eventId }).lean();

  const results: Omit<TeamRankEntry, 'rank'>[] = teams.map((team) => {
    const teamId = team._id.toString();
    const judgeScores = allScores.filter((s) => s.teamId.toString() === teamId);
    const teamPenalties = allPenalties.filter((p) => p.teamId.toString() === teamId);
    const penaltyDeduction = teamPenalties.reduce((sum, p) => sum + p.deduction, 0);

    if (judgeScores.length < 5) {
      return {
        teamId,
        name: team.name,
        members: team.members,
        category: team.category,
        technicalTotal: 0,
        artisticTotal: 0,
        grandTotal: 0,
        penaltyDeduction,
        finalScore: 0,
      };
    }

    const calc = calculateCreativeScore(
      judgeScores.map((s) => ({
        judgeNo: s.judgeNo,
        technicalScore: s.technicalScore,
        artisticScore: s.artisticScore,
      })),
      penaltyDeduction
    );

    return {
      teamId,
      name: team.name,
      members: team.members,
      category: team.category,
      ...calc,
    };
  });

  // 依組別分組，各組依 finalScore 降序排名，回傳 flat array
  const categories = ['female', 'male', 'mixed'];
  const flatRankings: TeamRankEntry[] = [];

  for (const cat of categories) {
    const catTeams = results
      .filter((t) => t.category === cat)
      .sort((a, b) => b.finalScore - a.finalScore);

    catTeams.forEach((t, idx) => flatRankings.push({ ...t, rank: idx + 1 }));
  }

  res.json({ success: true, data: flatRankings });
}
