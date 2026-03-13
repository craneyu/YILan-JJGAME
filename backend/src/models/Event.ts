import mongoose, { Document, Schema } from 'mongoose';

export type SportType = 'kata-duo' | 'kata-show' | 'ne-waza' | 'fighting' | 'contact';

export interface IEvent extends Document {
  name: string;
  date?: Date;
  venue?: string;
  rounds: number;
  status: 'pending' | 'active' | 'closed';
  categoryOrder: string[];
  categoryOrderDuo: string[];
  categoryOrderShow: string[];
  competitionTypes: ('Duo' | 'Show')[];
  includedSports: SportType[];
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    name: { type: String, required: true },
    date: { type: Date },
    venue: { type: String },
    rounds: { type: Number, default: 3 },
    status: {
      type: String,
      enum: ['pending', 'active', 'closed'],
      default: 'pending',
    },
    categoryOrder: { type: [String], default: ['female', 'male', 'mixed'] },
    categoryOrderDuo: { type: [String], default: [] },
    categoryOrderShow: { type: [String], default: [] },
    competitionTypes: {
      type: [String],
      enum: ['Duo', 'Show'],
      default: ['Duo'],
    },
    includedSports: {
      type: [String],
      enum: ['kata-duo', 'kata-show', 'ne-waza', 'fighting', 'contact'],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IEvent>('Event', EventSchema);
