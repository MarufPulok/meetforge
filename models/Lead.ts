import mongoose, { Document, Model, Schema } from 'mongoose';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'REPLIED'
  | 'MEETING_BOOKED'
  | 'LOST';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  phone?: string;
  location?: string;
  notes?: string;
  status: LeadStatus;
  lastContactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    firstName: { type: String },
    lastName: { type: String },
    companyName: { type: String },
    email: { type: String, required: true },
    phone: { type: String },
    location: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'REPLIED', 'MEETING_BOOKED', 'LOST'],
      default: 'NEW',
    },
    lastContactedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for faster filtering by status
LeadSchema.index({ status: 1 });
LeadSchema.index({ email: 1 });

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);
