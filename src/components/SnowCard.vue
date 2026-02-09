<template>
  <view
    class="rounded-3xl shadow-elevation-1 p-4 mb-3 transition-all duration-200"
    :class="cardBgClass"
    hover-class="hover-elevation-2"
    @click="$emit('click', snowRegion)"
  >
    <!-- 顶部：城市名 + 省份 -->
    <view class="flex items-center justify-between mb-2">
      <view>
        <text class="text-title-lg text-on-surface">{{ snowRegion.cityName }}</text>
        <text class="text-body-sm text-on-surface-variant ml-2">{{ snowRegion.province }}</text>
      </view>
      <view class="flex items-center">
        <Icon name="snowflake" :size="snowflakeSize" :class="snowflakeColorClass" />
      </view>
    </view>

    <!-- 中部：温度 + 降雪强度 -->
    <view class="flex items-end justify-between mb-3">
      <view class="flex items-baseline">
        <text class="text-display-sm font-bold text-on-surface">
          {{ snowRegion.temperature }}°
        </text>
      </view>
      <view class="px-3 py-1 rounded-full" :class="snowLevelBadgeClass">
        <text class="text-label-md text-white">{{ snowRegion.snowLevel }}</text>
      </view>
    </view>

    <!-- 底部：更新时间 -->
    <view class="flex items-center justify-end">
      <text class="text-body-sm text-on-surface-variant">{{ formattedTime }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SnowRegion } from '@/models/types'
import Icon from '@/components/Icon.vue'

const props = defineProps<{
  snowRegion: SnowRegion
}>()

defineEmits<{
  (e: 'click', region: SnowRegion): void
}>()

const cardBgClass = computed(() => {
  switch (props.snowRegion.snowLevel) {
    case '暴雪': return 'bg-snow-blizzard-10 border border-snow-blizzard-30'
    case '大雪': return 'bg-snow-heavy-10 border border-snow-heavy-30'
    case '中雪': return 'bg-snow-moderate-10 border border-snow-moderate-30'
    case '小雪': return 'bg-snow-light border border-primary-light-30'
    default: return 'bg-surface-container border border-outline-variant-30'
  }
})

const snowflakeColorClass = computed(() => {
  switch (props.snowRegion.snowLevel) {
    case '暴雪': return 'text-snow-blizzard'
    case '大雪': return 'text-snow-heavy'
    case '中雪': return 'text-snow-moderate'
    case '小雪': return 'text-primary'
    default: return 'text-snow-none'
  }
})

const snowflakeSize = computed(() => {
  switch (props.snowRegion.snowLevel) {
    case '暴雪': return '28px'
    case '大雪': return '24px'
    case '中雪': return '20px'
    case '小雪': return '16px'
    default: return '14px'
  }
})

const snowLevelBadgeClass = computed(() => {
  switch (props.snowRegion.snowLevel) {
    case '暴雪': return 'bg-snow-blizzard'
    case '大雪': return 'bg-snow-heavy'
    case '中雪': return 'bg-snow-moderate'
    case '小雪': return 'bg-primary'
    default: return 'bg-snow-none'
  }
})

const formattedTime = computed(() => {
  try {
    const date = new Date(props.snowRegion.updatedAt)
    if (isNaN(date.getTime())) return props.snowRegion.updatedAt
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes} 更新`
  } catch {
    return props.snowRegion.updatedAt
  }
})
</script>
