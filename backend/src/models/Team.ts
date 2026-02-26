import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
  eventId: mongoose.Types.ObjectId;
  name: string;
  members: string[];
  category: 'male' | 'female' | 'mixed';
  order: number;
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
});

// 確保同一賽事內，各隊員姓名唯一
TeamSchema.index({ eventId: 1, order: 1 });

export default mongoose.model<ITeam>('Team', TeamSchema);
