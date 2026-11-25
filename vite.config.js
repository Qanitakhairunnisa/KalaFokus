import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { geminiInsight } from './server/geminiInsight.js'

export default defineConfig(({ mode }) => {
  // Hanya variabel berawalan GEMINI_ yang dibaca, dan tidak diekspos ke kode klien
  const env = loadEnv(mode, process.cwd(), 'GEMINI_')
  const apiKey = env.GEMINI_API_KEY?.trim()
  // Opsional: GEMINI_MODEL=model-a,model-b untuk mengganti urutan model
  const models = env.GEMINI_MODEL?.split(',').map((m) => m.trim()).filter(Boolean)

  return {
    plugins: [vue(), tailwindcss(), geminiInsight(apiKey, models)]
  }
})
