import mongoose, { Document, Schema } from 'mongoose';

export type CreativeGameStatus =
  | 'idle'
  | 'scoring_open'
  | 'timer_running'
  | 'timer_stopped'
  | 'scores_collected'
  | 'complete';

export interface ICreativeGameState extends Document {
  eventId: mongoose.Types.ObjectId;
  currentTeamId?: mongoose.Types.ObjectId;
  timerStartedAt?: Date;
  timerStoppedAt?: Date;
  timerElapsedMs?: number;
  status: CreativeGameStatus;
}

const CreativeGameStateSchema = new Schema<ICreativeGameState>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  currentTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  timerStartedAt: { type: Date },
  timerStoppedAt: { type: Date },
  timerElapsedMs: { type: Number },
  status: {
    type: String,
    enum: ['idle', 'scoring_open', 'timer_running', 'timer_stopped', 'scores_collected', 'complete'],
    default: 'idle',
  },
});

CreativeGameStateSchema.index({ eventId: 1 }, { unique: true });

export default mongoose.model<ICreativeGameState>('CreativeGameState', CreativeGameStateSchema);
