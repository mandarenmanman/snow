/**
 * 工厂函数 — 创建数据模型实例并进行字段验证
 * 缺失字段使用默认值填充
 */

import type {
  SnowRegion,
  SnowForecast,
  FavoriteCity,
  CacheEntry,
  SnowLevel,
} from './types'
import { DEFAULT_CACHE_TTL } from './types'

/** 有效的降雪等级 */
const VALID_SNOW_LEVELS: SnowLevel[] = ['小雪', '中雪', '大雪', '暴雪', '无']

/**
 * 将值限制在 [min, max] 范围内
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 安全地将输入转换为数字，无效时返回默认值
 */
function toNumber(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

/**
 * 安全地将输入转换为字符串，无效时返回默认值
 */
function toString(value: unknown, defaultValue: string): string {
  if (typeof value === 'string') {
    return value
  }
  if (value == null) {
    return defaultValue
  }
  return String(value)
}

/**
 * 创建 SnowRegion 数据对象
 * 对缺失字段使用默认值填充，对数值字段进行范围校验
 */
export function createSnowRegion(data: Partial<SnowRegion> & Record<string, unknown> = {}): SnowRegion {
  const snowLevel = VALID_SNOW_LEVELS.includes(data.snowLevel as SnowLevel)
    ? (data.snowLevel as SnowLevel)
    : '无'

  return {
    cityId: toString(data.cityId, ''),
    cityName: toString(data.cityName, ''),
    province: toString(data.province, ''),
    latitude: clamp(toNumber(data.latitude, 0), -90, 90),
    longitude: clamp(toNumber(data.longitude, 0), -180, 180),
    temperature: toNumber(data.temperature, 0),
    humidity: clamp(toNumber(data.humidity, 0), 0, 100),
    windSpeed: Math.max(toNumber(data.windSpeed, 0), 0),
    windDirection: toString(data.windDirection, ''),
    snowLevel,
    visibility: Math.max(toNumber(data.visibility, 0), 0),
    updatedAt: toString(data.updatedAt, new Date().toISOString()),
  }
}

/**
 * 创建 SnowForecast 数据对象
 * 对缺失字段使用默认值填充
 */
export function createSnowForecast(data: Partial<SnowForecast> & Record<string, unknown> = {}): SnowForecast {
  return {
    cityId: toString(data.cityId, ''),
    date: toString(data.date, ''),
    snowLevel: toString(data.snowLevel, '无'),
    snowPeriod: toString(data.snowPeriod, ''),
    accumulation: Math.max(toNumber(data.accumulation, 0), 0),
    tempHigh: toNumber(data.tempHigh, 0),
    tempLow: toNumber(data.tempLow, 0),
  }
}

/**
 * 创建 FavoriteCity 数据对象
 * 对缺失字段使用默认值填充
 */
export function createFavoriteCity(data: Partial<FavoriteCity> & Record<string, unknown> = {}): FavoriteCity {
  return {
    _id: toString(data._id, ''),
    openId: toString(data.openId, ''),
    cityId: toString(data.cityId, ''),
    cityName: toString(data.cityName, ''),
    createdAt: toString(data.createdAt, new Date().toISOString()),
  }
}

/**
 * 创建 CacheEntry 数据对象
 * @param data 要缓存的数据
 * @param ttl 缓存有效期（毫秒），默认 30 分钟
 */
export function createCacheEntry<T>(data: T, ttl: number = DEFAULT_CACHE_TTL): CacheEntry<T> {
  const validTtl = Math.max(toNumber(ttl, DEFAULT_CACHE_TTL), 0)

  return {
    data,
    timestamp: Date.now(),
    ttl: validTtl,
  }
}
