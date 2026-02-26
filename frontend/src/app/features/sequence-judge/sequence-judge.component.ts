import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCheckCircle, faHourglassHalf, faLockOpen,
  faForwardStep, faPlay, faTrophy, faRightFromBracket, faBan, faRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
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
}

interface SummaryResponse {
  success: boolean;
  data: {
    event: { name: string };
    teams: TeamInfo[];
    gameState: {
      currentTeamId?: string;
      currentRound: number;
      currentActionNo?: string;
      currentActionOpen: boolean;
      currentTeamAbstained: boolean;
      status: string;
    } | null;
    vrScore: object | null;
    submittedJudgeNos: number[];
    completedActionNos: string[];
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
  actionProgress = signal<ActionProgress[]>([]);
  teamAbstained = signal(false);

  // Computed
  all5Submitted = computed(() => this.judgeStatuses().every((j) => j.submitted));
  submittedCount = computed(() => this.judgeStatuses().filter((j) => j.submitted).length);
  seriesLabel = computed(() => ['A', 'B', 'C'][this.currentRound() - 1] ?? 'A');
  roundLabel = computed(() => `R${this.currentRound()}-G${this.groupIndex()}`);
  allActionsDone = computed(() =>
    this.actionProgress().length > 0 && this.actionProgress().every((a) => a.status === 'done')
  );
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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (user?.eventId) {
      this.eventId.set(user.eventId);
      this.socket.joinEvent(user.eventId);
      this.loadSummary(user.eventId);
    }

    this.subs.push(
      // 某位裁判送出評分
      this.socket.scoreSubmitted$.subscribe((e) => {
        this.judgeStatuses.update((s) =>
          s.map((j) => j.judgeNo === e.judgeNo ? { ...j, submitted: true } : j)
        );
      }),

      // 5 位裁判全數送出，計算完成
      this.socket.scoreCalculated$.subscribe((e) => {
        this.actionProgress.update((p) =>
          p.map((a) => a.actionNo === e.actionNo ? { ...a, status: 'done' as const } : a)
        );
        this.currentActionNo.set(null);
        this.actionOpen.set(false);
        this.judgeStatuses.set([1, 2, 3, 4, 5].map((n) => ({ judgeNo: n, submitted: false })));
      }),

      // VR 裁判送出
      this.socket.vrSubmitted$.subscribe(() => {
        this.vrSubmitted.set(true);
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
        this.teamAbstained.set(false);
        this.currentActionNo.set(null);
        this.actionOpen.set(false);
        this.judgeStatuses.set([1, 2, 3, 4, 5].map((n) => ({ judgeNo: n, submitted: false })));
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
    this.subs.forEach((s) => s.unsubscribe());
  }

  // ── 載入摘要（頁面初始化 + 重整還原）─────────────────────────
  loadSummary(eventId: string): void {
    this.api.get<SummaryResponse>(`/events/${eventId}/summary`).subscribe((res) => {
      if (!res.success) return;
      const { event, teams, gameState, vrScore, submittedJudgeNos, completedActionNos } = res.data;

      this.eventName.set(event.name);
      this.teams.set(teams);

      if (!gameState) return;

      this.currentRound.set(gameState.currentRound);
      this.gameStatus.set(gameState.status);

      // 還原棄權狀態
      if (gameState.currentTeamAbstained) {
        this.teamAbstained.set(true);
      }

      // 還原 VR 送出狀態
      if (vrScore || gameState.status === 'series_complete') {
        this.vrSubmitted.set(true);
      }

      if (gameState.currentTeamId) {
        const team = teams.find((t) => t._id === gameState.currentTeamId);
        if (team) {
          this.currentTeam.set(team);
          this.groupIndex.set(teams.findIndex((t) => t._id === gameState.currentTeamId) + 1);
          this.initActionProgress(team, gameState.currentRound);

          // 還原已完成動作
          if (completedActionNos.length > 0) {
            this.actionProgress.update((p) =>
              p.map((a) => completedActionNos.includes(a.actionNo)
                ? { ...a, status: 'done' as const }
                : a
              )
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
