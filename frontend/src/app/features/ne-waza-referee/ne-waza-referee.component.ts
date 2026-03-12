import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  HostListener,
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
  MatchScoreLog,
  MatchCategory,
  MatchStatus,
  MatchMethod,
} from "../../core/models/match.model";

const WARNING_ADVANTAGE_THRESHOLD = 2;
const WARNING_SCORE_THRESHOLD = 3;
const WARNING_DQ_THRESHOLD = 4;

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

interface ScoreEntry {
  side: "red" | "blue";
  type: MatchScoreLog["type"];
  value: number;
}

@Component({
  selector: "app-ne-waza-referee",
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./ne-waza-referee.component.html",
})
export class NeWazaRefereeComponent implements OnInit, OnDestroy {
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
  timerRemaining = signal(360);
  timerTotal = signal(360);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // ── 得分 Signals ──
  redScore = signal(0);
  blueScore = signal(0);
  redAdvantage = signal(0);
  blueAdvantage = signal(0);
  redWarnings = signal(0);
  blueWarnings = signal(0);

  redBonusAdvantage = computed(() =>
    this.redWarnings() >= WARNING_ADVANTAGE_THRESHOLD ? 1 : 0,
  );
  blueBonusAdvantage = computed(() =>
    this.blueWarnings() >= WARNING_ADVANTAGE_THRESHOLD ? 1 : 0,
  );

  redTotalAdvantage = computed(
    () => this.redAdvantage() + this.blueBonusAdvantage(),
  );
  blueTotalAdvantage = computed(
    () => this.blueAdvantage() + this.redBonusAdvantage(),
  );

  redScoreLog = signal<ScoreEntry[]>([]);
  blueScoreLog = signal<ScoreEntry[]>([]);

  // ── 傷停計時 ──
  redInjuryActive = signal(false);
  redInjuryVisible = signal(false);
  redInjuryRemaining = signal(120);
  blueInjuryActive = signal(false);
  blueInjuryVisible = signal(false);
  blueInjuryRemaining = signal(120);
  private redInjuryInterval: ReturnType<typeof setInterval> | null = null;
  private blueInjuryInterval: ReturnType<typeof setInterval> | null = null;

  // ── 降伏/DQ ──
  submissionPending = signal<"red" | "blue" | null>(null);
  dqPending = signal<"red" | "blue" | null>(null);
  judgeWinner = signal<"red" | "blue" | null>(null);

  // ── 計算屬性 ──
  eventId = computed(() => this.auth.user()?.eventId ?? "");
  neWazaMatches = computed(() => this.matches().filter((m) => m.matchType !== "fighting"));

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

  CATEGORY_LABEL = CATEGORY_LABEL;
  STATUS_LABEL = STATUS_LABEL;

  private subs = new Subscription();

  ngOnInit(): void {
    const eid = this.eventId();
    if (eid) {
      this.socket.joinEvent(eid);
      this.loadMatches();
    }
  }

  @HostListener("document:keydown.space", ["$event"])
  onSpaceKey(event: Event): void {
    if (this.view() !== "scoring") return;
    if (this.timerRemaining() <= 0 && !this.timerRunning()) return;
    event.preventDefault();
    this.toggleTimer();
  }

