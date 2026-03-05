import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCheckCircle, faHourglassHalf, faLockOpen,
  faForwardStep, faPlay, faTrophy, faRightFromBracket, faBan, faRotateLeft, faTriangleExclamation,
  faArrowsRotate, faExpand, faCompress,
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketService, WrongAttackUpdatedEvent } from '../../core/services/socket.service';
import { Router } from '@angular/router';

interface TeamInfo {
  _id: string;
  name: string;
  members: string[];
  category: string;
  order: number;
}

interface JudgeStatus {
  judgeNo: number;
  submitted: boolean;
}

interface ActionProgress {
  actionNo: string;
  status: 'pending' | 'scoring' | 'done';
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  p5?: number;
  actionTotal?: number;
  wrongAttack?: boolean;
}

interface ActionScore {
  actionNo: string;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5?: number;
  actionTotal: number;
}

interface JudgeScoreEntry {
  judgeNo: number;
  items: { p1: number; p2: number; p3: number; p4: number; p5?: number };
}

interface SummaryResponse {
  success: boolean;
  data: {
    event: { name: string; competitionTypes?: ('Duo' | 'Show')[] };
    teams: TeamInfo[];
    gameState: {
      currentTeamId?: string;
      currentRound: number;
      currentActionNo?: string;
      currentActionOpen: boolean;
      currentTeamAbstained: boolean;
      status: string;
    } | null;
    vrScore: { throwVariety: number; groundVariety: number } | null;
    submittedJudgeNos: number[];
    currentActionJudgeScores: JudgeScoreEntry[];
    completedActionNos: string[];
    completedActionJudgeScores: Record<string, JudgeScoreEntry[]>;
    calculatedScores: ActionScore[];
    wrongAttackActionNos: string[];
  };
}

