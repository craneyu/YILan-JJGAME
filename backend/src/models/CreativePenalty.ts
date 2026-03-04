import mongoose, { Document, Schema } from 'mongoose';

export type PenaltyType = 'overtime' | 'undertime' | 'props' | 'attacks';

export const PENALTY_DEDUCTIONS: Record<PenaltyType, number> = {
  overtime: 1.0,
  undertime: 1.0,
  props: 1.0,
  attacks: 0.5,
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
