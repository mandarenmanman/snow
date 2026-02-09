/**
 * 边界情况与错误处理单元测试
 *
 * 测试服务层函数在边界条件和错误场景下的行为。
 * 仅覆盖现有测试文件中未涉及的边界情况。
 *
 * Validates: Requirements 2.3, 2.4, 3.3, 4.3, 6.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSnowRegion, createSnowForecast } from '@/models/factories'
import { searchCities, formatForecast } from '@/services/snow-service'
import { findNearestSnow, filterNearbySnow } from '@/services/geo-service'
import type { City, Location, SnowRegion } from '@/models/types'
import type { StorageAdapter } from '@/utils/cache'
import {
  setCache,
  getCache,
  isCacheValid,
  forceRefresh,
  setStorageAdapter,
} from '@/utils/cache'

// ============================================================
// Helper: 创建内存存储适配器（用于测试）
// ============================================================
function createMockStorage(): StorageAdapter & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>()
  return {
    store,
    getItem(key: string): unknown {
      return store.get(key) ?? null
    },
    setItem(key: string, value: unknown): void {
      store.set(key, value)
    },
  }
}

// ============================================================
// 需求 2.3: 搜索无结果 — 边界输入
// ============================================================
describe('searchCities — 边界输入 (Req 2.3)', () => {
  const cityList: City[] = [
    { cityId: '1', cityName: '哈尔滨', province: '黑龙江' },
    { cityId: '2', cityName: '北京', province: '北京' },
    { cityId: '3', cityName: '长春', province: '吉林' },
  ]

  it('should return empty array for whitespace-only keyword', () => {
    const result = searchCities('   ', cityList)
    expect(result).toHaveLength(0)
  })

  it('should return empty array for tab/newline keyword', () => {
    const resultTab = searchCities('\t', cityList)
    expect(resultTab).toHaveLength(0)

    const resultNewline = searchCities('\n', cityList)
    expect(resultNewline).toHaveLength(0)
  })

  it('should return empty array for special characters that match nothing', () => {
    const result = searchCities('!@#$%', cityList)
    expect(result).toHaveLength(0)
  })

  it('should return empty array for numeric keyword that matches nothing', () => {
    const result = searchCities('12345', cityList)
    expect(result).toHaveLength(0)
  })

  it('should return empty array for very long keyword that matches nothing', () => {
    const longKeyword = '这是一个非常长的搜索关键词用来测试边界情况'
    const result = searchCities(longKeyword, cityList)
    expect(result).toHaveLength(0)
  })
})

// ============================================================
// 需求 2.4: 搜索超时/错误处理 — fetchSnowRegions 错误降级
// ============================================================
describe('缓存未命中时的错误传播 (Req 2.4)', () => {
  let mockStorage: ReturnType<typeof createMockStorage>

  beforeEach(() => {
    mockStorage = createMockStorage()
    setStorageAdapter(mockStorage)
  })

  it('should propagate error when forceRefresh fetchFn throws (simulating timeout)', async () => {
    const timeoutError = new Error('请求超时')
    const fetchFn = vi.fn().mockRejectedValue(timeoutError)

    await expect(forceRefresh('snow_data', fetchFn)).rejects.toThrow('请求超时')
  })

  it('should propagate network error from forceRefresh', async () => {
    const networkError = new Error('网络连接失败')
    const fetchFn = vi.fn().mockRejectedValue(networkError)

    await expect(forceRefresh('snow_data', fetchFn)).rejects.toThrow('网络连接失败')
  })

  it('should return null from getCache when cache is completely empty', () => {
    // No data has been set — simulates first launch with no cache
    const result = getCache<unknown>('snow_regions')
    expect(result).toBeNull()
  })
})

// ============================================================
// 需求 3.3: 附近无降雪推荐 — 所有城市 snowLevel 为 "无"
// ============================================================
describe('附近无降雪推荐逻辑 (Req 3.3)', () => {
  const userLocation: Location = { latitude: 39.9, longitude: 116.4 } // 北京

  it('findNearestSnow should return null when ALL cities have snowLevel "无"', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({ cityId: '1', cityName: '城市A', latitude: 39.91, longitude: 116.41, snowLevel: '无' }),
      createSnowRegion({ cityId: '2', cityName: '城市B', latitude: 40.0, longitude: 117.0, snowLevel: '无' }),
      createSnowRegion({ cityId: '3', cityName: '城市C', latitude: 45.75, longitude: 126.65, snowLevel: '无' }),
    ]

    const result = findNearestSnow(userLocation, regions)
    expect(result).toBeNull()
  })

  it('filterNearbySnow should return empty when ALL cities have snowLevel "无"', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({ cityId: '1', cityName: '城市A', latitude: 39.91, longitude: 116.41, snowLevel: '无' }),
      createSnowRegion({ cityId: '2', cityName: '城市B', latitude: 40.0, longitude: 117.0, snowLevel: '无' }),
    ]

    const result = filterNearbySnow(userLocation, regions, 500)
    expect(result).toHaveLength(0)
  })

  it('findNearestSnow should find distant snowing city when nearby cities are all "无"', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({ cityId: '1', cityName: '近处不下雪A', latitude: 39.91, longitude: 116.41, snowLevel: '无' }),
      createSnowRegion({ cityId: '2', cityName: '近处不下雪B', latitude: 40.0, longitude: 116.5, snowLevel: '无' }),
      createSnowRegion({ cityId: '3', cityName: '远处下雪', latitude: 45.75, longitude: 126.65, snowLevel: '大雪' }),
    ]

    const result = findNearestSnow(userLocation, regions)
    expect(result).not.toBeNull()
    expect(result!.cityName).toBe('远处下雪')
    expect(result!.snowLevel).toBe('大雪')
  })

  it('filterNearbySnow returns empty but findNearestSnow finds distant city (recommendation scenario)', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({ cityId: '1', cityName: '近处不下雪', latitude: 39.91, longitude: 116.41, snowLevel: '无' }),
      createSnowRegion({ cityId: '2', cityName: '远处下雪', latitude: 45.75, longitude: 126.65, snowLevel: '暴雪' }),
    ]

    // 附近 100km 内无降雪
    const nearbyResult = filterNearbySnow(userLocation, regions, 100)
    expect(nearbyResult).toHaveLength(0)

    // 但可以推荐最近的降雪城市
    const nearest = findNearestSnow(userLocation, regions)
    expect(nearest).not.toBeNull()
    expect(nearest!.cityName).toBe('远处下雪')
  })
})

// ============================================================
// 需求 4.3: 预报数据不可用 — 缺失字段的预报数据
// ============================================================
describe('预报数据不可用与缺失字段 (Req 4.3)', () => {
  it('formatForecast should return "暂无预报数据" for empty array', () => {
    const result = formatForecast([])
    expect(result).toBe('暂无预报数据')
  })

  it('formatForecast should handle forecast with empty string fields gracefully', () => {
    const forecast = [
      createSnowForecast({
        cityId: '1',
        date: '',
        snowLevel: '',
        snowPeriod: '',
        accumulation: 0,
        tempHigh: 0,
        tempLow: 0,
      }),
    ]

    const result = formatForecast(forecast)
    // Should still produce output without crashing
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toContain('日期:')
    expect(result).toContain('0mm')
  })

  it('formatForecast should handle forecast created with default factory values', () => {
    // createSnowForecast with no overrides — all defaults
    const forecast = [createSnowForecast()]

    const result = formatForecast(forecast)
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    // Default snowLevel from factory is "无"
    expect(result).toContain('强度: 无')
    expect(result).toContain('累计: 0mm')
  })

  it('formatForecast should handle single-day forecast (less than 3 days)', () => {
    const forecast = [
      createSnowForecast({
        date: '2024-01-16',
        snowLevel: '小雪',
        snowPeriod: '08:00-12:00',
        accumulation: 1,
      }),
    ]

    const result = formatForecast(forecast)
    const lines = result.split('\n')
    expect(lines).toHaveLength(1)
    expect(result).toContain('2024-01-16')
  })
})

// ============================================================
// 需求 6.4: 无缓存且无网络 — 错误提示场景
// ============================================================
describe('无缓存且无网络错误场景 (Req 6.4)', () => {
  let mockStorage: ReturnType<typeof createMockStorage>

  beforeEach(() => {
    mockStorage = createMockStorage()
    setStorageAdapter(mockStorage)
  })

  it('getCache returns null when storage is empty (no cached data)', () => {
    expect(getCache('snow_regions')).toBeNull()
    expect(getCache('city_detail_BJ001')).toBeNull()
    expect(getCache('forecast_BJ001')).toBeNull()
  })

  it('isCacheValid returns false when storage is empty', () => {
    expect(isCacheValid('snow_regions')).toBe(false)
  })

  it('forceRefresh should not leave stale cache when fetch fails', async () => {
    // Pre-populate cache
    setCache('snow_data', [{ cityName: '旧数据' }])
    expect(getCache('snow_data')).toEqual([{ cityName: '旧数据' }])

    // Simulate network failure
    const fetchFn = vi.fn().mockRejectedValue(new Error('无法获取降雪数据，请检查网络连接'))

    try {
      await forceRefresh('snow_data', fetchFn)
    } catch {
      // expected
    }

    // Original cache should still be intact (not corrupted)
    expect(getCache('snow_data')).toEqual([{ cityName: '旧数据' }])
  })

  it('getCache returns null for all keys when storage is completely empty (first launch + no network)', () => {
    // Simulate first launch: no cache exists at all
    const keys = ['snow_regions', 'city_detail_1', 'forecast_1', 'favorites']
    for (const key of keys) {
      expect(getCache(key)).toBeNull()
    }
  })

  it('forceRefresh with empty cache and network error should throw', async () => {
    // No pre-existing cache
    expect(getCache('snow_data')).toBeNull()

    const fetchFn = vi.fn().mockRejectedValue(new Error('无法获取降雪数据，请检查网络连接'))

    await expect(forceRefresh('snow_data', fetchFn)).rejects.toThrow('无法获取降雪数据，请检查网络连接')

    // Cache should still be empty
    expect(getCache('snow_data')).toBeNull()
  })
})
