import { describe, it, expect } from 'vitest'
import { createSnowRegion } from '@/models/factories'
import {
  filterSnowingCities,
  formatSnowListItem,
  searchCities,
  formatCityDetail,
} from '@/services/snow-service'
import type { City, SnowLevel } from '@/models/types'

describe('filterSnowingCities', () => {
  it('should return only cities that are snowing (snowLevel !== "无")', () => {
    const data = [
      createSnowRegion({ cityName: '哈尔滨', snowLevel: '大雪' }),
      createSnowRegion({ cityName: '北京', snowLevel: '无' }),
      createSnowRegion({ cityName: '长春', snowLevel: '小雪' }),
    ]

    const result = filterSnowingCities(data)

    expect(result).toHaveLength(2)
    expect(result[0].cityName).toBe('哈尔滨')
    expect(result[1].cityName).toBe('长春')
  })

  it('should return empty array when no cities are snowing', () => {
    const data = [
      createSnowRegion({ cityName: '上海', snowLevel: '无' }),
      createSnowRegion({ cityName: '广州', snowLevel: '无' }),
    ]

    const result = filterSnowingCities(data)
    expect(result).toHaveLength(0)
  })

  it('should return all cities when all are snowing', () => {
    const data = [
      createSnowRegion({ cityName: '哈尔滨', snowLevel: '暴雪' }),
      createSnowRegion({ cityName: '长春', snowLevel: '中雪' }),
      createSnowRegion({ cityName: '沈阳', snowLevel: '小雪' }),
    ]

    const result = filterSnowingCities(data)
    expect(result).toHaveLength(3)
  })

  it('should return empty array for empty input', () => {
    const result = filterSnowingCities([])
    expect(result).toHaveLength(0)
  })

  it('should include all valid snow levels except "无"', () => {
    const snowLevels: SnowLevel[] = ['小雪', '中雪', '大雪', '暴雪']
    const data = snowLevels.map((level) =>
      createSnowRegion({ cityName: `city_${level}`, snowLevel: level }),
    )

    const result = filterSnowingCities(data)
    expect(result).toHaveLength(4)
    expect(result.map((r) => r.snowLevel)).toEqual(snowLevels)
  })

  it('should not mutate the original array', () => {
    const data = [
      createSnowRegion({ cityName: '北京', snowLevel: '无' }),
      createSnowRegion({ cityName: '哈尔滨', snowLevel: '大雪' }),
    ]
    const originalLength = data.length

    filterSnowingCities(data)

    expect(data).toHaveLength(originalLength)
  })
})

