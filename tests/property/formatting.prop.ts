/**
 * 属性测试：降雪列表项包含完整信息
 *
 * Property 2: For any SnowRegion 数据对象，格式化为列表项后的输出应包含
 * 城市名称、当前温度、降雪强度和更新时间四个字段。
 *
 * **Validates: Requirements 1.2**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { SnowLevel, SnowRegion } from '@/models/types'
import { formatSnowListItem } from '@/services/snow-service'

/** 有效的降雪强度等级（不含 "无"，因为列表项展示的是正在下雪的城市） */
const ACTIVE_SNOW_LEVELS: SnowLevel[] = ['小雪', '中雪', '大雪', '暴雪']

/** 所有有效的降雪等级（包含 "无"） */
const ALL_SNOW_LEVELS: SnowLevel[] = ['小雪', '中雪', '大雪', '暴雪', '无']

/**
 * 智能生成器：生成随机 SnowRegion 对象
 *
 * - cityName 使用非空中文字符串，确保可在输出中唯一匹配
 * - snowLevel 从有效降雪等级中随机选取
 * - updatedAt 使用有效的 ISO 8601 时间戳
 */
const snowRegionArb: fc.Arbitrary<SnowRegion> = fc.record({
  cityId: fc.string({ minLength: 1, maxLength: 20 }),
  cityName: fc.string({ minLength: 1, maxLength: 30 }),
  province: fc.string({ minLength: 1, maxLength: 20 }),
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  temperature: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
  humidity: fc.integer({ min: 0, max: 100 }),
  windSpeed: fc.double({ min: 0, max: 200, noNaN: true }),
  windDirection: fc.constantFrom('北', '南', '东', '西', '东北', '西北', '东南', '西南'),
  snowLevel: fc.constantFrom(...ALL_SNOW_LEVELS),
  visibility: fc.double({ min: 0, max: 50, noNaN: true }),
  updatedAt: fc.integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  }).map((ts) => new Date(ts).toISOString()),
})

