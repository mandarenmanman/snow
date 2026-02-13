<template>
  <view class="forecast-row" :class="{ 'forecast-row-snow': hasSnow }">
    <!-- 日期 -->
    <view class="forecast-date">
      <text class="forecast-date-text">{{ shortDate }}</text>
      <text class="forecast-weekday">{{ weekday }}</text>
    </view>

    <!-- 天气图标 -->
    <view class="forecast-snow">
      <WeatherIcon v-if="forecast.iconDay" :code="forecast.iconDay" size="20px" />
      <text v-else class="forecast-snow-icon" :style="{ color: snowColor }">{{ snowLevelToFlakes(forecast.snowLevel) }}</text>
    </view>

    <!-- 天气描述 -->
    <view class="forecast-weather">
      <text class="forecast-weather-text" :class="{ 'forecast-weather-snow': hasSnow }">{{ weatherDesc }}</text>
      <view class="flex items-center" style="margin-top: 2px;">
        <Icon name="wind" size="10px" color="#9EA8B4" style="margin-right: 3px;" />
        <text class="forecast-wind-text">{{ windDesc }}</text>
      </view>
    </view>

    <!-- 降雪标签 -->
    <view v-if="hasSnow" class="forecast-snow-tag">
      <text class="forecast-snow-tag-text">{{ forecast.snowLevel }}</text>
    </view>

    <!-- 温度范围 -->
    <view class="forecast-temps">
      <text class="forecast-temp-low">{{ forecast.tempLow }}°</text>
      <view class="forecast-temp-bar">
        <view class="forecast-temp-bar-fill" :style="tempBarStyle"></view>
      </view>
      <text class="forecast-temp-high">{{ forecast.tempHigh }}°</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SnowForecast } from '@/models/types'
import Icon from '@/components/Icon.vue'
import WeatherIcon from '@/components/WeatherIcon.vue'
import { snowLevelToFlakes } from '@/utils/snow'

const props = defineProps<{
  forecast: SnowForecast
}>()

const shortDate = computed(() => {
  try {
    const d = new Date(props.forecast.date)
    if (isNaN(d.getTime())) return ''
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch { return '' }
})

const weekday = computed(() => {
  try {
    const d = new Date(props.forecast.date)
    if (isNaN(d.getTime())) return ''
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return '今天'
    if (diff === 1) return '明天'
    const names = ['日', '一', '二', '三', '四', '五', '六']
    return `周${names[d.getDay()]}`
  } catch { return '' }
})

const weatherDesc = computed(() => {
  const day = props.forecast.weatherTextDay || ''
  const night = props.forecast.weatherTextNight || ''
  if (day && night && day !== night) return `${day}转${night}`
  return day || night || ''
})

const windDesc = computed(() => {
  const dir = props.forecast.windDirDay || ''
  const scale = props.forecast.windScaleDay || ''
  if (dir && scale) return `${dir}${scale}级`
  return dir || ''
})

/** 是否有雪 */
const hasSnow = computed(() => {
  const level = props.forecast.snowLevel
  return level && level !== '无'
})

const snowColor = computed(() => {
  switch (props.forecast.snowLevel) {
    case '暴雪': return '#1455A0'
    case '大雪': return '#1E88E5'
    case '中雪': return '#64B5F6'
    case '小雪': return '#5BA8F5'
    default: return '#D5DAE2'
  }
})

/** 温度条样式 — 模拟 Apple Weather 的渐变温度条 */
const tempBarStyle = computed(() => {
  const low = props.forecast.tempLow
  const high = props.forecast.tempHigh
  // 假设温度范围 -30 ~ 10
  const minT = -30, maxT = 10
  const range = maxT - minT
  const left = Math.max(0, Math.min(100, ((low - minT) / range) * 100))
  const right = Math.max(0, Math.min(100, ((high - minT) / range) * 100))
  const width = Math.max(8, right - left)
  return {
    left: `${left}%`,
    width: `${width}%`,
    background: `linear-gradient(90deg, #64B5F6, #5BA8F5)`,
  }
})
</script>

<style scoped>
.forecast-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(184, 194, 204, 0.15);
}
.forecast-row:last-child {
  border-bottom: none;
}

/* 有雪的行高亮 */
.forecast-row-snow {
  background: rgba(91, 168, 245, 0.08);
}

.forecast-weather-snow {
  color: #2979C1;
  font-weight: 500;
}

.forecast-snow-tag {
  flex-shrink: 0;
  background: rgba(91, 168, 245, 0.15);
  border-radius: 10px;
  padding: 2px 8px;
  margin-right: 6px;
}
.forecast-snow-tag-text {
  font-size: 11px;
  font-weight: 600;
  color: #2979C1;
}

.forecast-date {
  width: 52px;
  flex-shrink: 0;
}
.forecast-date-text {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1B1F26;
}
.forecast-weekday {
  display: block;
  font-size: 11px;
  color: #9EA8B4;
}

.forecast-snow {
  width: 28px;
  flex-shrink: 0;
  text-align: center;
}
.forecast-snow-icon {
  font-size: 14px;
}

.forecast-weather {
  flex: 1;
  min-width: 0;
  padding: 0 8px;
}
.forecast-weather-text {
  display: block;
  font-size: 12px;
  color: #414B57;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.forecast-wind-text {
  font-size: 10px;
  color: #9EA8B4;
}

.forecast-temps {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 110px;
}
.forecast-temp-low {
  font-size: 12px;
  color: #9EA8B4;
  width: 28px;
  text-align: right;
}
.forecast-temp-high {
  font-size: 12px;
  font-weight: 600;
  color: #1B1F26;
  width: 28px;
  text-align: left;
}
.forecast-temp-bar {
  flex: 1;
  height: 4px;
  background: rgba(184, 194, 204, 0.2);
  border-radius: 2px;
  margin: 0 6px;
  position: relative;
}
.forecast-temp-bar-fill {
  position: absolute;
  top: 0;
  height: 4px;
  border-radius: 2px;
}
</style>
