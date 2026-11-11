<!-- src/components/ui/BasePanel.vue -->
<template>
  <div :class="panelClass">
    <div v-if="title || $slots.action" :class="headClass">
      <h4>{{ title }}</h4>
      <slot name="action"></slot>
    </div>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  panelClass: { type: String, default: 'dash-panel' },
  headClass: { type: String, default: 'dash-panel__head' }
});
</script>