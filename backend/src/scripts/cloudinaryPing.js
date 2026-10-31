// Verify Cloudinary credentials in .env
import 'dotenv/config';
import cloudinary from '../config/cloudinary.config.js';

cloudinary.api
  .ping()
  .then((r) => console.log('✓ Cloudinary OK', r))
  .catch((e) => { console.error('✗ Cloudinary FAILED', e.error || e.message); process.exit(1); });
