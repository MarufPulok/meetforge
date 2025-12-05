import mongoose, { Document, Model, Schema } from 'mongoose';

export type OutreachStatus = 'SENT' | 'FAILED';

export interface IOutreachMessage extends Document {
  _id: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  subject: string;
  body: string;
  sentAt: Date;
  status: OutreachStatus;
  providerMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OutreachMessageSchema = new Schema<IOutreachMessage>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    sentAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['SENT', 'FAILED'],
      required: true,
    },
    providerMessageId: { type: String },
  },
  { timestamps: true }
);

// Index for faster querying by lead
OutreachMessageSchema.index({ leadId: 1 });
OutreachMessageSchema.index({ sentAt: -1 });

export const OutreachMessage: Model<IOutreachMessage> =
  mongoose.models.OutreachMessage ||
  mongoose.model<IOutreachMessage>('OutreachMessage', OutreachMessageSchema);
