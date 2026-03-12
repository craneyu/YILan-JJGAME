import mongoose, { Document, Schema } from "mongoose";

export type MatchType = "ne-waza" | "fighting" | "contact";
export type MatchCategory = "male" | "female" | "mixed";
export type MatchStatus =
  | "pending"
  | "in-progress"
  | "full-ippon-pending"
  | "shido-dq-pending"
  | "completed";
export type MatchWinner = "red" | "blue";
export type MatchMethod = "judge" | "submission" | "dq" | "full-ippon" | "shido-dq";

export interface IMatchPlayer {
  name: string;
  teamName: string;
}

export interface IMatchResult {
  winner: MatchWinner;
  method: MatchMethod;
}

export interface IIppons {
  p1: number;
  p2: number;
  p3: number;
}

export interface IPartPlusCounts {
  plus2: number;
  plus3: number;
}

export interface IPartCounters {
  p1: IPartPlusCounts;
  p2: IPartPlusCounts;
  p3: IPartPlusCounts;
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
  // PART scores
  redPart1Score: number;
  redPart2Score: number;
  redPart3Score: number;
  bluePart1Score: number;
  bluePart2Score: number;
  bluePart3Score: number;
  // IPPON counts per PART
  redIppons: IIppons;
  blueIppons: IIppons;
  // PART plus (+2/-2 and +3/-3) counters to distinguish operations
  redPartCounters: IPartCounters;
  bluePartCounters: IPartCounters;
  // WAZA-ARI counts (only counts from ALL PARTS +1 and SHIDO penalties)
  redWazaAri: number;
  blueWazaAri: number;
  // Total score (PART scores + WAZA-ARI; separate from WAZA-ARI count)
  redTotalScore: number;
  blueTotalScore: number;
  // SHIDO counts (CHUI = +3 SHIDO)
  redShido: number;
  blueShido: number;
  // Match duration in seconds
  matchDuration: number;
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
      enum: ["judge", "submission", "dq", "full-ippon", "shido-dq"],
      required: true,
    },
  },
  { _id: false },
);

const IpponsSchema = new Schema<IIppons>(
  {
    p1: { type: Number, default: 0, min: 0 },
    p2: { type: Number, default: 0, min: 0 },
    p3: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const PartPlusCountsSchema = new Schema<IPartPlusCounts>(
  {
    plus2: { type: Number, default: 0, min: 0 },
    plus3: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const PartCountersSchema = new Schema<IPartCounters>(
  {
    p1: { type: PartPlusCountsSchema, default: () => ({ plus2: 0, plus3: 0 }) },
    p2: { type: PartPlusCountsSchema, default: () => ({ plus2: 0, plus3: 0 }) },
    p3: { type: PartPlusCountsSchema, default: () => ({ plus2: 0, plus3: 0 }) },
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
      enum: ["pending", "in-progress", "full-ippon-pending", "shido-dq-pending", "completed"],
      default: "pending",
    },
    result: { type: MatchResultSchema },
    isBye: { type: Boolean, default: false },
    scheduledOrder: { type: Number, required: true },
    redPart1Score: { type: Number, default: 0, min: 0 },
    redPart2Score: { type: Number, default: 0, min: 0 },
    redPart3Score: { type: Number, default: 0, min: 0 },
    bluePart1Score: { type: Number, default: 0, min: 0 },
    bluePart2Score: { type: Number, default: 0, min: 0 },
    bluePart3Score: { type: Number, default: 0, min: 0 },
    redIppons: { type: IpponsSchema, default: () => ({ p1: 0, p2: 0, p3: 0 }) },
    blueIppons: { type: IpponsSchema, default: () => ({ p1: 0, p2: 0, p3: 0 }) },
    redPartCounters: { type: PartCountersSchema, default: () => ({ p1: { plus2: 0, plus3: 0 }, p2: { plus2: 0, plus3: 0 }, p3: { plus2: 0, plus3: 0 } }) },
    bluePartCounters: { type: PartCountersSchema, default: () => ({ p1: { plus2: 0, plus3: 0 }, p2: { plus2: 0, plus3: 0 }, p3: { plus2: 0, plus3: 0 } }) },
    redWazaAri: { type: Number, default: 0, min: 0 },
    blueWazaAri: { type: Number, default: 0, min: 0 },
    redTotalScore: { type: Number, default: 0, min: 0 },
    blueTotalScore: { type: Number, default: 0, min: 0 },
    redShido: { type: Number, default: 0, min: 0 },
    blueShido: { type: Number, default: 0, min: 0 },
    matchDuration: { type: Number, default: 180, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MatchSchema.index({ eventId: 1, matchType: 1, scheduledOrder: 1 });

export default mongoose.model<IMatch>("Match", MatchSchema);
