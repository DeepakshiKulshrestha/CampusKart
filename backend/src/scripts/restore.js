// Week 7: restore a backup made by backup.js.
//   npm run db:restore -- --dir=backups/2026-11-24T10-30            → insert into empty collections only
//   npm run db:restore -- --dir=backups/2026-11-24T10-30 --drop --yes   → replace existing data (DANGEROUS)
// Indexes are not restored from the file: run `npm run db:indexes` afterwards to rebuild them from the schemas.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';

const { EJSON } = mongoose.mongo.BSON;
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
const DROP = process.argv.includes('--drop');
const YES = process.argv.includes('--yes');

(async () => {
  const dir = arg('dir');
  if (!dir || !fs.existsSync(path.join(dir, 'manifest.json'))) throw new Error('Pass --dir=<backup folder containing manifest.json>');
  if (DROP && !YES) throw new Error('--drop replaces live data. Add --yes if you are sure (take a fresh backup first).');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  await connectDB();
  const db = mongoose.connection.db;
  console.log(`restoring ${manifest.database} backup from ${manifest.createdAt} into ${db.databaseName}`);
  for (const name of Object.keys(manifest.collections)) {
    const col = db.collection(name);
    const existing = await col.estimatedDocumentCount();
    if (existing && !DROP) { console.log(`  skip ${name}: has ${existing} documents (use --drop --yes to replace)`); continue; }
    if (DROP) await col.deleteMany({});
    let batch = [], n = 0;
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, `${name}.ndjson`)), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      batch.push(EJSON.parse(line, { relaxed: false }));
      if (batch.length === 500) { await col.insertMany(batch, { ordered: false }); n += batch.length; batch = []; }
    }
    if (batch.length) { await col.insertMany(batch, { ordered: false }); n += batch.length; }
    const ok = n === manifest.collections[name].documents;
    console.log(`  ${ok ? '✓' : '✗'} ${name}: ${n}/${manifest.collections[name].documents}`);
  }
  console.log('done. Now run: npm run db:indexes');
  await disconnectDB();
})().catch(async (e) => { console.error('✗', e.message); await disconnectDB(); process.exit(1); });
