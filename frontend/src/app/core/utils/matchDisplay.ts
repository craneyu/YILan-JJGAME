import type { MatchPlayer, MatchSource } from '../models/match.model';

export interface DisplayPlayerName {
  text: string;
  teamName: string;
  isPlaceholder: boolean;
}

/**
 * 場次列表 / 觀眾頁渲染選手姓名的 helper：
 * - 未 resolved 的 source → 顯示「N 勝者」灰字 placeholder
 * - 已 resolved 或無 source → 顯示實際 player.name / teamName
 */
export function displayPlayerName(
  player: MatchPlayer | undefined | null,
  source: MatchSource | null | undefined,
): DisplayPlayerName {
  if (source && !source.resolved) {
    return {
      text: `${source.fromMatchNo} 勝者`,
      teamName: '',
      isPlaceholder: true,
    };
  }
  return {
    text: player?.name ?? '',
    teamName: player?.teamName ?? '',
    isPlaceholder: false,
  };
}
