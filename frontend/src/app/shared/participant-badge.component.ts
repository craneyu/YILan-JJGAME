import { ChangeDetectionStrategy, Component, input } from "@angular/core";

export type WeighInStatus = "pending" | "passed" | "failed" | "n/a";
export type CheckInStatus = "pending" | "present" | "absent";

export interface MemberStatus {
  weighInStatus: WeighInStatus;
  checkInStatus: CheckInStatus;
}

interface BadgeView {
  label: string;
  cls: string;
}

/**
 * 將 team-level 檢錄狀態（boolean）對應為 MemberStatus 供 ParticipantBadge 渲染。
 * 用於演武團體計：teamCheckedIn === false → 「⛔ 檢錄未到」徽章。
 *
 * undefined 回 null（表示資料未載入，不渲染徽章）。
 */
export function deriveTeamBadgeMember(
  teamCheckedIn: boolean | undefined,
): MemberStatus | null {
  if (teamCheckedIn === undefined) return null;
  return {
    weighInStatus: "n/a",
    checkInStatus: teamCheckedIn ? "present" : "absent",
  };
}

function deriveBadge(m: MemberStatus | null | undefined): BadgeView | null {
  if (!m) return null;
  if (m.weighInStatus === "failed") {
    return { label: "❌ 過磅失格", cls: "bg-red-500/20 text-red-300" };
  }
  if (m.checkInStatus === "absent") {
    return { label: "⛔ 檢錄未到", cls: "bg-red-500/20 text-red-300" };
  }
  if (
    m.checkInStatus === "present" &&
    (m.weighInStatus === "passed" || m.weighInStatus === "n/a")
  ) {
    return { label: "✅ 已檢錄", cls: "bg-emerald-500/20 text-emerald-300" };
  }
  return { label: "⚠️ 未檢錄", cls: "bg-white/10 text-white/60" };
}

@Component({
  selector: "app-participant-badge",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (badge(); as b) {
      <span class="ml-2 px-2 py-0.5 rounded text-xs whitespace-nowrap" [class]="b.cls">
        {{ b.label }}
      </span>
    }
  `,
})
export class ParticipantBadgeComponent {
  member = input<MemberStatus | null>(null);
  protected badge = () => deriveBadge(this.member());
}
