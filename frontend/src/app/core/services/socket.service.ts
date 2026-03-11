import { Injectable } from "@angular/core";
import { Observable, fromEvent } from "rxjs";
import { io, Socket } from "socket.io-client";
import { environment } from "../../../environments/environment";

export interface ActionOpenedEvent {
  eventId: string;
  teamId: string;
  round: number;
  actionNo: string;
}

export interface ScoreSubmittedEvent {
  judgeId: string;
  judgeNo: number;
  teamId: string;
  round: number;
  actionNo: string;
  items: Record<string, number>;
}

export interface ScoreCalculatedEvent {
  teamId: string;
  round: number;
  actionNo: string;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5?: number;
  actionTotal: number;
  wrongAttack?: boolean;
}

export interface VrSubmittedEvent {
  teamId: string;
  round: number;
  throwVariety: number;
  groundVariety: number;
}

export interface GroupChangedEvent {
  eventId: string;
  nextTeamId: string;
  round: number;
}

export interface RoundChangedEvent {
  eventId: string;
  round: number;
}

export interface TeamAbstainedEvent {
  eventId: string;
  teamId: string;
}

export interface WrongAttackUpdatedEvent {
  teamId: string;
  round: number;
  actionNo: string;
  wrongAttack: boolean;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5?: number;
  actionTotal: number;
}

// ── 創意演武事件 ──
export interface CreativeScoringOpenedEvent {
  eventId: string;
  teamId: string;
  teamName: string;
  members: string[];
  category: string;
}

export interface CreativePenaltyItem {
  type: string;
  deduction: number;
  count: number;
}

export interface CreativeScoreCalculatedEvent {
  eventId: string;
  teamId: string;
  technicalTotal: number;
  artisticTotal: number;
  grandTotal: number;
  penaltyDeduction: number;
  finalScore: number;
  penalties: CreativePenaltyItem[];
}

export interface CreativeScoreSubmittedEvent {
  eventId: string;
  teamId: string;
  judgeNo: number;
  technicalScore: number;
  artisticScore: number;
}

export interface CreativeTeamChangedEvent {
  eventId: string;
  nextTeamId: string | null;
}

export interface CreativeTeamAbstainedEvent {
  eventId: string;
  teamId: string;
}

export interface TimerStartedEvent {
  eventId: string;
  timerStartedAt: string;
  elapsedMs: number;
  teamName?: string;
  members?: string[];
  category?: string;
}

export interface TimerStoppedEvent {
  eventId: string;
  elapsedMs: number;
}

export interface PenaltyUpdatedEvent {
  eventId: string;
  teamId: string;
  penalties: string[];
  penaltyDeduction: number;
  finalScore?: number;
}

// ── 裁判判決預覽事件 ──
export interface MatchWinnerPreviewEvent {
  matchId: string;
  winner: "red" | "blue";
}

// ── 柔術場次傷停事件 ──
export interface InjuryStartedEvent {
  eventId: string;
  matchId: string;
  side: "red" | "blue";
  durationSec?: number;
}

export interface InjuryEndedEvent {
  eventId: string;
  matchId: string;
  side: "red" | "blue";
}

// ── 對打計分事件 ──
export interface MatchFoulUpdatedEvent {
  matchId: string;
  redWazaAri: number;
  blueWazaAri: number;
  redShido: number;
  blueShido: number;
  redPart1Score?: number;
  redPart2Score?: number;
  redPart3Score?: number;
  bluePart1Score?: number;
  bluePart2Score?: number;
  bluePart3Score?: number;
  redIppons?: { p1: number; p2: number; p3: number };
  blueIppons?: { p1: number; p2: number; p3: number };
  chuiEvent?: "red" | "blue" | null;
}

export interface MatchFullIpponEvent {
  matchId: string;
  suggestedWinner: "red" | "blue";
}

export interface MatchShidoDqEvent {
  matchId: string;
  suggestedDisqualified: "red" | "blue";
  suggestedWinner: "red" | "blue";
  shidoCount: number;
}

// ── 柔術場次事件 ──
export interface MatchScoreUpdatedEvent {
  matchId: string;
  side: "red" | "blue";
  scores: { red: number; blue: number };
  advantages: { red: number; blue: number };
  warnings: { red: number; blue: number };
}

