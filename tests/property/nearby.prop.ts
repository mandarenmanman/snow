/**
 * 属性测试：附近降雪过滤与排序
 *
 * Property 5: For any 用户位置坐标、搜索半径和降雪区域集合，
 * getNearbySnow 返回的结果中每个区域到用户的距离都应小于等于指定半径，
 * 且结果按距离升序排列。
 *
 * **Validates: Requirements 3.1, 3.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { Location, SnowLevel, SnowRegion } from '@/models/types'
import { calculateDistance, filterNearbySnow } from '@/services/geo-service'

/** 所有有效的降雪等级（包含 "无"） */
const ALL_SNOW_LEVELS: SnowLevel[] = ['小雪', '中雪', '大雪', '暴雪', '无']

/** 仅降雪等级（不含 "无"） */
const SNOWING_LEVELS: SnowLevel[] = ['小雪', '中雪', '大雪', '暴雪']

/**
 * 智能生成器：生成有效的地理位置坐标
 */
const locationArb: fc.Arbitrary<Location> = fc.record({
  latitude: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
})

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
  latitude: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
  temperature: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
  humidity: fc.integer({ min: 0, max: 100 }),
  windSpeed: fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }),
  windDirection: fc.constantFrom('北', '南', '东', '西', '东北', '西北', '东南', '西南'),
  snowLevel: fc.constantFrom(...ALL_SNOW_LEVELS),
  visibility: fc.double({ min: 0, max: 50, noNaN: true, noDefaultInfinity: true }),
  updatedAt: fc.integer({ min: 0, max: 2000000000 }).map((ts) => new Date(ts * 1000).toISOString()),
})

/**
 * 智能生成器：生成合理的搜索半径（公里）
 * 范围从 1 公里到 2000 公里，覆盖常见搜索场景
 */
const radiusArb: fc.Arbitrary<number> = fc.double({
  min: 1,
  max: 2000,
  noNaN: true,
  noDefaultInfinity: true,
})

describe('Property 5: 附近降雪过滤与排序', () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * 距离约束：filterNearbySnow 返回的每个结果的 distance 都应 <= 指定半径。
   */
  it('结果中每个区域到用户的距离都应小于等于指定半径', () => {
    fc.assert(
      fc.property(
        locationArb,
        fc.array(snowRegionArb, { minLength: 0, maxLength: 50 }),
        radiusArb,
        (userLocation: Location, snowRegions: SnowRegion[], radius: number) => {
          const results = filterNearbySnow(userLocation, snowRegions, radius)

          for (const result of results) {
            expect(result.distance).toBeLessThanOrEqual(radius)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 3.2**
   *
   * 排序属性：filterNearbySnow 返回的结果应按距离升序排列。
   */
  it('结果按距离升序排列', () => {
    fc.assert(
      fc.property(
        locationArb,
        fc.array(snowRegionArb, { minLength: 0, maxLength: 50 }),
        radiusArb,
        (userLocation: Location, snowRegions: SnowRegion[], radius: number) => {
          const results = filterNearbySnow(userLocation, snowRegions, radius)

          for (let i = 1; i < results.length; i++) {
            expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 3.1**
   *
   * 降雪过滤：filterNearbySnow 返回的结果中只包含正在下雪的城市（snowLevel !== "无"）。
   */
  it('结果中只包含正在下雪的城市', () => {
    fc.assert(
      fc.property(
        locationArb,
        fc.array(snowRegionArb, { minLength: 0, maxLength: 50 }),
        radiusArb,
        (userLocation: Location, snowRegions: SnowRegion[], radius: number) => {
          const results = filterNearbySnow(userLocation, snowRegions, radius)

          for (const result of results) {
            expect(result.snowLevel).not.toBe('无')
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * 完备性：输入中所有正在下雪且在半径内的城市都应出现在结果中。
   */
  it('所有正在下雪且在半径内的城市都应出现在结果中（完备性）', () => {
    fc.assert(
      fc.property(
        locationArb,
        fc.array(snowRegionArb, { minLength: 0, maxLength: 50 }),
        radiusArb,
        (userLocation: Location, snowRegions: SnowRegion[], radius: number) => {
          const results = filterNearbySnow(userLocation, snowRegions, radius)

          // Manually compute expected results
          const expected = snowRegions.filter((region) => {
            if (region.snowLevel === '无') return false
            const dist = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              region.latitude,
              region.longitude,
            )
            return dist <= radius
          })

          // The number of results should match
          expect(results.length).toBe(expected.length)

          // Every expected city should appear in the results (by cityId)
          const resultCityIds = results.map((r) => r.cityId)
          for (const expectedRegion of expected) {
            expect(resultCityIds).toContain(expectedRegion.cityId)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * 组合属性：同时验证距离约束、排序和降雪过滤。
   * 结果中每个区域距离 <= 半径，按距离升序排列，且只包含降雪城市。
   */
  it('组合验证：距离约束 + 排序 + 降雪过滤', () => {
    fc.assert(
      fc.property(
        locationArb,
        fc.array(snowRegionArb, { minLength: 0, maxLength: 50 }),
        radiusArb,
        (userLocation: Location, snowRegions: SnowRegion[], radius: number) => {
          const results = filterNearbySnow(userLocation, snowRegions, radius)

          for (const result of results) {
            // Distance constraint
            expect(result.distance).toBeLessThanOrEqual(radius)
            // Snow filter
            expect(result.snowLevel).not.toBe('无')
          }

          // Ascending sort by distance
          for (let i = 1; i < results.length; i++) {
            expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance)
          }

          // Verify distance values are consistent with calculateDistance
          for (const result of results) {
            const region = snowRegions.find((r) => r.cityId === result.cityId)
            if (region) {
              const expectedDistance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                region.latitude,
                region.longitude,
              )
              expect(result.distance).toBeCloseTo(expectedDistance, 5)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