describe('formatSnowListItem', () => {
  it('should format a snow region with all fields', () => {
    const region = createSnowRegion({
      cityName: '哈尔滨',
      temperature: -15,
      snowLevel: '大雪',
      updatedAt: '2024-01-15T10:30:00Z',
    })

    const result = formatSnowListItem(region)

    expect(result).toContain('哈尔滨')
    expect(result).toContain('-15°C')
    expect(result).toContain('大雪')
    // The time will be formatted to local time, so just check it contains a time-like pattern
    expect(result).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)
  })

  it('should use pipe separator between fields', () => {
    const region = createSnowRegion({
      cityName: '长春',
      temperature: -8,
      snowLevel: '小雪',
      updatedAt: '2024-01-15T08:00:00Z',
    })

    const result = formatSnowListItem(region)
    const parts = result.split(' | ')

    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('长春')
    expect(parts[1]).toBe('-8°C')
    expect(parts[2]).toBe('小雪')
  })

  it('should handle zero temperature', () => {
    const region = createSnowRegion({
      cityName: '北京',
      temperature: 0,
      snowLevel: '中雪',
      updatedAt: '2024-01-15T12:00:00Z',
    })

    const result = formatSnowListItem(region)
    expect(result).toContain('0°C')
  })

  it('should handle positive temperature', () => {
    const region = createSnowRegion({
      cityName: '成都',
      temperature: 2,
      snowLevel: '小雪',
      updatedAt: '2024-01-15T14:00:00Z',
    })

    const result = formatSnowListItem(region)
    expect(result).toContain('2°C')
  })

  it('should handle snowLevel "无"', () => {
    const region = createSnowRegion({
      cityName: '上海',
      temperature: 5,
      snowLevel: '无',
      updatedAt: '2024-01-15T16:00:00Z',
    })

    const result = formatSnowListItem(region)
    expect(result).toContain('无')
  })

  it('should handle invalid ISO date gracefully', () => {
    const region = createSnowRegion({
      cityName: '测试',
      temperature: -3,
      snowLevel: '小雪',
      updatedAt: 'not-a-date',
    })

    const result = formatSnowListItem(region)
    // Should still produce output with the raw string as fallback
    expect(result).toContain('测试')
    expect(result).toContain('-3°C')
    expect(result).toContain('小雪')
    expect(result).toContain('not-a-date')
  })

  it('should include all four required fields: cityName, temperature, snowLevel, updatedAt', () => {
    const region = createSnowRegion({
      cityName: '沈阳',
      temperature: -10,
      snowLevel: '暴雪',
      updatedAt: '2024-12-25T00:00:00Z',
    })

    const result = formatSnowListItem(region)

    // Verify all four fields are present
    expect(result).toContain('沈阳')
    expect(result).toContain('-10°C')
    expect(result).toContain('暴雪')
    // Time should be formatted
    expect(result).toMatch(/2024-12-25/)
  })
})


describe('searchCities', () => {
  const cityList: City[] = [
    { cityId: '1', cityName: '哈尔滨', province: '黑龙江' },
    { cityId: '2', cityName: '北京', province: '北京' },
    { cityId: '3', cityName: '长春', province: '吉林' },
    { cityId: '4', cityName: '上海', province: '上海' },
    { cityId: '5', cityName: '哈密', province: '新疆' },
  ]

  it('should return cities whose name contains the keyword', () => {
    const result = searchCities('哈', cityList)

    expect(result).toHaveLength(2)
    expect(result.map((c) => c.cityName)).toEqual(['哈尔滨', '哈密'])
  })

  it('should return empty array when keyword is empty string', () => {
    const result = searchCities('', cityList)
    expect(result).toHaveLength(0)
  })

  it('should return empty array when no cities match', () => {
    const result = searchCities('广州', cityList)
    expect(result).toHaveLength(0)
  })

  it('should be case-insensitive for Latin characters', () => {
    const cities: City[] = [
      { cityId: '1', cityName: 'Beijing', province: '北京' },
      { cityId: '2', cityName: 'Shanghai', province: '上海' },
    ]

    const result = searchCities('beijing', cities)
    expect(result).toHaveLength(1)
    expect(result[0].cityName).toBe('Beijing')
  })

  it('should match partial city names', () => {
    const result = searchCities('尔', cityList)

    expect(result).toHaveLength(1)
    expect(result[0].cityName).toBe('哈尔滨')
  })

  it('should return all cities when keyword matches all', () => {
    const cities: City[] = [
      { cityId: '1', cityName: '北京市', province: '北京' },
      { cityId: '2', cityName: '北京西', province: '北京' },
    ]

    const result = searchCities('北京', cities)
    expect(result).toHaveLength(2)
  })

  it('should handle empty city list', () => {
    const result = searchCities('北京', [])
    expect(result).toHaveLength(0)
  })

  it('should not mutate the original city list', () => {
    const cities: City[] = [
      { cityId: '1', cityName: '北京', province: '北京' },
      { cityId: '2', cityName: '上海', province: '上海' },
    ]
    const originalLength = cities.length

    searchCities('北京', cities)

    expect(cities).toHaveLength(originalLength)
  })

  it('should return exact match when keyword equals city name', () => {
    const result = searchCities('北京', cityList)

    expect(result).toHaveLength(1)
    expect(result[0].cityId).toBe('2')
    expect(result[0].cityName).toBe('北京')
  })
})


