/**
 * 降雪数据服务层
 *
 * 提供降雪数据的获取、过滤、搜索和格式化功能。
 * - fetchSnowRegions: 通过云函数获取全国降雪城市列表（带缓存）
 * - filterSnowingCities: 从天气数据中过滤出正在下雪的城市
 * - formatSnowListItem: 格式化降雪列表项
 * - searchCities: 根据关键词过滤城市
 *
 * Requirements: 1.1, 1.2, 2.1, 2.3
 */

import type { City, CityDetail, SnowForecast, SnowRegion } from '@/models/types'
import { getCache, setCache } from '@/utils/cache'

/** 降雪数据缓存键 */
const SNOW_REGIONS_CACHE_KEY = 'snow_regions'

/** 城市详情缓存键前缀 */
const CITY_DETAIL_CACHE_PREFIX = 'city_detail_'

/** 降雪预报缓存键前缀 */
const FORECAST_CACHE_PREFIX = 'forecast_'

/**
 * 从天气数据中过滤出正在下雪的城市
 *
 * 返回所有 snowLevel 不为 "无" 的城市。
 *
 * @param weatherData - 天气数据数组
 * @returns 正在下雪的城市列表
 *
 * Requirements: 1.1
 */
export function filterSnowingCities(weatherData: SnowRegion[]): SnowRegion[] {
  return weatherData.filter((region) => region.snowLevel !== '无')
}

/**
 * 格式化降雪列表项
 *
 * 将 SnowRegion 数据格式化为可读的列表项字符串，
 * 包含城市名称、当前温度、降雪强度和更新时间。
 *
 * 格式: "城市名 | 温度°C | 降雪强度 | 更新时间"
 *
 * @param snowRegion - 降雪区域数据对象
 * @returns 格式化后的列表项字符串
 *
 * Requirements: 1.2
 */
export function formatSnowListItem(snowRegion: SnowRegion): string {
  const { cityName, temperature, snowLevel, updatedAt } = snowRegion

  // 格式化更新时间为可读格式
  const formattedTime = formatUpdatedTime(updatedAt)

  return `${cityName} | ${temperature}°C | ${snowLevel} | ${formattedTime}`
}

/**
 * 根据关键词搜索城市
 *
 * 在给定的城市列表中，过滤出城市名称包含关键词的城市。
 * 匹配不区分大小写。如果关键词为空字符串，返回空数组。
 *
 * @param keyword - 搜索关键词
 * @param cityList - 城市列表
 * @returns 匹配的城市列表
 *
 * Requirements: 2.1, 2.3
 */
export function searchCities(keyword: string, cityList: City[]): City[] {
  if (keyword === '') {
    return []
  }

  const lowerKeyword = keyword.toLowerCase()
  return cityList.filter((city) =>
    city.cityName.toLowerCase().includes(lowerKeyword),
  )
}


/**
 * 将 ISO 8601 时间戳格式化为可读的本地时间字符串
 *
 * @param isoString - ISO 8601 时间戳
 * @returns 格式化后的时间字符串，如 "2024-01-15 18:00"
 */
function formatUpdatedTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      return isoString
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return isoString
  }
}

/**
 * 直接从云函数获取降雪数据（跳过缓存读取，用于强制刷新）
 */
export async function fetchSnowRegionsRemote(): Promise<SnowRegion[]> {
  // #ifdef MP-WEIXIN
  const res = await wx.cloud.callFunction({
    name: 'getSnowData',
    data: { action: 'list' },
  })

  const result = res.result as { code?: number; data?: { snowRegions?: SnowRegion[] } }
  const snowRegions: SnowRegion[] = (result.code === 0 && result.data?.snowRegions) ? result.data.snowRegions : []

  // 写入缓存
  setCache(SNOW_REGIONS_CACHE_KEY, snowRegions)

  return snowRegions
  // #endif

  // #ifndef MP-WEIXIN
  return []
  // #endif
}

/**
 * 通过云函数获取全国降雪城市列表（带缓存）
 *
 * 优先从本地缓存读取数据，缓存过期时调用 wx.cloud.callFunction
 * 获取最新数据并更新缓存。
 *
 * @returns 降雪区域数据数组
 *
 * Requirements: 1.1, 6.1
 */
export async function fetchSnowRegions(): Promise<SnowRegion[]> {
  // 优先从缓存读取
  const cached = getCache<SnowRegion[]>(SNOW_REGIONS_CACHE_KEY)
  if (cached !== null) {
    return cached
  }

  return fetchSnowRegionsRemote()
}


/**
 * 格式化城市详情信息
 *
 * 将 CityDetail 数据格式化为可读的多行字符串，
 * 包含降雪状态、温度、湿度、风力风向和未来降雪预报摘要。
 *
 * @param detailData - 城市详情数据对象
 * @returns 格式化后的多行字符串
 *
 * Requirements: 2.2
 */
