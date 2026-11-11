<!-- src/components/layout/IdeaDrawer.vue -->
<template>
  <div v-if="state.isIdeaDrawerOpen" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-mocha-900/40 backdrop-blur-xs" @click="state.isIdeaDrawerOpen = false"></div>
    <aside class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-softwhite border-l border-warmcream-300 shadow-2xl flex flex-col justify-between p-6">
      <div class="flex flex-col h-full">
        <div class="flex items-center justify-between pb-4 border-b border-warmcream-200">
          <div>
            <span class="text-[11px] uppercase tracking-widest text-mocha-500 font-semibold">Brain Dump Paralel</span>
            <h3 class="font-serif text-xl font-semibold text-mocha-900">
              <BaseIcon name="message-circle" with-margin />Parkir Ide Impulsif
            </h3>
          </div>
          <button
            type="button"
            class="w-8 h-8 rounded-lg bg-warmcream-100 hover:bg-warmcream-200 text-mocha-800 flex items-center justify-center text-sm"
            @click="state.isIdeaDrawerOpen = false"
          >
            <BaseIcon name="x" />
          </button>
        </div>

        <p class="text-xs text-mocha-600 mt-3 leading-relaxed">
          Simpan lintasan pikiran yang muncul tiba-tiba agar tidak mengganggu tugas utama Anda. Anda dapat mempromosikan ide di bawah menjadi item Tugas kapan saja.
        </p>

        <form class="mt-4 space-y-2.5" @submit.prevent="handleSubmit">
          <textarea
            v-model="ideaText"
            rows="2"
            required
            class="w-full px-3.5 py-2.5 rounded-xl bg-warmcream-50 border border-warmcream-300 text-xs text-mocha-900 focus:outline-none focus:border-mocha-700"
            placeholder="Tulis lintasan ide atau hal yang tiba-tiba teringat..."
          ></textarea>
          <div class="flex items-center gap-2">
            <select v-model="ideaTag" class="px-3 py-2 rounded-xl bg-warmcream-50 border border-warmcream-300 text-xs text-mocha-800">
              <option value="ide_kreatif">Ide Kreatif</option>
              <option value="urusan_mendadak">Urusan Mendadak</option>
              <option value="riset_nanti">Riset Nanti</option>
              <option value="refleksi">Refleksi Diri</option>
            </select>
            <button type="submit" class="flex-1 py-2 px-4 rounded-xl bg-mocha-800 hover:bg-mocha-900 text-softwhite text-xs font-semibold transition">
              + Parkir Sekarang
            </button>
          </div>
        </form>

        <div class="mt-5 flex-1 overflow-y-auto space-y-2.5 pr-1">
          <div
            v-for="idea in state.ideas"
            :key="idea.id"
            class="p-3.5 rounded-2xl bg-warmcream-50 border border-warmcream-200 flex items-start justify-between gap-2"
          >
            <div>
              <p class="text-xs font-medium text-mocha-900">{{ idea.text }}</p>
              <span class="text-[10px] text-mocha-500">{{ idea.tag }} • {{ idea.createdAt }}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                class="px-2 py-1 rounded-lg bg-softwhite border border-warmcream-300 text-[10px] font-semibold text-mocha-800 hover:bg-warmcream-100"
                title="Jadikan Tugas"
                @click="promoteIdeaToTask(idea)"
              >
                + Tugas
              </button>
              <button
                type="button"
                class="p-1 text-terracotta-600 hover:bg-terracotta-50 rounded-lg"
                @click="removeIdea(idea.id)"
              >
                <BaseIcon name="trash" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useKalaFokus } from '../../composables/useKalaFokus';
import BaseIcon from '../ui/BaseIcon.vue';

const { state, addIdea, removeIdea, promoteIdeaToTask } = useKalaFokus();
const ideaText = ref('');
const ideaTag = ref('ide_kreatif');

function handleSubmit() {
  addIdea(ideaText.value, ideaTag.value);
  ideaText.value = '';
}
</script>