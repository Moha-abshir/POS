import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

const buildVersion = Date.now().toString()

// Plugin to auto-generate version.json with build timestamp on each build
const versionPlugin = () => {
  return {
    name: 'version-generator',
    buildStart() {
      const publicDir = path.resolve(__dirname, 'public')
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }
      fs.writeFileSync(
        path.join(publicDir, 'version.json'),
        JSON.stringify({ version: buildVersion, builtAt: new Date().toISOString() }, null, 2)
      )
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    versionPlugin(),
    react(),
    tailwindcss(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion),
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }
          if (id.includes('recharts') || id.includes('d3')) {
            return 'vendor-charts'
          }
          if (id.includes('lucide-react') || id.includes('react-hot-toast')) {
            return 'vendor-ui'
          }
          if (id.includes('date-fns')) {
            return 'vendor-date'
          }
          if (id.includes('@tanstack') || id.includes('dexie') || id.includes('axios') || id.includes('zustand')) {
            return 'vendor-data'
          }
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
