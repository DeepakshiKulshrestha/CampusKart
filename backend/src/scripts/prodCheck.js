// Week 7: production readiness check for the database connection and secrets. Read-only.
//   NODE_ENV=production npm run db:prod-check     (or just npm run db:prod-check to preview)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';

const results = [];
const add = (level, check, detail) => results.push({ level, check, detail });
const PROD = process.env.NODE_ENV === 'production';

(async () => {
  const uri = process.env.MONGODB_URI || '';
  let u;
  try { u = new URL(uri); } catch { add('FAIL', 'MONGODB_URI', 'missing or not a valid URI'); }
  if (u) {
    add(u.protocol === 'mongodb+srv:' ? 'PASS' : PROD ? 'FAIL' : 'WARN', 'TLS / SRV connection string', u.protocol === 'mongodb+srv:' ? 'mongodb+srv:// (TLS on by default)' : 'use the Atlas mongodb+srv:// string in production');
    const dbName = u.pathname.replace('/', '');
    add(dbName ? 'PASS' : 'FAIL', 'Database name in URI', dbName || 'add /campuskart before the ?');
    add(/localhost|127\.0\.0\.1/.test(u.hostname) && PROD ? 'FAIL' : 'PASS', 'Not pointing at localhost in production', u.hostname);
    const pw = decodeURIComponent(u.password || '');
    add(pw.length >= 16 ? 'PASS' : 'WARN', 'DB password length', `${pw.length} chars (16+ random recommended)`);
    add(/(^|_)(admin|root)/i.test(u.username) ? 'WARN' : 'PASS', 'App-specific DB user', u.username);
  }
  const jwt = process.env.JWT_SECRET || '';
  add(jwt.length >= 32 && !/a_very_long_random_string/.test(jwt) ? 'PASS' : PROD ? 'FAIL' : 'WARN', 'JWT_SECRET strength', `${jwt.length} chars`);
  for (const k of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'])
    add(process.env[k] && !/your_|123456789|abc\.\.\./.test(process.env[k]) ? 'PASS' : 'FAIL', k, process.env[k] ? 'set' : 'missing');
  add(process.env.HF_TOKEN ? 'PASS' : 'WARN', 'HF_TOKEN (embedding sync)', process.env.HF_TOKEN ? 'set' : 'missing: new listings will not get embeddings');
  const gi = ['.gitignore', '../.gitignore'].map((f) => path.resolve(f)).filter(fs.existsSync).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  add(/^\.env$/m.test(gi) ? 'PASS' : 'FAIL', '.env ignored by Git', /^\.env$/m.test(gi) ? '.gitignore has .env' : 'add .env to .gitignore');
  add(PROD && mongoose.get('autoIndex') ? 'FAIL' : 'PASS', 'autoIndex off in production', `autoIndex=${mongoose.get('autoIndex')}`);

  try {
    await connectDB();
    const db = mongoose.connection.db;
    const st = await db.admin().command({ connectionStatus: 1 });
    const roles = (st.authInfo?.authenticatedUserRoles || []).map((r) => `${r.role}@${r.db}`);
    const broad = roles.filter((r) => /^(atlasAdmin|root|dbAdminAnyDatabase|readWriteAnyDatabase|userAdminAnyDatabase)@/.test(r));
    add(broad.length ? 'WARN' : 'PASS', 'Least-privilege DB role', roles.join(', ') + (broad.length ? ' → use readWrite@campuskart for the app user' : ''));
    const info = await db.admin().command({ buildInfo: 1 });
    add(Number(info.version.split('.')[0]) >= 7 ? 'PASS' : 'WARN', 'MongoDB server version', info.version);
    const hello = await db.admin().command({ hello: 1 });
    add(hello.setName ? 'PASS' : 'WARN', 'Replica set (failover)', hello.setName || 'standalone server');
    const pool = mongoose.connection.getClient().options.maxPoolSize;
    add('PASS', 'Connection pool', `maxPoolSize=${pool}`);
  } catch (e) {
    add('FAIL', 'Connect to MongoDB', e.message.split('\n')[0]);
  }
  console.table(results);
  const fails = results.filter((r) => r.level === 'FAIL').length;
  const warns = results.filter((r) => r.level === 'WARN').length;
  console.log(fails ? `✗ ${fails} failing check(s), ${warns} warning(s)` : `✓ no failures (${warns} warning(s))`);
  await disconnectDB().catch(() => {});
  process.exit(fails ? 1 : 0);
})();
