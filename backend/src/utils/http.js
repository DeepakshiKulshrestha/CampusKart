import mongoose from 'mongoose';

// Plain regex: mongoose.isValidObjectId also accepts any 12-character string
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const isObjectId = (value) => typeof value === 'string' && OBJECT_ID.test(value);

function paginated(items, total, page, limit, extra = {}) {
  return { success: true, ...extra, items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// Sends `400 Invalid <label> id` and returns true when req.params.id is not an ObjectId
function rejectInvalidId(req, res, label) {
  if (isObjectId(req.params.id)) return false;
  res.status(400).json({ success: false, message: `Invalid ${label} id` });
  return true;
}

// Mongoose reports illegal status changes (models/transitions.js) as a ValidationError
const isValidationError = (err) => err?.name === 'ValidationError';

// Runs fn(session) inside a MongoDB transaction. Falls back to running without one when the
// server doesn't support transactions (a standalone local mongod); Atlas always supports them.
async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    if (err?.code === 20 || /Transaction numbers are only allowed/i.test(err?.message || '')) {
      return fn(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

export { OBJECT_ID, isObjectId, paginated, rejectInvalidId, isValidationError, withTransaction };
