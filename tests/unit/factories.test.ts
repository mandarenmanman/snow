import { describe, it, expect } from 'vitest'
import {
  createSnowRegion,
  createSnowForecast,
  createFavoriteCity,
  createCacheEntry,
} from '@/models/factories'
import { DEFAULT_CACHE_TTL } from '@/models/types'

describe('createSnowRegion', () => {
  it('should create with all fields provided', () => {
    const data = {
      cityId: 'BJ001',
      cityName: 'Beijing',
      province: 'Beijing',
      latitude: 39.9,
      longitude: 116.4,
      temperature: -5,
      humidity: 80,
      windSpeed: 12,
      windDirection: 'North',
      snowLevel: '\u4E2D\u96EA' as const,
      visibility: 2.5,
      updatedAt: '2024-01-15T10:00:00Z',
    }
    const result = createSnowRegion(data)
    expect(result).toEqual(data)
  })

  it('should fill missing fields with defaults', () => {
    const result = createSnowRegion({})
    expect(result.cityId).toBe('')
    expect(result.cityName).toBe('')
    expect(result.province).toBe('')
    expect(result.latitude).toBe(0)
    expect(result.longitude).toBe(0)
    expect(result.temperature).toBe(0)
    expect(result.humidity).toBe(0)
    expect(result.windSpeed).toBe(0)
    expect(result.windDirection).toBe('')
    expect(result.snowLevel).toBe('\u65E0')
    expect(result.visibility).toBe(0)
    expect(typeof result.updatedAt).toBe('string')
  })

  it('should clamp humidity to 0-100', () => {
    expect(createSnowRegion({ humidity: -10 }).humidity).toBe(0)
    expect(createSnowRegion({ humidity: 150 }).humidity).toBe(100)
    expect(createSnowRegion({ humidity: 50 }).humidity).toBe(50)
  })

  it('should clamp latitude and longitude', () => {
    expect(createSnowRegion({ latitude: 100 }).latitude).toBe(90)
    expect(createSnowRegion({ latitude: -100 }).latitude).toBe(-90)
    expect(createSnowRegion({ longitude: 200 }).longitude).toBe(180)
    expect(createSnowRegion({ longitude: -200 }).longitude).toBe(-180)
  })

  it('should ensure windSpeed and visibility non-negative', () => {
    expect(createSnowRegion({ windSpeed: -5 }).windSpeed).toBe(0)
    expect(createSnowRegion({ visibility: -3 }).visibility).toBe(0)
  })

  it('should default invalid snowLevel', () => {
    const result = createSnowRegion({ snowLevel: 'invalid' as any })
    expect(result.snowLevel).toBe('\u65E0')
  })

  it('should accept all valid snowLevel values', () => {
    const levels = ['\u5C0F\u96EA', '\u4E2D\u96EA', '\u5927\u96EA', '\u66B4\u96EA', '\u65E0'] as const
    for (const level of levels) {
      expect(createSnowRegion({ snowLevel: level }).snowLevel).toBe(level)
    }
  })

  it('should handle no arguments', () => {
    const result = createSnowRegion()
    expect(result.cityId).toBe('')
    expect(result.snowLevel).toBe('\u65E0')
  })
})

describe('createSnowForecast', () => {
  it('should create with all fields provided', () => {
    const data = {
      cityId: 'BJ001',
      date: '2024-01-16',
      snowLevel: 'heavy',
      snowPeriod: '08:00-14:00',
      accumulation: 15.5,
      tempHigh: -2,
      tempLow: -8,
    }
    const result = createSnowForecast(data)
    expect(result).toEqual(data)
  })

  it('should fill missing fields with defaults', () => {
    const result = createSnowForecast({})
    expect(result.cityId).toBe('')
    expect(result.date).toBe('')
    expect(result.snowLevel).toBe('\u65E0')
    expect(result.snowPeriod).toBe('')
    expect(result.accumulation).toBe(0)
    expect(result.tempHigh).toBe(0)
    expect(result.tempLow).toBe(0)
  })

  it('should ensure accumulation non-negative', () => {
    expect(createSnowForecast({ accumulation: -5 }).accumulation).toBe(0)
  })

  it('should allow negative temperatures', () => {
    const result = createSnowForecast({ tempHigh: -2, tempLow: -10 })
    expect(result.tempHigh).toBe(-2)
    expect(result.tempLow).toBe(-10)
  })

  it('should handle no arguments', () => {
    const result = createSnowForecast()
    expect(result.cityId).toBe('')
  })
})

describe('createFavoriteCity', () => {
  it('should create with all fields provided', () => {
    const data = {
      _id: 'fav_001',
      openId: 'user_abc123',
      cityId: 'BJ001',
      cityName: 'Beijing',
      createdAt: '2024-01-15T10:00:00Z',
    }
    const result = createFavoriteCity(data)
    expect(result).toEqual(data)
  })

  it('should fill missing fields with defaults', () => {
    const result = createFavoriteCity({})
    expect(result._id).toBe('')
    expect(result.openId).toBe('')
    expect(result.cityId).toBe('')
    expect(result.cityName).toBe('')
    expect(typeof result.createdAt).toBe('string')
  })

  it('should handle no arguments', () => {
    const result = createFavoriteCity()
    expect(result._id).toBe('')
  })
})

describe('createCacheEntry', () => {
  it('should create with data and default TTL', () => {
    const data = { key: 'value' }
    const result = createCacheEntry(data)
    expect(result.data).toEqual(data)
    expect(result.ttl).toBe(DEFAULT_CACHE_TTL)
    expect(typeof result.timestamp).toBe('number')
    expect(result.timestamp).toBeGreaterThan(0)
  })

  it('should create with custom TTL', () => {
    const data = [1, 2, 3]
    const result = createCacheEntry(data, 60000)
    expect(result.data).toEqual([1, 2, 3])
    expect(result.ttl).toBe(60000)
  })

  it('should ensure TTL non-negative', () => {
    const result = createCacheEntry('test', -1000)
    expect(result.ttl).toBe(0)
  })

  it('should handle null data', () => {
    const result = createCacheEntry(null)
    expect(result.data).toBeNull()
    expect(result.ttl).toBe(DEFAULT_CACHE_TTL)
  })

  it('should set timestamp close to current time', () => {
    const before = Date.now()
    const result = createCacheEntry('data')
    const after = Date.now()
    expect(result.timestamp).toBeGreaterThanOrEqual(before)
    expect(result.timestamp).toBeLessThanOrEqual(after)
  })
})