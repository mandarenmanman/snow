/**
 * 属性测试：收藏添加/移除往返一致性
 *
 * Property 7: For any 收藏列表和城市，将城市添加到收藏后该城市应出现在列表中；
 * 随后将该城市移除后，收藏列表应恢复到添加前的状态。
 *
 * **Validates: Requirements 5.1, 5.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { City, FavoriteCity, SnowRegion, SnowLevel } from '@/models/types'
import { addFavoriteToList, removeFavoriteFromList, getFavoritesWithStatus, checkSnowAlert } from '@/services/favorites-service'

/**
 * 智能生成器：生成随机 City 对象
 */
const cityArb: fc.Arbitrary<City> = fc.record({
  cityId: fc.string({ minLength: 1, maxLength: 20 }),
  cityName: fc.string({ minLength: 1, maxLength: 30 }),
  province: fc.string({ minLength: 1, maxLength: 20 }),
})

/**
 * 智能生成器：生成随机 FavoriteCity 对象
 */
const favoriteCityArb: fc.Arbitrary<FavoriteCity> = fc.record({
  _id: fc.string({ minLength: 1, maxLength: 40 }),
  openId: fc.string({ minLength: 1, maxLength: 30 }),
  cityId: fc.string({ minLength: 1, maxLength: 20 }),
  cityName: fc.string({ minLength: 1, maxLength: 30 }),
  createdAt: fc.integer({ min: 946684800000, max: 4102444800000 }).map((ts) => new Date(ts).toISOString()),
})

/**
 * 智能生成器：生成具有唯一 cityId 的 FavoriteCity 列表
 *
 * 通过 uniqueArray 确保列表中每个 FavoriteCity 的 cityId 唯一，
 * 避免初始列表中存在重复 cityId 导致的边界问题。
 */
const uniqueFavoritesArb: fc.Arbitrary<FavoriteCity[]> = fc.uniqueArray(
  favoriteCityArb,
  {
    comparator: (a, b) => a.cityId === b.cityId,
    minLength: 0,
    maxLength: 20,
  },
)

/**
 * 智能生成器：生成一个不在收藏列表中的新城市
 *
 * 使用 filter 确保生成的城市 cityId 不与列表中任何已有城市重复。
 */
function newCityNotInList(favorites: FavoriteCity[]): fc.Arbitrary<City> {
  const existingIds = new Set(favorites.map((f) => f.cityId))
  return cityArb.filter((city) => !existingIds.has(city.cityId))
}

