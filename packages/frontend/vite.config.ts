import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react(),
  ],
  
  resolve: {
    alias: {
 '@': path.resolve(__dirname, 'src'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@shared': path.resolve(__dirname, '../shared/src'),
      '@starway/shared': path.resolve(__dirname, '../shared')    },
  },
})
