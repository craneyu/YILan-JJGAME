import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  inject,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faUsers,
  faShield,
  faBolt,
  faDragon,
  faRightFromBracket,
  faArrowLeft,
  faPersonRunning,
  faPeopleGroup,
} from "@fortawesome/free-solid-svg-icons";
import { AuthService } from "../../../core/services/auth.service";
import { ApiService } from "../../../core/services/api.service";

type SportType = "kata-duo" | "kata-show" | "ne-waza" | "fighting" | "contact";

interface EventItem {
  _id: string;
  name: string;
  includedSports?: SportType[];
}

@Component({
  selector: "app-admin-sport-selector",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent],
  templateUrl: "./admin-sport-selector.component.html",
})
export class AdminSportSelectorComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private api = inject(ApiService);

  faUsers = faUsers;
  faShield = faShield;
  faBolt = faBolt;
  faDragon = faDragon;
  faRightFromBracket = faRightFromBracket;
  faArrowLeft = faArrowLeft;
  faPersonRunning = faPersonRunning;
  faPeopleGroup = faPeopleGroup;

  eventId = '';
  event = signal<EventItem | null>(null);

  ngOnInit(): void {
    this.eventId = this.route.snapshot.params['eventId'] as string;
    this.api.get<{ success: boolean; data: EventItem }>(`/events/${this.eventId}`).subscribe({
      next: (res) => this.event.set(res.data),
    });
  }

  hasSport(sport: SportType): boolean {
    const sports = this.event()?.includedSports;
    if (!sports || sports.length === 0) return true; // 舊資料相容：無設定則全顯示
    return sports.includes(sport);
  }

  hasKata(): boolean {
    return this.hasSport('kata-duo') || this.hasSport('kata-show');
  }

  go(path: string): void {
    this.router.navigate([path]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
