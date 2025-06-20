import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path, { resolve } from 'path'

export default defineConfig({
  base: '/', // ✅ necesario para Vercel
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.hdr'],
  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    // https opcional para local dev con cámara:
    // https: {
    //   key: resolve(__dirname, 'localhost-key.pem'),
    //   cert: resolve(__dirname, 'localhost.pem'),
    // },
  },
  define: {
    __AR_ENABLED__: true,
    __SURFACE_DETECTION__: true,
  },
  build: {
    outDir: 'dist', // ✅ requerido por Vercel
    target: 'es2015',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'ar-utils': ['./src/hooks/useARTracking', './src/utils/arCalibration'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
})
