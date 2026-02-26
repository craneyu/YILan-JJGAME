import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUserShield, faPlus, faFileArrowUp, faTrash, faPen, faCheck, faXmark, faUsers, faKey, faLock, faSort } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

interface EventItem {
  _id: string;
  name: string;
  date?: string;
  venue?: string;
  status: string;
}

interface TeamItem {
  _id: string;
  name: string;
  members: string[];
  category: string;
  order: number;
}

interface JudgeUser {
  _id: string;
  username: string;
  role: string;
  judgeNo?: number;
  eventId?: { _id: string; name: string } | null;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  events = signal<EventItem[]>([]);
  selectedEvent = signal<EventItem | null>(null);
  teams = signal<TeamItem[]>([]);

  // 建立賽事表單
  newEvent = { name: '', date: '', venue: '' };
  showCreateEvent = signal(false);

  // 編輯賽事
  editingEventId = signal<string | null>(null);
  editEventForm = { name: '', date: '', venue: '', status: 'pending' as 'pending' | 'active' | 'closed' };

  // 新增隊伍表單
  newTeam = { name: '', member1: '', member2: '', category: 'male' as 'male' | 'female' | 'mixed', order: 1 };
  showAddTeam = signal(false);

  // 編輯隊伍
  editingTeamId = signal<string | null>(null);
  editForm = { name: '', member1: '', member2: '', category: 'male' as 'male' | 'female' | 'mixed', order: 1 };

  // 批次選取
  selectedTeamIds = signal<Set<string>>(new Set());

  // 批次設定場次
  reorderMode = signal(false);
  reorderMap = signal<Record<string, number>>({});

  // 隊伍類別篩選
  teamFilter = signal<'all' | 'male' | 'female' | 'mixed'>('all');
  filteredTeams = computed(() => {
    const f = this.teamFilter();
    if (f === 'all') return this.teams();
    return this.teams().filter((t) => t.category === f);
  });
  teamCounts = computed(() => ({
    all: this.teams().length,
    male: this.teams().filter((t) => t.category === 'male').length,
    female: this.teams().filter((t) => t.category === 'female').length,
    mixed: this.teams().filter((t) => t.category === 'mixed').length,
  }));
  allSelected = computed(() =>
    this.filteredTeams().length > 0 &&
    this.filteredTeams().every((t) => this.selectedTeamIds().has(t._id))
  );

  // 裁判管理
  judges = signal<JudgeUser[]>([]);
  showJudges = signal(false);

  faUserShield = faUserShield;
  faPlus = faPlus;
  faFileArrowUp = faFileArrowUp;
  faTrash = faTrash;
  faPen = faPen;
  faCheck = faCheck;
  faXmark = faXmark;
  faUsers = faUsers;
  faKey = faKey;
  faLock = faLock;
  faSort = faSort;

  ngOnInit(): void {
    this.loadEvents();
    this.loadJudges();
  }

  loadJudges(): void {
    this.api.get<{ success: boolean; data: JudgeUser[] }>('/auth/users').subscribe({
      next: (res) => this.judges.set(res.data),
    });
  }

