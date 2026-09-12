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
  redFlashingIndex = signal(-1);
  blueFlashingIndex = signal(-1);
  private previousRedParts: [number, number, number] | null = null;
  private previousBlueParts: [number, number, number] | null = null;
  private redFlashTimer: ReturnType<typeof setTimeout> | null = null;
  private blueFlashTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly partsFlashEffect = effect(() => {
    const red = this.redParts();
    const blue = this.blueParts();

    if (this.previousRedParts === null) {
      this.previousRedParts = [...red] as [number, number, number];
    } else {
      for (let i = 0; i < 3; i++) {
        if (red[i] > this.previousRedParts[i]) {
          if (this.redFlashTimer) clearTimeout(this.redFlashTimer);
          this.redFlashingIndex.set(i);
          this.redFlashTimer = setTimeout(() => this.redFlashingIndex.set(-1), 700);
        }
      }
      this.previousRedParts = [...red] as [number, number, number];
    }

    if (this.previousBlueParts === null) {
      this.previousBlueParts = [...blue] as [number, number, number];
    } else {
      for (let i = 0; i < 3; i++) {
        if (blue[i] > this.previousBlueParts[i]) {
          if (this.blueFlashTimer) clearTimeout(this.blueFlashTimer);
          this.blueFlashingIndex.set(i);
          this.blueFlashTimer = setTimeout(() => this.blueFlashingIndex.set(-1), 700);
        }
      }
      this.previousBlueParts = [...blue] as [number, number, number];
    }
  });

  fullIpponOverlay = signal(false);
  redChuiCount = signal(0);
  blueChuiCount = signal(0);

  // 傷停（MEDICAL）
  redInjuryActive = signal(false);
  redInjuryRemaining = signal(120);
  blueInjuryActive = signal(false);
  blueInjuryRemaining = signal(120);
  private redInjuryInterval: Countdown | null = null;
  private blueInjuryInterval: Countdown | null = null;

  // OSAE KOMI
  redOsaeKomiActive = signal(false);
  redOsaeKomiRemaining = signal(0);
  blueOsaeKomiActive = signal(false);
  blueOsaeKomiRemaining = signal(0);
  private redOsaeKomiInterval: Countdown | null = null;
  private blueOsaeKomiInterval: Countdown | null = null;

  // OSAE KOMI 進度條（15 格）
  progressBarSegments = Array.from({ length: 15 }, (_, i) => i);
  redOsaeKomiFilledSegments = computed(() => Math.min(15, this.redOsaeKomiRemaining()));
  blueOsaeKomiFilledSegments = computed(() => Math.min(15, this.blueOsaeKomiRemaining()));

  // 主計時歸零鈴聲
  private previousTimerValue = -1;
  private readonly timerBellEffect = effect(() => {
    const current = this.timerRemaining();
    if (this.previousTimerValue > 0 && current === 0) {
      new Audio('assets/sounds/whistle.mp3').play().catch(() => {});
    }
    this.previousTimerValue = current;
  });

  // OSAE KOMI 自然歸零音效（由 interval 歸零時直接觸發，不依賴 effect 比對）
  private playOsaeKomiBuzzer(): void {
    const a = new Audio('assets/sounds/buzzer-loud.wav');
    a.volume = 1.0;
    a.play().catch(() => {});
  }

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
        this.fullIpponOverlay.set(false);
        this.previousTimerValue = -1;
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
        // 根據 PART Score 而非 IPPON 計數來更新顯示
        if (e.redPart1Score !== undefined || e.redPart2Score !== undefined || e.redPart3Score !== undefined) {
          this.redParts.set([e.redPart1Score ?? 0, e.redPart2Score ?? 0, e.redPart3Score ?? 0]);
        }
        if (e.bluePart1Score !== undefined || e.bluePart2Score !== undefined || e.bluePart3Score !== undefined) {
          this.blueParts.set([e.bluePart1Score ?? 0, e.bluePart2Score ?? 0, e.bluePart3Score ?? 0]);
        }
        // CHUI count 追蹤：>0 時恆亮，-CHUI 執行後變 0 時熄滅
        if (e.redChuiCount !== undefined) this.redChuiCount.set(e.redChuiCount);
        if (e.blueChuiCount !== undefined) this.blueChuiCount.set(e.blueChuiCount);
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
          this.redInjuryInterval = startCountdown(this.redInjuryRemaining(), {
            onTick: (remaining) => this.redInjuryRemaining.set(remaining),
            onFinish: () => { this.clearRedInjuryInterval(); },
          });
        } else {
          this.clearBlueInjuryInterval();
          this.blueInjuryActive.set(true);
          this.blueInjuryRemaining.set(duration);
          this.blueInjuryInterval = startCountdown(this.blueInjuryRemaining(), {
            onTick: (remaining) => this.blueInjuryRemaining.set(remaining),
            onFinish: () => { this.clearBlueInjuryInterval(); },
          });
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
          this.redOsaeKomiInterval = startCountdown(this.redOsaeKomiRemaining(), {
            onTick: (remaining) => this.redOsaeKomiRemaining.set(remaining),
            onFinish: () => {
              this.clearRedOsaeKomiInterval();
              this.redOsaeKomiActive.set(false);
              this.playOsaeKomiBuzzer();
            },
          });
        } else {
          this.clearBlueOsaeKomiInterval();
          this.blueOsaeKomiActive.set(true);
          this.blueOsaeKomiRemaining.set(duration);
          this.blueOsaeKomiInterval = startCountdown(this.blueOsaeKomiRemaining(), {
            onTick: (remaining) => this.blueOsaeKomiRemaining.set(remaining),
            onFinish: () => {
              this.clearBlueOsaeKomiInterval();
              this.blueOsaeKomiActive.set(false);
              this.playOsaeKomiBuzzer();
            },
          });
        }
      }),
    );

    this.subs.add(
      this.socket.osaeKomiEnded$.subscribe((e: OsaeKomiEndedEvent) => {
        const m = this.activeMatch();
        if (!m || m._id !== e.matchId) return;
        // 如果觀眾端 interval 仍在跑且 remaining <= 1，代表即將自然歸零
        // → 視為自然完成，播放音效後再清理
        if (e.side === "red") {
          if (this.redOsaeKomiInterval && this.redOsaeKomiRemaining() <= 1) {
            this.playOsaeKomiBuzzer();
          }
          this.clearRedOsaeKomiInterval();
          this.redOsaeKomiActive.set(false);
        } else {
          if (this.blueOsaeKomiInterval && this.blueOsaeKomiRemaining() <= 1) {
            this.playOsaeKomiBuzzer();
          }
          this.clearBlueOsaeKomiInterval();
          this.blueOsaeKomiActive.set(false);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    const eid = this.eventId();
    if (eid) this.socket.leaveEvent(eid);
    this.subs.unsubscribe();
    if (this.redFlashTimer) clearTimeout(this.redFlashTimer);
    if (this.blueFlashTimer) clearTimeout(this.blueFlashTimer);
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
    this.clearRedOsaeKomiInterval();
    this.clearBlueOsaeKomiInterval();
  }

  private clearRedInjuryInterval(): void {
    this.redInjuryInterval?.stop();
    this.redInjuryInterval = null;
  }
  private clearBlueInjuryInterval(): void {
    this.blueInjuryInterval?.stop();
    this.blueInjuryInterval = null;
  }
  private clearRedOsaeKomiInterval(): void {
    this.redOsaeKomiInterval?.stop();
    this.redOsaeKomiInterval = null;
  }
  private clearBlueOsaeKomiInterval(): void {
    this.blueOsaeKomiInterval?.stop();
    this.blueOsaeKomiInterval = null;
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
          // 套用連線時暫存的計時狀態（場次載入前收到的補送廣播）
          if (inProgress && this.pendingTimer?.matchId === inProgress._id) {
            this.applyTimerEvent(this.pendingTimer);
          }
          this.pendingTimer = null;
          if (inProgress) {
            this.redWazaAri.set(inProgress.redWazaAri ?? 0);
            this.blueWazaAri.set(inProgress.blueWazaAri ?? 0);
            this.redTotalScore.set(inProgress.redTotalScore ?? 0);
            this.blueTotalScore.set(inProgress.blueTotalScore ?? 0);
            this.redShido.set(inProgress.redShido ?? 0);
            this.blueShido.set(inProgress.blueShido ?? 0);
            this.redChuiCount.set((inProgress as any).redChuiCount ?? 0);
            this.blueChuiCount.set((inProgress as any).blueChuiCount ?? 0);
            // 根據 PART Score 而非 IPPON 計數來顯示
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
    this.redTotalScore.set(0);
    this.blueTotalScore.set(0);
    this.redShido.set(0);
    this.blueShido.set(0);
    this.redChuiCount.set(0);
    this.blueChuiCount.set(0);
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
