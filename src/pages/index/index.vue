<template>
  <view class="bg-surface" :style="{ paddingTop: navPadding }">
    <OfflineBanner />

    <!-- 标题 -->
    <view class="px-4 pt-4 pb-2">
      <view class="flex items-center justify-between">
        <text class="text-headline-md font-bold text-on-surface">西门问雪</text>
        <text class="text-body-md text-on-surface-variant">{{ currentTime }}</text>
      </view>
      <text class="text-body-md text-on-surface-variant block mt-1">当天气预报只说'雨夹雪'，</text> 
        <text class="text-body-md text-on-surface-variant block mt-1">我们告诉你'现在出发，还能赶上长安的瑞雪'。</text>
    </view>

    <!-- 降雪地图 -->
    <view class="px-4 mb-3">
      <view class="rounded-3xl overflow-hidden shadow-elevation-1">
        <map
          :latitude="centerLat"
          :longitude="centerLon"
          :markers="mapMarkers"
          :scale="mapScale"
          :enable-satellite="true"
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
      <!-- 降雪提醒横幅 -->
      <view class="px-4 mb-3">
        <!-- 有订阅且即将降雪 -->
      
        <!-- 未订阅任何城市 -->
        <view 
          class="rounded-3xl bg-surface-container px-4 py-3 flex items-center justify-between"
        >
          <view class="flex items-center flex-1 min-w-0">
            <Icon name="bell" size="20px" class="mr-3 text-on-surface-variant" />
            <view class="flex-1 min-w-0">
              <text class="text-title-sm text-on-surface block">开启降雪提醒</text>
              <text class="text-body-sm text-on-surface-variant block mt-1">订阅城市，未来降雪提前通知你</text>
            </view>
          </view>
          
        </view>
      </view>

      <!-- 城市列表 -->
      <view class="px-4 mb-4" style="padding-bottom: 180px;">
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
                <view class="flex items-center">
                  <WeatherIcon v-if="city.iconCode" :code="city.iconCode" fill size="24px" style="margin-right: 8px;" />
                  <text class="text-title-md text-on-surface">{{ city.cityName }}</text>
                </view>
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
                </view>
              </view>
              <!-- 天气描述 + 降雪预报 -->
              <view class="flex items-center mb-2">
                <text v-if="city.weatherText" class="text-body-sm text-on-surface-variant">{{ city.weatherText }}</text>
                <view v-if="city.snowForecast" class="ml-2 rounded-full bg-primary-container px-3 py-1 flex items-center" style="display: inline-flex;">
                  <Icon name="snowflake" size="10px" class="text-primary mr-1" />
                  <text class="text-label-sm text-on-primary-container">{{ formatSnowForecast(city.snowForecast) }}</text>
                </view>
              </view>
              <view class="flex items-center">
                <view v-if="getScenics(city.cityId).length > 0" class="flex flex-wrap" style="flex: 1;">
                  <text
                    v-for="spot in getScenics(city.cityId)"
                    :key="spot"
                    class="text-label-sm text-primary mr-2 mb-1 px-2 py-0-5 rounded-full bg-primary-container"
                  >{{ spot }}</text>
                </view>
                <view v-else style="flex: 1;"></view>
                <!-- 订阅铃铛 -->
                <view
                  class="flex items-center justify-center rounded-full"
                  style="width: 44px; height: 44px; flex-shrink: 0;"
                  hover-class="hover-opacity-60"
                  @click.stop="onToggleSubscribe(city)"
                >
                  <Icon
                    name="bell"
                    :type="isSubscribed(city.cityId) ? 'solid' : 'regular'"
                    size="22px"
                    :class="isSubscribed(city.cityId) ? 'text-primary' : 'text-on-surface-variant'"
                  />
                </view>
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
          :subscribed="isSubscribed(region.cityId)"
          @click="onCardClick"
          @subscribe="onToggleSubscribe"
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
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import type { SnowRegion, SnowLevel } from '@/models/types'
import { fetchSnowRegions, fetchSnowRegionsRemote, filterSnowingCities } from '@/services/snow-service'
import { getNavBarInfo } from '@/utils/navbar'
import { getScenics, loadCityList, getHotCities } from '@/models/scenics'
import type { CityInfo } from '@/models/scenics'
import Icon from '@/components/Icon.vue'
import WeatherIcon from '@/components/WeatherIcon.vue'
import SnowCard from '@/components/SnowCard.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'
import { snowLevelToFlakes } from '@/utils/snow'

