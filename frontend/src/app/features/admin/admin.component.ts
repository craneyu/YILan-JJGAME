import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUserShield, faPlus, faFileArrowUp, faTrash, faPen, faCheck, faXmark, faUsers, faKey, faLock, faSort, faDatabase, faEraser, faTrophy, faArrowsRotate, faDownload, faMedal } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

interface EventItem {
  _id: string;
  name: string;
  date?: string;
  venue?: string;
  status: string;
  categoryOrder?: string[];
  categoryOrderDuo?: string[];
  categoryOrderShow?: string[];
  competitionTypes?: ('Duo' | 'Show')[];
}

interface CreativeRankingItem {
  rank: number;
  teamId: string;
  name: string;
  members: string[];
  category: string;
  technicalTotal: number;
  artisticTotal: number;
  grandTotal: number;
  penaltyDeduction: number;
  finalScore: number;
}

interface CategoryCreativeRanking {
  category: string;
  label: string;
  items: CreativeRankingItem[];
}

interface TeamItem {
  _id: string;
  name: string;
  members: string[];
  category: string;
  order: number;
  competitionType?: 'Duo' | 'Show';
}

type ActionDetail = { p1?: number; p2?: number; p3?: number; p4?: number; p5?: number; total: number };
type VrDetail = { throwVariety: number; groundVariety: number };

interface RankingItem {
  teamId: string;
  name: string;
  members: string[];
  category: string;
  seriesA: number;
  vrScoreA: number;
  seriesB: number;
  vrScoreB: number;
  seriesC: number;
  vrScoreC: number;
  total: number;
  rank?: number;
  actionDetails: Record<string, ActionDetail>;
  vrDetails: Record<string, VrDetail>;
}

interface CategoryRanking {
  category: string;
  label: string;
  items: (RankingItem & { rank: number })[];
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

  // 賽事類型篩選（管理員可同時管理兩種比賽）
  eventTypeFilter = signal<'all' | 'kata' | 'creative'>('all');
  filteredEvents = computed(() => {
    const f = this.eventTypeFilter();
    if (f === 'all') return this.events();
    const target = f === 'kata' ? 'Duo' : 'Show';
    return this.events().filter(e => (e.competitionTypes ?? ['Duo']).includes(target));
  });

  eventsCountByType(type: string): number {
    if (type === 'all') return this.events().length;
    const target = type === 'kata' ? 'Duo' : 'Show';
    return this.events().filter(e => (e.competitionTypes ?? ['Duo']).includes(target)).length;
  }

  // 建立賽事表單
  newEvent = { name: '', date: '', venue: '' };
  newEventCompetitionTypes = signal<('Duo' | 'Show')[]>(['Duo']);
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

  // 組別順序
  editingCategoryOrderId = signal<string | null>(null);
  categoryOrderDraftDuo = signal<string[]>([]);
  categoryOrderDraftShow = signal<string[]>([]);
  categoryOrderEditType = signal<'Duo' | 'Show'>('Duo');

  // 成績排名（雙人演武）
  rankings = signal<RankingItem[]>([]);
  showRankings = signal(false);
  rankingsLoading = signal(false);

