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
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import Swal from "sweetalert2";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faLock,
  faPlay,
  faPause,
  faGavel,
  faExpand,
  faCompress,
} from "@fortawesome/free-solid-svg-icons";

import { ApiService } from "../../core/services/api.service";
import { AuthService } from "../../core/services/auth.service";
import { SocketService } from "../../core/services/socket.service";
import {
  Match,
  MatchCategory,
  MatchStatus,
  MatchMethod,
} from "../../core/models/match.model";

const CATEGORY_LABEL: Record<MatchCategory, string> = {
  male: "男子組",
  female: "女子組",
  mixed: "混合組",
};

const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: "待開始",
  "in-progress": "進行中",
  "full-ippon-pending": "FULL IPPON",
  "shido-dq-pending": "SHIDO DQ",
  completed: "已完成",
};

@Component({
  selector: "app-fighting-referee",
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./fighting-referee.component.html",
})
export class FightingRefereeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private router = inject(Router);

  faLock = faLock;
  faPlay = faPlay;
  faPause = faPause;
  faGavel = faGavel;
  faExpand = faExpand;
  faCompress = faCompress;

  // ── 視圖狀態 ──
  view = signal<"list" | "scoring">("list");
  matches = signal<Match[]>([]);
  activeMatch = signal<Match | null>(null);
  loading = signal(false);
  isFullscreen = signal(false);

  // ── 計時器 ──
  timerRunning = signal(false);
  timerRemaining = signal(120);
  timerTotal = signal(120);
  timerSetupDone = signal(false);
  timerBeforeAdjust = signal(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // ── 對打計分 Signals ──
  redParts = signal<[number, number, number]>([0, 0, 0]);
  blueParts = signal<[number, number, number]>([0, 0, 0]);
  redWazaAri = signal(0);
  blueWazaAri = signal(0);
  redShido = signal(0);
  blueShido = signal(0);
  fullIpponPending = signal(false);
  shidoDqPending = signal<"red" | "blue" | null>(null);
  chuiBadgeRed = signal(false);
  chuiBadgeBlue = signal(false);
  private chuiBadgeRedTimer: ReturnType<typeof setTimeout> | null = null;
  private chuiBadgeBlueTimer: ReturnType<typeof setTimeout> | null = null;

  // ── OSAE KOMI 計時器 ──
  redOsaeKomiRemaining = signal(0);
  blueOsaeKomiRemaining = signal(0);
  redOsaeKomiActive = signal(false);
  blueOsaeKomiActive = signal(false);
  private redOsaeKomiInterval: ReturnType<typeof setInterval> | null = null;
  private blueOsaeKomiInterval: ReturnType<typeof setInterval> | null = null;

  // ── 裁判判決 ──
  judgeWinner = signal<"red" | "blue" | null>(null);
  dqPending = signal<"red" | "blue" | null>(null);

  // ── 計算屬性 ──
  eventId = computed(() => this.auth.user()?.eventId ?? "");
  fightingMatches = computed(() => this.matches().filter((m) => m.matchType === "fighting"));

  displayTimer = computed(() => {
    const s = this.timerRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  displayRedOsaeKomi = computed(() => {
    const s = this.redOsaeKomiRemaining();
    return s.toString().padStart(2, "0");
  });

  displayBlueOsaeKomi = computed(() => {
    const s = this.blueOsaeKomiRemaining();
    return s.toString().padStart(2, "0");
  });

  CATEGORY_LABEL = CATEGORY_LABEL;
  STATUS_LABEL = STATUS_LABEL;

  private subs = new Subscription();

  ngOnInit(): void {
    const eid = this.eventId();
    if (eid) {
      this.socket.joinEvent(eid);
      this.loadMatches();
    }

    this.subs.add(
      this.socket.matchFoulUpdated$.subscribe((evt) => {
        const match = this.activeMatch();
        if (!match || evt.matchId !== match._id) return;
        this.redWazaAri.set(evt.redWazaAri ?? 0);
        this.blueWazaAri.set(evt.blueWazaAri ?? 0);
        this.redShido.set(evt.redShido ?? 0);
        this.blueShido.set(evt.blueShido ?? 0);
        if (evt.redPart1Score !== undefined) {
          this.redParts.set([
            evt.redPart1Score ?? 0,
            evt.redPart2Score ?? 0,
            evt.redPart3Score ?? 0,
          ]);
        }
        if (evt.bluePart1Score !== undefined) {
          this.blueParts.set([
            evt.bluePart1Score ?? 0,
            evt.bluePart2Score ?? 0,
            evt.bluePart3Score ?? 0,
          ]);
        }
        if (evt.chuiEvent === "red") this.showChuiBadge("red");
        if (evt.chuiEvent === "blue") this.showChuiBadge("blue");
      }),
    );

    this.subs.add(
      this.socket.matchFullIppon$.subscribe((evt) => {
        const match = this.activeMatch();
        if (!match || evt.matchId !== match._id) return;
        this.fullIpponPending.set(true);
        this.pauseTimer();
      }),
    );

    this.subs.add(
      this.socket.matchShidoDq$.subscribe((evt) => {
        const match = this.activeMatch();
        if (!match || evt.matchId !== match._id) return;
        this.shidoDqPending.set(evt.suggestedDisqualified);
        this.pauseTimer();
      }),
    );
  }

  ngOnDestroy(): void {
    this.clearTimerInterval();
    this.clearRedOsaeKomiInterval();
    this.clearBlueOsaeKomiInterval();
    this.subs.unsubscribe();
    if (this.chuiBadgeRedTimer) clearTimeout(this.chuiBadgeRedTimer);
    if (this.chuiBadgeBlueTimer) clearTimeout(this.chuiBadgeBlueTimer);
    const eid = this.eventId();
    if (eid) this.socket.leaveEvent(eid);
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

  // ──────────────────────────────────────────────────────────
  // LIST VIEW
  // ──────────────────────────────────────────────────────────

  loadMatches(): void {
    const eid = this.eventId();
    if (!eid) return;
    this.loading.set(true);
    this.api
      .get<{ success: boolean; data: Match[] }>(`/events/${eid}/matches`)
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.matches.set(res.data.filter((m) => m.matchType === "fighting"));
        },
        error: () => {
          this.loading.set(false);
          Swal.fire({
            icon: "error",
            title: "無法載入賽程",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2500,
          });
        },
      });
  }

  selectMatch(match: Match): void {
    if (match.status === "completed") return;

    const alreadyInProgress = match.status !== "pending";

    const startScoring = (m: Match) => {
      this.activeMatch.set(m);
      this.resetScoringState();
      this.restoreFightingState(m);
      if (alreadyInProgress) {
        Swal.fire({
          icon: "info",
          title: "此場次已在進行中",
          text: "計時器已重置，請手動調整剩餘時間後繼續",
          confirmButtonText: "繼續",
          background: "#1e293b",
          color: "#fff",
          confirmButtonColor: "#3b82f6",
        });
      }
      this.view.set("scoring");
    };

    if (alreadyInProgress) {
      startScoring(match);
      this.socket.emitMatchStarted(this.eventId(), match._id);
      return;
    }

    this.api
      .patch<{ success: boolean; data: Match }>(
        `/events/${this.eventId()}/matches/${match._id}`,
        { status: "in-progress" },
      )
      .subscribe({
        next: (res) => {
          this.matches.update((ms) =>
            ms.map((m) => (m._id === res.data._id ? res.data : m)),
          );
          startScoring(res.data);
          this.socket.emitMatchStarted(this.eventId(), res.data._id);
        },
        error: () => {
          Swal.fire({
            icon: "error",
            title: "無法開始場次",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2500,
          });
        },
      });
  }

  private restoreFightingState(match: Match): void {
    this.redParts.set([
      match.redPart1Score ?? 0,
      match.redPart2Score ?? 0,
      match.redPart3Score ?? 0,
    ]);
    this.blueParts.set([
      match.bluePart1Score ?? 0,
      match.bluePart2Score ?? 0,
      match.bluePart3Score ?? 0,
    ]);
    this.redWazaAri.set(match.redWazaAri ?? 0);
    this.blueWazaAri.set(match.blueWazaAri ?? 0);
    this.redShido.set(match.redShido ?? 0);
    this.blueShido.set(match.blueShido ?? 0);

    const duration = match.matchDuration ?? 0;
    if (duration > 0) {
      this.timerTotal.set(duration);
      this.timerRemaining.set(duration);
      this.timerSetupDone.set(true);
    }

    if (match.status === "full-ippon-pending") {
      this.fullIpponPending.set(true);
    }
    if (match.status === "shido-dq-pending") {
      const dqSide: "red" | "blue" = (match.redShido ?? 0) >= 6 ? "red" : "blue";
      this.shidoDqPending.set(dqSide);
    }
  }

  // ──────────────────────────────────────────────────────────
  // SCORING VIEW — 計時器
  // ──────────────────────────────────────────────────────────

  confirmDuration(seconds: number): void {
    const match = this.activeMatch();
    if (!match) return;
    this.api
      .patch<{ success: boolean; data: { matchDuration: number } }>(
        "/match-scores/duration",
        { matchId: match._id, duration: seconds },
      )
      .subscribe({
        next: () => {
          this.timerTotal.set(seconds);
          this.timerRemaining.set(seconds);
          this.timerSetupDone.set(true);
          this.startTimer();
        },
        error: () => {
          Swal.fire({
            icon: "error",
            title: "無法設定比賽時長",
            text: "請重試",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2500,
          });
        },
      });
  }

  adjustTimer(delta: number): void {
    if (this.timerRunning()) return;
    this.timerRemaining.update((v) => Math.max(0, v + delta));
    this.timerTotal.set(this.timerRemaining());
  }

  resumeWithoutSave(): void {
    this.timerRemaining.set(this.timerBeforeAdjust());
    this.startTimer();
  }

  saveAndResume(): void {
    const match = this.activeMatch();
    if (!match) return;
    const remainingBefore = this.timerBeforeAdjust();
    const remainingAfter = this.timerRemaining();
    this.api
      .patch("/match-scores/timer-adjust", {
        matchId: match._id,
        remainingBefore,
        remainingAfter,
      })
      .subscribe({
        next: () => {
          this.timerBeforeAdjust.set(remainingAfter);
          this.timerTotal.set(remainingAfter);
          this.startTimer();
        },
        error: () => {
          Swal.fire({
            icon: "error",
            title: "儲存失敗",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2500,
          });
        },
      });
  }

  startTimer(): void {
    if (this.timerRemaining() <= 0) return;
    this.timerRunning.set(true);
    this.timerInterval = setInterval(() => {
      this.timerRemaining.update((v) => {
        if (v <= 1) {
          this.pauseTimer();
          return 0;
        }
        return v - 1;
      });
      const m = this.activeMatch();
      if (m) {
        this.socket.emitMatchTimerUpdated(
          this.eventId(),
          m._id,
          this.timerRemaining(),
          false,
        );
      }
    }, 1000);
  }

  pauseTimer(): void {
    this.timerBeforeAdjust.set(this.timerRemaining());
    this.timerRunning.set(false);
    this.clearTimerInterval();
    const m = this.activeMatch();
    if (m) {
      this.socket.emitMatchTimerUpdated(
        this.eventId(),
        m._id,
        this.timerRemaining(),
        true,
      );
    }
  }

  private clearTimerInterval(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ──────────────────────────────────────────────────────────
  // OSAE KOMI
  // ──────────────────────────────────────────────────────────

  toggleOsaeKomi(side: "red" | "blue"): void {
    if (side === "red") {
      if (this.redOsaeKomiActive()) {
        this.clearRedOsaeKomiInterval();
        this.redOsaeKomiActive.set(false);
        this.redOsaeKomiRemaining.set(0);
        // restart
        this.startOsaeKomi("red");
      } else {
        this.startOsaeKomi("red");
      }
    } else {
      if (this.blueOsaeKomiActive()) {
        this.clearBlueOsaeKomiInterval();
        this.blueOsaeKomiActive.set(false);
        this.blueOsaeKomiRemaining.set(0);
        this.startOsaeKomi("blue");
      } else {
        this.startOsaeKomi("blue");
      }
    }
  }

  private startOsaeKomi(side: "red" | "blue"): void {
    const DURATION = 15;
    if (side === "red") {
      this.redOsaeKomiRemaining.set(DURATION);
      this.redOsaeKomiActive.set(true);
      this.redOsaeKomiInterval = setInterval(() => {
        const newVal = Math.max(0, this.redOsaeKomiRemaining() - 1);
        this.redOsaeKomiRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearRedOsaeKomiInterval();
          this.redOsaeKomiActive.set(false);
        }
      }, 1000);
    } else {
      this.blueOsaeKomiRemaining.set(DURATION);
      this.blueOsaeKomiActive.set(true);
      this.blueOsaeKomiInterval = setInterval(() => {
        const newVal = Math.max(0, this.blueOsaeKomiRemaining() - 1);
        this.blueOsaeKomiRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearBlueOsaeKomiInterval();
          this.blueOsaeKomiActive.set(false);
        }
      }, 1000);
    }
  }

  private clearRedOsaeKomiInterval(): void {
    if (this.redOsaeKomiInterval) {
      clearInterval(this.redOsaeKomiInterval);
      this.redOsaeKomiInterval = null;
    }
  }

  private clearBlueOsaeKomiInterval(): void {
    if (this.blueOsaeKomiInterval) {
      clearInterval(this.blueOsaeKomiInterval);
      this.blueOsaeKomiInterval = null;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 對打計分
  // ──────────────────────────────────────────────────────────

  callPartScore(
    side: "red" | "blue",
    partIndex: 1 | 2 | 3 | null,
    delta: number,
  ): void {
    const match = this.activeMatch();
    if (!match) return;
    this.api
      .post<{ success: boolean }>("/match-scores/part", {
        matchId: match._id,
        side,
        partIndex,
        delta,
      })
      .subscribe({
        error: () => {
          Swal.fire({
            icon: "error",
            title: "計分失敗",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2000,
          });
        },
      });
    if (partIndex !== null) {
      const parts = [...(side === "red" ? this.redParts() : this.blueParts())] as [number, number, number];
      parts[partIndex - 1] = Math.max(0, parts[partIndex - 1] + delta);
      if (side === "red") this.redParts.set(parts);
      else this.blueParts.set(parts);
    }
    if (side === "red") this.redWazaAri.update((v) => Math.max(0, v + delta));
    else this.blueWazaAri.update((v) => Math.max(0, v + delta));
  }

  callFoul(
    side: "red" | "blue",
    foulType: "shido" | "chui",
    delta: 1 | -1,
  ): void {
    const match = this.activeMatch();
    if (!match) return;
    const shidoUnits = foulType === "chui" ? 3 : 1;
    const oppSide: "red" | "blue" = side === "red" ? "blue" : "red";
    this.api
      .post<{ success: boolean }>("/match-scores/foul", {
        matchId: match._id,
        side,
        foulType,
        delta,
      })
      .subscribe({
        error: () => {
          Swal.fire({
            icon: "error",
            title: "犯規操作失敗",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2000,
          });
        },
      });
    if (side === "red") this.redShido.update((v) => Math.max(0, v + shidoUnits * delta));
    else this.blueShido.update((v) => Math.max(0, v + shidoUnits * delta));
    if (oppSide === "red") this.redWazaAri.update((v) => Math.max(0, v + shidoUnits * delta));
    else this.blueWazaAri.update((v) => Math.max(0, v + shidoUnits * delta));
    if (foulType === "chui" && delta > 0) {
      this.showChuiBadge(side);
    }
  }

  callVar(): void {
    Swal.fire({
      icon: "info",
      title: "VAR 請求已記錄",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
    });
  }

  // ──────────────────────────────────────────────────────────
  // DQ、判決、結束
  // ──────────────────────────────────────────────────────────

  confirmJudgeDecision(winner: "red" | "blue"): void {
    const match = this.activeMatch();
    if (!match) return;
    this.judgeWinner.set(winner);
    this.pauseTimer();
    this.socket.emitMatchWinnerPreview(this.eventId(), match._id, winner);
  }

  cancelJudgeAnnouncement(): void {
    const match = this.activeMatch();
    if (match) {
      this.socket.emitMatchWinnerPreviewCancel(this.eventId(), match._id);
    }
    this.judgeWinner.set(null);
    this.dqPending.set(null);
  }

  private resolveMethod(): MatchMethod {
    if (this.fullIpponPending()) return "full-ippon";
    if (this.shidoDqPending() !== null) return "shido-dq";
    if (this.dqPending() !== null) return "dq";
    return "judge";
  }

  finalizeMatch(): void {
    const winner = this.judgeWinner();
    if (!winner) return;
    this.endMatch(winner, this.resolveMethod());
  }

  goToNextMatch(): void {
    const winner = this.judgeWinner();
    if (!winner) return;
    const match = this.activeMatch();
    if (!match) return;

    const resolvedMethod = this.resolveMethod();

    this.api
      .patch<{ success: boolean; data: Match }>(
        `/events/${this.eventId()}/matches/${match._id}`,
        { status: "completed", result: { winner, method: resolvedMethod } },
      )
      .subscribe({
        next: (res) => {
          this.socket.emitMatchEnded(this.eventId(), match._id, winner, resolvedMethod);
          this.matches.update((ms) =>
            ms.map((m) => (m._id === res.data._id ? res.data : m)),
          );
          this.judgeWinner.set(null);
          this.dqPending.set(null);
          this.fullIpponPending.set(false);
          this.shidoDqPending.set(null);
          this.view.set("list");
          this.activeMatch.set(null);
        },
        error: () => {
          Swal.fire({
            icon: "error",
            title: "結束場次失敗",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2500,
          });
        },
      });
  }

  private endMatch(winner: "red" | "blue", method: MatchMethod): void {
    const match = this.activeMatch();
    if (!match) return;

    this.pauseTimer();

    this.api
      .patch<{ success: boolean; data: Match }>(
        `/events/${this.eventId()}/matches/${match._id}`,
        { status: "completed", result: { winner, method } },
      )
      .subscribe({
        next: (res) => {
          const eid = this.eventId();
          this.socket.emitMatchEnded(eid, match._id, winner, method);
          this.judgeWinner.set(null);
          this.dqPending.set(null);
          this.fullIpponPending.set(false);
          this.shidoDqPending.set(null);
          this.matches.update((ms) =>
            ms.map((m) => (m._id === res.data._id ? res.data : m)),
          );

          const methodLabel =
            method === "judge" ? "裁判判決"
            : method === "full-ippon" ? "FULL IPPON"
            : method === "shido-dq" ? "SHIDO DQ"
            : "取消資格";
          Swal.fire({
            icon: "success",
            title: `場次結束 — ${winner === "red" ? "紅方" : "藍方"}勝`,
            text: `判決方式：${methodLabel}`,
            background: "#1e293b",
            color: "#fff",
            confirmButtonColor: "#3b82f6",
          }).then(() => {
            this.view.set("list");
            this.activeMatch.set(null);
          });
        },
        error: () => {
          Swal.fire({
            icon: "error",
            title: "結束場次失敗",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2500,
          });
        },
      });
  }

  backToList(): void {
    if (this.timerRunning()) {
      Swal.fire({
        icon: "warning",
        title: "計時器仍在運行",
        text: "確定要離開計分畫面？計時器將暫停。",
        showCancelButton: true,
        confirmButtonText: "離開",
        cancelButtonText: "取消",
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#f59e0b",
        cancelButtonColor: "#6b7280",
      }).then((result) => {
        if (result.isConfirmed) {
          this.pauseTimer();
          this.activeMatch.set(null);
          this.view.set("list");
        }
      });
      return;
    }
    this.activeMatch.set(null);
    this.view.set("list");
  }

  backToSportSelect(): void {
    this.router.navigate(["/match-referee"]);
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

  private resetScoringState(): void {
    this.timerRemaining.set(120);
    this.timerTotal.set(120);
    this.timerRunning.set(false);
    this.clearTimerInterval();
    this.redParts.set([0, 0, 0]);
    this.blueParts.set([0, 0, 0]);
    this.redWazaAri.set(0);
    this.blueWazaAri.set(0);
    this.redShido.set(0);
    this.blueShido.set(0);
    this.fullIpponPending.set(false);
    this.shidoDqPending.set(null);
    this.timerSetupDone.set(false);
    this.timerBeforeAdjust.set(0);
    this.chuiBadgeRed.set(false);
    this.chuiBadgeBlue.set(false);
    this.judgeWinner.set(null);
    this.dqPending.set(null);
    this.clearRedOsaeKomiInterval();
    this.clearBlueOsaeKomiInterval();
    this.redOsaeKomiActive.set(false);
    this.blueOsaeKomiActive.set(false);
    this.redOsaeKomiRemaining.set(0);
    this.blueOsaeKomiRemaining.set(0);
  }
}
