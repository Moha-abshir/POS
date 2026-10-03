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
  }
})
