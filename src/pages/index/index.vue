<template>
  <view class="min-h-screen bg-surface" :style="{ paddingTop: navPadding }">
    <OfflineBanner />

    <!-- 标题 -->
    <view class="px-4 pt-4 pb-2">
      <text class="text-headline-md font-bold text-on-surface block">西门问雪</text>
      <text class="text-body-md text-on-surface-variant block mt-1">发现正在下雪的地方</text>
    </view>

    <!-- 日期选择 -->
    <view class="px-4 mb-3">
      <scroll-view scroll-x class="overflow-x-auto">
        <view class="flex gap-2">
          <view
            v-for="d in dateOptions"
            :key="d.value"
            class="flex-shrink-0 px-4 py-2 rounded-full transition-all duration-200"
            :class="selectedDate === d.value ? 'bg-primary' : 'bg-surface-container'"
            hover-class="hover-opacity-80"
            @click="onDateSelect(d.value)"
          >
            <text
              class="text-label-lg whitespace-nowrap"
              :class="selectedDate === d.value ? 'text-white' : 'text-on-surface-variant'"
            >{{ d.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 降雪地图 -->
    <view class="px-4 mb-3">
      <view class="rounded-3xl overflow-hidden shadow-elevation-1">
        <map
          :latitude="centerLat"
          :longitude="centerLon"
          :markers="mapMarkers"
          :scale="mapScale"
          style="width: 100%; height: 260px;"
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

    <template v-else>
      <!-- 热门旅游城市 -->
      <view class="px-4 mb-4" style="padding-bottom: 180px;">
        <text class="text-title-md text-on-surface block mb-3">热门旅游城市</text>
        <view class="flex flex-col gap-3">
          <view
            v-for="city in hotCities"
            :key="city.cityId"
            class="rounded-3xl bg-surface-container shadow-elevation-1 overflow-hidden transition-all duration-200"
            hover-class="hover-elevation-2"
            @click="onHotCityClick(city)"
          >
            <!-- 景区图片 -->
            <view class="relative" style="height: 140px;">
              <image
                v-if="cityImages[city.cityId]"
                :src="cityImages[city.cityId]"
                mode="aspectFill"
                style="width: 100%; height: 140px;"
              />
              <view v-else class="flex items-center justify-center bg-surface-container-high" style="width: 100%; height: 140px;">
                <Icon name="snowflake" size="32px" class="text-outline-variant animate-spin" />
              </view>
              <!-- 降雪状态角标 -->
              <view
                v-if="city.snowLevel !== '无'"
                class="px-3 py-1 rounded-full flex items-center justify-center"
                :class="getSnowBadgeBg(city.snowLevel)"
                style="position: absolute; top: 12px; right: 12px;"
              >
                <text class="text-label-md text-white">{{ snowLevelToFlakes(city.snowLevel) }}</text>
              </view>
            </view>
            <!-- 城市信息 -->
            <view class="px-4 py-3">
              <view class="flex items-center justify-between mb-2">
                <text class="text-title-md text-on-surface">{{ city.cityName }}</text>
                <view class="flex items-center">
                  <text class="text-title-md font-bold text-on-surface">{{ city.temperature }}°C</text>
                  <view class="flex items-center ml-3">
                    <Icon name="droplet" size="12px" class="text-on-surface-variant mr-1" />
                    <text class="text-body-sm text-on-surface-variant">{{ city.humidity }}%</text>
                  </view>
                  <view class="flex items-center ml-3">
                    <Icon name="wind" size="12px" class="text-on-surface-variant mr-1" />
                    <text class="text-body-sm text-on-surface-variant">{{ city.windSpeed }}km/h</text>
                  </view>
                  <Icon name="chevron-right" size="14px" class="text-on-surface-variant ml-3" />
                </view>
              </view>
              <view class="flex items-center justify-between">
                <view v-if="getScenics(city.cityId).length > 0" class="flex flex-wrap flex-1">
                  <text
                    v-for="spot in getScenics(city.cityId)"
                    :key="spot"
                    class="text-label-sm text-primary mr-2 mb-1 px-2 py-0-5 rounded-full bg-primary-container"
                  >{{ spot }}</text>
                </view>
                <text v-if="city.updatedAt" class="text-body-sm text-on-surface-variant flex-shrink-0">{{ formatTime(city.updatedAt) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 降雪城市列表 -->
      <view v-if="snowingCities.length > 0" class="px-4" style="padding-bottom: 180px;">
        <view class="flex items-center justify-between mb-3">
          <text class="text-title-md text-on-surface">
            正在下雪（{{ snowingCities.length }}）
          </text>
        </view>
        <SnowCard
          v-for="region in snowingCities"
          :key="region.cityId"
          :snow-region="region"
          @click="onCardClick"
        />
      </view>
    </template>

    <!-- 悬浮按钮：添加目标城市 -->
    <view
      class="fixed z-10 rounded-full bg-primary shadow-elevation-3 flex items-center justify-center"
      style="right: 24px; bottom: 100px; width: 56px; height: 56px;"
      hover-class="hover-opacity-80"
      @click="onFabClick"
    >
      <Icon name="location-dot" size="24px" class="text-white" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import type { SnowRegion } from '@/models/types'
import { fetchSnowRegions, filterSnowingCities } from '@/services/snow-service'
import { forceRefresh } from '@/utils/cache'
import { getNavBarInfo } from '@/utils/navbar'
import { getScenics, loadCityList, getHotCities } from '@/models/scenics'
import type { CityInfo } from '@/models/scenics'
import Icon from '@/components/Icon.vue'
import SnowCard from '@/components/SnowCard.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'
import { snowLevelToFlakes } from '@/utils/snow'

const allRegions = ref<SnowRegion[]>([])
const loading = ref(false)
const hasError = ref(false)
const errorMessage = ref('获取降雪数据失败，请检查网络连接')
const selectedDate = ref('')
const cityImages = ref<Record<string, string>>({})
const userLat = ref(0)
const userLon = ref(0)

const { totalHeight } = getNavBarInfo()
const navPadding = `${totalHeight}px`

/** 热门城市基础信息（从 DB 加载） */
const hotCityInfos = ref<CityInfo[]>([])

/** 每个城市的标志性景点 prompt（动态生成） */
function getCityPrompt(cityId: string, cityName: string): string {
  const scenics = getScenics(cityId)
  const spot = scenics.length > 0 ? scenics[0] : cityName
  return `${cityName}${spot}雪景，冬日白雪覆盖，摄影作品风格，高清`
}

/** 生成日期选项：今天 + 未来 3 天 */
const dateOptions = computed(() => {
  const options: { label: string; value: string }[] = []
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const value = `${y}-${m}-${day}`
    const label = i === 0 ? '今天' : i === 1 ? '明天' : i === 2 ? '后天' : `${m}-${day}`
    options.push({ label, value })
  }
  return options
})

/** 图片缓存键前缀 */
const IMG_CACHE_PREFIX = 'city_img_'

/** 计算两点间距离（km），Haversine 公式 */
function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 降雪等级权重，用于排序 */
const SNOW_ORDER: Record<string, number> = { '暴雪': 4, '大雪': 3, '中雪': 2, '小雪': 1, '无': 0 }

/** 热门城市数据（从 DB 城市列表 + 天气数据合并），有雪的按距离由近到远排前面，无雪的按距离由近到远排后面 */
const hotCities = computed(() => {
  const list = hotCityInfos.value.map((info) => {
    const found = allRegions.value.find((r: SnowRegion) => r.cityId === info.cityId)
    if (found) return found
    return {
      cityId: info.cityId,
      cityName: info.cityName,
      province: info.province,
      latitude: info.latitude,
      longitude: info.longitude,
      temperature: 0,
      humidity: 0,
      windSpeed: 0,
      windDirection: '',
      snowLevel: '无' as const,
      visibility: 0,
      updatedAt: '',
    }
  })
  // 模拟数据：用于展示降雪效果
  list.push({
    cityId: 'mock_snow_001',
    cityName: '阿勒泰',
    province: '新疆',
    latitude: 47.85,
    longitude: 88.14,
    temperature: -15,
    humidity: 78,
    windSpeed: 12,
    windDirection: '西北风',
    snowLevel: '大雪' as const,
    visibility: 2,
    updatedAt: new Date().toISOString(),
  })

  // 排序：有雪在前（按距离近到远），无雪在后（按距离近到远）
  return list.sort((a, b) => {
    const aSnow = (SNOW_ORDER[a.snowLevel] || 0) > 0 ? 1 : 0
    const bSnow = (SNOW_ORDER[b.snowLevel] || 0) > 0 ? 1 : 0
    if (aSnow !== bSnow) return bSnow - aSnow
    const aDist = calcDistance(userLat.value, userLon.value, a.latitude, a.longitude)
    const bDist = calcDistance(userLat.value, userLon.value, b.latitude, b.longitude)
    return aDist - bDist
  })
})

const snowingCities = computed(() => filterSnowingCities(allRegions.value))

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return ''
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  } catch { return '' }
}

/** 地图上需要标记的下雪城市（合并 allRegions 和 hotCities 中有雪的） */
const mapSnowCities = computed(() => {
  const map = new Map<string, SnowRegion>()
  // 先加 allRegions 中有雪的
  for (const r of allRegions.value) {
    if (r.snowLevel !== '无' && r.latitude && r.longitude) {
      map.set(r.cityId, r)
    }
  }
  // 再加 hotCities 中有雪但不在 allRegions 里的（如模拟数据）
  for (const c of hotCities.value) {
    if (c.snowLevel !== '无' && c.latitude && c.longitude && !map.has(c.cityId)) {
      map.set(c.cityId, c)
    }
  }
  return Array.from(map.values())
})

/**
 * 地图中心点：用边界框中心计算
 * 多个点时取所有点的 min/max 经纬度的中点，比简单平均更合理
 */
const centerLat = computed((): number => {
  const cities = mapSnowCities.value
  if (cities.length === 0) return 35.86
  const lats = cities.map((r) => r.latitude)
  return (Math.min(...lats) + Math.max(...lats)) / 2
})

const centerLon = computed((): number => {
  const cities = mapSnowCities.value
  if (cities.length === 0) return 104.20
  const lons = cities.map((r) => r.longitude)
  return (Math.min(...lons) + Math.max(...lons)) / 2
})

/**
 * 根据标记点的经纬度跨度动态计算地图缩放级别
 * 跨度越大 scale 越小，确保所有点都能显示在视野内
 */
const mapScale = computed((): number => {
  const cities = mapSnowCities.value
  if (cities.length === 0) return 5
  if (cities.length === 1) return 10
  const lats = cities.map((r) => r.latitude)
  const lons = cities.map((r) => r.longitude)
  const latSpan = Math.max(...lats) - Math.min(...lats)
  const lonSpan = Math.max(...lons) - Math.min(...lons)
  const maxSpan = Math.max(latSpan, lonSpan)
  if (maxSpan > 30) return 3
  if (maxSpan > 15) return 4
  if (maxSpan > 8) return 5
  if (maxSpan > 4) return 6
  if (maxSpan > 2) return 7
  if (maxSpan > 1) return 8
  return 9
})

/** 雪花等级对应的 callout 样式 */
function getSnowMarkerLabel(level: string): string {
  switch (level) {
    case '小雪': return '❄'
    case '中雪': return '❄❄'
    case '大雪': return '❄❄❄'
    case '暴雪': return '❄❄❄❄'
    default: return '❄'
  }
}

const mapMarkers = computed(() => {
  return mapSnowCities.value.map((region: SnowRegion, index: number) => ({
    id: index,
    latitude: region.latitude,
    longitude: region.longitude,
    title: region.cityName,
    iconPath: '/static/tabs/home.png',
    width: 1,
    height: 1,
    callout: {
      content: `${getSnowMarkerLabel(region.snowLevel)} ${region.cityName}`,
      display: 'ALWAYS',
      fontSize: 13,
      borderRadius: 20,
      padding: 8,
      bgColor: '#1565C0',
      color: '#FFFFFF',
    },
  }))
})

function getSnowBadgeBg(level: string): string {
  switch (level) {
    case '暴雪': return 'bg-snow-blizzard'
    case '大雪': return 'bg-snow-heavy'
    case '中雪': return 'bg-snow-moderate'
    case '小雪': return 'bg-primary'
    default: return 'bg-snow-none'
  }
}

/**
 * 获取城市景区图片（优先读缓存，没有则调用 AI 生成）
 */
async function loadCityImage(cityId: string, cityName: string) {
  // 已有图片，跳过
  if (cityImages.value[cityId]) return

  // 读本地缓存
  const cacheKey = IMG_CACHE_PREFIX + cityId
  try {
    const cached = uni.getStorageSync(cacheKey)
    if (cached) {
      cityImages.value[cityId] = cached
      return
    }
  } catch {}

  // 没有缓存，调用云函数生成
  const prompt = getCityPrompt(cityId, cityName)

  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({
      name: 'generateImage-mvdJNQ',
      data: { prompt, cityId },
    })
    const result = res.result as { success?: boolean; imageUrl?: string }
    if (result.success && result.imageUrl) {
      cityImages.value[cityId] = result.imageUrl
      // 写入本地缓存
      try { uni.setStorageSync(cacheKey, result.imageUrl) } catch {}
    }
    // #endif
  } catch (err) {
    console.error(`生成城市图片失败: ${cityId}`, err)
  }
}

