import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faPlay, faStop, faCheck, faForward, faRightFromBracket, faExpand, faCompress,
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { Router } from '@angular/router';

type PenaltyType = 'overtime' | 'undertime' | 'props' | 'attacks';

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
}

interface CreativeStateData {
  currentTeamId?: string;
  status: string;
  timerStartedAt?: string;
  timerStoppedAt?: string;
  timerElapsedMs?: number;
}

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

  // 計時器
  timerRunning = signal(false);
  elapsedMs = signal(0);          // 已累積毫秒（含之前暫停）
  localStartMs = signal<number | null>(null);  // Date.now() when started
  displayMs = computed(() => {
    const base = this.elapsedMs();
    const start = this.localStartMs();
    if (this.timerRunning() && start !== null) {
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
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  // 違例
  selectedPenalties = signal<Set<PenaltyType>>(new Set());
  readonly allPenalties = ALL_PENALTIES;
  readonly penaltyLabels = PENALTY_LABELS;

  // 賽事狀態
  scoringOpen = signal(false);
  submittedCount = signal(0);

  faPlay = faPlay;
  faStop = faStop;
  faCheck = faCheck;
  faForward = faForward;
  faRightFromBracket = faRightFromBracket;
  faExpand = faExpand;
  faCompress = faCompress;

  private subs = new Subscription();
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  get eventId(): string { return this.auth.user()?.eventId ?? ''; }

  ngOnInit(): void {
    if (!this.eventId) { this.router.navigate(['/login']); return; }
    this.socket.joinEvent(this.eventId);
    this.loadTeams();
    this.loadState();

    // 計時器廣播：同步其他裁判螢幕
    this.subs.add(
      this.socket.timerStarted$.subscribe((evt) => {
        if (evt.eventId !== this.eventId) return;
        this.localStartMs.set(new Date(evt.timerStartedAt).getTime());
        this.timerRunning.set(true);
        this.startLocalInterval();
      })
    );

    this.subs.add(
      this.socket.timerStopped$.subscribe((evt) => {
        if (evt.eventId !== this.eventId) return;
        this.stopLocalInterval();
        this.elapsedMs.set(evt.elapsedMs);
        this.localStartMs.set(null);
        this.timerRunning.set(false);
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
        if (evt.nextTeamId) {
          const next = this.teams().find(t => t._id === evt.nextTeamId) ?? null;
          this.currentTeam.set(next);
        }
      })
    );

    // 計分提交計數
    this.subs.add(
      this.socket.creativeScoreCalculated$.subscribe((evt) => {
        if (evt.eventId !== this.eventId) return;
        this.submittedCount.update(n => n + 1);
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
      this.toggleTimer();
    }
  }

  loadTeams(): void {
    this.api.get<{ success: boolean; data: TeamItem[] }>(`/events/${this.eventId}/teams`).subscribe({
      next: (res) => this.teams.set(res.data ?? []),
      error: () => console.error('無法載入隊伍'),
    });
  }

  loadState(): void {
    this.api.get<{ success: boolean; data: CreativeStateData }>(`/creative/flow/state/${this.eventId}`)
      .subscribe({
        next: (res) => {
          const state = res.data;
          if (state.currentTeamId) {
            const team = this.teams().find(t => t._id === state.currentTeamId) ?? null;
            this.currentTeam.set(team);
          }
          if (state.timerElapsedMs !== undefined) {
            this.elapsedMs.set(state.timerElapsedMs);
          }
          if (state.status === 'timer_running' && state.timerStartedAt) {
            const start = new Date(state.timerStartedAt).getTime();
            this.localStartMs.set(start);
            this.timerRunning.set(true);
            this.startLocalInterval();
          }
          this.scoringOpen.set(state.status === 'scoring_open');
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
  }

  toggleTimer(): void {
    if (!this.currentTeam()) return;
    if (this.timerRunning()) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer(): void {
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/start-timer', { eventId: this.eventId }).subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '計時器啟動失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  stopTimer(): void {
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/stop-timer', { eventId: this.eventId }).subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '計時器停止失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
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
      penaltyTypes: types,
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
        Swal.fire({ icon: 'success', title: '已開放評分', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      },
      error: (err) => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: err?.error?.message ?? '開放評分失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  confirmScores(): void {
    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative/flow/confirm-scores', { eventId: this.eventId }).subscribe({
      next: () => {
        this.loading.set(false);
        this.scoringOpen.set(false);
        Swal.fire({ icon: 'success', title: '收分完成', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
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
    this.api.post<{ success: boolean }>('/creative/flow/next-team', { eventId: this.eventId }).subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '下一組失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  private startLocalInterval(): void {
    this.stopLocalInterval();
    this.timerInterval = setInterval(() => {
      // 強制 OnPush 重新計算 displayMs（觸發 signal 讀取）
      this.elapsedMs.update(v => v);
    }, 200);
  }

  private stopLocalInterval(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  private resetTimerState(): void {
    this.stopLocalInterval();
    this.timerRunning.set(false);
    this.elapsedMs.set(0);
    this.localStartMs.set(null);
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
}
