import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faArrowLeft,
  faDownload,
  faFileArrowUp,
  faEdit,
  faTrash,
  faCheck,
  faTimes,
  faLock,
  faTrashAlt,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { firstValueFrom } from "rxjs";
import { AuthService } from "../../../core/services/auth.service";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { ApiService } from "../../../core/services/api.service";
import { SocketService } from "../../../core/services/socket.service";
import { Match, MatchCategory } from "../../../core/models/match.model";
import { groupMatchesByCategory } from "../../../core/utils/match-grouping";
import { isParseError, parseMatchRow } from "../../../core/utils/matchImport";
import { displayPlayerName } from "../../../core/utils/matchDisplay";
import { DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

const SWAL_DARK = { background: "#1e293b", color: "#fff" } as const;

interface EventItem {
  _id: string;
  name: string;
  status: string;
  date?: string;
  venue?: string;
}

interface WeightGroupExpanded {
  weightClass: string;
  matches: Match[];
  expanded: boolean;
}

interface CategoryGroupExpanded {
  category: MatchCategory;
  label: string;
  weightGroups: WeightGroupExpanded[];
}

interface EditState {
  matchId: string;
  redName: string;
  redTeam: string;
  blueName: string;
  blueTeam: string;
  scheduledOrder: number;
}

const TYPE_LABEL: Record<string, string> = {
  "ne-waza": "寢技",
  fighting: "對打",
  contact: "格鬥",
};

const METHOD_LABEL: Record<string, string> = {
  judge: "裁判判決",
  submission: "降伏勝",
  dq: "取消資格",
};

@Component({
  selector: "app-match-management",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: "./match-management.component.html",
})
export class MatchManagementComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private socket = inject(SocketService);
  private destroyRef = inject(DestroyRef);

  faArrowLeft = faArrowLeft;
  faDownload = faDownload;
  faFileArrowUp = faFileArrowUp;
  faEdit = faEdit;
  faTrash = faTrash;
  faCheck = faCheck;
  faTimes = faTimes;
  faLock = faLock;
  faTrashAlt = faTrashAlt;
  faRightFromBracket = faRightFromBracket;

  matchType = signal<string>("");
  currentEvent = signal<EventItem | null>(null);
  private eventId = "";
  matches = signal<Match[]>([]);
  loading = signal(false);
  importLoading = signal(false);
  isDragOver = signal(false);
  editState = signal<EditState | null>(null);
  selectedMatchIds = signal<Set<string>>(new Set());

  typeLabel = computed(() => TYPE_LABEL[this.matchType()] ?? this.matchType());
  sortMode = signal<'weight' | 'order'>('weight');

  allSelected = computed(() => {
    const all = this.matches();
    return all.length > 0 && all.every((m) => this.selectedMatchIds().has(m._id));
  });

  groupedMatches = computed((): CategoryGroupExpanded[] => {
    const categories = groupMatchesByCategory(this.matches());
    return categories.map(cat => ({
      category: cat.category,
      label: cat.label,
      weightGroups: cat.weightGroups.map(wg => ({
        weightClass: wg.weightClass,
        matches: wg.matches,
        expanded: true,
      })),
    }));
  });

  sortedByOrder = computed(() =>
    [...this.matches()].sort((a, b) => a.scheduledOrder - b.scheduledOrder),
  );

  displayRed(m: Match) {
    return displayPlayerName(m.redPlayer, m.redSource);
  }

  displayBlue(m: Match) {
    return displayPlayerName(m.bluePlayer, m.blueSource);
  }

  methodLabel(method: string | undefined | null): string {
    if (!method) return "";
    return METHOD_LABEL[method] ?? "";
  }

  ngOnInit(): void {
    const type = this.route.snapshot.params["matchType"] as string;
    this.matchType.set(type);
    this.eventId = this.route.snapshot.params["eventId"] as string;
    this.api.get<{ success: boolean; data: EventItem }>(`/events/${this.eventId}`).subscribe({
      next: (res) => {
        this.currentEvent.set(res.data);
        this.socket.joinEvent(res.data._id);
      },
    });
    this.loadMatches(this.eventId);

    // 監聽 propagation 事件：場次完賽後若有下游引用此場，下游姓名即時更新
    this.socket.matchAdvancementResolved$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evt) => {
        this.matches.update((list) =>
          list.map((m) => {
            if (m._id !== evt.matchId) return m;
            if (evt.side === "red") {
              return {
                ...m,
                redPlayer: { name: evt.playerName, teamName: evt.teamName },
                redSource: m.redSource
                  ? { ...m.redSource, resolved: true }
                  : m.redSource,
              };
            }
            return {
              ...m,
              bluePlayer: { name: evt.playerName, teamName: evt.teamName },
              blueSource: m.blueSource
                ? { ...m.blueSource, resolved: true }
                : m.blueSource,
            };
          }),
        );
      });

    // 即時更新已完賽場次：裁判端結束場次 → admin 列表立即顯示勝方與重新排序
    this.socket.matchEnded$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evt) => {
        this.matches.update((list) =>
          list.map((m) =>
            m._id === evt.matchId
              ? {
                  ...m,
                  status: "completed" as const,
                  result: { winner: evt.winner, method: evt.method },
                }
              : m,
          ),
        );
      });
  }

  private loadMatches(eventId: string): void {
    this.loading.set(true);
    this.api
      .get<{ success: boolean; data: Match[] }>(
        `/events/${eventId}/matches?matchType=${this.matchType()}`,
      )
      .subscribe({
        next: (res) => {
          this.matches.set(res.data);
          this.selectedMatchIds.set(new Set());
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  toggleSelect(matchId: string): void {
    const s = new Set(this.selectedMatchIds());
    if (s.has(matchId)) s.delete(matchId);
    else s.add(matchId);
    this.selectedMatchIds.set(s);
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedMatchIds.set(new Set());
    } else {
      this.selectedMatchIds.set(new Set(this.matches().map((m) => m._id)));
    }
  }

  clearSelection(): void {
    this.selectedMatchIds.set(new Set());
  }

  private async resetScores(ids: string[]): Promise<boolean> {
    try {
      await firstValueFrom(
        this.api.post<{ success: boolean; resetCount: number }>(
          '/match-scores/reset-bulk',
          { matchIds: ids },
        ),
      );
      this.matches.update((list) =>
        list.map((m) =>
          ids.includes(m._id) ? { ...m, status: 'pending' as const, result: undefined } : m,
        ),
      );
      this.selectedMatchIds.set(new Set());
      return true;
    } catch {
      Swal.fire({ icon: 'error', title: '清除失敗', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return false;
    }
  }

  async clearAllScores(): Promise<void> {
    const label = this.typeLabel();
    const ids = this.matches().map((m) => m._id);
    const result = await Swal.fire({
      title: `清除全部${label}成績？`,
      text: `此操作將重置 ${ids.length} 場比賽成績，場次資料保留，無法復原。`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '確認清除',
      cancelButtonText: '取消',
      confirmButtonColor: '#ef4444',
      ...SWAL_DARK,
    });
    if (!result.isConfirmed) return;
    const ok = await this.resetScores(ids);
    if (ok) {
      Swal.fire({ icon: 'success', title: `已清除 ${ids.length} 場成績`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    }
  }

  async clearCompletedScores(): Promise<void> {
    const label = this.typeLabel();
    const ids = this.matches().filter((m) => m.status === 'completed').map((m) => m._id);
    if (ids.length === 0) {
      Swal.fire({ icon: 'info', title: '目前沒有已完成的場次', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      return;
    }
    const result = await Swal.fire({
      title: `清除已完成${label}成績？`,
      text: `此操作將重置 ${ids.length} 場已完成比賽的成績，無法復原。`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '確認清除',
      cancelButtonText: '取消',
      confirmButtonColor: '#ef4444',
      ...SWAL_DARK,
    });
    if (!result.isConfirmed) return;
    const ok = await this.resetScores(ids);
    if (ok) {
      Swal.fire({ icon: 'success', title: `已清除 ${ids.length} 場成績`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    }
  }

  async clearSelectedScores(): Promise<void> {
    const ids = [...this.selectedMatchIds()];
    const result = await Swal.fire({
      title: `清除所選 ${ids.length} 場成績？`,
      text: '此操作將重置所選場次成績，場次資料保留，無法復原。',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '確認清除',
      cancelButtonText: '取消',
      confirmButtonColor: '#ef4444',
      ...SWAL_DARK,
    });
    if (!result.isConfirmed) return;
    const ok = await this.resetScores(ids);
    if (ok) {
      Swal.fire({ icon: 'success', title: `已清除 ${ids.length} 場成績`, toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    }
  }

  toggleGroup(group: WeightGroupExpanded): void {
    group.expanded = !group.expanded;
    this.matches.set([...this.matches()]);
  }

  startEdit(m: Match): void {
    this.editState.set({
      matchId: m._id,
      redName: m.redPlayer.name,
      redTeam: m.redPlayer.teamName,
      blueName: m.bluePlayer.name,
      blueTeam: m.bluePlayer.teamName,
      scheduledOrder: m.scheduledOrder,
    });
  }

  cancelEdit(): void {
    this.editState.set(null);
  }

  saveEdit(m: Match): void {
    const s = this.editState();
    if (!s || s.matchId !== m._id) return;
    const eventId = this.eventId;
    this.api
      .patch<{ success: boolean; data: Match }>(
        `/events/${eventId}/matches/${m._id}`,
        {
          redPlayer: { name: s.redName, teamName: s.redTeam },
          bluePlayer: { name: s.blueName, teamName: s.blueTeam },
          scheduledOrder: s.scheduledOrder,
        },
      )
      .subscribe({
        next: () => {
          this.editState.set(null);
          this.loadMatches(eventId);
          Swal.fire({ icon: "success", title: "已儲存", toast: true, position: "top-end", showConfirmButton: false, timer: 1500 });
        },
        error: () => Swal.fire({ icon: "error", title: "儲存失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 }),
      });
  }

  async deleteMatch(m: Match): Promise<void> {
    const result = await Swal.fire({
      title: "確認刪除？",
      text: `場次序 ${m.scheduledOrder}：${m.redPlayer.name} vs ${m.bluePlayer.name}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
      confirmButtonColor: "#ef4444",
      background: "#1e293b",
      color: "#fff",
    });
    if (!result.isConfirmed) return;
    this.api
      .delete<{ success: boolean }>(`/events/${this.eventId}/matches/${m._id}`)
      .subscribe({
        next: () => {
          this.matches.set(this.matches().filter((x) => x._id !== m._id));
          Swal.fire({ icon: "success", title: "已刪除", toast: true, position: "top-end", showConfirmButton: false, timer: 1500 });
        },
        error: () => Swal.fire({ icon: "error", title: "刪除失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 }),
      });
  }

  async clearAll(): Promise<void> {
    const label = this.typeLabel();
    const result = await Swal.fire({
      title: `清空所有${label}賽程？`,
      text: "此操作無法復原，確認要刪除所有場次嗎？",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "確認清空",
      cancelButtonText: "取消",
      confirmButtonColor: "#ef4444",
      background: "#1e293b",
      color: "#fff",
    });
    if (!result.isConfirmed) return;
    this.api
      .delete<{ success: boolean; deleted: number }>(
        `/events/${this.eventId}/matches?matchType=${this.matchType()}`,
      )
      .subscribe({
        next: (res) => {
          this.matches.set([]);
          Swal.fire({ icon: "success", title: `已清空 ${res.deleted} 筆場次`, toast: true, position: "top-end", showConfirmButton: false, timer: 2000 });
        },
        error: () => Swal.fire({ icon: "error", title: "清空失敗", toast: true, position: "top-end", showConfirmButton: false, timer: 2000 }),
      });
  }

  downloadTemplate(): void {
    const isNeWaza = this.matchType() === "ne-waza";
    const header = isNeWaza
      ? ["項目", "組別", "分級", "量級", "回合", "場次序", "紅方姓名", "紅方隊名", "藍方姓名", "藍方隊名"]
      : ["項目", "組別", "量級", "回合", "場次序", "紅方姓名", "紅方隊名", "藍方姓名", "藍方隊名"];
    const samples = isNeWaza
      ? [
          [this.matchType(), "male", "國小低年級組", "–26公斤級", "1", "1", "張三", "A隊", "", ""],
          [this.matchType(), "male", "國小低年級組", "–26公斤級", "1", "3", "李四", "B隊", "王五", "C隊"],
          [this.matchType(), "male", "國小低年級組", "–26公斤級", "1", "16", "3勝", "", "趙六", "D隊"],
        ]
      : [[this.matchType(), "male", "-62kg", "1", "1", "張三", "A隊", "李四", "B隊"]];
    const ws = XLSX.utils.aoa_to_sheet([header, ...samples]);
    ws["!cols"] = header.map(() => ({ wch: 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "賽程範本");
    XLSX.writeFile(wb, `${this.typeLabel()}賽程匯入範本.xlsx`);
  }

  // ── 拖曳事件 ──────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) void this.handleFile(file);
  }

  onFileInputChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = "";
    if (file) void this.handleFile(file);
  }

  // ── 匯入主流程 ────────────────────────────
  private async handleFile(file: File): Promise<void> {
    const ev = this.currentEvent();
    if (!ev || this.importLoading()) return;

    // 永遠詢問，避免因 signal 尚未載入而跳過對話框
    const answer = await Swal.fire({
      title: `匯入${this.typeLabel()}賽程`,
      text: "是否清空現有項目資料及成績後再匯入？",
      icon: "question",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "是，清空後匯入",
      denyButtonText: "否，保留並補入新資料",
      cancelButtonText: "取消",
      confirmButtonColor: "#ef4444",
      denyButtonColor: "#3b82f6",
      ...SWAL_DARK,
    });

    if (answer.isDismissed) return;

    this.importLoading.set(true);
    let existingOrders: number[] = [];

    if (answer.isConfirmed) {
      // 清空現有資料
      try {
        await firstValueFrom(
          this.api.delete<{ success: boolean; deleted: number }>(
            `/events/${ev._id}/matches?matchType=${this.matchType()}`,
          ),
        );
        this.matches.set([]);
      } catch {
        this.importLoading.set(false);
        Swal.fire({ icon: "error", title: "清空失敗，匯入已取消", ...SWAL_DARK, confirmButtonColor: "#3b82f6" });
        return;
      }
    } else {
      // 保留現有：向 API 取得最新場次序號，確保不依賴可能過時的 signal
      try {
        const res = await firstValueFrom(
          this.api.get<{ success: boolean; data: Match[] }>(
            `/events/${ev._id}/matches?matchType=${this.matchType()}`,
          ),
        );
        existingOrders = res.data.map((m) => m.scheduledOrder);
        this.matches.set(res.data);
      } catch {
        existingOrders = this.matches().map((m) => m.scheduledOrder);
      }
    }

    this.parseAndImport(file, ev, existingOrders);
  }

  private parseAndImport(file: File, ev: EventItem, existingOrders: number[]): void {
    const existingSet = new Set(existingOrders);
    const currentType = this.matchType() as "ne-waza" | "fighting" | "contact";

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Array<Record<string, string | number>> = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const errors: Array<{ row: number; error: string }> = [];
        const validMatches: ReturnType<typeof parseMatchRow>[] = [];
        rows.forEach((row, i) => {
          const parsed = parseMatchRow(row, currentType);
          if (isParseError(parsed)) {
            errors.push({ row: i + 2, error: parsed.error });
          } else {
            validMatches.push(parsed);
          }
        });

        const skipped = validMatches.filter(
          (m) => !isParseError(m) && existingSet.has(m.scheduledOrder),
        );
        const toImport = validMatches.filter(
          (m) => !isParseError(m) && !existingSet.has(m.scheduledOrder),
        );

        const showErrors = async () => {
          if (errors.length === 0) return;
          const lines = errors
            .slice(0, 20)
            .map((e) => `第 ${e.row} 列：${e.error}`)
            .join('\n');
          const more = errors.length > 20 ? `\n…還有 ${errors.length - 20} 列錯誤` : "";
          await Swal.fire({
            icon: "warning",
            title: `${errors.length} 列匯入錯誤`,
            text: `${lines}${more}`,
            ...SWAL_DARK,
            confirmButtonColor: "#3b82f6",
          });
        };

        if (toImport.length === 0) {
          this.importLoading.set(false);
          void showErrors().then(() => {
            Swal.fire({
              icon: "info",
              title: "無新增資料",
              text:
                errors.length > 0
                  ? `${errors.length} 列無效，${skipped.length} 列重複，無可匯入資料。`
                  : `所有 ${skipped.length} 筆場次序號均已存在。`,
              ...SWAL_DARK,
              confirmButtonColor: "#3b82f6",
            });
          });
          return;
        }

        this.api
          .post<{ success: boolean; count: number; error?: string }>(
            `/events/${ev._id}/matches/bulk`,
            toImport,
          )
          .subscribe({
            next: (res) => {
              this.importLoading.set(false);
              if (res.success) {
                void showErrors().then(() => {
                  let title = `成功匯入 ${res.count} 筆賽程`;
                  if (skipped.length > 0) title += `，略過 ${skipped.length} 筆重複場次`;
                  if (errors.length > 0) title += `，${errors.length} 列錯誤`;
                  Swal.fire({
                    icon: errors.length > 0 ? "warning" : "success",
                    title,
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 3000,
                  });
                  this.loadMatches(ev._id);
                });
              }
            },
            error: (err) => {
              this.importLoading.set(false);
              Swal.fire({ icon: "error", title: "匯入失敗", text: err.error?.error ?? "請確認格式正確", ...SWAL_DARK, confirmButtonColor: "#3b82f6" });
            },
          });
      } catch {
        this.importLoading.set(false);
        Swal.fire({ icon: "error", title: "檔案解析失敗", text: "請確認為 XLSX 或 CSV 格式", ...SWAL_DARK, confirmButtonColor: "#3b82f6" });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  goBack(): void {
    this.router.navigate(["/admin/events", this.eventId]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(["/login"]);
  }

  isEditing(matchId: string): boolean {
    return this.editState()?.matchId === matchId;
  }

  getEditState(): EditState | null {
    return this.editState();
  }
}
