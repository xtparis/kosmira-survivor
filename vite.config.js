import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ΣΗΜΑΝΤΙΚΟ: Άλλαξε το 'kosmiras-tracker' με το όνομα του GitHub repository σου
export default defineConfig({
  plugins: [react()],
  base: '/',
})
