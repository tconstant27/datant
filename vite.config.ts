import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En ligne, le site est servi sur https://tconstant27.github.io/datant/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/datant/' : '/',
  plugins: [react(), tailwindcss()],
}))
