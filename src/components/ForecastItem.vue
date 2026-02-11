<template>
  <view class="flex items-center px-4 py-3 border-b border-outline-variant-20">
    <!-- 左侧：日期 + 降雪时段 -->
    <view class="flex-1 min-w-0">
      <view class="flex items-center mb-1">
        <Icon name="calendar-days" size="14px" class="text-on-surface-variant mr-2" />
        <text class="text-title-sm text-on-surface">{{ formattedDate }}</text>
      </view>
      <view class="flex items-center">
        <text class="text-body-sm text-on-surface-variant">{{ forecast.snowPeriod || '全天' }}</text>
      </view>
    </view>

    <!-- 中部：降雪强度 + 雪花图标 -->
    <view class="flex items-center mx-3">
      <text class="text-label-md" :class="snowLevelTextClass">
        {{ snowLevelToFlakes(forecast.snowLevel) }}
      </text>
    </view>

    <!-- 右侧：累计量 + 温度范围 -->
    <view class="flex flex-col items-end">
      <text class="text-title-sm text-on-surface">{{ forecast.accumulation }}mm</text>
      <text class="text-body-sm text-on-surface-variant">
        {{ forecast.tempLow }}° / {{ forecast.tempHigh }}°
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SnowForecast } from '@/models/types'
import Icon from '@/components/Icon.vue'
import { snowLevelToFlakes } from '@/utils/snow'

const props = defineProps<{
  forecast: SnowForecast
}>()

const formattedDate = computed(() => {
  try {
    const date = new Date(props.forecast.date)
    if (isNaN(date.getTime())) return props.forecast.date
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    const weekday = weekdays[date.getDay()]
    return `${month}-${day} 周${weekday}`
  } catch {
    return props.forecast.date
  }
})

const snowflakeColorClass = computed(() => {
  switch (props.forecast.snowLevel) {
    case '暴雪': return 'text-snow-blizzard'
    case '大雪': return 'text-snow-heavy'
    case '中雪': return 'text-snow-moderate'
    case '小雪': return 'text-primary'
    default: return 'text-snow-none'
  }
})

const snowLevelTextClass = computed(() => {
  switch (props.forecast.snowLevel) {
    case '暴雪': return 'text-snow-blizzard'
    case '大雪': return 'text-snow-heavy'
    case '中雪': return 'text-snow-moderate'
    case '小雪': return 'text-primary'
    default: return 'text-on-surface-variant'
  }
})

const snowflakeSize = computed(() => {
  switch (props.forecast.snowLevel) {
    case '暴雪': return '18px'
    case '大雪': return '16px'
    case '中雪': return '14px'
    case '小雪': return '12px'
    default: return '11px'
  }
})
</script>
