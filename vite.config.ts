import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';

export default defineConfig({
  plugins: [react(), TanStackRouterVite()],
  base: './', // هذا السطر هو الأهم لضمان أن المسارات نسبية
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: undefined, // لضمان عدم تعقيد ملفات الـ JS
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});