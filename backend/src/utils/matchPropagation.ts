import Match from '../models/Match';

export interface PropagateMatchWinnerArgs {
  eventId: string;
  completedMatchNo: number;
  winnerName: string;
  winnerTeamName: string;
}

export interface PropagatedTarget {
  matchId: string;
  side: 'red' | 'blue';
  playerName: string;
  teamName: string;
  fromMatchNo: number;
}

/**
 * 一場完賽（matchNo = completedMatchNo）後，將勝者寫入所有引用此場且尚未 resolved 的下游場次。
 * 冪等：若某下游 side.resolved 已為 true，不再寫入也不廣播。
 */
export async function propagateMatchWinner(args: PropagateMatchWinnerArgs): Promise<PropagatedTarget[]> {
  const { eventId, completedMatchNo, winnerName, winnerTeamName } = args;

  const downstream = await Match.find({
    eventId,
    $or: [
      { 'redSource.fromMatchNo': completedMatchNo, 'redSource.resolved': false },
      { 'blueSource.fromMatchNo': completedMatchNo, 'blueSource.resolved': false },
    ],
  });

  const targets: PropagatedTarget[] = [];

  for (const match of downstream) {
    let updated = false;

    if (
      match.redSource &&
      match.redSource.fromMatchNo === completedMatchNo &&
      !match.redSource.resolved
    ) {
      match.redPlayer.name = winnerName;
      match.redPlayer.teamName = winnerTeamName;
      match.redSource.resolved = true;
      targets.push({
        matchId: String(match._id),
        side: 'red',
        playerName: winnerName,
        teamName: winnerTeamName,
        fromMatchNo: completedMatchNo,
      });
      updated = true;
    }

    if (
      match.blueSource &&
      match.blueSource.fromMatchNo === completedMatchNo &&
      !match.blueSource.resolved
    ) {
      match.bluePlayer.name = winnerName;
      match.bluePlayer.teamName = winnerTeamName;
      match.blueSource.resolved = true;
      targets.push({
        matchId: String(match._id),
        side: 'blue',
        playerName: winnerName,
        teamName: winnerTeamName,
        fromMatchNo: completedMatchNo,
      });
      updated = true;
    }

    if (updated) await match.save();
  }

  return targets;
}
