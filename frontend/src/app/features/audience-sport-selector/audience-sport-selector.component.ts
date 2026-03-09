import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faUsers,
  faStar,
  faShield,
  faBolt,
  faDragon,
  faCircleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { ApiService } from '../../core/services/api.service';

interface EventItem {
  _id: string;
  name: string;
  status: string;
}

@Component({
  selector: 'app-audience-sport-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './audience-sport-selector.component.html',
})
export class AudienceSportSelectorComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  faUsers = faUsers;
  faStar = faStar;
  faShield = faShield;
  faBolt = faBolt;
  faDragon = faDragon;
  faCircleExclamation = faCircleExclamation;

  activeEvent = signal<EventItem | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const eventId = this.route.snapshot.queryParamMap.get('eventId');
    if (eventId) {
      this.api.get<{ success: boolean; data: EventItem }>(`/events/${eventId}`).subscribe({
        next: (res) => {
          this.activeEvent.set(res.success ? res.data : null);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.api.get<{ success: boolean; data: EventItem[] }>('/events?open=true').subscribe({
        next: (res) => {
          this.activeEvent.set(res.data[0] ?? null);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  go(path: string, queryParams: Record<string, string> = {}): void {
    this.router.navigate([path], { queryParams });
  }

  navigateTo(sport: 'kata' | 'creative' | 'ne-waza' | 'fighting' | 'contact'): void {
    const event = this.activeEvent();
    if (!event) return;
    const eventId = event._id;

    switch (sport) {
      case 'kata':
        this.go('/audience', { eventId });
        break;
      case 'creative':
        this.go('/creative/audience', { eventId });
        break;
      case 'ne-waza':
        this.go('/match-audience', { matchType: 'ne-waza', eventId });
        break;
      case 'fighting':
        this.go('/match-audience', { matchType: 'fighting', eventId });
        break;
      case 'contact':
        this.go('/match-audience', { matchType: 'contact', eventId });
        break;
    }
  }
}
