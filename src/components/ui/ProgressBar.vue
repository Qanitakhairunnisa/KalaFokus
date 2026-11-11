<!-- src/components/ui/ProgressBar.vue -->
<template>
  <div>
    <div v-if="label || statText" class="flex justify-between text-[11px] text-mocha-600 mb-0.5">
      <span>{{ label }}</span>
      <span class="font-semibold text-mocha-800">{{ statText }}</span>
    </div>
    <div :class="trackClass">
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="colorClass"
        :style="{ width: `${Math.min(100, percentage)}%` }"
      ></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, default: '' },
  statText: { type: String, default: '' },
  percentage: { type: Number, default: 0 },
  colorClass: { type: String, default: 'bg-sage-600' },
  trackClass: { type: String, default: 'w-full h-1.5 rounded-full bg-warmcream-200 overflow-hidden' }
});
</script>