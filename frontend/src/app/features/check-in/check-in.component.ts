import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faCheck,
  faXmark,
  faPersonRunning,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { Subscription } from "rxjs";
import { ApiService } from "../../core/services/api.service";
import { AuthService } from "../../core/services/auth.service";
import { SocketService } from "../../core/services/socket.service";

type Tab = "weighin" | "checkin";

type WeighInStatus = "pending" | "passed" | "failed" | "n/a";
type CheckInStatus = "pending" | "present" | "absent";

interface MemberDto {
  name: string;
  weighInStatus: WeighInStatus;
  checkInStatus: CheckInStatus;
  weighInAt?: string;
  checkInAt?: string;
  disqualifyReason?: string;
}

interface TeamDto {
  teamId: string;
  name: string;
  competitionType: "Duo" | "Show";
  category: string;
  tier: string | null;
  order: number;
  members: MemberDto[];
  teamCheckedIn: boolean;
}

interface FlatMemberRow {
  teamId: string;
  teamName: string;
  competitionType: "Duo" | "Show";
  tier: string | null;
  memberIndex: number;
  member: MemberDto;
}

@Component({
  selector: "app-check-in",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FaIconComponent],
  templateUrl: "./check-in.component.html",
})
export class CheckInComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private socket = inject(SocketService);

  faCheck = faCheck;
  faXmark = faXmark;
  faPersonRunning = faPersonRunning;
  faRightFromBracket = faRightFromBracket;

  activeTab = signal<Tab>("weighin");
  teams = signal<TeamDto[]>([]);
  loading = signal(true);
  eventId = signal<string | null>(null);

  flatMembers = computed<FlatMemberRow[]>(() => {
    const rows: FlatMemberRow[] = [];
    for (const t of this.teams()) {
      t.members.forEach((m, idx) => {
        rows.push({
          teamId: t.teamId,
          teamName: t.name,
          competitionType: t.competitionType,
          tier: t.tier,
          memberIndex: idx,
          member: m,
        });
      });
    }
    return rows;
  });

  weighInRows = computed(() =>
    this.flatMembers().filter((r) => r.member.weighInStatus !== "n/a"),
  );

  checkInRows = computed(() => this.flatMembers());

  private subs = new Subscription();

  ngOnInit(): void {
    Swal.close();
    const eid = this.auth.user()?.eventId ?? null;
    this.eventId.set(eid);
    if (!eid) {
      this.loading.set(false);
      return;
    }
    this.socket.joinEvent(eid);
    this.loadParticipants(eid);
    this.subs.add(
      this.socket.participantStatusChanged$.subscribe((evt) => {
        this.teams.update((list) =>
          list.map((t) => {
            if (t.teamId !== evt.teamId) return t;
            const members = t.members.map((m, idx) =>
              idx === evt.memberIndex
                ? {
                    ...m,
                    weighInStatus: evt.weighInStatus,
                    checkInStatus: evt.checkInStatus,
                    disqualifyReason: evt.disqualifyReason,
                  }
                : m,
            );
            return {
              ...t,
              members,
              teamCheckedIn: members.every((m) => m.checkInStatus === "present"),
            };
          }),
        );
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  switchTab(t: Tab): void {
    this.activeTab.set(t);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }

  private loadParticipants(eventId: string): void {
    this.loading.set(true);
    this.api
      .get<{ success: boolean; data: TeamDto[] }>(
        `/events/${eventId}/participants`,
      )
      .subscribe({
        next: (res) => {
          this.teams.set(res.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  weighInBadge(s: WeighInStatus): { label: string; cls: string } {
    switch (s) {
      case "passed":
        return { label: "通過", cls: "bg-emerald-500/20 text-emerald-300" };
      case "failed":
        return { label: "失格", cls: "bg-red-500/20 text-red-300" };
      case "n/a":
        return { label: "免過磅", cls: "bg-white/5 text-white/40 italic" };
      default:
        return { label: "待過磅", cls: "bg-white/10 text-white/60" };
    }
  }

  checkInBadge(s: CheckInStatus): { label: string; cls: string } {
    switch (s) {
      case "present":
        return { label: "到場", cls: "bg-emerald-500/20 text-emerald-300" };
      case "absent":
        return { label: "未到", cls: "bg-red-500/20 text-red-300" };
      default:
        return { label: "待檢錄", cls: "bg-white/10 text-white/60" };
    }
  }

  async setWeighIn(
    row: FlatMemberRow,
    status: "passed" | "failed",
  ): Promise<void> {
    const eid = this.eventId();
    if (!eid) return;
    let reason: string | undefined;
    if (status === "failed") {
      const { value, isConfirmed } = await Swal.fire({
        title: "失格原因",
        input: "text",
        inputPlaceholder: "例：超重 1.5kg",
        showCancelButton: true,
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
      if (!isConfirmed) return;
      reason = value || undefined;
    }
    this.api
      .patch<{ success: boolean }>(
        `/events/${eid}/participants/${row.teamId}/${row.memberIndex}/weigh-in`,
        { status, reason },
      )
      .subscribe({
        next: () => this.loadParticipants(eid),
        error: (err) => {
          Swal.fire({
            icon: "error",
            title: "操作失敗",
            text: err.error?.error ?? "請重試",
            background: "#1e293b",
            color: "#fff",
          });
        },
      });
  }

  async setCheckIn(
    row: FlatMemberRow,
    status: "present" | "absent",
  ): Promise<void> {
    const eid = this.eventId();
    if (!eid) return;
    let reason: string | undefined;
    if (status === "absent") {
      const { value, isConfirmed } = await Swal.fire({
        title: "未到原因",
        input: "text",
        inputPlaceholder: "例：報到時間已過",
        showCancelButton: true,
        background: "#1e293b",
        color: "#fff",
        confirmButtonColor: "#ef4444",
      });
      if (!isConfirmed) return;
      reason = value || undefined;
    }
    this.api
      .patch<{ success: boolean }>(
        `/events/${eid}/participants/${row.teamId}/${row.memberIndex}/check-in`,
        { status, reason },
      )
      .subscribe({
        next: () => this.loadParticipants(eid),
        error: (err) => {
          Swal.fire({
            icon: "error",
            title: "操作失敗",
            text: err.error?.error ?? "請重試",
            background: "#1e293b",
            color: "#fff",
          });
        },
      });
  }
}
