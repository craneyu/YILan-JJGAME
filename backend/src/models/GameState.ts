import mongoose, { Document, Schema } from 'mongoose';

export interface IGameState extends Document {
  eventId: mongoose.Types.ObjectId;
  currentTeamId?: mongoose.Types.ObjectId;
  currentRound: number;
  currentActionNo?: string;
  currentActionOpen: boolean;
  currentTeamAbstained: boolean;
  status: 'idle' | 'action_open' | 'action_closed' | 'series_complete' | 'event_complete';
}

const GameStateSchema = new Schema<IGameState>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
  currentTeamId: { type: Schema.Types.ObjectId, ref: 'Team' },
  currentRound: { type: Number, default: 1 },
  currentActionNo: { type: String },
  currentActionOpen: { type: Boolean, default: false },
  currentTeamAbstained: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['idle', 'action_open', 'action_closed', 'series_complete', 'event_complete'],
    default: 'idle',
  },
});

export default mongoose.model<IGameState>('GameState', GameStateSchema);