/** 批量加载所有热门城市图片（逐个请求，避免并发过高） */
async function loadAllCityImages() {
  for (const info of hotCityInfos.value) {
    await loadCityImage(info.cityId, info.cityName)
  }
}

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

function onDateSelect(date: string) {
  selectedDate.value = date
  // TODO: 按日期筛选降雪预报数据
  loadData()
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
  let url = `/pages/detail/detail?cityId=${region.cityId}`
  if (region.latitude && region.longitude) {
    url += `&latitude=${region.latitude}&longitude=${region.longitude}`
  }
  uni.navigateTo({ url })
}

function onHotCityClick(city: SnowRegion) {
  let url = `/pages/detail/detail?cityId=${city.cityId}`
  if (city.latitude && city.longitude) {
    url += `&latitude=${city.latitude}&longitude=${city.longitude}`
  }
  uni.navigateTo({ url })
}

function onMarkerTap(e: { markerId?: number; detail?: { markerId?: number } }) {
  const markerId = e.markerId ?? e.detail?.markerId
  if (markerId !== undefined && markerId >= 0 && markerId < mapSnowCities.value.length) {
    const region = mapSnowCities.value[markerId]
    let url = `/pages/detail/detail?cityId=${region.cityId}`
    if (region.latitude && region.longitude) {
      url += `&latitude=${region.latitude}&longitude=${region.longitude}`
    }
    uni.navigateTo({ url })
  }
}

function onFabClick() {
  uni.switchTab({ url: '/pages/search/search' })
}

onLoad(async () => {
  selectedDate.value = dateOptions.value[0]?.value ?? ''
  // 获取用户位置
  try {
    const res = await new Promise<UniApp.GetLocationSuccess>((resolve, reject) => {
      uni.getLocation({ type: 'gcj02', success: resolve, fail: reject })
    })
    userLat.value = res.latitude
    userLon.value = res.longitude
  } catch {
    console.warn('获取用户位置失败，排序将不使用距离')
  }
  // 先从 DB 加载城市列表
  await loadCityList()
  hotCityInfos.value = getHotCities()
  // 再加载天气数据和图片
  loadData()
  loadAllCityImages()
})
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 2s linear infinite; }
</style>
