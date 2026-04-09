import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faPlay,
  faPause,
  faGavel,
  faExpand,
  faCompress,
  faStar,
  faPersonFalling,
} from '@fortawesome/free-solid-svg-icons';

import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { Match, MatchCategory, MatchStatus } from '../../core/models/match.model';
import { CategoryGroup, groupMatchesByCategory } from '../../core/utils/match-grouping';

const CATEGORY_LABEL: Record<MatchCategory, string> = {
  male: '男子組',
  female: '女子組',
  mixed: '混合組',
};

const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: '待開始',
  'in-progress': '進行中',
  'full-ippon-pending': '進行中',
  'shido-dq-pending': '進行中',
  completed: '已完成',
};

const WINNER_METHOD_LABEL: Record<string, string> = {
  submission: '降伏勝',
  knockdown: '擊倒勝',
  'foul-dq': '犯規失格',
  'effective-attack': '有效攻擊勝',
  decision: '判定勝',
};

@Component({
  selector: 'app-contact-referee',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-referee.component.html',
})
export class ContactRefereeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private router = inject(Router);

  faPlay = faPlay;
  faPause = faPause;
  faGavel = faGavel;
  faExpand = faExpand;
  faCompress = faCompress;
  faStar = faStar;
  faPersonFalling = faPersonFalling;

  // ── 視圖狀態 ──
  view = signal<'list' | 'scoring'>('list');
  matches = signal<Match[]>([]);
  activeMatch = signal<Match | null>(null);
  loading = signal(false);
  isFullscreen = signal(false);

  // ── 批次清空 ──
  batchMode = signal(false);
  selectedIds = signal<Set<string>>(new Set());
  allSelected = computed(() =>
    this.contactMatches().length > 0 &&
    this.contactMatches().every((m) => this.selectedIds().has(m._id)),
  );

  // ── 計時器邏輯獨立於 Signal 中管理 ──
  timerRunning = signal(false);
  timerRemaining = signal(180); // 3 分鐘
  timerNaturallyEnded = signal(false); // 計時器是否自然倒數至 0（非手動操作）
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // ── Contact 計分 Signals ──
  foulCount = signal<{ red: number; blue: number }>({ red: 0, blue: 0 });
  knockdownCount = signal<{ red: number; blue: number }>({ red: 0, blue: 0 });
  goldenMinuteCount = signal(0);

  // ── 黃金分鐘限制：次數未達上限且計時器已自然結束 ──
  canGoldenMinute = computed(() => this.goldenMinuteCount() < 2 && this.timerNaturallyEnded());

  // ── 有效攻擊勝：只在黃金分鐘加時期間可用 ──
  canEffectiveAttackWin = computed(() => this.goldenMinuteCount() > 0);

  // ── 傷停計時 ──
  redMedicalActive = signal(false);
  redMedicalRemaining = signal(120);
  blueMedicalActive = signal(false);
  blueMedicalRemaining = signal(120);
  private redMedicalInterval: ReturnType<typeof setInterval> | null = null;
  private blueMedicalInterval: ReturnType<typeof setInterval> | null = null;

  // ── 勝負判決 ──
  declaredWinner = signal<'red' | 'blue' | null>(null);

  // ── 排序模式 ──
  sortMode = signal<'weight' | 'order'>('order');

  // ── 計算屬性 ──
  eventId = computed(() => this.auth.user()?.eventId ?? '');
  contactMatches = computed(() => this.matches().filter((m) => m.matchType === 'contact'));
  groupedMatches = computed<CategoryGroup[]>(() => groupMatchesByCategory(this.contactMatches()));
  sortedByOrder = computed(() =>
    [...this.contactMatches()].sort((a, b) => a.scheduledOrder - b.scheduledOrder),
  );

  displayTimer = computed(() => {
    const s = this.timerRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  displayRedMedical = computed(() => {
    const s = this.redMedicalRemaining();
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  });

  displayBlueMedical = computed(() => {
    const s = this.blueMedicalRemaining();
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  });

  CATEGORY_LABEL = CATEGORY_LABEL;
  STATUS_LABEL = STATUS_LABEL;
  WINNER_METHOD_LABEL = WINNER_METHOD_LABEL;

  private subs = new Subscription();

  ngOnInit(): void {
    const eid = this.eventId();
    if (eid) {
      this.socket.joinEvent(eid);
      this.loadMatches();
    }

    // 裁判端也訂閱 socket，保持多裝置同步
    this.subs.add(
      this.socket.contactFoulUpdated$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.foulCount.set(e.foulCount);
      }),
    );
    this.subs.add(
      this.socket.contactKnockdownUpdated$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.knockdownCount.set(e.knockdownCount);
      }),
    );
  }

  @HostListener('document:keydown.space', ['$event'])
  onSpaceKey(event: Event): void {
    if (this.view() !== 'scoring') return;
    if (this.declaredWinner()) return;
    event.preventDefault();

    // 傷停中：停止所有傷停計時，恢復主計時器
    if (this.redMedicalActive() || this.blueMedicalActive()) {
      const match = this.activeMatch();
      if (this.redMedicalActive()) {
        this.clearRedMedicalInterval();
        this.redMedicalActive.set(false);
        if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, 'red');
      }
      if (this.blueMedicalActive()) {
        this.clearBlueMedicalInterval();
        this.blueMedicalActive.set(false);
        if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, 'blue');
      }
      this.startTimer();
      return;
    }

    if (this.timerRunning()) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  ngOnDestroy(): void {
    this.clearTimerInterval();
    this.clearRedMedicalInterval();
    this.clearBlueMedicalInterval();
    this.subs.unsubscribe();
    const eid = this.eventId();
    if (eid) this.socket.leaveEvent(eid);
  }

  // ──────────────────────────────────────────────────────────
  // LIST VIEW
  // ──────────────────────────────────────────────────────────

  loadMatches(): void {
    const eid = this.eventId();
    if (!eid) return;
    this.loading.set(true);
    this.api
      .get<{ success: boolean; data: Match[] }>(`/events/${eid}/matches`)
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.matches.set(res.data.filter((m) => m.matchType === 'contact'));
        },
        error: () => {
          this.loading.set(false);
          Swal.fire({ icon: 'error', title: '無法載入賽程', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        },
      });
  }

  selectMatch(match: Match): void {
    if (match.status === 'completed') return;

    const startScoring = (m: Match) => {
      this.activeMatch.set(m);
      this.resetScoringState();
      this.restoreContactState(m);
      this.view.set('scoring');
    };

    if (match.status !== 'pending') {
      this.api
        .get<{ success: boolean; data: Match[] }>(`/events/${this.eventId()}/matches?matchType=contact`)
        .subscribe({
          next: (res) => {
            const fresh = res.data.find((m) => String(m._id) === String(match._id)) ?? match;
            startScoring(fresh);
            this.socket.emitMatchStarted(this.eventId(), fresh._id);
          },
          error: () => {
            startScoring(match);
            this.socket.emitMatchStarted(this.eventId(), match._id);
          },
        });
      return;
    }

    this.api
      .patch<{ success: boolean; data: Match }>(
        `/events/${this.eventId()}/matches/${match._id}`,
        { status: 'in-progress' },
      )
      .subscribe({
        next: (res) => {
          this.matches.update((ms) => ms.map((m) => (m._id === res.data._id ? res.data : m)));
          startScoring(res.data);
          this.socket.emitMatchStarted(this.eventId(), res.data._id);
        },
        error: () => {
          Swal.fire({ icon: 'error', title: '無法開始場次', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
        },
      });
  }

  private restoreContactState(match: Match): void {
    this.foulCount.set({ red: match.foulCount?.red ?? 0, blue: match.foulCount?.blue ?? 0 });
    this.knockdownCount.set({ red: match.knockdownCount?.red ?? 0, blue: match.knockdownCount?.blue ?? 0 });
    this.goldenMinuteCount.set(match.goldenMinuteCount ?? 0);
  }

  // ──────────────────────────────────────────────────────────
  // 計時器（計時器邏輯獨立於 Signal 中管理）
  // ──────────────────────────────────────────────────────────

  startTimer(): void {
    if (this.timerRemaining() <= 0) return;
    this.clearTimerInterval(); // 防止重複呼叫洩漏舊 interval
    this.timerNaturallyEnded.set(false);
    this.timerRunning.set(true);
    this.timerInterval = setInterval(() => {
      this.timerRemaining.update((v) => {
        if (v <= 1) {
          this.timerNaturallyEnded.set(true);
          this.pauseTimer();
          return 0;
        }
        return v - 1;
      });
      const m = this.activeMatch();
      if (m) {
        this.socket.emitMatchTimerUpdated(this.eventId(), m._id, this.timerRemaining(), false);
      }
    }, 1000);
  }

  pauseTimer(): void {
    this.timerRunning.set(false);
    this.clearTimerInterval();
    const m = this.activeMatch();
    if (m) {
      this.socket.emitMatchTimerUpdated(this.eventId(), m._id, this.timerRemaining(), true);
    }
  }

  adjustTimer(delta: number): void {
    if (this.timerRunning()) return;
    this.timerNaturallyEnded.set(false);
    this.timerRemaining.update((v) => Math.max(0, v + delta));
  }

  private clearTimerInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 黃金分鐘
  // ──────────────────────────────────────────────────────────

  triggerGoldenMinute(): void {
    if (!this.canGoldenMinute()) return;
    const match = this.activeMatch();
    if (!match) return;

    this.api
      .patch<{ success: boolean; data: { goldenMinuteCount: number } }>('/contact/action', {
        matchId: match._id,
        action: 'goldenMinute',
      })
      .subscribe({
        next: (res) => {
          this.goldenMinuteCount.set(res.data.goldenMinuteCount);
          // 計時器重設為 60 秒並暫停，重置自然結束旗標
          this.pauseTimer();
          this.timerRemaining.set(60);
          this.timerNaturallyEnded.set(false);
          this.socket.emitMatchTimerUpdated(this.eventId(), match._id, 60, true);
        },
        error: () => {
          Swal.fire({ icon: 'error', title: '黃金分鐘操作失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        },
      });
  }

  // ──────────────────────────────────────────────────────────
  // 犯規牌 / 擊倒牌
  // ──────────────────────────────────────────────────────────

  callFoul(side: 'red' | 'blue', delta: 1 | -1): void {
    const match = this.activeMatch();
    if (!match) return;

    // 第三次犯規 → 建議對方勝，等裁判最後裁定
    if (delta === 1 && this.foulCount()[side] >= 2) {
      const oppSide: 'red' | 'blue' = side === 'red' ? 'blue' : 'red';
      this.declareWinner(oppSide, 'foul-dq');
      return;
    }

    // Optimistic update
    this.foulCount.update((c) => ({
      ...c,
      [side]: Math.max(0, c[side] + delta),
    }));

    this.api
      .patch<{ success: boolean; data: { foulCount: { red: number; blue: number } } }>('/contact/action', {
        matchId: match._id,
        action: 'foul',
        side,
        delta,
      })
      .subscribe({
        next: (res) => this.foulCount.set(res.data.foulCount),
        error: () => {
          // Revert optimistic update
          this.foulCount.update((c) => ({ ...c, [side]: Math.max(0, c[side] - delta) }));
          Swal.fire({ icon: 'error', title: '犯規操作失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        },
      });
  }

  callKnockdown(side: 'red' | 'blue', delta: 1 | -1): void {
    const match = this.activeMatch();
    if (!match) return;

    // 已達 2 次上限，第三次提醒裁判考慮宣告勝負
    if (delta === 1 && this.knockdownCount()[side] >= 2) {
      const sideName = side === 'red' ? '藍方' : '紅方';
      Swal.fire({
        icon: 'warning',
        title: '擊倒已達上限',
        text: `${sideName}已倒地 2 次，請裁判考慮宣告 TKO 勝負。`,
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#f59e0b',
        confirmButtonText: '知道了',
      });
      return;
    }

    // Optimistic update
    this.knockdownCount.update((c) => ({
      ...c,
      [side]: Math.max(0, c[side] + delta),
    }));

    this.api
      .patch<{ success: boolean; data: { knockdownCount: { red: number; blue: number } } }>('/contact/action', {
        matchId: match._id,
        action: 'knockdown',
        side,
        delta,
      })
      .subscribe({
        next: (res) => this.knockdownCount.set(res.data.knockdownCount),
        error: () => {
          this.knockdownCount.update((c) => ({ ...c, [side]: Math.max(0, c[side] - delta) }));
          Swal.fire({ icon: 'error', title: '擊倒操作失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        },
      });
  }

  // ──────────────────────────────────────────────────────────
  // 傷停
  // ──────────────────────────────────────────────────────────

  toggleMedical(side: 'red' | 'blue'): void {
    const match = this.activeMatch();
    if (side === 'red') {
      if (this.redMedicalActive()) {
        this.clearRedMedicalInterval();
        this.redMedicalActive.set(false);
        if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, 'red');
        if (!this.blueMedicalActive()) this.startTimer();
      } else {
        if (this.redMedicalRemaining() <= 0) return;
        this.startMedical('red');
      }
    } else {
      if (this.blueMedicalActive()) {
        this.clearBlueMedicalInterval();
        this.blueMedicalActive.set(false);
        if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, 'blue');
        if (!this.redMedicalActive()) this.startTimer();
      } else {
        if (this.blueMedicalRemaining() <= 0) return;
        this.startMedical('blue');
      }
    }
  }

  private startMedical(side: 'red' | 'blue'): void {
    const match = this.activeMatch();
    this.pauseTimer();
    if (side === 'red') {
      this.redMedicalActive.set(true);
      if (match) this.socket.emitInjuryStarted(this.eventId(), match._id, 'red', this.redMedicalRemaining());
      this.redMedicalInterval = setInterval(() => {
        const newVal = Math.max(0, this.redMedicalRemaining() - 1);
        this.redMedicalRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearRedMedicalInterval();
          this.redMedicalActive.set(false);
          if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, 'red');
          if (!this.blueMedicalActive()) this.startTimer();
        }
      }, 1000);
    } else {
      this.blueMedicalActive.set(true);
      if (match) this.socket.emitInjuryStarted(this.eventId(), match._id, 'blue', this.blueMedicalRemaining());
      this.blueMedicalInterval = setInterval(() => {
        const newVal = Math.max(0, this.blueMedicalRemaining() - 1);
        this.blueMedicalRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearBlueMedicalInterval();
          this.blueMedicalActive.set(false);
          if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, 'blue');
          if (!this.redMedicalActive()) this.startTimer();
        }
      }, 1000);
    }
  }

  private clearRedMedicalInterval(): void {
    if (this.redMedicalInterval) { clearInterval(this.redMedicalInterval); this.redMedicalInterval = null; }
  }

  private clearBlueMedicalInterval(): void {
    if (this.blueMedicalInterval) { clearInterval(this.blueMedicalInterval); this.blueMedicalInterval = null; }
  }

  // ──────────────────────────────────────────────────────────
  // 勝負宣告
  // ──────────────────────────────────────────────────────────

  declareWinner(winner: 'red' | 'blue', method: 'submission' | 'knockdown' | 'foul-dq' | 'effective-attack' | 'decision'): void {
    const match = this.activeMatch();
    if (!match) return;

    const methodLabel = WINNER_METHOD_LABEL[method];
    const winnerLabel = winner === 'red' ? '紅方' : '藍方';
    const loserLabel = winner === 'red' ? '藍方' : '紅方';
    const confirmTitle = method === 'foul-dq'
      ? `確認判決：${winnerLabel}勝 — ${loserLabel}犯規失格？`
      : method === 'effective-attack'
        ? `確認判決：${winnerLabel}有效攻擊勝？`
        : `確認判決：${winnerLabel}${methodLabel}？`;

    Swal.fire({
      icon: 'question',
      title: confirmTitle,
      showCancelButton: true,
      confirmButtonText: '確認',
      cancelButtonText: '取消',
      background: '#1e293b',
      color: '#fff',
      confirmButtonColor: winner === 'red' ? '#ef4444' : '#3b82f6',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.pauseTimer();
      this.api
        .patch<{ success: boolean }>('/contact/winner', {
          matchId: match._id,
          winner,
          method,
        })
        .subscribe({
          next: () => {
            this.declaredWinner.set(winner);
            this.matches.update((ms) =>
              ms.map((m) => (m._id === match._id ? { ...m, status: 'completed' as const, result: { winner, method: method === 'foul-dq' ? 'dq' : method } as any } : m)),
            );
          },
          error: () => {
            Swal.fire({ icon: 'error', title: '結束場次失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
          },
        });
    });
  }

  // ──────────────────────────────────────────────────────────
  // 宣勝後操作
  // ──────────────────────────────────────────────────────────

  endMatch(): void {
    this.activeMatch.set(null);
    this.view.set('list');
  }

  goNextMatch(): void {
    const current = this.activeMatch();
    const next = this.contactMatches().find(
      (m) => m.status === 'pending' && (!current || m._id !== current._id),
    );
    if (!next) {
      Swal.fire({ icon: 'info', title: '已無待開始的場次', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    this.selectMatch(next);
  }

  cancelWinner(): void {
    const match = this.activeMatch();
    if (!match) return;

    Swal.fire({
      icon: 'warning',
      title: '確認取消勝負宣告？',
      text: '場次將恢復為進行中狀態。',
      showCancelButton: true,
      confirmButtonText: '確認取消',
      cancelButtonText: '返回',
      background: '#1e293b',
      color: '#fff',
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.api
        .patch<{ success: boolean }>('/contact/cancel-winner', { matchId: match._id })
        .subscribe({
          next: () => {
            this.declaredWinner.set(null);
            this.matches.update((ms) =>
              ms.map((m) => (m._id === match._id ? { ...m, status: 'in-progress' as const, result: undefined as any } : m)),
            );
          },
          error: () => {
            Swal.fire({ icon: 'error', title: '取消失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
          },
        });
    });
  }

  // ──────────────────────────────────────────────────────────
  // 歸零重置
  // ──────────────────────────────────────────────────────────

  resetAllCounts(): void {
    const match = this.activeMatch();
    if (!match) return;

    Swal.fire({
      icon: 'warning',
      title: '確認歸零所有計數？',
      text: '犯規牌、擊倒牌、黃金分鐘次數將全部重設為 0。',
      showCancelButton: true,
      confirmButtonText: '確認歸零',
      cancelButtonText: '取消',
      background: '#1e293b',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.api
        .patch<{ success: boolean }>('/contact/action', {
          matchId: match._id,
          action: 'reset',
        })
        .subscribe({
          next: () => {
            this.resetScoringState();
          },
          error: () => {
            Swal.fire({ icon: 'error', title: '歸零失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
          },
        });
    });
  }

  // ──────────────────────────────────────────────────────────
  // 導航
  // ──────────────────────────────────────────────────────────

  backToList(): void {
    if (this.timerRunning()) {
      Swal.fire({
        icon: 'warning',
        title: '計時器仍在運行',
        text: '確定要離開計分畫面？計時器將暫停。',
        showCancelButton: true,
        confirmButtonText: '離開',
        cancelButtonText: '取消',
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
      }).then((result) => {
        if (result.isConfirmed) {
          this.pauseTimer();
          this.activeMatch.set(null);
          this.view.set('list');
        }
      });
      return;
    }
    this.activeMatch.set(null);
    this.view.set('list');
  }

  backToSportSelect(): void {
    this.router.navigate(['/referee']);
  }

  // ──────────────────────────────────────────────────────────
  // 批次清空
  // ──────────────────────────────────────────────────────────

  toggleBatchMode(): void {
    this.batchMode.update((v) => !v);
    this.selectedIds.set(new Set());
  }

  toggleSelect(matchId: string): void {
    this.selectedIds.update((s) => {
      const next = new Set(s);
      next.has(matchId) ? next.delete(matchId) : next.add(matchId);
      return next;
    });
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.contactMatches().map((m) => m._id)));
    }
  }

  confirmBatchReset(): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;

    Swal.fire({
      icon: 'warning',
      title: `確認清空 ${ids.length} 場次的成績？`,
      text: '所有計數將歸零，場次恢復為待開始。',
      showCancelButton: true,
      confirmButtonText: '確認清空',
      cancelButtonText: '取消',
      background: '#1e293b',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const eid = this.eventId();
      this.api
        .patch<{ success: boolean }>(`/events/${eid}/matches/batch-reset`, { matchIds: ids })
        .subscribe({
          next: () => {
            this.batchMode.set(false);
            this.selectedIds.set(new Set());
            this.loadMatches();
          },
          error: () => {
            Swal.fire({ icon: 'error', title: '清空失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
          },
        });
    });
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

  private resetScoringState(): void {
    this.timerRemaining.set(180);
    this.timerRunning.set(false);
    this.timerNaturallyEnded.set(false);
    this.clearTimerInterval();
    this.foulCount.set({ red: 0, blue: 0 });
    this.knockdownCount.set({ red: 0, blue: 0 });
    this.goldenMinuteCount.set(0);
    this.declaredWinner.set(null);
    this.clearRedMedicalInterval();
    this.clearBlueMedicalInterval();
    this.redMedicalActive.set(false);
    this.blueMedicalActive.set(false);
    this.redMedicalRemaining.set(120);
    this.blueMedicalRemaining.set(120);
  }

  cardRange(count: number): number[] {
    return Array.from({ length: Math.min(count, 2) }, (_, i) => i);
  }
}
