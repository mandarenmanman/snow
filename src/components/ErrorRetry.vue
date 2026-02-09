<template>
  <view class="flex flex-col items-center justify-center py-12 px-6">
    <view class="mb-4">
      <Icon name="circle-exclamation" size="40px" class="text-error" />
    </view>
    <text class="text-body-lg text-on-surface-variant text-center mb-6">
      {{ message }}
    </text>
    <view
      class="m3-btn-tonal flex items-center justify-center transition-all duration-200"
      hover-class="hover-opacity-80"
      @click="$emit('retry')"
    >
      <Icon name="rotate-right" size="16px" class="text-secondary-on-container mr-2" />
      <text class="text-label-lg text-secondary-on-container">重试</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'

defineProps<{
  message: string
}>()

defineEmits<{
  (e: 'retry'): void
}>()
</script>
