<template>
  <view
    v-if="!isOnline"
    class="flex items-center justify-center px-4 py-2 bg-surface-container-high"
    style="gap: 8px;"
  >
    <Icon name="wifi" size="14px" class="text-on-surface-variant" style="opacity: 0.6;" />
    <text class="text-label-md text-on-surface-variant">当前为离线模式</text>
  </view>
</template>

<script setup lang="ts">
import { isOnline } from '@/utils/network'
import Icon from '@/components/Icon.vue'
</script>
