import mongoose, { Document, Schema } from 'mongoose';

/**
 * 棄權記錄（kata 雙人演武）。
 * 棄權的語意是「某隊在某一輪次棄權」——賽序裁判端文案為「設定此組棄權」，
 * 換組／換輪時即時狀態會重設，故以 (teamId, round) 為單位持久化，
 * 賽後匯出才查得到哪一隊在哪一輪棄權。
 */
export interface IAbstention extends Document {
  eventId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  round: number;
  markedAt: Date;
}

const AbstentionSchema = new Schema<IAbstention>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  round: { type: Number, required: true, min: 1, max: 3 },
  markedAt: { type: Date, default: Date.now },
});

// 同一隊同一輪次只能有一筆棄權記錄
AbstentionSchema.index({ eventId: 1, teamId: 1, round: 1 }, { unique: true });

export default mongoose.model<IAbstention>('Abstention', AbstentionSchema);
