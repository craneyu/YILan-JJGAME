import { Request, Response } from "express";
import Team, {
  IMember,
  WeighInStatus,
  CheckInStatus,
  computeTeamCheckedIn,
} from "../models/Team";
import { broadcast } from "../sockets/index";
import { applyMemberForfeit, ForfeitReason } from "../utils/forfeitPropagation";

interface ParticipantsTeamDto {
  teamId: string;
  name: string;
  competitionType: "Duo" | "Show";
  category: string;
  tier: string | null;
  order: number;
  members: IMember[];
  teamCheckedIn: boolean;
}

/** GET /api/v1/events/:eventId/participants */
export async function listParticipants(req: Request, res: Response): Promise<void> {
  const eventId = req.params.eventId as string;
  const teams = await Team.find({ eventId }).sort({ order: 1 }).lean();
  const result: ParticipantsTeamDto[] = teams.map((t) => ({
    teamId: String(t._id),
    name: t.name,
    competitionType: t.competitionType,
    category: t.category,
    tier: t.tier ?? null,
    order: t.order,
    members: t.members,
    teamCheckedIn: computeTeamCheckedIn(t.members),
  }));
  res.json({ success: true, data: result });
}

function buildBroadcastPayload(
  teamId: string,
  memberIndex: number,
  member: IMember,
) {
  return {
    teamId,
    memberIndex,
    memberName: member.name,
    weighInStatus: member.weighInStatus,
    checkInStatus: member.checkInStatus,
    disqualifyReason: member.disqualifyReason,
  };
}

/** PATCH /api/v1/events/:eventId/participants/:teamId/:memberIndex/weigh-in */
export async function setWeighIn(req: Request, res: Response): Promise<void> {
  const eventId = req.params.eventId as string;
  const teamId = req.params.teamId as string;
  const memberIndex = Number(req.params.memberIndex);
  const { status, reason } = req.body as { status: WeighInStatus; reason?: string };

  if (!["pending", "passed", "failed", "n/a"].includes(status)) {
    res.status(400).json({ success: false, error: "無效的 status" });
    return;
  }
  if (Number.isNaN(memberIndex) || memberIndex < 0) {
    res.status(400).json({ success: false, error: "無效的 memberIndex" });
    return;
  }

  const team = await Team.findOne({ _id: teamId, eventId });
  if (!team) {
    res.status(404).json({ success: false, error: "隊伍不存在" });
    return;
  }
  const member = team.members[memberIndex];
  if (!member) {
    res.status(404).json({ success: false, error: "隊員不存在" });
    return;
  }

  // 不可逆守衛：check_in_officer 不可逆轉 failed
  const requester = req.user?.role;
  if (member.weighInStatus === "failed" && requester !== "admin") {
    res
      .status(409)
      .json({ success: false, error: "狀態變更不可逆，請聯絡 admin" });
    return;
  }

  member.weighInStatus = status;
  member.weighInAt = new Date();
  if (reason !== undefined) member.disqualifyReason = reason;
  team.markModified("members");
  await team.save();

  broadcast.participantStatusChanged(
    eventId,
    buildBroadcastPayload(teamId, memberIndex, member),
  );

  let forfeitInfo: Awaited<ReturnType<typeof applyMemberForfeit>> | null = null;
  if (status === "failed") {
    forfeitInfo = await applyMemberForfeit({
      eventId,
      teamName: team.name,
      memberName: member.name,
      reason: "weigh-in-failed",
    });
    broadcast.matchForfeitApplied(eventId, {
      forfeitedMatchIds: forfeitInfo.forfeitedMatchIds,
      propagatedMatchIds: forfeitInfo.propagatedTargets.map((t) => t.matchId),
      reason: "weigh-in-failed" as ForfeitReason,
    });
  }

  res.json({
    success: true,
    data: {
      member,
      forfeit: forfeitInfo,
    },
  });
}

/** PATCH /api/v1/events/:eventId/participants/:teamId/:memberIndex/check-in */
export async function setCheckIn(req: Request, res: Response): Promise<void> {
  const eventId = req.params.eventId as string;
  const teamId = req.params.teamId as string;
  const memberIndex = Number(req.params.memberIndex);
  const { status, reason } = req.body as { status: CheckInStatus; reason?: string };

  if (!["pending", "present", "absent"].includes(status)) {
    res.status(400).json({ success: false, error: "無效的 status" });
    return;
  }
  if (Number.isNaN(memberIndex) || memberIndex < 0) {
    res.status(400).json({ success: false, error: "無效的 memberIndex" });
    return;
  }

  const team = await Team.findOne({ _id: teamId, eventId });
  if (!team) {
    res.status(404).json({ success: false, error: "隊伍不存在" });
    return;
  }
  const member = team.members[memberIndex];
  if (!member) {
    res.status(404).json({ success: false, error: "隊員不存在" });
    return;
  }

  const requester = req.user?.role;
  if (member.checkInStatus === "absent" && requester !== "admin") {
    res
      .status(409)
      .json({ success: false, error: "狀態變更不可逆，請聯絡 admin" });
    return;
  }

  member.checkInStatus = status;
  member.checkInAt = new Date();
  if (reason !== undefined) member.disqualifyReason = reason;
  team.markModified("members");
  await team.save();

  broadcast.participantStatusChanged(
    eventId,
    buildBroadcastPayload(teamId, memberIndex, member),
  );

  let forfeitInfo: Awaited<ReturnType<typeof applyMemberForfeit>> | null = null;
  if (status === "absent") {
    forfeitInfo = await applyMemberForfeit({
      eventId,
      teamName: team.name,
      memberName: member.name,
      reason: "check-in-absent",
    });
    broadcast.matchForfeitApplied(eventId, {
      forfeitedMatchIds: forfeitInfo.forfeitedMatchIds,
      propagatedMatchIds: forfeitInfo.propagatedTargets.map((t) => t.matchId),
      reason: "check-in-absent" as ForfeitReason,
    });
  }

  res.json({
    success: true,
    data: {
      member,
      forfeit: forfeitInfo,
    },
  });
}
