import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faShield,
  faBolt,
  faDragon,
  faCircleExclamation,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type SportType = 'kata-duo' | 'kata-show' | 'ne-waza' | 'fighting' | 'contact';

interface EventItem {
  _id: string;
  name: string;
  status: string;
  includedSports?: SportType[];
}

@Component({
  selector: 'app-referee-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './referee-landing.component.html',
})
export class RefereeLandingComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  faShield = faShield;
  faBolt = faBolt;
  faDragon = faDragon;
  faCircleExclamation = faCircleExclamation;
  faRightFromBracket = faRightFromBracket;

  event = signal<EventItem | null>(null);
  loading = signal(true);
  noEventAssigned = signal(false);

  ngOnInit(): void {
    const eventId = this.auth.user()?.eventId;
    if (!eventId) {
      this.noEventAssigned.set(true);
      this.loading.set(false);
      return;
    }
    this.api.get<{ success: boolean; data: EventItem }>(`/events/${eventId}`).subscribe({
      next: (res) => {
        this.event.set(res.success ? res.data : null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  hasSport(sport: SportType): boolean {
    const sports = this.event()?.includedSports;
    if (!sports || sports.length === 0) return true;
    return sports.includes(sport);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
