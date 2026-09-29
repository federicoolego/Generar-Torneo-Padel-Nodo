import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En GitHub Pages el sitio vive en /<repo>/ (lo setea el workflow con BASE_PATH).
// En Vercel/Netlify o local queda en '/'.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
})