const allRegions = ref<SnowRegion[]>([])
const loading = ref(false)
const hasError = ref(false)
const errorMessage = ref('获取降雪数据失败，请检查网络连接')
const cityImages = ref<Record<string, string>>({})
const userLat = ref(0)
const userLon = ref(0)

/** 当前日期+时间 MM/DD HH:MM */
const currentTime = ref('')
let timeTimer: ReturnType<typeof setInterval> | null = null

function updateCurrentTime() {
  const now = new Date()
  const M = String(now.getMonth() + 1).padStart(2, '0')
  const D = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  currentTime.value = `${M}/${D} ${h}:${m}`
}
updateCurrentTime()
timeTimer = setInterval(updateCurrentTime, 60000)

onUnmounted(() => {
  if (timeTimer) { clearInterval(timeTimer); timeTimer = null }
})

/** 用户已订阅的城市 ID 集合 */
const subscribedCityIds = ref<Set<string>>(new Set())
/** 用户订阅列表（含订阅状态和天气信息） */
interface SnowForecastInfo { daysFromNow: number; snowLevel: string; date: string }
interface FavItem { cityId: string; cityName: string; subscribed: boolean; snowForecast?: SnowForecastInfo | null; temperature?: string; weatherText?: string; iconCode?: string; snowStatus?: string; latitude?: number; longitude?: number }
const userFavorites = ref<FavItem[]>([])

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

/** 合并列表：收藏城市（含天气数据）排前面，热门城市排后面，去重 */
const hotCities = computed(() => {
  const merged = new Map<string, SnowRegion>()

  // 1. 先加收藏城市（用 getMyFavorites 返回的天气数据）
  for (const fav of userFavorites.value) {
    merged.set(fav.cityId, {
      cityId: fav.cityId,
      cityName: fav.cityName,
      province: '',
      latitude: fav.latitude || 0,
      longitude: fav.longitude || 0,
      temperature: Number(fav.temperature) || 0,
      humidity: 0,
      windSpeed: 0,
      windDirection: '',
      snowLevel: (fav.snowStatus || '无') as SnowLevel,
      visibility: 0,
      updatedAt: '',
      iconCode: fav.iconCode || '',
      weatherText: fav.weatherText || '',
      snowForecast: fav.snowForecast || null,
    })
  }

  // 2. 用 allRegions 的数据覆盖/补充（更完整）
  for (const r of allRegions.value) {
    if (merged.has(r.cityId)) {
      // 收藏城市用 allRegions 的完整数据覆盖，但保留 snowForecast
      const existing = merged.get(r.cityId)!
      merged.set(r.cityId, { ...r, snowForecast: r.snowForecast || existing.snowForecast })
    }
  }

  // 3. 加热门城市（不在收藏里的）
  for (const info of hotCityInfos.value) {
    if (merged.has(info.cityId)) continue
    const found = allRegions.value.find((r: SnowRegion) => r.cityId === info.cityId)
    if (found) {
      merged.set(info.cityId, found)
    } else {
      merged.set(info.cityId, {
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
      })
    }
  }

  const list = Array.from(merged.values())

  // 排序：当前有雪 > 未来有雪 > 无雪，同级按距离
  return list.sort((a, b) => {
    // 优先级：2=当前有雪，1=未来有雪（snowForecast），0=无雪
    const aPri = (SNOW_ORDER[a.snowLevel] || 0) > 0 ? 2 : (a.snowForecast ? 1 : 0)
    const bPri = (SNOW_ORDER[b.snowLevel] || 0) > 0 ? 2 : (b.snowForecast ? 1 : 0)
    if (aPri !== bPri) return bPri - aPri
    // 未来有雪的按天数从近到远
    if (aPri === 1 && bPri === 1) {
      const aDays = a.snowForecast!.daysFromNow
      const bDays = b.snowForecast!.daysFromNow
      if (aDays !== bDays) return aDays - bDays
    }
    // 同级按距离
    const aDist = calcDistance(userLat.value, userLon.value, a.latitude, a.longitude)
    const bDist = calcDistance(userLat.value, userLon.value, b.latitude, b.longitude)
    return aDist - bDist
  })
})

