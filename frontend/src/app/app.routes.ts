import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },

  // ── 雙人演武（Kata）路由群組 ──
  {
    path: 'judge/scoring',
    loadComponent: () =>
      import('./features/scoring-judge/scoring-judge.component').then(
        (m) => m.ScoringJudgeComponent
      ),
    canActivate: [roleGuard('scoring_judge', 'admin')],
  },
  {
    path: 'judge/vr',
    loadComponent: () =>
      import('./features/vr-judge/vr-judge.component').then((m) => m.VrJudgeComponent),
    canActivate: [roleGuard('vr_judge', 'admin')],
  },
  {
    path: 'judge/sequence',
    loadComponent: () =>
      import('./features/sequence-judge/sequence-judge.component').then(
        (m) => m.SequenceJudgeComponent
      ),
    canActivate: [roleGuard('sequence_judge', 'admin')],
  },
  {
    path: 'audience',
    loadComponent: () =>
      import('./features/audience/audience.component').then((m) => m.AudienceComponent),
  },

  // ── 創意演武（Creative Embu）路由群組 ──
  {
    path: 'creative/scoring',
    loadComponent: () =>
      import('./features/creative-scoring-judge/creative-scoring-judge.component').then(
        (m) => m.CreativeScoringJudgeComponent
      ),
    canActivate: [roleGuard('scoring_judge', 'admin')],
  },
  {
    path: 'creative/sequence',
    loadComponent: () =>
      import('./features/creative-sequence-judge/creative-sequence-judge.component').then(
        (m) => m.CreativeSequenceJudgeComponent
      ),
    canActivate: [roleGuard('sequence_judge', 'admin')],
  },
  {
    path: 'creative/audience',
    loadComponent: () =>
      import('./features/creative-audience/creative-audience.component').then(
        (m) => m.CreativeAudienceComponent
      ),
  },

  // ── 共用 ──
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [roleGuard('admin')],
  },
  { path: '**', redirectTo: '/login' },
];
