import 'dotenv/config';
import { mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { Server } from 'node:http';
import mongoose from 'mongoose';
import session from 'express-session';
import ConnectMongoDB from 'connect-mongodb-session';
import createApp from './app';
import { loadSecurityConfig } from './libs/security/config';

const MongoStore = ConnectMongoDB(session);
let store: InstanceType<typeof MongoStore> | undefined;
let server: Server | undefined;
let stopping = false;
let startupStep = 'runtime configuration';

async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 15_000);
  try {
    if (server?.listening) await new Promise<void>(resolve => server!.close(() => resolve()));
    const results = await Promise.allSettled([mongoose.disconnect(), store?.client?.close()]);
    if (results.some(result => result.status === 'rejected')) exitCode = 1;
  } finally {
    clearTimeout(deadline);
    process.exit(exitCode);
  }
}

async function start() {
  const config = loadSecurityConfig();
  const uri = process.env.MONGO_URL;
  const port = Number(process.env.PORT ?? 3002);
  if (!uri || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid runtime configuration.');

  startupStep = 'uploads access';
  await mkdir(config.uploadsRoot, { recursive: true });
  await access(config.uploadsRoot, constants.W_OK);
  const connectionOptions = { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 };
  startupStep = 'MongoDB connection';
  await mongoose.connect(uri, connectionOptions);
  const database = mongoose.connection.db;
  if (config.production) {
    startupStep = 'MongoDB topology';
    const topology = await database.command({ hello: 1 });
    if (!topology.setName && topology.msg !== 'isdbgrid') throw new Error('MongoDB transactions require a replica set or sharded cluster.');
  }

  startupStep = 'MongoDB session store';
  const sessionStore = await new Promise<InstanceType<typeof MongoStore>>((resolve, reject) => {
    const candidate = new MongoStore({ uri, collection: 'sessions', connectionOptions }, error => {
      if (error) reject(error);
      else resolve(candidate);
    });
    store = candidate;
    candidate.on('error', () => console.error('Session storage unavailable.'));
  });

  startupStep = 'HTTP app initialization';
  const app = createApp({
    config,
    store: sessionStore,
    isReady: async () => {
      if (stopping || mongoose.connection.readyState !== 1) return false;
      // Bound the HTTP probe even if a Mongo socket stalls.
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          Promise.all([
            database.command({ ping: 1, maxTimeMS: 1000 }),
            sessionStore.client.db().command({ ping: 1, maxTimeMS: 1000 }),
          ]).then(() => true),
          new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 1500); }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    },
  });
  server = app.listen(port, '0.0.0.0', () => console.info('TechHome listening on port', port));
  server.once('error', () => { console.error('HTTP server failed.'); void shutdown(1); });
}

process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
start().catch(() => {
  console.error('TechHome startup failed at:', startupStep);
  void shutdown(1);
});
