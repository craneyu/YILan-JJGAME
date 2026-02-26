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
}
