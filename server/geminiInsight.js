// server/geminiInsight.js
// Middleware Vite (dev & preview) yang menjadi jembatan ke Gemini API.
// API key hanya dibaca di sisi server (dari .env.local), tidak pernah dikirim ke browser.
//   POST /api/ai-insight -> evaluasi produktivitas { status, summary, recommendation }
//   POST /api/ai-chat    -> balasan chat lanjutan berdasarkan sebuah evaluasi { reply }

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
// Model dicoba berurutan; jika satu sedang sibuk (503/429) atau tidak tersedia, pindah ke berikutnya.
const DEFAULT_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite']
const RETRYABLE_STATUS = new Set([404, 429, 500, 503, 504])
const PER_MODEL_TIMEOUT_MS = 20_000
const TOTAL_TIMEOUT_MS = 45_000

const MAX_INSIGHT_BYTES = 32 * 1024
const MAX_RECENT_SESSIONS = 10
const MAX_CHAT_BYTES = 64 * 1024
const MAX_CHAT_MESSAGES = 40
const MAX_MESSAGE_CHARS = 4000

const LOCAL_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const STATS_FIELDS = [
  'focusMinutes', 'focusTarget', 'sessionCount', 'tiredSessions',
  'reelsMinutes', 'reelsLimit', 'brainfallCount', 'ideasToday',
  'pendingTasks', 'overdueTasks'
]
const RESULT_FIELDS = ['status', 'summary', 'recommendation']

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function isLocalRequest(req) {
  const { host, origin } = req.headers
  const protocol = req.socket.encrypted ? 'https' : 'http'
  return LOCAL_ADDRESSES.has(req.socket.remoteAddress) &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host ?? '') &&
    (!origin || origin === `${protocol}://${host}`)
}

function sendJson(res, status, body) {
  if (res.destroyed || res.headersSent) return
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(JSON.stringify(body))
}

async function readJson(req, maxBytes) {
  const chunks = []
  let bytes = 0
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length
    if (bytes > maxBytes) throw new HttpError(413, 'Permintaan terlalu besar.')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'JSON tidak valid.')
  }
}

function pickStats(stats) {
  if (!STATS_FIELDS.every((field) => Number.isFinite(stats?.[field]) && stats[field] >= 0)) return null
  const picked = Object.fromEntries(STATS_FIELDS.map((field) => [field, stats[field]]))
  if (Array.isArray(stats.recentSessions)) {
    picked.recentSessions = stats.recentSessions.slice(0, MAX_RECENT_SESSIONS).map((s) => ({
      when: cleanText(s?.when, 40),
      task: cleanText(s?.task, 200),
      minutes: Number.isFinite(s?.minutes) && s.minutes >= 0 ? s.minutes : 0,
      taskStatus: cleanText(s?.taskStatus, 40),
      mood: cleanText(s?.mood, 20),
      note: cleanText(s?.note, 300)
    }))
  }
  return picked
}

function cleanText(value, max = MAX_MESSAGE_CHARS) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** Panggil Gemini dengan fallback model. Mengembalikan teks jawaban (tanpa bagian "thought"). */
async function callGemini({ apiKey, models, body, signal }) {
  let lastError = new Error('Gemini tidak merespons.')
  for (const model of models) {
    signal.throwIfAborted()
    const attempt = AbortSignal.any([signal, AbortSignal.timeout(PER_MODEL_TIMEOUT_MS)])
    try {
      const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
        method: 'POST',
        signal: attempt,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body)
      })
      if (!response.ok) {
        lastError = new Error(`Gemini (${model}) mengembalikan HTTP ${response.status}.`)
        if (RETRYABLE_STATUS.has(response.status)) continue
        throw lastError
      }
      const output = await response.json()
      const parts = output?.candidates?.[0]?.content?.parts ?? []
      const text = parts.filter((part) => !part.thought).map((part) => part.text ?? '').join('').trim()
      if (text) return text
      lastError = new Error(`Gemini (${model}) mengembalikan jawaban kosong.`)
    } catch (error) {
      if (signal.aborted) throw error
      lastError = error
    }
  }
  throw lastError
}

