import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import { SocketService } from '../../core/services/socket.service';
import { ApiService } from '../../core/services/api.service';

interface RankEntry {
  rank: number;
  teamId: string;
  name: string;
  category: string;
  finalScore: number;
  technicalTotal: number;
  artisticTotal: number;
  grandTotal: number;
  penaltyDeduction: number;
}

// 合規時間：90–120 秒
const MIN_MS = 90_000;
const MAX_MS = 120_000;

const PENALTY_LABEL: Record<string, string> = {
  overtime: '超時',
  undertime: '未達時間',
  props: '使用道具',
  attacks: '實際攻防',
};

@Component({
  selector: 'app-creative-audience',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './creative-audience.component.html',
})
export class CreativeAudienceComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private socket = inject(SocketService);
  private api = inject(ApiService);

  eventId = signal('');
  eventName = signal('');
  isFullscreen = signal(false);

  // 計時器
  timerRunning = signal(false);
  elapsedMs = signal(0);
  localStartMs = signal<number | null>(null);
  timerFinished = signal(false);
  finalElapsedMs = signal<number | null>(null);

  displayMs = computed(() => {
    if (this.timerFinished() && this.finalElapsedMs() !== null) {
      return this.finalElapsedMs()!;
    }
    const base = this.elapsedMs();
    const start = this.localStartMs();
    if (this.timerRunning() && start !== null) {
      return base + (Date.now() - start);
    }
    return base;
  });

  displayTime = computed(() => {
    const ms = this.displayMs();
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  timerColor = computed(() => {
    const ms = this.displayMs();
    if (ms === 0) return 'white';
    if (ms < MIN_MS) return 'yellow';
    if (ms <= MAX_MS) return 'green';
    return 'red';
  });

  // 違例
  currentPenalties = signal<string[]>([]);
  penaltyDeduction = signal(0);

  // 計分結果
  calculatedResult = signal<{
    technicalTotal: number;
    artisticTotal: number;
    grandTotal: number;
    penaltyDeduction: number;
    finalScore: number;
  } | null>(null);

  // 排名
  myRank = signal<{ rank: number; total: number } | null>(null);

  currentTeamId = signal<string | null>(null);
  currentTeamName = signal<string>('');

  readonly penaltyLabel = PENALTY_LABEL;
  faExpand = faExpand;
  faCompress = faCompress;

  private subs = new Subscription();
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('eventId') ?? '';
    this.eventId.set(id);
    if (id) {
      this.socket.joinEvent(id);
      this.loadEventName(id);
      this.loadState(id);
    }

    this.subs.add(
      this.socket.creativeScoringOpened$.subscribe((evt) => {
        if (evt.eventId !== this.eventId()) return;
        this.currentTeamId.set(evt.teamId);
        this.currentTeamName.set(evt.teamName);
        this.timerFinished.set(false);
        this.finalElapsedMs.set(null);
        this.elapsedMs.set(0);
        this.localStartMs.set(null);
        this.calculatedResult.set(null);
        this.myRank.set(null);
        this.stopLocalInterval();
        this.timerRunning.set(false);
      })
    );

    this.subs.add(
      this.socket.timerStarted$.subscribe((evt) => {
        if (evt.eventId !== this.eventId()) return;
        this.timerFinished.set(false);
        this.finalElapsedMs.set(null);
        this.localStartMs.set(new Date(evt.timerStartedAt).getTime());
        this.timerRunning.set(true);
        this.startLocalInterval();
      })
    );

    this.subs.add(
      this.socket.timerStopped$.subscribe((evt) => {
        if (evt.eventId !== this.eventId()) return;
        this.stopLocalInterval();
        this.timerRunning.set(false);
        this.timerFinished.set(true);
        this.finalElapsedMs.set(evt.elapsedMs);
      })
    );

    this.subs.add(
      this.socket.penaltyUpdated$.subscribe((evt) => {
        if (evt.eventId !== this.eventId()) return;
        this.currentPenalties.set(evt.penalties);
        this.penaltyDeduction.set(evt.penaltyDeduction);
      })
    );

    this.subs.add(
      this.socket.creativeScoreCalculated$.subscribe((evt) => {
        if (evt.eventId !== this.eventId()) return;
        this.calculatedResult.set({
          technicalTotal: evt.technicalTotal,
          artisticTotal: evt.artisticTotal,
          grandTotal: evt.grandTotal,
          penaltyDeduction: evt.penaltyDeduction,
          finalScore: evt.finalScore,
        });
        // 載入排名
        this.loadRanking(this.eventId(), evt.teamId);
      })
    );

    this.subs.add(
      this.socket.creativeTeamChanged$.subscribe((evt) => {
        if (evt.eventId !== this.eventId()) return;
        this.resetState();
      })
    );
  }

  ngOnDestroy(): void {
    this.stopLocalInterval();
    const id = this.eventId();
    if (id) this.socket.leaveEvent(id);
    this.subs.unsubscribe();
  }

  loadEventName(eventId: string): void {
    this.api.get<{ success: boolean; data: { name: string } }>(`/events/${eventId}`).subscribe({
      next: (res) => this.eventName.set(res.data?.name ?? ''),
      error: () => {},
    });
  }

  loadState(eventId: string): void {
    this.api.get<{ success: boolean; data: { currentTeamId?: string; status: string; timerElapsedMs?: number; timerStartedAt?: string } }>(
      `/creative/flow/state/${eventId}`
    ).subscribe({
      next: (res) => {
        const s = res.data;
        if (s.timerElapsedMs !== undefined) this.elapsedMs.set(s.timerElapsedMs);
        if (s.status === 'timer_running' && s.timerStartedAt) {
          this.localStartMs.set(new Date(s.timerStartedAt).getTime());
          this.timerRunning.set(true);
          this.startLocalInterval();
        }
      },
      error: () => {},
    });
  }

  loadRanking(eventId: string, teamId: string): void {
    this.api.get<{ success: boolean; data: RankEntry[] }>(`/events/${eventId}/creative-rankings`).subscribe({
      next: (res) => {
        const entries = res.data ?? [];
        const entry = entries.find(e => e.teamId === teamId);
        const sameCategory = entries.filter(e =>
          entry ? e.category === entry.category : false
        );
        if (entry) {
          this.myRank.set({ rank: entry.rank, total: sameCategory.length });
        }
      },
      error: () => {},
    });
  }

  private startLocalInterval(): void {
    this.stopLocalInterval();
    this.timerInterval = setInterval(() => {
      this.elapsedMs.update(v => v);
    }, 200);
  }

  private stopLocalInterval(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  private resetState(): void {
    this.stopLocalInterval();
    this.timerRunning.set(false);
    this.timerFinished.set(false);
    this.elapsedMs.set(0);
    this.localStartMs.set(null);
    this.finalElapsedMs.set(null);
    this.currentPenalties.set([]);
    this.penaltyDeduction.set(0);
    this.calculatedResult.set(null);
    this.myRank.set(null);
    this.currentTeamId.set(null);
    this.currentTeamName.set('');
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

  getPenaltyLabel(type: string): string {
    return this.penaltyLabel[type] ?? type;
  }
}
