// Calls Roshni's FastAPI ML service (ml-service/). The marketplace must keep working when it is down,
// so every failure turns into one predictable error: err.status = 503, "AI service unavailable".
const DEFAULT_TIMEOUT_MS = 8000;

export const mlBaseUrl = () => (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');

const unavailable = (detail) => Object.assign(new Error('AI service unavailable'), { status: 503, detail });

/**
 * callMl('/predict-price', { ...features })  → POST with a JSON body
 * callMl('/model-metrics')                    → GET
 */
export async function callMl(path, body, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // Required by the ML service when it runs with APP_ENV=production
  if (process.env.ML_API_KEY) headers['x-ml-api-key'] = process.env.ML_API_KEY;

  let res;
  try {
    res = await fetch(`${mlBaseUrl()}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    // Connection refused, DNS failure or timeout
    console.warn(`[ml] ${path} unreachable: ${err.name === 'TimeoutError' ? `timed out after ${timeoutMs} ms` : err.message}`);
    throw unavailable(err.message);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body: handled below
  }

  if (res.ok) return data;
  // 5xx = ML problem (e.g. model or HF_TOKEN missing); 401 = ML_API_KEY mismatch. Both mean "AI not available right now".
  if (res.status >= 500 || res.status === 401) {
    console.warn(`[ml] ${path} returned ${res.status}: ${JSON.stringify(data?.detail ?? data)?.slice(0, 200)}`);
    throw unavailable(data?.detail);
  }
  // 4xx: the backend sent something the ML service rejected (a contract mismatch, not a user error)
  console.warn(`[ml] ${path} rejected the request (${res.status}): ${JSON.stringify(data?.detail ?? data)?.slice(0, 300)}`);
  throw Object.assign(new Error('The AI service could not process this request'), { status: 502, detail: data?.detail });
}

/**
 * Marketplace product fields → the ML service's PriceFeatures. The model is trained on the marketplace's own
 * categories (ml-service/price_prediction/categories.py), so the category is sent exactly as stored.
 * The listing title goes in itemType: the model reads it as text (e.g. "Casio FX-991EX") to refine the estimate.
 */
export function toPriceFeatures({ title, category, brand, originalPrice, age, condition }) {
  const features = {
    category,
    brand: brand && brand !== 'Generic' ? brand : 'Unknown',
    originalPrice: Number(originalPrice),
    age: Number(age),
    condition,
  };
  if (title && String(title).trim()) features.itemType = String(title).trim().slice(0, 100);
  return features;
}
