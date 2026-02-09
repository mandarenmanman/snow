/**
 * 属性测试：城市搜索匹配正确性
 *
 * Property 3: For any 搜索关键词和城市数据集，搜索返回的每个城市名称都应包含该关键词，
 * 且城市数据集中所有名称包含该关键词的城市都应出现在结果中。
 *
 * **Validates: Requirements 2.1**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { City } from '@/models/types'
import { searchCities } from '@/services/snow-service'

/**
 * 智能生成器：生成随机 City 对象
 *
 * 城市名称使用中文字符和拉丁字符混合，确保覆盖多种搜索场景。
 */
const cityArb: fc.Arbitrary<City> = fc.record({
  cityId: fc.string({ minLength: 1, maxLength: 20 }),
  cityName: fc.string({ minLength: 1, maxLength: 30 }),
  province: fc.string({ minLength: 1, maxLength: 20 }),
})

/**
 * 智能生成器：生成非空搜索关键词
 *
 * 关键词至少 1 个字符，确保搜索有意义。
 */
const keywordArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 10 })

describe('Property 3: 城市搜索匹配正确性', () => {
  /**
   * **Validates: Requirements 2.1**
   *
   * Soundness（健全性）：searchCities 返回的每个城市的 cityName 都包含搜索关键词（不区分大小写）。
   * 即结果中不包含不匹配的城市。
   */
  it('结果中每个城市的 cityName 都包含搜索关键词（健全性）', () => {
    fc.assert(
      fc.property(
        keywordArb,
        fc.array(cityArb, { minLength: 0, maxLength: 50 }),
        (keyword: string, cityList: City[]) => {
          const result = searchCities(keyword, cityList)
          const lowerKeyword = keyword.toLowerCase()

          // Every city in the result must have cityName containing the keyword (case-insensitive)
          for (const city of result) {
            expect(city.cityName.toLowerCase()).toContain(lowerKeyword)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.1**
   *
   * Completeness（完备性）：输入中所有 cityName 包含关键词的城市都应出现在结果中。
   * 即没有遗漏任何匹配的城市。
   */
  it('输入中所有匹配城市都应出现在结果中（完备性）', () => {
    fc.assert(
      fc.property(
        keywordArb,
        fc.array(cityArb, { minLength: 0, maxLength: 50 }),
        (keyword: string, cityList: City[]) => {
          const result = searchCities(keyword, cityList)
          const lowerKeyword = keyword.toLowerCase()

          // Collect all matching cities from the input
          const expectedCities = cityList.filter((city) =>
            city.cityName.toLowerCase().includes(lowerKeyword),
          )

          // Every matching city in the input must appear in the result
          expect(result.length).toBe(expectedCities.length)

          for (const expectedCity of expectedCities) {
            expect(result).toContain(expectedCity)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.1**
   *
   * Combined property（组合属性）：同时验证健全性和完备性。
   * 结果集合恰好等于输入中所有 cityName 包含关键词的城市集合。
   */
  it('结果集合恰好等于输入中所有匹配城市的集合（健全性 + 完备性）', () => {
    fc.assert(
      fc.property(
        keywordArb,
        fc.array(cityArb, { minLength: 0, maxLength: 50 }),
        (keyword: string, cityList: City[]) => {
          const result = searchCities(keyword, cityList)
          const lowerKeyword = keyword.toLowerCase()

          // Soundness: every result city's name contains the keyword
          const allMatch = result.every((city) =>
            city.cityName.toLowerCase().includes(lowerKeyword),
          )
          expect(allMatch).toBe(true)

          // Completeness: every matching input city is in the result
          const expectedCities = cityList.filter((city) =>
            city.cityName.toLowerCase().includes(lowerKeyword),
          )
          expect(result).toEqual(expectedCities)
        },
      ),
      { numRuns: 100 },
    )
  })
})
