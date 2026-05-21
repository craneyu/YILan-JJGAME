import mongoose, { Document, Schema } from 'mongoose';

export type TeamTier = 'EL' | 'EM' | 'EH' | 'JH' | 'SH' | 'OPEN' | 'ELEM';

export interface ITeam extends Document {
  eventId: mongoose.Types.ObjectId;
  name: string;
  members: string[];
  category: 'male' | 'female' | 'mixed';
  order: number;
  competitionType: 'Duo' | 'Show';
  tier: TeamTier | null;
}

const TeamSchema = new Schema<ITeam>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  members: { type: [String], required: true },
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

export default mongoose.model<ITeam>('Team', TeamSchema);
