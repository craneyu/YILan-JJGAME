import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTriangleExclamation, faExpand, faCompress, faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import { ApiService } from '../../core/services/api.service';
import { SocketService, ScoreCalculatedEvent, WrongAttackUpdatedEvent } from '../../core/services/socket.service';

interface ActionScore {
  actionNo: string;
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  p5?: number;
  actionTotal?: number;
  wrongAttack?: boolean;
}

type TeamTier = 'EL' | 'EM' | 'EH' | 'JH' | 'SH' | 'OPEN' | 'ELEM' | null;

interface TeamInfo {
  _id: string;
  name: string;
  members: string[];
  category: string;
  tier?: TeamTier;
}

const CATEGORY_LABEL: Record<string, string> = {
  male: '男子組',
  female: '女子組',
  mixed: '混合組',
};
const TIER_LABEL: Record<string, string> = {
  EL: '國小低年級',
  EM: '國小中年級',
  EH: '國小高年級',
  JH: '青少年國中組',
  SH: '青少年高中組',
  OPEN: '公開組',
  ELEM: '國小組',
};

interface SummaryData {
  event: { name: string; competitionTypes?: ('Duo' | 'Show')[]; meetingType?: 'sports-day' | 'tournament' };
  teams: TeamInfo[];
  gameState: {
    currentTeamId?: string;
    currentRound: number;
    currentActionNo?: string;
    currentActionOpen: boolean;
    status: string;
  } | null;
  calculatedScores: ActionScore[];
  vrScore: { throwVariety: number; groundVariety: number } | null;
  wrongAttackActionNos?: string[];
  singleTeamGroups?: Record<string, boolean>;
}

interface VRScoreData {
  throwVariety: number;
  groundVariety: number;
}

interface RankingItem {
  teamId: string;
  name: string;
  category: string;
  tier?: TeamTier;
  total: number;
}

const ELEMENTARY_MOTIONS: Record<'EL' | 'EM' | 'EH', Record<'A' | 'B' | 'C', readonly string[]>> = {
  EL: { A: ['A1'], B: ['B1'], C: [] },
  EM: { A: ['A1', 'A2'], B: ['B1', 'B2'], C: [] },
  EH: { A: ['A1', 'A2', 'A3'], B: ['B1', 'B2', 'B3'], C: ['C1', 'C2', 'C3'] },
};
function isElementaryTier(tier: TeamTier | undefined): tier is 'EL' | 'EM' | 'EH' {
  return tier === 'EL' || tier === 'EM' || tier === 'EH';
}

