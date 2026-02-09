<template>
  <view class="min-h-screen bg-surface">
    <OfflineBanner />

    <view class="px-4 pt-4 pb-2">
      <text class="text-headline-md font-bold text-on-surface block">西门催雪</text>
      <text class="text-body-md text-on-surface-variant block mt-1">发现正在下雪的地方</text>
    </view>

    <!-- 降雪地图 -->
    <view class="px-4 mb-3">
      <view class="rounded-3xl overflow-hidden shadow-elevation-1">
        <map
          :latitude="centerLat"
          :longitude="centerLon"
          :markers="mapMarkers"
          :scale="5"
          style="width: 100%; height: 300px;"
          @markertap="onMarkerTap"
        />
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="flex flex-col items-center justify-center py-12">
      <view class="mb-3">
        <Icon name="snowflake" size="32px" class="text-primary animate-spin" />
      </view>
      <text class="text-body-md text-on-surface-variant">正在获取降雪数据...</text>
    </view>

    <ErrorRetry v-else-if="hasError" :message="errorMessage" @retry="loadData" />

    <EmptyState v-else-if="snowingCities.length === 0" message="当前暂无降雪城市" icon="snowflake" />

    <!-- 降雪城市列表 -->
    <view v-else class="px-4 pb-6">
      <view class="flex items-center justify-between mb-3">
        <text class="text-title-md text-on-surface">
          正在下雪的城市（{{ snowingCities.length }}）
        </text>
      </view>
      <SnowCard
        v-for="region in snowingCities"
        :key="region.cityId"
        :snow-region="region"
        @click="onCardClick"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import type { SnowRegion } from '@/models/types'
import { fetchSnowRegions, filterSnowingCities } from '@/services/snow-service'
import { forceRefresh } from '@/utils/cache'
import Icon from '@/components/Icon.vue'
import SnowCard from '@/components/SnowCard.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import EmptyState from '@/components/EmptyState.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'

const allRegions = ref<SnowRegion[]>([])
const loading = ref(false)
const hasError = ref(false)
const errorMessage = ref('获取降雪数据失败，请检查网络连接')

const snowingCities = computed(() => filterSnowingCities(allRegions.value))

const centerLat = computed((): number => {
  if (snowingCities.value.length > 0) {
    const sum = snowingCities.value.reduce((acc: number, r: SnowRegion) => acc + r.latitude, 0)
    return sum / snowingCities.value.length
  }
  return 35.86
})

const centerLon = computed((): number => {
  if (snowingCities.value.length > 0) {
    const sum = snowingCities.value.reduce((acc: number, r: SnowRegion) => acc + r.longitude, 0)
    return sum / snowingCities.value.length
  }
  return 104.20
})

const mapMarkers = computed(() => {
  return snowingCities.value.map((region: SnowRegion, index: number) => ({
    id: index,
    latitude: region.latitude,
    longitude: region.longitude,
    title: region.cityName,
    iconPath: '/static/marker-snow.png',
    width: 30,
    height: 30,
    callout: {
      content: `${region.cityName}: ${region.snowLevel}`,
      display: 'BYCLICK',
    },
  }))
})

async function loadData() {
  loading.value = true
  hasError.value = false
  try {
    const regions = await fetchSnowRegions()
    allRegions.value = regions
  } catch (err) {
    hasError.value = true
    errorMessage.value = '获取降雪数据失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

onPullDownRefresh(async () => {
  try {
    const regions = await forceRefresh<SnowRegion[]>('snow_regions', fetchSnowRegions)
    allRegions.value = regions
    hasError.value = false
  } catch (err) {
    hasError.value = true
    errorMessage.value = '刷新失败，请稍后重试'
  } finally {
    uni.stopPullDownRefresh()
  }
})

function onCardClick(region: SnowRegion) {
  uni.navigateTo({ url: `/pages/detail/detail?cityId=${region.cityId}` })
}

function onMarkerTap(e: { markerId?: number; detail?: { markerId?: number } }) {
  const markerId = e.markerId ?? e.detail?.markerId
  if (markerId !== undefined && markerId >= 0 && markerId < snowingCities.value.length) {
    const region = snowingCities.value[markerId]
    uni.navigateTo({ url: `/pages/detail/detail?cityId=${region.cityId}` })
  }
}

onLoad(() => { loadData() })
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 2s linear infinite; }
</style>
