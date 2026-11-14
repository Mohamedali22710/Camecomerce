/** Installation request model — a workflow separate from payment, order, and shipping. */
import mongoose, { Document, Schema, Types } from "mongoose";

export const INSTALLATION_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type InstallationStatus = (typeof INSTALLATION_STATUSES)[number];

export interface IInstallationRequest extends Document {
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  status: InstallationStatus;
  contactName: string;
  phone: string;
  address: string;
  preferredDate?: Date | null;
  scheduledAt?: Date | null;
  notes?: string | null;
  adminNotes?: string | null;
}

const installationRequestSchema = new Schema<IInstallationRequest>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: INSTALLATION_STATUSES,
      default: "PENDING",
    },
    contactName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    preferredDate: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
    notes: { type: String, default: null, maxlength: 1000 },
    adminNotes: { type: String, default: null, maxlength: 2000 },
  },
  { timestamps: true },
);

installationRequestSchema.index({ userId: 1, createdAt: -1 });
installationRequestSchema.index({ status: 1, createdAt: -1 });

export const installationRequestModel = mongoose.model<IInstallationRequest>(
  "InstallationRequest",
  installationRequestSchema,
);
