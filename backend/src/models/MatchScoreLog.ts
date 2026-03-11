import mongoose, { Document, Schema } from "mongoose";

export type ScoreLogSide = "red" | "blue";
export type ScoreLogType =
  | "score"
  | "advantage"
  | "warning"
  | "submission"
  | "undo";

export interface IMatchScoreLog extends Document {
  matchId: mongoose.Types.ObjectId;
  side: ScoreLogSide;
  type: ScoreLogType;
  value: number;
  timestamp: Date;
}

const MatchScoreLogSchema = new Schema<IMatchScoreLog>(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    side: { type: String, enum: ["red", "blue"], required: true },
    type: {
      type: String,
      enum: ["score", "advantage", "warning", "submission", "undo"],
      required: true,
    },
    value: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

MatchScoreLogSchema.index({ matchId: 1, timestamp: 1 });

export default mongoose.model<IMatchScoreLog>(
  "MatchScoreLog",
  MatchScoreLogSchema,
);