describe('formatCityDetail', () => {
  it('should include snowLevel in the output', () => {
    const detail = {
      cityId: '1',
      cityName: '哈尔滨',
      current: {
        temperature: -15,
        humidity: 80,
        windSpeed: 12,
        windDirection: '北风',
        snowLevel: '大雪',
        visibility: 2,
      },
      forecast: [],
      updatedAt: '2024-01-15T10:00:00Z',
    }

    const result = formatCityDetail(detail)
    expect(result).toContain('大雪')
  })

  it('should include temperature in the output', () => {
    const detail = {
      cityId: '1',
      cityName: '哈尔滨',
      current: {
        temperature: -15,
        humidity: 80,
        windSpeed: 12,
        windDirection: '北风',
        snowLevel: '大雪',
        visibility: 2,
      },
      forecast: [],
      updatedAt: '2024-01-15T10:00:00Z',
    }

    const result = formatCityDetail(detail)
    expect(result).toContain('-15°C')
  })

  it('should include humidity in the output', () => {
    const detail = {
      cityId: '1',
      cityName: '哈尔滨',
      current: {
        temperature: -15,
        humidity: 80,
        windSpeed: 12,
        windDirection: '北风',
        snowLevel: '大雪',
        visibility: 2,
      },
      forecast: [],
      updatedAt: '2024-01-15T10:00:00Z',
    }

    const result = formatCityDetail(detail)
    expect(result).toContain('80%')
  })

  it('should include windSpeed and windDirection in the output', () => {
    const detail = {
      cityId: '1',
      cityName: '哈尔滨',
      current: {
        temperature: -15,
        humidity: 80,
        windSpeed: 12,
        windDirection: '北风',
        snowLevel: '大雪',
        visibility: 2,
      },
      forecast: [],
      updatedAt: '2024-01-15T10:00:00Z',
    }

    const result = formatCityDetail(detail)
    expect(result).toContain('12km/h')
    expect(result).toContain('北风')
  })

  it('should include forecast summary when forecast data is present', () => {
    const detail = {
      cityId: '1',
      cityName: '哈尔滨',
      current: {
        temperature: -15,
        humidity: 80,
        windSpeed: 12,
        windDirection: '北风',
        snowLevel: '大雪',
        visibility: 2,
      },
      forecast: [
        {
          cityId: '1',
          date: '2024-01-16',
          snowLevel: '中雪',
          snowPeriod: '08:00-14:00',
          accumulation: 5,
          tempHigh: -8,
          tempLow: -18,
        },
        {
          cityId: '1',
          date: '2024-01-17',
          snowLevel: '小雪',
          snowPeriod: '10:00-16:00',
          accumulation: 2,
          tempHigh: -6,
          tempLow: -15,
        },
      ],
      updatedAt: '2024-01-15T10:00:00Z',
    }

    const result = formatCityDetail(detail)
    expect(result).toContain('未来降雪预报')
    expect(result).toContain('2024-01-16')
    expect(result).toContain('中雪')
    expect(result).toContain('08:00-14:00')
    expect(result).toContain('5mm')
    expect(result).toContain('2024-01-17')
    expect(result).toContain('小雪')
  })

  it('should not include forecast section when forecast is empty', () => {
    const detail = {
      cityId: '1',
      cityName: '哈尔滨',
      current: {
        temperature: -15,
        humidity: 80,
        windSpeed: 12,
        windDirection: '北风',
        snowLevel: '大雪',
        visibility: 2,
      },
      forecast: [],
      updatedAt: '2024-01-15T10:00:00Z',
    }

    const result = formatCityDetail(detail)
    expect(result).not.toContain('未来降雪预报')
  })

  it('should handle zero values correctly', () => {
    const detail = {
      cityId: '1',
      cityName: '测试',
      current: {
        temperature: 0,
        humidity: 0,
        windSpeed: 0,
        windDirection: '无风',
        snowLevel: '无',
        visibility: 0,
      },
      forecast: [],
      updatedAt: '2024-01-15T10:00:00Z',
    }

    const result = formatCityDetail(detail)
    expect(result).toContain('0°C')
    expect(result).toContain('0%')
    expect(result).toContain('0km/h')
  })

  it('should format as multi-line string', () => {
    const detail = {
      cityId: '1',
      cityName: '哈尔滨',
      current: {
        temperature: -15,
        humidity: 80,
        windSpeed: 12,
        windDirection: '北风',
        snowLevel: '大雪',
        visibility: 2,
      },
      forecast: [],
      updatedAt: '2024-01-15T10:00:00Z',
    }

    const result = formatCityDetail(detail)
    const lines = result.split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(4)
  })
})