  ngOnDestroy(): void {
    this.clearTimerInterval();
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
    this.subs.unsubscribe();
    const eid = this.eventId();
    if (eid) this.socket.leaveEvent(eid);
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
          this.matches.set(res.data.filter((m) => m.matchType !== "fighting"));
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

  // ──────────────────────────────────────────────────────────
  // SCORING VIEW — 計時器
  // ──────────────────────────────────────────────────────────

  setTimer(minutes: number): void {
    const secs = minutes * 60;
    this.timerTotal.set(secs);
    this.timerRemaining.set(secs);
    this.timerRunning.set(false);
    this.clearTimerInterval();
  }

  adjustTimer(delta: number): void {
    if (this.timerRunning()) return;
    this.timerRemaining.update((v) => Math.max(0, v + delta));
    this.timerTotal.set(this.timerRemaining());
  }

  toggleTimer(): void {
    if (this.timerRunning()) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
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
  // 得分操作
  // ──────────────────────────────────────────────────────────

  addScore(side: "red" | "blue", value: number): void {
    this.applyScore(side, "score", value);
  }

  addAdvantage(side: "red" | "blue"): void {
    this.applyScore(side, "advantage", 1);
  }

  removeAdvantage(side: "red" | "blue"): void {
    const current = side === "red" ? this.redAdvantage() : this.blueAdvantage();
    if (current <= 0) return;
    this.applyScore(side, "advantage", -1);
  }

  addSubmission(winner: "red" | "blue"): void {
    const match = this.activeMatch();
    if (!match) return;
    const winnerLabel = winner === "red" ? "紅方" : "藍方";
    Swal.fire({
      icon: "info",
      title: `${winnerLabel} 降伏勝`,
      text: "確認此判決？系統將宣告勝方，請再按「結束比賽」完成場次。",
      showCancelButton: true,
      confirmButtonText: "確認",
      cancelButtonText: "取消",
      background: "#1e293b",
      color: "#fff",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.submissionPending.set(winner);
      this.judgeWinner.set(winner);
      this.pauseTimer();
      this.socket.emitMatchScoreUpdated(
        this.eventId(),
        match._id,
        { red: winner === "red" ? 99 : this.redScore(), blue: winner === "blue" ? 99 : this.blueScore() },
        { red: this.redTotalAdvantage(), blue: this.blueTotalAdvantage() },
        { red: this.redWarnings(), blue: this.blueWarnings() },
      );
      this.socket.emitMatchWinnerPreview(this.eventId(), match._id, winner);
    });
  }

  private applyScore(
    side: "red" | "blue",
    type: ScoreEntry["type"],
    value: number,
  ): void {
    const match = this.activeMatch();
    if (!match) return;

    const entry: ScoreEntry = { side, type, value };
    if (side === "red") this.redScoreLog.update((l) => [...l, entry]);
    else this.blueScoreLog.update((l) => [...l, entry]);

    this.recalcFromLogs();

    this.api
      .post("/match-scores", { matchId: match._id, side, type, value })
      .subscribe();
    this.emitScoreUpdated(match._id);
  }

  addWarning(side: "red" | "blue"): void {
    const currentWarnings =
      side === "red" ? this.redWarnings() : this.blueWarnings();
    const next = currentWarnings + 1;

    if (next >= WARNING_DQ_THRESHOLD) {
      const loserLabel = side === "red" ? "紅方" : "藍方";
      const winner: "red" | "blue" = side === "red" ? "blue" : "red";
      const winnerLabel = winner === "red" ? "紅方" : "藍方";
      const match = this.activeMatch();
      if (!match) return;
      Swal.fire({
        icon: "warning",
        title: `${loserLabel} DQ`,
        text: `${loserLabel}累計 ${WARNING_DQ_THRESHOLD} 次警告，判定 ${loserLabel} DQ，${winnerLabel}勝。確認此判決？`,
        showCancelButton: true,
        confirmButtonText: "確認",
        cancelButtonText: "取消",
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
      }).then((result) => {
        if (!result.isConfirmed) return;
        this.applyWarning(side);
        this.dqPending.set(winner);
        this.judgeWinner.set(winner);
        this.pauseTimer();
        this.socket.emitMatchScoreUpdated(
          this.eventId(),
          match._id,
          { red: this.redScore(), blue: this.blueScore() },
          { red: this.redTotalAdvantage(), blue: this.blueTotalAdvantage() },
          { red: this.redWarnings(), blue: this.blueWarnings() },
        );
        this.socket.emitMatchWinnerPreview(this.eventId(), match._id, winner);
      });
      return;
    }

    const opponent: "red" | "blue" = side === "red" ? "blue" : "red";

    if (next === WARNING_SCORE_THRESHOLD) {
      Swal.fire({
        icon: "info",
        title: `累計 ${next} 次警告`,
        text: `對方得分 +2`,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
      this.applyWarning(side);
      this.applyScore(opponent, "score", 2);
      return;
    }

    if (next === WARNING_ADVANTAGE_THRESHOLD) {
      Swal.fire({
        icon: "info",
        title: `累計 ${next} 次警告`,
        text: `對方優勢 +1`,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
    }

    this.applyWarning(side);
  }

  removeWarning(side: "red" | "blue"): void {
    const current = side === "red" ? this.redWarnings() : this.blueWarnings();
    if (current <= 0) return;

    const opponent: "red" | "blue" = side === "red" ? "blue" : "red";
    const willRevokeScore = current === WARNING_SCORE_THRESHOLD;
    const willRevokeAdvantage =
      current === WARNING_ADVANTAGE_THRESHOLD && !willRevokeScore;

    if (willRevokeScore || willRevokeAdvantage) {
      const detail = willRevokeScore
        ? "此操作將扣回對方因第 3 次警告獲得的 2 分，確定？"
        : "此操作將扣回對方因累計警告獲得的優勢，確定？";
      Swal.fire({
        icon: "warning",
        title: "撤銷警告",
        text: detail,
        showCancelButton: true,
        confirmButtonText: "確認撤銷",
        cancelButtonText: "取消",
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#f59e0b",
        cancelButtonColor: "#6b7280",
      }).then((result) => {
        if (!result.isConfirmed) return;
        this.applyWarning(side, -1);
        if (willRevokeScore) this.applyScore(opponent, "score", -2);
      });
      return;
    }

    this.applyWarning(side, -1);
  }

  private applyWarning(side: "red" | "blue", delta = 1): void {
    const match = this.activeMatch();
    if (!match) return;

    if (side === "red") this.redWarnings.update((v) => Math.max(0, v + delta));
    else this.blueWarnings.update((v) => Math.max(0, v + delta));

    const entry: ScoreEntry = { side, type: "warning", value: delta };
    if (side === "red") this.redScoreLog.update((l) => [...l, entry]);
    else this.blueScoreLog.update((l) => [...l, entry]);

    this.api
      .post("/match-scores", {
        matchId: match._id,
        side,
        type: "warning",
        value: delta,
      })
      .subscribe();
    this.emitScoreUpdated(match._id);
  }

  private recalcFromLogs(): void {
    let rs = 0, bs = 0, ra = 0, ba = 0;
    for (const e of this.redScoreLog()) {
      if (e.type === "score") rs = Math.max(0, rs + e.value);
      if (e.type === "advantage") ra = Math.max(0, ra + e.value);
    }
    for (const e of this.blueScoreLog()) {
      if (e.type === "score" && e.value !== 99) bs = Math.max(0, bs + e.value);
      if (e.type === "advantage") ba = Math.max(0, ba + e.value);
    }
    this.redScore.set(rs);
    this.blueScore.set(bs);
    this.redAdvantage.set(ra);
    this.blueAdvantage.set(ba);
  }

  // ──────────────────────────────────────────────────────────
  // 傷停
  // ──────────────────────────────────────────────────────────

  startInjuryTimeout(side: "red" | "blue"): void {
    if (side === "red" && this.redInjuryRemaining() <= 0) return;
    if (side === "blue" && this.blueInjuryRemaining() <= 0) return;
    this.pauseTimer();
    const match = this.activeMatch();
    if (side === "red") {
      this.redInjuryActive.set(true);
      this.redInjuryVisible.set(true);
      this.redInjuryInterval = setInterval(() => {
        const newVal = Math.max(0, this.redInjuryRemaining() - 1);
        this.redInjuryRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearRedInjuryInterval();
          this.redInjuryActive.set(false);
          if (match) {
            this.socket.emitInjuryEnded(this.eventId(), match._id, "red");
          }
          if (!this.blueInjuryActive()) this.startTimer();
        }
      }, 1000);
    } else {
      this.blueInjuryActive.set(true);
      this.blueInjuryVisible.set(true);
      this.blueInjuryInterval = setInterval(() => {
        const newVal = Math.max(0, this.blueInjuryRemaining() - 1);
        this.blueInjuryRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearBlueInjuryInterval();
          this.blueInjuryActive.set(false);
          if (match) {
            this.socket.emitInjuryEnded(this.eventId(), match._id, "blue");
          }
          if (!this.redInjuryActive()) this.startTimer();
        }
      }, 1000);
    }
    if (match) {
      this.socket.emitInjuryStarted(
        this.eventId(),
        match._id,
        side,
        side === "red" ? this.redInjuryRemaining() : this.blueInjuryRemaining(),
      );
    }
  }

  resumeFromInjury(side: "red" | "blue"): void {
    const match = this.activeMatch();
    if (side === "red") {
      this.clearRedInjuryInterval();
      this.redInjuryActive.set(false);
    } else {
      this.clearBlueInjuryInterval();
      this.blueInjuryActive.set(false);
    }
    if (match) {
      this.socket.emitInjuryEnded(this.eventId(), match._id, side);
    }
    if (!this.redInjuryActive() && !this.blueInjuryActive()) {
      this.startTimer();
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

  // ──────────────────────────────────────────────────────────
  // DQ、判決、結束
  // ──────────────────────────────────────────────────────────

  confirmDQ(loser: "red" | "blue"): void {
    const match = this.activeMatch();
    if (!match) return;
    const loserLabel = loser === "red" ? "紅方" : "藍方";
    const winner: "red" | "blue" = loser === "red" ? "blue" : "red";
    Swal.fire({
      icon: "warning",
      title: `${loserLabel} 取消資格`,
      text: "確認 DQ？系統將宣告對方勝，請再按「結束比賽」完成場次。",
      showCancelButton: true,
      confirmButtonText: "確認 DQ",
      cancelButtonText: "取消",
      background: "#1e293b",
      color: "#fff",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    }).then((result) => {
      if (result.isConfirmed) {
        this.dqPending.set(loser);
        this.judgeWinner.set(winner);
        this.pauseTimer();
        this.socket.emitMatchWinnerPreview(this.eventId(), match._id, winner);
      }
    });
  }

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
      if (this.submissionPending()) {
        this.emitScoreUpdated(match._id);
      }
    }
    this.judgeWinner.set(null);
    this.dqPending.set(null);
    this.submissionPending.set(null);
  }

  private resolveMethod(): MatchMethod {
    if (this.dqPending() !== null) return "dq";
    if (this.submissionPending() !== null) return "submission";
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
          this.submissionPending.set(null);
          this.dqPending.set(null);
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

    const resolvedMethod: MatchMethod =
      method === "judge" && this.submissionPending() !== null ? "submission" : method;

    this.pauseTimer();

    this.api
      .patch<{ success: boolean; data: Match }>(
        `/events/${this.eventId()}/matches/${match._id}`,
        { status: "completed", result: { winner, method: resolvedMethod } },
      )
      .subscribe({
        next: (res) => {
          const eid = this.eventId();
          this.socket.emitMatchEnded(eid, match._id, winner, resolvedMethod);
          this.submissionPending.set(null);
          this.dqPending.set(null);
          this.judgeWinner.set(null);
          this.matches.update((ms) =>
            ms.map((m) => (m._id === res.data._id ? res.data : m)),
          );

          const methodLabel =
            resolvedMethod === "judge" ? "裁判判決"
            : resolvedMethod === "submission" ? "降伏勝"
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

  resetMatchScores(): void {
    const match = this.activeMatch();
    if (!match) return;
    Swal.fire({
      icon: "warning",
      title: "歸零計分",
      text: "確定將本場所有得分、優勢、警告全部清零？此操作無法復原。",
      showCancelButton: true,
      confirmButtonText: "確認歸零",
      cancelButtonText: "取消",
      background: "#1e293b",
      color: "#fff",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.api.post("/match-scores/reset", { matchId: match._id }).subscribe({
        next: () => {
          this.redScoreLog.set([]);
          this.blueScoreLog.set([]);
          this.redScore.set(0);
          this.blueScore.set(0);
          this.redAdvantage.set(0);
          this.blueAdvantage.set(0);
          this.redWarnings.set(0);
          this.blueWarnings.set(0);
          this.submissionPending.set(null);
          this.dqPending.set(null);
          this.judgeWinner.set(null);
          const injuryLimit = 120;
          this.clearRedInjuryInterval();
          this.clearBlueInjuryInterval();
          this.redInjuryActive.set(false);
          this.redInjuryVisible.set(false);
          this.redInjuryRemaining.set(injuryLimit);
          this.blueInjuryActive.set(false);
          this.blueInjuryVisible.set(false);
          this.blueInjuryRemaining.set(injuryLimit);
          this.clearTimerInterval();
          this.timerRunning.set(false);
          this.timerRemaining.set(this.timerTotal());
        },
        error: () => {
          Swal.fire({
            icon: "error",
            title: "歸零失敗",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2500,
          });
        },
      });
    });
  }

  private emitScoreUpdated(matchId: string): void {
    this.socket.emitMatchScoreUpdated(
      this.eventId(),
      matchId,
      { red: this.redScore(), blue: this.blueScore() },
      { red: this.redTotalAdvantage(), blue: this.blueTotalAdvantage() },
      { red: this.redWarnings(), blue: this.blueWarnings() },
    );
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
    this.redScore.set(0);
    this.blueScore.set(0);
    this.redAdvantage.set(0);
    this.blueAdvantage.set(0);
    this.redWarnings.set(0);
    this.blueWarnings.set(0);
    this.redScoreLog.set([]);
    this.blueScoreLog.set([]);
    this.timerRemaining.set(360);
    this.timerTotal.set(360);
    this.timerRunning.set(false);
    this.clearTimerInterval();
    this.redInjuryActive.set(false);
    this.redInjuryVisible.set(false);
    this.redInjuryRemaining.set(120);
    this.blueInjuryActive.set(false);
    this.blueInjuryVisible.set(false);
    this.blueInjuryRemaining.set(120);
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
    this.submissionPending.set(null);
    this.dqPending.set(null);
    this.judgeWinner.set(null);
  }
}