describe('Property 2: 降雪列表项包含完整信息', () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * 格式化后的列表项字符串应包含城市名称。
   */
  it('格式化输出应包含城市名称', () => {
    fc.assert(
      fc.property(
        snowRegionArb,
        (region: SnowRegion) => {
          const output = formatSnowListItem(region)
          expect(output).toContain(region.cityName)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.2**
   *
   * 格式化后的列表项字符串应包含当前温度，格式为 "X°C"。
   */
  it('格式化输出应包含温度（X°C 格式）', () => {
    fc.assert(
      fc.property(
        snowRegionArb,
        (region: SnowRegion) => {
          const output = formatSnowListItem(region)
          const tempStr = `${region.temperature}°C`
          expect(output).toContain(tempStr)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.2**
   *
   * 格式化后的列表项字符串应包含降雪强度。
   */
  it('格式化输出应包含降雪强度', () => {
    fc.assert(
      fc.property(
        snowRegionArb,
        (region: SnowRegion) => {
          const output = formatSnowListItem(region)
          expect(output).toContain(region.snowLevel)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.2**
   *
   * 格式化后的列表项字符串应包含更新时间（匹配 YYYY-MM-DD HH:MM 格式）。
   */
  it('格式化输出应包含更新时间（时间格式模式）', () => {
    fc.assert(
      fc.property(
        snowRegionArb,
        (region: SnowRegion) => {
          const output = formatSnowListItem(region)
          // 更新时间应匹配 "YYYY-MM-DD HH:MM" 格式
          const timePattern = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/
          expect(output).toMatch(timePattern)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 1.2**
   *
   * 综合属性：格式化后的列表项字符串应同时包含城市名称、温度、降雪强度和更新时间。
   * 验证所有四个字段在单次调用中都存在。
   */
  it('格式化输出应同时包含城市名称、温度、降雪强度和更新时间', () => {
    fc.assert(
      fc.property(
        snowRegionArb,
        (region: SnowRegion) => {
          const output = formatSnowListItem(region)

          // 1. 包含城市名称
          expect(output).toContain(region.cityName)

          // 2. 包含温度（X°C 格式）
          const tempStr = `${region.temperature}°C`
          expect(output).toContain(tempStr)

          // 3. 包含降雪强度
          expect(output).toContain(region.snowLevel)

          // 4. 包含更新时间（YYYY-MM-DD HH:MM 格式）
          const timePattern = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/
          expect(output).toMatch(timePattern)
        },
      ),
      { numRuns: 100 },
    )
  })
})


/**
 * 属性测试：城市详情包含完整信息
 *
 * Property 4: For any 城市详情数据，格式化后的输出应包含降雪状态、温度、湿度、
 * 风力和未来 24 小时降雪预报信息。
 *
 * **Validates: Requirements 2.2**
 */

import type { CityDetail, SnowForecast } from '@/models/types'
import { formatCityDetail } from '@/services/snow-service'

/** 智能生成器：生成随机 SnowForecast 对象 */
const snowForecastArb: fc.Arbitrary<SnowForecast> = fc.record({
  cityId: fc.string({ minLength: 1, maxLength: 20 }),
  date: fc.tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  ).map(([y, m, d]) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
  ),
  snowLevel: fc.constantFrom('小雪', '中雪', '大雪', '暴雪', '无'),
  snowPeriod: fc.tuple(
    fc.integer({ min: 0, max: 12 }),
    fc.integer({ min: 13, max: 23 }),
  ).map(([start, end]) =>
    `${String(start).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`,
  ),
  accumulation: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  tempHigh: fc.double({ min: -20, max: 10, noNaN: true, noDefaultInfinity: true }),
  tempLow: fc.double({ min: -40, max: 0, noNaN: true, noDefaultInfinity: true }),
})

/**
 * 智能生成器：生成随机 CityDetail 对象
 *
 * - current 包含随机天气数据
 * - forecast 为 0~5 个 SnowForecast 条目
 */
const cityDetailArb: fc.Arbitrary<CityDetail> = fc.record({
  cityId: fc.string({ minLength: 1, maxLength: 20 }),
  cityName: fc.string({ minLength: 1, maxLength: 30 }),
  current: fc.record({
    temperature: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
    humidity: fc.integer({ min: 0, max: 100 }),
    windSpeed: fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }),
    windDirection: fc.constantFrom('北', '南', '东', '西', '东北', '西北', '东南', '西南'),
    snowLevel: fc.constantFrom('小雪', '中雪', '大雪', '暴雪', '无'),
    visibility: fc.double({ min: 0, max: 50, noNaN: true, noDefaultInfinity: true }),
  }),
  forecast: fc.array(snowForecastArb, { minLength: 0, maxLength: 5 }),
  updatedAt: fc.integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  }).map((ts) => new Date(ts).toISOString()),
})

describe('Property 4: 城市详情包含完整信息', () => {
  /**
   * **Validates: Requirements 2.2**
   *
   * 格式化后的城市详情应包含降雪状态。
   */
  it('格式化输出应包含降雪状态', () => {
    fc.assert(
      fc.property(
        cityDetailArb,
        (detail: CityDetail) => {
          const output = formatCityDetail(detail)
          expect(output).toContain(detail.current.snowLevel)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.2**
   *
   * 格式化后的城市详情应包含温度（X°C 格式）。
   */
  it('格式化输出应包含温度（X°C 格式）', () => {
    fc.assert(
      fc.property(
        cityDetailArb,
        (detail: CityDetail) => {
          const output = formatCityDetail(detail)
          const tempStr = `${detail.current.temperature}°C`
          expect(output).toContain(tempStr)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.2**
   *
   * 格式化后的城市详情应包含湿度（X% 格式）。
   */
  it('格式化输出应包含湿度（X% 格式）', () => {
    fc.assert(
      fc.property(
        cityDetailArb,
        (detail: CityDetail) => {
          const output = formatCityDetail(detail)
          const humidityStr = `${detail.current.humidity}%`
          expect(output).toContain(humidityStr)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.2**
   *
   * 格式化后的城市详情应包含风速和风向。
   */
  it('格式化输出应包含风速和风向', () => {
    fc.assert(
      fc.property(
        cityDetailArb,
        (detail: CityDetail) => {
          const output = formatCityDetail(detail)
          const windSpeedStr = `${detail.current.windSpeed}km/h`
          expect(output).toContain(windSpeedStr)
          expect(output).toContain(detail.current.windDirection)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.2**
   *
   * 当 forecast 非空时，格式化输出应包含预报信息。
   */
  it('当 forecast 非空时，格式化输出应包含预报信息', () => {
    const cityDetailWithForecastArb = fc.record({
      cityId: fc.string({ minLength: 1, maxLength: 20 }),
      cityName: fc.string({ minLength: 1, maxLength: 30 }),
      current: fc.record({
        temperature: fc.double({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
        humidity: fc.integer({ min: 0, max: 100 }),
        windSpeed: fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true }),
        windDirection: fc.constantFrom('北', '南', '东', '西', '东北', '西北', '东南', '西南'),
        snowLevel: fc.constantFrom('小雪', '中雪', '大雪', '暴雪', '无'),
        visibility: fc.double({ min: 0, max: 50, noNaN: true, noDefaultInfinity: true }),
      }),
      forecast: fc.array(snowForecastArb, { minLength: 1, maxLength: 5 }),
      updatedAt: fc.integer({
        min: new Date('2020-01-01T00:00:00Z').getTime(),
        max: new Date('2030-12-31T23:59:59Z').getTime(),
      }).map((ts) => new Date(ts).toISOString()),
    })

    fc.assert(
      fc.property(
        cityDetailWithForecastArb,
        (detail: CityDetail) => {
          const output = formatCityDetail(detail)

          // 应包含预报标题
          expect(output).toContain('未来降雪预报')

          // 每个预报条目的关键信息应出现在输出中
          for (const f of detail.forecast) {
            expect(output).toContain(f.date)
            expect(output).toContain(f.snowLevel)
            expect(output).toContain(f.snowPeriod)
            expect(output).toContain(`${f.accumulation}mm`)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 2.2**
   *
   * 综合属性：格式化后的城市详情应同时包含降雪状态、温度、湿度、风力，
   * 且当 forecast 非空时包含预报信息。
   */
  it('格式化输出应同时包含降雪状态、温度、湿度、风力和预报信息', () => {
    fc.assert(
      fc.property(
        cityDetailArb,
        (detail: CityDetail) => {
          const output = formatCityDetail(detail)

          // 1. 包含降雪状态
          expect(output).toContain(detail.current.snowLevel)

          // 2. 包含温度（X°C 格式）
          expect(output).toContain(`${detail.current.temperature}°C`)

          // 3. 包含湿度（X% 格式）
          expect(output).toContain(`${detail.current.humidity}%`)

          // 4. 包含风速和风向
          expect(output).toContain(`${detail.current.windSpeed}km/h`)
          expect(output).toContain(detail.current.windDirection)

          // 5. 如果有预报数据，应包含预报信息
          if (detail.forecast.length > 0) {
            expect(output).toContain('未来降雪预报')
            for (const f of detail.forecast) {
              expect(output).toContain(f.date)
              expect(output).toContain(f.snowLevel)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})


/**
 * 属性测试：降雪预报天数与字段完整性
 *
 * Property 6: For any 有效的城市预报数据，详情页展示的预报应包含恰好 3 天的数据，
 * 每天的数据应包含降雪时段、降雪强度和累计降雪量。
 *
 * **Validates: Requirements 4.1, 4.2**
 */

import { formatForecast } from '@/services/snow-service'

/**
 * 智能生成器：生成恰好 3 个 SnowForecast 对象（模拟未来 3 天预报）
 *
 * - date 使用 fc.integer 映射为 YYYY-MM-DD 格式，避免 fc.date() 的问题
 * - snowLevel 从有效降雪等级中随机选取
 * - snowPeriod 生成合理的时段字符串
 * - accumulation 为非负浮点数
 */
const threeDayForecastArb: fc.Arbitrary<SnowForecast[]> = fc.tuple(
  fc.record({
    cityId: fc.string({ minLength: 1, maxLength: 20 }),
    date: fc.integer({ min: 0, max: 3650 }).map((dayOffset) => {
      const base = new Date('2020-01-01')
      base.setDate(base.getDate() + dayOffset)
      const y = base.getFullYear()
      const m = String(base.getMonth() + 1).padStart(2, '0')
      const d = String(base.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }),
    snowLevel: fc.constantFrom('小雪', '中雪', '大雪', '暴雪', '无'),
    snowPeriod: fc.tuple(
      fc.integer({ min: 0, max: 12 }),
      fc.integer({ min: 13, max: 23 }),
    ).map(([start, end]) =>
      `${String(start).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`,
    ),
    accumulation: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
    tempHigh: fc.double({ min: -20, max: 10, noNaN: true, noDefaultInfinity: true }),
    tempLow: fc.double({ min: -40, max: 0, noNaN: true, noDefaultInfinity: true }),
  }),
  fc.record({
    cityId: fc.string({ minLength: 1, maxLength: 20 }),
    date: fc.integer({ min: 0, max: 3650 }).map((dayOffset) => {
      const base = new Date('2020-01-01')
      base.setDate(base.getDate() + dayOffset)
      const y = base.getFullYear()
      const m = String(base.getMonth() + 1).padStart(2, '0')
      const d = String(base.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }),
    snowLevel: fc.constantFrom('小雪', '中雪', '大雪', '暴雪', '无'),
    snowPeriod: fc.tuple(
      fc.integer({ min: 0, max: 12 }),
      fc.integer({ min: 13, max: 23 }),
    ).map(([start, end]) =>
      `${String(start).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`,
    ),
    accumulation: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
    tempHigh: fc.double({ min: -20, max: 10, noNaN: true, noDefaultInfinity: true }),
    tempLow: fc.double({ min: -40, max: 0, noNaN: true, noDefaultInfinity: true }),
  }),
  fc.record({
    cityId: fc.string({ minLength: 1, maxLength: 20 }),
    date: fc.integer({ min: 0, max: 3650 }).map((dayOffset) => {
      const base = new Date('2020-01-01')
      base.setDate(base.getDate() + dayOffset)
      const y = base.getFullYear()
      const m = String(base.getMonth() + 1).padStart(2, '0')
      const d = String(base.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }),
    snowLevel: fc.constantFrom('小雪', '中雪', '大雪', '暴雪', '无'),
    snowPeriod: fc.tuple(
      fc.integer({ min: 0, max: 12 }),
      fc.integer({ min: 13, max: 23 }),
    ).map(([start, end]) =>
      `${String(start).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`,
    ),
    accumulation: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
    tempHigh: fc.double({ min: -20, max: 10, noNaN: true, noDefaultInfinity: true }),
    tempLow: fc.double({ min: -40, max: 0, noNaN: true, noDefaultInfinity: true }),
  }),
).map(([f1, f2, f3]) => [f1, f2, f3])

describe('Property 6: 降雪预报天数与字段完整性', () => {
  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * 当给定恰好 3 天的预报数据时，格式化输出应包含恰好 3 行。
   */
  it('恰好 3 天预报数据应产生恰好 3 行输出', () => {
    fc.assert(
      fc.property(
        threeDayForecastArb,
        (forecasts: SnowForecast[]) => {
          const output = formatForecast(forecasts)
          const lines = output.split('\n')
          expect(lines).toHaveLength(3)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * 每行输出应包含对应预报的降雪时段（snowPeriod）。
   */
  it('每行输出应包含降雪时段', () => {
    fc.assert(
      fc.property(
        threeDayForecastArb,
        (forecasts: SnowForecast[]) => {
          const output = formatForecast(forecasts)
          const lines = output.split('\n')
          for (let i = 0; i < 3; i++) {
            expect(lines[i]).toContain(forecasts[i].snowPeriod)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * 每行输出应包含对应预报的降雪强度（snowLevel）。
   */
  it('每行输出应包含降雪强度', () => {
    fc.assert(
      fc.property(
        threeDayForecastArb,
        (forecasts: SnowForecast[]) => {
          const output = formatForecast(forecasts)
          const lines = output.split('\n')
          for (let i = 0; i < 3; i++) {
            expect(lines[i]).toContain(forecasts[i].snowLevel)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * 每行输出应包含对应预报的累计降雪量（accumulation），格式为 "Xmm"。
   */
  it('每行输出应包含累计降雪量（Xmm 格式）', () => {
    fc.assert(
      fc.property(
        threeDayForecastArb,
        (forecasts: SnowForecast[]) => {
          const output = formatForecast(forecasts)
          const lines = output.split('\n')
          for (let i = 0; i < 3; i++) {
            expect(lines[i]).toContain(`${forecasts[i].accumulation}mm`)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * 格式化输出应为非空字符串。
   */
  it('3 天预报数据的格式化输出应为非空字符串', () => {
    fc.assert(
      fc.property(
        threeDayForecastArb,
        (forecasts: SnowForecast[]) => {
          const output = formatForecast(forecasts)
          expect(output).toBeTruthy()
          expect(output.length).toBeGreaterThan(0)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * 综合属性：恰好 3 天预报数据应产生恰好 3 行输出，
   * 每行同时包含日期（date）、降雪强度、降雪时段和累计降雪量。
   */
  it('综合验证：3 天预报应产生 3 行，每行包含日期、强度、时段和累计量', () => {
    fc.assert(
      fc.property(
        threeDayForecastArb,
        (forecasts: SnowForecast[]) => {
          const output = formatForecast(forecasts)

          // 1. 输出为非空字符串
          expect(output.length).toBeGreaterThan(0)

          // 2. 恰好 3 行
          const lines = output.split('\n')
          expect(lines).toHaveLength(3)

          // 3. 每行包含完整字段
          for (let i = 0; i < 3; i++) {
            const line = lines[i]
            const forecast = forecasts[i]

            // 包含日期
            expect(line).toContain(forecast.date)
            // 包含降雪强度
            expect(line).toContain(forecast.snowLevel)
            // 包含降雪时段
            expect(line).toContain(forecast.snowPeriod)
            // 包含累计降雪量
            expect(line).toContain(`${forecast.accumulation}mm`)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