@Component({
  selector: 'app-sequence-judge',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './sequence-judge.component.html',
})
export class SequenceJudgeComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private socket = inject(SocketService);
  private router = inject(Router);

  private subs: Subscription[] = [];

  // 基本狀態
  eventId = signal('');
  eventName = signal('');
  teams = signal<TeamInfo[]>([]);
  currentTeam = signal<TeamInfo | null>(null);
  currentRound = signal(1);
  groupIndex = signal(1);
  currentActionNo = signal<string | null>(null);
  actionOpen = signal(false);
  gameStatus = signal<string>('idle');

  // 裁判狀態
  judgeStatuses = signal<JudgeStatus[]>([1, 2, 3, 4, 5].map((n) => ({ judgeNo: n, submitted: false })));
  vrSubmitted = signal(false);
  vrScoreValues = signal<{ throwVariety: number; groundVariety: number } | null>(null);
  actionProgress = signal<ActionProgress[]>([]);
  teamAbstained = signal(false);

  // 各裁判個別 PART 分數（當前評分動作或最近完成動作）
  judgeScores = signal<JudgeScoreEntry[]>([]);
  scoreDisplayActionNo = signal<string | null>(null);

  // Computed
  all5Submitted = computed(() => this.judgeStatuses().every((j) => j.submitted));
  submittedCount = computed(() => this.judgeStatuses().filter((j) => j.submitted).length);
  seriesLabel = computed(() => ['A', 'B', 'C'][this.currentRound() - 1] ?? 'A');
  roundLabel = computed(() => `R${this.currentRound()}-G${this.groupIndex()}`);
  allActionsDone = computed(() =>
    this.actionProgress().length > 0 && this.actionProgress().every((a) => a.status === 'done')
  );
  seriesTotalScore = computed(() => {
    const actionsTotal = this.actionProgress().reduce((sum, a) => sum + (a.actionTotal ?? 0), 0);
    const vr = this.vrScoreValues();
    return actionsTotal + (vr ? vr.throwVariety + vr.groundVariety : 0);
  });
  nextPendingAction = computed(() =>
    this.actionProgress().find((a) => a.status === 'pending')?.actionNo ?? null
  );
  // 可開放評分：有隊伍、動作未開放中、還有待評動作、且未棄權
  canOpenAction = computed(() =>
    this.currentTeam() !== null && !this.actionOpen() && this.nextPendingAction() !== null && !this.teamAbstained()
  );
  // 可換組：VR已送出 或 棄權
  canNextGroup = computed(() => this.vrSubmitted() || this.teamAbstained());
  isEventComplete = computed(() => this.gameStatus() === 'event_complete');

  faCheckCircle = faCheckCircle;
  faHourglassHalf = faHourglassHalf;
  faLockOpen = faLockOpen;
  faForwardStep = faForwardStep;
  faPlay = faPlay;
  faTrophy = faTrophy;
  faRightFromBracket = faRightFromBracket;
  faBan = faBan;
  faRotateLeft = faRotateLeft;
  faTriangleExclamation = faTriangleExclamation;
  faArrowsRotate = faArrowsRotate;

  faExpand = faExpand;
  faCompress = faCompress;

  isFullscreen = signal(false);
  private onFullscreenChange = () => this.isFullscreen.set(!!document.fullscreenElement);

  hasEventId = computed(() => !!this.auth.user()?.eventId);
  hasMultipleTypes = computed(() => this.auth.eventCompetitionTypes().length > 1);
  currentTypeName = computed(() => this.auth.competitionType() === 'creative' ? '創意演武' : '雙人演武');
  otherTypeName = computed(() => this.auth.competitionType() === 'creative' ? '雙人演武' : '創意演武');

  switchCompetitionType(): void {
    const newType = this.auth.competitionType() === 'creative' ? 'kata' : 'creative';
    this.auth.setCompetitionType(newType);
    this.router.navigate([newType === 'creative' ? '/creative/sequence' : '/judge/sequence']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    const user = this.auth.user();
    if (user?.eventId) {
      this.eventId.set(user.eventId);
      this.socket.joinEvent(user.eventId);
      this.loadSummary(user.eventId);
    }

    this.subs.push(
      // 某位裁判送出評分（更新送出狀態 + 記錄個別分數）
      this.socket.scoreSubmitted$.subscribe((e) => {
        this.judgeStatuses.update((s) =>
          s.map((j) => j.judgeNo === e.judgeNo ? { ...j, submitted: true } : j)
        );
        this.scoreDisplayActionNo.set(e.actionNo);
        this.judgeScores.update((scores) => {
          const filtered = scores.filter((s) => s.judgeNo !== e.judgeNo);
          return [...filtered, { judgeNo: e.judgeNo, items: e.items as JudgeScoreEntry['items'] }]
            .sort((a, b) => a.judgeNo - b.judgeNo);
        });
      }),

      // 5 位裁判全數送出，計算完成（存入 PART 分數）
      this.socket.scoreCalculated$.subscribe((e) => {
        this.actionProgress.update((p) =>
          p.map((a) => a.actionNo === e.actionNo
            ? { ...a, status: 'done' as const, p1: e.p1, p2: e.p2, p3: e.p3, p4: e.p4, p5: e.p5, actionTotal: e.actionTotal }
            : a)
        );
        this.currentActionNo.set(null);
        this.actionOpen.set(false);
        this.judgeStatuses.set([1, 2, 3, 4, 5].map((n) => ({ judgeNo: n, submitted: false })));
      }),

      // 錯誤攻擊更新（更新分數與 wrongAttack 旗標，不重置賽序狀態）
      this.socket.wrongAttackUpdated$.subscribe((e: WrongAttackUpdatedEvent) => {
        this.actionProgress.update((p) =>
          p.map((a) => a.actionNo === e.actionNo
            ? { ...a, p1: e.p1, p2: e.p2, p3: e.p3, p4: e.p4, p5: e.p5, actionTotal: e.actionTotal, wrongAttack: e.wrongAttack }
            : a)
        );
      }),

      // VR 裁判送出（記錄實際分數）
      this.socket.vrSubmitted$.subscribe((e) => {
        this.vrSubmitted.set(true);
        this.vrScoreValues.set({ throwVariety: e.throwVariety, groundVariety: e.groundVariety });
      }),

      // 換組（同輪或跨輪均觸發）
      this.socket.groupChanged$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        const nextTeam = this.teams().find((t) => t._id === e.nextTeamId);
        if (nextTeam) {
          this.currentTeam.set(nextTeam);
          // groupIndex 從 teams 陣列位置計算（1-indexed）
          this.groupIndex.set(this.teams().findIndex((t) => t._id === e.nextTeamId) + 1);
          this.initActionProgress(nextTeam, e.round);
        }
        this.currentRound.set(e.round);
        this.vrSubmitted.set(false);
        this.vrScoreValues.set(null);
        this.teamAbstained.set(false);
        this.currentActionNo.set(null);
        this.actionOpen.set(false);
        this.judgeStatuses.set([1, 2, 3, 4, 5].map((n) => ({ judgeNo: n, submitted: false })));
        this.judgeScores.set([]);
        this.scoreDisplayActionNo.set(null);
      }),

      // 棄權事件同步（多視窗）
      this.socket.teamAbstained$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.teamAbstained.set(true);
      }),
      this.socket.teamAbstainCancelled$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.teamAbstained.set(false);
      }),

      // 換輪
      this.socket.roundChanged$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        if (e.round === 0) {
          this.gameStatus.set('event_complete');
        }
      }),
    );
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.subs.forEach((s) => s.unsubscribe());
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // ── 載入摘要（頁面初始化 + 重整還原）─────────────────────────
  loadSummary(eventId: string): void {
    this.api.get<SummaryResponse>(`/events/${eventId}/summary`).subscribe((res) => {
      if (!res.success) return;
      const { event, teams, gameState, vrScore, submittedJudgeNos, currentActionJudgeScores, completedActionNos, completedActionJudgeScores, calculatedScores, wrongAttackActionNos } = res.data;

      this.eventName.set(event.name);
      if (event.competitionTypes?.length) {
        this.auth.setEventCompetitionTypes(event.competitionTypes);
      }
      this.teams.set(teams);

      if (!gameState) return;

      this.currentRound.set(gameState.currentRound);
      this.gameStatus.set(gameState.status);

      // 還原棄權狀態
      if (gameState.currentTeamAbstained) {
        this.teamAbstained.set(true);
      }

      // 還原 VR 送出狀態與分數
      if (vrScore || gameState.status === 'series_complete') {
        this.vrSubmitted.set(true);
        if (vrScore) {
          this.vrScoreValues.set({ throwVariety: vrScore.throwVariety, groundVariety: vrScore.groundVariety });
        }
      }

      if (gameState.currentTeamId) {
        const team = teams.find((t) => t._id === gameState.currentTeamId);
        if (team) {
          this.currentTeam.set(team);
          this.groupIndex.set(teams.findIndex((t) => t._id === gameState.currentTeamId) + 1);
          this.initActionProgress(team, gameState.currentRound);

          // 還原已完成動作（含 PART 分數與錯誤攻擊）
          if (completedActionNos.length > 0) {
            const scoreMap = new Map(calculatedScores?.map((s) => [s.actionNo, s]) ?? []);
            const wrongSet = new Set(wrongAttackActionNos ?? []);
            this.actionProgress.update((p) =>
              p.map((a) => {
                if (!completedActionNos.includes(a.actionNo)) return a;
                const sc = scoreMap.get(a.actionNo);
                return {
                  ...a,
                  status: 'done' as const,
                  ...(sc ? { p1: sc.p1, p2: sc.p2, p3: sc.p3, p4: sc.p4, p5: sc.p5, actionTotal: sc.actionTotal } : {}),
                  wrongAttack: wrongSet.has(a.actionNo),
                };
              })
            );
          }

          // 還原當前動作開放狀態
          if (gameState.currentActionNo && gameState.currentActionOpen) {
            this.currentActionNo.set(gameState.currentActionNo);
            this.actionOpen.set(true);
            this.actionProgress.update((p) =>
              p.map((a) =>
                a.actionNo === gameState.currentActionNo
                  ? { ...a, status: 'scoring' as const }
                  : a
              )
            );
            // 還原已送出的裁判狀態
            this.judgeStatuses.update((s) =>
              s.map((j) => ({ ...j, submitted: submittedJudgeNos.includes(j.judgeNo) }))
            );
              // 還原個別裁判分數（當前開放動作）
            if (currentActionJudgeScores?.length) {
              this.judgeScores.set([...currentActionJudgeScores].sort((a, b) => a.judgeNo - b.judgeNo));
              this.scoreDisplayActionNo.set(gameState.currentActionNo);
            }
          } else {
            // 無開放中動作：顯示最後一個已完成動作的個別裁判分數
            const lastCompleted = completedActionNos[completedActionNos.length - 1];
            if (lastCompleted && completedActionJudgeScores?.[lastCompleted]?.length) {
              this.judgeScores.set([...completedActionJudgeScores[lastCompleted]]);
              this.scoreDisplayActionNo.set(lastCompleted);
            }
          }
        }
      } else if (teams.length > 0 && gameState.status !== 'event_complete') {
        // 賽事尚未開始：預先選取第一組供畫面顯示，點按鈕才真正開始
        const firstTeam = teams[0];
        this.currentTeam.set(firstTeam);
        this.groupIndex.set(1);
        this.initActionProgress(firstTeam, 1);
      }
    });
  }

  hasJudgeScore(judgeNo: number): boolean {
    return this.judgeScores().some((s) => s.judgeNo === judgeNo);
  }

  private initActionProgress(team: TeamInfo, round: number): void {
    const series = ['A', 'B', 'C'][round - 1] ?? 'A';
    const count = team.category === 'male' ? 4 : 3;
    this.actionProgress.set(
      Array.from({ length: count }, (_, i) => ({
        actionNo: `${series}${i + 1}`,
        status: 'pending' as const,
      }))
    );
  }

  // ── 開放評分 ─────────────────────────────────────────────────
  openAction(): void {
    const pending = this.nextPendingAction();
    if (!pending || this.actionOpen() || !this.currentTeam()) return;

    this.api.post<{ success: boolean }>('/flow/open-action', {
      eventId: this.eventId(),
      teamId: this.currentTeam()!._id,
      round: this.currentRound(),
      actionNo: pending,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.currentActionNo.set(pending);
          this.actionOpen.set(true);
          this.judgeStatuses.set([1, 2, 3, 4, 5].map((n) => ({ judgeNo: n, submitted: false })));
          this.judgeScores.set([]);
          this.scoreDisplayActionNo.set(pending);
          this.actionProgress.update((p) =>
            p.map((a) => a.actionNo === pending ? { ...a, status: 'scoring' as const } : a)
          );
          Swal.fire({
            icon: 'success', title: `${pending} 評分已開放`,
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1500,
          });
        }
      },
      error: (err) => {
        Swal.fire({
          icon: 'error', title: err.error?.error ?? '開放失敗',
          toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
        });
      },
    });
  }

  // ── 棄權 ─────────────────────────────────────────────────────
  setAbstain(): void {
    this.api.post<{ success: boolean }>('/flow/abstain', { eventId: this.eventId() }).subscribe({
      next: (res) => {
        if (res.success) {
          this.teamAbstained.set(true);
          Swal.fire({ icon: 'warning', title: '已設定棄權', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '棄權設定失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  cancelAbstain(): void {
    this.api.post<{ success: boolean }>('/flow/cancel-abstain', { eventId: this.eventId() }).subscribe({
      next: (res) => {
        if (res.success) {
          this.teamAbstained.set(false);
          Swal.fire({ icon: 'success', title: '已取消棄權', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '取消棄權失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  // ── 換組 ─────────────────────────────────────────────────────
  async nextGroup(): Promise<void> {
    if (!this.canNextGroup()) return;

    const result = await Swal.fire({
      icon: 'question',
      title: '確認換組？',
      text: '將切換至下一組隊伍繼續評分',
      showCancelButton: true,
      confirmButtonText: '確認換組',
      cancelButtonText: '取消',
    });
    if (!result.isConfirmed) return;

    this.api.post<{ success: boolean; data: { message?: string } }>('/flow/next-group', {
      eventId: this.eventId(),
    }).subscribe({
      next: (res) => {
        if (res.success) {
          Swal.fire({
            icon: 'success', title: res.data.message ?? '已換組',
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
          });
        }
      },
      error: (err) => {
        Swal.fire({
          icon: 'error', title: err.error?.error ?? '換組失敗',
          toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
        });
      },
    });
  }
}
