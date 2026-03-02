import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheckCircle, faHourglassHalf, faRightFromBracket, faBan, faTriangleExclamation, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { Router } from '@angular/router';

interface ActionStatus {
  actionNo: string;
  done: boolean;
  wrongAttack: boolean;
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
      currentTeamAbstained: boolean;
      status: string;
    } | null;
    completedActionNos: string[];
    wrongAttackActionNos: string[];
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
  teamAbstained = signal(false);

  allActionsDone = computed(() => this.actionStatuses().every((a) => a.done));
  allSelected = computed(() => this.throwVariety() !== null && this.groundVariety() !== null);
  roundLabel = computed(() => {
    const team = this.currentTeam();
    const cat = team ? team.category.toUpperCase() : '';
    return `${cat} R${this.currentRound()}-G${this.groupIndex()}`;
  });
  seriesLabel = computed(() => ['A', 'B', 'C'][this.currentRound() - 1] ?? 'A');

  vrOptions = [2, 1, 0];
  faCheckCircle = faCheckCircle;
  faHourglassHalf = faHourglassHalf;
  faRightFromBracket = faRightFromBracket;
  faBan = faBan;
  faExpand = faExpand;
  faCompress = faCompress;

  isFullscreen = signal(false);
  private onFullscreenChange = () => this.isFullscreen.set(!!document.fullscreenElement);
  faTriangleExclamation = faTriangleExclamation;

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    const user = this.auth.user();
    if (user?.eventId) {
      this.eventId.set(user.eventId);
      this.socket.joinEvent(user.eventId);
      this.loadSummary(user.eventId);
    }

    this.subs.push(
      this.socket.scoreCalculated$.subscribe((e) => {
        // 標記動作完成，並同步更新 wrongAttack 狀態
        this.actionStatuses.update((statuses) =>
          statuses.map((s) =>
            s.actionNo === e.actionNo
              ? { ...s, done: true, wrongAttack: e.wrongAttack ?? s.wrongAttack }
              : s
          )
        );
      }),

      this.socket.groupChanged$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        const nextTeam = this.teams().find((t) => t._id === e.nextTeamId);
        if (nextTeam) {
          const sameCategory = this.teams().filter((t) => t.category === nextTeam.category);
          const catIdx = sameCategory.findIndex((t) => t._id === e.nextTeamId);
          this.groupIndex.set(catIdx >= 0 ? catIdx + 1 : this.groupIndex() + 1);
        }
        this.loadTeam(e.nextTeamId, e.round);
        this.currentRound.set(e.round);
        this.throwVariety.set(null);
        this.groundVariety.set(null);
        this.submitted.set(false);
        this.teamAbstained.set(false);
      }),

      this.socket.teamAbstained$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.teamAbstained.set(true);
      }),
      this.socket.teamAbstainCancelled$.subscribe((e) => {
        if (e.eventId !== this.eventId()) return;
        this.teamAbstained.set(false);
      })
    );
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    this.subs.forEach((s) => s.unsubscribe());
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  loadSummary(eventId: string): void {
    this.api.get<VRSummaryResponse>(`/events/${eventId}/summary`).subscribe((res) => {
      if (!res.success) return;
      const { event, teams, gameState, completedActionNos, wrongAttackActionNos, vrScore } = res.data;

      this.eventName.set(event.name);
      this.teams.set(teams);

      if (gameState?.currentTeamAbstained) {
        this.teamAbstained.set(true);
      }

      if (!gameState?.currentTeamId) return;

      const team = teams.find((t) => t._id === gameState.currentTeamId);
      if (!team) return;

      this.currentTeam.set(team);
      this.currentRound.set(gameState.currentRound);
      const sameCategory = teams.filter((t) => t.category === team.category);
      const catIdx = sameCategory.findIndex((t) => t._id === gameState.currentTeamId);
      this.groupIndex.set(catIdx >= 0 ? catIdx + 1 : 1);

      // 初始化動作狀態，還原已完成與錯誤攻擊標記
      const series = ['A', 'B', 'C'][gameState.currentRound - 1] ?? 'A';
      const count = team.category === 'male' ? 4 : 3;
      this.actionStatuses.set(
        Array.from({ length: count }, (_, i) => {
          const actionNo = `${series}${i + 1}`;
          return {
            actionNo,
            done: completedActionNos?.includes(actionNo) ?? false,
            wrongAttack: wrongAttackActionNos?.includes(actionNo) ?? false,
          };
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
      Array.from({ length: count }, (_, i) => ({
        actionNo: `${series}${i + 1}`,
        done: false,
        wrongAttack: false,
      }))
    );
  }

  // Toggle 錯誤攻擊（只有已完成的動作才可操作）
  toggleWrongAttack(actionNo: string): void {
    const action = this.actionStatuses().find((a) => a.actionNo === actionNo);
    if (!action?.done) return;

    this.api.post<{ success: boolean; data: { isWrongAttack: boolean } }>('/wrong-attacks', {
      eventId: this.eventId(),
      teamId: this.currentTeam()?._id,
      round: this.currentRound(),
      actionNo,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          const isWrong = res.data.isWrongAttack;
          this.actionStatuses.update((statuses) =>
            statuses.map((s) => s.actionNo === actionNo ? { ...s, wrongAttack: isWrong } : s)
          );
          Swal.fire({
            icon: isWrong ? 'warning' : 'info',
            title: `${actionNo} ${isWrong ? '已標記錯誤攻擊' : '已取消錯誤攻擊'}`,
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
          });
        }
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: err.error?.error ?? '操作失敗',
          toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
        });
      },
    });
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
