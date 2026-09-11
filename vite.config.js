import { defineConfig } from 'vite'

// Sitio estático de una sola página: todo vive en index.html.
// base relativo para que ande igual en Vercel o en cualquier hosting.
export default defineConfig({
  base: './',
})
