// Create/refresh all indexes defined in the schemas, then list them
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import * as models from '../models/index.js';

(async () => {
  await connectDB();
  for (const [name, M] of Object.entries(models)) {
    if (!M.syncIndexes) continue;
    await M.syncIndexes();
    const idx = await M.collection.indexes();
    console.log(`\n${name} (${M.collection.name})`);
    idx.forEach((i) => console.log(`  ${i.name.padEnd(40)} ${JSON.stringify(i.key)}${i.unique ? ' UNIQUE' : ''}`));
  }
  await disconnectDB();
})().catch((e) => { console.error(e); process.exit(1); });
