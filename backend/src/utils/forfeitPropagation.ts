import Match from '../models/Match';
import { propagateMatchWinner, PropagatedTarget } from './matchPropagation';

export type ForfeitReason = 'weigh-in-failed' | 'check-in-absent';

export interface ApplyMemberForfeitArgs {
  eventId: string;
  teamName: string;
  memberName: string;
  reason: ForfeitReason;
}

export interface ApplyMemberForfeitResult {
  forfeitedMatchIds: string[];
  propagatedTargets: PropagatedTarget[];
  skippedMatchIds: string[];
}

/**
 * 將某選手所有 pending 場次自動 bye 化（對手獲勝 + method 'dq'），並沿 source 鏈推進下游。
 *
 * 規則：
 * - 只處理 status === 'pending' 的場次；in-progress / completed 不修改，回傳 skippedMatchIds 供 controller 通知操作員
 * - 同名比對採 (name + teamName) 雙鍵（CLAUDE.md 已明定同事件內姓名唯一）
 * - 冪等：對已 completed 的選手場次重複呼叫 SHALL be no-op
 */
export async function applyMemberForfeit(
  args: ApplyMemberForfeitArgs,
): Promise<ApplyMemberForfeitResult> {
  const { eventId, teamName, memberName } = args;

  const matches = await Match.find({
    eventId,
    $or: [
      { 'redPlayer.name': memberName, 'redPlayer.teamName': teamName },
      { 'bluePlayer.name': memberName, 'bluePlayer.teamName': teamName },
    ],
  });

  const forfeitedMatchIds: string[] = [];
  const skippedMatchIds: string[] = [];
  const propagatedTargets: PropagatedTarget[] = [];

  for (const match of matches) {
    if (match.status !== 'pending') {
      // in-progress 或 completed：不動，丟回 controller 由人類決定
      if (match.status !== 'completed') skippedMatchIds.push(String(match._id));
      continue;
    }

    const isRed =
      match.redPlayer.name === memberName && match.redPlayer.teamName === teamName;
    const winnerSide: 'red' | 'blue' = isRed ? 'blue' : 'red';
    const winnerPlayer = isRed ? match.bluePlayer : match.redPlayer;

    match.isBye = true;
    match.status = 'completed';
    match.result = { winner: winnerSide, method: 'dq' };
    await match.save();

    forfeitedMatchIds.push(String(match._id));

    // 沿 source 鏈推進下游
    const targets = await propagateMatchWinner({
      eventId,
      completedMatchNo: match.matchNo,
      winnerName: winnerPlayer.name,
      winnerTeamName: winnerPlayer.teamName,
    });
    propagatedTargets.push(...targets);
  }

  return { forfeitedMatchIds, propagatedTargets, skippedMatchIds };
}
