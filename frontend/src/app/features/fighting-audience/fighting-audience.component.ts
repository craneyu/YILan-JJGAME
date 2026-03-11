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
  MatchTimerUpdatedEvent,
  MatchEndedEvent,
  MatchWinnerPreviewEvent,
  MatchFoulUpdatedEvent,
} from "../../core/services/socket.service";
import { ApiService } from "../../core/services/api.service";
import { Match } from "../../core/models/match.model";

@Component({
  selector: "app-fighting-audience",
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./fighting-audience.component.html",
})
export class FightingAudienceComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private socket = inject(SocketService);
  private api = inject(ApiService);

  faExpand = faExpand;
  faCompress = faCompress;

  eventId = signal("");
  activeMatch = signal<Match | null>(null);
  isFullscreen = signal(false);

  // 計時器
  timerRemaining = signal(0);
  timerPaused = signal(true);

  // 比賽結果
  matchResult = signal<{ winner: "red" | "blue"; method: string } | null>(null);

  // 對打計分
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

  displayTimer = computed(() => {
    const s = this.timerRemaining();
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
        this.fullIpponOverlay.set(false);
      }),
    );

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

    this.subs.add(
      this.socket.matchFullIppon$.subscribe((e) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        this.fullIpponOverlay.set(true);
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
  }

  ngOnDestroy(): void {
    const eid = this.eventId();
    if (eid) this.socket.leaveEvent(eid);
    this.subs.unsubscribe();
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

  private loadActiveMatch(eventId: string): void {
    this.api
      .get<{ success: boolean; data: Match[] }>(`/events/${eventId}/matches?matchType=fighting`)
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
        },
        error: () => {},
      });
  }

  private resetScores(): void {
    this.timerRemaining.set(0);
    this.timerPaused.set(true);
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
