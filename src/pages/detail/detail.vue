<template>
  <view class="detail-page" :style="{ paddingTop: navPadding }">
    <!-- 顶部栏：毛玻璃效果 -->
    <view class="detail-topbar">
      <view class="detail-topbar-btn" hover-class="hover-opacity-60" @click="goBack">
        <Icon name="arrow-left" size="18px" color="#fff" />
      </view>
      <view class="flex items-center" style="gap: 10px;">
        <view v-if="cityDetail" class="detail-topbar-btn" hover-class="hover-opacity-60" @click="onShare">
          <Icon name="share-from-square" size="18px" color="rgba(255,255,255,0.8)" />
        </view>
        <view v-if="cityDetail" class="detail-topbar-btn" hover-class="hover-opacity-60" @click="toggleFavorite">
          <Icon name="bell" :type="isFavorited ? 'solid' : 'regular'" size="18px" :color="isFavorited ? '#fff' : 'rgba(255,255,255,0.5)'" />
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading" class="flex flex-col items-center justify-center py-16">
      <Icon name="snowflake" size="32px" class="text-primary animate-spin" style="margin-bottom: 12px;" />
      <text class="text-body-md" style="color: rgba(255,255,255,0.8);">加载中...</text>
    </view>

    <ErrorRetry v-else-if="hasError" :message="errorMessage" @retry="loadDetail" />

    <!-- 主内容 -->
    <view v-else-if="cityDetail">

      <!-- Hero 区域：渐变背景 -->
      <view class="detail-hero">
        <text class="detail-city-name">{{ cityDetail.cityName || cityName || '未知城市' }}</text>
        <text v-if="province" class="detail-province">{{ province }}</text>
        <text class="detail-weather-text">{{ cityDetail.current.weatherText || cityDetail.current.snowLevel }}</text>
        <WeatherIcon v-if="cityDetail.current.iconCode" :code="cityDetail.current.iconCode" fill size="48px" color="rgba(255,255,255,0.9)" />
        <text class="detail-temp-big">{{ cityDetail.current.temperature }}°</text>
        <!-- 当前降雪状态标签 -->
        <view v-if="cityDetail.current.snowLevel !== '无'" class="detail-current-snow-badge">
          <Icon name="snowflake" size="12px" color="#fff" style="margin-right: 4px;" />
          <text class="detail-current-snow-text">当前 {{ cityDetail.current.snowLevel }}</text>
        </view>
      </view>

      <!-- 指标卡片行 -->
      <view class="detail-metrics">
        <view class="detail-metric-card">
          <Icon name="droplet" size="16px" class="text-primary" />
          <text class="detail-metric-value">{{ cityDetail.current.humidity }}%</text>
          <text class="detail-metric-label">湿度</text>
        </view>
        <view class="detail-metric-card">
          <Icon name="wind" size="16px" class="text-primary" />
          <text class="detail-metric-value">{{ cityDetail.current.windSpeed }}km/h</text>
          <text class="detail-metric-label">风速</text>
        </view>
        <view class="detail-metric-card">
          <Icon name="location-arrow" size="16px" class="text-primary" />
          <text class="detail-metric-value">{{ cityDetail.current.windDirection }}</text>
          <text class="detail-metric-label">风向</text>
        </view>
        <view class="detail-metric-card">
          <Icon name="eye" size="16px" class="text-primary" />
          <text class="detail-metric-value">{{ cityDetail.current.visibility }}km</text>
          <text class="detail-metric-label">能见度</text>
        </view>
      </view>

      <!-- 降雪日提醒 -->
      <view v-if="snowDays.length > 0" class="detail-section">
        <view class="detail-snow-card">
          <view class="flex items-center" style="margin-bottom: 6px;">
            <Icon name="snowflake" size="14px" class="text-primary" style="margin-right: 6px;" />
            <text class="detail-snow-card-title">未来降雪提醒</text>
          </view>
          <view v-for="day in snowDays" :key="day.date" class="detail-snow-card-row">
            <text class="detail-snow-card-label">{{ day.label }}</text>
            <text class="detail-snow-card-level">{{ day.snowLevel }}</text>
          </view>
        </view>
      </view>

      <!-- 热门景区 -->
      <view v-if="scenics.length > 0" class="detail-section">        <text class="detail-section-title">热门景区</text>
        <scroll-view scroll-x class="detail-scenics-scroll">
          <view class="detail-scenics-row">
            <view v-for="spot in scenics" :key="spot" class="detail-scenic-tag">
              <Icon name="location-dot" size="11px" class="text-primary" style="margin-right: 6px;" />
              <text class="detail-scenic-text">{{ spot }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 15天预报 -->
      <view class="detail-section">
        <text class="detail-section-title">15 天天气预报</text>
        <view v-if="cityDetail.forecast && cityDetail.forecast.length > 0" class="detail-forecast-card">
          <ForecastItem v-for="item in cityDetail.forecast" :key="item.date" :forecast="item" />
        </view>
        <EmptyState v-else message="预报数据更新中" icon="cloud" />
      </view>

      <!-- 更新时间 -->
      <view class="detail-footer">
        <text class="detail-footer-text">更新于 {{ formattedUpdatedAt }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { CityDetail } from '@/models/types'
import { getNavBarInfo } from '@/utils/navbar'
import { getScenics, getProvince } from '@/models/scenics'
import Icon from '@/components/Icon.vue'
import WeatherIcon from '@/components/WeatherIcon.vue'
import ForecastItem from '@/components/ForecastItem.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import EmptyState from '@/components/EmptyState.vue'

const cityId = ref('')
const cityName = ref('')
const longitude = ref(0)
const latitude = ref(0)
const cityDetail = ref<CityDetail | null>(null)
const loading = ref(false)
const hasError = ref(false)
const errorMessage = ref('获取城市详情失败，请检查网络连接')
const isFavorited = ref(false)

const { totalHeight } = getNavBarInfo()
const navPadding = `${totalHeight}px`

const province = computed(() => getProvince(cityId.value))
const scenics = computed(() => getScenics(cityId.value))

/** 从15天预报中提取所有有雪的日期 */
const snowDays = computed(() => {
  if (!cityDetail.value?.forecast?.length) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  return cityDetail.value.forecast
    .filter((f) => f.snowLevel && f.snowLevel !== '无')
    .map((f) => {
      const d = new Date(f.date)
      const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      let label: string
      if (diff === 0) label = '今天'
      else if (diff === 1) label = '明天'
      else if (diff === 2) label = '后天'
      else {
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        label = `${m}-${day} ${weekdays[d.getDay()]}`
      }
      return { date: f.date, label, snowLevel: f.snowLevel }
    })
})

const formattedUpdatedAt = computed(() => {
  if (!cityDetail.value) return ''
  try {
    const date = new Date(cityDetail.value.updatedAt)
    if (isNaN(date.getTime())) return cityDetail.value.updatedAt
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${m}-${d} ${h}:${min}`
  } catch { return cityDetail.value.updatedAt }
})

function goBack() {
  uni.navigateBack({ delta: 1 })
}

function onShare() {
  if (!cityDetail.value) return
  const c = cityDetail.value
  const params = [
    `cityId=${c.cityId}`,
    `cityName=${encodeURIComponent(c.cityName || cityName.value)}`,
    `temp=${c.current.temperature}`,
    `weather=${encodeURIComponent(c.current.weatherText || '')}`,
    `iconCode=${c.current.iconCode || ''}`,
    `snowLevel=${encodeURIComponent(c.current.snowLevel || '无')}`,
    `humidity=${c.current.humidity}`,
    `windSpeed=${c.current.windSpeed}`,
    `windDirection=${encodeURIComponent(c.current.windDirection || '')}`,
  ].join('&')
  uni.navigateTo({ url: `/pages/share/share?${params}` })
}

async function loadDetail() {
  if (!cityId.value) return
  loading.value = true
  hasError.value = false
  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({ name: 'getForecast15d', data: { cityId: cityId.value, longitude: longitude.value || undefined, latitude: latitude.value || undefined } })
    const result = res.result as { code?: number; data?: CityDetail }
    if (result.code === 0 && result.data) cityDetail.value = result.data
    // #endif
    // #ifndef MP-WEIXIN
    cityDetail.value = {
      cityId: cityId.value, cityName: '', current: { temperature: 0, humidity: 0, windSpeed: 0, windDirection: '', snowLevel: '无', visibility: 0 },
      forecast: [], updatedAt: new Date().toISOString(),
    }
    // #endif
  } catch (err) {
    hasError.value = true
    errorMessage.value = '获取城市详情失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

/** 微信订阅消息模板 ID */
const SNOW_ALERT_TMPL_ID = 'Qd_NN-RSHCa2reTPIC7MHo_PMwN0MLLK1Y4jfYlAths'

async function checkFavoriteStatus() {
  if (!cityId.value) return
  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({ name: 'manageFavorites', data: { action: 'list' } })
    const result = res.result as { code?: number; data?: { favorites?: Array<{ cityId: string; subscribed?: boolean }> } }
    const favs = (result.code === 0 && result.data?.favorites) ? result.data.favorites : []
    const fav = favs.find((f) => f.cityId === cityId.value)
    isFavorited.value = !!(fav && fav.subscribed)
    // #endif
  } catch {}
}

async function toggleFavorite() {
  try {
    if (!isFavorited.value) {
      // 订阅：拉起微信订阅消息授权
      try {
        // #ifdef MP-WEIXIN
        await wx.requestSubscribeMessage({ tmplIds: [SNOW_ALERT_TMPL_ID] })
        // #endif
      } catch {}

      // 添加收藏 + 设置 subscribed
      // #ifdef MP-WEIXIN
      await wx.cloud.callFunction({
        name: 'manageFavorites',
        data: {
          action: 'add',
          cityId: cityId.value,
          cityName: cityName.value || cityDetail.value?.cityName || '',
          latitude: latitude.value || undefined,
          longitude: longitude.value || undefined,
        },
      })
      await wx.cloud.callFunction({
        name: 'manageFavorites',
        data: { action: 'subscribe', cityId: cityId.value, subscribed: true },
      })
      // #endif
      isFavorited.value = true
      uni.showToast({ title: '已订阅', icon: 'success', duration: 1500 })
    } else {
      // 取消订阅：删除收藏记录
      // #ifdef MP-WEIXIN
      await wx.cloud.callFunction({
        name: 'manageFavorites',
        data: { action: 'remove', cityId: cityId.value },
      })
      // #endif
      isFavorited.value = false
      uni.showToast({ title: '已取消订阅', icon: 'success', duration: 1500 })
    }
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none', duration: 1500 })
  }
}

onLoad((options) => {
  // 扫小程序码进入时，参数在 scene 里，格式: cityId=xxx
  if (options?.scene && !options.cityId) {
    const scene = decodeURIComponent(options.scene)
    const params = new URLSearchParams(scene)
    if (params.get('cityId')) {
      options.cityId = params.get('cityId')!
    }
  }
  if (options?.cityId) {
    cityId.value = options.cityId
    longitude.value = Number(options.longitude) || 0
    latitude.value = Number(options.latitude) || 0
    if (options.cityName) cityName.value = decodeURIComponent(options.cityName)
    loadDetail()
    checkFavoriteStatus()
  }
})
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 2s linear infinite; }

/* 整页渐变背景 */
.detail-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #4A90D9 0%, #6BB3F0 35%, #E8F0FA 55%, #F7F9FC 70%);
}

/* 顶部栏 */
.detail-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
}
.detail-topbar-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
}

/* Hero 区域 */
.detail-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 24px 28px;
}
.detail-city-name {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 1px;
}
.detail-province {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 2px;
}
.detail-weather-text {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 6px;
}
.detail-temp-big {
  font-size: 80px;
  font-weight: 100;
  color: #fff;
  line-height: 1;
  margin-top: 4px;
  letter-spacing: -3px;
}

/* 当前降雪状态标签 */
.detail-current-snow-badge {
  display: flex;
  align-items: center;
  margin-top: 10px;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  padding: 4px 14px;
}
.detail-current-snow-text {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
}

/* 降雪提醒卡片 */
.detail-snow-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.detail-snow-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1B1F26;
}
.detail-snow-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(184, 194, 204, 0.12);
}
.detail-snow-card-row:last-child {
  border-bottom: none;
}
.detail-snow-card-label {
  font-size: 13px;
  color: #414B57;
}
.detail-snow-card-level {
  font-size: 13px;
  font-weight: 500;
  color: #5BA8F5;
}

/* 指标卡片 */
.detail-metrics {
  display: flex;
  gap: 8px;
  padding: 0 16px;
  margin-top: -8px;
  margin-bottom: 20px;
}
.detail-metric-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border-radius: 16px;
  padding: 12px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.detail-metric-value {
  font-size: 13px;
  font-weight: 600;
  color: #1B1F26;
  margin-top: 6px;
}
.detail-metric-label {
  font-size: 11px;
  color: #6E7A87;
  margin-top: 2px;
}

/* 通用 section */
.detail-section {
  padding: 0 16px;
  margin-bottom: 20px;
}
.detail-section-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1B1F26;
  margin-bottom: 12px;
}

/* 景区横滑 */
.detail-scenics-scroll {
  overflow-x: auto;
  white-space: nowrap;
}
.detail-scenics-row {
  display: flex;
  gap: 8px;
}
.detail-scenic-tag {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: #DCEEFB;
  border-radius: 20px;
  padding: 6px 14px;
}
.detail-scenic-text {
  font-size: 12px;
  font-weight: 500;
  color: #0B3D6E;
}

/* 预报卡片 */
.detail-forecast-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* 底部更新时间 */
.detail-footer {
  text-align: center;
  padding: 8px 0 32px;
}
.detail-footer-text {
  font-size: 11px;
  color: #9EA8B4;
}
</style>
