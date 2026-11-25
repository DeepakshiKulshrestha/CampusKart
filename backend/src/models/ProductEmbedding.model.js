import mongoose from 'mongoose';
import { EMBEDDING_DIMENSIONS } from './constants.js';
const { ObjectId } = mongoose.Schema.Types;

// Week 6: vector storage for semantic search. Kept in its own collection so product reads stay small.
// Filter fields are copied from the product because Atlas $vectorSearch can only pre-filter on fields in this collection.
const productEmbeddingSchema = new mongoose.Schema(
  {
    productId: { type: ObjectId, ref: 'Product', required: true, unique: true },
    embedding: {
      type: [Number],
      required: true,
      validate: { validator: (v) => v.length === EMBEDDING_DIMENSIONS, message: `embedding must have ${EMBEDDING_DIMENSIONS} numbers` },
    },
    model: { type: String, required: true }, // which embedding model/provider produced it
    textHash: { type: String, required: true }, // sha1 of the embedded text: skip re-embedding when nothing changed
    status: { type: String, index: true },
    category: String,
    condition: String,
    location: String,
    price: Number,
  },
  { timestamps: true, collection: 'product_embeddings' }
);

const ProductEmbedding = mongoose.model('ProductEmbedding', productEmbeddingSchema);
export default ProductEmbedding;
