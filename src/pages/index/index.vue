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
          :scale="5"
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
                class="px-3 py-1 rounded-full"
                :class="getSnowBadgeBg(city.snowLevel)"
                style="position: absolute; top: 12px; right: 12px;"
              >
                <text class="text-label-sm text-white">{{ city.snowLevel }}</text>
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
import { getScenics } from '@/models/scenics'
import Icon from '@/components/Icon.vue'
import SnowCard from '@/components/SnowCard.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import EmptyState from '@/components/EmptyState.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'

const allRegions = ref<SnowRegion[]>([])
const loading = ref(false)
const hasError = ref(false)
const errorMessage = ref('获取降雪数据失败，请检查网络连接')
const selectedDate = ref('')
const cityImages = ref<Record<string, string>>({})

const { totalHeight } = getNavBarInfo()
const navPadding = `${totalHeight}px`

/** 图片缓存键前缀 */
const IMG_CACHE_PREFIX = 'city_img_'

/** 每个城市的标志性景点 prompt */
const CITY_PROMPTS: Record<string, string> = {
  '101010100': '北京故宫太和殿雪景，冬日白雪覆盖金色琉璃瓦，摄影作品风格',
  '101190101': '南京中山陵雪景，白雪覆盖台阶和松柏，冬日宁静氛围',
  '101210101': '杭州西湖断桥残雪，远山含黛湖面如镜，中国水墨画风格',
  '101180101': '河南少林寺雪景，古刹红墙白雪，禅意冬日',
  '101200101': '武汉黄鹤楼雪景，飞檐翘角覆盖白雪，长江远景',
  '101280101': '广州白云山冬日风光，云雾缭绕山峦叠翠',
  '101040100': '重庆洪崖洞夜景雪景，吊脚楼灯火辉煌覆盖薄雪',
  '101270101': '成都宽窄巷子雪景，青砖灰瓦白雪，川西民居风格',
  '101230101': '福州三坊七巷冬日，白墙灰瓦马头墙，古巷幽深',
  '101120101': '济南趵突泉冬日雪景，泉水蒸腾白雪皑皑',
  '101070101': '沈阳故宫雪景，红墙金瓦白雪覆盖，满清皇家建筑',
  '101050101': '哈尔滨冰雪大世界，冰雕城堡五彩灯光，梦幻冬夜',
}

/** 热门旅游城市 ID 列表 */
const HOT_CITY_IDS = [
  '101010100', // 北京
  '101190101', // 南京
  '101210101', // 杭州
  '101180101', // 郑州
  '101200101', // 武汉
  '101280101', // 广州
  '101040100', // 重庆
  '101270101', // 成都
  '101230101', // 福州
  '101120101', // 济南
  '101070101', // 沈阳
  '101050101', // 哈尔滨
]

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

/** 热门城市数据（从全量数据中筛选，未命中的用默认值补齐） */
const hotCities = computed(() => {
  const defaultHotCities: Record<string, string> = {
    '101010100': '北京', '101190101': '南京', '101210101': '杭州',
    '101180101': '郑州', '101200101': '武汉', '101280101': '广州',
    '101040100': '重庆', '101270101': '成都', '101230101': '福州',
    '101120101': '济南', '101070101': '沈阳', '101050101': '哈尔滨',
  }
  return HOT_CITY_IDS.map((id) => {
    const found = allRegions.value.find((r: SnowRegion) => r.cityId === id)
    if (found) return found
    return {
      cityId: id,
      cityName: defaultHotCities[id] || id,
      province: '',
      latitude: 0,
      longitude: 0,
      temperature: 0,
      humidity: 0,
      windSpeed: 0,
      windDirection: '',
      snowLevel: '无' as const,
      visibility: 0,
      updatedAt: '',
    }
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
async function loadCityImage(cityId: string) {
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
  const prompt = CITY_PROMPTS[cityId]
  if (!prompt) return

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
  for (const id of HOT_CITY_IDS) {
    await loadCityImage(id)
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
  uni.navigateTo({ url: `/pages/detail/detail?cityId=${region.cityId}` })
}

function onHotCityClick(city: SnowRegion) {
  uni.navigateTo({ url: `/pages/detail/detail?cityId=${city.cityId}` })
}

function onMarkerTap(e: { markerId?: number; detail?: { markerId?: number } }) {
  const markerId = e.markerId ?? e.detail?.markerId
  if (markerId !== undefined && markerId >= 0 && markerId < snowingCities.value.length) {
    const region = snowingCities.value[markerId]
    uni.navigateTo({ url: `/pages/detail/detail?cityId=${region.cityId}` })
  }
}

function onFabClick() {
  uni.navigateTo({ url: '/pages/search/search' })
}

onLoad(() => {
  selectedDate.value = dateOptions.value[0]?.value ?? ''
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
