import { Injectable, signal, computed } from '@angular/core';

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

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentRole = computed(() => this._user()?.role ?? null);

  login(token: string, user: JwtPayload): void {
    localStorage.setItem('jju_token', token);
    this._token.set(token);
    this._user.set(user);
  }

  logout(): void {
    localStorage.removeItem('jju_token');
    this._token.set(null);
    this._user.set(null);
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
