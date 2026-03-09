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
import { Subscription } from "rxjs";
import Swal from "sweetalert2";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faLock,
  faPlay,
  faPause,
  faStop,
  faUndo,
  faPlus,
  faMinus,
  faGavel,
  faTrophy,
  faRotateLeft,
  faExpand,
  faCompress,
  faRightFromBracket,
  faKitMedical,
} from "@fortawesome/free-solid-svg-icons";

import { ApiService } from "../../core/services/api.service";
import { AuthService } from "../../core/services/auth.service";
import { SocketService } from "../../core/services/socket.service";
import {
  Match,
  MatchScoreLog,
  MatchCategory,
  MatchStatus,
} from "../../core/models/match.model";

// ── 警告累積規則常數 ──
const WARNING_ADVANTAGE_THRESHOLD = 3; // 3 次警告對方得優勢
const WARNING_DQ_THRESHOLD = 4; // 4 次警告對方直接勝利

const CATEGORY_LABEL: Record<MatchCategory, string> = {
  male: "男子組",
  female: "女子組",
  mixed: "混合組",
};

const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: "待開始",
  "in-progress": "進行中",
  completed: "已完成",
};

interface ScoreEntry {
  side: "red" | "blue";
  type: MatchScoreLog["type"];
  value: number;
}

