import { Component, OnInit, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faGavel,
  faEye,
  faLock,
  faCalendarCheck,
  faUsers,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { AuthService, CompetitionType } from "../../core/services/auth.service";
import { ApiService } from "../../core/services/api.service";

interface EventItem {
  _id: string;
  name: string;
  date?: string;
  status: string;
  competitionTypes?: ("Duo" | "Show")[];
}

interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      username: string;
      role: string;
      judgeNo?: number;
      eventId?: string;
    };
  };
}

// 登入流程步驟
type LoginStep = "login" | "select-event" | "select-type";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  events = signal<EventItem[]>([]);

  /** 登入後依使用者所屬賽事動態決定可用的競賽類型選項 */
  availableTypes = signal<("Duo" | "Show")[]>([]);

  // 觀眾下拉：顯示所有未關閉賽事（不過濾類型）
  allOpenEvents = computed(() =>
    this.events().filter((e) => e.status !== "closed"),
  );

  // select-event 步驟：顯示所有未關閉賽事（類型選擇在選完賽事後進行）
  openEvents = computed(() =>
    this.events().filter((e) => e.status !== "closed"),
  );

  username = "";
  password = "";
  loading = signal(false);

  // 登入流程：登入 → (選賽事) → (選競賽類型，若多類型)
  loginStep = signal<LoginStep>("login");

  // 觀眾選擇賽事
  selectedEventId = "";

  // 裁判選擇賽事
  joinEventId = "";

  // 已登入使用者名稱（供 select-event 步驟顯示）
  currentUsername = computed(() => this.auth.user()?.username ?? "");

  faGavel = faGavel;
  faEye = faEye;
  faLock = faLock;
  faCalendarCheck = faCalendarCheck;
  faUsers = faUsers;
  faStar = faStar;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.navigateByRole(this.auth.currentRole() ?? "");
      return;
    }
    this.loadEvents();
  }

  /** loadEvents silently populates audience dropdown — 不更改登入步驟，不設定競賽類型 */
  loadEvents(): void {
    this.api.get<{ success: boolean; data: EventItem[] }>("/events").subscribe({
      next: (res) => {
        this.events.set(res.data);
        // loginStep 維持初始 'login'，競賽類型於登入後決定
      },
      error: () => console.error("無法載入賽事列表"),
    });
  }

  loginAsAudience(eventId: string): void {
    if (!eventId) {
      Swal.fire({
        icon: "warning",
        title: "請選擇賽事",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }
    this.router.navigate(["/audience-select"], { queryParams: { eventId } });
  }

  /** 類型選擇（登入後），選完後直接導向角色頁面 */
  selectCompetitionType(type: CompetitionType): void {
    this.auth.setCompetitionType(type);
    this.navigateByRole(this.auth.currentRole() ?? "");
  }

  onLogin(): void {
    if (!this.username || !this.password) {
      Swal.fire({
        icon: "warning",
        title: "請填寫帳號與密碼",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    this.loading.set(true);
    this.api
      .post<LoginResponse>("/auth/login", {
        username: this.username,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success) {
            const u = res.data.user;

            // 先儲存登入資訊（competitionType 待後續確認後更新）
            this.auth.login(
              res.data.token,
              {
                userId: u.id,
                role: u.role as never,
                judgeNo: u.judgeNo,
                eventId: u.eventId,
                username: u.username,
              },
              this.auth.competitionType(),
            );

            Swal.fire({
              icon: "success",
              title: "登入成功",
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 1500,
            });

            if (u.role === "admin") {
              // admin 不需選競賽類型
              this.navigateByRole(u.role);
            } else if (u.eventId) {
              // 已有指定賽事 → 登入後決定競賽類型（availableTypes determined from user's event）
              this.resolveTypeAndNavigate(u.eventId, u.role);
            } else {
              // 無指定賽事 → 先選賽事
              this.loginStep.set("select-event");
            }
          }
        },
        error: () => {
          this.loading.set(false);
          Swal.fire({
            icon: "error",
            title: "帳號或密碼錯誤",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
          });
        },
      });
  }

  confirmSelectEvent(): void {
    if (!this.joinEventId) {
      Swal.fire({
        icon: "warning",
        title: "請選擇賽事",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
      return;
    }

    this.loading.set(true);
    this.api
      .post<{
        success: boolean;
        data: { token: string; eventId: string; eventName: string };
      }>("/auth/select-event", { eventId: this.joinEventId })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success) {
            const current = this.auth.user()!;
            const event = this.events().find((e) => e._id === this.joinEventId);
            const types = event?.competitionTypes ?? ["Duo"];
            this.availableTypes.set(types);

            Swal.fire({
              icon: "success",
              title: `已加入「${res.data.eventName}」`,
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 2000,
            });

            this.auth.setEventCompetitionTypes(types);
            // match_referee 與演武競賽類型（Duo/Show）無關，直接導向
            // types.length === 0 代表賽事無演武項目（如 contact-only），同樣直接導向
            if (current.role === "match_referee" || types.length === 0) {
              this.auth.login(
                res.data.token,
                { ...current, eventId: res.data.eventId },
                this.auth.competitionType(),
              );
              this.navigateByRole(current.role ?? "");
            } else if (types.length === 1) {
              const authType: CompetitionType =
                types[0] === "Show" ? "creative" : "kata";
              this.auth.login(
                res.data.token,
                {
                  ...current,
                  eventId: res.data.eventId,
                },
                authType,
              );
              this.navigateByRole(current.role ?? "");
            } else {
              // 多類型 → 登入後顯示競賽類型選擇（post-login competition type selection）
              this.auth.login(
                res.data.token,
                {
                  ...current,
                  eventId: res.data.eventId,
                },
                this.auth.competitionType(),
              );
              this.loginStep.set("select-type");
            }
          }
        },
        error: () => {
          this.loading.set(false);
          Swal.fire({
            icon: "error",
            title: "選擇賽事失敗",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
          });
        },
      });
  }

  /** 登入後決定競賽類型並導向（availableTypes determined from user's event） */
  private resolveTypeAndNavigate(eventId: string, role: string): void {
    // match_referee 與演武競賽類型（Duo/Show）無關，直接導向
    if (role === "match_referee") {
      this.navigateByRole(role);
      return;
    }

    const applyTypes = (types: ("Duo" | "Show")[]) => {
      this.availableTypes.set(types);
      this.auth.setEventCompetitionTypes(types);
      if (types.length === 0) {
        // 賽事無演武項目（如 contact-only），直接導向
        this.navigateByRole(role);
      } else if (types.length === 1) {
        const authType: CompetitionType =
          types[0] === "Show" ? "creative" : "kata";
        this.auth.setCompetitionType(authType);
        this.navigateByRole(role);
      } else {
        // 多類型 → 顯示競賽類型選擇（Login page presents competition type selection）
        this.loginStep.set("select-type");
      }
    };

    const cached = this.events().find((e) => e._id === eventId);
    if (cached?.competitionTypes !== undefined) {
      applyTypes(cached.competitionTypes);
    } else {
      // events 尚未載入（timing），直接向 API 取得賽事資訊
      this.api
        .get<{ success: boolean; data: EventItem }>(`/events/${eventId}`)
        .subscribe({
          next: (res) => applyTypes(res.data?.competitionTypes ?? ["Duo"]),
          error: () => applyTypes(["Duo"]),
        });
    }
  }

  backToLogin(): void {
    this.auth.logout();
    this.loginStep.set("login");
    this.username = "";
    this.password = "";
  }

  navigateByRole(role: string): void {
    const type = this.auth.competitionType();

    if (type === "creative") {
      const creativeRouteMap: Record<string, string> = {
        scoring_judge: "/creative/scoring",
        sequence_judge: "/creative/sequence",
        admin: "/admin",
        audience: "/audience-select",
      };
      this.router.navigate([creativeRouteMap[role] ?? "/creative/audience"]);
      return;
    }

    const routeMap: Record<string, string> = {
      scoring_judge: "/judge/scoring",
      vr_judge: "/judge/vr",
      sequence_judge: "/judge/sequence",
      admin: "/admin",
      audience: "/audience-select",
      match_referee: "/referee",
    };
    this.router.navigate([routeMap[role] ?? "/audience-select"]);
  }
}
