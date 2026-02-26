import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGavel, faEye, faLock, faCalendarCheck } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

interface EventItem {
  _id: string;
  name: string;
  date?: string;
  status: string;
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
type LoginStep = 'login' | 'select-event';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  events = signal<EventItem[]>([]);
  // 只顯示非關閉狀態的賽事（觀眾入口 & 裁判選擇賽事）
  openEvents = computed(() => this.events().filter((e) => e.status !== 'closed'));
  username = '';
  password = '';
  loading = signal(false);

  // 登入後選擇賽事的流程
  loginStep = signal<LoginStep>('login');
  pendingRole = signal<string>('');
  joinEventId = '';  // 裁判選擇的賽事 ID

  // 觀眾選擇賽事
  selectedEventId = '';

  faGavel = faGavel;
  faEye = faEye;
  faLock = faLock;
  faCalendarCheck = faCalendarCheck;

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.navigateByRole(this.auth.currentRole() ?? '');
      return;
    }
    this.loadEvents();
  }

  loadEvents(): void {
    this.api.get<{ success: boolean; data: EventItem[] }>('/events').subscribe({
      next: (res) => this.events.set(res.data),
      error: () => console.error('無法載入賽事列表'),
    });
  }

  loginAsAudience(eventId: string): void {
    if (!eventId) {
      Swal.fire({ icon: 'warning', title: '請選擇賽事', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    this.router.navigate(['/audience'], { queryParams: { eventId } });
  }

  onLogin(): void {
    if (!this.username || !this.password) {
      Swal.fire({ icon: 'warning', title: '請填寫帳號與密碼', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }

    this.loading.set(true);
    this.api.post<LoginResponse>('/auth/login', {
      username: this.username,
      password: this.password,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          const u = res.data.user;
          this.auth.login(res.data.token, {
            userId: u.id,
            role: u.role as never,
            judgeNo: u.judgeNo,
            eventId: u.eventId,
            username: u.username,
          });

          // admin 不需要 eventId，直接導向
          if (u.role === 'admin') {
            Swal.fire({ icon: 'success', title: '登入成功', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            this.navigateByRole(u.role);
            return;
          }

          // 已有 eventId：直接導向
          if (u.eventId) {
            Swal.fire({ icon: 'success', title: '登入成功', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            this.navigateByRole(u.role);
            return;
          }

          // 沒有 eventId：進入「選擇賽事」步驟
          this.pendingRole.set(u.role);
          this.loginStep.set('select-event');
        }
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '帳號或密碼錯誤', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      },
    });
  }

  confirmSelectEvent(): void {
    if (!this.joinEventId) {
      Swal.fire({ icon: 'warning', title: '請選擇賽事', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }

    this.loading.set(true);
    this.api.post<{ success: boolean; data: { token: string; eventId: string; eventName: string } }>(
      '/auth/select-event',
      { eventId: this.joinEventId }
    ).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          // 用新 token（含 eventId）更新認證狀態
          const current = this.auth.user()!;
          this.auth.login(res.data.token, {
            ...current,
            eventId: res.data.eventId,
          });
          Swal.fire({
            icon: 'success',
            title: `已加入「${res.data.eventName}」`,
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
          });
          this.navigateByRole(this.pendingRole());
        }
      },
      error: () => {
        this.loading.set(false);
        Swal.fire({ icon: 'error', title: '選擇賽事失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      },
    });
  }

  navigateByRole(role: string): void {
    const routeMap: Record<string, string> = {
      scoring_judge: '/judge/scoring',
      vr_judge:      '/judge/vr',
      sequence_judge: '/judge/sequence',
      admin:          '/admin',
      audience:       '/audience',
    };
    this.router.navigate([routeMap[role] ?? '/audience']);
  }
}
