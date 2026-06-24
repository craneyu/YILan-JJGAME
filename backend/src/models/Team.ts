import mongoose, { Document, Schema } from 'mongoose';

export type TeamTier = 'EL' | 'EM' | 'EH' | 'JH' | 'SH' | 'OPEN' | 'ELEM';

export type WeighInStatus = 'pending' | 'passed' | 'failed' | 'n/a';
export type CheckInStatus = 'pending' | 'present' | 'absent';

export interface IMember {
  name: string;
  weighInStatus: WeighInStatus;
  checkInStatus: CheckInStatus;
  weighInAt?: Date;
  checkInAt?: Date;
  disqualifyReason?: string;
}

export interface ITeam extends Document {
  eventId: mongoose.Types.ObjectId;
  name: string;
  members: IMember[];
  category: 'male' | 'female' | 'mixed';
  order: number;
  competitionType: 'Duo' | 'Show';
  tier: TeamTier | null;
}

const MemberSchema = new Schema<IMember>(
  {
    name: { type: String, required: true },
    weighInStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'n/a'],
      default: 'pending',
    },
    checkInStatus: {
      type: String,
      enum: ['pending', 'present', 'absent'],
      default: 'pending',
    },
    weighInAt: { type: Date },
    checkInAt: { type: Date },
    disqualifyReason: { type: String },
  },
  { _id: false },
);

const TeamSchema = new Schema<ITeam>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  members: { type: [MemberSchema], required: true },
  category: {
    type: String,
    enum: ['male', 'female', 'mixed'],
    required: true,
  },
  order: { type: Number, required: true },
  competitionType: {
    type: String,
    enum: ['Duo', 'Show'],
    default: 'Duo',
  },
  tier: {
    type: String,
    enum: ['EL', 'EM', 'EH', 'JH', 'SH', 'OPEN', 'ELEM', null],
    default: null,
  },
});

// 確保同一賽事內，各隊員姓名唯一
TeamSchema.index({ eventId: 1, order: 1 });

/** 演武類 team 預設 weighInStatus = 'n/a'（免過磅）；其他類預設 'pending'。 */
export function defaultWeighInStatus(
  competitionType: 'Duo' | 'Show' | null | undefined,
): WeighInStatus {
  if (competitionType === 'Duo' || competitionType === 'Show') return 'n/a';
  return 'pending';
}

/** 將原始姓名字串列表升級為 IMember 陣列，套用預設狀態。 */
export function buildMembersFromNames(
  names: string[],
  competitionType: 'Duo' | 'Show' | null | undefined,
): IMember[] {
  const weighInStatus = defaultWeighInStatus(competitionType);
  return names.map((n) => ({
    name: n,
    weighInStatus,
    checkInStatus: 'pending' as const,
  }));
}

/** 取出成員姓名清單（legacy 端點仍以 string[] 對外）。 */
export function memberNames(members: IMember[]): string[] {
  return members.map((m) => m.name);
}

/**
 * 計算 team-level 檢錄完成狀態：所有成員的 checkInStatus 都為 'present' 才算完成。
 *
 * 任一成員 absent 或 pending → false（用於演武團體計，任一人未到即整隊未完成檢錄）。
 * 空陣列回 true（無成員 → 無待檢錄）。
 */
export function computeTeamCheckedIn(members: IMember[]): boolean {
  return members.every((m) => m.checkInStatus === "present");
}

export default mongoose.model<ITeam>('Team', TeamSchema);
