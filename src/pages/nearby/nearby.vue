<template>
  <view class="min-h-screen bg-surface" :style="{ paddingTop: navPadding }">
    <OfflineBanner />

    <view class="px-4 pt-4 pb-2">
      <text class="text-headline-md font-bold text-on-surface block">附近降雪</text>
      <text class="text-body-md text-on-surface-variant block mt-1">基于您的位置查找附近降雪</text>
    </view>

    <view v-if="loading" class="flex flex-col items-center justify-center py-12">
      <view class="mb-3">
        <Icon name="snowflake" size="32px" class="text-primary animate-spin" />
      </view>
      <text class="text-body-md text-on-surface-variant">正在获取附近降雪数据...</text>
    </view>

    <ErrorRetry v-else-if="hasError" :message="errorMessage" @retry="requestLocation" />

    <view v-else-if="nearbyList.length > 0" class="px-4 pb-6">
      <view class="flex items-center justify-between mb-3">
        <text class="text-title-md text-on-surface">附近降雪城市（{{ nearbyList.length }}）</text>
      </view>
      <view
        v-for="item in nearbyList"
        :key="item.cityId"
        class="rounded-3xl bg-surface-container shadow-elevation-1 mb-3 px-4 py-4 flex items-center justify-between transition-all duration-200"
        hover-class="hover-elevation-2"
        @click="onItemClick(item)"
      >
        <view class="flex items-center flex-1">
          <view class="mr-3 rounded-full bg-primary-container flex items-center justify-center" style="width: 44px; height: 44px;">
            <Icon name="location-dot" size="18px" class="text-primary-on-container" />
          </view>
          <view class="flex-1">
            <view class="flex items-center">
              <text class="text-title-md text-on-surface">{{ item.cityName }}</text>
              <view class="ml-2 px-2 py-0-5 rounded-full flex items-center justify-center" :class="getSnowLevelBadgeClass(item.snowLevel)">
                <text class="text-label-md text-white">{{ snowLevelToFlakes(item.snowLevel) }}</text>
              </view>
            </view>
            <view class="flex items-center mt-1">
              <text class="text-body-sm text-on-surface-variant">
                {{ formatDistance(item.distance) }} · {{ item.temperature }}°C
              </text>
            </view>
          </view>
        </view>
        <Icon name="chevron-right" size="14px" class="text-on-surface-variant" />
      </view>
    </view>

    <view v-else-if="loaded && nearbyList.length === 0" class="px-4 pb-6">
      <EmptyState message="附近暂无降雪" icon="snowflake" />
      <view v-if="nearestCity" class="px-4 mt-4">
        <text class="text-title-md text-on-surface block mb-3">为您推荐最近的降雪城市</text>
        <view
          class="rounded-3xl bg-surface-container shadow-elevation-1 px-4 py-4 flex items-center justify-between transition-all duration-200"
          hover-class="hover-elevation-2"
          @click="onNearestClick"
        >
          <view class="flex items-center flex-1">
            <view class="mr-3 rounded-full bg-primary-container flex items-center justify-center" style="width: 44px; height: 44px;">
              <Icon name="snowflake" size="18px" class="text-primary-on-container" />
            </view>
            <view class="flex-1">
              <view class="flex items-center">
                <text class="text-title-md text-on-surface">{{ nearestCity.cityName }}</text>
                <view class="ml-2 px-2 py-0-5 rounded-full flex items-center justify-center" :class="getSnowLevelBadgeClass(nearestCity.snowLevel)">
                  <text class="text-label-md text-white">{{ snowLevelToFlakes(nearestCity.snowLevel) }}</text>
                </view>
              </view>
              <text class="text-body-sm text-on-surface-variant block mt-1">
                距您 {{ formatDistance(nearestCity.distance) }}
              </text>
            </view>
          </view>
          <Icon name="chevron-right" size="14px" class="text-on-surface-variant" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import type { NearbySnowResult } from '@/models/types'
import { getNavBarInfo } from '@/utils/navbar'
import { snowLevelToFlakes } from '@/utils/snow'
import Icon from '@/components/Icon.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import EmptyState from '@/components/EmptyState.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'

const nearbyList = ref<NearbySnowResult[]>([])
const nearestCity = ref<{ cityId: string; cityName: string; distance: number; snowLevel: string } | null>(null)
const loading = ref(false)
const loaded = ref(false)
const hasError = ref(false)
const errorMessage = ref('获取附近降雪数据失败，请检查网络连接')

const { totalHeight } = getNavBarInfo()
const navPadding = `${totalHeight}px`

function requestLocation() {
  loading.value = true
  hasError.value = false
  loaded.value = false
  uni.getLocation({
    type: 'gcj02',
    success: (res) => { fetchNearbySnow(res.latitude, res.longitude) },
    fail: () => {
      loading.value = false
      uni.showModal({
        title: '需要位置权限',
        content: '请在设置中开启位置权限以使用附近降雪功能',
        confirmText: '去设置',
        success: (modalRes) => { if (modalRes.confirm) uni.openSetting({}) },
      })
    },
  })
}

async function fetchNearbySnow(latitude: number, longitude: number) {
  try {
    let nearbySnow: NearbySnowResult[] = []
    let nearest: typeof nearestCity.value = null
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({ name: 'getNearbySnow', data: { latitude, longitude, radius: 200 } })
    const result = res.result as { code?: number; data?: { nearbySnow?: NearbySnowResult[]; nearest?: typeof nearest } }
    if (result.code === 0 && result.data) {
      nearbySnow = result.data.nearbySnow || []
      nearest = result.data.nearest || null
    }
    // #endif
    nearbyList.value = nearbySnow
    nearestCity.value = nearest
    loaded.value = true
  } catch (err) {
    hasError.value = true
    errorMessage.value = '获取附近降雪数据失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

function formatDistance(distance: number): string {
  if (distance < 1) return `${Math.round(distance * 1000)}m`
  return `${distance.toFixed(1)}km`
}

function getSnowLevelBadgeClass(snowLevel: string): string {
  switch (snowLevel) {
    case '暴雪': return 'bg-snow-blizzard'
    case '大雪': return 'bg-snow-heavy'
    case '中雪': return 'bg-snow-moderate'
    case '小雪': return 'bg-primary'
    default: return 'bg-snow-none'
  }
}

function onItemClick(item: NearbySnowResult) {
  let url = `/pages/detail/detail?cityId=${item.cityId}`
  if (item.latitude && item.longitude) {
    url += `&latitude=${item.latitude}&longitude=${item.longitude}`
  }
  uni.navigateTo({ url })
}

function onNearestClick() {
  if (nearestCity.value) {
    let url = `/pages/detail/detail?cityId=${nearestCity.value.cityId}`
    if (nearestCity.value.latitude && nearestCity.value.longitude) {
      url += `&latitude=${nearestCity.value.latitude}&longitude=${nearestCity.value.longitude}`
    }
    uni.navigateTo({ url })
  }
}

onLoad(() => { requestLocation() })
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 2s linear infinite; }
</style>
