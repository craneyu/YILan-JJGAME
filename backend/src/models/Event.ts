import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  name: string;
  date?: Date;
  venue?: string;
  rounds: number;
  status: 'pending' | 'active' | 'closed';
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
  },
  { timestamps: true }
);

export default mongoose.model<IEvent>('Event', EventSchema);
