// Week 7: logical backup of every collection to backups/<timestamp>/<collection>.ndjson (Extended JSON, types preserved).
// Works on every Atlas tier (M0 has no automatic cloud backups). See docs/PRODUCTION.md for the schedule.
//   npm run db:backup                 → backups/2026-11-24T10-30/...
//   npm run db:backup -- --keep=7     → also delete all but the newest 7 backups
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';

const { EJSON } = mongoose.mongo.BSON;
const ROOT = path.resolve(process.env.BACKUP_DIR || 'backups');
const keep = Number((process.argv.find((a) => a.startsWith('--keep=')) || '').split('=')[1] || 0);

export async function runBackup(dir = path.join(ROOT, new Date().toISOString().slice(0, 16).replace(':', '-'))) {
  const db = mongoose.connection.db;
  fs.mkdirSync(dir, { recursive: true });
  const cols = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'));
  const manifest = { database: db.databaseName, createdAt: new Date().toISOString(), collections: {} };
  for (const name of cols) {
    const out = fs.createWriteStream(path.join(dir, `${name}.ndjson`));
    let n = 0;
    for await (const doc of db.collection(name).find()) {
      if (!out.write(EJSON.stringify(doc, { relaxed: false }) + '\n')) await new Promise((r) => out.once('drain', r));
      n++;
    }
    await new Promise((r) => out.end(r));
    const indexes = await db.collection(name).indexes();
    manifest.collections[name] = { documents: n, indexes: indexes.map((i) => i.name) };
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return { dir, manifest };
}

function prune() {
  if (!keep || !fs.existsSync(ROOT)) return [];
  const dirs = fs.readdirSync(ROOT).filter((d) => fs.existsSync(path.join(ROOT, d, 'manifest.json'))).sort();
  const old = dirs.slice(0, Math.max(0, dirs.length - keep));
  old.forEach((d) => fs.rmSync(path.join(ROOT, d), { recursive: true, force: true }));
  return old;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    await connectDB();
    const { dir, manifest } = await runBackup();
    console.table(Object.fromEntries(Object.entries(manifest.collections).map(([k, v]) => [k, v.documents])));
    console.log(`✓ backup written to ${dir}`);
    const removed = prune();
    if (removed.length) console.log(`pruned old backups: ${removed.join(', ')}`);
    console.log('Backups contain user data (hashed passwords, emails): keep them out of Git and off shared drives.');
    await disconnectDB();
  })().catch(async (e) => { console.error('✗', e.message); await disconnectDB(); process.exit(1); });
}
