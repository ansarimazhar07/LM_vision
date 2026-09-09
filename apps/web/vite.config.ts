import { defineConfig } from 'vite';

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'EXPO_PUBLIC_'],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://lm-vision-r622.onrender.com',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
