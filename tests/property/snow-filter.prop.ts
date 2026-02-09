/**
 * 属性测试：降雪城市过滤正确性
 *
 * Property 1: For any 天气数据集合，Snow_Query_Service 返回的降雪城市列表中的
 * 每个城市都应当处于降雪状态（snowLevel 不为 "无"），且所有处于降雪状态的城市
 * 都应出现在列表中。
 *
 * **Validates: Requirements 1.1**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { SnowLevel, SnowRegion } from '@/models/types'
import { filterSnowingCities } from '@/services/snow-service'

/** 所有有效的降雪等级（包含 "无"） */
const ALL_SNOW_LEVELS: SnowLevel[] = ['小雪', '中雪', '大雪', '暴雪', '无']

/**
 * 智能生成器：生成随机 SnowRegion 对象
 *
 * 从有效的 SnowLevel 集合中随机选取降雪等级，
 * 确保生成的数据覆盖降雪和非降雪两种状态。
 */
const snowRegionArb: fc.Arbitrary<SnowRegion> = fc.record({
  cityId: fc.string({ minLength: 1, maxLength: 20 }),
  cityName: fc.string({ minLength: 1, maxLength: 30 }),
  province: fc.string({ minLength: 1, maxLength: 20 }),
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  temperature: fc.double({ min: -50, max: 50, noNaN: true }),
  humidity: fc.integer({ min: 0, max: 100 }),
  windSpeed: fc.double({ min: 0, max: 200, noNaN: true }),
  windDirection: fc.constantFrom('北', '南', '东', '西', '东北', '西北', '东南', '西南'),
  snowLevel: fc.constantFrom(...ALL_SNOW_LEVELS),
  visibility: fc.double({ min: 0, max: 50, noNaN: true }),
  updatedAt: fc.date().map((d) => d.toISOString()),
})

describe('Property 1: 降雪城市过滤正确性', () => {
  /**
   * **Validates: Requirements 1.1**
   *
   * Soundness（健全性）：filterSnowingCities 返回的每个城市的 snowLevel 都不为 "无"。
   * 即结果中不包含非降雪城市。
   */
  it('结果中每个城市的 snowLevel 都不为 "无"（健全性）', () => {
    fc.assert(
      fc.property(
        fc.array(snowRegionArb, { minLength: 0, maxLength: 50 }),
        (weatherData: SnowRegion[]) => {
          const result = filterSnowingCities(weatherData)

          // Every city in the result must have snowLevel !== "无"
          for (const city of result) {
            expect(city.snowLevel).not.toBe('无')
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.1**
   *
   * Completeness（完备性）：输入中所有 snowLevel 不为 "无" 的城市都应出现在结果中。
   * 即没有遗漏任何降雪城市。
   */
  it('输入中所有降雪城市都应出现在结果中（完备性）', () => {
    fc.assert(
      fc.property(
        fc.array(snowRegionArb, { minLength: 0, maxLength: 50 }),
        (weatherData: SnowRegion[]) => {
          const result = filterSnowingCities(weatherData)

          // Collect all snowing cities from the input
          const expectedSnowingCities = weatherData.filter(
            (region) => region.snowLevel !== '无',
          )

          // Every snowing city in the input must appear in the result
          expect(result.length).toBe(expectedSnowingCities.length)

          for (const expectedCity of expectedSnowingCities) {
            expect(result).toContain(expectedCity)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.1**
   *
   * Combined property（组合属性）：同时验证健全性和完备性。
   * 结果集合恰好等于输入中所有降雪城市的集合。
   */
  it('结果集合恰好等于输入中所有降雪城市的集合（健全性 + 完备性）', () => {
    fc.assert(
      fc.property(
        fc.array(snowRegionArb, { minLength: 0, maxLength: 50 }),
        (weatherData: SnowRegion[]) => {
          const result = filterSnowingCities(weatherData)

          // Soundness: every result city is snowing
          const allSnowing = result.every((city) => city.snowLevel !== '无')
          expect(allSnowing).toBe(true)

          // Completeness: every snowing input city is in the result
          const expectedSnowingCities = weatherData.filter(
            (region) => region.snowLevel !== '无',
          )
          expect(result).toEqual(expectedSnowingCities)
        },
      ),
      { numRuns: 100 },
    )
  })
})
