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

  // ── 視圖狀態 ──
  view = signal<'list' | 'scoring'>('list');
  matches = signal<Match[]>([]);
  activeMatch = signal<Match | null>(null);
  loading = signal(false);
  isFullscreen = signal(false);

  // ── 計時器邏輯獨立於 Signal 中管理 ──
  timerRunning = signal(false);
  timerRemaining = signal(180); // 3 分鐘
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // ── Contact 計分 Signals ──
  foulCount = signal<{ red: number; blue: number }>({ red: 0, blue: 0 });
  knockdownCount = signal<{ red: number; blue: number }>({ red: 0, blue: 0 });
  goldenMinuteCount = signal(0);

  // ── 黃金分鐘限制 ──
  canGoldenMinute = computed(() => this.goldenMinuteCount() < 2);

  // ── 傷停計時 ──
  redMedicalActive = signal(false);
  redMedicalRemaining = signal(120);
  blueMedicalActive = signal(false);
  blueMedicalRemaining = signal(120);
  private redMedicalInterval: ReturnType<typeof setInterval> | null = null;
  private blueMedicalInterval: ReturnType<typeof setInterval> | null = null;

  // ── 勝負判決 ──
  declaredWinner = signal<'red' | 'blue' | null>(null);

  // ── 計算屬性 ──
  eventId = computed(() => this.auth.user()?.eventId ?? '');
  contactMatches = computed(() => this.matches().filter((m) => m.matchType === 'contact'));
  groupedMatches = computed<CategoryGroup[]>(() => groupMatchesByCategory(this.contactMatches()));

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
  }

  @HostListener('document:keydown.space', ['$event'])
  onSpaceKey(event: Event): void {
    if (this.view() !== 'scoring') return;
    if (this.declaredWinner()) return;
    event.preventDefault();
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
    this.timerRunning.set(true);
    this.timerInterval = setInterval(() => {
      this.timerRemaining.update((v) => {
        if (v <= 1) {
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
          // 計時器重設為 60 秒並暫停
          this.pauseTimer();
          this.timerRemaining.set(60);
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

  declareWinner(winner: 'red' | 'blue', method: 'submission' | 'knockdown' | 'foul-dq'): void {
    const match = this.activeMatch();
    if (!match) return;

    const methodLabel = WINNER_METHOD_LABEL[method];
    const winnerLabel = winner === 'red' ? '紅方' : '藍方';

    Swal.fire({
      icon: 'question',
      title: `確認判決：${winnerLabel}${methodLabel}？`,
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
            Swal.fire({
              icon: 'success',
              title: `場次結束 — ${winnerLabel}${methodLabel}`,
              background: '#1e293b',
              color: '#fff',
              confirmButtonColor: '#3b82f6',
            }).then(() => {
              this.view.set('list');
              this.activeMatch.set(null);
            });
          },
          error: () => {
            Swal.fire({ icon: 'error', title: '結束場次失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2500 });
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
