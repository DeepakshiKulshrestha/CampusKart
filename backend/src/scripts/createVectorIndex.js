// Week 6: create the Atlas Vector Search index on product_embeddings (Atlas only; idempotent).
import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { ProductEmbedding, constants } from '../models/index.js';
import { VECTOR_INDEX_NAME } from '../services/vectorSearch.service.js';

const definition = {
  fields: [
    { type: 'vector', path: 'embedding', numDimensions: constants.EMBEDDING_DIMENSIONS, similarity: 'cosine' },
    { type: 'filter', path: 'status' },
    { type: 'filter', path: 'category' },
    { type: 'filter', path: 'condition' },
    { type: 'filter', path: 'price' },
  ],
};
(async () => {
  await connectDB();
  await ProductEmbedding.createCollection().catch(() => {});
  const col = ProductEmbedding.collection;
  let list;
  try {
    list = await col.listSearchIndexes().toArray();
  } catch (e) {
    throw new Error(`Search indexes are not available on this server (${e.message.split('\n')[0]}). Use Atlas; semantic search will use the in-memory fallback meanwhile.`);
  }
  const found = list.find((i) => i.name === VECTOR_INDEX_NAME);
  if (found) {
    console.log(`index "${VECTOR_INDEX_NAME}" already exists: status=${found.status} queryable=${found.queryable}`);
    // compare only what matters (Atlas may return fields in another order or with extra defaults)
    const sig = (d) => (d?.fields || []).map((f) => [f.type, f.path, f.numDimensions || '', f.similarity || ''].join(':')).sort().join('|');
    if (sig(found.latestDefinition) !== sig(definition)) {
      await col.updateSearchIndex(VECTOR_INDEX_NAME, definition);
      console.log('definition changed → update requested');
    }
  } else {
    await col.createSearchIndex({ name: VECTOR_INDEX_NAME, type: 'vectorSearch', definition });
    console.log(`✓ create requested for "${VECTOR_INDEX_NAME}". Atlas builds it in ~1 min; run this script again to see status=READY.`);
  }
  await disconnectDB();
})().catch(async (e) => { console.error('✗', e.message); await disconnectDB(); process.exit(1); });
