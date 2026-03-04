import mongoose, { Document, Schema } from 'mongoose';

export interface ICreativeScore extends Document {
  eventId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  judgeId: mongoose.Types.ObjectId;
  judgeNo: number;
  technicalScore: number;
  artisticScore: number;
  submittedAt: Date;
}

const CreativeScoreSchema = new Schema<ICreativeScore>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  judgeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  judgeNo: { type: Number, required: true, min: 1, max: 5 },
  technicalScore: { type: Number, required: true, min: 0, max: 9.5 },
  artisticScore: { type: Number, required: true, min: 0, max: 9.5 },
  submittedAt: { type: Date, default: Date.now },
});

CreativeScoreSchema.index(
  { eventId: 1, teamId: 1, judgeId: 1 },
  { unique: true }
);

export default mongoose.model<ICreativeScore>('CreativeScore', CreativeScoreSchema);
