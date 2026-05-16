import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'openai-vendor':   ['openai'],
          'xlsx-vendor':     ['xlsx'],
          'ui-vendor':       ['lucide-react', 'react-hot-toast', 'date-fns'],
        },
      },
    },
  },
})
