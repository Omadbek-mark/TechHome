import dotenv from 'dotenv';
import mongoose from 'mongoose';
import MemberService from '../models/Member.service';

// Never run automatically on app startup, install, build or test.
async function main() {
  if (!process.argv.includes('--confirm-bootstrap')) throw new Error('Explicit --confirm-bootstrap is required.');
  dotenv.config();
  const { MONGO_URL, BOOTSTRAP_NICK, BOOTSTRAP_PHONE, BOOTSTRAP_PASSWORD } = process.env;
  if (!MONGO_URL || !BOOTSTRAP_NICK || !BOOTSTRAP_PHONE || !BOOTSTRAP_PASSWORD) throw new Error('Bootstrap environment is incomplete.');
  await mongoose.connect(MONGO_URL);
  await new MemberService().bootstrapStore({ memberNick: BOOTSTRAP_NICK, memberPhone: BOOTSTRAP_PHONE, memberPassword: BOOTSTRAP_PASSWORD });
  console.info('Store account created.');
}
if (require.main === module) {
  main().catch(() => { console.error('Store bootstrap failed. Verify configuration and existing accounts.'); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
