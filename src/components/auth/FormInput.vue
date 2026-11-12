<script setup>
// src/components/auth/FormInput.vue
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  autocomplete: { type: String, default: 'off' },
  required: { type: Boolean, default: true }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div>
    <label class="block text-sm text-mocha mb-1">{{ label }}</label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      :type="type"
      :required="required"
      :autocomplete="autocomplete"
      class="w-full px-3 py-2 rounded-lg border border-mocha/30 bg-white text-mocha focus:outline-none focus:ring-2 focus:ring-terracotta"
    />
  </div>
</template>