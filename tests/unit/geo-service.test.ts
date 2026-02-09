import { describe, it, expect } from 'vitest'
import { createSnowRegion } from '@/models/factories'
import {
  calculateDistance,
  filterNearbySnow,
  findNearestSnow,
} from '@/services/geo-service'
import type { Location, SnowRegion } from '@/models/types'

describe('calculateDistance', () => {
  it('should return 0 for the same point', () => {
    const distance = calculateDistance(39.9, 116.4, 39.9, 116.4)
    expect(distance).toBe(0)
  })

  it('should calculate distance between Beijing and Shanghai (~1068 km)', () => {
    // Beijing: 39.9042°N, 116.4074°E
    // Shanghai: 31.2304°N, 121.4737°E
    const distance = calculateDistance(39.9042, 116.4074, 31.2304, 121.4737)
    // Known distance is approximately 1068 km
    expect(distance).toBeGreaterThan(1000)
    expect(distance).toBeLessThan(1150)
  })

  it('should calculate distance between Harbin and Changchun (~242 km)', () => {
    // Harbin: 45.75°N, 126.65°E
    // Changchun: 43.88°N, 125.32°E
    const distance = calculateDistance(45.75, 126.65, 43.88, 125.32)
    expect(distance).toBeGreaterThan(200)
    expect(distance).toBeLessThan(300)
  })

  it('should be symmetric (distance A→B equals B→A)', () => {
    const d1 = calculateDistance(39.9, 116.4, 31.2, 121.5)
    const d2 = calculateDistance(31.2, 121.5, 39.9, 116.4)
    expect(d1).toBeCloseTo(d2, 10)
  })

  it('should return a non-negative value', () => {
    const distance = calculateDistance(0, 0, 45, 90)
    expect(distance).toBeGreaterThanOrEqual(0)
  })

  it('should handle antipodal points (~20015 km)', () => {
    // North pole to south pole
    const distance = calculateDistance(90, 0, -90, 0)
    // Half the Earth's circumference ≈ 20015 km
    expect(distance).toBeGreaterThan(19900)
    expect(distance).toBeLessThan(20100)
  })

  it('should handle equator distance (0°,0° to 0°,180° ≈ 20015 km)', () => {
    const distance = calculateDistance(0, 0, 0, 180)
    expect(distance).toBeGreaterThan(19900)
    expect(distance).toBeLessThan(20100)
  })

  it('should handle small distances correctly', () => {
    // Two points very close together (~1.1 km apart)
    const distance = calculateDistance(39.9, 116.4, 39.91, 116.4)
    expect(distance).toBeGreaterThan(0.5)
    expect(distance).toBeLessThan(2)
  })
})

describe('filterNearbySnow', () => {
  const userLocation: Location = { latitude: 39.9, longitude: 116.4 } // Beijing

  it('should return empty array when snowRegions is empty', () => {
    const result = filterNearbySnow(userLocation, [], 500)
    expect(result).toHaveLength(0)
  })

  it('should filter out cities with snowLevel "无"', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '哈尔滨',
        latitude: 39.91,
        longitude: 116.41,
        snowLevel: '大雪',
      }),
      createSnowRegion({
        cityId: '2',
        cityName: '北京',
        latitude: 39.92,
        longitude: 116.42,
        snowLevel: '无',
      }),
    ]

    const result = filterNearbySnow(userLocation, regions, 500)
    expect(result).toHaveLength(1)
    expect(result[0].cityName).toBe('哈尔滨')
  })

  it('should filter out cities beyond the radius', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '近处城市',
        latitude: 39.91,
        longitude: 116.41,
        snowLevel: '小雪',
      }),
      createSnowRegion({
        cityId: '2',
        cityName: '远处城市',
        latitude: 31.2,
        longitude: 121.5, // Shanghai, ~1068 km away
        snowLevel: '大雪',
      }),
    ]

    const result = filterNearbySnow(userLocation, regions, 100)
    expect(result).toHaveLength(1)
    expect(result[0].cityName).toBe('近处城市')
  })

  it('should sort results by distance ascending', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '远',
        latitude: 40.5,
        longitude: 117.0,
        snowLevel: '小雪',
      }),
      createSnowRegion({
        cityId: '2',
        cityName: '近',
        latitude: 39.91,
        longitude: 116.41,
        snowLevel: '中雪',
      }),
      createSnowRegion({
        cityId: '3',
        cityName: '中',
        latitude: 40.1,
        longitude: 116.6,
        snowLevel: '大雪',
      }),
    ]

    const result = filterNearbySnow(userLocation, regions, 500)
    expect(result).toHaveLength(3)
    // Should be sorted by distance ascending
    expect(result[0].cityName).toBe('近')
    expect(result[1].cityName).toBe('中')
    expect(result[2].cityName).toBe('远')
    // Verify distances are in ascending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i].distance).toBeGreaterThanOrEqual(result[i - 1].distance)
    }
  })

  it('should include correct fields in NearbySnowResult', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: 'c1',
        cityName: '测试城市',
        latitude: 39.91,
        longitude: 116.41,
        snowLevel: '暴雪',
        temperature: -10,
      }),
    ]

    const result = filterNearbySnow(userLocation, regions, 500)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveProperty('cityId', 'c1')
    expect(result[0]).toHaveProperty('cityName', '测试城市')
    expect(result[0]).toHaveProperty('snowLevel', '暴雪')
    expect(result[0]).toHaveProperty('temperature', -10)
    expect(result[0]).toHaveProperty('distance')
    expect(result[0].distance).toBeGreaterThan(0)
  })

  it('should return empty array when all cities are not snowing', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '城市A',
        latitude: 39.91,
        longitude: 116.41,
        snowLevel: '无',
      }),
      createSnowRegion({
        cityId: '2',
        cityName: '城市B',
        latitude: 39.92,
        longitude: 116.42,
        snowLevel: '无',
      }),
    ]

    const result = filterNearbySnow(userLocation, regions, 500)
    expect(result).toHaveLength(0)
  })

  it('should include cities exactly at the radius boundary', () => {
    // Create a city that is exactly at a known distance
    // 1 degree of latitude ≈ 111 km
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '边界城市',
        latitude: 39.9,
        longitude: 116.4, // Same location = 0 distance
        snowLevel: '小雪',
      }),
    ]

    const result = filterNearbySnow(userLocation, regions, 0)
    // Distance is 0, radius is 0, 0 <= 0 is true
    expect(result).toHaveLength(1)
  })

  it('should not mutate the original snowRegions array', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '城市A',
        latitude: 40.0,
        longitude: 117.0,
        snowLevel: '大雪',
      }),
      createSnowRegion({
        cityId: '2',
        cityName: '城市B',
        latitude: 39.91,
        longitude: 116.41,
        snowLevel: '小雪',
      }),
    ]
    const originalLength = regions.length

    filterNearbySnow(userLocation, regions, 500)

    expect(regions).toHaveLength(originalLength)
  })
})

