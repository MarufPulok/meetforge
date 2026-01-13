import mongoose, { Document, Model, Schema } from 'mongoose';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'REPLIED'
  | 'MEETING_BOOKED'
  | 'LOST';

export type LeadSource = 'manual' | 'csv' | 'google-maps' | 'enriched';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
  notes?: string;
  status: LeadStatus;
  source: LeadSource;
  socialMedia?: {
    linkedIn?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };
  rating?: number;
  ratingCount?: number;
  placeId?: string;
  scrapedAt?: Date;
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
    website: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ['NEW', 'CONTACTED', 'REPLIED', 'MEETING_BOOKED', 'LOST'],
      default: 'NEW',
    },
    source: {
      type: String,
      enum: ['manual', 'csv', 'google-maps', 'enriched'],
      default: 'manual',
    },
    socialMedia: {
      linkedIn: { type: String },
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
      youtube: { type: String },
      tiktok: { type: String },
    },
    rating: { type: Number },
    ratingCount: { type: Number },
    placeId: { type: String },
    scrapedAt: { type: Date },
    lastContactedAt: { type: Date },
  },
  { timestamps: true }
);

// Index for faster filtering by status
LeadSchema.index({ status: 1 });
LeadSchema.index({ email: 1 });

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);
