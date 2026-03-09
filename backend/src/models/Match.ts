import mongoose, { Document, Schema } from "mongoose";

export type MatchType = "ne-waza" | "fighting" | "contact";
export type MatchCategory = "male" | "female" | "mixed";
export type MatchStatus = "pending" | "in-progress" | "completed";
export type MatchWinner = "red" | "blue";
export type MatchMethod = "judge" | "submission" | "dq";

export interface IMatchPlayer {
  name: string;
  teamName: string;
}

export interface IMatchResult {
  winner: MatchWinner;
  method: MatchMethod;
}

export interface IMatch extends Document {
  eventId: mongoose.Types.ObjectId;
  matchType: MatchType;
  category: MatchCategory;
  weightClass: string;
  round: number;
  matchNo: number;
  redPlayer: IMatchPlayer;
  bluePlayer: IMatchPlayer;
  status: MatchStatus;
  result?: IMatchResult;
  isBye: boolean;
  scheduledOrder: number;
  createdAt: Date;
}

const MatchPlayerSchema = new Schema<IMatchPlayer>(
  {
    name: { type: String, required: true },
    teamName: { type: String, required: true },
  },
  { _id: false },
);

const MatchResultSchema = new Schema<IMatchResult>(
  {
    winner: { type: String, enum: ["red", "blue"], required: true },
    method: {
      type: String,
      enum: ["judge", "submission", "dq"],
      required: true,
    },
  },
  { _id: false },
);

const MatchSchema = new Schema<IMatch>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    matchType: {
      type: String,
      enum: ["ne-waza", "fighting", "contact"],
      required: true,
    },
    category: {
      type: String,
      enum: ["male", "female", "mixed"],
      required: true,
    },
    weightClass: { type: String, required: true },
    round: { type: Number, required: true, min: 1 },
    matchNo: { type: Number, required: true, min: 1 },
    redPlayer: { type: MatchPlayerSchema, required: true },
    bluePlayer: { type: MatchPlayerSchema, required: true },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    result: { type: MatchResultSchema },
    isBye: { type: Boolean, default: false },
    scheduledOrder: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MatchSchema.index({ eventId: 1, matchType: 1, scheduledOrder: 1 });

export default mongoose.model<IMatch>("Match", MatchSchema);
