/**
 * ParticipantBadgeComponent 元件測試：依 (weighInStatus, checkInStatus) 對應渲染徽章。
 * 對應 check-in-and-weigh-in-system change 的 Referee match detail badges spec。
 */
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { Component } from "@angular/core";
import {
  ParticipantBadgeComponent,
  MemberStatus,
  deriveTeamBadgeMember,
} from "./participant-badge.component";

@Component({
  standalone: true,
  imports: [ParticipantBadgeComponent],
  template: `<app-participant-badge [member]="member" />`,
})
class HostComponent {
  member: MemberStatus | null = null;
}

describe("ParticipantBadgeComponent", () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  function renderedText(): string {
    return fixture.nativeElement.textContent.trim();
  }

  function renderedClasses(): string {
    const span = fixture.nativeElement.querySelector("span");
    return span ? span.className : "";
  }

  it("member = null → 不渲染任何 span", () => {
    host.member = null;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector("span")).toBeNull();
  });

  it("weighInStatus = 'failed' → 顯示「過磅失格」紅色", () => {
    host.member = { weighInStatus: "failed", checkInStatus: "pending" };
    fixture.detectChanges();
    expect(renderedText()).toContain("過磅失格");
    expect(renderedClasses()).toContain("bg-red-500/20");
  });

  it("checkInStatus = 'absent' → 顯示「檢錄未到」紅色", () => {
    host.member = { weighInStatus: "passed", checkInStatus: "absent" };
    fixture.detectChanges();
    expect(renderedText()).toContain("檢錄未到");
    expect(renderedClasses()).toContain("bg-red-500/20");
  });

  it("present + passed → 顯示「已檢錄」綠色", () => {
    host.member = { weighInStatus: "passed", checkInStatus: "present" };
    fixture.detectChanges();
    expect(renderedText()).toContain("已檢錄");
    expect(renderedClasses()).toContain("bg-emerald-500/20");
  });

  it("present + n/a（演武免過磅 + 已檢錄）→ 顯示「已檢錄」綠色", () => {
    host.member = { weighInStatus: "n/a", checkInStatus: "present" };
    fixture.detectChanges();
    expect(renderedText()).toContain("已檢錄");
    expect(renderedClasses()).toContain("bg-emerald-500/20");
  });

  it("pending + pending → 顯示「未檢錄」灰色", () => {
    host.member = { weighInStatus: "pending", checkInStatus: "pending" };
    fixture.detectChanges();
    expect(renderedText()).toContain("未檢錄");
    expect(renderedClasses()).toContain("bg-white/10");
  });

  it("優先順序：failed 優先於 absent", () => {
    host.member = { weighInStatus: "failed", checkInStatus: "absent" };
    fixture.detectChanges();
    expect(renderedText()).toContain("過磅失格");
    expect(renderedText()).not.toContain("檢錄未到");
  });

  describe("演武 team-level 徽章（end-to-end derived 流程，spec 8.2 場景）", () => {
    it("Duo 一位 absent → backend teamCheckedIn=false → audience 顯示「檢錄未到」", () => {
      host.member = deriveTeamBadgeMember(false);
      fixture.detectChanges();
      expect(renderedText()).toContain("檢錄未到");
      expect(renderedClasses()).toContain("bg-red-500/20");
    });

    it("Duo 全部 present → backend teamCheckedIn=true → audience 顯示「已檢錄」", () => {
      host.member = deriveTeamBadgeMember(true);
      fixture.detectChanges();
      expect(renderedText()).toContain("已檢錄");
      expect(renderedClasses()).toContain("bg-emerald-500/20");
    });

    it("資料未載入（undefined）→ 不渲染徽章", () => {
      host.member = deriveTeamBadgeMember(undefined);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("span")).toBeNull();
    });
  });
});
