import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheckCircle, faHourglassHalf, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { Router } from '@angular/router';

interface ActionStatus {
  actionNo: string;
  done: boolean;
}

interface TeamInfo {
  _id: string;
  name: string;
  members: string[];
  category: string;
}

interface VRSummaryResponse {
  success: boolean;
  data: {
    event: { name: string };
    teams: TeamInfo[];
    gameState: {
      currentTeamId?: string;
      currentRound: number;
      status: string;
    } | null;
    completedActionNos: string[];
    vrScore: { throwVariety: number; groundVariety: number } | null;
  };
}

@Component({
  selector: 'app-vr-judge',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './vr-judge.component.html',
})
export class VrJudgeComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private socket = inject(SocketService);
  private router = inject(Router);

  private subs: Subscription[] = [];

  eventId = signal('');
  eventName = signal('');
  teams = signal<TeamInfo[]>([]);
  currentTeam = signal<TeamInfo | null>(null);
  currentRound = signal(1);
  groupIndex = signal(1);
  actionStatuses = signal<ActionStatus[]>([]);
  throwVariety = signal<number | null>(null);
  groundVariety = signal<number | null>(null);
  submitted = signal(false);

  allActionsDone = computed(() => this.actionStatuses().every((a) => a.done));
  allSelected = computed(() => this.throwVariety() !== null && this.groundVariety() !== null);
  roundLabel = computed(() => `R${this.currentRound()}-G${this.groupIndex()}`);
  seriesLabel = computed(() => ['A', 'B', 'C'][this.currentRound() - 1] ?? 'A');

  vrOptions = [2, 1, 0];
  faCheckCircle = faCheckCircle;
  faHourglassHalf = faHourglassHalf;
  faRightFromBracket = faRightFromBracket;

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (user?.eventId) {
      this.eventId.set(user.eventId);
      this.socket.joinEvent(user.eventId);
      this.loadSummary(user.eventId);
    }

    this.subs.push(
      this.socket.scoreCalculated$.subscribe((e) => {
        // 標記動作完成
        this.actionStatuses.update((statuses) =>
          statuses.map((s) => (s.actionNo === e.actionNo ? { ...s, done: true } : s))
        );
      }),

      this.socket.groupChanged$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        const idx = this.teams().findIndex((t) => t._id === e.nextTeamId);
        this.groupIndex.set(idx >= 0 ? idx + 1 : this.groupIndex() + 1);
        this.loadTeam(e.nextTeamId, e.round);
        this.currentRound.set(e.round);
        this.throwVariety.set(null);
        this.groundVariety.set(null);
        this.submitted.set(false);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  loadSummary(eventId: string): void {
    this.api.get<VRSummaryResponse>(`/events/${eventId}/summary`).subscribe((res) => {
      if (!res.success) return;
      const { event, teams, gameState, completedActionNos, vrScore } = res.data;

      this.eventName.set(event.name);
      this.teams.set(teams);

      if (!gameState?.currentTeamId) return;

      const team = teams.find((t) => t._id === gameState.currentTeamId);
      if (!team) return;

      this.currentTeam.set(team);
      this.currentRound.set(gameState.currentRound);
      this.groupIndex.set(teams.findIndex((t) => t._id === gameState.currentTeamId) + 1);

      // 初始化動作狀態，並從 completedActionNos 還原已完成動作
      const series = ['A', 'B', 'C'][gameState.currentRound - 1] ?? 'A';
      const count = team.category === 'male' ? 4 : 3;
      this.actionStatuses.set(
        Array.from({ length: count }, (_, i) => {
          const actionNo = `${series}${i + 1}`;
          return { actionNo, done: completedActionNos?.includes(actionNo) ?? false };
        })
      );

      // 還原 VR 已送出狀態
      if (vrScore) {
        this.throwVariety.set(vrScore.throwVariety);
        this.groundVariety.set(vrScore.groundVariety);
        this.submitted.set(true);
      }
    });
  }

  loadTeam(teamId: string, round: number): void {
    const team = this.teams().find((t) => t._id === teamId);
    if (!team) return;

    this.currentTeam.set(team);
    this.currentRound.set(round);
    const series = ['A', 'B', 'C'][round - 1] ?? 'A';
    const count = team.category === 'male' ? 4 : 3;
    this.actionStatuses.set(
      Array.from({ length: count }, (_, i) => ({ actionNo: `${series}${i + 1}`, done: false }))
    );
  }

  submit(): void {
    if (!this.allSelected() || !this.allActionsDone()) return;

    this.api.post<{ success: boolean }>('/vr-scores', {
      eventId: this.eventId(),
      teamId: this.currentTeam()?._id,
      round: this.currentRound(),
      throwVariety: this.throwVariety(),
      groundVariety: this.groundVariety(),
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.submitted.set(true);
          Swal.fire({ icon: 'success', title: '多樣性評分已送出', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: err.error?.error ?? '送出失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      },
    });
  }
}
