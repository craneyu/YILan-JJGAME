import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

import { ApiService } from "../../core/services/api.service";
import { AuthService } from "../../core/services/auth.service";
import { SocketService } from "../../core/services/socket.service";
import {
  Match,
  MatchCategory,
  MatchStatus,
} from "../../core/models/match.model";

const CATEGORY_LABEL: Record<MatchCategory, string> = {
  male: "男子組",
  female: "女子組",
  mixed: "混合組",
};

const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: "待開始",
  "in-progress": "進行中",
  "full-ippon-pending": "FULL IPPON",
  "shido-dq-pending": "SHIDO DQ",
  completed: "已完成",
};

@Component({
  selector: "app-match-referee",
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./match-referee.component.html",
})
export class MatchRefereeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private router = inject(Router);

  faRightFromBracket = faRightFromBracket;

  matches = signal<Match[]>([]);
  loading = signal(false);

  eventId = computed(() => this.auth.user()?.eventId ?? "");

  fightingMatches = computed(() => this.matches().filter((m) => m.matchType === "fighting"));
  neWazaMatches = computed(() => this.matches().filter((m) => m.matchType !== "fighting"));

  fightingActiveCount = computed(() =>
    this.fightingMatches().filter((m) => m.status !== "pending" && m.status !== "completed").length,
  );
  fightingPendingCount = computed(() =>
    this.fightingMatches().filter((m) => m.status === "pending").length,
  );
  fightingCompletedCount = computed(() =>
    this.fightingMatches().filter((m) => m.status === "completed").length,
  );
  neWazaActiveCount = computed(() =>
    this.neWazaMatches().filter((m) => m.status !== "pending" && m.status !== "completed").length,
  );
  neWazaPendingCount = computed(() =>
    this.neWazaMatches().filter((m) => m.status === "pending").length,
  );
  neWazaCompletedCount = computed(() =>
    this.neWazaMatches().filter((m) => m.status === "completed").length,
  );

  CATEGORY_LABEL = CATEGORY_LABEL;
  STATUS_LABEL = STATUS_LABEL;

  private subs = new Subscription();

  ngOnInit(): void {
    const eid = this.eventId();
    if (eid) {
      this.socket.joinEvent(eid);
      this.loadMatches();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    const eid = this.eventId();
    if (eid) this.socket.leaveEvent(eid);
  }

  loadMatches(): void {
    const eid = this.eventId();
    if (!eid) return;
    this.loading.set(true);
    this.api
      .get<{ success: boolean; data: Match[] }>(`/events/${eid}/matches`)
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.matches.set(res.data);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  selectSportType(type: "fighting" | "ne-waza"): void {
    this.router.navigate([type === "fighting" ? "/fighting-referee" : "/ne-waza-referee"]);
  }

  logout(): void {
    this.auth.logout();
    window.location.href = "/";
  }
}