describe('findNearestSnow', () => {
  const userLocation: Location = { latitude: 39.9, longitude: 116.4 } // Beijing

  it('should return null when snowRegions is empty', () => {
    const result = findNearestSnow(userLocation, [])
    expect(result).toBeNull()
  })

  it('should return null when no cities are snowing', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '城市A',
        latitude: 39.91,
        longitude: 116.41,
        snowLevel: '无',
      }),
      createSnowRegion({
        cityId: '2',
        cityName: '城市B',
        latitude: 40.0,
        longitude: 117.0,
        snowLevel: '无',
      }),
    ]

    const result = findNearestSnow(userLocation, regions)
    expect(result).toBeNull()
  })

  it('should return the nearest snowing city', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '远处降雪',
        latitude: 45.75,
        longitude: 126.65, // Harbin, far away
        snowLevel: '大雪',
      }),
      createSnowRegion({
        cityId: '2',
        cityName: '近处降雪',
        latitude: 39.91,
        longitude: 116.41, // Very close
        snowLevel: '小雪',
      }),
      createSnowRegion({
        cityId: '3',
        cityName: '不下雪',
        latitude: 39.9,
        longitude: 116.4, // Same location but not snowing
        snowLevel: '无',
      }),
    ]

    const result = findNearestSnow(userLocation, regions)
    expect(result).not.toBeNull()
    expect(result!.cityName).toBe('近处降雪')
  })

  it('should skip non-snowing cities even if they are closer', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '最近但不下雪',
        latitude: 39.9,
        longitude: 116.4, // Same location
        snowLevel: '无',
      }),
      createSnowRegion({
        cityId: '2',
        cityName: '较远但下雪',
        latitude: 40.5,
        longitude: 117.0,
        snowLevel: '中雪',
      }),
    ]

    const result = findNearestSnow(userLocation, regions)
    expect(result).not.toBeNull()
    expect(result!.cityName).toBe('较远但下雪')
  })

  it('should return the only snowing city when there is just one', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '唯一降雪',
        latitude: 45.75,
        longitude: 126.65,
        snowLevel: '暴雪',
      }),
    ]

    const result = findNearestSnow(userLocation, regions)
    expect(result).not.toBeNull()
    expect(result!.cityName).toBe('唯一降雪')
    expect(result!.snowLevel).toBe('暴雪')
  })

  it('should return the full SnowRegion object', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: 'c1',
        cityName: '哈尔滨',
        province: '黑龙江',
        latitude: 45.75,
        longitude: 126.65,
        temperature: -20,
        snowLevel: '大雪',
        humidity: 85,
        windSpeed: 15,
        windDirection: '北',
        visibility: 2,
        updatedAt: '2024-01-15T10:00:00Z',
      }),
    ]

    const result = findNearestSnow(userLocation, regions)
    expect(result).not.toBeNull()
    expect(result!.cityId).toBe('c1')
    expect(result!.cityName).toBe('哈尔滨')
    expect(result!.province).toBe('黑龙江')
    expect(result!.temperature).toBe(-20)
    expect(result!.snowLevel).toBe('大雪')
  })

  it('should not mutate the original snowRegions array', () => {
    const regions: SnowRegion[] = [
      createSnowRegion({
        cityId: '1',
        cityName: '城市A',
        latitude: 40.0,
        longitude: 117.0,
        snowLevel: '大雪',
      }),
      createSnowRegion({
        cityId: '2',
        cityName: '城市B',
        latitude: 39.91,
        longitude: 116.41,
        snowLevel: '小雪',
      }),
    ]
    const originalLength = regions.length

    findNearestSnow(userLocation, regions)

    expect(regions).toHaveLength(originalLength)
  })
})
