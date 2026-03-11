import mongoose, { Document, Schema } from "mongoose";

export type ScoreLogSide = "red" | "blue";
export type ScoreLogActionType =
  | "score"
  | "advantage"
  | "warning"
  | "submission"
  | "undo"
  | "part-score"
  | "all-parts-score"
  | "foul"
  | "timer-adjust";

export interface IIpponsSnapshot {
  p1: number;
  p2: number;
  p3: number;
}

export interface IMatchScoreLog extends Document {
  matchId: mongoose.Types.ObjectId;
  side: ScoreLogSide;
  type: ScoreLogActionType;
  value: number;
  // PART scoring fields
  partIndex: 1 | 2 | 3 | null;
  ipponsSnapshot: IIpponsSnapshot;
  // Timer adjust fields
  remainingBefore?: number;
  remainingAfter?: number;
  timestamp: Date;
}

const IpponsSnapshotSchema = new Schema<IIpponsSnapshot>(
  {
    p1: { type: Number, default: 0 },
    p2: { type: Number, default: 0 },
    p3: { type: Number, default: 0 },
  },
  { _id: false },
);

const MatchScoreLogSchema = new Schema<IMatchScoreLog>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    side: { type: String, enum: ["red", "blue"], required: true },
    type: {
      type: String,
      enum: [
        "score",
        "advantage",
        "warning",
        "submission",
        "undo",
        "part-score",
        "all-parts-score",
        "foul",
        "timer-adjust",
      ],
      required: true,
    },
    value: { type: Number, required: true },
    partIndex: { type: Number, enum: [1, 2, 3, null], default: null },
    ipponsSnapshot: {
      type: IpponsSnapshotSchema,
      default: () => ({ p1: 0, p2: 0, p3: 0 }),
    },
    remainingBefore: { type: Number },
    remainingAfter: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

MatchScoreLogSchema.index({ matchId: 1, timestamp: 1 });

export default mongoose.model<IMatchScoreLog>(
  "MatchScoreLog",
  MatchScoreLogSchema,
);
