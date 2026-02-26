import mongoose, { Document, Schema } from 'mongoose';

export interface IScoreItems {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5?: number;
}

export interface IScore extends Document {
  eventId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  round: number;
  actionNo: string;
  judgeId: mongoose.Types.ObjectId;
  judgeNo: number;
  items: IScoreItems;
  submittedAt: Date;
}

const ScoreSchema = new Schema<IScore>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  round: { type: Number, required: true, min: 1, max: 3 },
  actionNo: { type: String, required: true },
  judgeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  judgeNo: { type: Number, required: true, min: 1, max: 5 },
  items: {
    p1: { type: Number, required: true, min: 0, max: 3 },
    p2: { type: Number, required: true, min: 0, max: 3 },
    p3: { type: Number, required: true, min: 0, max: 3 },
    p4: { type: Number, required: true, min: 0, max: 3 },
    p5: { type: Number, min: 0, max: 3 },
  },
  submittedAt: { type: Date, default: Date.now },
});

// 同一裁判對同一動作只能送出一次
ScoreSchema.index(
  { eventId: 1, teamId: 1, round: 1, actionNo: 1, judgeId: 1 },
  { unique: true }
);

export default mongoose.model<IScore>('Score', ScoreSchema);
