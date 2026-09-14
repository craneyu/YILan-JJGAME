import mongoose, { Document, Schema } from 'mongoose';

export type PenaltyType = 'overtime' | 'undertime' | 'props' | 'attacks';

export const PENALTY_DEDUCTIONS: Record<PenaltyType, number> = {
  overtime: 1.0,
  undertime: 1.0,
  props: 1.0,
  attacks: 0.5,
};

/**
 * 各違例扣在哪一項分數：
 * - 超時／未達時間／使用道具（超過 2 樣）→ 表演分
 * - 未達攻擊次數 → 技術分
 * 型別代碼 'attacks' 維持不變（既有資料相容），僅顯示名稱改為「未達攻擊次數」。
 */
export const PENALTY_TARGET: Record<PenaltyType, 'technical' | 'artistic'> = {
  overtime: 'artistic',
  undertime: 'artistic',
  props: 'artistic',
  attacks: 'technical',
};

export const PENALTY_LABELS: Record<PenaltyType, string> = {
  overtime: '超時',
  undertime: '未達時間',
  props: '使用道具',
  attacks: '未達攻擊次數',
};

export interface ICreativePenalty extends Document {
  eventId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  penaltyType: PenaltyType;
  deduction: number;
  markedAt: Date;
}

const CreativePenaltySchema = new Schema<ICreativePenalty>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  penaltyType: {
    type: String,
    enum: ['overtime', 'undertime', 'props', 'attacks'],
    required: true,
  },
  deduction: { type: Number, required: true },
  markedAt: { type: Date, default: Date.now },
});

CreativePenaltySchema.index(
  { eventId: 1, teamId: 1, penaltyType: 1 },
  { unique: true }
);

export default mongoose.model<ICreativePenalty>('CreativePenalty', CreativePenaltySchema);
