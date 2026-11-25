// Week 4: make sure the global settings document(s) exist, and optionally change the commission rate.
//   npm run db:settings                 → insert missing defaults, print current values
//   npm run db:settings -- --commission=6
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { Settings } from '../models/index.js';

const arg = process.argv.find((a) => a.startsWith('--commission='));
(async () => {
  await connectDB();
  const inserted = await Settings.ensureDefaults();
  if (arg) await Settings.set('commissionRate', Number(arg.split('=')[1]));
  console.log(`defaults inserted: ${inserted}`);
  console.table((await Settings.find().lean()).map(({ key, value, updatedAt }) => ({ key, value, updatedAt })));
  console.log('Existing transactions keep the rate they were created with; only new ones use the current value.');
  await disconnectDB();
})().catch(async (e) => { console.error('✗', e.message); await disconnectDB(); process.exit(1); });
