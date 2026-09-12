import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Countdown, startCountdown } from "../../core/utils/countdown";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faExpand,
  faCompress,
} from "@fortawesome/free-solid-svg-icons";

import {
  SocketService,
  MatchScoreUpdatedEvent,
  MatchTimerUpdatedEvent,
  MatchEndedEvent,
  MatchWinnerPreviewEvent,
  InjuryStartedEvent,
  InjuryEndedEvent,
} from "../../core/services/socket.service";
import { ApiService } from "../../core/services/api.service";
import { Match } from "../../core/models/match.model";

@Component({
  selector: "app-ne-waza-audience",
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./ne-waza-audience.component.html",
})
export class NeWazaAudienceComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private socket = inject(SocketService);
  private api = inject(ApiService);

  faExpand = faExpand;
  faCompress = faCompress;

  private readonly TIER_LABEL_MAP: Record<string, string> = {
    KID: "幼兒組",
    EL: "國小低年級組",
    EM: "國小中年級組",
    EH: "國小高年級組",
    JH: "青少年國中組",
    SH: "青少年高中組",
    OPEN: "公開組",
  };

  tierLabel(tier: string | null | undefined): string {
    if (!tier) return "";
    return this.TIER_LABEL_MAP[tier] ?? tier;
  }

  eventId = signal("");
  activeMatch = signal<Match | null>(null);
  isFullscreen = signal(false);

  // 即時計分
  redScore = signal(0);
  blueScore = signal(0);
  redAdvantage = signal(0);
  blueAdvantage = signal(0);
  redWarnings = signal(0);
  blueWarnings = signal(0);

  // 計時器
  timerRemaining = signal(0);
  timerPaused = signal(true);

  // 比賽結果
  matchResult = signal<{ winner: "red" | "blue"; method: string } | null>(null);

  // 傷停計時
  redInjuryActive = signal(false);
  redInjuryVisible = signal(false);
  redInjuryRemaining = signal(120);
  blueInjuryActive = signal(false);
  blueInjuryVisible = signal(false);
  blueInjuryRemaining = signal(120);
  private redInjuryInterval: Countdown | null = null;
  private blueInjuryInterval: Countdown | null = null;

  // 主計時歸零鈴聲
  private previousTimerValue = -1;
  private readonly timerBellEffect = effect(() => {
    const current = this.timerRemaining();
    if (this.previousTimerValue > 0 && current === 0) {
      new Audio('assets/sounds/whistle.mp3').play().catch(() => {});
    }
    this.previousTimerValue = current;
  });

  displayTimer = computed(() => {
    const s = this.timerRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  displayRedInjuryTimer = computed(() => {
    const s = this.redInjuryRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  displayBlueInjuryTimer = computed(() => {
    const s = this.blueInjuryRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  winnerLabel = computed(() => {
    const r = this.matchResult();
    if (!r) return "";
    return r.winner === "red" ? "紅方勝" : "藍方勝";
  });

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

    this.subs.add(
      this.socket.matchStarted$.subscribe(() => {
        const eid = this.eventId();
        if (eid) this.loadActiveMatch(eid);
      }),
    );

    this.subs.add(
      this.socket.matchScoreUpdated$.subscribe((e: MatchScoreUpdatedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.redScore.set(e.scores.red);
        this.blueScore.set(e.scores.blue);
        this.redAdvantage.set(e.advantages.red);
        this.blueAdvantage.set(e.advantages.blue);
        this.redWarnings.set(e.warnings.red);
        this.blueWarnings.set(e.warnings.blue);
      }),
    );

    this.subs.add(
      this.socket.matchTimerUpdated$.subscribe((e: MatchTimerUpdatedEvent) => {
        // 裁判端每秒廣播權威剩餘秒數，觀眾端只負責顯示。
        // 剛連上時後端會補送最後一次計時狀態，但此時場次可能還在載入中，
        // 先暫存起來，等 activeMatch 就緒再套用，否則暫停中的計時會一直顯示 00:00。
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) {
          this.pendingTimer = e;
          return;
        }
        this.applyTimerEvent(e);
      }),
    );

    this.subs.add(
      this.socket.matchEnded$.subscribe((e: MatchEndedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.timerPaused.set(true);
        this.matchResult.set({ winner: e.winner, method: e.method });
        this.previousTimerValue = -1;
      }),
    );

    this.subs.add(
      this.socket.matchWinnerPreview$.subscribe((e: MatchWinnerPreviewEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.timerPaused.set(true);
        this.matchResult.set({ winner: e.winner, method: "judge" });
      }),
    );

    this.subs.add(
      this.socket.matchWinnerPreviewCancelled$.subscribe((e: { matchId: string }) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.matchResult.set(null);
      }),
    );

    this.subs.add(
      this.socket.matchScoresReset$.subscribe((e: { matchId: string }) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.resetScores();
        this.matchResult.set(null);
      }),
    );

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
          this.redInjuryInterval = startCountdown(this.redInjuryRemaining(), {
            onTick: (remaining) => this.redInjuryRemaining.set(remaining),
            onFinish: () => {
              this.clearRedInjuryInterval();
              this.redInjuryActive.set(false);
            },
          });
        } else {
          this.clearBlueInjuryInterval();
          this.blueInjuryActive.set(true);
          this.blueInjuryVisible.set(true);
          this.blueInjuryRemaining.set(duration);
          this.blueInjuryInterval = startCountdown(this.blueInjuryRemaining(), {
            onTick: (remaining) => this.blueInjuryRemaining.set(remaining),
            onFinish: () => {
              this.clearBlueInjuryInterval();
              this.blueInjuryActive.set(false);
            },
          });
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
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
  }

  private clearRedInjuryInterval(): void {
    this.redInjuryInterval?.stop();
    this.redInjuryInterval = null;
  }

  private clearBlueInjuryInterval(): void {
    this.blueInjuryInterval?.stop();
    this.blueInjuryInterval = null;
  }


  /** 暫存於 activeMatch 就緒前收到的計時廣播 */
  private pendingTimer: MatchTimerUpdatedEvent | null = null;

  private applyTimerEvent(e: MatchTimerUpdatedEvent): void {
    this.timerRemaining.set(e.remaining);
    this.timerPaused.set(e.paused);
  }

  private loadActiveMatch(eventId: string): void {
    this.previousTimerValue = -1;
    this.api
      .get<{ success: boolean; data: Match[] }>(`/events/${eventId}/matches?matchType=ne-waza`)
      .subscribe({
        next: (res) => {
          const inProgress =
            res.data.find((m) => m.status === "in-progress") ?? null;
          this.activeMatch.set(inProgress);
          this.matchResult.set(null);
          this.resetScores();
          // 套用連線時暫存的計時狀態（場次載入前收到的補送廣播）
          if (inProgress && this.pendingTimer?.matchId === inProgress._id) {
            this.applyTimerEvent(this.pendingTimer);
          }
          this.pendingTimer = null;
          if (inProgress) {
            this.restoreScores(inProgress._id);
          }
        },
        error: () => {},
      });
  }

  private restoreScores(matchId: string): void {
    this.api
      .get<{
        success: boolean;
        data: {
          scores: { red: number; blue: number };
          advantages: { red: number; blue: number };
          warnings: { red: number; blue: number };
        };
      }>(`/match-scores/summary?matchId=${matchId}`)
      .subscribe({
        next: (res) => {
          this.redScore.set(res.data.scores.red);
          this.blueScore.set(res.data.scores.blue);
          this.redAdvantage.set(res.data.advantages.red);
          this.blueAdvantage.set(res.data.advantages.blue);
          this.redWarnings.set(res.data.warnings.red);
          this.blueWarnings.set(res.data.warnings.blue);
        },
        error: () => {},
      });
  }

  private resetScores(): void {
    this.redScore.set(0);
    this.blueScore.set(0);
    this.redAdvantage.set(0);
    this.blueAdvantage.set(0);
    this.redWarnings.set(0);
    this.blueWarnings.set(0);
    this.timerRemaining.set(0);
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
