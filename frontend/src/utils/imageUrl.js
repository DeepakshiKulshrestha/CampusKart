/**
 * CampusKart - Image URL Resolution & Normalization Utility
 * 
 * Safely resolves and extracts valid image URL strings from any product object,
 * image object, image array, or string URL.
 * 
 * Guards against:
 * - Direct object injection into HTML src: prevents `[object Object]` network requests.
 * - String literal '[object Object]', 'null', 'undefined'.
 * - Backend products returning `images: string[]` instead of `image`.
 * - Backend or third-party image objects: `{ url }`, `{ secure_url }`, `{ path }`, `{ src }`, `{ previewUrl }`.
 * - Relative image paths: prepends backend host URL without duplicate prepending.
 * - Missing or corrupted image entries: falls back gracefully without breaking UI.
 */

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';

/**
 * Returns the backend host/origin URL for resolving relative asset paths.
 * E.g., 'http://localhost:5000/api' -> 'http://localhost:5000'
 */
export const getBackendBaseUrl = () => {
  const apiUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

/**
 * Resolves a single image reference (string or object) to a valid absolute or data URL.
 * Returns empty string '' if input is invalid or cannot be resolved.
 *
 * @param {string|object|null|undefined} raw
 * @returns {string}
 */
export const resolveImageUrl = (raw) => {
  if (!raw) return '';

  // 1. If it's an object, extract the actual URL property
  if (typeof raw === 'object') {
    // If it's a browser File or Blob instance
    if (typeof File !== 'undefined' && raw instanceof File) {
      try {
        return URL.createObjectURL(raw);
      } catch {
        return '';
      }
    }

    // Inspect object for known image properties
    const candidate =
      raw.url ||
      raw.secure_url ||
      raw.path ||
      raw.src ||
      raw.previewUrl ||
      raw.location ||
      '';

    if (!candidate || typeof candidate !== 'string') {
      return '';
    }

    return resolveImageUrl(candidate);
  }

  // 2. Must be a string
  if (typeof raw !== 'string') return '';

  const trimmed = raw.trim();

  // Guard against string literals like '[object Object]', 'null', 'undefined'
  if (
    !trimmed ||
    trimmed === '[object Object]' ||
    trimmed === 'null' ||
    trimmed === 'undefined'
  ) {
    return '';
  }

  // 3. Absolute HTTP(S), Data URL, or Blob URL
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // 4. Relative URL -> resolve against backend host
  const host = getBackendBaseUrl();
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${host}${normalizedPath}`;
};

/**
 * Extracts the primary image URL from a product object.
 * Checks in order:
 * 1. product.image (string or object)
 * 2. product.images[0] (backend schema format: array of URLs or objects)
 * 3. product.productImage
 * 4. product.imageUrl
 * 5. fallbackUrl
 *
 * @param {object|string} product
 * @param {string} [fallbackUrl=DEFAULT_PRODUCT_IMAGE]
 * @returns {string}
 */
export const getProductImageUrl = (product, fallbackUrl = DEFAULT_PRODUCT_IMAGE) => {
  if (!product) return fallbackUrl;

  // If passed an image URL or image object directly
  if (typeof product === 'string') {
    const resolved = resolveImageUrl(product);
    return resolved || fallbackUrl;
  }

  if (typeof product === 'object') {
    // If this object itself is an image object with url/path
    if (product.url || product.secure_url || product.path || product.src || product.previewUrl) {
      const resolved = resolveImageUrl(product);
      if (resolved) return resolved;
    }

    // Check product.image
    const direct = resolveImageUrl(product.image);
    if (direct) return direct;

    // Check product.images (backend format is images: string[])
    if (Array.isArray(product.images) && product.images.length > 0) {
      for (const item of product.images) {
        const resolved = resolveImageUrl(item);
        if (resolved) return resolved;
      }
    }

    // Check product.productImage
    const altProduct = resolveImageUrl(product.productImage);
    if (altProduct) return altProduct;

    // Check product.imageUrl
    const altUrl = resolveImageUrl(product.imageUrl);
    if (altUrl) return altUrl;
  }

  return fallbackUrl;
};

/**
 * Extracts an array of valid image URLs from a product object.
 *
 * @param {object} product
 * @param {string} [fallbackUrl=DEFAULT_PRODUCT_IMAGE]
 * @returns {string[]}
 */
export const getProductImages = (product, fallbackUrl = DEFAULT_PRODUCT_IMAGE) => {
  if (!product) return [fallbackUrl];

  const list = [];

  // 1. Gather all candidates from product.images
  if (Array.isArray(product.images) && product.images.length > 0) {
    for (const item of product.images) {
      const resolved = resolveImageUrl(item);
      if (resolved && !list.includes(resolved)) {
        list.push(resolved);
      }
    }
  }

  // 2. Gather from product.image
  const direct = resolveImageUrl(product.image);
  if (direct && !list.includes(direct)) {
    // Place primary direct image at index 0 if not already present
    list.unshift(direct);
  }

  // 3. Gather from product.productImage
  const alt = resolveImageUrl(product.productImage);
  if (alt && !list.includes(alt)) {
    list.push(alt);
  }

  return list.length > 0 ? list : [fallbackUrl];
};

/**
 * Normalizes a product so that both `image` and `images` are guaranteed
 * to be clean, resolved string URLs (never objects or '[object Object]').
 *
 * @param {object} product
 * @returns {object}
 */
export const sanitizeProduct = (product) => {
  if (!product || typeof product !== 'object') return product;

  const validImages = getProductImages(product);
  const primaryImage = validImages[0] || DEFAULT_PRODUCT_IMAGE;

  return {
    ...product,
    image: primaryImage,
    images: validImages,
    productImage: primaryImage,
  };
};

