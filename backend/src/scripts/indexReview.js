// Week 7: index review across all collections — lists every index, how often it was used since the
// server last restarted ($indexStats), and flags indexes that look redundant or are missing from the schemas.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import * as models from '../models/index.js';

const keyStr = (k) => Object.entries(k).map(([f, d]) => `${f}:${d}`).join(',');
(async () => {
  await connectDB();
  const db = mongoose.connection.db;
  const modelByCol = Object.fromEntries(Object.values(models).filter((m) => m?.collection).map((m) => [m.collection.name, m]));
  const cols = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).filter((n) => !n.startsWith('system.'));
  const findings = [];
  for (const name of cols.sort()) {
    const col = db.collection(name);
    const indexes = await col.indexes();
    let usage = {};
    try { usage = Object.fromEntries((await col.aggregate([{ $indexStats: {} }]).toArray()).map((s) => [s.name, Number(s.accesses.ops)])); } catch { /* not permitted on some tiers */ }
    const count = await col.estimatedDocumentCount();
    console.log(`\n${name}  (${count} docs, ${indexes.length} indexes)${modelByCol[name] ? '' : '  ⚠ no Mongoose model'}`);
    for (const ix of indexes) {
      const flags = [];
      if (ix.unique) flags.push('UNIQUE');
      if (ix.partialFilterExpression) flags.push('PARTIAL');
      if (ix.expireAfterSeconds != null) flags.push(`TTL ${ix.expireAfterSeconds}s`);
      if (ix.textIndexVersion) flags.push('TEXT');
      // a plain index whose keys are a prefix of another index is usually redundant
      const k = keyStr(ix.key);
      const coveredBy = indexes.find((o) => o.name !== ix.name && keyStr(o.key).startsWith(`${k},`));
      if (coveredBy && !ix.unique && !ix.partialFilterExpression && ix.name !== '_id_') {
        flags.push(`REDUNDANT? (prefix of ${coveredBy.name})`);
        findings.push(`${name}.${ix.name} may be redundant (prefix of ${coveredBy.name})`);
      }
      const ops = usage[ix.name];
      console.log(`  ${ix.name.padEnd(42)} ${k.padEnd(48)} ops=${ops ?? 'n/a'} ${flags.join(' ')}`);
    }
    if (modelByCol[name]) {
      const diff = await modelByCol[name].diffIndexes();
      if (diff.toCreate.length) findings.push(`${name}: ${diff.toCreate.length} schema index(es) not built yet → npm run db:indexes`);
      if (diff.toDrop.length) findings.push(`${name}: index(es) in DB but not in schema: ${diff.toDrop.join(', ')}`);
    }
  }
  try {
    const search = await models.ProductEmbedding.collection.listSearchIndexes().toArray();
    console.log(`\nAtlas search indexes on product_embeddings: ${search.map((s) => `${s.name}(${s.status})`).join(', ') || 'none → npm run db:vector-index'}`);
  } catch { console.log('\nAtlas search indexes: not available on this server'); }
  console.log(`\nops = uses since the last server restart; 0 on a fresh cluster is normal. Review again after real traffic.`);
  console.log(findings.length ? `\nFindings:\n- ${findings.join('\n- ')}` : '\n✓ No redundant or missing indexes found.');
  await disconnectDB();
})().catch(async (e) => { console.error('✗', e.message); await disconnectDB(); process.exit(1); });
