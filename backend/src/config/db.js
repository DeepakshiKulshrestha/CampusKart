// MongoDB connection with pooling + resilience (Week 2)
import mongoose from 'mongoose';
import dns from 'dns';

// Fix for "querySrv ECONNREFUSED" on Windows: Node's resolver can fail SRV lookups for
// mongodb+srv:// URIs. Use public DNS for them (override with DNS_SERVERS=ip1,ip2; set DNS_SERVERS=system to skip).
function configureDns(uri) {
  if (!uri.startsWith('mongodb+srv://') || process.env.DNS_SERVERS === 'system') return;
  dns.setServers((process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',').map((s) => s.trim()));
}

mongoose.set('strictQuery', true);
// Build indexes automatically in dev; in prod run `npm run db:indexes` instead.
mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');

const options = {
  maxPoolSize: Number(process.env.DB_MAX_POOL || 10), // Atlas M0 allows 500 conns; keep small per instance
  minPoolSize: Number(process.env.DB_MIN_POOL || 2),
  serverSelectionTimeoutMS: 10000, // fail fast if Atlas unreachable / IP not whitelisted
  socketTimeoutMS: 45000,
  maxIdleTimeMS: 60000,
  retryWrites: true,
  w: 'majority',
};

let isConnected = false;

async function connectDB(uri = process.env.MONGODB_URI) {
  if (isConnected) return mongoose.connection;
  if (!uri) throw new Error('MONGODB_URI is not set');
  configureDns(uri);

  mongoose.connection.on('connected', () => console.log(`[db] connected → ${mongoose.connection.name}`));
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => { isConnected = false; console.warn('[db] disconnected'); });

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await mongoose.connect(uri, options);
      isConnected = true;
      return mongoose.connection;
    } catch (err) {
      console.error(`[db] connect attempt ${attempt} failed: ${err.message}`);
      if (attempt === 5) throw err;
      await new Promise((r) => setTimeout(r, attempt * 2000)); // linear backoff
    }
  }
}

async function disconnectDB() {
  await mongoose.connection.close();
  isConnected = false;
}

// Graceful shutdown so pooled sockets are released
['SIGINT', 'SIGTERM'].forEach((sig) =>
  process.once(sig, async () => { await disconnectDB(); process.exit(0); })
);

export { connectDB, disconnectDB }
