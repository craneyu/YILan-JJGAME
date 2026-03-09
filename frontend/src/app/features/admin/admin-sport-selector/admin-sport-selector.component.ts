import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from "@angular/core";
import { Router } from "@angular/router";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faUsers,
  faStar,
  faShield,
  faBolt,
  faDragon,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-admin-sport-selector",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent],
  templateUrl: "./admin-sport-selector.component.html",
})
export class AdminSportSelectorComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  faUsers = faUsers;
  faStar = faStar;
  faShield = faShield;
  faBolt = faBolt;
  faDragon = faDragon;
  faRightFromBracket = faRightFromBracket;

  go(path: string): void {
    this.router.navigate([path]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
