import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHourglassHalf, faCheckCircle, faCheck, faRightFromBracket, faBan } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { Router } from '@angular/router';

type JudgeState = 'waiting' | 'scoring' | 'submitted' | 'abstained';

interface ActionRecord {
  actionNo: string;
  total: number;
  items: Record<string, number>;
}

interface TeamInfo {
  _id: string;
  name: string;
  members: string[];
  category: string;
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
    completedActionNos: string[];
  };
}

interface MyRoundScore {
  actionNo: string;
  items: Record<string, number>;
}

@Component({
  selector: 'app-scoring-judge',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './scoring-judge.component.html',
})
export class ScoringJudgeComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private socket = inject(SocketService);
  private router = inject(Router);

  private subs: Subscription[] = [];

  // 狀態
  judgeState = signal<JudgeState>('waiting');
  currentTeam = signal<TeamInfo | null>(null);
  currentRound = signal<number>(1);
  currentActionNo = signal<string | null>(null);
  selections = signal<Record<string, number>>({});
  submittedHistory = signal<ActionRecord[]>([]);
  eventName = signal<string>('');
  eventId = signal<string>('');
  groupIndex = signal<number>(1);
  teams = signal<TeamInfo[]>([]);

  // Computed
  // 系列從 round 計算（不從 actionNo 字元取得，避免等待時顯示錯誤）
  series = computed(() => ['A', 'B', 'C'][this.currentRound() - 1] ?? 'A');
  // C 系列有 5 個評分項目，A/B 系列 4 個
  itemCount = computed(() => this.currentRound() === 3 ? 5 : 4);
  allSelected = computed(() => {
    const count = this.itemCount();
    const sel = this.selections();
    for (let i = 1; i <= count; i++) {
      if (sel[`p${i}`] === undefined) return false;
    }
    return true;
  });
  // 已選幾項（給 template 用，避免直接呼叫 Object.keys）
  selectedCount = computed(() => {
    const sel = this.selections();
    let count = 0;
    for (let i = 1; i <= this.itemCount(); i++) {
      if (sel[`p${i}`] !== undefined) count++;
    }
    return count;
  });
  submittedTotal = computed(() =>
    Object.values(this.selections()).reduce((a, b) => a + b, 0)
  );
  roundLabel = computed(() => `R${this.currentRound()}-G${this.groupIndex()}`);

  readonly itemLabels = [
    '① 預擊與指定動作',
    '② 拳腳反擊',
    '③ 摔技分數',
    '④ 地板技分數',
    '⑤ 武器控制分數',
  ];
  readonly scoreOptions = [3, 2, 1, 0];

  faHourglassHalf = faHourglassHalf;
  faCheckCircle = faCheckCircle;
  faCheck = faCheck;
  faRightFromBracket = faRightFromBracket;
  faBan = faBan;

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (user?.eventId) {
      this.eventId.set(user.eventId);
      this.socket.joinEvent(user.eventId);
      this.loadEventInfo(user.eventId);
    }

    this.subs.push(
      // 賽序裁判開放評分
      this.socket.actionOpened$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        // 同步載入當前隊伍（賽事首次開放前 currentTeam 可能為 null）
        if (!this.currentTeam() || this.currentTeam()!._id !== e.teamId) {
          this.loadTeam(e.teamId);
        }
        this.currentActionNo.set(e.actionNo);
        this.currentRound.set(e.round);
        this.selections.set({});
        this.judgeState.set('scoring');
      }),

      // 換組
      this.socket.groupChanged$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.currentRound.set(e.round);
        // groupIndex 從 teams 陣列位置計算
        const idx = this.teams().findIndex((t) => t._id === e.nextTeamId);
        this.groupIndex.set(idx >= 0 ? idx + 1 : this.groupIndex() + 1);
        this.loadTeam(e.nextTeamId);
        this.judgeState.set('waiting');
        this.submittedHistory.set([]);
        this.currentActionNo.set(null);
        this.selections.set({});
      }),

      // 棄權事件
      this.socket.teamAbstained$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.judgeState.set('abstained');
      }),
      this.socket.teamAbstainCancelled$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.judgeState.set('waiting');
      }),

      // 換輪
      this.socket.roundChanged$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.currentRound.set(e.round);
        this.groupIndex.set(1);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  // ── 初始化 ────────────────────────────────────────────────────
  loadEventInfo(eventId: string): void {
    this.api.get<SummaryResponse>(`/events/${eventId}/summary`).subscribe((res) => {
      if (!res.success) return;
      const { event, teams, gameState, completedActionNos } = res.data;

      this.eventName.set(event.name);
      this.teams.set(teams);

      if (gameState?.currentTeamId) {
        this.loadTeam(gameState.currentTeamId);
        this.currentRound.set(gameState.currentRound);

        // 計算 groupIndex
        const idx = teams.findIndex((t) => t._id === gameState.currentTeamId);
        if (idx >= 0) this.groupIndex.set(idx + 1);

        // 還原已完成動作的本裁判歷史評分紀錄
        if (completedActionNos?.length > 0) {
          this.api.get<{ success: boolean; data: MyRoundScore[] }>(
            `/scores/my-round?eventId=${eventId}&teamId=${gameState.currentTeamId}&round=${gameState.currentRound}`
          ).subscribe((histRes) => {
            if (histRes.success && histRes.data.length > 0) {
              const history: ActionRecord[] = histRes.data.map((s) => ({
                actionNo: s.actionNo,
                total: Object.values(s.items).reduce((a, b) => a + b, 0),
                items: s.items,
              }));
              this.submittedHistory.set(history);
            }
          });
        }
      }

      // 若動作已開放，嘗試還原本裁判的評分狀態
      if (gameState?.currentActionOpen && gameState.currentActionNo && gameState.currentTeamId) {
        this.currentActionNo.set(gameState.currentActionNo);
        this.currentRound.set(gameState.currentRound);
        this.checkMySubmission(eventId, gameState.currentTeamId, gameState.currentRound, gameState.currentActionNo);
      }
    });
  }

  // 檢查本裁判是否已送出（頁面重整還原）
  private checkMySubmission(eventId: string, teamId: string, round: number, actionNo: string): void {
    this.api.get<{ success: boolean; data: { items: Record<string, number> } | null }>(
      `/scores/mine?eventId=${eventId}&teamId=${teamId}&round=${round}&actionNo=${actionNo}`
    ).subscribe((res) => {
      if (res.data) {
        // 已送出過：還原為「已送出」狀態
        const items = res.data.items as Record<string, number>;
        this.selections.set(items);
        this.judgeState.set('submitted');
      } else {
        // 尚未送出：進入評分狀態
        this.judgeState.set('scoring');
        this.selections.set({});
      }
    });
  }

  loadTeam(teamId: string): void {
    const cached = this.teams().find((t) => t._id === teamId);
    if (cached) {
      this.currentTeam.set(cached);
      return;
    }
    // fallback：重新從 summary 取得
    this.api.get<SummaryResponse>(`/events/${this.eventId()}/summary`).subscribe((res) => {
      const team = res.data.teams.find((t) => t._id === teamId);
      if (team) {
        this.teams.set(res.data.teams);
        this.currentTeam.set(team);
      }
    });
  }

  // ── 評分 ────────────────────────────────────────────────────
  selectScore(item: string, value: number): void {
    if (this.judgeState() !== 'scoring') return;
    this.selections.update((sel) => ({ ...sel, [item]: value }));
  }

  isSelected(item: string, value: number): boolean {
    return this.selections()[item] === value;
  }

  submitScore(): void {
    if (!this.allSelected() || this.judgeState() !== 'scoring') return;

    const payload = {
      eventId: this.eventId(),
      teamId: this.currentTeam()?._id,
      round: this.currentRound(),
      actionNo: this.currentActionNo(),
      items: this.selections(),
    };

    this.api.post<{ success: boolean }>('/scores', payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.submittedHistory.update((h) => [
            ...h,
            {
              actionNo: this.currentActionNo()!,
              total: this.submittedTotal(),
              items: { ...this.selections() },
            },
          ]);
          this.judgeState.set('submitted');
          Swal.fire({
            icon: 'success',
            title: `${this.currentActionNo()} 評分已送出`,
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
          });
        }
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: err.error?.error ?? '送出失敗',
          toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
        });
      },
    });
  }

  // ── 輔助 ────────────────────────────────────────────────────
  getActionRecord(actionNo: string): ActionRecord | undefined {
    return this.submittedHistory().find((h) => h.actionNo === actionNo);
  }

  getSeriesActions(): string[] {
    const series = this.series();
    const count = this.currentTeam()?.category === 'male' ? 4 : 3;
    return Array.from({ length: count }, (_, i) => `${series}${i + 1}`);
  }

  get judgeNo(): number {
    return this.auth.user()?.judgeNo ?? 0;
  }
}
