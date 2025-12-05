import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IOfferConfig extends Document {
  _id: mongoose.Types.ObjectId;
  nicheName: string;
  icpDescription: string;
  offerDescription: string;
  fromName: string;
  fromEmail: string;
  calendlyUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const OfferConfigSchema = new Schema<IOfferConfig>(
  {
    nicheName: { type: String, required: true },
    icpDescription: { type: String, required: true },
    offerDescription: { type: String, required: true },
    fromName: { type: String, required: true },
    fromEmail: { type: String, required: true },
    calendlyUrl: { type: String, required: true },
  },
  { timestamps: true }
);

export const OfferConfig: Model<IOfferConfig> =
  mongoose.models.OfferConfig ||
  mongoose.model<IOfferConfig>('OfferConfig', OfferConfigSchema);
