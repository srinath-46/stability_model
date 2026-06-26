import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Analyze build size - generates dist/stats.html
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzip: true,
      brotliSize: true,
    }),
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split large dependencies into separate chunks for better caching
        manualChunks: (id) => {
          if (id.includes('node_modules/three')) return 'three-vendor'
          if (id.includes('node_modules/@react-three')) return 'react-three-vendor'
          if (id.includes('node_modules/firebase')) return 'firebase-vendor'
          if (id.includes('node_modules/jspdf')) return 'jspdf-vendor'
          if (id.includes('node_modules/lucide-react')) return 'icons-vendor'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
  },
})