export interface MatchTimerUpdatedEvent {
  matchId: string;
  remaining: number;
  paused: boolean;
}

export interface MatchEndedEvent {
  matchId: string;
  winner: "red" | "blue";
  method: "judge" | "submission" | "dq";
}

@Injectable({ providedIn: "root" })
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(environment.socketUrl || window.location.origin, {
      transports: ["websocket"],
    });
  }

  joinEvent(eventId: string): void {
    this.socket.emit("join:event", eventId);
  }

  leaveEvent(eventId: string): void {
    this.socket.emit("leave:event", eventId);
  }

  get actionOpened$(): Observable<ActionOpenedEvent> {
    return fromEvent<ActionOpenedEvent>(this.socket, "action:opened");
  }

  get scoreSubmitted$(): Observable<ScoreSubmittedEvent> {
    return fromEvent<ScoreSubmittedEvent>(this.socket, "score:submitted");
  }

  get scoreCalculated$(): Observable<ScoreCalculatedEvent> {
    return fromEvent<ScoreCalculatedEvent>(this.socket, "score:calculated");
  }

  get vrSubmitted$(): Observable<VrSubmittedEvent> {
    return fromEvent<VrSubmittedEvent>(this.socket, "vr:submitted");
  }

  get groupChanged$(): Observable<GroupChangedEvent> {
    return fromEvent<GroupChangedEvent>(this.socket, "group:changed");
  }

  get roundChanged$(): Observable<RoundChangedEvent> {
    return fromEvent<RoundChangedEvent>(this.socket, "round:changed");
  }

  get teamAbstained$(): Observable<TeamAbstainedEvent> {
    return fromEvent<TeamAbstainedEvent>(this.socket, "team:abstained");
  }

  get teamAbstainCancelled$(): Observable<TeamAbstainedEvent> {
    return fromEvent<TeamAbstainedEvent>(this.socket, "team:abstain-cancelled");
  }

  get wrongAttackUpdated$(): Observable<WrongAttackUpdatedEvent> {
    return fromEvent<WrongAttackUpdatedEvent>(
      this.socket,
      "wrongAttack:updated",
    );
  }

  // ── 創意演武 ──
  get creativeScoreSubmitted$(): Observable<CreativeScoreSubmittedEvent> {
    return fromEvent<CreativeScoreSubmittedEvent>(
      this.socket,
      "creative-score:submitted",
    );
  }

  get creativeScoringOpened$(): Observable<CreativeScoringOpenedEvent> {
    return fromEvent<CreativeScoringOpenedEvent>(
      this.socket,
      "creative:scoring-opened",
    );
  }

  get creativeScoreCalculated$(): Observable<CreativeScoreCalculatedEvent> {
    return fromEvent<CreativeScoreCalculatedEvent>(
      this.socket,
      "creative-score:calculated",
    );
  }

  get creativeTeamChanged$(): Observable<CreativeTeamChangedEvent> {
    return fromEvent<CreativeTeamChangedEvent>(
      this.socket,
      "creative:team-changed",
    );
  }

  get creativeTeamAbstained$(): Observable<CreativeTeamAbstainedEvent> {
    return fromEvent<CreativeTeamAbstainedEvent>(
      this.socket,
      "creative:team-abstained",
    );
  }

  get creativeTeamAbstainCancelled$(): Observable<CreativeTeamAbstainedEvent> {
    return fromEvent<CreativeTeamAbstainedEvent>(
      this.socket,
      "creative:team-abstain-cancelled",
    );
  }

  get timerStarted$(): Observable<TimerStartedEvent> {
    return fromEvent<TimerStartedEvent>(this.socket, "timer:started");
  }

  get timerStopped$(): Observable<TimerStoppedEvent> {
    return fromEvent<TimerStoppedEvent>(this.socket, "timer:stopped");
  }

  get penaltyUpdated$(): Observable<PenaltyUpdatedEvent> {
    return fromEvent<PenaltyUpdatedEvent>(this.socket, "penalty:updated");
  }

  // ── 柔術場次 ──
  get matchScoreUpdated$(): Observable<MatchScoreUpdatedEvent> {
    return fromEvent<MatchScoreUpdatedEvent>(
      this.socket,
      "match:score-updated",
    );
  }

  get matchTimerUpdated$(): Observable<MatchTimerUpdatedEvent> {
    return fromEvent<MatchTimerUpdatedEvent>(
      this.socket,
      "match:timer-updated",
    );
  }

  get matchEnded$(): Observable<MatchEndedEvent> {
    return fromEvent<MatchEndedEvent>(this.socket, "match:ended");
  }

  // ── 柔術場次 emit（裁判端發送）──
  emitMatchScoreUpdated(
    eventId: string,
    matchId: string,
    scores: { red: number; blue: number },
    advantages: { red: number; blue: number },
    warnings: { red: number; blue: number },
  ): void {
    // 直接廣播給 server，server 再轉發給 eventId 房間
    // 因此這裡直接 emit 到 socket，不過由後端 broadcast；
    // 此 emit 是由 component 呼叫 API 後再手動觸發以確保 audience 同步。
    // 實際上此事件由 server 端 broadcast.matchScoreUpdated 廣播，元件呼叫此方法僅供後端連線外的備援
    this.socket.emit("match:emit-score", {
      eventId,
      matchId,
      scores,
      advantages,
      warnings,
    });
  }

  emitMatchTimerUpdated(
    eventId: string,
    matchId: string,
    remaining: number,
    paused: boolean,
  ): void {
    this.socket.emit("match:emit-timer", {
      eventId,
      matchId,
      remaining,
      paused,
    });
  }

  emitMatchEnded(
    eventId: string,
    matchId: string,
    winner: "red" | "blue",
    method: string,
  ): void {
    this.socket.emit("match:emit-ended", { eventId, matchId, winner, method });
  }

  // ── 場次開始通知 ──
  get matchStarted$(): Observable<{ matchId: string }> {
    return fromEvent<{ matchId: string }>(this.socket, "match:started");
  }

  emitMatchStarted(eventId: string, matchId: string): void {
    this.socket.emit("match:emit-started", { eventId, matchId });
  }

  // ── 裁判判決預覽 ──
  get matchWinnerPreview$(): Observable<MatchWinnerPreviewEvent> {
    return fromEvent<MatchWinnerPreviewEvent>(this.socket, "match:winner-preview");
  }

  emitMatchWinnerPreview(
    eventId: string,
    matchId: string,
    winner: "red" | "blue",
  ): void {
    this.socket.emit("match:emit-winner-preview", { eventId, matchId, winner });
  }

  get matchWinnerPreviewCancelled$(): Observable<{ matchId: string }> {
    return fromEvent<{ matchId: string }>(this.socket, "match:winner-preview-cancelled");
  }

  emitMatchWinnerPreviewCancel(eventId: string, matchId: string): void {
    this.socket.emit("match:emit-winner-preview-cancel", { eventId, matchId });
  }

  get matchScoresReset$(): Observable<{ matchId: string }> {
    return fromEvent<{ matchId: string }>(this.socket, "match:scores-reset");
  }

  get matchFoulUpdated$(): Observable<MatchFoulUpdatedEvent> {
    return fromEvent<MatchFoulUpdatedEvent>(this.socket, "match:foul-updated");
  }

  get matchFullIppon$(): Observable<MatchFullIpponEvent> {
    return fromEvent<MatchFullIpponEvent>(this.socket, "match:full-ippon");
  }

  get matchShidoDq$(): Observable<MatchShidoDqEvent> {
    return fromEvent<MatchShidoDqEvent>(this.socket, "match:shido-dq");
  }

  // ── 傷停事件 ──
  get injuryStarted$(): Observable<InjuryStartedEvent> {
    return fromEvent<InjuryStartedEvent>(this.socket, "injury:started");
  }

  get injuryEnded$(): Observable<InjuryEndedEvent> {
    return fromEvent<InjuryEndedEvent>(this.socket, "injury:ended");
  }

  emitInjuryStarted(
    eventId: string,
    matchId: string,
    side: "red" | "blue",
    durationSec?: number,
  ): void {
    this.socket.emit("match:emit-injury-start", {
      eventId,
      matchId,
      side,
      durationSec,
    });
  }

  emitInjuryEnded(
    eventId: string,
    matchId: string,
    side: "red" | "blue",
  ): void {
    this.socket.emit("match:emit-injury-end", { eventId, matchId, side });
  }
}
