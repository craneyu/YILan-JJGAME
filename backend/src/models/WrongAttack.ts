import mongoose, { Document, Schema } from 'mongoose';

export interface IWrongAttack extends Document {
  eventId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  round: number;
  actionNo: string;
  markedAt: Date;
}

const WrongAttackSchema = new Schema<IWrongAttack>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  round: { type: Number, required: true, min: 1, max: 3 },
  actionNo: { type: String, required: true },
  markedAt: { type: Date, default: Date.now },
});

// 同一動作只能有一筆錯誤攻擊記錄
WrongAttackSchema.index(
  { eventId: 1, teamId: 1, round: 1, actionNo: 1 },
  { unique: true }
);

export default mongoose.model<IWrongAttack>('WrongAttack', WrongAttackSchema);
