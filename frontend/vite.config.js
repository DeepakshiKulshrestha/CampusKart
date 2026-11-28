import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The backend only allows the origins in FRONTEND_URL (default http://localhost:5173),
  // so the dev server must run on exactly this host and port. strictPort fails instead of
  // silently moving to 5174, which CORS would block.
  server: { host: 'localhost', port: 5173, strictPort: true },
  preview: { host: 'localhost', port: 5173, strictPort: true },
});
