import { Injectable, signal, computed } from "@angular/core";

export type CompetitionType = "kata" | "creative";

export interface JwtPayload {
  userId: string;
  role:
    | "scoring_judge"
    | "vr_judge"
    | "sequence_judge"
    | "admin"
    | "audience"
    | "match_referee";
  judgeNo?: number;
  eventId?: string;
  username?: string;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private _token = signal<string | null>(localStorage.getItem("jju_token"));
  private _user = signal<JwtPayload | null>(
    this.parseToken(localStorage.getItem("jju_token")),
  );
  private _competitionType = signal<CompetitionType>(
    (localStorage.getItem("jju_competition_type") as CompetitionType) ?? "kata",
  );
  private _eventCompetitionTypes = signal<("Duo" | "Show")[]>(
    JSON.parse(localStorage.getItem("jju_event_competition_types") ?? "[]"),
  );

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentRole = computed(() => this._user()?.role ?? null);
  readonly competitionType = this._competitionType.asReadonly();
  readonly eventCompetitionTypes = this._eventCompetitionTypes.asReadonly();

  login(
    token: string,
    user: JwtPayload,
    competitionType?: CompetitionType,
  ): void {
    localStorage.setItem("jju_token", token);
    this._token.set(token);
    this._user.set(user);
    if (competitionType) {
      localStorage.setItem("jju_competition_type", competitionType);
      this._competitionType.set(competitionType);
    }
  }

  setCompetitionType(type: CompetitionType): void {
    localStorage.setItem("jju_competition_type", type);
    this._competitionType.set(type);
  }

  setEventCompetitionTypes(types: ("Duo" | "Show")[]): void {
    localStorage.setItem("jju_event_competition_types", JSON.stringify(types));
    this._eventCompetitionTypes.set(types);
  }

  logout(): void {
    localStorage.removeItem("jju_token");
    localStorage.removeItem("jju_competition_type");
    localStorage.removeItem("jju_event_competition_types");
    this._token.set(null);
    this._user.set(null);
    this._competitionType.set("kata");
    this._eventCompetitionTypes.set([]);
  }

  getAuthHeader(): Record<string, string> {
    const t = this._token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  private parseToken(token: string | null): JwtPayload | null {
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload)) as JwtPayload;
    } catch {
      return null;
    }
  }
}