export function formatCityDetail(detailData: CityDetail): string {
  const { current, forecast } = detailData

  const lines: string[] = [
    `降雪状态: ${current.snowLevel}`,
    `温度: ${current.temperature}°C`,
    `湿度: ${current.humidity}%`,
    `风力: ${current.windSpeed}km/h ${current.windDirection}`,
  ]

  // 添加预报摘要
  if (forecast.length > 0) {
    lines.push('--- 未来降雪预报 ---')
    for (const f of forecast) {
      lines.push(
        `${f.date} | ${f.snowLevel} | ${f.snowPeriod} | 累计${f.accumulation}mm`,
      )
    }
  }

  return lines.join('\n')
}

/**
 * 通过云函数获取城市详情数据（带缓存）
 *
 * 优先从本地缓存读取数据，缓存过期时调用 wx.cloud.callFunction
 * 获取最新数据并更新缓存。
 *
 * @param cityId - 城市唯一标识
 * @returns 城市详情数据
 *
 * Requirements: 2.2, 6.1
 */
export async function fetchCityDetail(cityId: string): Promise<CityDetail> {
  const cacheKey = `${CITY_DETAIL_CACHE_PREFIX}${cityId}`

  // 优先从缓存读取
  const cached = getCache<CityDetail>(cacheKey)
  if (cached !== null) {
    return cached
  }

  // 缓存过期或不存在，调用云函数获取最新数据
  // #ifdef MP-WEIXIN
  const res = await wx.cloud.callFunction({
    name: 'getSnowData',
    data: { action: 'detail', cityId },
  })

  const result = res.result as { code?: number; data?: CityDetail }
  const detail: CityDetail = (result.code === 0 && result.data)
    ? result.data
    : { cityId, cityName: '', current: { temperature: 0, humidity: 0, windSpeed: 0, windDirection: '', snowLevel: '无', visibility: 0 }, forecast: [], updatedAt: new Date().toISOString() }

  // 写入缓存
  setCache(cacheKey, detail)

  return detail
  // #endif

  // #ifndef MP-WEIXIN
  return {
    cityId,
    cityName: '',
    current: {
      temperature: 0,
      humidity: 0,
      windSpeed: 0,
      windDirection: '',
      snowLevel: '无',
      visibility: 0,
    },
    forecast: [],
    updatedAt: new Date().toISOString(),
  }
  // #endif
}


/**
 * 通过云函数获取城市未来 3 天降雪预报（带缓存）
 *
 * 优先从本地缓存读取数据，缓存过期时调用 wx.cloud.callFunction
 * 获取最新数据并更新缓存。
 *
 * @param cityId - 城市唯一标识
 * @returns 未来 3 天的降雪预报数据数组
 *
 * Requirements: 4.1, 4.2
 */
export async function fetchForecast(cityId: string): Promise<SnowForecast[]> {
  const cacheKey = `${FORECAST_CACHE_PREFIX}${cityId}`

  // 优先从缓存读取
  const cached = getCache<SnowForecast[]>(cacheKey)
  if (cached !== null) {
    return cached
  }

  // 缓存过期或不存在，调用云函数获取最新数据
  // #ifdef MP-WEIXIN
  const res = await wx.cloud.callFunction({
    name: 'getSnowData',
    data: { action: 'detail', cityId },
  })

  const result = res.result as { code?: number; data?: { forecast?: SnowForecast[] } }
  const forecast: SnowForecast[] = (result.code === 0 && result.data?.forecast) ? result.data.forecast : []

  // 写入缓存
  setCache(cacheKey, forecast)

  return forecast
  // #endif

  // #ifndef MP-WEIXIN
  return []
  // #endif
}

/**
 * 格式化降雪预报信息
 *
 * 将 SnowForecast 数组格式化为可读的多行字符串，
 * 每行包含日期、降雪强度、降雪时段和累计降雪量。
 *
 * 格式:
 *   日期: YYYY-MM-DD | 强度: 中雪 | 时段: 08:00-14:00 | 累计: 5mm
 *
 * 如果预报数据为空，返回 "暂无预报数据"。
 *
 * @param forecastData - 降雪预报数据数组
 * @returns 格式化后的多行字符串
 *
 * Requirements: 4.1, 4.2
 */
export function formatForecast(forecastData: SnowForecast[]): string {
  if (forecastData.length === 0) {
    return '暂无预报数据'
  }

  return forecastData
    .map(
      (f) =>
        `日期: ${f.date} | 强度: ${f.snowLevel} | 时段: ${f.snowPeriod} | 累计: ${f.accumulation}mm`,
    )
    .join('\n')
}
