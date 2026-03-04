import { Injectable, signal, computed } from '@angular/core';

export type CompetitionType = 'kata' | 'creative';

export interface JwtPayload {
  userId: string;
  role: 'scoring_judge' | 'vr_judge' | 'sequence_judge' | 'admin' | 'audience';
  judgeNo?: number;
  eventId?: string;
  username?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem('jju_token'));
  private _user = signal<JwtPayload | null>(this.parseToken(localStorage.getItem('jju_token')));
  private _competitionType = signal<CompetitionType>(
    (localStorage.getItem('jju_competition_type') as CompetitionType) ?? 'kata'
  );

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentRole = computed(() => this._user()?.role ?? null);
  readonly competitionType = this._competitionType.asReadonly();

  login(token: string, user: JwtPayload, competitionType?: CompetitionType): void {
    localStorage.setItem('jju_token', token);
    this._token.set(token);
    this._user.set(user);
    if (competitionType) {
      localStorage.setItem('jju_competition_type', competitionType);
      this._competitionType.set(competitionType);
    }
  }

  setCompetitionType(type: CompetitionType): void {
    localStorage.setItem('jju_competition_type', type);
    this._competitionType.set(type);
  }

  logout(): void {
    localStorage.removeItem('jju_token');
    localStorage.removeItem('jju_competition_type');
    this._token.set(null);
    this._user.set(null);
    this._competitionType.set('kata');
  }

  getAuthHeader(): Record<string, string> {
    const t = this._token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  private parseToken(token: string | null): JwtPayload | null {
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload)) as JwtPayload;
    } catch {
      return null;
    }
  }
}
