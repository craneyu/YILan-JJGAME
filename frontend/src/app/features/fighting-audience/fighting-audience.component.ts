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
  InjuryStartedEvent,
  InjuryEndedEvent,
  OsaeKomiStartedEvent,
  OsaeKomiEndedEvent,
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
  redTotalScore = signal(0);
  blueTotalScore = signal(0);
  redShido = signal(0);
  blueShido = signal(0);
  redParts = signal<[number, number, number]>([0, 0, 0]);
  blueParts = signal<[number, number, number]>([0, 0, 0]);
  fullIpponOverlay = signal(false);
  chuiBadgeRed = signal(false);
  chuiBadgeBlue = signal(false);
  private chuiBadgeRedTimer: ReturnType<typeof setTimeout> | null = null;
  private chuiBadgeBlueTimer: ReturnType<typeof setTimeout> | null = null;

  // 傷停（MEDICAL）
  redInjuryActive = signal(false);
  redInjuryRemaining = signal(120);
  blueInjuryActive = signal(false);
  blueInjuryRemaining = signal(120);
  private redInjuryInterval: ReturnType<typeof setInterval> | null = null;
  private blueInjuryInterval: ReturnType<typeof setInterval> | null = null;

  // OSAE KOMI
  redOsaeKomiActive = signal(false);
  redOsaeKomiRemaining = signal(0);
  blueOsaeKomiActive = signal(false);
  blueOsaeKomiRemaining = signal(0);
  private redOsaeKomiInterval: ReturnType<typeof setInterval> | null = null;
  private blueOsaeKomiInterval: ReturnType<typeof setInterval> | null = null;

  displayTimer = computed(() => {
    const s = this.timerRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  displayRedInjury = computed(() => {
    const s = this.redInjuryRemaining();
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  });

  displayBlueInjury = computed(() => {
    const s = this.blueInjuryRemaining();
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  });

  displayRedOsaeKomi = computed(() => {
    const s = this.redOsaeKomiRemaining();
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  });
  displayBlueOsaeKomi = computed(() => {
    const s = this.blueOsaeKomiRemaining();
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
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
        if (!m || String(m._id) !== String(e.matchId)) return;
        this.redWazaAri.set(e.redWazaAri ?? 0);
        this.blueWazaAri.set(e.blueWazaAri ?? 0);
        if (e.redTotalScore !== undefined) this.redTotalScore.set(e.redTotalScore);
        if (e.blueTotalScore !== undefined) this.blueTotalScore.set(e.blueTotalScore);
        this.redShido.set(e.redShido ?? 0);
        this.blueShido.set(e.blueShido ?? 0);
        if (e.redIppons) {
          this.redParts.set([e.redIppons.p1 ?? 0, e.redIppons.p2 ?? 0, e.redIppons.p3 ?? 0]);
        }
        if (e.blueIppons) {
          this.blueParts.set([e.blueIppons.p1 ?? 0, e.blueIppons.p2 ?? 0, e.blueIppons.p3 ?? 0]);
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
        if (!m || String(m._id) !== String(e.matchId)) return;
        this.resetScores();
        this.matchResult.set(null);
      }),
    );

    // 傷停事件
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
            const nv = Math.max(0, this.redInjuryRemaining() - 1);
            this.redInjuryRemaining.set(nv);
            if (nv <= 0) { this.clearRedInjuryInterval(); }
          }, 1000);
        } else {
          this.clearBlueInjuryInterval();
          this.blueInjuryActive.set(true);
          this.blueInjuryRemaining.set(duration);
          this.blueInjuryInterval = setInterval(() => {
            const nv = Math.max(0, this.blueInjuryRemaining() - 1);
            this.blueInjuryRemaining.set(nv);
            if (nv <= 0) { this.clearBlueInjuryInterval(); }
          }, 1000);
        }
      }),
    );

    this.subs.add(
      this.socket.injuryEnded$.subscribe((e: InjuryEndedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        if (e.side === "red") { this.clearRedInjuryInterval(); }
        else { this.clearBlueInjuryInterval(); }
      }),
    );

    // OSAE KOMI 事件
    this.subs.add(
      this.socket.osaeKomiStarted$.subscribe((e: OsaeKomiStartedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        const duration = e.durationSec ?? 15;
        if (e.side === "red") {
          this.clearRedOsaeKomiInterval();
          this.redOsaeKomiActive.set(true);
          this.redOsaeKomiRemaining.set(duration);
          this.redOsaeKomiInterval = setInterval(() => {
            const nv = Math.max(0, this.redOsaeKomiRemaining() - 1);
            this.redOsaeKomiRemaining.set(nv);
            if (nv <= 0) { this.clearRedOsaeKomiInterval(); this.redOsaeKomiActive.set(false); }
          }, 1000);
        } else {
          this.clearBlueOsaeKomiInterval();
          this.blueOsaeKomiActive.set(true);
          this.blueOsaeKomiRemaining.set(duration);
          this.blueOsaeKomiInterval = setInterval(() => {
            const nv = Math.max(0, this.blueOsaeKomiRemaining() - 1);
            this.blueOsaeKomiRemaining.set(nv);
            if (nv <= 0) { this.clearBlueOsaeKomiInterval(); this.blueOsaeKomiActive.set(false); }
          }, 1000);
        }
      }),
    );

    this.subs.add(
      this.socket.osaeKomiEnded$.subscribe((e: OsaeKomiEndedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        if (e.side === "red") { this.clearRedOsaeKomiInterval(); this.redOsaeKomiActive.set(false); }
        else { this.clearBlueOsaeKomiInterval(); this.blueOsaeKomiActive.set(false); }
      }),
    );
  }

  ngOnDestroy(): void {
    const eid = this.eventId();
    if (eid) this.socket.leaveEvent(eid);
    this.subs.unsubscribe();
    if (this.chuiBadgeRedTimer) clearTimeout(this.chuiBadgeRedTimer);
    if (this.chuiBadgeBlueTimer) clearTimeout(this.chuiBadgeBlueTimer);
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
    this.clearRedOsaeKomiInterval();
    this.clearBlueOsaeKomiInterval();
  }

  private clearRedInjuryInterval(): void {
    if (this.redInjuryInterval) { clearInterval(this.redInjuryInterval); this.redInjuryInterval = null; }
  }
  private clearBlueInjuryInterval(): void {
    if (this.blueInjuryInterval) { clearInterval(this.blueInjuryInterval); this.blueInjuryInterval = null; }
  }
  private clearRedOsaeKomiInterval(): void {
    if (this.redOsaeKomiInterval) { clearInterval(this.redOsaeKomiInterval); this.redOsaeKomiInterval = null; }
  }
  private clearBlueOsaeKomiInterval(): void {
    if (this.blueOsaeKomiInterval) { clearInterval(this.blueOsaeKomiInterval); this.blueOsaeKomiInterval = null; }
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
            this.redTotalScore.set(inProgress.redTotalScore ?? 0);
            this.blueTotalScore.set(inProgress.blueTotalScore ?? 0);
            this.redShido.set(inProgress.redShido ?? 0);
            this.blueShido.set(inProgress.blueShido ?? 0);
            this.redParts.set([
              inProgress.redIppons?.p1 ?? 0,
              inProgress.redIppons?.p2 ?? 0,
              inProgress.redIppons?.p3 ?? 0,
            ]);
            this.blueParts.set([
              inProgress.blueIppons?.p1 ?? 0,
              inProgress.blueIppons?.p2 ?? 0,
              inProgress.blueIppons?.p3 ?? 0,
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
    this.redTotalScore.set(0);
    this.blueTotalScore.set(0);
    this.redShido.set(0);
    this.blueShido.set(0);
    this.redParts.set([0, 0, 0]);
    this.blueParts.set([0, 0, 0]);
    this.fullIpponOverlay.set(false);
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
    this.redInjuryActive.set(false);
    this.redInjuryRemaining.set(120);
    this.blueInjuryActive.set(false);
    this.blueInjuryRemaining.set(120);
    this.clearRedOsaeKomiInterval();
    this.clearBlueOsaeKomiInterval();
    this.redOsaeKomiActive.set(false);
    this.redOsaeKomiRemaining.set(0);
    this.blueOsaeKomiActive.set(false);
    this.blueOsaeKomiRemaining.set(0);
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
