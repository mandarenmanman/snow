/**
 * 属性测试：SnowRegion 序列化往返一致性
 *
 * Property 13: For any 有效的 SnowRegion 数据对象，将其序列化为 JSON 后再反序列化，
 * 应产生与原始对象等价的结果。
 *
 * **Validates: Requirements 7.1, 7.2, 7.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { serialize, deserialize, prettyPrint } from '@/utils/serializer'
import type { SnowRegion, SnowLevel } from '@/models/types'

/** 有效的降雪等级值 */
const VALID_SNOW_LEVELS: SnowLevel[] = ['小雪', '中雪', '大雪', '暴雪', '无']

/**
 * 生成有效的 ISO 8601 时间戳字符串
 * 使用整数时间戳范围确保生成的 Date 对象始终有效
 */
const arbISODateString: fc.Arbitrary<string> = fc
  .integer({
    min: new Date('2000-01-01T00:00:00Z').getTime(),
    max: new Date('2099-12-31T23:59:59Z').getTime(),
  })
  .map((ts) => new Date(ts).toISOString())

/**
 * 生成 JSON 安全的 double 值
 *
 * JSON 规范不区分 -0 和 0（JSON.stringify(-0) === "0"），
 * 因此生成器需要将 -0 映射为 0 以确保往返一致性。
 */
function jsonSafeDouble(constraints: { min: number; max: number }): fc.Arbitrary<number> {
  return fc
    .double({ ...constraints, noNaN: true, noDefaultInfinity: true })
    .map((v) => (Object.is(v, -0) ? 0 : v))
}

/**
 * 智能生成器：生成有效的 SnowRegion 对象
 *
 * 约束条件（与 createSnowRegion 工厂函数的验证逻辑一致）：
 * - latitude: [-90, 90]
 * - longitude: [-180, 180]
 * - temperature: 合理范围（不做 clamp，但需为有限数）
 * - humidity: [0, 100]
 * - windSpeed: >= 0
 * - visibility: >= 0
 * - snowLevel: 必须是有效的 SnowLevel 值之一
 * - updatedAt: 有效的 ISO 8601 字符串
 * - 字符串字段: 任意字符串
 *
 * 注意：所有数值字段使用 jsonSafeDouble 以排除 -0，
 * 因为 JSON.stringify(-0) === "0"，反序列化后变为 0，
 * 这是 JSON 规范的已知行为，不影响数据正确性。
 */
const arbSnowRegion: fc.Arbitrary<SnowRegion> = fc.record({
  cityId: fc.string(),
  cityName: fc.string(),
  province: fc.string(),
  latitude: jsonSafeDouble({ min: -90, max: 90 }),
  longitude: jsonSafeDouble({ min: -180, max: 180 }),
  temperature: jsonSafeDouble({ min: -60, max: 60 }),
  humidity: jsonSafeDouble({ min: 0, max: 100 }),
  windSpeed: jsonSafeDouble({ min: 0, max: 200 }),
  windDirection: fc.string(),
  snowLevel: fc.constantFrom(...VALID_SNOW_LEVELS),
  visibility: jsonSafeDouble({ min: 0, max: 100 }),
  updatedAt: arbISODateString,
})

describe('Property 13: SnowRegion 序列化往返一致性', () => {
  /**
   * **Validates: Requirements 7.1, 7.2, 7.4**
   *
   * For any valid SnowRegion object, serializing it to JSON and then
   * deserializing back should produce an object equivalent to the original.
   */
  it('serialize → deserialize 应产生与原始对象等价的结果', () => {
    fc.assert(
      fc.property(arbSnowRegion, (region: SnowRegion) => {
        const serialized = serialize(region)
        const deserialized = deserialize(serialized)

        // 验证所有字段等价
        expect(deserialized.cityId).toBe(region.cityId)
        expect(deserialized.cityName).toBe(region.cityName)
        expect(deserialized.province).toBe(region.province)
        expect(deserialized.latitude).toBe(region.latitude)
        expect(deserialized.longitude).toBe(region.longitude)
        expect(deserialized.temperature).toBe(region.temperature)
        expect(deserialized.humidity).toBe(region.humidity)
        expect(deserialized.windSpeed).toBe(region.windSpeed)
        expect(deserialized.windDirection).toBe(region.windDirection)
        expect(deserialized.snowLevel).toBe(region.snowLevel)
        expect(deserialized.visibility).toBe(region.visibility)
        expect(deserialized.updatedAt).toBe(region.updatedAt)

        // 整体深度相等
        expect(deserialized).toEqual(region)
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * 属性测试：格式化输出为有效 JSON
 *
 * Property 14: For any 有效的 SnowRegion 数据对象，格式化输出的字符串应为合法的 JSON，
 * 且包含原始对象的所有字段。
 *
 * **Validates: Requirements 7.3**
 */
describe('Property 14: 格式化输出为有效 JSON', () => {
  /**
   * **Validates: Requirements 7.3**
   *
   * For any valid SnowRegion object, prettyPrint should produce a valid JSON
   * string that contains all original fields of the object.
   */
  it('prettyPrint 输出应为合法 JSON 且包含原始对象的所有字段', () => {
    fc.assert(
      fc.property(arbSnowRegion, (region: SnowRegion) => {
        const formatted = prettyPrint(region)

        // 1. 验证输出是合法的 JSON（JSON.parse 不抛出异常）
        let parsed: unknown
        expect(() => {
          parsed = JSON.parse(formatted)
        }).not.toThrow()

        // 2. 验证解析后的对象包含原始对象的所有字段
        const parsedObj = parsed as Record<string, unknown>
        const snowRegionKeys: (keyof SnowRegion)[] = [
          'cityId',
          'cityName',
          'province',
          'latitude',
          'longitude',
          'temperature',
          'humidity',
          'windSpeed',
          'windDirection',
          'snowLevel',
          'visibility',
          'updatedAt',
        ]

        for (const key of snowRegionKeys) {
          expect(parsedObj).toHaveProperty(key)
          expect(parsedObj[key]).toEqual(region[key])
        }
      }),
      { numRuns: 100 },
    )
  })
})
