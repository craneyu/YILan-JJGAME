import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
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
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [roleGuard('admin')],
  },
  { path: '**', redirectTo: '/login' },
];
