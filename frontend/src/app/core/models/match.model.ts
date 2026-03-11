export type MatchType = "ne-waza" | "fighting" | "contact";
export type MatchCategory = "male" | "female" | "mixed";
export type MatchStatus = "pending" | "in-progress" | "full-ippon-pending" | "shido-dq-pending" | "completed";
export type MatchWinner = "red" | "blue";
export type MatchMethod = "judge" | "submission" | "dq" | "full-ippon" | "shido-dq";

export interface MatchPlayer {
  name: string;
  teamName: string;
}

export interface MatchResult {
  winner: MatchWinner;
  method: MatchMethod;
}

export interface IIppons {
  p1: number;
  p2: number;
  p3: number;
}

export interface Match {
  _id: string;
  eventId: string;
  matchType: MatchType;
  category: MatchCategory;
  weightClass: string;
  round: number;
  matchNo: number;
  redPlayer: MatchPlayer;
  bluePlayer: MatchPlayer;
  status: MatchStatus;
  result?: MatchResult;
  isBye: boolean;
  scheduledOrder: number;
  createdAt: string;
  // fighting-specific (optional)
  matchDuration?: number;
  redPart1Score?: number;
  redPart2Score?: number;
  redPart3Score?: number;
  bluePart1Score?: number;
  bluePart2Score?: number;
  bluePart3Score?: number;
  redIppons?: IIppons;
  blueIppons?: IIppons;
  redWazaAri?: number;
  blueWazaAri?: number;
  redShido?: number;
  blueShido?: number;
}

export type ScoreLogSide = "red" | "blue";
export type ScoreLogType =
  | "score"
  | "advantage"
  | "warning"
  | "submission"
  | "undo"
  | "part-score"
  | "all-parts-score"
  | "foul"
  | "timer-adjust";

export interface MatchScoreLog {
  _id: string;
  matchId: string;
  side: ScoreLogSide;
  type: ScoreLogType;
  value: number;
  timestamp: string;
}

/** 即時計分狀態（從 log 重算） */
export interface MatchLiveState {
  redScore: number;
  blueScore: number;
  redAdvantage: number;
  blueAdvantage: number;
  redWarnings: number;
  blueWarnings: number;
}

export function calcLiveState(logs: MatchScoreLog[]): MatchLiveState {
  const state: MatchLiveState = {
    redScore: 0,
    blueScore: 0,
    redAdvantage: 0,
    blueAdvantage: 0,
    redWarnings: 0,
    blueWarnings: 0,
  };

  for (const log of logs) {
    const side = log.side;
    switch (log.type) {
      case "score":
        if (side === "red") state.redScore += log.value;
        else state.blueScore += log.value;
        break;
      case "advantage":
        if (side === "red") state.redAdvantage += log.value;
        else state.blueAdvantage += log.value;
        break;
      case "warning":
        if (side === "red") state.redWarnings += log.value;
        else state.blueWarnings += log.value;
        break;
      case "undo":
        // undo 的 value 固定為 -1，前端在 append 時已處理實際扣除
        break;
    }
  }

  return state;
}
