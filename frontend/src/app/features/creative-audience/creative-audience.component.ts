import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExpand, faCompress, faArrowsRotate, faCheck, faClock, faTriangleExclamation, faGavel } from '@fortawesome/free-solid-svg-icons';
import { SocketService, CreativePenaltyItem, CreativeTeamAbstainedEvent } from '../../core/services/socket.service';
import { ApiService } from '../../core/services/api.service';
import {
  ParticipantBadgeComponent,
  MemberStatus,
  deriveTeamBadgeMember,
} from '../../shared/participant-badge.component';

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

const CATEGORY_LABEL: Record<string, string> = { male: '男子組', female: '女子組', mixed: '混合組' };

type TeamTier = 'EL' | 'EM' | 'EH' | 'JH' | 'SH' | 'OPEN' | 'ELEM' | null;
const TIER_LABEL: Record<string, string> = {
  EL: '國小低年級',
  EM: '國小中年級',
  EH: '國小高年級',
  JH: '青少年國中組',
  SH: '青少年高中組',
  OPEN: '公開組',
  ELEM: '國小組',
};

@Component({
  selector: 'app-creative-audience',
  standalone: true,
  imports: [CommonModule, FaIconComponent, ParticipantBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './creative-audience.component.html',
})
export class CreativeAudienceComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private socket = inject(SocketService);
  private api = inject(ApiService);

  eventId = signal('');
  eventName = signal('');
  eventCompetitionTypes = signal<('Duo' | 'Show')[]>([]);
  isFullscreen = signal(false);

  hasMultipleTypes = computed(() => this.eventCompetitionTypes().length > 1);

  // 計時器
  timerRunning = signal(false);
  elapsedMs = signal(0);
  localStartMs = signal<number | null>(null);
  timerFinished = signal(false);
  finalElapsedMs = signal<number | null>(null);
  private tick = signal(0); // 每 200ms 遞增，強制 displayMs 重算

  displayMs = computed(() => {
    this.tick(); // 訂閱 tick，確保 OnPush 下每 200ms 重算
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
    penalties: CreativePenaltyItem[];
  } | null>(null);

  // 排名
  myRank = signal<{ rank: number; total: number } | null>(null);

  isAbstained = signal(false);
  currentTeamId = signal<string | null>(null);
  currentTeamName = signal<string>('');
  currentMembers = signal<string[]>([]);
  currentCategory = signal<string>('');
  currentTier = signal<TeamTier>(null);
  // 參賽者狀態 lookup（key = teamId）
  // teamCheckedIn = members 全部 present 為 true，任一非 present 即 false
  private teamCheckInMap = signal<Map<string, boolean>>(new Map());

  // 演武 team-level 徽章：以 derived 表示「整隊是否完成檢錄」。
  // 任一成員 absent → 整隊「檢錄未到」；無資料時不顯示徽章（return null）。
  teamBadgeMember = computed<MemberStatus | null>(() => {
    const id = this.currentTeamId();
    if (!id) return null;
    return deriveTeamBadgeMember(this.teamCheckInMap().get(id));
  });
  currentCategoryLabel = computed(() => {
    const cat = CATEGORY_LABEL[this.currentCategory()] ?? this.currentCategory();
    const tier = this.currentTier();
    if (!tier) return cat;
    return `${cat} ｜ ${TIER_LABEL[tier] ?? tier}`;
  });

  readonly penaltyLabel = PENALTY_LABEL;
  faExpand = faExpand;
  faCompress = faCompress;
  faArrowsRotate = faArrowsRotate;
  faCheck = faCheck;
  faClock = faClock;
  faTriangleExclamation = faTriangleExclamation;
  faGavel = faGavel;

  private subs = new Subscription();
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('eventId') ?? '';
    this.eventId.set(id);
    if (id) {
      this.socket.joinEvent(id);
      this.loadEventName(id);
      this.loadState(id);
      this.loadTeamCheckInMap(id);
    }

    this.subs.add(
      this.socket.participantStatusChanged$.subscribe(() => {
        // 任一成員狀態變更 → 重抓 team-level 結果（成本低、結構單純）
        const eid = this.eventId();
        if (eid) this.loadTeamCheckInMap(eid);
      }),
    );

    this.subs.add(
      this.socket.creativeScoringOpened$.subscribe((evt) => {
        if (evt.eventId !== this.eventId()) return;
        this.currentTeamId.set(evt.teamId);
        this.currentTeamName.set(evt.teamName);
        this.currentMembers.set(evt.members ?? []);
        this.currentCategory.set(evt.category ?? '');
        this.currentTier.set((evt.tier ?? null) as TeamTier);
        // 不重置計時器：計時狀態由 timerStarted$/timerStopped$ 管理
        // 開放評分時保留已停止的計時結果供觀眾查看
        this.calculatedResult.set(null);
        this.myRank.set(null);
      })
    );

    this.subs.add(
      this.socket.timerStarted$.subscribe((evt) => {
        if (evt.eventId !== this.eventId()) return;
        if (evt.teamName) this.currentTeamName.set(evt.teamName);
        if (evt.members) this.currentMembers.set(evt.members);
        if (evt.category) this.currentCategory.set(evt.category);
        this.timerFinished.set(false);
        this.finalElapsedMs.set(null);
        this.elapsedMs.set(evt.elapsedMs ?? 0);
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
          penalties: evt.penalties ?? [],
        });
        // 載入排名
        this.loadRanking(this.eventId(), evt.teamId);
      })
    );

    this.subs.add(
      this.socket.creativeTeamChanged$.subscribe((evt) => {
        if (evt.eventId !== this.eventId()) return;
        this.resetState();
        if (evt.nextTeamId) {
          // Sync state to get new team details
          this.loadState(this.eventId());
        }
      })
    );

    this.subs.add(
      this.socket.creativeTeamAbstained$.subscribe((evt: CreativeTeamAbstainedEvent) => {
        if (evt.eventId !== this.eventId()) return;
        this.isAbstained.set(true);
      })
    );

    this.subs.add(
      this.socket.creativeTeamAbstainCancelled$.subscribe((evt: CreativeTeamAbstainedEvent) => {
        if (evt.eventId !== this.eventId()) return;
        this.isAbstained.set(false);
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
    this.api.get<{ success: boolean; data: { name: string; competitionTypes?: ('Duo' | 'Show')[] } }>(`/events/${eventId}`).subscribe({
      next: (res) => {
        this.eventName.set(res.data?.name ?? '');
        this.eventCompetitionTypes.set(res.data?.competitionTypes ?? ['Show']);
      },
      error: () => {},
    });
  }

  switchToDuo(): void {
    this.router.navigate(['/audience'], { queryParams: { eventId: this.eventId() } });
  }

  private loadTeamCheckInMap(eventId: string): void {
    interface TeamDto { teamId: string; teamCheckedIn: boolean }
    this.api
      .get<{ success: boolean; data: TeamDto[] }>(`/events/${eventId}/participants`)
      .subscribe({
        next: (res) => {
          const map = new Map<string, boolean>();
          for (const t of res.data ?? []) {
            map.set(t.teamId, t.teamCheckedIn);
          }
          this.teamCheckInMap.set(map);
        },
        error: () => {},
      });
  }

loadState(eventId: string): void {
  this.api.get<{
    success: boolean;
    data: {
      currentTeamId?: string;
      currentTeamName?: string;
      currentMembers?: string[];
      currentCategory?: string;
      currentTier?: TeamTier;
      status: string;
      timerElapsedMs?: number;
      timerStartedAt?: string;
      isAbstained?: boolean;
    }
  }>(`/creative/flow/state/${eventId}`).subscribe({
    next: (res) => {
      const s = res.data;
      if (!s) return;

      // 還原隊伍資訊
      if (s.currentTeamId) {
        this.currentTeamId.set(s.currentTeamId);
        this.currentTeamName.set(s.currentTeamName ?? '');
        this.currentMembers.set(s.currentMembers ?? []);
        this.currentCategory.set(s.currentCategory ?? '');
        this.currentTier.set(s.currentTier ?? null);
      } else {
        this.currentTeamId.set(null);
        this.currentTeamName.set('');
        this.currentMembers.set([]);
        this.currentCategory.set('');
        this.currentTier.set(null);
      }

      this.isAbstained.set(s.isAbstained ?? false);

      // 還原計時器狀態
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
      this.tick.update(n => (n + 1) % 1000);
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
    this.currentMembers.set([]);
    this.currentCategory.set('');
    this.currentTier.set(null);
    this.isAbstained.set(false);
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
