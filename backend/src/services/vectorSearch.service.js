// Week 6: semantic candidate search over product_embeddings.
// Uses Atlas Vector Search when the index exists; otherwise falls back to cosine similarity in Node
// (fine for a campus-sized catalogue, and works on local MongoDB too).
import mongoose from 'mongoose';
import '../models/index.js'; // registers every model, so admin routes only need to import this file
import ProductEmbedding from '../models/ProductEmbedding.model.js';
import { embedTexts, cosine, modelId } from './embedding.service.js';

export const VECTOR_INDEX_NAME = 'product_embedding_vector';
const FALLBACK_SCAN_LIMIT = 5000;

function buildFilter({ category, condition, minPrice, maxPrice } = {}) {
  const f = { status: 'AVAILABLE' };
  if (category) f.category = category;
  if (condition) f.condition = condition;
  if (minPrice != null || maxPrice != null) {
    f.price = {};
    if (minPrice != null) f.price.$gte = Number(minPrice);
    if (maxPrice != null) f.price.$lte = Number(maxPrice);
  }
  return f;
}
// $vectorSearch needs explicit operators
const toVectorFilter = (f) =>
  Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'object' ? v : { $eq: v }]));

/**
 * @returns {Promise<{engine: string, results: {productId, score}[]}>}
 */
export async function semanticSearch({ query, filters = {}, limit = 20 }) {
  const [queryVector] = await embedTexts([query]);
  const filter = buildFilter(filters);
  try {
    const results = await ProductEmbedding.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector,
          numCandidates: Math.min(limit * 15, 10000),
          limit,
          filter: toVectorFilter(filter),
        },
      },
      { $project: { _id: 0, productId: 1, score: { $meta: 'vectorSearchScore' } } },
    ]);
    // An existing index that has not finished building returns nothing: fall back in that case too
    if (results.length || !(await ProductEmbedding.exists(filter))) return { engine: 'atlas-vector-search', results };
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') console.warn(`[vector-search] falling back to in-memory cosine: ${e.message.split('\n')[0]}`);
  }
  const docs = await ProductEmbedding.find({ ...filter, model: modelId() }, { productId: 1, embedding: 1 })
    .limit(FALLBACK_SCAN_LIMIT)
    .lean();
  const results = docs
    .map((d) => ({ productId: d.productId, score: cosine(queryVector, d.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { engine: 'in-memory-cosine', results };
}

/** Semantic search that returns full product documents in ranked order (each with a `similarity`). */
export async function semanticProductSearch(opts) {
  const { engine, results } = await semanticSearch(opts);
  const Product = mongoose.model('Product');
  const products = await Product.find({ _id: { $in: results.map((r) => r.productId) }, status: 'AVAILABLE' }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  return {
    engine,
    products: results.filter((r) => byId.has(String(r.productId))).map((r) => ({ ...byId.get(String(r.productId)), similarity: r.score })),
  };
}

/** Shape products for the ML service's POST /semantic-search (max 250 candidates). */
export const toMlCandidates = (products) =>
  products.slice(0, 250).map((p) => ({
    id: String(p._id),
    title: p.title,
    description: p.description || '',
    category: p.category || '',
    brand: p.brand || '',
    price: p.price,
    condition: p.condition || '',
    location: p.location || '',
  }));
