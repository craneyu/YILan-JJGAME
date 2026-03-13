import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  HostListener,
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
// OsaeKomiStartedEvent, OsaeKomiEndedEvent are available but not directly used here
import {
  Match,
  MatchCategory,
  MatchStatus,
  MatchMethod,
} from "../../core/models/match.model";
import {
  CategoryGroup,
  groupMatchesByCategory,
} from "../../core/utils/match-grouping";

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
  // PART plus counters (分開追蹤 +2/-2 和 +3/-3)
  redPartCounters = signal<{ p1: { plus2: number; plus3: number }; p2: { plus2: number; plus3: number }; p3: { plus2: number; plus3: number } }>({
    p1: { plus2: 0, plus3: 0 },
    p2: { plus2: 0, plus3: 0 },
    p3: { plus2: 0, plus3: 0 },
  });
  bluePartCounters = signal<{ p1: { plus2: number; plus3: number }; p2: { plus2: number; plus3: number }; p3: { plus2: number; plus3: number } }>({
    p1: { plus2: 0, plus3: 0 },
    p2: { plus2: 0, plus3: 0 },
    p3: { plus2: 0, plus3: 0 },
  });
  redWazaAri = signal(0);
  blueWazaAri = signal(0);
  redTotalScore = signal(0);
  blueTotalScore = signal(0);
  redShido = signal(0);
  blueShido = signal(0);
  redChuiCount = signal(0);
  blueChuiCount = signal(0);
  fullIpponPending = signal(false);
  shidoDqPending = signal<"red" | "blue" | null>(null);

  // ── OSAE KOMI 計時器 ──
  redOsaeKomiRemaining = signal(15);
  blueOsaeKomiRemaining = signal(15);
  redOsaeKomiActive = signal(false);
  blueOsaeKomiActive = signal(false);
  private redOsaeKomiInterval: ReturnType<typeof setInterval> | null = null;
  private blueOsaeKomiInterval: ReturnType<typeof setInterval> | null = null;

  // ── MEDICAL 計時器 ──
  redMedicalRemaining = signal(120);
  blueMedicalRemaining = signal(120);
  redMedicalActive = signal(false);
  blueMedicalActive = signal(false);
  private redMedicalInterval: ReturnType<typeof setInterval> | null = null;
  private blueMedicalInterval: ReturnType<typeof setInterval> | null = null;

  // ── 裁判判決 ──
  judgeWinner = signal<"red" | "blue" | null>(null);
  dqPending = signal<"red" | "blue" | null>(null);

  // ── 計算屬性 ──
  eventId = computed(() => this.auth.user()?.eventId ?? "");
  fightingMatches = computed(() => this.matches().filter((m) => m.matchType === "fighting"));
  groupedMatches = computed<CategoryGroup[]>(() =>
    groupMatchesByCategory(this.fightingMatches()),
  );

  displayTimer = computed(() => {
    const s = this.timerRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  displayRedOsaeKomi = computed(() => {
    const s = this.redOsaeKomiRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  displayBlueOsaeKomi = computed(() => {
    const s = this.blueOsaeKomiRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  displayRedMedical = computed(() => {
    const s = this.redMedicalRemaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  });

  displayBlueMedical = computed(() => {
    const s = this.blueMedicalRemaining();
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

    this.subs.add(
      this.socket.matchFoulUpdated$.subscribe((evt) => {
        const match = this.activeMatch();
        if (!match || String(evt.matchId) !== String(match._id)) return;
        this.redWazaAri.set(evt.redWazaAri ?? 0);
        this.blueWazaAri.set(evt.blueWazaAri ?? 0);
        if (evt.redTotalScore !== undefined) this.redTotalScore.set(evt.redTotalScore);
        if (evt.blueTotalScore !== undefined) this.blueTotalScore.set(evt.blueTotalScore);
        this.redShido.set(evt.redShido ?? 0);
        this.blueShido.set(evt.blueShido ?? 0);
        // 使用 IPPON 計數（每次得分加 1，不論 +2 或 +3）
        if (evt.redIppons) {
          this.redParts.set([evt.redIppons.p1 ?? 0, evt.redIppons.p2 ?? 0, evt.redIppons.p3 ?? 0]);
        }
        if (evt.blueIppons) {
          this.blueParts.set([evt.blueIppons.p1 ?? 0, evt.blueIppons.p2 ?? 0, evt.blueIppons.p3 ?? 0]);
        }
        // CHUI count 追蹤：>0 時恆亮，-CHUI 執行後變 0 時熄滅
        if (evt.redChuiCount !== undefined) this.redChuiCount.set(evt.redChuiCount);
        if (evt.blueChuiCount !== undefined) this.blueChuiCount.set(evt.blueChuiCount);
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

  @HostListener("document:keydown.space", ["$event"])
  onSpaceKey(event: Event): void {
    if (this.view() !== "scoring") return;
    if (!this.timerSetupDone()) return;
    if (this.timerRemaining() <= 0 && !this.timerRunning()) return;
    event.preventDefault();
    if (this.timerRunning()) {
      this.pauseTimer();
    } else {
      this.resumeWithoutSave();
    }
  }

  ngOnDestroy(): void {
    this.clearTimerInterval();
    this.clearRedOsaeKomiInterval();
    this.clearBlueOsaeKomiInterval();
    this.clearRedMedicalInterval();
    this.clearBlueMedicalInterval();
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
      this.api
        .get<{ success: boolean; data: Match[] }>(
          `/events/${this.eventId()}/matches?matchType=fighting`,
        )
        .subscribe({
          next: (res) => {
            const fresh = res.data.find((m) => String(m._id) === String(match._id)) ?? match;
            startScoring(fresh);
            this.socket.emitMatchStarted(this.eventId(), fresh._id);
          },
          error: () => {
            startScoring(match);
            this.socket.emitMatchStarted(this.eventId(), match._id);
          },
        });
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
    // 根據 PART Score 恢復分數（而非 IPPON 計數）
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
    // 恢復 PART plus 計數器
    if ((match as any).redPartCounters) {
      this.redPartCounters.set((match as any).redPartCounters);
    }
    if ((match as any).bluePartCounters) {
      this.bluePartCounters.set((match as any).bluePartCounters);
    }
    this.redWazaAri.set(match.redWazaAri ?? 0);
    this.blueWazaAri.set(match.blueWazaAri ?? 0);
    this.redTotalScore.set(match.redTotalScore ?? 0);
    this.blueTotalScore.set(match.blueTotalScore ?? 0);
    this.redShido.set(match.redShido ?? 0);
    this.blueShido.set(match.blueShido ?? 0);
    this.redChuiCount.set((match as any).redChuiCount ?? 0);
    this.blueChuiCount.set((match as any).blueChuiCount ?? 0);

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
    const match = this.activeMatch();
    if (side === "red") {
      if (this.redOsaeKomiActive()) {
        // 停止
        this.clearRedOsaeKomiInterval();
        this.redOsaeKomiActive.set(false);
        this.redOsaeKomiRemaining.set(15);
        if (match) this.socket.emitOsaeKomiEnded(this.eventId(), match._id, "red");
      } else {
        // 開始
        this.startOsaeKomi("red");
      }
    } else {
      if (this.blueOsaeKomiActive()) {
        this.clearBlueOsaeKomiInterval();
        this.blueOsaeKomiActive.set(false);
        this.blueOsaeKomiRemaining.set(15);
        if (match) this.socket.emitOsaeKomiEnded(this.eventId(), match._id, "blue");
      } else {
        this.startOsaeKomi("blue");
      }
    }
  }

  private startOsaeKomi(side: "red" | "blue"): void {
    const DURATION = 15;
    const match = this.activeMatch();
    if (side === "red") {
      this.redOsaeKomiRemaining.set(DURATION);
      this.redOsaeKomiActive.set(true);
      if (match) this.socket.emitOsaeKomiStarted(this.eventId(), match._id, "red", DURATION);
      this.redOsaeKomiInterval = setInterval(() => {
        const newVal = Math.max(0, this.redOsaeKomiRemaining() - 1);
        this.redOsaeKomiRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearRedOsaeKomiInterval();
          this.redOsaeKomiActive.set(false);
          this.redOsaeKomiRemaining.set(15);
          if (match) this.socket.emitOsaeKomiEnded(this.eventId(), match._id, "red");
        }
      }, 1000);
    } else {
      this.blueOsaeKomiRemaining.set(DURATION);
      this.blueOsaeKomiActive.set(true);
      if (match) this.socket.emitOsaeKomiStarted(this.eventId(), match._id, "blue", DURATION);
      this.blueOsaeKomiInterval = setInterval(() => {
        const newVal = Math.max(0, this.blueOsaeKomiRemaining() - 1);
        this.blueOsaeKomiRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearBlueOsaeKomiInterval();
          this.blueOsaeKomiActive.set(false);
          this.blueOsaeKomiRemaining.set(15);
          if (match) this.socket.emitOsaeKomiEnded(this.eventId(), match._id, "blue");
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
  // MEDICAL 計時器
  // ──────────────────────────────────────────────────────────

  toggleMedical(side: "red" | "blue"): void {
    const match = this.activeMatch();
    if (side === "red") {
      if (this.redMedicalActive()) {
        // 停止：保留剩餘時間，不重置
        this.clearRedMedicalInterval();
        this.redMedicalActive.set(false);
        if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, "red");
        if (!this.blueMedicalActive()) this.startTimer();
      } else {
        if (this.redMedicalRemaining() <= 0) return;
        this.startMedical("red");
      }
    } else {
      if (this.blueMedicalActive()) {
        this.clearBlueMedicalInterval();
        this.blueMedicalActive.set(false);
        if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, "blue");
        if (!this.redMedicalActive()) this.startTimer();
      } else {
        if (this.blueMedicalRemaining() <= 0) return;
        this.startMedical("blue");
      }
    }
  }

  private startMedical(side: "red" | "blue"): void {
    const match = this.activeMatch();
    this.pauseTimer();
    if (side === "red") {
      this.redMedicalActive.set(true);
      if (match) {
        this.socket.emitInjuryStarted(this.eventId(), match._id, "red", this.redMedicalRemaining());
      }
      this.redMedicalInterval = setInterval(() => {
        const newVal = Math.max(0, this.redMedicalRemaining() - 1);
        this.redMedicalRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearRedMedicalInterval();
          this.redMedicalActive.set(false);
          if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, "red");
          if (!this.blueMedicalActive()) this.startTimer();
        }
      }, 1000);
    } else {
      this.blueMedicalActive.set(true);
      if (match) {
        this.socket.emitInjuryStarted(this.eventId(), match._id, "blue", this.blueMedicalRemaining());
      }
      this.blueMedicalInterval = setInterval(() => {
        const newVal = Math.max(0, this.blueMedicalRemaining() - 1);
        this.blueMedicalRemaining.set(newVal);
        if (newVal <= 0) {
          this.clearBlueMedicalInterval();
          this.blueMedicalActive.set(false);
          if (match) this.socket.emitInjuryEnded(this.eventId(), match._id, "blue");
          if (!this.redMedicalActive()) this.startTimer();
        }
      }, 1000);
    }
  }

  private clearRedMedicalInterval(): void {
    if (this.redMedicalInterval) {
      clearInterval(this.redMedicalInterval);
      this.redMedicalInterval = null;
    }
  }

  private clearBlueMedicalInterval(): void {
    if (this.blueMedicalInterval) {
      clearInterval(this.blueMedicalInterval);
      this.blueMedicalInterval = null;
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

    // Optimistic update（在 Angular zone 內，確保畫面即時反應）
    if (side === "red") {
      // 總計分永遠更新
      this.redTotalScore.update((v) => Math.max(0, v + delta));
      if (partIndex !== null) {
        // PART +2/+3：直接累加分數，不動 WAZA-ARI
        const parts = [...this.redParts()] as [number, number, number];
        parts[partIndex - 1] = Math.max(0, parts[partIndex - 1] + delta);
        this.redParts.set(parts);
        // 更新 PART plus 計數器
        const counters = JSON.parse(JSON.stringify(this.redPartCounters()));
        const pKey = `p${partIndex}` as "p1" | "p2" | "p3";
        if (delta === 2) counters[pKey].plus2 = Math.max(0, counters[pKey].plus2 + 1);
        else if (delta === -2) counters[pKey].plus2 = Math.max(0, counters[pKey].plus2 - 1);
        else if (delta === 3) counters[pKey].plus3 = Math.max(0, counters[pKey].plus3 + 1);
        else if (delta === -3) counters[pKey].plus3 = Math.max(0, counters[pKey].plus3 - 1);
        this.redPartCounters.set(counters);
      } else {
        // ALL PARTS +1/-1：同時更新 WAZA-ARI 計數
        this.redWazaAri.update((v) => Math.max(0, v + delta));
      }
    } else {
      this.blueTotalScore.update((v) => Math.max(0, v + delta));
      if (partIndex !== null) {
        const parts = [...this.blueParts()] as [number, number, number];
        parts[partIndex - 1] = Math.max(0, parts[partIndex - 1] + delta);
        this.blueParts.set(parts);
        // 更新 PART plus 計數器
        const counters = JSON.parse(JSON.stringify(this.bluePartCounters()));
        const pKey = `p${partIndex}` as "p1" | "p2" | "p3";
        if (delta === 2) counters[pKey].plus2 = Math.max(0, counters[pKey].plus2 + 1);
        else if (delta === -2) counters[pKey].plus2 = Math.max(0, counters[pKey].plus2 - 1);
        else if (delta === 3) counters[pKey].plus3 = Math.max(0, counters[pKey].plus3 + 1);
        else if (delta === -3) counters[pKey].plus3 = Math.max(0, counters[pKey].plus3 - 1);
        this.bluePartCounters.set(counters);
      } else {
        this.blueWazaAri.update((v) => Math.max(0, v + delta));
      }
    }

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
    // socket 事件（matchFoulUpdated）會以後端確認值修正 optimistic update
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
    if (oppSide === "red") {
      this.redWazaAri.update((v) => Math.max(0, v + shidoUnits * delta));
      this.redTotalScore.update((v) => Math.max(0, v + shidoUnits * delta));
    } else {
      this.blueWazaAri.update((v) => Math.max(0, v + shidoUnits * delta));
      this.blueTotalScore.update((v) => Math.max(0, v + shidoUnits * delta));
    }
    // CHUI count optimistic update
    if (foulType === "chui") {
      if (side === "red") {
        this.redChuiCount.update((v) => Math.max(0, v + delta));
      } else {
        this.blueChuiCount.update((v) => Math.max(0, v + delta));
      }
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

  resetMatchScores(): void {
    const match = this.activeMatch();
    if (!match) return;
    Swal.fire({
      icon: "warning",
      title: "歸零計分",
      text: "確定將本場所有得分、犯規、計時器全部清零？此操作無法復原。",
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
          this.resetScoringState();
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
    this.router.navigate(["/referee"]);
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
    this.redPartCounters.set({
      p1: { plus2: 0, plus3: 0 },
      p2: { plus2: 0, plus3: 0 },
      p3: { plus2: 0, plus3: 0 },
    });
    this.bluePartCounters.set({
      p1: { plus2: 0, plus3: 0 },
      p2: { plus2: 0, plus3: 0 },
      p3: { plus2: 0, plus3: 0 },
    });
    this.redWazaAri.set(0);
    this.blueWazaAri.set(0);
    this.redTotalScore.set(0);
    this.blueTotalScore.set(0);
    this.redShido.set(0);
    this.blueShido.set(0);
    this.fullIpponPending.set(false);
    this.shidoDqPending.set(null);
    this.timerSetupDone.set(false);
    this.timerBeforeAdjust.set(0);
    this.redChuiCount.set(0);
    this.blueChuiCount.set(0);
    this.judgeWinner.set(null);
    this.dqPending.set(null);
    this.clearRedOsaeKomiInterval();
    this.clearBlueOsaeKomiInterval();
    this.redOsaeKomiActive.set(false);
    this.blueOsaeKomiActive.set(false);
    this.redOsaeKomiRemaining.set(15);
    this.blueOsaeKomiRemaining.set(15);
    this.clearRedMedicalInterval();
    this.clearBlueMedicalInterval();
    this.redMedicalActive.set(false);
    this.blueMedicalActive.set(false);
    this.redMedicalRemaining.set(120);
    this.blueMedicalRemaining.set(120);
  }
}