async function generateInsight(ctx, stats) {
  const prompt = `Buat refleksi produktivitas singkat dan konkret dalam Bahasa Indonesia.
Gunakan hanya data yang tersedia. Jumlah catatan nol berarti aktivitas belum tercatat.
Angka harian (focusMinutes, sessionCount, dst.) hanya untuk hari ini, sedangkan recentSessions berisi riwayat sesi terbaru
lengkap dengan status tugas (Selesai/Belum selesai) dan catatan terakhir pengguna saat berhenti. Manfaatkan catatan itu
untuk menilai progres dan menyarankan langkah lanjutan yang spesifik.
Hindari diagnosis atau kesimpulan kondisi kesehatan mental.
Kembalikan objek JSON dengan tiga string: status (judul singkat), summary, recommendation.
Data: ${JSON.stringify(stats)}`

  const text = await callGemini({
    ...ctx,
    body: {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            status: { type: 'STRING' },
            summary: { type: 'STRING' },
            recommendation: { type: 'STRING' }
          },
          required: RESULT_FIELDS
        }
      }
    }
  })
  const result = JSON.parse(text)
  if (!RESULT_FIELDS.every((field) => typeof result?.[field] === 'string' && result[field].trim())) {
    throw new Error('Respons Gemini tidak lengkap.')
  }
  return Object.fromEntries(RESULT_FIELDS.map((field) => [field, result[field].trim()]))
}

async function generateChatReply(ctx, payload) {
  const evaluation = payload?.evaluation ?? {}
  const messages = Array.isArray(payload?.messages) ? payload.messages.slice(-MAX_CHAT_MESSAGES) : []
  const contents = messages
    .map((m) => ({ role: m?.role === 'model' ? 'model' : 'user', parts: [{ text: cleanText(m?.text) }] }))
    .filter((m) => m.parts[0].text)
  if (!contents.length || contents.at(-1).role !== 'user') {
    throw new HttpError(400, 'Pesan terakhir harus berasal dari pengguna.')
  }
  // Gemini mewajibkan giliran pertama dari user
  while (contents.length && contents[0].role !== 'user') contents.shift()

  const stats = pickStats(evaluation.stats)
  const systemText = `Kamu adalah asisten produktivitas KalaFokus. Jawab dalam Bahasa Indonesia yang ramah, singkat, dan konkret.
Percakapan ini membahas satu evaluasi produktivitas pengguna. Jangan membuat diagnosis kesehatan mental.
Evaluasi yang sedang dibahas:
- Waktu: ${cleanText(evaluation.when, 100) || '-'}
- Status: ${cleanText(evaluation.status, 300) || '-'}
- Ringkasan: ${cleanText(evaluation.summary, 2000) || '-'}
- Saran: ${cleanText(evaluation.recommendation, 1000) || '-'}
${stats ? `- Data mentah saat evaluasi: ${JSON.stringify(stats)}` : ''}`

  const reply = await callGemini({
    ...ctx,
    body: {
      systemInstruction: { parts: [{ text: systemText }] },
      contents
    }
  })
  return { reply }
}

export function geminiInsight(apiKey, modelList) {
  const models = modelList?.length ? modelList : DEFAULT_MODELS

  function route(maxBytes, handler) {
    return async (req, res) => {
      if (!isLocalRequest(req)) return sendJson(res, 403, { error: 'Akses endpoint ini melalui localhost.' })
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metode tidak didukung.' })
      if (!apiKey) return sendJson(res, 503, { code: 'GEMINI_NOT_CONFIGURED', error: 'GEMINI_API_KEY belum diatur di .env.local.' })
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') {
        return sendJson(res, 415, { error: 'Permintaan harus berupa JSON.' })
      }

      const disconnected = new AbortController()
      const timeout = AbortSignal.timeout(TOTAL_TIMEOUT_MS)
      const signal = AbortSignal.any([disconnected.signal, timeout])
      res.once('close', () => { if (!res.writableEnded) disconnected.abort() })

      try {
        const payload = await readJson(req, maxBytes)
        if (res.destroyed) return
        sendJson(res, 200, await handler({ apiKey, models, signal }, payload))
      } catch (error) {
        if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message })
        console.warn('[gemini]', error?.message ?? error)
        sendJson(res, timeout.aborted ? 504 : 502, {
          error: timeout.aborted
            ? 'Gemini melewati batas waktu.'
            : 'Permintaan ke Gemini gagal atau responsnya tidak lengkap.'
        })
      }
    }
  }

  const handleInsight = route(MAX_INSIGHT_BYTES, (ctx, payload) => {
    const stats = pickStats(payload)
    if (!stats) throw new HttpError(400, 'Statistik tidak valid.')
    return generateInsight(ctx, stats)
  })
  const handleChat = route(MAX_CHAT_BYTES, generateChatReply)

  function install(server) {
    server.middlewares.use('/api/ai-insight', handleInsight)
    server.middlewares.use('/api/ai-chat', handleChat)
  }

  return {
    name: 'kalafokus-gemini-insight',
    configureServer: install,
    configurePreviewServer: install
  }
}
