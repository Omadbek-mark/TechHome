import mongoose from 'mongoose';
import { isIP } from 'net';
import { createHmac } from 'crypto';
import { ipKeyGenerator } from 'express-rate-limit';
import AiUsageModel from '../schema/AiUsage.model';
import { AiConfig } from '../libs/ai/config';
import { HttpError } from '../libs/security/http';
export interface AiSubject { memberId?: string; ip: string; hashSecret: string; }
export interface AiAllowance { remaining: number; dailyLimit: number; resetsAt: string; }
export function quotaSubject(subject: AiSubject) {
  if (subject.hashSecret.length < 32) throw new HttpError(503, 'AI_UNAVAILABLE', 'The advisor is unavailable.');
  if (!subject.memberId && !isIP(subject.ip.replace(/^::ffff:/, ''))) throw new HttpError(503, 'AI_UNAVAILABLE', 'The advisor is unavailable.');
  const scope = subject.memberId ? 'member' as const : 'guest' as const;
  const source = subject.memberId ?? ipKeyGenerator(subject.ip.replace(/^::ffff:/, ''), 64);
  return { scope, hash: createHmac('sha256', subject.hashSecret).update(`techhome-ai-v1:${scope}:${source}`).digest('hex') };
}
export default class AiQuotaService {
  public async reserve(subject: AiSubject, config: AiConfig, now = new Date(), providerCall = true): Promise<AiAllowance> {
    if (mongoose.connection.readyState !== 1) throw new HttpError(503, 'AI_UNAVAILABLE', 'Advisor usage storage is unavailable.');
    const identity = quotaSubject(subject), day = now.toISOString().slice(0,10);
    const reset = new Date(`${day}T00:00:00.000Z`); reset.setUTCDate(reset.getUTCDate() + 1);
    const expiresAt = new Date(reset.getTime() + 86400000), dailyLimit = identity.scope === 'member' ? config.memberDaily : config.guestDaily;
    const ownId = `${day}:${identity.scope}:${identity.hash}`, globalId = `${day}:provider`;
    const initialize = async (_id: string, scope: 'guest' | 'member' | 'provider') => {
      try { await AiUsageModel.updateOne({ _id }, { $setOnInsert: { scope, day, count: 0, expiresAt } }, { upsert: true, setDefaultsOnInsert: false, maxTimeMS: 2000 }).exec(); }
      catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error; }
    };
    await AiUsageModel.init();
    if (providerCall) await initialize(globalId, 'provider');
    if (providerCall && (await AiUsageModel.findById(globalId).maxTimeMS(2000).lean().exec())!.count >= config.providerDaily) throw new HttpError(429, 'AI_LIMIT_REACHED', 'Daily advisor limit reached. Please use the catalog.');
    await initialize(ownId, identity.scope);
    const session = await mongoose.startSession(); let remaining = 0;
    try {
      await session.withTransaction(async () => {
        const own = await AiUsageModel.findOneAndUpdate({ _id: ownId, count: { $lt: dailyLimit } }, { $inc: { count: 1 } }, { new: true, session, maxTimeMS: 2000 }).lean().exec();
        if (!own) throw new HttpError(429, 'AI_LIMIT_REACHED', 'Daily advisor limit reached. Please use the catalog.');
        const global = !providerCall || await AiUsageModel.findOneAndUpdate({ _id: globalId, count: { $lt: config.providerDaily } }, { $inc: { count: 1 } }, { new: true, session, maxTimeMS: 2000 }).lean().exec();
        if (!global) throw new HttpError(429, 'AI_LIMIT_REACHED', 'Daily advisor limit reached. Please use the catalog.');
        remaining = dailyLimit - own.count;
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary', maxCommitTimeMS: 10000 });
      return { remaining, dailyLimit, resetsAt: reset.toISOString() };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(503, 'AI_UNAVAILABLE', 'Advisor usage storage is unavailable. Please use the catalog.');
    } finally { await session.endSession(); }
  }
}
