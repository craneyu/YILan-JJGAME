import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHourglassHalf, faCheckCircle, faCheck, faRightFromBracket, faExpand, faCompress, faArrowsRotate } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { Router } from '@angular/router';

type JudgeState = 'waiting' | 'scoring' | 'submitted';

interface ScoreGroup {
  intPart: number | null;   // 0-9
  decPart: 0 | 0.5;        // .0 or .5
}

@Component({
  selector: 'app-creative-scoring-judge',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './creative-scoring-judge.component.html',
})
export class CreativeScoringJudgeComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private socket = inject(SocketService);
  private router = inject(Router);

  state = signal<JudgeState>('waiting');
  currentTeamId = signal<string | null>(null);
  currentTeamName = signal<string>('');
  loading = signal(false);
  isFullscreen = signal(false);

  // 技術分輸入
  technical = signal<ScoreGroup>({ intPart: null, decPart: 0 });
  // 表演分輸入
  artistic = signal<ScoreGroup>({ intPart: null, decPart: 0 });

  // 確認送出後顯示的結果
  submittedTechnical = signal<number | null>(null);
  submittedArtistic = signal<number | null>(null);

  technicalScore = computed(() => {
    const g = this.technical();
    return g.intPart === null ? null : g.intPart + g.decPart;
  });

  artisticScore = computed(() => {
    const g = this.artistic();
    return g.intPart === null ? null : g.intPart + g.decPart;
  });

  canSubmit = computed(() =>
    this.technicalScore() !== null && this.artisticScore() !== null && !this.loading()
  );

  // 9-grid 整數鍵盤排列（1-9 上方，0 最後）
  readonly intButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  faHourglassHalf = faHourglassHalf;
  faCheckCircle = faCheckCircle;
  faCheck = faCheck;
  faRightFromBracket = faRightFromBracket;
  faExpand = faExpand;
  faCompress = faCompress;
  faArrowsRotate = faArrowsRotate;

  hasMultipleTypes = computed(() => this.auth.eventCompetitionTypes().length > 1);
  currentTypeName = computed(() => this.auth.competitionType() === 'creative' ? '創意演武' : '雙人演武');

  private subs = new Subscription();

  ngOnInit(): void {
    const eventId = this.auth.user()?.eventId;
    if (!eventId) { this.router.navigate(['/login']); return; }

    this.socket.joinEvent(eventId);

    this.subs.add(
      this.socket.creativeScoringOpened$.subscribe((evt) => {
        if (evt.eventId !== eventId) return;
        this.currentTeamId.set(evt.teamId);
        this.currentTeamName.set(evt.teamName);
        this.technical.set({ intPart: null, decPart: 0 });
        this.artistic.set({ intPart: null, decPart: 0 });
        this.state.set('scoring');
      })
    );

    this.subs.add(
      this.socket.creativeTeamChanged$.subscribe((evt) => {
        if (evt.eventId !== eventId) return;
        this.technical.set({ intPart: null, decPart: 0 });
        this.artistic.set({ intPart: null, decPart: 0 });
        this.submittedTechnical.set(null);
        this.submittedArtistic.set(null);
        this.state.set('waiting');
      })
    );
  }

  ngOnDestroy(): void {
    const eventId = this.auth.user()?.eventId;
    if (eventId) this.socket.leaveEvent(eventId);
    this.subs.unsubscribe();
  }

  setInt(group: 'technical' | 'artistic', value: number): void {
    if (group === 'technical') {
      this.technical.update(g => ({ ...g, intPart: value }));
    } else {
      this.artistic.update(g => ({ ...g, intPart: value }));
    }
  }

  toggleDec(group: 'technical' | 'artistic'): void {
    if (group === 'technical') {
      this.technical.update(g => ({ ...g, decPart: g.decPart === 0 ? 0.5 : 0 }));
    } else {
      this.artistic.update(g => ({ ...g, decPart: g.decPart === 0 ? 0.5 : 0 }));
    }
  }

  submitScores(): void {
    const tech = this.technicalScore();
    const art = this.artisticScore();
    const teamId = this.currentTeamId();
    const eventId = this.auth.user()?.eventId;
    if (tech === null || art === null || !teamId || !eventId) return;

    this.loading.set(true);
    this.api.post<{ success: boolean }>('/creative-scores', {
      eventId,
      teamId,
      technicalScore: tech,
      artisticScore: art,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.submittedTechnical.set(tech);
        this.submittedArtistic.set(art);
        this.state.set('submitted');
        Swal.fire({ icon: 'success', title: '分數已送出', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? '送出失敗，請重試';
        Swal.fire({ icon: 'error', title: msg, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      },
    });
  }

  switchCompetitionType(): void {
    const newType = this.auth.competitionType() === 'creative' ? 'kata' : 'creative';
    this.auth.setCompetitionType(newType);
    this.router.navigate([newType === 'creative' ? '/creative/scoring' : '/judge/scoring']);
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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
