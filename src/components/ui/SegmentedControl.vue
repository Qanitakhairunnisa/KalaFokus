<!-- src/components/ui/SegmentedControl.vue -->
<template>
  <div
    class="seg"
    :class="{ 'seg--blue seg--wide': variant === 'blue' }"
    :style="{ '--i': activeIndex }"
  >
    <button
      v-for="item in options"
      :key="item.value"
      type="button"
      :class="[buttonClass, { 'is-active': modelValue === item.value }]"
      @click="$emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true }, // [{ label: 'Semua', value: 'all' }]
  variant: { type: String, default: 'default' },
  buttonClass: { type: String, default: 'task-filter-btn' }
});

defineEmits(['update:modelValue']);

const activeIndex = computed(() =>
  Math.max(0, props.options.findIndex(o => o.value === props.modelValue))
);
</script>