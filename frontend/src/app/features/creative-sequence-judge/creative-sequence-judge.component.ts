import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faPlay, faPause, faRotateLeft, faCheck, faForward, faRightFromBracket, faExpand, faCompress, faArrowsRotate,
  faChevronDown, faChevronRight, faCheckCircle, faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketService, CreativeScoreSubmittedEvent, CreativeTeamAbstainedEvent } from '../../core/services/socket.service';
import { Router } from '@angular/router';

type PenaltyType = 'overtime' | 'undertime' | 'props' | 'attacks';
type TimerStatus = 'idle' | 'running' | 'paused';

const PENALTY_LABELS: Record<PenaltyType, string> = {
  overtime: '超時 (-1.0)',
  undertime: '未達時間 (-1.0)',
  props: '使用道具 (-1.0)',
  attacks: '實際攻防 (-0.5)',
};

const ALL_PENALTIES: PenaltyType[] = ['overtime', 'undertime', 'props', 'attacks'];

// 合規時間：90–120 秒
const MIN_MS = 90_000;
const MAX_MS = 120_000;

interface TeamItem {
  _id: string;
  name: string;
  members: string[];
  category: string;
  order: number;
  isFinished?: boolean;
  scoreSummary?: {
    technicalTotal: number;
    artisticTotal: number;
    finalScore: number;
    penaltyDeduction: number;
    penalties: string[];
  } | null;
}

interface CreativeStateData {
  currentTeamId?: string;
  status: string;
  timerStartedAt?: string;
  timerStoppedAt?: string;
  timerElapsedMs?: number;
  timerStatus?: TimerStatus;
  isAbstained?: boolean;
}

interface ScoreResult {
  technicalTotal: number;
  artisticTotal: number;
  grandTotal: number;
  totalPenaltyDeduction: number;
  finalScore: number;
  penalties: Array<{ type: string; deduction: number; count: number }>;
}

const CATEGORY_ORDER: Record<string, number> = { female: 0, male: 1, mixed: 2 };
const CATEGORY_LABEL: Record<string, string> = { male: '男子組', female: '女子組', mixed: '混合組' };
const PENALTY_TYPE_LABEL: Record<string, string> = {
  overtime: '超時',
  undertime: '未達時間',
  props: '使用道具',
  attacks: '實際攻防',
};

