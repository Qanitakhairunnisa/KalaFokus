<!-- src/components/ui/BaseIcon.vue -->
<template>
  <svg
    class="ic"
    :class="{ 'ic-m': withMargin }"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <use :href="`#i-${name}`"></use>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  withMargin: { type: Boolean, default: false }
});
</script>