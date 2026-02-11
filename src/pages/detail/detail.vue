<template>
  <view class="min-h-screen bg-surface" :style="{ paddingTop: navPadding }">
    <!-- 返回 + 订阅 -->
    <view class="px-4 pt-4 pb-2 flex items-center justify-between">
      <view class="flex items-center flex-1">
        <view
          class="flex items-center justify-center rounded-full mr-3"
          hover-class="hover-opacity-60"
          style="width: 40px; height: 40px;"
          @click="goBack"
        >
          <Icon name="arrow-left" size="20px" class="text-on-surface" />
        </view>
        <view>
          <text class="text-headline-md font-bold text-on-surface block">
            {{ cityDetail ? cityDetail.cityName : (cityName || '城市详情') }}
          </text>
          <text v-if="cityDetail" class="text-body-sm text-on-surface-variant block mt-1">
            {{ province ? province + ' · ' : '' }}更新于 {{ formattedUpdatedAt }}
          </text>
        </view>
      </view>
      <view
        v-if="cityDetail"
        class="flex items-center justify-center rounded-full transition-all duration-200"
        hover-class="hover-opacity-60"
        style="width: 48px; height: 48px;"
        @click="toggleFavorite"
      >
        <Icon
          name="star"
          :type="isFavorited ? 'solid' : 'regular'"
          size="24px"
          :class="isFavorited ? 'text-primary' : 'text-on-surface-variant'"
        />
      </view>
    </view>

    <!-- 加载 -->
    <view v-if="loading" class="flex flex-col items-center justify-center py-12">
      <view class="mb-3">
        <Icon name="snowflake" size="32px" class="text-primary animate-spin" />
      </view>
      <text class="text-body-md text-on-surface-variant">正在加载城市详情...</text>
    </view>

    <ErrorRetry v-else-if="hasError" :message="errorMessage" @retry="loadDetail" />

    <!-- 详情 -->
    <view v-else-if="cityDetail" class="px-4 pb-6">
      <!-- 当前天气卡片 -->
      <view class="rounded-3xl bg-surface-container shadow-elevation-2 p-5 mb-4">
        <view class="flex items-end justify-between mb-4">
          <view class="flex items-end">
            <text class="text-display-md font-bold text-on-surface" style="line-height: 1;">
              {{ cityDetail.current.temperature }}
            </text>
            <text class="text-headline-sm text-on-surface-variant ml-1 mb-1">°C</text>
          </view>
          <view class="flex items-center rounded-full px-4 py-2" :class="snowLevelBgClass">
            <text class="text-label-lg" :class="snowLevelTextClass">
              {{ snowLevelToFlakes(cityDetail.current.snowLevel) }}
            </text>
          </view>
        </view>

        <view class="flex flex-wrap">
          <view class="w-half flex items-center py-2">
            <view class="rounded-full bg-primary-container flex items-center justify-center mr-3" style="width: 36px; height: 36px;">
              <Icon name="droplet" size="16px" class="text-primary-on-container" />
            </view>
            <view>
              <text class="text-body-sm text-on-surface-variant block">湿度</text>
              <text class="text-title-sm text-on-surface block">{{ cityDetail.current.humidity }}%</text>
            </view>
          </view>
          <view class="w-half flex items-center py-2">
            <view class="rounded-full bg-primary-container flex items-center justify-center mr-3" style="width: 36px; height: 36px;">
              <Icon name="wind" size="16px" class="text-primary-on-container" />
            </view>
            <view>
              <text class="text-body-sm text-on-surface-variant block">风速</text>
              <text class="text-title-sm text-on-surface block">{{ cityDetail.current.windSpeed }}km/h</text>
            </view>
          </view>
          <view class="w-half flex items-center py-2">
            <view class="rounded-full bg-primary-container flex items-center justify-center mr-3" style="width: 36px; height: 36px;">
              <Icon name="location-arrow" size="16px" class="text-primary-on-container" />
            </view>
            <view>
              <text class="text-body-sm text-on-surface-variant block">风向</text>
              <text class="text-title-sm text-on-surface block">{{ cityDetail.current.windDirection }}</text>
            </view>
          </view>
          <view class="w-half flex items-center py-2">
            <view class="rounded-full bg-primary-container flex items-center justify-center mr-3" style="width: 36px; height: 36px;">
              <Icon name="eye" size="16px" class="text-primary-on-container" />
            </view>
            <view>
              <text class="text-body-sm text-on-surface-variant block">能见度</text>
              <text class="text-title-sm text-on-surface block">{{ cityDetail.current.visibility }}km</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 预报 -->
      <view class="mb-4">
        <text class="text-title-md text-on-surface block mb-3">未来 3 天降雪预报</text>
        <view v-if="cityDetail.forecast.length > 0" class="rounded-3xl bg-surface-container shadow-elevation-1 overflow-hidden">
          <ForecastItem v-for="item in cityDetail.forecast" :key="item.date" :forecast="item" />
        </view>
        <EmptyState v-else message="预报数据更新中，请稍后再试" icon="cloud" />
      </view>

      <!-- 热门景区 -->
      <view v-if="scenics.length > 0" class="mb-4">
        <text class="text-title-md text-on-surface block mb-3">热门景区</text>
        <view class="flex flex-wrap">
          <view
            v-for="spot in scenics"
            :key="spot"
            class="rounded-full bg-primary-container px-4 py-2 mr-2 mb-2 flex items-center"
          >
            <Icon name="location-dot" size="14px" class="text-primary-on-container mr-2" />
            <text class="text-label-lg text-primary-on-container">{{ spot }}</text>
          </view>
        </view>
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
import { snowLevelToFlakes } from '@/utils/snow'
import Icon from '@/components/Icon.vue'
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

