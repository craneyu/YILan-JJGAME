import mongoose, { Document, Schema } from 'mongoose';

export interface IVRScore extends Document {
  eventId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  round: number;
  throwVariety: number;
  groundVariety: number;
  submittedAt: Date;
}

const VRScoreSchema = new Schema<IVRScore>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  round: { type: Number, required: true, min: 1, max: 3 },
  throwVariety: { type: Number, required: true, min: 0, max: 2 },
  groundVariety: { type: Number, required: true, min: 0, max: 2 },
  submittedAt: { type: Date, default: Date.now },
});

// 同一隊伍每輪只能有一筆 VR 評分
VRScoreSchema.index(
  { eventId: 1, teamId: 1, round: 1 },
  { unique: true }
);

export default mongoose.model<IVRScore>('VRScore', VRScoreSchema);
