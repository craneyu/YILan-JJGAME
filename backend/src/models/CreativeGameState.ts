import mongoose, { Document, Schema } from 'mongoose';

export type CreativeGameStatus =
  | 'idle'
  | 'scoring_open'
  | 'timer_running'
  | 'timer_stopped'
  | 'scores_collected'
  | 'complete';

export type CreativeTimerStatus = 'idle' | 'running' | 'paused';

export interface ICreativeGameState extends Document {
  eventId: mongoose.Types.ObjectId;
  currentTeamId?: mongoose.Types.ObjectId;
  timerStartedAt?: Date;
  timerStoppedAt?: Date;
  timerElapsedMs?: number;
  timerStatus: CreativeTimerStatus;
  status: CreativeGameStatus;
  isAbstained: boolean;
  abstainedTeamIds: mongoose.Types.ObjectId[];
}

const CreativeGameStateSchema = new Schema<ICreativeGameState>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  currentTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  timerStartedAt: { type: Date },
  timerStoppedAt: { type: Date },
  timerElapsedMs: { type: Number },
  timerStatus: {
    type: String,
    enum: ['idle', 'running', 'paused'],
    default: 'idle',
  },
  status: {
    type: String,
    enum: ['idle', 'scoring_open', 'timer_running', 'timer_stopped', 'scores_collected', 'complete'],
    default: 'idle',
  },
  isAbstained: { type: Boolean, default: false },
  abstainedTeamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
});

CreativeGameStateSchema.index({ eventId: 1 }, { unique: true });

export default mongoose.model<ICreativeGameState>('CreativeGameState', CreativeGameStateSchema);
