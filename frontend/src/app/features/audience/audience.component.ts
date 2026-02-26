import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SocketService, ScoreCalculatedEvent } from '../../core/services/socket.service';

interface ActionScore {
  actionNo: string;
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  p5?: number;
  actionTotal?: number;
}

interface TeamInfo {
  _id: string;
  name: string;
  members: string[];
  category: string;
}

interface SummaryData {
  event: { name: string };
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
}

interface VRScoreData {
  throwVariety: number;
  groundVariety: number;
}

interface RankingItem {
  teamId: string;
  name: string;
  category: string;
  total: number;
}

@Component({
  selector: 'app-audience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audience.component.html',
})
export class AudienceComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private socket = inject(SocketService);
  private route = inject(ActivatedRoute);

  private subs: Subscription[] = [];

  eventId = signal('');
  eventName = signal('');
  teams = signal<TeamInfo[]>([]);
  currentTeam = signal<TeamInfo | null>(null);
  currentRound = signal(1);
  groupIndex = signal(1);
  currentActionNo = signal<string | null>(null);

  actionScores = signal<ActionScore[]>([]);
  vrScore = signal<VRScoreData | null>(null);
  rankings = signal<RankingItem[]>([]);

  // Computed
  series = computed(() => ['A', 'B', 'C'][this.currentRound() - 1] ?? 'A');
  isCseries = computed(() => this.series() === 'C');
  roundLabel = computed(() => `R${this.currentRound()}-G${this.groupIndex()}`);

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

  seriesActions = computed(() => {
    const s = this.series();
    const count = this.currentTeam()?.category === 'male' ? 4 : 3;
    return Array.from({ length: count }, (_, i) => `${s}${i + 1}`);
  });

  categoryRank = computed(() => {
    const team = this.currentTeam();
    if (!team) return null;
    const sameCategory = [...this.rankings()]
      .filter((r) => r.category === team.category)
      .sort((a, b) => b.total - a.total);
    const rank = sameCategory.findIndex((r) => r.teamId === team._id) + 1;
    return rank > 0 ? { rank, total: sameCategory.length } : null;
  });

  ngOnInit(): void {
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
            return scores.map((s) => s.actionNo === e.actionNo ? { ...s, ...e } : s);
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
        const team = this.teams().find((t) => t._id === e.nextTeamId);
        if (team) {
          this.currentTeam.set(team);
          this.groupIndex.set(this.teams().findIndex((t) => t._id === e.nextTeamId) + 1);
        }
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
        this.currentActionNo.set(e.actionNo);
        this.currentRound.set(e.round);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  loadSummary(eventId: string): void {
    this.api.get<{ success: boolean; data: SummaryData }>(
      `/events/${eventId}/summary`
    ).subscribe((res) => {
      if (!res.success) return;
      const { event, teams, gameState, calculatedScores, vrScore } = res.data;

      this.eventName.set(event.name);
      this.teams.set(teams);

      if (!gameState?.currentTeamId) return;

      const team = teams.find((t) => t._id === gameState.currentTeamId);
      if (team) {
        this.currentTeam.set(team);
        this.groupIndex.set(teams.findIndex((t) => t._id === gameState.currentTeamId) + 1);
      }
      this.currentRound.set(gameState.currentRound);
      if (gameState.currentActionNo) this.currentActionNo.set(gameState.currentActionNo);

      // 還原已計算的動作成績
      if (calculatedScores?.length) {
        this.actionScores.set(calculatedScores);
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

  getActionScore(actionNo: string): ActionScore | undefined {
    return this.actionScores().find((s) => s.actionNo === actionNo);
  }

  isCurrentAction(actionNo: string): boolean {
    return this.currentActionNo() === actionNo;
  }

  getItemScore(score: ActionScore | undefined, i: number): number | string {
    if (!score) return '-';
    const key = `p${i}` as keyof ActionScore;
    return score[key] ?? '-';
  }
}
