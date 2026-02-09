/**
 * 数据模型类型定义
 * 西门催雪 — 下雪查找小程序
 */

/** 降雪强度等级 */
export type SnowLevel = '小雪' | '中雪' | '大雪' | '暴雪' | '无'

/**
 * 降雪区域数据对象
 */
export interface SnowRegion {
  cityId: string        // 城市唯一标识
  cityName: string      // 城市名称
  province: string      // 所属省份
  latitude: number      // 纬度
  longitude: number     // 经度
  temperature: number   // 当前温度（摄氏度）
  humidity: number      // 湿度百分比 (0-100)
  windSpeed: number     // 风速（km/h）
  windDirection: string // 风向
  snowLevel: SnowLevel  // 降雪强度
  visibility: number    // 能见度（公里）
  updatedAt: string     // ISO 8601 时间戳
}

/**
 * 降雪预报数据对象
 */
export interface SnowForecast {
  cityId: string        // 城市唯一标识
  date: string          // 预报日期 YYYY-MM-DD
  snowLevel: string     // 预计降雪强度
  snowPeriod: string    // 预计降雪时段，如 "08:00-14:00"
  accumulation: number  // 预计累计降雪量（毫米）
  tempHigh: number      // 最高温度
  tempLow: number       // 最低温度
}

/**
 * 收藏城市记录（云数据库）
 */
export interface FavoriteCity {
  _id: string           // 记录 ID（云数据库自动生成）
  openId: string        // 用户 OpenID
  cityId: string        // 城市 ID
  cityName: string      // 城市名称
  createdAt: string     // 收藏时间 ISO 8601
}

/**
 * 本地缓存条目
 */
export interface CacheEntry<T> {
  data: T               // 缓存的数据
  timestamp: number     // 缓存时间戳（毫秒）
  ttl: number           // 缓存有效期（默认 30 分钟，毫秒）
}

/**
 * 城市基本信息（搜索结果用）
 */
export interface City {
  cityId: string        // 城市唯一标识
  cityName: string      // 城市名称
  province: string      // 所属省份
}

/**
 * 城市详情数据（详情页用）
 */
export interface CityDetail {
  cityId: string
  cityName: string
  current: {
    temperature: number
    humidity: number
    windSpeed: number
    windDirection: string
    snowLevel: string
    visibility: number
  }
  forecast: SnowForecast[]
  updatedAt: string
}

/**
 * 地理位置坐标
 */
export interface Location {
  latitude: number
  longitude: number
}

/**
 * 附近降雪查询结果
 */
export interface NearbySnowResult {
  cityId: string
  cityName: string
  distance: number      // 距离（公里）
  snowLevel: string
  temperature: number
}

/** 默认缓存有效期：30 分钟（毫秒） */
export const DEFAULT_CACHE_TTL = 30 * 60 * 1000
