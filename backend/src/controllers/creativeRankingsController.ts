import { Request, Response } from 'express';
import Team, { memberNames } from '../models/Team';
import Event from '../models/Event';
import CreativeScore from '../models/CreativeScore';
import CreativePenalty from '../models/CreativePenalty';
import CreativeGameState from '../models/CreativeGameState';
import { calculateCreativeScore } from '../utils/creativeScoring';

interface CreativeJudgeEntry {
  judgeNo: number;
  technicalScore: number;
  artisticScore: number;
}

interface TeamRankEntry {
  teamId: string;
  name: string;
  members: string[];
  category: string;
  tier: string | null;
  technicalTotal: number;
  artisticTotal: number;
  grandTotal: number;
  penaltyDeduction: number;
  finalScore: number;
  rank: number;
  penaltyReasons: string[];
  isAbstained: boolean;
  /** 各裁判的原始評分（未去頭尾），供裁判評分明細匯出使用；僅 admin 可見 */
  judgeScores?: CreativeJudgeEntry[];
}

const PENALTY_LABEL: Record<string, string> = {
  overtime: '超時',
  undertime: '未達時間',
  props: '使用道具',
  attacks: '實際攻防',
};

export async function getCreativeRankings(req: Request, res: Response): Promise<void> {
  const eventId = req.params['id'] as string;

  const [teams, allScores, allPenalties, gameState, event] = await Promise.all([
    Team.find({ eventId, competitionType: 'Show' }).lean(),
    CreativeScore.find({ eventId }).lean(),
    CreativePenalty.find({ eventId }).lean(),
    CreativeGameState.findOne({ eventId }).lean(),
    Event.findById(eventId).lean(),
  ]);

  const isTournament = event?.meetingType === 'tournament';
  // 裁判逐項原始評分屬賽後查核資料，僅 admin 可見（本端點對觀眾端公開）
  const isAdmin = req.user?.role === 'admin';

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

    const tier = isTournament ? (team.tier ?? null) : null;

    // 原始評分照實列出（即使未滿 5 位裁判送出），方便賽後對帳／申訴查核
    const judgeDetail: CreativeJudgeEntry[] = judgeScores
      .map((s) => ({
        judgeNo: s.judgeNo,
        technicalScore: s.technicalScore,
        artisticScore: s.artisticScore,
      }))
      .sort((a, b) => a.judgeNo - b.judgeNo);

    if (judgeScores.length < 5) {
      return {
        teamId,
        name: team.name,
        members: memberNames(team.members),
        category: team.category,
        tier,
        technicalTotal: 0,
        artisticTotal: 0,
        grandTotal: 0,
        penaltyDeduction,
        finalScore: 0,
        penaltyReasons,
        isAbstained,
        ...(isAdmin ? { judgeScores: judgeDetail } : {}),
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
      members: memberNames(team.members),
      category: team.category,
      tier,
      ...calc,
      penaltyReasons,
      isAbstained,
      ...(isAdmin ? { judgeScores: judgeDetail } : {}),
    };
  });

  // 棄權隊伍不計入排名；有效隊伍依群組分組，依 finalScore 降序排名。
  // 錦標賽：依 (category, tier) 群組；運動會：只依 category（tier 為 null）。
  const categories = ['female', 'male', 'mixed'];
  const flatRankings: TeamRankEntry[] = [];

  // 收集 tier 順序（與既有 TIER_ORDER 對齊），sports-day 時退化為 [null]
  const tierOrder: (string | null)[] = isTournament
    ? ['KID', 'EL', 'EM', 'EH', 'JH', 'SH', 'OPEN', null]
    : [null];

  for (const cat of categories) {
    for (const tier of tierOrder) {
      const groupTeams = results.filter(
        (t) => t.category === cat && (t.tier ?? null) === tier,
      );
      if (groupTeams.length === 0) continue;
      const activeTeams = groupTeams
        .filter((t) => !t.isAbstained)
        .sort((a, b) => b.finalScore - a.finalScore);
      const abstainedTeams = groupTeams.filter((t) => t.isAbstained);

      activeTeams.forEach((t, idx) => flatRankings.push({ ...t, rank: idx + 1 }));
      abstainedTeams.forEach((t) => flatRankings.push({ ...t, rank: 0 }));
    }
  }

  res.json({ success: true, data: flatRankings });
}
