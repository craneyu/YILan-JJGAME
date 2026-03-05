import { Injectable } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(environment.socketUrl || window.location.origin, {
      transports: ['websocket'],
    });
  }

  joinEvent(eventId: string): void {
    this.socket.emit('join:event', eventId);
  }

  leaveEvent(eventId: string): void {
    this.socket.emit('leave:event', eventId);
  }

  get actionOpened$(): Observable<ActionOpenedEvent> {
    return fromEvent<ActionOpenedEvent>(this.socket, 'action:opened');
  }

  get scoreSubmitted$(): Observable<ScoreSubmittedEvent> {
    return fromEvent<ScoreSubmittedEvent>(this.socket, 'score:submitted');
  }

  get scoreCalculated$(): Observable<ScoreCalculatedEvent> {
    return fromEvent<ScoreCalculatedEvent>(this.socket, 'score:calculated');
  }

  get vrSubmitted$(): Observable<VrSubmittedEvent> {
    return fromEvent<VrSubmittedEvent>(this.socket, 'vr:submitted');
  }

  get groupChanged$(): Observable<GroupChangedEvent> {
    return fromEvent<GroupChangedEvent>(this.socket, 'group:changed');
  }

  get roundChanged$(): Observable<RoundChangedEvent> {
    return fromEvent<RoundChangedEvent>(this.socket, 'round:changed');
  }

  get teamAbstained$(): Observable<TeamAbstainedEvent> {
    return fromEvent<TeamAbstainedEvent>(this.socket, 'team:abstained');
  }

  get teamAbstainCancelled$(): Observable<TeamAbstainedEvent> {
    return fromEvent<TeamAbstainedEvent>(this.socket, 'team:abstain-cancelled');
  }

  get wrongAttackUpdated$(): Observable<WrongAttackUpdatedEvent> {
    return fromEvent<WrongAttackUpdatedEvent>(this.socket, 'wrongAttack:updated');
  }

  // ── 創意演武 ──
  get creativeScoreSubmitted$(): Observable<CreativeScoreSubmittedEvent> {
    return fromEvent<CreativeScoreSubmittedEvent>(this.socket, 'creative-score:submitted');
  }

  get creativeScoringOpened$(): Observable<CreativeScoringOpenedEvent> {
    return fromEvent<CreativeScoringOpenedEvent>(this.socket, 'creative:scoring-opened');
  }

  get creativeScoreCalculated$(): Observable<CreativeScoreCalculatedEvent> {
    return fromEvent<CreativeScoreCalculatedEvent>(this.socket, 'creative-score:calculated');
  }

  get creativeTeamChanged$(): Observable<CreativeTeamChangedEvent> {
    return fromEvent<CreativeTeamChangedEvent>(this.socket, 'creative:team-changed');
  }

  get timerStarted$(): Observable<TimerStartedEvent> {
    return fromEvent<TimerStartedEvent>(this.socket, 'timer:started');
  }

  get timerStopped$(): Observable<TimerStoppedEvent> {
    return fromEvent<TimerStoppedEvent>(this.socket, 'timer:stopped');
  }

  get penaltyUpdated$(): Observable<PenaltyUpdatedEvent> {
    return fromEvent<PenaltyUpdatedEvent>(this.socket, 'penalty:updated');
  }
}
