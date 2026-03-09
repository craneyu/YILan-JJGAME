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
  faKitMedical,
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
  selector: "app-match-audience",
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./match-audience.component.html",
})
export class MatchAudienceComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private socket = inject(SocketService);
  private api = inject(ApiService);

  faExpand = faExpand;
  faCompress = faCompress;
  faKitMedical = faKitMedical;

  eventId = signal("");
  activeMatch = signal<Match | null>(null);
  isFullscreen = signal(false);

  // 即時計分（由 socket 更新）
  redScore = signal(0);
  blueScore = signal(0);
  redAdvantage = signal(0);
  blueAdvantage = signal(0);
  redWarnings = signal(0);
  blueWarnings = signal(0);

  // 計時器（由 socket 更新）
  timerRemaining = signal(0);
  timerPaused = signal(true);

  // 比賽結果
  matchResult = signal<{ winner: "red" | "blue"; method: string } | null>(null);

  // 傷停計時（各側）
  redInjuryActive = signal(false);
  redInjuryRemaining = signal(120);
  blueInjuryActive = signal(false);
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
    return r.winner === "red" ? "🔴 紅方勝" : "🔵 藍方勝";
  });

  private subs = new Subscription();

  matchType = signal<string>('ne-waza');

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const eid = params["eventId"] ?? "";
      const mt = params["matchType"] ?? "ne-waza";
      this.eventId.set(eid);
      this.matchType.set(mt);
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
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.timerRemaining.set(e.remaining);
        this.timerPaused.set(e.paused);
      }),
    );

    this.subs.add(
      this.socket.matchEnded$.subscribe((e: MatchEndedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.timerPaused.set(true);
        this.matchResult.set({ winner: e.winner, method: e.method });
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
      this.socket.injuryStarted$.subscribe((e: InjuryStartedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        const duration = e.durationSec ?? 120;
        if (e.side === "red") {
          this.clearRedInjuryInterval();
          this.redInjuryActive.set(true);
          this.redInjuryRemaining.set(duration);
          this.redInjuryInterval = setInterval(() => {
            this.redInjuryRemaining.update((v) => {
              if (v <= 1) { this.clearRedInjuryInterval(); return 0; }
              return v - 1;
            });
          }, 1000);
        } else {
          this.clearBlueInjuryInterval();
          this.blueInjuryActive.set(true);
          this.blueInjuryRemaining.set(duration);
          this.blueInjuryInterval = setInterval(() => {
            this.blueInjuryRemaining.update((v) => {
              if (v <= 1) { this.clearBlueInjuryInterval(); return 0; }
              return v - 1;
            });
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
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
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
      .get<{
        success: boolean;
        data: Match[];
      }>(`/events/${eventId}/matches?matchType=${this.matchType()}`)
      .subscribe({
        next: (res) => {
          const inProgress =
            res.data.find((m) => m.status === "in-progress") ?? null;
          this.activeMatch.set(inProgress);
          this.matchResult.set(null);
          this.resetScores();
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
    this.blueInjuryActive.set(false);
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
