import { Routes } from "@angular/router";
import { authGuard, roleGuard } from "./core/guards/auth.guard";

export const appRoutes: Routes = [
  { path: "", redirectTo: "/login", pathMatch: "full" },
  {
    path: "login",
    loadComponent: () =>
      import("./features/login/login.component").then((m) => m.LoginComponent),
  },

  // ── 雙人演武（Kata）路由群組 ──
  {
    path: "judge/scoring",
    loadComponent: () =>
      import("./features/scoring-judge/scoring-judge.component").then(
        (m) => m.ScoringJudgeComponent,
      ),
    canActivate: [roleGuard("scoring_judge", "admin")],
  },
  {
    path: "judge/vr",
    loadComponent: () =>
      import("./features/vr-judge/vr-judge.component").then(
        (m) => m.VrJudgeComponent,
      ),
    canActivate: [roleGuard("vr_judge", "admin")],
  },
  {
    path: "judge/sequence",
    loadComponent: () =>
      import("./features/sequence-judge/sequence-judge.component").then(
        (m) => m.SequenceJudgeComponent,
      ),
    canActivate: [roleGuard("sequence_judge", "admin")],
  },
  {
    path: "audience-select",
    loadComponent: () =>
      import("./features/audience-sport-selector/audience-sport-selector.component").then(
        (m) => m.AudienceSportSelectorComponent,
      ),
  },
  {
    path: "audience",
    loadComponent: () =>
      import("./features/audience/audience.component").then(
        (m) => m.AudienceComponent,
      ),
  },

  // ── 創意演武（Creative Embu）路由群組 ──
  {
    path: "creative/scoring",
    loadComponent: () =>
      import("./features/creative-scoring-judge/creative-scoring-judge.component").then(
        (m) => m.CreativeScoringJudgeComponent,
      ),
    canActivate: [roleGuard("scoring_judge", "admin")],
  },
  {
    path: "creative/sequence",
    loadComponent: () =>
      import("./features/creative-sequence-judge/creative-sequence-judge.component").then(
        (m) => m.CreativeSequenceJudgeComponent,
      ),
    canActivate: [roleGuard("sequence_judge", "admin")],
  },
  {
    path: "creative/audience",
    loadComponent: () =>
      import("./features/creative-audience/creative-audience.component").then(
        (m) => m.CreativeAudienceComponent,
      ),
  },

  // ── 管理員 ──
  {
    path: "admin",
    redirectTo: "/admin/events",
    pathMatch: "full",
  },
  {
    path: "admin/events",
    loadComponent: () =>
      import("./features/admin/event-list/event-list.component").then(
        (m) => m.EventListComponent,
      ),
    canActivate: [roleGuard("admin")],
  },
  {
    path: "admin/events/:eventId",
    loadComponent: () =>
      import("./features/admin/admin-sport-selector/admin-sport-selector.component").then(
        (m) => m.AdminSportSelectorComponent,
      ),
    canActivate: [roleGuard("admin")],
  },
  {
    path: "admin/events/:eventId/kata",
    loadComponent: () =>
      import("./features/admin/admin.component").then((m) => m.AdminComponent),
    canActivate: [roleGuard("admin")],
  },
  {
    path: "admin/events/:eventId/matches/:matchType",
    loadComponent: () =>
      import("./features/admin/match-management/match-management.component").then(
        (m) => m.MatchManagementComponent,
      ),
    canActivate: [roleGuard("admin")],
  },
  {
    path: "admin/judges",
    loadComponent: () =>
      import("./features/admin/judge-management/judge-management.component").then(
        (m) => m.JudgeManagementComponent,
      ),
    canActivate: [roleGuard("admin")],
  },

  // ── 裁判入口 ──
  {
    path: "referee",
    loadComponent: () =>
      import("./features/referee-landing/referee-landing.component").then(
        (m) => m.RefereeLandingComponent,
      ),
    canActivate: [roleGuard("match_referee", "admin")],
  },

  // ── 柔術場次 ──
  {
    path: "fighting-referee",
    loadComponent: () =>
      import("./features/fighting-referee/fighting-referee.component").then(
        (m) => m.FightingRefereeComponent,
      ),
    canActivate: [roleGuard("match_referee", "admin")],
  },
  {
    path: "ne-waza-referee",
    loadComponent: () =>
      import("./features/ne-waza-referee/ne-waza-referee.component").then(
        (m) => m.NeWazaRefereeComponent,
      ),
    canActivate: [roleGuard("match_referee", "admin")],
    data: { sportType: "ne-waza" },
  },
  {
    path: "contact-referee",
    loadComponent: () =>
      import("./features/ne-waza-referee/ne-waza-referee.component").then(
        (m) => m.NeWazaRefereeComponent,
      ),
    canActivate: [roleGuard("match_referee", "admin")],
    data: { sportType: "contact" },
  },
  {
    path: "fighting-audience",
    loadComponent: () =>
      import("./features/fighting-audience/fighting-audience.component").then(
        (m) => m.FightingAudienceComponent,
      ),
  },
  {
    path: "ne-waza-audience",
    loadComponent: () =>
      import("./features/ne-waza-audience/ne-waza-audience.component").then(
        (m) => m.NeWazaAudienceComponent,
      ),
  },
  {
    path: "contact-audience",
    loadComponent: () =>
      import("./features/contact-audience/contact-audience.component").then(
        (m) => m.ContactAudienceComponent,
      ),
  },
  { path: "**", redirectTo: "/login" },
];
