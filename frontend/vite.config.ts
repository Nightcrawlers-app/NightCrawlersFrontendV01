import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: {
      sourcemap: 'hidden',
    },

    // In development the app calls /api/... on its own origin and Vite forwards
    // those requests to the backend. This sidesteps CORS entirely while working
    // locally. In production, set VITE_API_BASE_URL instead (see .env.example).
    server: {
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },

    plugins: [
      react({
        babel: {
          plugins: [
            'react-dev-locator',
          ],
        },
      }),
      tsconfigPaths()
    ],
  };
})
