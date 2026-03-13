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
  faArrowLeft,
  faRightFromBracket,
  faKey,
  faArrowsRotate,
  faPlus,
  faPen,
  faTrash,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { ApiService } from "../../../core/services/api.service";
import { AuthService } from "../../../core/services/auth.service";

interface JudgeUser {
  _id: string;
  username: string;
  role: string;
  judgeNo?: number;
  eventId?: { _id: string; name: string } | null;
}

interface EventItem {
  _id: string;
  name: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "scoring_judge", label: "計分裁判" },
  { value: "vr_judge", label: "VR 裁判" },
  { value: "sequence_judge", label: "賽序裁判" },
  { value: "match_referee", label: "場次裁判" },
  { value: "admin", label: "管理員" },
];

@Component({
  selector: "app-judge-management",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: "./judge-management.component.html",
})
export class JudgeManagementComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  faArrowLeft = faArrowLeft;
  faRightFromBracket = faRightFromBracket;
  faKey = faKey;
  faArrowsRotate = faArrowsRotate;
  faPlus = faPlus;
  faPen = faPen;
  faTrash = faTrash;
  faCheck = faCheck;
  faXmark = faXmark;

  readonly roleOptions = ROLE_OPTIONS;

  judges = signal<JudgeUser[]>([]);
  events = signal<EventItem[]>([]);

  // 新增帳號
  showCreateForm = signal(false);
  newUserForm = { username: "", password: "", role: "scoring_judge" };

  // inline 角色編輯
  editingUserId = signal<string | null>(null);
  editingRole = "";

  ngOnInit(): void {
    this.loadJudges();
    this.loadEvents();
  }

  loadJudges(): void {
    this.api.get<{ success: boolean; data: JudgeUser[] }>("/auth/users").subscribe({
      next: (res) => this.judges.set(res.data),
    });
  }

  loadEvents(): void {
    this.api.get<{ success: boolean; data: EventItem[] }>("/events").subscribe({
      next: (res) => this.events.set(res.data),
    });
  }

  assignJudgeEvent(judgeId: string, eventId: string): void {
    this.api
      .patch<{ success: boolean; data: JudgeUser }>(`/auth/users/${judgeId}/event`, { eventId: eventId || null })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.judges.update((j) => j.map((u) => (u._id === judgeId ? res.data : u)));
            Swal.fire({ icon: "success", title: "已更新指派", toast: true, position: "top-end", showConfirmButton: false, timer: 1500 });
          }
        },
        error: () =>
          Swal.fire({ icon: "error", title: "指派失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 }),
      });
  }

  async changePassword(judge: JudgeUser): Promise<void> {
    const { value: newPassword } = await Swal.fire({
      title: `變更「${judge.username}」的密碼`,
      input: "password",
      inputLabel: "新密碼",
      inputPlaceholder: "請輸入新密碼（至少 4 個字元）",
      inputAttributes: { autocomplete: "new-password" },
      showCancelButton: true,
      confirmButtonText: "確認變更",
      cancelButtonText: "取消",
      inputValidator: (value) => {
        if (!value || value.length < 4) return "密碼長度至少 4 個字元";
        return null;
      },
    });
    if (!newPassword) return;

    this.api
      .patch<{ success: boolean }>(`/auth/users/${judge._id}/password`, { newPassword })
      .subscribe({
        next: () =>
          Swal.fire({ icon: "success", title: "密碼已變更", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 }),
        error: (err) =>
          Swal.fire({ icon: "error", title: err.error?.error ?? "變更失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 }),
      });
  }

  createUser(): void {
    const { username, password, role } = this.newUserForm;
    if (!username || !password || !role) {
      Swal.fire({ icon: "warning", title: "請填寫所有欄位", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
      return;
    }
    this.api.post<{ success: boolean }>("/auth/register", { username, password, role }).subscribe({
      next: () => {
        this.newUserForm = { username: "", password: "", role: "scoring_judge" };
        this.showCreateForm.set(false);
        this.loadJudges();
        Swal.fire({ icon: "success", title: "帳號已建立", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
      },
      error: (err) =>
        Swal.fire({ icon: "error", title: err.error?.error ?? "建立失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 }),
    });
  }

  startEditRole(judge: JudgeUser): void {
    this.editingUserId.set(judge._id);
    this.editingRole = judge.role;
  }

  cancelEditRole(): void {
    this.editingUserId.set(null);
  }

  saveEditRole(judge: JudgeUser): void {
    if (!this.editingRole) return;
    this.api.patch<{ success: boolean; data: JudgeUser }>(`/auth/users/${judge._id}/role`, { role: this.editingRole }).subscribe({
      next: (res) => {
        if (res.success) {
          this.judges.update((j) => j.map((u) => (u._id === judge._id ? res.data : u)));
          this.editingUserId.set(null);
          Swal.fire({ icon: "success", title: "角色已更新", toast: true, position: "top-end", showConfirmButton: false, timer: 1500 });
        }
      },
      error: (err) =>
        Swal.fire({ icon: "error", title: err.error?.error ?? "更新失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 }),
    });
  }

  async deleteUser(judge: JudgeUser): Promise<void> {
    const result = await Swal.fire({
      title: "確認刪除帳號？",
      text: `「${judge.username}」將被永久刪除。`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "確認刪除",
      cancelButtonText: "取消",
      confirmButtonColor: "#ef4444",
      background: "#1e293b",
      color: "#fff",
    });
    if (!result.isConfirmed) return;
    this.api.delete<{ success: boolean }>(`/auth/users/${judge._id}`).subscribe({
      next: () => {
        this.judges.update((j) => j.filter((u) => u._id !== judge._id));
        Swal.fire({ icon: "success", title: "已刪除", toast: true, position: "top-end", showConfirmButton: false, timer: 1500 });
      },
      error: (err) =>
        Swal.fire({ icon: "error", title: err.error?.error ?? "刪除失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 3000 }),
    });
  }

  roleLabel(role: string): string {
    return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
  }

  goBack(): void {
    this.router.navigate(["/admin/events"]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }
}
