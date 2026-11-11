<!-- src/components/ui/StatCard.vue -->
<template>
  <div class="dash-stat" :class="`dash-stat--${variant}`">
    <span class="dash-stat__icon" aria-hidden="true">
      <BaseIcon :name="icon" />
    </span>
    <div>
      <div>
        <span class="dash-stat__num">{{ value }}</span>
        <span class="dash-stat__unit">{{ unit }}</span>
      </div>
      <div class="dash-stat__label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup>
import BaseIcon from './BaseIcon.vue';

defineProps({
  icon: { type: String, required: true },
  value: { type: [Number, String], required: true },
  unit: { type: String, required: true },
  label: { type: String, required: true },
  variant: { type: String, default: 'a' } // a | b | c | d
});
</script>