  // 成績排名（創意演武）
  creativeRankings = signal<CreativeRankingItem[]>([]);
  showCreativeRankings = signal(false);
  creativeRankingsLoading = signal(false);
  creativeRankingsByCat = computed<CategoryCreativeRanking[]>(() => {
    const byCategory: Record<string, CreativeRankingItem[]> = {};
    for (const item of this.creativeRankings()) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }
    return ['female', 'male', 'mixed']
      .filter(cat => (byCategory[cat]?.length ?? 0) > 0)
      .map(cat => ({
        category: cat,
        label: this.categoryLabel(cat),
        items: byCategory[cat],
      }));
  });
  rankingsByCat = computed<CategoryRanking[]>(() => {
    const categoryOrder = this.effectiveCategoryOrder(this.selectedEvent(), 'Duo');
    const byCategory: Record<string, RankingItem[]> = {};
    for (const item of this.rankings()) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }
    return categoryOrder
      .filter(cat => (byCategory[cat]?.length ?? 0) > 0)
      .map(cat => {
        const sorted = [...(byCategory[cat] || [])].sort((a, b) => b.total - a.total);
        return {
          category: cat,
          label: this.categoryLabel(cat),
          items: sorted.map((item, idx) => ({ ...item, rank: idx + 1 })),
        };
      });
  });

  // 依競賽類型分群的隊伍 computed signals
  duoTeams = computed(() => this.teams().filter(t => (t.competitionType ?? 'Duo') !== 'Show'));
  showTeams = computed(() => this.teams().filter(t => t.competitionType === 'Show'));

  // 批次選取
  selectedTeamIds = signal<Set<string>>(new Set());

  // 批次設定場次
  reorderMode = signal(false);
  reorderMap = signal<Record<string, number>>({});

  // 隊伍類型篩選（Duo / Show）
  teamTypeFilter = signal<'all' | 'Duo' | 'Show'>('all');
  typeFilteredTeams = computed(() => {
    const f = this.teamTypeFilter();
    if (f === 'all') return this.teams();
    return this.teams().filter((t) => t.competitionType === f);
  });

  // 隊伍類別篩選（組別）
  teamFilter = signal<'all' | 'male' | 'female' | 'mixed'>('all');
  filteredTeams = computed(() => {
    const f = this.teamFilter();
    const base = this.typeFilteredTeams();
    if (f === 'all') return base;
    return base.filter((t) => t.category === f);
  });
  teamCounts = computed(() => {
    const base = this.typeFilteredTeams();
    return {
      all: base.length,
      male: base.filter((t) => t.category === 'male').length,
      female: base.filter((t) => t.category === 'female').length,
      mixed: base.filter((t) => t.category === 'mixed').length,
    };
  });
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
  faDatabase = faDatabase;
  faEraser = faEraser;
  faTrophy = faTrophy;
  faArrowsRotate = faArrowsRotate;
  faDownload = faDownload;
  faMedal = faMedal;

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
    const competitionTypes = this.newEventCompetitionTypes();
    if (competitionTypes.length === 0) {
      Swal.fire({ icon: 'warning', title: '請至少選擇一個競賽項目', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    this.api.post<{ success: boolean; data: EventItem }>('/events', { ...this.newEvent, competitionTypes }).subscribe({
      next: (res) => {
        if (res.success) {
          this.events.update((e) => [res.data, ...e]);
          this.newEvent = { name: '', date: '', venue: '' };
          this.newEventCompetitionTypes.set(['Duo']);
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
    this.teamTypeFilter.set('all');
    this.reorderMode.set(false);
    this.reorderMap.set({});
    this.editingCategoryOrderId.set(null);
    this.categoryOrderDraftDuo.set([]);
    this.categoryOrderDraftShow.set([]);
    this.rankings.set([]);
    this.showRankings.set(false);
    this.creativeRankings.set([]);
    this.showCreativeRankings.set(false);
    this.teams.set([]);   // 先清空，避免切換時顯示舊賽事的隊伍資料
    this.loadTeams(event._id);
    const types = event.competitionTypes ?? ['Duo'];
    if (types.includes('Duo')) this.loadRankings();
    if (types.includes('Show')) this.loadCreativeRankings();
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
    this.importFileForType(event, 'Duo');
  }

  importFileForType(event: Event, competitionType: 'Duo' | 'Show'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.selectedEvent()) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('competitionType', competitionType);

    this.api.postFile<{ success: boolean; data: { imported: number; conflicts: number; successList: string[]; conflictList: string[] } }>(
      `/events/${this.selectedEvent()!._id}/teams/import`,
      formData
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadTeams(this.selectedEvent()!._id);
          Swal.fire({
            icon: res.data.imported > 0 ? 'success' : 'info',
            title: `匯入${competitionType === 'Show' ? '創意演武' : '雙人演武'}完成`,
            html: `成功：<b>${res.data.imported}</b> 筆${res.data.conflicts > 0 ? `<br>衝突（已略過）：${res.data.conflicts} 筆<br><small class="text-left block mt-1">${res.data.conflictList.join('<br>')}</small>` : ''}`,
          });
        }
        (event.target as HTMLInputElement).value = '';
      },
      error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '匯入失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  backupDatabase(): void {
    this.api.downloadBlob('/backup').subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jju-backup-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => Swal.fire({ icon: 'error', title: '備份失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  clearScoresByType(type?: 'Duo' | 'Show'): void {
    const event = this.selectedEvent();
    if (!event) return;

    const typeName = type === 'Duo' ? '雙人演武' : type === 'Show' ? '創意演武' : '所有';
    const typeHtml = type === 'Duo' ? '<b>雙人演武</b>的計分與 VR 裁判資料'
                     : type === 'Show' ? '<b>創意演武</b>的計分與扣分資料'
                     : '<b>所有</b>競賽項目的計分資料';

    Swal.fire({
      icon: 'warning',
      title: `確定清除${typeName}成績？`,
      html: `將清除 <b>${event.name}</b> 的${typeHtml}<br><small>隊伍資料不受影響</small>`,
      showCancelButton: true,
      confirmButtonText: '確認清除',
      cancelButtonText: '取消',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const url = `/events/${event._id}/scores${type ? `?type=${type}` : ''}`;
      this.api.delete<{ success: boolean; data: { message: string; deletedScores: number; deletedVrScores: number } }>(
        url
      ).subscribe({
        next: (res) => {
          Swal.fire({
            icon: 'success',
            title: `${typeName}成績已清除`,
            html: `已刪除 ${res.data.deletedScores} 筆計分${res.data.deletedVrScores > 0 ? `、${res.data.deletedVrScores} 筆 VR 裁判資料` : ''}`,
            timer: 3000,
            showConfirmButton: false,
          });
          // 重新載入排名以更新介面
          if (!type || type === 'Duo') {
            this.rankings.set([]);
            this.showRankings.set(false);
            this.loadRankings();
          }
          if (!type || type === 'Show') {
            this.creativeRankings.set([]);
            this.showCreativeRankings.set(false);
            this.loadCreativeRankings();
          }
        },
        error: (err) => Swal.fire({ icon: 'error', title: err.error?.error ?? '清除失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
      });
    });
  }

  // ── 成績排名 ──────────────────────────────────────────
  loadRankings(): void {
    const event = this.selectedEvent();
    if (!event) return;
    this.rankingsLoading.set(true);
    this.api.get<{ success: boolean; data: RankingItem[] }>(`/events/${event._id}/rankings`).subscribe({
      next: (res) => {
        if (res.success) {
          this.rankings.set(res.data);
          if (res.data.length > 0) this.showRankings.set(true);
        }
        this.rankingsLoading.set(false);
      },
      error: () => this.rankingsLoading.set(false),
    });
  }

  loadCreativeRankings(): void {
    const event = this.selectedEvent();
    if (!event) return;
    this.creativeRankingsLoading.set(true);
    this.api.get<{ success: boolean; data: CreativeRankingItem[] }>(`/events/${event._id}/creative-rankings`).subscribe({
      next: (res) => {
        if (res.success) {
          this.creativeRankings.set(res.data);
          if (res.data.length > 0) this.showCreativeRankings.set(true);
        }
        this.creativeRankingsLoading.set(false);
      },
      error: () => this.creativeRankingsLoading.set(false),
    });
  }

  exportCreativeExcel(category: string): void {
    const event = this.selectedEvent();
    if (!event || this.creativeRankings().length === 0) return;
    const groups = this.creativeRankingsByCat().filter(g => g.category === category);
    if (groups.length === 0) return;

    const group = groups[0];
    const rows: (string | number)[][] = [];
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
    const merge = (c1: number, c2: number) =>
      merges.push({ s: { r: rows.length - 1, c: c1 }, e: { r: rows.length - 1, c: c2 } });

    const COL = 6;
    rows.push([`${event.name} — ${group.label} 創意演武成績`]); merge(0, COL - 1);
    rows.push([`列印日期：${new Date().toLocaleDateString('zh-TW')}`]); merge(0, COL - 1);
    rows.push([]);
    rows.push(['名次', '隊伍', '隊員', '技術總分', '表演總分', '大總分', '扣分', '最終得分']);

    for (const item of group.items) {
      const medalText = item.rank === 1 ? '金牌' : item.rank === 2 ? '銀牌' : item.rank === 3 ? '銅牌' : `第${item.rank}名`;
      rows.push([
        medalText,
        item.name,
        item.members.join(' / '),
        item.technicalTotal,
        item.artisticTotal,
        item.grandTotal,
        item.penaltyDeduction > 0 ? `-${item.penaltyDeduction}` : 0,
        item.finalScore,
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, group.label);
    XLSX.writeFile(wb, `${event.name}_${group.label}_創意演武成績.xlsx`);
  }

  printCreativePdf(category: string): void {
    const event = this.selectedEvent();
    if (!event || this.creativeRankings().length === 0) return;
    const groups = this.creativeRankingsByCat().filter(g => g.category === category);
    const medalText = (rank: number) => rank === 1 ? '金' : rank === 2 ? '銀' : rank === 3 ? '銅' : String(rank);
    const medalStyle = (rank: number) =>
      rank === 1 ? 'color:#b8860b;font-weight:bold'
      : rank === 2 ? 'color:#6b7280;font-weight:bold'
      : rank === 3 ? 'color:#b45309;font-weight:bold'
      : 'color:#555';

    let sectionsHtml = '';
    let isFirst = true;
    for (const group of groups) {
      const breakCls = isFirst ? '' : ' class="pb"';
      isFirst = false;
      sectionsHtml += `
        <section${breakCls}>
          <h2>${group.label}</h2>
          <table>
            <thead>
              <tr>
                <th>名次</th><th>隊伍名稱</th><th>隊員</th>
                <th>技術總分</th><th>表演總分</th><th>大總分</th><th>扣分</th><th>最終得分</th>
              </tr>
            </thead>
            <tbody>
              ${group.items.map(item => `
                <tr>
                  <td style="text-align:center;${medalStyle(item.rank)}">${medalText(item.rank)}</td>
                  <td>${item.name}</td><td style="color:#555">${item.members.join(' / ')}</td>
                  <td>${item.technicalTotal.toFixed(1)}</td>
                  <td>${item.artisticTotal.toFixed(1)}</td>
                  <td>${item.grandTotal.toFixed(1)}</td>
                  <td style="color:#dc2626">${item.penaltyDeduction > 0 ? `-${item.penaltyDeduction.toFixed(1)}` : '—'}</td>
                  <td style="font-weight:${item.rank <= 3 ? 'bold' : 'normal'}">${item.finalScore.toFixed(1)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </section>`;
    }

    const win = window.open('', '_blank');
    if (!win) {
      Swal.fire({ icon: 'warning', title: '請允許彈出視窗', timer: 3000, showConfirmButton: false });
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="zh-TW"><head>
<meta charset="utf-8">
<title>${event.name} — 創意演武成績排名</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif;padding:16px;color:#1a1a2e}
  h1{text-align:center;font-size:18px;margin-bottom:4px}
  .sub{text-align:center;color:#888;font-size:12px;margin-bottom:20px}
  h2{font-size:14px;color:#1a3a6b;margin:0 0 6px;border-bottom:2px solid #1a3a6b;padding-bottom:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
  th,td{border:1px solid #ddd;padding:4px 6px;text-align:right;white-space:nowrap}
  th:nth-child(1),th:nth-child(2),th:nth-child(3),
  td:nth-child(1),td:nth-child(2),td:nth-child(3){text-align:left}
  th{background:#e8f0fe;font-weight:600}
  .pb{page-break-before:always}
  .sign-area{display:flex;gap:60px;justify-content:flex-end;margin-top:32px;padding-top:16px;border-top:1px solid #ddd}
  .sign-block{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:140px}
  .sign-label{font-size:13px;font-weight:600;color:#333}
  .sign-line{width:140px;border-bottom:1.5px solid #333;height:36px}
  .sign-hint{font-size:11px;color:#999}
  @page{size:A4 landscape;margin:10mm}
  @media print{body{padding:0}}
</style>
</head>
<body>
<h1>${event.name} — 創意演武</h1>
<p class="sub">成績排名 &nbsp;·&nbsp; 列印日期：${new Date().toLocaleDateString('zh-TW')}</p>
${sectionsHtml}
<div class="sign-area">
  <div class="sign-block">
    <div class="sign-label">裁判長</div><div class="sign-line"></div><div class="sign-hint">簽名</div>
  </div>
  <div class="sign-block">
    <div class="sign-label">日期</div><div class="sign-line"></div><div class="sign-hint">&nbsp;</div>
  </div>
</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  exportExcel(category: string): void {
    const event = this.selectedEvent();
    if (!event || this.rankings().length === 0) return;

    const groups = this.rankingsByCat().filter(g => g.category === category);
    if (groups.length === 0) return;

    const group = groups[0];
    const actionCount = group.category === 'male' ? 4 : 3;
    const seriesCfg: { s: string; parts: number }[] = [
      { s: 'A', parts: 4 }, { s: 'B', parts: 4 }, { s: 'C', parts: 5 },
    ];

    // 固定 10 欄：動作 | P1 | P2 | P3 | P4 | P5 | 動作小計 | VR投技 | VR寢技 | 系列合計
    const COL = 10;
    const rows: (string | number)[][] = [];
    const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
    const merge = (c1: number, c2: number) =>
      merges.push({ s: { r: rows.length - 1, c: c1 }, e: { r: rows.length - 1, c: c2 } });

    // 工作表標題
    rows.push([`${event.name} — ${group.label} 成績明細`]); merge(0, COL - 1);
    rows.push([`列印日期：${new Date().toLocaleDateString('zh-TW')}`]); merge(0, COL - 1);
    rows.push([]);

    for (const item of group.items) {
      const rankLabel = item.rank === 1 ? '金牌' : item.rank === 2 ? '銀牌' : item.rank === 3 ? '銅牌' : `第 ${item.rank} 名`;

      // ── 隊伍標題（橫跨所有欄）──
      rows.push([`${rankLabel}　${item.name}（${item.members.join(' / ')}）　總分：${item.total}`]);
      merge(0, COL - 1);

      // ── 欄位標題 ──
      rows.push(['動作', 'P1', 'P2', 'P3', 'P4', 'P5', '動作小計', 'VR投技', 'VR寢技', '系列合計']);

      for (const { s, parts } of seriesCfg) {
        // 各動作細項
        for (let i = 1; i <= actionCount; i++) {
          const d: ActionDetail | undefined = (item.actionDetails ?? {})[`${s}${i}`];
          const r: (string | number)[] = [`${s}${i}`];
          for (let p = 1; p <= 5; p++) {
            r.push(p <= parts
              ? (d ? ((d as Record<string, number>)[`p${p}`] ?? 0) : 0)
              : '');
          }
          r.push(d?.total ?? 0, '', '', '');
          rows.push(r);
        }

        // 系列合計列
        const vr: VrDetail = (item.vrDetails ?? {})[s] ?? { throwVariety: 0, groundVariety: 0 };
        const motionTotal = s === 'A' ? item.seriesA : s === 'B' ? item.seriesB : item.seriesC;
        const seriesVr = s === 'A' ? item.vrScoreA : s === 'B' ? item.vrScoreB : item.vrScoreC;
        rows.push([`${s} 系列合計`, '', '', '', '', '', motionTotal, vr.throwVariety, vr.groundVariety, motionTotal + seriesVr]);
        merge(0, 5);

        rows.push([]); // 系列間空白
      }

      // 總分列
      rows.push(['總分', '', '', '', '', '', '', '', '', item.total]);
      merge(0, 8);

      rows.push([]);
      rows.push([]); // 隊伍間雙空行
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 16 },
      { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 },
      { wch: 8 }, { wch: 7 }, { wch: 7 }, { wch: 9 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, group.label);
    XLSX.writeFile(wb, `${event.name}_${group.label}_成績明細.xlsx`);
  }

  printPdf(category: string): void {
    const event = this.selectedEvent();
    if (!event || this.rankings().length === 0) return;

    const groups = this.rankingsByCat().filter(g => g.category === category);
    const medalText = (rank: number) => rank === 1 ? '金' : rank === 2 ? '銀' : rank === 3 ? '銅' : String(rank);
    const medalStyle = (rank: number) =>
      rank === 1 ? 'color:#b8860b;font-weight:bold'
      : rank === 2 ? 'color:#6b7280;font-weight:bold'
      : rank === 3 ? 'color:#b45309;font-weight:bold'
      : 'color:#555';
    const rowStyle = (rank: number) =>
      rank === 1 ? 'background:#fffbeb' : rank === 2 ? 'background:#f9fafb' : rank === 3 ? 'background:#fff7ed' : '';

    let sectionsHtml = '';
    let isFirst = true;
    for (const group of groups) {
      const breakCls = isFirst ? '' : ' class="pb"';
      isFirst = false;
      sectionsHtml += `
        <section${breakCls}>
          <h2>${group.label}</h2>
          <table>
            <thead>
              <tr>
                <th>名次</th><th>隊伍名稱</th><th>隊員</th>
                <th>A動作</th><th>A_VR</th><th>A合計</th>
                <th>B動作</th><th>B_VR</th><th>B合計</th>
                <th>C動作</th><th>C_VR</th><th>C合計</th>
                <th>總分</th>
              </tr>
            </thead>
            <tbody>
              ${group.items.map(item => `
                <tr style="${rowStyle(item.rank)}">
                  <td style="text-align:center;${medalStyle(item.rank)}">${medalText(item.rank)}</td>
                  <td>${item.name}</td><td style="color:#555">${item.members.join(' / ')}</td>
                  <td>${item.seriesA}</td>
                  <td style="color:#1a6b3a">${item.vrScoreA}</td>
                  <td><b>${item.seriesA + item.vrScoreA}</b></td>
                  <td>${item.seriesB}</td>
                  <td style="color:#1a6b3a">${item.vrScoreB}</td>
                  <td><b>${item.seriesB + item.vrScoreB}</b></td>
                  <td>${item.seriesC}</td>
                  <td style="color:#1a6b3a">${item.vrScoreC}</td>
                  <td><b>${item.seriesC + item.vrScoreC}</b></td>
                  <td style="font-weight:${item.rank <= 3 ? 'bold' : 'normal'}">${item.total}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </section>`;
    }

    const win = window.open('', '_blank');
    if (!win) {
      Swal.fire({ icon: 'warning', title: '請允許彈出視窗', text: '請允許瀏覽器彈出視窗以開啟 PDF 列印', timer: 3000, showConfirmButton: false });
      return;
    }
    win.document.write(`<!DOCTYPE html>
<html lang="zh-TW"><head>
<meta charset="utf-8">
<title>${event.name} — 成績排名</title>
<style>
  *{box-sizing:border-box}
  body{font-family:"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif;padding:16px;color:#1a1a2e}
  h1{text-align:center;font-size:18px;margin-bottom:4px}
  .sub{text-align:center;color:#888;font-size:12px;margin-bottom:20px}
  h2{font-size:14px;color:#1a3a6b;margin:0 0 6px;border-bottom:2px solid #1a3a6b;padding-bottom:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
  th,td{border:1px solid #ddd;padding:4px 6px;text-align:right;white-space:nowrap}
  th:nth-child(1),th:nth-child(2),th:nth-child(3),
  td:nth-child(1),td:nth-child(2),td:nth-child(3){text-align:left}
  th{background:#e8f0fe;font-weight:600}
  .pb{page-break-before:always}
  .sign-area{display:flex;gap:60px;justify-content:flex-end;margin-top:32px;padding-top:16px;border-top:1px solid #ddd}
  .sign-block{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:140px}
  .sign-label{font-size:13px;font-weight:600;color:#333}
  .sign-line{width:140px;border-bottom:1.5px solid #333;height:36px}
  .sign-hint{font-size:11px;color:#999}
  @page{size:A4 landscape;margin:10mm}
  @media print{body{padding:0}}
</style>
</head>
<body>
<h1>${event.name}</h1>
<p class="sub">成績排名 &nbsp;·&nbsp; 列印日期：${new Date().toLocaleDateString('zh-TW')}</p>
${sectionsHtml}
<div class="sign-area">
  <div class="sign-block">
    <div class="sign-label">裁判長</div>
    <div class="sign-line"></div>
    <div class="sign-hint">簽名</div>
  </div>
  <div class="sign-block">
    <div class="sign-label">日期</div>
    <div class="sign-line"></div>
    <div class="sign-hint">&nbsp;</div>
  </div>
</div>
</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  // ── 組別順序 ──────────────────────────────────────────
  categoryLabel(cat: string): string {
    const map: Record<string, string> = { male: '男子組', female: '女子組', mixed: '混合組' };
    return map[cat] ?? cat;
  }

  competitionTypesLabel(types?: ('Duo' | 'Show')[]): string {
    const t = types ?? ['Duo'];
    if (t.includes('Duo') && t.includes('Show')) return 'Duo + Show';
    return t.includes('Show') ? '創意演武 Show' : '雙人演武 Duo';
  }

  toggleNewEventType(type: 'Duo' | 'Show'): void {
    this.newEventCompetitionTypes.update(types => {
      if (types.includes(type)) {
        const next = types.filter(t => t !== type);
        return next.length === 0 ? types : next; // 至少保留一個
      }
      return [...types, type];
    });
  }

  effectiveCategoryOrder(event: EventItem | null, type: 'Duo' | 'Show'): string[] {
    if (!event) return ['female', 'male', 'mixed'];
    const specific = type === 'Duo' ? event.categoryOrderDuo : event.categoryOrderShow;
    if (specific && specific.length > 0) return specific;
    return event.categoryOrder?.length ? event.categoryOrder : ['female', 'male', 'mixed'];
  }

  startEditCategoryOrder(event: EventItem): void {
    this.editingCategoryOrderId.set(event._id);
    const defaultOrder = ['female', 'male', 'mixed'];
    this.categoryOrderDraftDuo.set([...this.effectiveCategoryOrder(event, 'Duo')]);
    this.categoryOrderDraftShow.set([...this.effectiveCategoryOrder(event, 'Show')]);
    const types = event.competitionTypes ?? ['Duo'];
    this.categoryOrderEditType.set(types.includes('Duo') ? 'Duo' : 'Show');
    void defaultOrder;
  }

  cancelEditCategoryOrder(): void {
    this.editingCategoryOrderId.set(null);
    this.categoryOrderDraftDuo.set([]);
    this.categoryOrderDraftShow.set([]);
  }

  moveCategoryOrder(index: number, direction: -1 | 1): void {
    const isShow = this.categoryOrderEditType() === 'Show';
    const arr = [...(isShow ? this.categoryOrderDraftShow() : this.categoryOrderDraftDuo())];
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
    if (isShow) this.categoryOrderDraftShow.set(arr);
    else this.categoryOrderDraftDuo.set(arr);
  }

  saveCategoryOrder(): void {
    const eventId = this.editingCategoryOrderId();
    if (!eventId) return;
    const types = this.selectedEvent()?.competitionTypes ?? ['Duo'];
    const body: Record<string, string[]> = {};
    if (types.includes('Duo')) body['categoryOrderDuo'] = this.categoryOrderDraftDuo();
    if (types.includes('Show')) body['categoryOrderShow'] = this.categoryOrderDraftShow();
    this.api.patch<{ success: boolean; data: EventItem }>(`/events/${eventId}/category-order`, body).subscribe({
      next: (res) => {
        if (res.success) {
          this.events.update((evts) => evts.map((e) => e._id === eventId ? res.data : e));
          if (this.selectedEvent()?._id === eventId) this.selectedEvent.set(res.data);
          this.editingCategoryOrderId.set(null);
          this.categoryOrderDraftDuo.set([]);
          this.categoryOrderDraftShow.set([]);
          Swal.fire({ icon: 'success', title: '組別順序已更新', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        }
      },
      error: () => Swal.fire({ icon: 'error', title: '更新失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }),
    });
  }

  setTeamTypeFilter(type: 'all' | 'Duo' | 'Show'): void {
    this.teamTypeFilter.set(type);
    this.teamFilter.set('all');
    this.selectedTeamIds.set(new Set());
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
