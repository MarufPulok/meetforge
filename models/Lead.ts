import mongoose, { Document, Model, Schema } from 'mongoose';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'REPLIED'
  | 'MEETING_BOOKED'
  | 'LOST';

export type LeadSource = 'manual' | 'csv' | 'google-maps' | 'google-maps-email' | 'enriched' | 'mock';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  allEmails?: string[];
  phone?: string;
  location?: string;
  website?: string;
  notes?: string;
  status: LeadStatus;
  source: LeadSource;
  
  // Social Media
  socialMedia?: {
    linkedIn?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    discord?: string;
    pinterest?: string;
  };
  
  // Business Details
  businessCategory?: string[];
  rating?: number;
  ratingCount?: number;
  priceRange?: string;
  openingHours?: Array<{ day: string; hours: string }>;
  
  // Location Details
  placeId?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
  
  // Scraping Metadata
  scrapedAt?: Date;
  scrapeRunId?: string;
  scrapeSource?: string;
  
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
    allEmails: [{ type: String }],
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
      enum: ['manual', 'csv', 'google-maps', 'google-maps-email', 'enriched', 'mock'],
      default: 'manual',
    },
    socialMedia: {
      linkedIn: { type: String },
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
      youtube: { type: String },
      tiktok: { type: String },
      discord: { type: String },
      pinterest: { type: String },
    },
    businessCategory: [{ type: String }],
    rating: { type: Number },
    ratingCount: { type: Number },
    priceRange: { type: String },
    openingHours: [{
      day: { type: String },
      hours: { type: String },
    }],
    placeId: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    countryCode: { type: String },
    scrapedAt: { type: Date },
    scrapeRunId: { type: String },
    scrapeSource: { type: String },
    lastContactedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for faster filtering and deduplication
LeadSchema.index({ status: 1 });
LeadSchema.index({ email: 1 }, { unique: true });
LeadSchema.index({ placeId: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ companyName: 1, location: 1 });

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);

