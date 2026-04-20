import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('/@mui/') || id.includes('/@emotion/') || id.includes('/styled-components/')) {
            return 'mui-vendor';
          }
          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('/@dnd-kit/')) {
            return 'dnd-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
