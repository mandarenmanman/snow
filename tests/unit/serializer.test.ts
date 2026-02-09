import { describe, it, expect } from 'vitest'
import { serialize, deserialize, prettyPrint } from '@/utils/serializer'
import type { SnowRegion } from '@/models/types'

/** 完整的 SnowRegion 测试数据 */
const sampleRegion: SnowRegion = {
  cityId: 'BJ001',
  cityName: '北京',
  province: '北京市',
  latitude: 39.9,
  longitude: 116.4,
  temperature: -5,
  humidity: 80,
  windSpeed: 12,
  windDirection: '北风',
  snowLevel: '中雪',
  visibility: 2.5,
  updatedAt: '2024-01-15T10:00:00Z',
}

describe('serialize', () => {
  it('should convert a SnowRegion to a JSON string', () => {
    const result = serialize(sampleRegion)
    expect(typeof result).toBe('string')
    // The result should be valid JSON that parses back to the same data
    expect(JSON.parse(result)).toEqual(sampleRegion)
  })

  it('should include all SnowRegion fields', () => {
    const result = serialize(sampleRegion)
    const parsed = JSON.parse(result)
    expect(parsed).toHaveProperty('cityId', 'BJ001')
    expect(parsed).toHaveProperty('cityName', '北京')
    expect(parsed).toHaveProperty('province', '北京市')
    expect(parsed).toHaveProperty('latitude', 39.9)
    expect(parsed).toHaveProperty('longitude', 116.4)
    expect(parsed).toHaveProperty('temperature', -5)
    expect(parsed).toHaveProperty('humidity', 80)
    expect(parsed).toHaveProperty('windSpeed', 12)
    expect(parsed).toHaveProperty('windDirection', '北风')
    expect(parsed).toHaveProperty('snowLevel', '中雪')
    expect(parsed).toHaveProperty('visibility', 2.5)
    expect(parsed).toHaveProperty('updatedAt', '2024-01-15T10:00:00Z')
  })

  it('should handle a region with snowLevel "无"', () => {
    const noSnow: SnowRegion = { ...sampleRegion, snowLevel: '无' }
    const result = serialize(noSnow)
    expect(JSON.parse(result).snowLevel).toBe('无')
  })

  it('should handle negative temperature values', () => {
    const cold: SnowRegion = { ...sampleRegion, temperature: -30 }
    const result = serialize(cold)
    expect(JSON.parse(result).temperature).toBe(-30)
  })
})

describe('deserialize', () => {
  it('should parse a valid JSON string into a SnowRegion', () => {
    const json = JSON.stringify(sampleRegion)
    const result = deserialize(json)
    expect(result).toEqual(sampleRegion)
  })

  it('should fill missing fields with defaults via createSnowRegion', () => {
    const partial = JSON.stringify({ cityId: 'SH001', cityName: '上海' })
    const result = deserialize(partial)
    expect(result.cityId).toBe('SH001')
    expect(result.cityName).toBe('上海')
    expect(result.province).toBe('')
    expect(result.latitude).toBe(0)
    expect(result.longitude).toBe(0)
    expect(result.temperature).toBe(0)
    expect(result.humidity).toBe(0)
    expect(result.windSpeed).toBe(0)
    expect(result.windDirection).toBe('')
    expect(result.snowLevel).toBe('无')
    expect(result.visibility).toBe(0)
    expect(typeof result.updatedAt).toBe('string')
  })

  it('should clamp out-of-range values via createSnowRegion', () => {
    const outOfRange = JSON.stringify({
      ...sampleRegion,
      humidity: 150,
      latitude: 100,
      windSpeed: -5,
    })
    const result = deserialize(outOfRange)
    expect(result.humidity).toBe(100)
    expect(result.latitude).toBe(90)
    expect(result.windSpeed).toBe(0)
  })

  it('should default invalid snowLevel via createSnowRegion', () => {
    const invalid = JSON.stringify({ ...sampleRegion, snowLevel: 'invalid' })
    const result = deserialize(invalid)
    expect(result.snowLevel).toBe('无')
  })

  it('should throw SyntaxError for invalid JSON', () => {
    expect(() => deserialize('not valid json')).toThrow(SyntaxError)
    expect(() => deserialize('')).toThrow(SyntaxError)
    expect(() => deserialize('{broken')).toThrow(SyntaxError)
  })

  it('should handle an empty JSON object', () => {
    const result = deserialize('{}')
    expect(result.cityId).toBe('')
    expect(result.snowLevel).toBe('无')
  })
})

describe('prettyPrint', () => {
  it('should return a formatted JSON string with indentation', () => {
    const result = prettyPrint(sampleRegion)
    // Pretty-printed JSON should contain newlines and spaces
    expect(result).toContain('\n')
    expect(result).toContain('  ')
  })

  it('should produce valid JSON that can be parsed', () => {
    const result = prettyPrint(sampleRegion)
    const parsed = JSON.parse(result)
    expect(parsed).toEqual(sampleRegion)
  })

  it('should include all fields of the SnowRegion', () => {
    const result = prettyPrint(sampleRegion)
    expect(result).toContain('"cityId"')
    expect(result).toContain('"cityName"')
    expect(result).toContain('"province"')
    expect(result).toContain('"latitude"')
    expect(result).toContain('"longitude"')
    expect(result).toContain('"temperature"')
    expect(result).toContain('"humidity"')
    expect(result).toContain('"windSpeed"')
    expect(result).toContain('"windDirection"')
    expect(result).toContain('"snowLevel"')
    expect(result).toContain('"visibility"')
    expect(result).toContain('"updatedAt"')
  })

  it('should match JSON.stringify with 2-space indent', () => {
    const expected = JSON.stringify(sampleRegion, null, 2)
    const result = prettyPrint(sampleRegion)
    expect(result).toBe(expected)
  })
})

describe('serialize → deserialize round-trip', () => {
  it('should produce an equivalent object after round-trip', () => {
    const json = serialize(sampleRegion)
    const restored = deserialize(json)
    expect(restored).toEqual(sampleRegion)
  })

  it('should preserve all snow level values through round-trip', () => {
    const levels = ['小雪', '中雪', '大雪', '暴雪', '无'] as const
    for (const level of levels) {
      const region: SnowRegion = { ...sampleRegion, snowLevel: level }
      const restored = deserialize(serialize(region))
      expect(restored.snowLevel).toBe(level)
    }
  })

  it('should preserve Chinese characters through round-trip', () => {
    const region: SnowRegion = {
      ...sampleRegion,
      cityName: '哈尔滨',
      province: '黑龙江省',
      windDirection: '西北风',
    }
    const restored = deserialize(serialize(region))
    expect(restored.cityName).toBe('哈尔滨')
    expect(restored.province).toBe('黑龙江省')
    expect(restored.windDirection).toBe('西北风')
  })

  it('should preserve decimal numbers through round-trip', () => {
    const region: SnowRegion = {
      ...sampleRegion,
      latitude: 39.123456,
      longitude: 116.654321,
      visibility: 0.5,
    }
    const restored = deserialize(serialize(region))
    expect(restored.latitude).toBe(39.123456)
    expect(restored.longitude).toBe(116.654321)
    expect(restored.visibility).toBe(0.5)
  })
})
