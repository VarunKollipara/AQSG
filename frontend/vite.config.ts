import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/upload': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
      '/voice': 'http://localhost:8000',
    },
  },
})