@Component({
  selector: "app-match-referee",
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./match-referee.component.html",
})
export class MatchRefereeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private socket = inject(SocketService);

  // ── Icons ──
  faLock = faLock;
  faPlay = faPlay;
  faPause = faPause;
  faStop = faStop;
  faUndo = faUndo;
  faPlus = faPlus;
  faMinus = faMinus;
  faGavel = faGavel;
  faTrophy = faTrophy;
  faRotateLeft = faRotateLeft;
  faExpand = faExpand;
  faCompress = faCompress;
  faRightFromBracket = faRightFromBracket;
  faKitMedical = faKitMedical;

  // ── 視圖狀態 ──
  view = signal<"list" | "scoring">("list");
  matches = signal<Match[]>([]);
  activeMatch = signal<Match | null>(null);
  loading = signal(false);

  // ── 計時器 ──
  timerRunning = signal(false);
  timerRemaining = signal(360); // 預設 6 分鐘（Ne-Waza）
  timerTotal = signal(360);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // ── 得分 Signals ──
  redScore = signal(0);
  blueScore = signal(0);
  redAdvantage = signal(0);
  blueAdvantage = signal(0);
  redWarnings = signal(0);
  blueWarnings = signal(0);

  // 警告累計加算的優勢（從警告次數自動計算）
  redBonusAdvantage = computed(() => {
    const w = this.redWarnings();
    return w >= WARNING_ADVANTAGE_THRESHOLD ? 1 : 0;
  });
  blueBonusAdvantage = computed(() => {
    const w = this.blueWarnings();
    return w >= WARNING_ADVANTAGE_THRESHOLD ? 1 : 0;
  });

  redTotalAdvantage = computed(
    () => this.redAdvantage() + this.blueBonusAdvantage(),
  );
  blueTotalAdvantage = computed(
    () => this.blueAdvantage() + this.redBonusAdvantage(),
  );

  // ── 得分歷史（用於 undo） ──
  redScoreLog = signal<ScoreEntry[]>([]);
  blueScoreLog = signal<ScoreEntry[]>([]);

  // ── 傷停計時（紅/藍各自） ──
  redInjuryActive = signal(false);
  redInjuryRemaining = signal(120);
  blueInjuryActive = signal(false);
  blueInjuryRemaining = signal(120);
  private redInjuryInterval: ReturnType<typeof setInterval> | null = null;
  private blueInjuryInterval: ReturnType<typeof setInterval> | null = null;

  // ── 降伏待確認狀態 ──
  submissionPending = signal<'red' | 'blue' | null>(null);

  // ── DQ 待確認（記錄被 DQ 的一方，等待最終結束）──
  dqPending = signal<'red' | 'blue' | null>(null);

  // ── 裁判判決（宣告勝方，尚未正式結束）──
  judgeWinner = signal<'red' | 'blue' | null>(null);

  // ── 全螢幕 ──
  isFullscreen = signal(false);

  // ── 計算屬性 ──
  eventId = computed(() => this.auth.user()?.eventId ?? "");

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
      .get<{
        success: boolean;
        data: Match[];
      }>(`/events/${eid}/matches?matchType=ne-waza`)
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.matches.set(res.data);
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

    const alreadyInProgress = match.status === "in-progress";

    const startScoring = () => {
      this.activeMatch.set(match);
      this.resetScoringState();
      if (alreadyInProgress) {
        // 場次已在進行中，詢問是否繼續
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
      startScoring();
      this.socket.emitMatchStarted(this.eventId(), match._id);
      return;
    }

    // 狀態 pending → in-progress
    this.api
      .patch<{
        success: boolean;
        data: Match;
      }>(`/events/${this.eventId()}/matches/${match._id}`, {
        status: "in-progress",
      })
      .subscribe({
        next: (res) => {
          // 更新 matches 列表
          this.matches.update((ms) =>
            ms.map((m) => (m._id === res.data._id ? res.data : m)),
          );
          this.activeMatch.set(res.data);
          this.resetScoringState();
          this.socket.emitMatchStarted(this.eventId(), res.data._id);
          this.view.set("scoring");
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
  // SCORING VIEW — 得分操作
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

  addStalling(side: "red" | "blue"): void {
    this.addWarning(side);
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
      // 廣播給觀眾：勝方得分顯示 99
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

    // 本地更新
    const entry: ScoreEntry = { side, type, value };
    if (side === "red") this.redScoreLog.update((l) => [...l, entry]);
    else this.blueScoreLog.update((l) => [...l, entry]);

    this.recalcFromLogs();

    // 持久化 + 廣播
    this.api
      .post("/match-scores", { matchId: match._id, side, type, value })
      .subscribe();
    this.emitScoreUpdated(match._id);
  }

  undoLast(side: "red" | "blue"): void {
    const match = this.activeMatch();
    if (!match) return;

    const log = side === "red" ? this.redScoreLog() : this.blueScoreLog();
    if (log.length === 0) {
      Swal.fire({
        icon: "info",
        title: "無可撤銷的記錄",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    if (side === "red") this.redScoreLog.update((l) => l.slice(0, -1));
    else this.blueScoreLog.update((l) => l.slice(0, -1));

    this.recalcFromLogs();

    this.api
      .post("/match-scores", {
        matchId: match._id,
        side,
        type: "undo",
        value: -1,
      })
      .subscribe();
    this.emitScoreUpdated(match._id);
  }

  addWarning(side: "red" | "blue"): void {
    const currentWarnings =
      side === "red" ? this.redWarnings() : this.blueWarnings();
    const next = currentWarnings + 1;

    if (next >= WARNING_DQ_THRESHOLD) {
      // 第 4 次警告 → DQ 確認
      Swal.fire({
        icon: "warning",
        title: `第 ${WARNING_DQ_THRESHOLD} 次警告`,
        text: `${side === "red" ? "紅方" : "藍方"}累計 ${WARNING_DQ_THRESHOLD} 次警告，對方直接勝利。確認此判決？`,
        showCancelButton: true,
        confirmButtonText: "確認 DQ",
        cancelButtonText: "取消",
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
      }).then((result) => {
        if (result.isConfirmed) {
          this.applyWarning(side);
          const winner: "red" | "blue" = side === "red" ? "blue" : "red";
          this.endMatch(winner, "dq");
        }
      });
      return;
    }

    if (next === WARNING_ADVANTAGE_THRESHOLD) {
      Swal.fire({
        icon: "info",
        title: `累計 ${WARNING_ADVANTAGE_THRESHOLD} 次警告`,
        text: `對方自動獲得 1 分優勢`,
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

    const prevHadAdvantage = current >= WARNING_ADVANTAGE_THRESHOLD;
    const nextHasAdvantage = current - 1 >= WARNING_ADVANTAGE_THRESHOLD;

    if (prevHadAdvantage && !nextHasAdvantage) {
      Swal.fire({
        icon: "warning",
        title: "撤銷警告",
        text: "此操作將扣回對方因累計警告獲得的優勢，確定？",
        showCancelButton: true,
        confirmButtonText: "確認撤銷",
        cancelButtonText: "取消",
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#f59e0b",
        cancelButtonColor: "#6b7280",
      }).then((result) => {
        if (result.isConfirmed) {
          this.applyWarning(side, -1);
        }
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
    let rs = 0,
      bs = 0,
      ra = 0,
      ba = 0;
    for (const e of this.redScoreLog()) {
      if (e.type === "score") rs += e.value;
      if (e.type === "advantage") ra += e.value;
    }
    for (const e of this.blueScoreLog()) {
      if (e.type === "score" && e.value !== 99) bs += e.value;
      if (e.type === "advantage") ba += e.value;
    }
    this.redScore.set(Math.max(0, rs));
    this.blueScore.set(Math.max(0, bs));
    this.redAdvantage.set(Math.max(0, ra));
    this.blueAdvantage.set(Math.max(0, ba));
  }

  // ──────────────────────────────────────────────────────────
  // 傷停
  // ──────────────────────────────────────────────────────────

  startInjuryTimeout(side: "red" | "blue"): void {
    this.pauseTimer();
    const match = this.activeMatch();
    if (side === "red") {
      this.redInjuryActive.set(true);
      this.redInjuryRemaining.set(120);
      this.redInjuryInterval = setInterval(() => {
        this.redInjuryRemaining.update((v) => {
          if (v <= 1) {
            this.clearRedInjuryInterval();
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    } else {
      this.blueInjuryActive.set(true);
      this.blueInjuryRemaining.set(120);
      this.blueInjuryInterval = setInterval(() => {
        this.blueInjuryRemaining.update((v) => {
          if (v <= 1) {
            this.clearBlueInjuryInterval();
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    }
    if (match) {
      this.socket.emitInjuryStarted(this.eventId(), match._id, side, 120);
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
      // 若是取消降伏，需將觀眾端分數還原為真實值
      if (this.submissionPending()) {
        this.emitScoreUpdated(match._id);
      }
    }
    this.judgeWinner.set(null);
    this.dqPending.set(null);
    this.submissionPending.set(null);
  }

  finalizeMatch(): void {
    const winner = this.judgeWinner();
    if (!winner) return;
    const method = this.dqPending() !== null ? "dq"
      : this.submissionPending() !== null ? "submission"
      : "judge";
    this.endMatch(winner, method);
  }

  goToNextMatch(): void {
    const winner = this.judgeWinner();
    if (!winner) return;
    const match = this.activeMatch();
    if (!match) return;

    const resolvedMethod: "judge" | "submission" | "dq" =
      this.dqPending() !== null ? "dq"
      : this.submissionPending() !== null ? "submission"
      : "judge";

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

  private endMatch(
    winner: "red" | "blue",
    method: "judge" | "submission" | "dq",
  ): void {
    const match = this.activeMatch();
    if (!match) return;

    const resolvedMethod: "judge" | "submission" | "dq" =
      method === "judge" && this.submissionPending() !== null ? "submission" : method;

    this.pauseTimer();

    this.api
      .patch<{
        success: boolean;
        data: Match;
      }>(`/events/${this.eventId()}/matches/${match._id}`, {
        status: "completed",
        result: { winner, method: resolvedMethod },
      })
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

          Swal.fire({
            icon: "success",
            title: `場次結束 — ${winner === "red" ? "紅方" : "藍方"}勝`,
            text: `判決方式：${resolvedMethod === "judge" ? "裁判判決" : resolvedMethod === "submission" ? "降伏勝" : "取消資格"}`,
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

  // ──────────────────────────────────────────────────────────
  // 工具方法
  // ──────────────────────────────────────────────────────────

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
    this.redInjuryRemaining.set(120);
    this.blueInjuryActive.set(false);
    this.blueInjuryRemaining.set(120);
    this.clearRedInjuryInterval();
    this.clearBlueInjuryInterval();
    this.submissionPending.set(null);
    this.dqPending.set(null);
    this.judgeWinner.set(null);
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
      // 清除資料庫歷史記錄（後端會同時廣播 0/0 給觀眾）
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
      {
        red: this.redScore(),
        blue: this.blueScore(),
      },
      {
        red: this.redTotalAdvantage(),
        blue: this.blueTotalAdvantage(),
      },
      {
        red: this.redWarnings(),
        blue: this.blueWarnings(),
      },
    );
  }

  logout(): void {
    this.auth.logout();
    window.location.href = "/";
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
          this.view.set("list");
        }
      });
      return;
    }
    this.view.set("list");
    this.activeMatch.set(null);
  }
}
