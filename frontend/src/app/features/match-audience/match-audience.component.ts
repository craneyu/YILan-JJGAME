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
} from "@fortawesome/free-solid-svg-icons";

import {
  SocketService,
  MatchScoreUpdatedEvent,
  MatchTimerUpdatedEvent,
  MatchEndedEvent,
  MatchWinnerPreviewEvent,
  InjuryStartedEvent,
  InjuryEndedEvent,
  MatchFoulUpdatedEvent,
} from "../../core/services/socket.service";
import { ApiService } from "../../core/services/api.service";
import { Match } from "../../core/models/match.model";

@Component({
  selector: "app-match-audience",
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./match-audience.component.html",
  styleUrl: "./match-audience.component.css",
})
export class MatchAudienceComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private socket = inject(SocketService);
  private api = inject(ApiService);

  faExpand = faExpand;
  faCompress = faCompress;

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

  // 對打（fighting）計分
  redWazaAri = signal(0);
  blueWazaAri = signal(0);
  redShido = signal(0);
  blueShido = signal(0);
  redParts = signal<[number, number, number]>([0, 0, 0]);
  blueParts = signal<[number, number, number]>([0, 0, 0]);
  fullIpponOverlay = signal(false);
  chuiBadgeRed = signal(false);
  chuiBadgeBlue = signal(false);
  private chuiBadgeRedTimer: ReturnType<typeof setTimeout> | null = null;
  private chuiBadgeBlueTimer: ReturnType<typeof setTimeout> | null = null;

  isFightingMatch = computed(() => this.activeMatch()?.matchType === "fighting");

  // 傷停計時（各側）
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

  matchType = signal<string>("ne-waza");

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
        this.fullIpponOverlay.set(false); // 7.1: dismiss overlay on match ended
      }),
    );

    // ── 對打：match:foul-updated (7.2, 7.3) ──
    this.subs.add(
      this.socket.matchFoulUpdated$.subscribe((e: MatchFoulUpdatedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.redWazaAri.set(e.redWazaAri ?? 0);
        this.blueWazaAri.set(e.blueWazaAri ?? 0);
        this.redShido.set(e.redShido ?? 0);
        this.blueShido.set(e.blueShido ?? 0);
        if (e.redPart1Score !== undefined) {
          this.redParts.set([e.redPart1Score ?? 0, e.redPart2Score ?? 0, e.redPart3Score ?? 0]);
        }
        if (e.bluePart1Score !== undefined) {
          this.blueParts.set([e.bluePart1Score ?? 0, e.bluePart2Score ?? 0, e.bluePart3Score ?? 0]);
        }
        if (e.chuiEvent === "red") this.showChuiBadge("red");
        if (e.chuiEvent === "blue") this.showChuiBadge("blue");
      }),
    );

    // ── 對打：match:full-ippon overlay (7.1) ──
    this.subs.add(
      this.socket.matchFullIppon$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.fullIpponOverlay.set(true);
      }),
    );

    this.subs.add(
      this.socket.matchWinnerPreview$.subscribe(
        (e: MatchWinnerPreviewEvent) => {
          const m = this.activeMatch();
          if (!m || m._id !== e.matchId) return;
          this.timerPaused.set(true);
          this.matchResult.set({ winner: e.winner, method: "judge" });
        },
      ),
    );

    this.subs.add(
      this.socket.matchWinnerPreviewCancelled$.subscribe(
        (e: { matchId: string }) => {
          const m = this.activeMatch();
          if (!m || m._id !== e.matchId) return;
          this.matchResult.set(null);
        },
      ),
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
          // visible 保留，讓選手/觀眾看到剩餘時間
        } else {
          this.clearBlueInjuryInterval();
          this.blueInjuryActive.set(false);
          // visible 保留，讓選手/觀眾看到剩餘時間
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
    if (this.chuiBadgeRedTimer) clearTimeout(this.chuiBadgeRedTimer);
    if (this.chuiBadgeBlueTimer) clearTimeout(this.chuiBadgeBlueTimer);
  }

  private showChuiBadge(side: "red" | "blue"): void {
    if (side === "red") {
      this.chuiBadgeRed.set(true);
      if (this.chuiBadgeRedTimer) clearTimeout(this.chuiBadgeRedTimer);
      this.chuiBadgeRedTimer = setTimeout(() => this.chuiBadgeRed.set(false), 5000);
    } else {
      this.chuiBadgeBlue.set(true);
      if (this.chuiBadgeBlueTimer) clearTimeout(this.chuiBadgeBlueTimer);
      this.chuiBadgeBlueTimer = setTimeout(() => this.chuiBadgeBlue.set(false), 5000);
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
      .get<{
        success: boolean;
        data: Match[];
      }>(`/events/${eventId}/matches?matchType=${this.matchType()}`)
      .subscribe({
        next: (res) => {
          const inProgress =
            res.data.find((m) =>
              m.status === "in-progress" ||
              m.status === "full-ippon-pending" ||
              m.status === "shido-dq-pending",
            ) ?? null;
          this.activeMatch.set(inProgress);
          this.matchResult.set(null);
          this.resetScores();
          if (inProgress) {
            this.restoreScores(inProgress._id);
            // 恢復 fighting 狀態
            if (inProgress.matchType === "fighting") {
              this.redWazaAri.set(inProgress.redWazaAri ?? 0);
              this.blueWazaAri.set(inProgress.blueWazaAri ?? 0);
              this.redShido.set(inProgress.redShido ?? 0);
              this.blueShido.set(inProgress.blueShido ?? 0);
              this.redParts.set([
                inProgress.redPart1Score ?? 0,
                inProgress.redPart2Score ?? 0,
                inProgress.redPart3Score ?? 0,
              ]);
              this.blueParts.set([
                inProgress.bluePart1Score ?? 0,
                inProgress.bluePart2Score ?? 0,
                inProgress.bluePart3Score ?? 0,
              ]);
              if (inProgress.status === "full-ippon-pending") {
                this.fullIpponOverlay.set(true);
              }
            }
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
    // Fighting resets
    this.redWazaAri.set(0);
    this.blueWazaAri.set(0);
    this.redShido.set(0);
    this.blueShido.set(0);
    this.redParts.set([0, 0, 0]);
    this.blueParts.set([0, 0, 0]);
    this.fullIpponOverlay.set(false);
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