const snowingCities = computed(() => filterSnowingCities(allRegions.value))

/** 地图上需要标记的城市：当前有雪 + 未来有雪（snowForecast） */
const mapSnowCities = computed(() => {
  const map = new Map<string, SnowRegion>()
  // allRegions 中当前有雪或未来有雪的
  for (const r of allRegions.value) {
    if ((r.snowLevel !== '无' || r.snowForecast) && r.latitude && r.longitude) {
      map.set(r.cityId, r)
    }
  }
  // hotCities 中当前有雪或未来有雪的
  for (const c of hotCities.value) {
    if ((c.snowLevel !== '无' || c.snowForecast) && c.latitude && c.longitude && !map.has(c.cityId)) {
      map.set(c.cityId, c)
    }
  }
  return Array.from(map.values())
})

/**
 * 地图中心点：1条数据直接居中，多条取边界框中心
 */
const centerLat = computed((): number => {
  const cities = mapSnowCities.value
  if (cities.length === 0) return 35.86
  if (cities.length === 1) return cities[0].latitude
  const lats = cities.map((r) => r.latitude)
  return (Math.min(...lats) + Math.max(...lats)) / 2
})

const centerLon = computed((): number => {
  const cities = mapSnowCities.value
  if (cities.length === 0) return 104.20
  if (cities.length === 1) return cities[0].longitude
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

/** 雪花等级对应的 callout 标签 */
function getSnowMarkerLabel(region: SnowRegion): string {
  if (region.snowLevel !== '无') {
    // 当前正在下雪
    switch (region.snowLevel) {
      case '小雪': return '❄ 小雪'
      case '中雪': return '❄❄ 中雪'
      case '大雪': return '❄❄❄ 大雪'
      case '暴雪': return '❄❄❄❄ 暴雪'
      default: return '❄'
    }
  }
  // 未来有雪
  if (region.snowForecast) {
    const f = region.snowForecast
    const dayLabel = f.daysFromNow === 0 ? '今天' : f.daysFromNow === 1 ? '明天' : f.daysFromNow === 2 ? '后天' : `${f.daysFromNow}天后`
    return `❄ ${dayLabel}${f.snowLevel}`
  }
  return '❄'
}

const mapMarkers = computed(() => {
  return mapSnowCities.value.map((region: SnowRegion, index: number) => {
    const isCurrentSnow = region.snowLevel !== '无'
    return {
      id: index,
      latitude: region.latitude,
      longitude: region.longitude,
      title: region.cityName,
      iconPath: '/static/tabs/home-active.png',
      width: 28,
      height: 28,
      callout: {
        content: `${getSnowMarkerLabel(region)} ${region.cityName}`,
        display: 'ALWAYS',
        fontSize: 13,
        borderRadius: 20,
        padding: 8,
        bgColor: isCurrentSnow ? '#1565C0' : '#5C6BC0',
        color: '#FFFFFF',
      },
    }
  })
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

/** 是否已订阅某城市 */
function isSubscribed(cityId: string): boolean {
  return subscribedCityIds.value.has(cityId)
}

/** 是否有任何订阅 */
const hasAnySubscription = computed(() => subscribedCityIds.value.size > 0)

/** 已订阅城市中即将降雪的（用于横幅展示） */
const snowAlertCity = computed(() => {
  for (const fav of userFavorites.value) {
    if (!fav.subscribed) continue

    // 优先用15天预报数据
    if (fav.snowForecast) {
      const f = fav.snowForecast
      let desc: string
      if (f.daysFromNow === 0) desc = `今天有${f.snowLevel}`
      else if (f.daysFromNow === 1) desc = `明天有${f.snowLevel}`
      else if (f.daysFromNow === 2) desc = `后天有${f.snowLevel}`
      else desc = `未来${f.daysFromNow}天有${f.snowLevel}`
      return { cityId: fav.cityId, cityName: fav.cityName, snowLevel: f.snowLevel, desc }
    }

    // 回退：检查实时数据
    const region = hotCities.value.find((c) => c.cityId === fav.cityId)
    if (region && region.snowLevel !== '无') {
      return { cityId: region.cityId, cityName: fav.cityName, snowLevel: region.snowLevel, desc: `正在下${region.snowLevel}` }
    }
    const fromAll = allRegions.value.find((r) => r.cityId === fav.cityId && r.snowLevel !== '无')
    if (fromAll) {
      return { cityId: fromAll.cityId, cityName: fav.cityName, snowLevel: fromAll.snowLevel, desc: `正在下${fromAll.snowLevel}` }
    }
  }
  return null
})

/** 加载用户订阅状态 */
async function loadSubscriptions() {
  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({ name: 'getMyFavorites' })
    const result = res.result as { code?: number; data?: { favorites?: Array<{ cityId: string; cityName: string; subscribed?: boolean; snowForecast?: SnowForecastInfo | null; temperature?: string; weatherText?: string; iconCode?: string; snowStatus?: string; latitude?: number; longitude?: number }> } }
    const favs = result.data?.favorites ?? []
    userFavorites.value = favs.map((f) => ({ cityId: f.cityId, cityName: f.cityName, subscribed: !!f.subscribed, snowForecast: f.snowForecast || null, temperature: f.temperature || '', weatherText: f.weatherText || '', iconCode: f.iconCode || '', snowStatus: f.snowStatus || '', latitude: f.latitude || 0, longitude: f.longitude || 0 }))
    subscribedCityIds.value = new Set(favs.map((f) => f.cityId))
    // #endif
  } catch {}
}

/** 切换订阅状态 */
/** 微信订阅消息模板 ID — 在微信公众平台「订阅消息」中申请 */
const SNOW_ALERT_TMPL_ID = 'Qd_NN-RSHCa2reTPIC7MHo_PMwN0MLLK1Y4jfYlAths'

async function onToggleSubscribe(city: SnowRegion) {
  const currentlySubscribed = isSubscribed(city.cityId)
  const newState = !currentlySubscribed

  // 开启订阅时，先拉起微信订阅消息授权弹窗
  if (newState) {
    try {
      // #ifdef MP-WEIXIN
      const subRes = await wx.requestSubscribeMessage({
        tmplIds: [SNOW_ALERT_TMPL_ID],
      })
      // 用户拒绝了也继续添加收藏，只是收不到推送
      if (subRes[SNOW_ALERT_TMPL_ID] === 'accept') {
        console.log('用户同意接收降雪提醒')
      } else {
        console.log('用户拒绝或关闭了订阅消息授权')
      }
      // #endif
    } catch {
      // 弹窗异常，继续流程
    }
  }

  try {
    // 如果还没订阅，先添加
    const isFav = userFavorites.value.some((f) => f.cityId === city.cityId)
    if (!isFav) {
      // #ifdef MP-WEIXIN
      await wx.cloud.callFunction({
        name: 'manageFavorites',
        data: {
          action: 'add',
          cityId: city.cityId,
          cityName: city.cityName,
          latitude: city.latitude,
          longitude: city.longitude,
        },
      })
      // #endif
    }

    // 更新订阅状态
    // #ifdef MP-WEIXIN
    await wx.cloud.callFunction({
      name: 'manageFavorites',
      data: { action: 'subscribe', cityId: city.cityId, subscribed: newState },
    })
    // #endif

    // 更新本地状态
    if (newState) {
      subscribedCityIds.value.add(city.cityId)
    } else {
      subscribedCityIds.value.delete(city.cityId)
    }
    // 触发响应式更新
    subscribedCityIds.value = new Set(subscribedCityIds.value)

    // 更新 userFavorites
    const existing = userFavorites.value.find((f) => f.cityId === city.cityId)
    if (existing) {
      existing.subscribed = newState
    } else {
      userFavorites.value.push({ cityId: city.cityId, cityName: city.cityName, subscribed: newState })
    }

    uni.showToast({ title: newState ? '已开启降雪提醒' : '已关闭提醒', icon: 'success', duration: 1500 })
  } catch {
    uni.showToast({ title: '操作失败，请重试', icon: 'none', duration: 1500 })
  }
}

/** 横幅点击：跳转到即将降雪的城市详情 */
function onAlertBannerClick() {
  if (!snowAlertCity.value) return
  const city = hotCities.value.find((c) => c.cityId === snowAlertCity.value!.cityId)
    || allRegions.value.find((r) => r.cityId === snowAlertCity.value!.cityId)
  if (city) {
    let url = `/pages/detail/detail?cityId=${city.cityId}&cityName=${encodeURIComponent(city.cityName)}`
    if (city.latitude && city.longitude) {
      url += `&latitude=${city.latitude}&longitude=${city.longitude}`
    }
    uni.navigateTo({ url })
  }
}

/** 去订阅：跳转到订阅页 */
function onGoSubscribe() {
  uni.switchTab({ url: '/pages/favorites/favorites' })
}

/** 格式化降雪预报提示 */
function formatSnowForecast(forecast: SnowForecastInfo): string {
  if (forecast.daysFromNow === 0) return `今天${forecast.snowLevel}`
  if (forecast.daysFromNow === 1) return `明天${forecast.snowLevel}`
  if (forecast.daysFromNow === 2) return `后天${forecast.snowLevel}`
  return `${forecast.daysFromNow}天后${forecast.snowLevel}`
}

/** 收藏卡片点击 — 已合并到 hotCities，不再单独使用 */

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
  // 加载 hotCities 中不在 hotCityInfos 里的
  for (const city of hotCities.value) {
    if (!hotCityInfos.value.some((info) => info.cityId === city.cityId)) {
      await loadCityImage(city.cityId, city.cityName)
    }
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

onPullDownRefresh(async () => {
  console.log('[下拉刷新] 触发')
  try {
    // 并发刷新降雪数据和收藏列表
    const [regions] = await Promise.all([
      fetchSnowRegionsRemote(),
      loadSubscriptions(),
    ])
    allRegions.value = regions
    hasError.value = false
    console.log('[下拉刷新] 成功，城市数:', regions.length)
  } catch (err) {
    hasError.value = true
    errorMessage.value = '刷新失败，请稍后重试'
    console.error('[下拉刷新] 失败:', err)
  } finally {
    uni.stopPullDownRefresh()
  }
})

function onCardClick(region: SnowRegion) {
  let url = `/pages/detail/detail?cityId=${region.cityId}&cityName=${encodeURIComponent(region.cityName)}`
  if (region.latitude && region.longitude) {
    url += `&latitude=${region.latitude}&longitude=${region.longitude}`
  }
  uni.navigateTo({ url })
}

function onHotCityClick(city: SnowRegion) {
  let url = `/pages/detail/detail?cityId=${city.cityId}&cityName=${encodeURIComponent(city.cityName)}`
  if (city.latitude && city.longitude) {
    url += `&latitude=${city.latitude}&longitude=${city.longitude}`
  }
  uni.navigateTo({ url })
}

function onMarkerTap(e: { markerId?: number; detail?: { markerId?: number } }) {
  const markerId = e.markerId ?? e.detail?.markerId
  if (markerId !== undefined && markerId >= 0 && markerId < mapSnowCities.value.length) {
    const region = mapSnowCities.value[markerId]
    let url = `/pages/detail/detail?cityId=${region.cityId}&cityName=${encodeURIComponent(region.cityName)}`
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
  loadSubscriptions()
})
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 2s linear infinite; }
</style>
