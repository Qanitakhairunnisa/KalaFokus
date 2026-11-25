<!-- src/views/AiChatView.vue -->
<!-- Halaman chat lanjutan dengan Gemini berdasarkan satu riwayat evaluasi AI Insight. -->
<template>
  <section class="spa-view space-y-4">
    <RouterLink to="/ai-insight" class="inline-flex items-center gap-1 text-xs font-semibold text-mocha-600 hover:text-mocha-900">
      ← Kembali ke AI Insight
    </RouterLink>

    <div v-if="!evaluation" class="p-6 rounded-3xl bg-warmcream-50 border border-warmcream-200 text-sm text-mocha-600 text-center">
      Riwayat evaluasi tidak ditemukan.
    </div>

    <template v-else>
      <!-- Ringkasan evaluasi yang dibahas -->
      <div class="p-5 sm:p-6 rounded-3xl bg-warmcream-100 border border-warmcream-300 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-3 py-1 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold">{{ evaluation.status }}</span>
          <span class="text-[11px] text-mocha-500">Evaluasi {{ formatWhen(evaluation) }}</span>
        </div>
        <p class="text-sm text-mocha-700 leading-relaxed">{{ evaluation.summary }}</p>
        <p v-if="evaluation.recommendation" class="text-xs text-mocha-800">
          <strong>Saran:</strong> {{ evaluation.recommendation }}
        </p>
      </div>

      <!-- Percakapan -->
      <div class="rounded-3xl bg-warmcream-50 border border-warmcream-200 flex flex-col">
        <div ref="scroller" class="p-4 sm:p-6 space-y-3 max-h-[55vh] min-h-[240px] overflow-y-auto">
          <div class="flex justify-start">
            <div class="max-w-[85%] p-3.5 rounded-2xl rounded-bl-md bg-softwhite border border-warmcream-200 text-sm text-mocha-800">
              Hai! Aku Gemini. Mau bahas apa dari evaluasi ini? Misalnya: “Bagaimana cara mencapai target fokus besok?”
            </div>
          </div>

          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="flex"
            :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[85%] p-3.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed"
              :class="msg.role === 'user'
                ? 'rounded-br-md bg-mocha-800 text-softwhite'
                : 'rounded-bl-md bg-softwhite border border-warmcream-200 text-mocha-800'"
            ><span v-if="msg.role === 'user'">{{ msg.text }}</span><span v-else v-html="renderMarkdown(msg.text)"></span><span class="block mt-1 text-[10px] opacity-60">{{ msg.time }}</span></div>
          </div>

          <div v-if="loading" class="flex justify-start">
            <div class="p-3.5 rounded-2xl rounded-bl-md bg-softwhite border border-warmcream-200 text-xs text-mocha-500">
              Gemini sedang mengetik...
            </div>
          </div>
        </div>

        <div aria-live="polite" class="px-4 sm:px-6">
          <p v-if="errorMessage" class="text-xs text-terracotta-600 pb-2">
            {{ errorMessage }}
            <button v-if="canRetry" type="button" class="underline font-semibold cursor-pointer" @click="requestReply">Coba lagi</button>
          </p>
        </div>

        <form class="p-3 sm:p-4 border-t border-warmcream-200 flex gap-2" @submit.prevent="sendMessage">
          <textarea
            v-model="draft"
            rows="1"
            maxlength="4000"
            placeholder="Tulis pertanyaan untuk Gemini..."
            class="flex-1 resize-none px-4 py-3 rounded-2xl bg-softwhite border border-warmcream-300 text-sm text-mocha-900 focus:outline-none focus:border-mocha-500"
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <button
            type="submit"
            :disabled="loading || !draft.trim()"
            class="px-5 py-3 rounded-2xl bg-mocha-800 hover:bg-mocha-900 disabled:opacity-50 disabled:cursor-not-allowed text-softwhite text-xs font-semibold cursor-pointer"
          >
            Kirim
          </button>
        </form>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { formatWhen, nowTime, useAppState } from '../composables/useAppState'

const route = useRoute()
const { state } = useAppState()

const evaluation = computed(() => state.aiEvaluations.find((ev) => String(ev.id) === String(route.params.id)))
const messages = computed(() => evaluation.value?.messages ?? [])

const draft = ref('')
const errorMessage = ref('')
const scroller = ref(null)
const activeRequest = shallowRef(null)
const loading = computed(() => activeRequest.value !== null)
const canRetry = computed(() => !loading.value && messages.value.at(-1)?.role === 'user')

// Markdown minimal & aman: escape HTML dulu, lalu **tebal**, *miring*, dan `kode`
function renderMarkdown(text = '') {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*/g, '$1<em>$2</em>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
}

function scrollToBottom() {
  nextTick(() => {
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
  })
}

function cancelRequest() {
  const request = activeRequest.value
  activeRequest.value = null
  request?.abort()
}

onMounted(scrollToBottom)
onBeforeUnmount(cancelRequest)
watch(() => [route.params.id, state.uid], () => {
  cancelRequest()
  errorMessage.value = ''
  scrollToBottom()
})
watch(() => messages.value.length, scrollToBottom)

function sendMessage() {
  const text = draft.value.trim()
  const ev = evaluation.value
  if (!text || !ev || loading.value) return
  if (!Array.isArray(ev.messages)) ev.messages = []
  ev.messages.push({ role: 'user', text, time: nowTime() })
  draft.value = ''
  requestReply()
}

async function requestReply() {
  const ev = evaluation.value
  if (!ev || loading.value) return
  const request = new AbortController()
  const timeoutId = setTimeout(() => request.abort(), 50_000)
  activeRequest.value = request
  errorMessage.value = ''

  try {
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: request.signal,
      body: JSON.stringify({
        evaluation: {
          when: formatWhen(ev),
          status: ev.status,
          summary: ev.summary,
          recommendation: ev.recommendation,
          stats: ev.stats
        },
        messages: ev.messages.map(({ role, text }) => ({ role, text }))
      })
    })
    const result = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : null
    if (!response.ok || typeof result?.reply !== 'string') {
      throw new Error(result?.error || 'Gemini belum bisa menjawab. Coba lagi sebentar lagi.')
    }
    if (activeRequest.value !== request) return
    ev.messages.push({ role: 'model', text: result.reply.trim(), time: nowTime() })
  } catch (error) {
    if (activeRequest.value !== request) return
    errorMessage.value = request.signal.aborted
      ? 'Gemini terlalu lama merespons.'
      : error?.message || 'Gemini gagal merespons.'
  } finally {
    clearTimeout(timeoutId)
    if (activeRequest.value === request) activeRequest.value = null
  }
}
</script>