  assignJudgeEvent(judgeId: string, eventId: string): void {
    this.api.patch<{ success: boolean; data: JudgeUser }>(
      `/auth/users/${judgeId}/event`,
      { eventId: eventId || null }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.judges.update((j) => j.map((u) => u._id === judgeId ? res.data : u));
          Swal.fire({ icon: 'success', title: '已更新指派', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        }
      },
      error: () => Swal.fire({ icon: 'error', title: '指派失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  loadEvents(): void {
    this.api.get<{ success: boolean; data: EventItem[] }>('/events').subscribe({
      next: (res) => this.events.set(res.data),
    });
  }

  createEvent(): void {
    if (!this.newEvent.name) {
      Swal.fire({ icon: 'warning', title: '請填寫賽事名稱', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    this.api.post<{ success: boolean; data: EventItem }>('/events', this.newEvent).subscribe({
      next: (res) => {
        if (res.success) {
          this.events.update((e) => [res.data, ...e]);
          this.newEvent = { name: '', date: '', venue: '' };
          this.showCreateEvent.set(false);
          Swal.fire({ icon: 'success', title: '賽事已建立', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '建立失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  startEditEvent(event: EventItem): void {
    this.editingEventId.set(event._id);
    this.editEventForm = {
      name: event.name,
      date: event.date ?? '',
      venue: event.venue ?? '',
      status: event.status as 'pending' | 'active' | 'closed',
    };
  }

  cancelEditEvent(): void {
    this.editingEventId.set(null);
  }

  saveEditEvent(event: EventItem): void {
    if (!this.editEventForm.name) {
      Swal.fire({ icon: 'warning', title: '請填寫賽事名稱', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    this.api.patch<{ success: boolean; data: EventItem }>(`/events/${event._id}`, {
      name: this.editEventForm.name,
      date: this.editEventForm.date || undefined,
      venue: this.editEventForm.venue || undefined,
      status: this.editEventForm.status,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.events.update((evts) => evts.map((e) => e._id === event._id ? res.data : e));
          if (this.selectedEvent()?._id === event._id) this.selectedEvent.set(res.data);
          this.editingEventId.set(null);
          Swal.fire({ icon: 'success', title: '賽事已更新', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '更新失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  async closeEvent(event: EventItem): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: `確認關閉「${event.name}」？`,
      text: '關閉後此賽事將不再顯示於觀眾與裁判入口',
      showCancelButton: true,
      confirmButtonText: '確認關閉',
      cancelButtonText: '取消',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;

    this.api.patch<{ success: boolean; data: EventItem }>(`/events/${event._id}`, { status: 'closed' }).subscribe({
      next: (res) => {
        if (res.success) {
          this.events.update((evts) => evts.map((e) => e._id === event._id ? res.data : e));
          if (this.selectedEvent()?._id === event._id) this.selectedEvent.set(res.data);
          Swal.fire({ icon: 'success', title: '賽事已關閉', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '關閉失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  async deleteEvent(event: EventItem): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: `確認刪除「${event.name}」？`,
      html: '此操作將<b>永久刪除</b>該賽事及其所有隊伍、評分資料，<br>無法復原。',
      showCancelButton: true,
      confirmButtonText: '確認刪除',
      cancelButtonText: '取消',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;

    this.api.delete<{ success: boolean }>(`/events/${event._id}`).subscribe({
      next: () => {
        this.events.update((evts) => evts.filter((e) => e._id !== event._id));
        if (this.selectedEvent()?._id === event._id) {
          this.selectedEvent.set(null);
          this.teams.set([]);
        }
        Swal.fire({ icon: 'success', title: '賽事已刪除', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '刪除失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  selectEvent(event: EventItem): void {
    this.selectedEvent.set(event);
    this.selectedTeamIds.set(new Set());
    this.editingTeamId.set(null);
    this.teamFilter.set('all');
    this.reorderMode.set(false);
    this.reorderMap.set({});
    this.loadTeams(event._id);
  }

  async changePassword(judge: JudgeUser): Promise<void> {
    const { value: newPassword } = await Swal.fire({
      title: `變更「${judge.username}」的密碼`,
      input: 'password',
      inputLabel: '新密碼',
      inputPlaceholder: '請輸入新密碼（至少 4 個字元）',
      inputAttributes: { autocomplete: 'new-password' },
      showCancelButton: true,
      confirmButtonText: '確認變更',
      cancelButtonText: '取消',
      inputValidator: (value) => {
        if (!value || value.length < 4) return '密碼長度至少 4 個字元';
        return null;
      },
    });
    if (!newPassword) return;

    this.api.patch<{ success: boolean }>(`/auth/users/${judge._id}/password`, { newPassword }).subscribe({
      next: () => Swal.fire({ icon: 'success', title: '密碼已變更', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }),
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '變更失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  loadTeams(eventId: string): void {
    this.api.get<{ success: boolean; data: TeamItem[] }>(`/events/${eventId}/teams`).subscribe({
      next: (res) => {
        this.teams.set(res.data);
        this.newTeam.order = res.data.length + 1;
      },
    });
  }

  addTeam(): void {
    const event = this.selectedEvent();
    if (!event) return;
    const members = [this.newTeam.member1, this.newTeam.member2].filter((m) => m.trim() !== '');
    if (!this.newTeam.name || members.length === 0) {
      Swal.fire({ icon: 'warning', title: '請填寫隊伍名稱與至少一位隊員', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    this.api.post<{ success: boolean; data: TeamItem }>(`/events/${event._id}/teams`, {
      name: this.newTeam.name,
      members,
      category: this.newTeam.category,
      order: this.newTeam.order,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.teams.update((t) => [...t, res.data].sort((a, b) => a.order - b.order));
          this.newTeam = { name: '', member1: '', member2: '', category: 'male', order: this.teams().length + 1 };
          this.showAddTeam.set(false);
          Swal.fire({ icon: 'success', title: '隊伍已新增', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '新增失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  // ── 編輯 ──────────────────────────────────────────────
  startEdit(team: TeamItem): void {
    this.editingTeamId.set(team._id);
    this.editForm = {
      name: team.name,
      member1: team.members[0] || '',
      member2: team.members[1] || '',
      category: team.category as 'male' | 'female' | 'mixed',
      order: team.order,
    };
  }

  cancelEdit(): void {
    this.editingTeamId.set(null);
  }

  saveEdit(team: TeamItem): void {
    const event = this.selectedEvent();
    if (!event) return;
    const members = [this.editForm.member1, this.editForm.member2].filter((m) => m.trim() !== '');
    if (!this.editForm.name || members.length === 0) {
      Swal.fire({ icon: 'warning', title: '請填寫隊伍名稱與至少一位隊員', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    this.api.patch<{ success: boolean; data: TeamItem }>(`/events/${event._id}/teams/${team._id}`, {
      name: this.editForm.name,
      members,
      category: this.editForm.category,
      order: this.editForm.order,
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.teams.update((t) => t.map((tm) => tm._id === team._id ? res.data : tm).sort((a, b) => a.order - b.order));
          this.editingTeamId.set(null);
          Swal.fire({ icon: 'success', title: '已更新', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '更新失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  // ── 單筆刪除 ──────────────────────────────────────────
  async deleteTeam(team: TeamItem): Promise<void> {
    const result = await Swal.fire({
      icon: 'question',
      title: `確認刪除「${team.name}」？`,
      showCancelButton: true,
      confirmButtonText: '刪除',
      cancelButtonText: '取消',
    });
    if (!result.isConfirmed) return;

    this.api.delete<{ success: boolean }>(`/events/${this.selectedEvent()?._id}/teams/${team._id}`).subscribe({
      next: () => {
        this.teams.update((t) => t.filter((tm) => tm._id !== team._id));
        this.selectedTeamIds.update((s) => { const n = new Set(s); n.delete(team._id); return n; });
        Swal.fire({ icon: 'success', title: '已刪除', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
    });
  }

  // ── 批次選取 ──────────────────────────────────────────
  toggleSelectTeam(teamId: string): void {
    this.selectedTeamIds.update((s) => {
      const n = new Set(s);
      if (n.has(teamId)) n.delete(teamId); else n.add(teamId);
      return n;
    });
  }

  // ── 批次設定場次 ──────────────────────────────────────────
  enterReorderMode(): void {
    const map: Record<string, number> = {};
    this.filteredTeams().forEach((t) => { map[t._id] = t.order; });
    this.reorderMap.set(map);
    this.reorderMode.set(true);
    this.editingTeamId.set(null);
    this.selectedTeamIds.set(new Set());
  }

  cancelReorderMode(): void {
    this.reorderMode.set(false);
    this.reorderMap.set({});
  }

  setReorderValue(teamId: string, value: number): void {
    if (!isNaN(value) && value >= 1) {
      this.reorderMap.update((m) => ({ ...m, [teamId]: value }));
    }
  }

  autoNumber(): void {
    const map = { ...this.reorderMap() };
    this.filteredTeams().forEach((team, idx) => {
      map[team._id] = idx + 1;
    });
    this.reorderMap.set(map);
  }

  saveReorder(): void {
    const eventId = this.selectedEvent()?._id;
    if (!eventId) return;

    const map = this.reorderMap();
    const orders = this.filteredTeams().map((t) => ({ id: t._id, order: map[t._id] ?? t.order }));

    this.api.post<{ success: boolean; data: TeamItem[] }>(
      `/events/${eventId}/teams/batch-order`,
      { orders }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.teams.set(res.data);
          this.reorderMode.set(false);
          this.reorderMap.set({});
          Swal.fire({ icon: 'success', title: '場次已更新', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: () => Swal.fire({ icon: 'error', title: '更新失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      // 取消勾選當前篩選的隊伍
      this.selectedTeamIds.update((s) => {
        const n = new Set(s);
        this.filteredTeams().forEach((t) => n.delete(t._id));
        return n;
      });
    } else {
      // 勾選當前篩選的隊伍
      this.selectedTeamIds.update((s) => {
        const n = new Set(s);
        this.filteredTeams().forEach((t) => n.add(t._id));
        return n;
      });
    }
  }

  // ── 批次刪除 ──────────────────────────────────────────
  async batchDeleteTeams(): Promise<void> {
    const ids = Array.from(this.selectedTeamIds());
    if (ids.length === 0) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: `確認批次刪除 ${ids.length} 支隊伍？`,
      text: '此操作無法復原',
      showCancelButton: true,
      confirmButtonText: '確認刪除',
      cancelButtonText: '取消',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;

    this.api.post<{ success: boolean; data: { deleted: number } }>(
      `/events/${this.selectedEvent()!._id}/teams/batch-delete`,
      { ids }
    ).subscribe({
      next: (res) => {
        this.teams.update((t) => t.filter((tm) => !ids.includes(tm._id)));
        this.selectedTeamIds.set(new Set());
        Swal.fire({ icon: 'success', title: `已刪除 ${res.data.deleted} 支隊伍`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      },
      error: () => Swal.fire({ icon: 'error', title: '批次刪除失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  // ── 匯入 ──────────────────────────────────────────────
  importFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.selectedEvent()) return;

    const formData = new FormData();
    formData.append('file', file);

    this.api.postFile<{ success: boolean; data: { imported: number; conflicts: number; successList: string[]; conflictList: string[] } }>(
      `/events/${this.selectedEvent()!._id}/teams/import`,
      formData
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadTeams(this.selectedEvent()!._id);
          Swal.fire({
            icon: res.data.imported > 0 ? 'success' : 'info',
            title: '匯入完成',
            html: `成功：<b>${res.data.imported}</b> 筆${res.data.conflicts > 0 ? `<br>衝突（已略過）：${res.data.conflicts} 筆<br><small class="text-left block mt-1">${res.data.conflictList.join('<br>')}</small>` : ''}`,
          });
        }
        // 清除 input value，讓同一檔案可再次選取
        (event.target as HTMLInputElement).value = '';
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '匯入失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