import { formatForecast } from '@/services/snow-service'
import type { SnowForecast } from '@/models/types'

describe('formatForecast', () => {
  it('should format forecast data with date, snowLevel, snowPeriod, and accumulation', () => {
    const forecastData: SnowForecast[] = [
      {
        cityId: '1',
        date: '2024-01-16',
        snowLevel: '中雪',
        snowPeriod: '08:00-14:00',
        accumulation: 5,
        tempHigh: -8,
        tempLow: -18,
      },
    ]

    const result = formatForecast(forecastData)

    expect(result).toContain('2024-01-16')
    expect(result).toContain('中雪')
    expect(result).toContain('08:00-14:00')
    expect(result).toContain('5mm')
  })

  it('should format multiple forecast days as multi-line string', () => {
    const forecastData: SnowForecast[] = [
      {
        cityId: '1',
        date: '2024-01-16',
        snowLevel: '中雪',
        snowPeriod: '08:00-14:00',
        accumulation: 5,
        tempHigh: -8,
        tempLow: -18,
      },
      {
        cityId: '1',
        date: '2024-01-17',
        snowLevel: '小雪',
        snowPeriod: '10:00-16:00',
        accumulation: 2,
        tempHigh: -6,
        tempLow: -15,
      },
      {
        cityId: '1',
        date: '2024-01-18',
        snowLevel: '大雪',
        snowPeriod: '06:00-20:00',
        accumulation: 12,
        tempHigh: -10,
        tempLow: -22,
      },
    ]

    const result = formatForecast(forecastData)
    const lines = result.split('\n')

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('2024-01-16')
    expect(lines[1]).toContain('2024-01-17')
    expect(lines[2]).toContain('2024-01-18')
  })

  it('should return "暂无预报数据" for empty forecast array', () => {
    const result = formatForecast([])
    expect(result).toBe('暂无预报数据')
  })

  it('should include all required fields for each forecast day', () => {
    const forecastData: SnowForecast[] = [
      {
        cityId: '1',
        date: '2024-02-01',
        snowLevel: '暴雪',
        snowPeriod: '00:00-23:59',
        accumulation: 30,
        tempHigh: -5,
        tempLow: -20,
      },
    ]

    const result = formatForecast(forecastData)

    // Each line must contain: date, snowLevel, snowPeriod, accumulation
    expect(result).toContain('日期: 2024-02-01')
    expect(result).toContain('强度: 暴雪')
    expect(result).toContain('时段: 00:00-23:59')
    expect(result).toContain('累计: 30mm')
  })

  it('should handle zero accumulation', () => {
    const forecastData: SnowForecast[] = [
      {
        cityId: '1',
        date: '2024-01-20',
        snowLevel: '无',
        snowPeriod: '',
        accumulation: 0,
        tempHigh: 2,
        tempLow: -3,
      },
    ]

    const result = formatForecast(forecastData)
    expect(result).toContain('0mm')
  })

  it('should handle decimal accumulation values', () => {
    const forecastData: SnowForecast[] = [
      {
        cityId: '1',
        date: '2024-01-20',
        snowLevel: '小雪',
        snowPeriod: '14:00-18:00',
        accumulation: 1.5,
        tempHigh: -1,
        tempLow: -8,
      },
    ]

    const result = formatForecast(forecastData)
    expect(result).toContain('1.5mm')
  })
})