const snowLevelBgClass = computed(() => {
  if (!cityDetail.value) return 'bg-surface-container-high'
  switch (cityDetail.value.current.snowLevel) {
    case '暴雪': return 'bg-snow-blizzard-15'
    case '大雪': return 'bg-snow-heavy-15'
    case '中雪': return 'bg-snow-moderate-15'
    case '小雪': return 'bg-primary-container'
    default: return 'bg-surface-container-high'
  }
})

const snowLevelIconClass = computed(() => {
  if (!cityDetail.value) return 'text-on-surface-variant'
  switch (cityDetail.value.current.snowLevel) {
    case '暴雪': return 'text-snow-blizzard'
    case '大雪': return 'text-snow-heavy'
    case '中雪': return 'text-snow-moderate'
    case '小雪': return 'text-primary'
    default: return 'text-snow-none'
  }
})

const snowLevelTextClass = computed(() => {
  if (!cityDetail.value) return 'text-on-surface-variant'
  switch (cityDetail.value.current.snowLevel) {
    case '暴雪': return 'text-snow-blizzard'
    case '大雪': return 'text-snow-heavy'
    case '中雪': return 'text-snow-moderate'
    case '小雪': return 'text-primary'
    default: return 'text-on-surface-variant'
  }
})

function goBack() {
  uni.navigateBack({ delta: 1 })
}

async function loadDetail() {
  if (!cityId.value) return
  loading.value = true
  hasError.value = false
  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({ name: 'getSnowData', data: { action: 'detail', cityId: cityId.value, longitude: longitude.value || undefined, latitude: latitude.value || undefined } })
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

async function checkFavoriteStatus() {
  if (!cityId.value) return
  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({ name: 'manageFavorites', data: { action: 'list' } })
    const result = res.result as { code?: number; data?: { favorites?: Array<{ cityId: string }> } }
    const favs = (result.code === 0 && result.data?.favorites) ? result.data.favorites : []
    isFavorited.value = favs.some((fav) => fav.cityId === cityId.value)
    // #endif
  } catch {}
}

async function toggleFavorite() {
  const action = isFavorited.value ? 'remove' : 'add'
  try {
    // #ifdef MP-WEIXIN
    await wx.cloud.callFunction({
      name: 'manageFavorites',
      data: {
        action,
        cityId: cityId.value,
        cityName: cityName.value || cityDetail.value?.cityName || '',
        latitude: latitude.value || undefined,
        longitude: longitude.value || undefined,
      },
    })
    // #endif
    isFavorited.value = !isFavorited.value
    uni.showToast({ title: isFavorited.value ? '已订阅' : '已取消订阅', icon: 'success', duration: 1500 })
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none', duration: 1500 })
  }
}

onLoad((options) => {
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
</style>
