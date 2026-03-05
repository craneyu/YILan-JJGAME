import { Request, Response } from 'express';
import Team from '../models/Team';
import CreativeScore from '../models/CreativeScore';
import CreativePenalty from '../models/CreativePenalty';
import CreativeGameState from '../models/CreativeGameState';
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
  penaltyReasons: string[];
  isAbstained: boolean;
}

const PENALTY_LABEL: Record<string, string> = {
  overtime: '超時',
  undertime: '未達時間',
  props: '使用道具',
  attacks: '實際攻防',
};

export async function getCreativeRankings(req: Request, res: Response): Promise<void> {
  const eventId = req.params['id'] as string;

  const [teams, allScores, allPenalties, gameState] = await Promise.all([
    Team.find({ eventId, competitionType: 'Show' }).lean(),
    CreativeScore.find({ eventId }).lean(),
    CreativePenalty.find({ eventId }).lean(),
    CreativeGameState.findOne({ eventId }).lean(),
  ]);

  const abstainedTeamIds = new Set(
    (gameState?.abstainedTeamIds ?? []).map((id) => id.toString())
  );

  const results: Omit<TeamRankEntry, 'rank'>[] = teams.map((team) => {
    const teamId = team._id.toString();
    const judgeScores = allScores.filter((s) => s.teamId.toString() === teamId);
    const teamPenalties = allPenalties.filter((p) => p.teamId.toString() === teamId);
    const penaltyDeduction = teamPenalties.reduce((sum, p) => sum + p.deduction, 0);
    const penaltyReasons = teamPenalties.map((p) =>
      `${PENALTY_LABEL[p.penaltyType] ?? p.penaltyType} -${p.deduction.toFixed(1)}`
    );
    const isAbstained = abstainedTeamIds.has(teamId);

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
        penaltyReasons,
        isAbstained,
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
      penaltyReasons,
      isAbstained,
    };
  });

  // 棄權隊伍不計入排名；有效隊伍依組別分組，依 finalScore 降序排名
  const categories = ['female', 'male', 'mixed'];
  const flatRankings: TeamRankEntry[] = [];

  for (const cat of categories) {
    const catTeams = results.filter((t) => t.category === cat);
    const activeTeams = catTeams
      .filter((t) => !t.isAbstained)
      .sort((a, b) => b.finalScore - a.finalScore);
    const abstainedTeams = catTeams.filter((t) => t.isAbstained);

    activeTeams.forEach((t, idx) => flatRankings.push({ ...t, rank: idx + 1 }));
    abstainedTeams.forEach((t) => flatRankings.push({ ...t, rank: 0 }));
  }

  res.json({ success: true, data: flatRankings });
}
