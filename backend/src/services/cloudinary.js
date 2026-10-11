// Multer buffer → Cloudinary → secure_url (Week 3). Only URLs ever reach MongoDB.
import cloudinary from '../config/cloudinary.config.js';

const FOLDER = process.env.CLOUDINARY_FOLDER || 'campuskart';

function uploadBuffer(buffer, folder = `${FOLDER}/products`) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }))
    );
    stream.end(buffer);
  });
}

// req.files from Multer → array of https URL strings for Product.images
async function uploadImages(files = [], folder) {
  const results = await Promise.all(files.map((f) => uploadBuffer(f.buffer, folder)));
  return results.map((r) => r.url);
}

// Derive public_id from a stored URL so we can delete when a listing/image is removed
function publicIdFromUrl(url) {
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
  return m ? m[1] : null;
}

async function deleteImages(urls = []) {
  const ids = urls.map(publicIdFromUrl).filter(Boolean);
  if (ids.length) await cloudinary.api.delete_resources(ids);
}

export { uploadBuffer, uploadImages, deleteImages, publicIdFromUrl }