@Component({
  selector: 'app-creative-sequence-judge',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './creative-sequence-judge.component.html',
})
export class CreativeSequenceJudgeComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private socket = inject(SocketService);
  private router = inject(Router);

  teams = signal<TeamItem[]>([]);
  currentTeam = signal<TeamItem | null>(null);
  loading = signal(false);
  isFullscreen = signal(false);
  eventName = signal<string>('');

  // 隊伍資訊 signals（計時畫面即時顯示，Timer view displays current team information in real-time）
  currentCategory = computed(() => {
    const cat = this.currentTeam()?.category ?? '';
    return CATEGORY_LABEL[cat] ?? cat;
  });
  currentTeamName = computed(() => this.currentTeam()?.name ?? '');
  currentMembers = computed(() => this.currentTeam()?.members ?? []);

  // 隊伍清單依 category → order 排序（Sequence judge opens scoring for a team）
  sortedTeams = computed(() => {
    return [...this.teams()].sort((a, b) => {
      const catDiff = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
      if (catDiff !== 0) return catDiff;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  });

  // 隊伍依組別分群（含標籤）
  groupedTeams = computed(() => {
    const sorted = this.sortedTeams();
    const groups: { category: string; label: string; teams: TeamItem[] }[] = [];
    for (const team of sorted) {
      const last = groups[groups.length - 1];
      if (!last || last.category !== team.category) {
        groups.push({ category: team.category, label: CATEGORY_LABEL[team.category] ?? team.category, teams: [team] });
      } else {
        last.teams.push(team);
      }
    }
    return groups;
  });

  // 計時器（Timer view provides pause, resume, and reset controls）
  timerStatus = signal<TimerStatus>('idle');
  elapsedMs = signal(0);          // 已累積毫秒（含暫停前）
  localStartMs = signal<number | null>(null);  // Date.now() when last resumed/started
  private tick = signal(0);       // 每 200ms 遞增，強制 displayMs 重算

  // Timer display computed from timestamp, not interval increment（修正 NaN Bug）
  displayMs = computed(() => {
    this.tick(); // 訂閱 tick，確保 OnPush 下每 200ms 重算
    const base = this.elapsedMs();
    const start = this.localStartMs();
    if (this.timerStatus() === 'running' && start !== null && !isNaN(start)) {
      return base + (Date.now() - start);
    }
    return base;
  });

  timerColor = computed(() => {
    const ms = this.displayMs();
    if (ms === 0) return 'white';
    if (ms < MIN_MS) return 'yellow';
    if (ms <= MAX_MS) return 'green';
    return 'red';
  });

  displayTime = computed(() => {
    const ms = this.displayMs();
    if (isNaN(ms)) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  // 違例
  selectedPenalties = signal<Set<PenaltyType>>(new Set());
  readonly allPenalties = ALL_PENALTIES;
  readonly penaltyLabels = PENALTY_LABELS;

  // 棄權狀態
  isAbstained = signal(false);

  // 賽事狀態
  scoringOpen = signal(false);
  submittedCount = signal(0);

  // 計分結果（Sequence judge timer view displays real-time calculated score）
  lastScoreResult = signal<ScoreResult | null>(null);

  // 各裁判即時評分（judgeNo → { tech, art }）
  judgeSubmissions = signal<Map<number, { tech: number; art: number }>>(new Map());

  readonly penaltyTypeLabel = PENALTY_TYPE_LABEL;

  faPlay = faPlay;
  faPause = faPause;
  faRotateLeft = faRotateLeft;
  faCheck = faCheck;
  faForward = faForward;
  faRightFromBracket = faRightFromBracket;
  faExpand = faExpand;
  faCompress = faCompress;
  faArrowsRotate = faArrowsRotate;
  faChevronDown = faChevronDown;
  faChevronRight = faChevronRight;
  faCheckCircle = faCheckCircle;
  faInfoCircle = faInfoCircle;

  // 分組收放狀態
  collapsedGroups = signal<Set<string>>(new Set());

  toggleGroup(category: string): void {
    this.collapsedGroups.update(s => {
      const next = new Set(s);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  }

  isGroupCollapsed(category: string): boolean {
    return this.collapsedGroups().has(category);
  }

  hasMultipleTypes = computed(() => this.auth.eventCompetitionTypes().length > 1);
  currentTypeName = computed(() => this.auth.competitionType() === 'creative' ? '創意演武' : '雙人演武');
  otherTypeName = computed(() => this.auth.competitionType() === 'creative' ? '雙人演武' : '創意演武');
  allTeamsFinished = computed(() => this.teams().length > 0 && this.teams().every(t => t.isFinished));
  // 可切換競賽類型：無選中隊伍，或所有隊伍已完賽（且計時停止、評分未開放）
  canSwitchType = computed(() =>
    (!this.currentTeam() || this.allTeamsFinished()) &&
    !this.scoringOpen() &&
    this.timerStatus() === 'idle'
  );

  private subs = new Subscription();
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  get eventId(): string { return this.auth.user()?.eventId ?? ''; }

  ngOnInit(): void {
    if (!this.eventId) { this.router.navigate(['/login']); return; }
    this.socket.joinEvent(this.eventId);
    // 先載入隊伍，再還原賽程狀態，避免 loadState 找不到隊伍的 race condition
    this.loadTeams(/* restoreState */ true);
    this.loadEventInfo();

    // 計時器廣播：同步其他螢幕 + 修正 NaN（使用 timerStartedAt 與 elapsedMs）
    this.subs.add(
      this.socket.timerStarted$.subscribe((evt) => {
        if (evt.eventId !== this.eventId) return;
        const startMs = new Date(evt.timerStartedAt).getTime();
        if (!isNaN(startMs)) {
          this.localStartMs.set(startMs);
        }
        this.elapsedMs.set(evt.elapsedMs ?? 0);
        this.timerStatus.set('running');
        this.startLocalInterval();
      })
    );

    this.subs.add(
      this.socket.timerStopped$.subscribe((evt) => {
        if (evt.eventId !== this.eventId) return;
        this.stopLocalInterval();
        this.elapsedMs.set(evt.elapsedMs);
        this.localStartMs.set(null);
        // timerStatus 留給 API 呼叫結果更新，這裡只停止 interval
        // (pause/stop 都廣播 timer:stopped，不知是哪種，保守設 'paused' 等 API 回應)
        if (this.timerStatus() === 'running') {
          this.timerStatus.set('paused');
        }
      })
    );

    this.subs.add(
      this.socket.penaltyUpdated$.subscribe((evt) => {
        if (evt.eventId !== this.eventId) return;
        this.selectedPenalties.set(new Set(evt.penalties as PenaltyType[]));
      })
    );

    this.subs.add(
      this.socket.creativeTeamChanged$.subscribe((evt) => {
        if (evt.eventId !== this.eventId) return;
        this.resetTimerState();
        this.selectedPenalties.set(new Set());
        this.scoringOpen.set(false);
        this.submittedCount.set(0);
        this.lastScoreResult.set(null);
        this.judgeSubmissions.set(new Map());
        this.isAbstained.set(false);
        
        // 收到換組通知後，一律重新載入隊伍列表以更新完賽狀態
        this.api.get<{ success: boolean; data: TeamItem[] }>(`/events/${this.eventId}/teams?competitionType=Show`).subscribe({
          next: (res) => {
            const teams = res.data ?? [];
            this.teams.set(teams);
            
            if (evt.nextTeamId) {
              const team = teams.find(t => t._id === evt.nextTeamId);
              if (team) {
                this.selectTeam(team);
              } else {
                this.currentTeam.set(null);
              }
            } else {
              this.currentTeam.set(null);
            }
          },
          error: () => {
            this.currentTeam.set(null);
            console.error('換組後載入隊伍失敗');
          }
        });
      })
    );

    // 棄權廣播同步
    this.subs.add(
      this.socket.creativeTeamAbstained$.subscribe((evt: CreativeTeamAbstainedEvent) => {
        if (evt.eventId !== this.eventId) return;
        this.isAbstained.set(true);
      })
    );
    this.subs.add(
      this.socket.creativeTeamAbstainCancelled$.subscribe((evt: CreativeTeamAbstainedEvent) => {
        if (evt.eventId !== this.eventId) return;
        this.isAbstained.set(false);
      })
    );

    // 各裁判即時送分（含分數，實時顯示）
    this.subs.add(
      this.socket.creativeScoreSubmitted$.subscribe((evt: CreativeScoreSubmittedEvent) => {
        if (evt.eventId !== this.eventId) return;
        if (evt.teamId !== this.currentTeam()?._id) return;
        this.submittedCount.update(n => n + 1);
        this.judgeSubmissions.update(m => {
          const next = new Map(m);
          next.set(evt.judgeNo, { tech: evt.technicalScore, art: evt.artisticScore });
          return next;
        });
      })
    );

    // 計分結果即時顯示（Sequence judge timer view displays real-time calculated score）
    this.subs.add(
      this.socket.creativeScoreCalculated$.subscribe((evt) => {
        if (evt.eventId !== this.eventId) return;
        if (evt.teamId === this.currentTeam()?._id) {
          this.lastScoreResult.set({
            technicalTotal: evt.technicalTotal,
            artisticTotal: evt.artisticTotal,
            grandTotal: evt.grandTotal,
            totalPenaltyDeduction: evt.penaltyDeduction,
            finalScore: evt.finalScore,
            penalties: evt.penalties ?? [],
          });
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.stopLocalInterval();
    this.socket.leaveEvent(this.eventId);
    this.subs.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      if (this.scoringOpen()) return;  // 評分進行中，Space 鍵無效
      const status = this.timerStatus();
      if (status === 'running') {
        this.pauseTimer();
      } else if (status === 'paused') {
        this.resumeTimer();
      } else if (status === 'idle' && this.currentTeam()) {
        this.startTimer();
      }
    }
  }

  loadTeams(restoreState = false): void {
    this.api.get<{ success: boolean; data: TeamItem[] }>(`/events/${this.eventId}/teams?competitionType=Show`).subscribe({
      next: (res) => {
        const teams = res.data ?? [];
        this.teams.set(teams);

        // 同步當前選中隊伍的完賽狀態
        const current = this.currentTeam();
        if (current) {
          const updated = teams.find(t => t._id === current._id);
          if (updated) {
            // 如果狀態有變（例如剛完賽），重新觸發 selectTeam 邏輯
            if (updated.isFinished !== current.isFinished) {
              this.selectTeam(updated);
            } else {
              this.currentTeam.set(updated);
            }
          }
        } else if (restoreState) {
          // 初始載入：teams 已就緒後再還原賽程狀態，避免 race condition
          this.loadState();
        }
      },
      error: () => {
        console.error('無法載入隊伍');
        if (restoreState) this.loadState();
      },
    });
  }

  // 頁面重載後還原計時狀態（Timer view provides pause, resume, and reset controls — 頁面重載還原）
  loadState(): void {
    this.api.get<{ success: boolean; data: CreativeStateData }>(`/creative/flow/state/${this.eventId}`)
      .subscribe({
        next: (res) => {
          const state = res.data;
          if (!state) return;
          if (state.currentTeamId) {
            const team = this.teams().find(t => t._id === state.currentTeamId) ?? null;
            this.currentTeam.set(team);
          }

          const storedStatus = state.timerStatus ?? 'idle';
          const storedElapsed = state.timerElapsedMs ?? 0;

          if (storedStatus === 'running' && state.timerStartedAt) {
            const startMs = new Date(state.timerStartedAt).getTime();
            if (!isNaN(startMs)) {
              this.elapsedMs.set(storedElapsed);
              this.localStartMs.set(startMs);
              this.timerStatus.set('running');
              this.startLocalInterval();
            }
          } else if (storedStatus === 'paused') {
            this.elapsedMs.set(storedElapsed);
            this.timerStatus.set('paused');
          } else {
            this.elapsedMs.set(storedElapsed);
            this.timerStatus.set('idle');
          }

          this.scoringOpen.set(
            state.status === 'scoring_open' || state.status === 'scores_collected'
          );
          this.isAbstained.set(state.isAbstained ?? false);
        },
        error: () => {},
      });
  }

  selectTeam(team: TeamItem): void {
    this.currentTeam.set(team);
    this.resetTimerState();
    this.selectedPenalties.set(new Set());
    this.scoringOpen.set(false);
    this.submittedCount.set(0);
    this.judgeSubmissions.set(new Map());
    this.isAbstained.set(false);

    if (team.isFinished && team.scoreSummary) {
      this.lastScoreResult.set({
        technicalTotal: team.scoreSummary.technicalTotal,
        artisticTotal: team.scoreSummary.artisticTotal,
        grandTotal: team.scoreSummary.technicalTotal + team.scoreSummary.artisticTotal,
        totalPenaltyDeduction: team.scoreSummary.penaltyDeduction,
        finalScore: team.scoreSummary.finalScore,
        penalties: team.scoreSummary.penalties.map(p => ({
          type: p,
          deduction: 0,
          count: 1
        }))
      });
      // 將違例狀態同步至 Signal 供 UI 顯示
      this.selectedPenalties.set(new Set(team.scoreSummary.penalties as PenaltyType[]));
    } else {
      this.lastScoreResult.set(null);
    }
  }

  startTimer(): void {
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/start-timer', { eventId: this.eventId, teamId: this.currentTeam()?._id }).subscribe({
      next: () => { this.loading.set(false); this.timerStatus.set('running'); },
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '計時器啟動失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  pauseTimer(): void {
    this.loading.set(true);
    this.api.post<{ success: boolean; elapsedMs: number }>('/creative/flow/pause-timer', { eventId: this.eventId }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.timerStatus.set('paused');
        this.elapsedMs.set(res.elapsedMs ?? this.elapsedMs());
        this.stopLocalInterval();
        this.localStartMs.set(null);
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '暫停失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  resumeTimer(): void {
    this.loading.set(true);
    this.api.post<{ success: boolean; timerStartedAt: string; elapsedMs: number }>('/creative/flow/resume-timer', { eventId: this.eventId }).subscribe({
      next: (res) => {
        this.loading.set(false);
        const startMs = new Date(res.timerStartedAt).getTime();
        if (!isNaN(startMs)) {
          this.localStartMs.set(startMs);
          this.elapsedMs.set(res.elapsedMs ?? this.elapsedMs());
          this.timerStatus.set('running');
          this.startLocalInterval();
        }
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '繼續計時失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  resetTimer(): void {
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/reset-timer', { eventId: this.eventId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.resetTimerState();
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '歸零失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  togglePenalty(type: PenaltyType): void {
    const set = new Set(this.selectedPenalties());
    if (set.has(type)) { set.delete(type); } else { set.add(type); }
    this.selectedPenalties.set(set);
    this.savePenalties(Array.from(set));
  }

  savePenalties(types: PenaltyType[]): void {
    const teamId = this.currentTeam()?._id;
    if (!teamId) return;
    this.api.post<{ success: boolean }>('/creative/penalties', {
      eventId: this.eventId,
      teamId,
      penalties: types,
    }).subscribe({ error: () => console.error('違例儲存失敗') });
  }

  openScoring(): void {
    const teamId = this.currentTeam()?._id;
    if (!teamId) return;
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/open-scoring', { eventId: this.eventId, teamId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.scoringOpen.set(true);
        this.submittedCount.set(0);
        this.judgeSubmissions.set(new Map());
        Swal.fire({ icon: 'success', title: '已開放評分', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      },
      error: (err) => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: err?.error?.message ?? '開放評分失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  confirmScores(): void {
    const teamId = this.currentTeam()?._id;
    if (!teamId) return;
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/confirm-scores', { eventId: this.eventId, teamId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.scoringOpen.set(false);
        Swal.fire({ icon: 'success', title: '收分完成', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        this.loadTeams(); // 重新載入以顯示「已完賽」
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? '確認收分失敗';
        Swal.fire({ icon: 'warning', title: msg, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      },
    });
  }

  nextTeam(): void {
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/next-team', {
      eventId: this.eventId,
      currentTeamId: this.currentTeam()?._id,  // 傳入目前選取的隊伍 ID，後端才能從正確位置往後找
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.loadTeams(); // 重新載入以同步狀態
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '下一組失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  abstainTeam(): void {
    const teamId = this.currentTeam()?._id;
    if (!teamId) return;
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/abstain', { eventId: this.eventId, teamId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.isAbstained.set(true);
        Swal.fire({ icon: 'warning', title: '已設定棄權', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '棄權設定失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  cancelAbstain(): void {
    const teamId = this.currentTeam()?._id;
    if (!teamId) return;
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/abstain-cancel', { eventId: this.eventId, teamId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.isAbstained.set(false);
        Swal.fire({ icon: 'success', title: '已取消棄權', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '取消棄權失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  private startLocalInterval(): void {
    this.stopLocalInterval();
    this.timerInterval = setInterval(() => {
      // 遞增 tick 強制 displayMs 重算（update(v=>v) 同值不觸發 signal reactivity）
      this.tick.update(n => (n + 1) % 1000);
    }, 200);
  }

  private stopLocalInterval(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  private resetTimerState(): void {
    this.stopLocalInterval();
    this.timerStatus.set('idle');
    this.elapsedMs.set(0);
    this.localStartMs.set(null);
  }

  private loadEventInfo(): void {
    this.api.get<{ success: boolean; data: { event: { name: string; competitionTypes?: ('Duo' | 'Show')[] } } }>(`/events/${this.eventId}/summary`).subscribe((res) => {
      if (!res.success) return;
      this.eventName.set(res.data.event.name);
      if (res.data.event.competitionTypes?.length) {
        this.auth.setEventCompetitionTypes(res.data.event.competitionTypes);
      }
    });
  }

  switchCompetitionType(): void {
    const newType = this.auth.competitionType() === 'creative' ? 'kata' : 'creative';
    this.auth.setCompetitionType(newType);
    this.router.navigate([newType === 'creative' ? '/creative/sequence' : '/judge/sequence']);
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      this.isFullscreen.set(true);
    } else {
      document.exitFullscreen();
      this.isFullscreen.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  isPenaltySelected(type: PenaltyType): boolean {
    return this.selectedPenalties().has(type);
  }

  getPenaltyTypeLabel(type: string): string {
    return this.penaltyTypeLabel[type] ?? type;
  }
}
