// Multer config (Week 2): temp storage in memory before Cloudinary upload.
// Usage (Deepakshi):  router.post('/', auth, uploadProductImages, handleUploadErrors, createProduct)
import multer from 'multer';

const MAX_FILE_MB = 5;
const MAX_FILES = 5;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(), // buffer only — nothing written to disk, nothing stored in Mongo
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024, files: MAX_FILES },
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only JPEG, PNG or WEBP images allowed')),
});

const uploadProductImages = upload.array('images', MAX_FILES); // form field: images
const uploadProfileImage = upload.single('profileImage');

// Turns Multer errors into clean 400 responses
function handleUploadErrors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const msg = {
      LIMIT_FILE_SIZE: `Each image must be under ${MAX_FILE_MB}MB`,
      LIMIT_FILE_COUNT: `Max ${MAX_FILES} images allowed`,
    }[err.code] || err.field || err.message;
    return res.status(400).json({ success: false, message: msg });
  }
  next(err);
}

export { uploadProductImages, uploadProfileImage, handleUploadErrors, MAX_FILES, MAX_FILE_MB }
