// Week 6: product embeddings for semantic search.
// Product saves call scheduleEmbeddingSync(), which only queues work, so writes are never blocked
// by the embedding API. A small in-process queue (dedupe + retries) does the slow part afterwards;
// `npm run db:embeddings` backfills anything the queue missed (e.g. after a restart).
import crypto from 'crypto';
import mongoose from 'mongoose';
import ProductEmbedding from '../models/ProductEmbedding.model.js';
import { EMBEDDING_DIMENSIONS } from '../models/constants.js';

export const EMBED_TEXT_FIELDS = ['title', 'description', 'category', 'brand', 'condition', 'location'];
export const FILTER_FIELDS = ['status', 'price'];
const MODEL_NAME = process.env.EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';

// Provider: "huggingface" (default when HF_TOKEN is set), "hash" (offline dev/testing only, NOT semantic), or "none"
export function provider() {
  return (process.env.EMBEDDING_PROVIDER || (process.env.HF_TOKEN ? 'huggingface' : 'none')).toLowerCase();
}
export const modelId = () => (provider() === 'hash' ? 'local-hash-384' : MODEL_NAME);

// Same text recipe as ml-service/semantic_search/search.py so stored vectors match query vectors
export function productText(p) {
  return ['title', 'itemType', 'variant', 'description', 'category', 'brand', 'condition', 'location']
    .map((f) => (p[f] == null ? '' : String(p[f])))
    .join(' ')
    .trim()
    .slice(0, 3000);
}
export const textHash = (t) => crypto.createHash('sha1').update(t).digest('hex');

export function normalize(v) {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}
export function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // vectors are already normalized
}

// Deterministic bag-of-words hashing vector: lets the pipeline run without an API key. Not semantic.
function hashEmbed(text) {
  const v = new Array(EMBEDDING_DIMENSIONS).fill(0);
  for (const w of text.toLowerCase().match(/[a-z0-9]+/g) || []) {
    const h = crypto.createHash('md5').update(w).digest();
    v[h.readUInt16BE(0) % EMBEDDING_DIMENSIONS] += h[2] & 1 ? 1 : -1;
  }
  return normalize(v);
}

async function hfEmbed(texts) {
  const url = `https://router.huggingface.co/hf-inference/models/${MODEL_NAME}/pipeline/feature-extraction`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: texts }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Hugging Face embedding request failed: HTTP ${res.status}`);
  const out = await res.json();
  if (!Array.isArray(out) || out.length !== texts.length || out.some((v) => !Array.isArray(v) || v.length !== EMBEDDING_DIMENSIONS))
    throw new Error('Unexpected embedding response shape');
  return out.map(normalize);
}

const testDelay = () => Number(process.env.EMBEDDING_TEST_DELAY_MS || 0); // used by the non-blocking test

/** Embed up to 32 texts → array of normalized 384-number vectors. */
export async function embedTexts(texts) {
  const p = provider();
  if (testDelay()) await new Promise((r) => setTimeout(r, testDelay()));
  if (p === 'hash') return texts.map(hashEmbed);
  if (p === 'huggingface') {
    if (!process.env.HF_TOKEN) throw new Error('HF_TOKEN is not set');
    const out = [];
    for (let i = 0; i < texts.length; i += 32) out.push(...(await hfEmbed(texts.slice(i, i + 32))));
    return out;
  }
  throw new Error('Embeddings are disabled (set HF_TOKEN, or EMBEDDING_PROVIDER=hash for local testing)');
}

const filterFields = (p) => ({ status: p.status, category: p.category, condition: p.condition, location: p.location, price: p.price });

/** Bring one product's embedding up to date. mode "filters" only copies status/price etc. */
export async function syncProductEmbedding(productId, mode = 'text') {
  const Product = mongoose.model('Product');
  const p = await Product.findById(productId).lean();
  if (!p) {
    await ProductEmbedding.deleteOne({ productId });
    return 'deleted';
  }
  const existing = await ProductEmbedding.findOne({ productId }, { textHash: 1, model: 1 }).lean();
  if (mode === 'filters' && existing) {
    await ProductEmbedding.updateOne({ productId }, { $set: filterFields(p) });
    return 'filters';
  }
  const text = productText(p);
  const hash = textHash(text);
  if (existing && existing.textHash === hash && existing.model === modelId()) {
    await ProductEmbedding.updateOne({ productId }, { $set: filterFields(p) });
    return 'unchanged';
  }
  const [embedding] = await embedTexts([text]);
  await ProductEmbedding.updateOne(
    { productId },
    { $set: { embedding, model: modelId(), textHash: hash, ...filterFields(p) } },
    { upsert: true, runValidators: true }
  );
  return 'embedded';
}

// ---------------- background queue ----------------
const pending = new Map(); // productId -> mode ("text" wins over "filters")
const stats = { queued: 0, done: 0, failed: 0, lastError: null };
let running = 0;
const CONCURRENCY = Number(process.env.EMBEDDING_CONCURRENCY || 2);
const MAX_ATTEMPTS = 3;
let idleWaiters = [];

export function scheduleEmbeddingSync(productId, mode = 'text') {
  if (provider() === 'none') return false;
  const id = String(productId);
  if (pending.get(id) !== 'text') pending.set(id, mode);
  stats.queued++;
  setImmediate(pump);
  return true;
}

function pump() {
  while (running < CONCURRENCY && pending.size) {
    const [id, mode] = pending.entries().next().value;
    pending.delete(id);
    running++;
    runWithRetry(id, mode).finally(() => {
      running--;
      if (pending.size) setImmediate(pump);
      else if (!running) {
        idleWaiters.forEach((r) => r());
        idleWaiters = [];
      }
    });
  }
}

async function runWithRetry(id, mode) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await syncProductEmbedding(id, mode);
      stats.done++;
      return;
    } catch (e) {
      stats.lastError = e.message;
      if (attempt === MAX_ATTEMPTS) {
        stats.failed++;
        console.error(`[embeddings] product ${id} failed after ${MAX_ATTEMPTS} attempts: ${e.message}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
}

export const getEmbeddingQueueStats = () => ({ ...stats, pending: pending.size, running, provider: provider() });
/** Resolves once the queue is empty (scripts/tests). */
export const drainEmbeddingQueue = () =>
  !pending.size && !running ? Promise.resolve() : new Promise((r) => idleWaiters.push(r));