describe('Property 7: 收藏添加/移除往返一致性', () => {
  /**
   * **Validates: Requirements 5.1**
   *
   * 添加城市后，该城市的 cityId 应出现在收藏列表中。
   */
  it('添加城市后，该城市应出现在收藏列表中', () => {
    fc.assert(
      fc.property(
        uniqueFavoritesArb.chain((favorites) =>
          fc.tuple(
            fc.constant(favorites),
            newCityNotInList(favorites),
            fc.string({ minLength: 1, maxLength: 30 }),
          ),
        ),
        ([favorites, city, openId]) => {
          const result = addFavoriteToList(favorites, city, openId)

          // The added city's cityId should be present in the result
          const resultCityIds = result.map((f) => f.cityId)
          expect(resultCityIds).toContain(city.cityId)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 5.1, 5.4**
   *
   * 往返一致性：添加城市后再移除，收藏列表的 cityId 集合应恢复到添加前的状态。
   * 比较 cityId 而非完整对象（因为 createdAt 在添加时生成）。
   */
  it('添加城市后再移除，收藏列表应恢复到添加前的状态（往返一致性）', () => {
    fc.assert(
      fc.property(
        uniqueFavoritesArb.chain((favorites) =>
          fc.tuple(
            fc.constant(favorites),
            newCityNotInList(favorites),
            fc.string({ minLength: 1, maxLength: 30 }),
          ),
        ),
        ([favorites, city, openId]) => {
          const originalCityIds = favorites.map((f) => f.cityId)

          // Step 1: Add the city
          const afterAdd = addFavoriteToList(favorites, city, openId)

          // Step 2: Remove the same city
          const afterRemove = removeFavoriteFromList(afterAdd, city.cityId)

          // The cityId set should be the same as before
          const resultCityIds = afterRemove.map((f) => f.cityId)
          expect(resultCityIds).toEqual(originalCityIds)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 5.1**
   *
   * 添加重复城市不应改变列表长度。
   * 如果城市已存在于列表中，addFavoriteToList 应返回相同长度的列表。
   */
  it('添加重复城市不应改变列表长度', () => {
    fc.assert(
      fc.property(
        uniqueFavoritesArb.filter((favs) => favs.length > 0),
        fc.string({ minLength: 1, maxLength: 30 }),
        (favorites, openId) => {
          // Pick an existing city from the favorites list
          const existingFav = favorites[0]
          const existingCity: City = {
            cityId: existingFav.cityId,
            cityName: existingFav.cityName,
            province: '测试省',
          }

          const result = addFavoriteToList(favorites, existingCity, openId)

          // Length should remain the same
          expect(result.length).toBe(favorites.length)
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ============================================================
// Property 8: 收藏城市降雪状态摘要完整性
// ============================================================

/**
 * 智能生成器：生成随机 SnowLevel
 */
const snowLevelArb: fc.Arbitrary<SnowLevel> = fc.constantFrom(
  '小雪' as SnowLevel,
  '中雪' as SnowLevel,
  '大雪' as SnowLevel,
  '暴雪' as SnowLevel,
  '无' as SnowLevel,
)

/**
 * 智能生成器：生成随机 SnowRegion 对象
 */
const snowRegionArb: fc.Arbitrary<SnowRegion> = fc.record({
  cityId: fc.string({ minLength: 1, maxLength: 20 }),
  cityName: fc.string({ minLength: 1, maxLength: 30 }),
  province: fc.string({ minLength: 1, maxLength: 20 }),
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  temperature: fc.double({ min: -50, max: 50, noNaN: true }),
  humidity: fc.double({ min: 0, max: 100, noNaN: true }),
  windSpeed: fc.double({ min: 0, max: 200, noNaN: true }),
  windDirection: fc.constantFrom('北', '南', '东', '西', '东北', '东南', '西北', '西南'),
  snowLevel: snowLevelArb,
  visibility: fc.double({ min: 0, max: 50, noNaN: true }),
  updatedAt: fc.integer({ min: 946684800000, max: 4102444800000 }).map((ts) => new Date(ts).toISOString()),
})

describe('Property 8: 收藏城市降雪状态摘要完整性', () => {
  /**
   * **Validates: Requirements 5.2**
   *
   * 结果列表长度应与输入收藏列表长度一致，且每个结果都包含 snowStatus 字段。
   */
  it('每个收藏城市都应附带 snowStatus 字段，结果长度与输入一致', () => {
    fc.assert(
      fc.property(
        uniqueFavoritesArb,
        fc.array(snowRegionArb, { minLength: 0, maxLength: 20 }),
        (favorites, snowRegions) => {
          const result = getFavoritesWithStatus(favorites, snowRegions)

          // Result length should equal input favorites length
          expect(result.length).toBe(favorites.length)

          // Every result item should have a snowStatus field that is a string
          for (const item of result) {
            expect(typeof item.snowStatus).toBe('string')
            expect(item.snowStatus.length).toBeGreaterThan(0)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 5.2**
   *
   * 当收藏城市在降雪区域数据中有匹配时，snowStatus 应等于该区域的 snowLevel。
   */
  it('匹配到降雪区域时，snowStatus 应等于该区域的 snowLevel', () => {
    fc.assert(
      fc.property(
        uniqueFavoritesArb.filter((favs) => favs.length > 0),
        fc.array(snowRegionArb, { minLength: 1, maxLength: 20 }),
        (favorites, snowRegions) => {
          // Ensure at least one favorite matches a snow region by aligning cityIds
          const alignedRegions = [...snowRegions]
          const targetFav = favorites[0]
          alignedRegions[0] = { ...alignedRegions[0], cityId: targetFav.cityId }

          const result = getFavoritesWithStatus(favorites, alignedRegions)

          // The first favorite should have the snowLevel from the aligned region
          const matchedResult = result.find((r) => r.cityId === targetFav.cityId)
          expect(matchedResult).toBeDefined()
          expect(matchedResult!.snowStatus).toBe(alignedRegions[0].snowLevel)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 5.2**
   *
   * 当收藏城市在降雪区域数据中无匹配时，snowStatus 应默认为"无"。
   */
  it('无匹配降雪区域时，snowStatus 应默认为"无"', () => {
    fc.assert(
      fc.property(
        uniqueFavoritesArb,
        (favorites) => {
          // Pass an empty snowRegions array so no favorites can match
          const result = getFavoritesWithStatus(favorites, [])

          for (const item of result) {
            expect(item.snowStatus).toBe('无')
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 5.2**
   *
   * 结果中应保留所有原始 FavoriteCity 字段（_id, openId, cityId, cityName, createdAt）。
   */
  it('结果中应保留所有原始 FavoriteCity 字段', () => {
    fc.assert(
      fc.property(
        uniqueFavoritesArb,
        fc.array(snowRegionArb, { minLength: 0, maxLength: 20 }),
        (favorites, snowRegions) => {
          const result = getFavoritesWithStatus(favorites, snowRegions)

          for (let i = 0; i < favorites.length; i++) {
            const original = favorites[i]
            const enriched = result[i]

            expect(enriched._id).toBe(original._id)
            expect(enriched.openId).toBe(original.openId)
            expect(enriched.cityId).toBe(original.cityId)
            expect(enriched.cityName).toBe(original.cityName)
            expect(enriched.createdAt).toBe(original.createdAt)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ============================================================
// Property 9: 降雪提醒触发正确性
// ============================================================

/**
 * 属性测试：降雪提醒触发正确性
 *
 * Property 9: For any 收藏城市，当该城市的降雪状态从"无"变为任意降雪等级时，
 * 系统应触发一次降雪提醒通知。
 *
 * **Validates: Requirements 5.3**
 */
describe('Property 9: 降雪提醒触发正确性', () => {
  /**
   * 智能生成器：生成活跃降雪等级（不含"无"）
   */
  const activeSnowLevelArb = fc.constantFrom('小雪', '中雪', '大雪', '暴雪')

  /**
   * 智能生成器：生成所有降雪等级（含"无"）
   */
  const allSnowLevelArb = fc.constantFrom('小雪', '中雪', '大雪', '暴雪', '无')

  /**
   * **Validates: Requirements 5.3**
   *
   * 当 previousStatus 为"无"且 currentStatus 为任意降雪等级（小雪/中雪/大雪/暴雪）时，
   * checkSnowAlert 应返回 true。
   */
  it('从"无"变为任意降雪等级时，应触发降雪提醒', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        activeSnowLevelArb,
        (openId, currentStatus) => {
          const result = checkSnowAlert(openId, '无', currentStatus)
          expect(result).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 5.3**
   *
   * 当 previousStatus 为"无"且 currentStatus 也为"无"时，
   * checkSnowAlert 应返回 false（状态未变化，不触发提醒）。
   */
  it('从"无"到"无"时，不应触发降雪提醒', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        (openId) => {
          const result = checkSnowAlert(openId, '无', '无')
          expect(result).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 5.3**
   *
   * 当 previousStatus 为任意降雪等级（非"无"）时，
   * 无论 currentStatus 为何值，checkSnowAlert 都应返回 false。
   */
  it('previousStatus 非"无"时，不应触发降雪提醒', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        activeSnowLevelArb,
        allSnowLevelArb,
        (openId, previousStatus, currentStatus) => {
          const result = checkSnowAlert(openId, previousStatus, currentStatus)
          expect(result).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 5.3**
   *
   * checkSnowAlert 是 previousStatus 和 currentStatus 的纯函数，
   * openId 不影响结果。对于相同的 previousStatus 和 currentStatus，
   * 不同的 openId 应产生相同的结果。
   */
  it('openId 不影响提醒判断结果（纯函数特性）', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        allSnowLevelArb,
        allSnowLevelArb,
        (openId1, openId2, previousStatus, currentStatus) => {
          const result1 = checkSnowAlert(openId1, previousStatus, currentStatus)
          const result2 = checkSnowAlert(openId2, previousStatus, currentStatus)
          expect(result1).toBe(result2)
        },
      ),
      { numRuns: 100 },
    )
  })
})
