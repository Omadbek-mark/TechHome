import mongoose, { Schema } from 'mongoose';
export interface AiUsage { _id: string; scope: 'guest' | 'member' | 'provider'; day: string; count: number; expiresAt: Date; }
const schema = new Schema<AiUsage>({ _id: { type: String, required: true }, scope: { type: String, enum: ['guest','member','provider'], required: true }, day: { type: String, required: true }, count: { type: Number, required: true, min: 0 }, expiresAt: { type: Date, required: true } }, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model<AiUsage>('AiUsage', schema);
