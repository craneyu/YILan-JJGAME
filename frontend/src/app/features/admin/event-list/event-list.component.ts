import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faPlus,
  faRightFromBracket,
  faTrash,
  faArrowRight,
  faPen,
  faCheck,
  faXmark,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { ApiService } from "../../../core/services/api.service";
import { AuthService } from "../../../core/services/auth.service";

export type SportType = "kata-duo" | "kata-show" | "ne-waza" | "fighting" | "contact";

export const SPORT_OPTIONS: { value: SportType; label: string; color: string }[] = [
  { value: "kata-duo", label: "雙人演武", color: "blue" },
  { value: "kata-show", label: "創意演武", color: "purple" },
  { value: "ne-waza", label: "寢技", color: "green" },
  { value: "fighting", label: "對打", color: "orange" },
  { value: "contact", label: "格鬥", color: "red" },
];

interface EventItem {
  _id: string;
  name: string;
  date?: string;
  venue?: string;
  status: string;
  includedSports?: SportType[];
  competitionTypes?: ("Duo" | "Show")[];
}

@Component({
  selector: "app-event-list",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: "./event-list.component.html",
})
export class EventListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private auth = inject(AuthService);

  faPlus = faPlus;
  faRightFromBracket = faRightFromBracket;
  faTrash = faTrash;
  faArrowRight = faArrowRight;
  faPen = faPen;
  faCheck = faCheck;
  faXmark = faXmark;
  faUserTie = faUserTie;

  readonly sportOptions = SPORT_OPTIONS;

  events = signal<EventItem[]>([]);
  showCreateForm = signal(false);
  newEvent = { name: "", date: "", venue: "" };
  newEventSports = signal<SportType[]>([]);

  // 編輯賽事
  editingEventId = signal<string | null>(null);
  editEventForm = { name: "", date: "", venue: "", status: "pending" as "pending" | "active" | "closed" };
  editEventSports = signal<SportType[]>([]);

  ngOnInit(): void {
    this.loadEvents();
  }

  private loadEvents(): void {
    this.api.get<{ success: boolean; data: EventItem[] }>("/events").subscribe({
      next: (res) => this.events.set(res.data),
    });
  }

  toggleNewSport(sport: SportType): void {
    const current = this.newEventSports();
    if (current.includes(sport)) {
      this.newEventSports.set(current.filter((s) => s !== sport));
    } else {
      this.newEventSports.set([...current, sport]);
    }
  }

  toggleEditSport(sport: SportType): void {
    const current = this.editEventSports();
    if (current.includes(sport)) {
      this.editEventSports.set(current.filter((s) => s !== sport));
    } else {
      this.editEventSports.set([...current, sport]);
    }
  }

  createEvent(): void {
    if (!this.newEvent.name) {
      Swal.fire({ icon: "warning", title: "請填寫賽事名稱", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
      return;
    }
    const includedSports = this.newEventSports();
    if (includedSports.length === 0) {
      Swal.fire({ icon: "warning", title: "請至少選擇一個運動項目", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
      return;
    }
    this.api
      .post<{ success: boolean; data: EventItem }>("/events", {
        ...this.newEvent,
        includedSports,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.events.update((e) => [res.data, ...e]);
            this.newEvent = { name: "", date: "", venue: "" };
            this.newEventSports.set([]);
            this.showCreateForm.set(false);
            Swal.fire({ icon: "success", title: "賽事已建立", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
          }
        },
        error: (err) =>
          Swal.fire({ icon: "error", title: err.error?.error ?? "建立失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 }),
      });
  }

  async deleteEvent(event: EventItem): Promise<void> {
    const result = await Swal.fire({
      title: "確認刪除賽事？",
      text: `「${event.name}」及其所有資料將被永久刪除，無法復原。`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "確認刪除",
      cancelButtonText: "取消",
      confirmButtonColor: "#ef4444",
      background: "#1e293b",
      color: "#fff",
    });
    if (!result.isConfirmed) return;
    this.api.delete<{ success: boolean }>(`/events/${event._id}`).subscribe({
      next: () => {
        this.events.update((e) => e.filter((ev) => ev._id !== event._id));
        Swal.fire({ icon: "success", title: "已刪除", toast: true, position: "top-end", showConfirmButton: false, timer: 1500 });
      },
      error: () =>
        Swal.fire({ icon: "error", title: "刪除失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 }),
    });
  }

  startEditEvent(event: EventItem): void {
    this.editingEventId.set(event._id);
    this.editEventForm = {
      name: event.name,
      date: event.date ? event.date.substring(0, 10) : "",
      venue: event.venue ?? "",
      status: event.status as "pending" | "active" | "closed",
    };
    this.editEventSports.set([...(event.includedSports ?? [])]);
  }

  cancelEditEvent(): void {
    this.editingEventId.set(null);
  }

  saveEditEvent(event: EventItem): void {
    if (!this.editEventForm.name) {
      Swal.fire({ icon: "warning", title: "請填寫賽事名稱", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
      return;
    }
    const includedSports = this.editEventSports();
    if (includedSports.length === 0) {
      Swal.fire({ icon: "warning", title: "請至少保留一個運動項目", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
      return;
    }
    this.api
      .patch<{ success: boolean; data: EventItem }>(`/events/${event._id}`, {
        name: this.editEventForm.name,
        date: this.editEventForm.date || undefined,
        venue: this.editEventForm.venue || undefined,
        status: this.editEventForm.status,
        includedSports,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.events.update((evts) => evts.map((e) => (e._id === event._id ? res.data : e)));
            this.editingEventId.set(null);
            Swal.fire({ icon: "success", title: "賽事已更新", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
          }
        },
        error: (err) =>
          Swal.fire({ icon: "error", title: err.error?.error ?? "更新失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 }),
      });
  }

  getSportLabel(sport: SportType): string {
    return SPORT_OPTIONS.find(o => o.value === sport)?.label ?? sport;
  }

  navigateToJudges(): void {
    this.router.navigate(["/admin/judges"]);
  }

  enterEvent(event: EventItem): void {
    this.router.navigate(["/admin/events", event._id]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
