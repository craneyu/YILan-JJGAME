import mongoose, { Document, Schema } from 'mongoose';

export type UserRole =
  | 'scoring_judge'
  | 'vr_judge'
  | 'sequence_judge'
  | 'admin'
  | 'audience';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  role: UserRole;
  judgeNo?: number;
  eventId?: mongoose.Types.ObjectId;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['scoring_judge', 'vr_judge', 'sequence_judge', 'admin', 'audience'],
    required: true,
  },
  judgeNo: { type: Number, min: 1, max: 5 },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
});

export default mongoose.model<IUser>('User', UserSchema);
