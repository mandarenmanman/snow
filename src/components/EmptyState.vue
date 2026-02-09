<template>
  <view class="flex flex-col items-center justify-center py-16 px-6">
    <view class="mb-6 rounded-full bg-primary-container flex items-center justify-center" style="width: 80px; height: 80px;">
      <Icon :name="icon" size="36px" class="text-primary-on-container" />
    </view>
    <text class="text-body-lg text-on-surface-variant text-center">
      {{ message }}
    </text>
  </view>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'

defineProps<{
  message: string
  icon: string
}>()
</script>