@Component({
  selector: 'app-audience',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './audience.component.html',
})
export class AudienceComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private socket = inject(SocketService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  faTriangleExclamation = faTriangleExclamation;
  faExpand = faExpand;
  faCompress = faCompress;
  faArrowsRotate = faArrowsRotate;

  isFullscreen = signal(false);
  private onFullscreenChange = () => this.isFullscreen.set(!!document.fullscreenElement);

  private subs: Subscription[] = [];

  eventId = signal('');
  eventName = signal('');
  eventCompetitionTypes = signal<('Duo' | 'Show')[]>([]);
  meetingType = signal<'sports-day' | 'tournament'>('sports-day');
  teams = signal<TeamInfo[]>([]);
  currentTeam = signal<TeamInfo | null>(null);
  currentRound = signal(1);
  groupIndex = signal(1);
  currentActionNo = signal<string | null>(null);
  singleTeamGroups = signal<Record<string, boolean>>({});

  actionScores = signal<ActionScore[]>([]);
  vrScore = signal<VRScoreData | null>(null);
  rankings = signal<RankingItem[]>([]);

  // Computed
  hasMultipleTypes = computed(() => this.eventCompetitionTypes().length > 1);
  series = computed(() => ['A', 'B', 'C'][this.currentRound() - 1] ?? 'A');
  isCseries = computed(() => this.series() === 'C');

  isSingleTeamGroup = computed(() => {
    const team = this.currentTeam();
    if (!team) return false;
    const key = `${team.category}:${team.tier ?? 'none'}`;
    return this.singleTeamGroups()[key] === true;
  });

  roundLabel = computed(() => {
    const team = this.currentTeam();
    if (!team) return '';
    const cat = CATEGORY_LABEL[team.category] ?? team.category;
    const tierLabel = team.tier ? ` ｜ ${TIER_LABEL[team.tier] ?? team.tier}` : '';
    // 單隊組別隱藏 R/G
    if (this.isSingleTeamGroup()) {
      return `${cat}${tierLabel}`;
    }
    // EL/EM 單輪連續演練，沒有輪次概念，只顯示組次
    if (this.isElementaryAB()) {
      return `${cat}${tierLabel}　G${this.groupIndex()}`;
    }
    return `${cat}${tierLabel}　R${this.currentRound()}-G${this.groupIndex()}`;
  });

  totalScore = computed(() =>
    this.actionScores().reduce((sum, a) => sum + (a.actionTotal ?? 0), 0) +
    (this.vrScore() ? this.vrScore()!.throwVariety + this.vrScore()!.groundVariety : 0)
  );

  completedActions = computed(() => this.actionScores().filter((a) => a.actionTotal !== undefined).length);

  vrt = computed(() => {
    const vr = this.vrScore();
    return vr ? vr.throwVariety + vr.groundVariety : null;
  });

  tot = computed(() => {
    const base = this.actionScores().reduce((s, a) => s + (a.actionTotal ?? 0), 0);
    const vrt = this.vrt();
    return base + (vrt ?? 0);
  });

  // EL/EM 為單輪連續演練（A 系列接著 B 系列不換組），欄位需同時呈現兩個系列
  isElementaryAB = computed(() => {
    const tier = this.currentTeam()?.tier;
    return tier === 'EL' || tier === 'EM';
  });

  seriesActions = computed(() => {
    const team = this.currentTeam();
    const s = this.series() as 'A' | 'B' | 'C';
    // Tournament EL/EM：整場 A+B 動作固定同時顯示，不隨 round 切換
    if (team && (team.tier === 'EL' || team.tier === 'EM')) {
      return [
        ...ELEMENTARY_MOTIONS[team.tier].A,
        ...ELEMENTARY_MOTIONS[team.tier].B,
      ];
    }
    // Tournament EH：每系列 3 動作，仍按 round 切換
    if (team && isElementaryTier(team.tier)) {
      return [...ELEMENTARY_MOTIONS[team.tier][s]];
    }
    // Tournament JH/OPEN：女子組/混合組 3 動作；男子組 4 動作（沿用現有規則）
    // Sports-day 沿用現有規則
    const count = team?.category === 'male' ? 4 : 3;
    return Array.from({ length: count }, (_, i) => `${s}${i + 1}`);
  });

  // 國小組（EL/EM/EH）無 VR 評分
  hideVrt = computed(() => {
    const team = this.currentTeam();
    return team ? isElementaryTier(team.tier) : false;
  });

  categoryRank = computed(() => {
    const team = this.currentTeam();
    if (!team) return null;
    // 排名群組依 (category, tier) 計算
    const sameGroup = [...this.rankings()]
      .filter((r) => r.category === team.category && (r.tier ?? null) === (team.tier ?? null))
      .sort((a, b) => b.total - a.total);
    const rank = sameGroup.findIndex((r) => r.teamId === team._id) + 1;
    return rank > 0 ? { rank, total: sameGroup.length } : null;
  });

  ngOnInit(): void {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.route.queryParams.subscribe((params) => {
      const eventId = params['eventId'];
      if (eventId) {
        this.eventId.set(eventId);
        this.socket.joinEvent(eventId);
        this.loadSummary(eventId);
      }
    });

    this.subs.push(
      this.socket.scoreCalculated$.subscribe((e: ScoreCalculatedEvent) => {
        this.actionScores.update((scores) => {
          const exists = scores.find((s) => s.actionNo === e.actionNo);
          if (exists) {
            return scores.map((s) =>
              s.actionNo === e.actionNo
                ? { ...s, ...e, wrongAttack: e.wrongAttack ?? s.wrongAttack }
                : s
            );
          }
          return [...scores, { ...e }];
        });
        this.currentActionNo.set(e.actionNo);
        this.loadRankings(this.eventId());
      }),

      this.socket.vrSubmitted$.subscribe((e) => {
        this.vrScore.set({ throwVariety: e.throwVariety, groundVariety: e.groundVariety });
        this.loadRankings(this.eventId());
      }),

      this.socket.groupChanged$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.applyCurrentTeam(e.nextTeamId);
        this.currentRound.set(e.round);
        this.actionScores.set([]);
        this.vrScore.set(null);
        this.currentActionNo.set(null);
      }),

      this.socket.roundChanged$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.currentRound.set(e.round);
        this.groupIndex.set(1);
      }),

      this.socket.actionOpened$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        // 賽事第一隊、或賽序裁判手動選隊時不會發出 group:changed，
        // 以 action:opened 夾帶的 teamId 補齊當前隊伍，
        // 否則 currentTeam 為 null 會讓動作欄位退回預設 3 欄（男子組看不到 A4）
        this.applyCurrentTeam(e.teamId);
        this.currentActionNo.set(e.actionNo);
        this.currentRound.set(e.round);
      }),

      this.socket.wrongAttackUpdated$.subscribe((e: WrongAttackUpdatedEvent) => {
        this.actionScores.update((scores) => {
          const exists = scores.find((s) => s.actionNo === e.actionNo);
          if (exists) {
            return scores.map((s) =>
              s.actionNo === e.actionNo ? { ...s, ...e } : s
            );
          }
          return [...scores, { ...e }];
        });
        this.loadRankings(this.eventId());
      })
    );
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.subs.forEach((s) => s.unsubscribe());
  }

  switchToCreative(): void {
    this.router.navigate(['/creative/audience'], { queryParams: { eventId: this.eventId() } });
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  loadSummary(eventId: string): void {
    this.api.get<{ success: boolean; data: SummaryData }>(
      `/events/${eventId}/summary`
    ).subscribe((res) => {
      if (!res.success) return;
      const { event, teams, gameState, calculatedScores, vrScore } = res.data;

      this.eventName.set(event.name);
      this.eventCompetitionTypes.set(event.competitionTypes ?? ['Duo']);
      this.meetingType.set(event.meetingType ?? 'sports-day');
      this.teams.set(teams);
      this.singleTeamGroups.set(res.data.singleTeamGroups ?? {});

      if (!gameState?.currentTeamId) return;

      this.applyCurrentTeam(gameState.currentTeamId);
      this.currentRound.set(gameState.currentRound);
      if (gameState.currentActionNo) this.currentActionNo.set(gameState.currentActionNo);

      // 還原已計算的動作成績（含 wrongAttack 標記）
      if (calculatedScores?.length) {
        const wrongSet = new Set(res.data.wrongAttackActionNos ?? []);
        this.actionScores.set(
          calculatedScores.map((s) => ({ ...s, wrongAttack: wrongSet.has(s.actionNo) }))
        );
      }

      // 還原 VR 成績
      if (vrScore) {
        this.vrScore.set({ throwVariety: vrScore.throwVariety, groundVariety: vrScore.groundVariety });
      }

      this.loadRankings(eventId);
    });
  }

  loadRankings(eventId: string): void {
    if (!eventId) return;
    this.api.get<{ success: boolean; data: RankingItem[] }>(`/events/${eventId}/rankings`).subscribe({
      next: (res) => { if (res.success) this.rankings.set(res.data); },
    });
  }

  /**
   * 設定當前隊伍並重算 G 編號。
   * G 編號在同一 (category, tier) 群組內計算，與賽序裁判端、後端換組流程的分群一致。
   * 若隊伍實際改變但未經 group:changed（賽序裁判手動選隊），一併清掉前一隊的殘留成績。
   */
  private applyCurrentTeam(teamId: string | undefined): void {
    if (!teamId) return;
    const team = this.teams().find((t) => t._id === teamId);
    if (!team) return;

    const previousId = this.currentTeam()?._id ?? null;
    this.currentTeam.set(team);

    const sameGroup = this.teams().filter(
      (t) => t.category === team.category && (t.tier ?? null) === (team.tier ?? null)
    );
    const idx = sameGroup.findIndex((t) => t._id === teamId);
    this.groupIndex.set(idx >= 0 ? idx + 1 : 1);

    if (previousId && previousId !== teamId) {
      this.actionScores.set([]);
      this.vrScore.set(null);
      this.currentActionNo.set(null);
    }
  }

  getActionScore(actionNo: string): ActionScore | undefined {
    return this.actionScores().find((s) => s.actionNo === actionNo);
  }

  isCurrentAction(actionNo: string): boolean {
    return this.currentActionNo() === actionNo;
  }

  getItemScore(score: ActionScore | undefined, i: number): number | string {
    if (!score) return '-';
    const key = `p${i}` as 'p1' | 'p2' | 'p3' | 'p4' | 'p5';
    return score[key] ?? '-';
  }
}
