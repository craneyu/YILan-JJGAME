import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faExpand,
  faCompress,
  faPersonFalling,
} from "@fortawesome/free-solid-svg-icons";

import {
  SocketService,
  MatchTimerUpdatedEvent,
  InjuryStartedEvent,
  InjuryEndedEvent,
} from "../../core/services/socket.service";
import { ApiService } from "../../core/services/api.service";
import { Match } from "../../core/models/match.model";

const WINNER_METHOD_LABEL: Record<string, string> = {
  submission: "降伏勝",
  knockdown: "擊倒勝",
  "foul-dq": "犯規失格",
  dq: "犯規失格",
  decision: "判定勝",
};

@Component({
  selector: "app-contact-audience",
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./contact-audience.component.html",
})
export class ContactAudienceComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private socket = inject(SocketService);
  private api = inject(ApiService);

  faExpand = faExpand;
  faCompress = faCompress;
  faPersonFalling = faPersonFalling;

  eventId = signal("");
  activeMatch = signal<Match | null>(null);
  isFullscreen = signal(false);

  // ── Contact 計分（亮牌制）──
  foulCount = signal<{ red: number; blue: number }>({ red: 0, blue: 0 });
  knockdownCount = signal<{ red: number; blue: number }>({ red: 0, blue: 0 });
  goldenMinuteCount = signal(0);

  // 計時器
  timerRemaining = signal(180);
  timerPaused = signal(true);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // 比賽結果
  matchResult = signal<{ winner: "red" | "blue"; method: string } | null>(null);

  // 傷停計時
  redInjuryActive = signal(false);
  redInjuryVisible = signal(false);
  redInjuryRemaining = signal(120);
  blueInjuryActive = signal(false);
  blueInjuryVisible = signal(false);
  blueInjuryRemaining = signal(120);
  private redInjuryInterval: ReturnType<typeof setInterval> | null = null;
  private blueInjuryInterval: ReturnType<typeof setInterval> | null = null;

  displayTimer = computed(() => {
    const s = this.timerRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  displayRedInjuryTimer = computed(() => {
    const s = this.redInjuryRemaining();
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  });

  displayBlueInjuryTimer = computed(() => {
    const s = this.blueInjuryRemaining();
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  });

  winnerLabel = computed(() => {
    const r = this.matchResult();
    if (!r) return "";
    const winnerSide = r.winner === "red" ? "紅方" : "藍方";
    const loserSide  = r.winner === "red" ? "藍方" : "紅方";
    if (r.method === "dq" || r.method === "foul-dq") {
      return `${winnerSide}勝（${loserSide}犯規失格）`;
    }
    const method = WINNER_METHOD_LABEL[r.method] ?? r.method;
    return `${winnerSide} ${method}`;
  });

  cardRange(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  private subs = new Subscription();

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const eid = params["eventId"] ?? "";
      this.eventId.set(eid);
      if (eid) {
        this.socket.joinEvent(eid);
        this.loadActiveMatch(eid);
      }
    });

    // 場次開始 → 重新載入
    this.subs.add(
      this.socket.matchStarted$.subscribe(() => {
        const eid = this.eventId();
        if (eid) this.loadActiveMatch(eid);
      }),
    );

    // 計時器更新：socket 事件校正值，本地 interval 負責每秒遞減
    this.subs.add(
      this.socket.matchTimerUpdated$.subscribe((e: MatchTimerUpdatedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.timerRemaining.set(e.remaining);
        this.timerPaused.set(e.paused);
        if (!e.paused) {
          this.startLocalTimer();
        } else {
          this.stopLocalTimer();
        }
      }),
    );

    // Contact 犯規牌更新（6.1）
    this.subs.add(
      this.socket.contactFoulUpdated$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.foulCount.set(e.foulCount);
      }),
    );

    // Contact 擊倒牌更新（6.1）
    this.subs.add(
      this.socket.contactKnockdownUpdated$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.knockdownCount.set(e.knockdownCount);
      }),
    );

    // 黃金分鐘（6.4）
    this.subs.add(
      this.socket.contactGoldenMinute$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.goldenMinuteCount.set(e.goldenMinuteCount);
        // 計時器重設為 60s 暫停（由 matchTimerUpdated 事件帶入）
      }),
    );

    // 歸零重置
    this.subs.add(
      this.socket.contactReset$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.foulCount.set({ red: 0, blue: 0 });
        this.knockdownCount.set({ red: 0, blue: 0 });
        this.goldenMinuteCount.set(0);
        this.clearRedInjuryInterval();
        this.clearBlueInjuryInterval();
        this.redInjuryActive.set(false);
        this.redInjuryVisible.set(false);
        this.redInjuryRemaining.set(120);
        this.blueInjuryActive.set(false);
        this.blueInjuryVisible.set(false);
        this.blueInjuryRemaining.set(120);
        // 計時器由後端同步廣播的 matchTimerUpdated 事件重設
      }),
    );

    // Contact 勝者宣告（6.5）
    this.subs.add(
      this.socket.contactWinner$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.timerPaused.set(true);
        this.stopLocalTimer();
        this.matchResult.set({ winner: e.winner as "red" | "blue", method: e.method });
      }),
    );

    // 取消宣告
    this.subs.add(
      this.socket.contactCancelWinner$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.matchResult.set(null);
      }),
    );

    // 傷停（6.6）
    this.subs.add(
      this.socket.injuryStarted$.subscribe((e: InjuryStartedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        const duration = e.durationSec ?? 120;
        if (e.side === "red") {
          this.clearRedInjuryInterval();
          this.redInjuryActive.set(true);
          this.redInjuryVisible.set(true);
          this.redInjuryRemaining.set(duration);
          this.redInjuryInterval = setInterval(() => {
            const newVal = Math.max(0, this.redInjuryRemaining() - 1);
            this.redInjuryRemaining.set(newVal);
            if (newVal <= 0) {
              this.clearRedInjuryInterval();
              this.redInjuryActive.set(false);
            }
          }, 1000);
        } else {
          this.clearBlueInjuryInterval();
          this.blueInjuryActive.set(true);
          this.blueInjuryVisible.set(true);
          this.blueInjuryRemaining.set(duration);
          this.blueInjuryInterval = setInterval(() => {
            const newVal = Math.max(0, this.blueInjuryRemaining() - 1);
            this.blueInjuryRemaining.set(newVal);
            if (newVal <= 0) {
              this.clearBlueInjuryInterval();
              this.blueInjuryActive.set(false);
            }
          }, 1000);
        }
      }),
    );

    this.subs.add(
      this.socket.injuryEnded$.subscribe((e: InjuryEndedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        if (e.side === "red") {
          this.clearRedInjuryInterval();
          this.redInjuryActive.set(false);
        } else {
          this.clearBlueInjuryInterval();
          this.blueInjuryActive.set(false);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    const eid = this.eventId();
    if (eid) this.socket.leaveEvent(eid);
    this.subs.unsubscribe();
    this.stopLocalTimer();
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
  }

  private startLocalTimer(): void {
    if (this.timerInterval) return; // 已在執行，不重複啟動
    this.timerInterval = setInterval(() => {
      const current = this.timerRemaining();
      if (current <= 0) {
        this.stopLocalTimer();
        return;
      }
      this.timerRemaining.set(current - 1);
    }, 1000);
  }

  private stopLocalTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private clearRedInjuryInterval(): void {
    if (this.redInjuryInterval) {
      clearInterval(this.redInjuryInterval);
      this.redInjuryInterval = null;
    }
  }

  private clearBlueInjuryInterval(): void {
    if (this.blueInjuryInterval) {
      clearInterval(this.blueInjuryInterval);
      this.blueInjuryInterval = null;
    }
  }

  private loadActiveMatch(eventId: string): void {
    this.api
      .get<{ success: boolean; data: Match[] }>(`/events/${eventId}/matches?matchType=contact`)
      .subscribe({
        next: (res) => {
          const inProgress = res.data.find((m) => m.status === "in-progress") ?? null;
          this.activeMatch.set(inProgress);
          this.matchResult.set(null);
          this.resetState();
          if (inProgress) {
            this.foulCount.set({
              red: inProgress.foulCount?.red ?? 0,
              blue: inProgress.foulCount?.blue ?? 0,
            });
            this.knockdownCount.set({
              red: inProgress.knockdownCount?.red ?? 0,
              blue: inProgress.knockdownCount?.blue ?? 0,
            });
            this.goldenMinuteCount.set(inProgress.goldenMinuteCount ?? 0);
          }
        },
        error: () => {},
      });
  }

  private resetState(): void {
    this.foulCount.set({ red: 0, blue: 0 });
    this.knockdownCount.set({ red: 0, blue: 0 });
    this.goldenMinuteCount.set(0);
    this.timerRemaining.set(180);
    this.timerPaused.set(true);
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
    this.redInjuryActive.set(false);
    this.redInjuryVisible.set(false);
    this.blueInjuryActive.set(false);
    this.blueInjuryVisible.set(false);
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
}
