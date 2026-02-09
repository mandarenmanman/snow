import { describe, it, expect } from 'vitest'
import { createSnowRegion } from '@/models/factories'
import {
  checkSnowAlert,
  addFavoriteToList,
  removeFavoriteFromList,
  getFavoritesWithStatus,
} from '@/services/favorites-service'
import type { City, FavoriteCity, SnowLevel } from '@/models/types'

// ============================================================
// Helper: create a FavoriteCity for testing
// ============================================================
function makeFavorite(overrides: Partial<FavoriteCity> = {}): FavoriteCity {
  return {
    _id: overrides._id ?? 'fav_1',
    openId: overrides.openId ?? 'user_001',
    cityId: overrides.cityId ?? 'city_1',
    cityName: overrides.cityName ?? '哈尔滨',
    createdAt: overrides.createdAt ?? '2024-01-15T10:00:00Z',
  }
}

// ============================================================
// checkSnowAlert
// ============================================================
describe('checkSnowAlert', () => {
  it('should return true when status changes from "无" to "小雪"', () => {
    expect(checkSnowAlert('user_001', '无', '小雪')).toBe(true)
  })

  it('should return true when status changes from "无" to "中雪"', () => {
    expect(checkSnowAlert('user_001', '无', '中雪')).toBe(true)
  })

  it('should return true when status changes from "无" to "大雪"', () => {
    expect(checkSnowAlert('user_001', '无', '大雪')).toBe(true)
  })

  it('should return true when status changes from "无" to "暴雪"', () => {
    expect(checkSnowAlert('user_001', '无', '暴雪')).toBe(true)
  })

  it('should return false when status stays "无"', () => {
    expect(checkSnowAlert('user_001', '无', '无')).toBe(false)
  })

  it('should return false when status changes from "小雪" to "大雪"', () => {
    expect(checkSnowAlert('user_001', '小雪', '大雪')).toBe(false)
  })

  it('should return false when status changes from "大雪" to "无"', () => {
    expect(checkSnowAlert('user_001', '大雪', '无')).toBe(false)
  })

  it('should return false when status stays at a snow level', () => {
    expect(checkSnowAlert('user_001', '中雪', '中雪')).toBe(false)
  })

  it('should return true for any non-"无" currentStatus when previousStatus is "无"', () => {
    const snowLevels: SnowLevel[] = ['小雪', '中雪', '大雪', '暴雪']
    for (const level of snowLevels) {
      expect(checkSnowAlert('user_001', '无', level)).toBe(true)
    }
  })
})

// ============================================================
// addFavoriteToList
// ============================================================
describe('addFavoriteToList', () => {
  const city: City = { cityId: 'city_1', cityName: '哈尔滨', province: '黑龙江' }

  it('should add a city to an empty favorites list', () => {
    const result = addFavoriteToList([], city, 'user_001')

    expect(result).toHaveLength(1)
    expect(result[0].cityId).toBe('city_1')
    expect(result[0].cityName).toBe('哈尔滨')
    expect(result[0].openId).toBe('user_001')
  })

  it('should append the city to the end of the list', () => {
    const existing = [makeFavorite({ cityId: 'city_0', cityName: '北京' })]
    const result = addFavoriteToList(existing, city, 'user_001')

    expect(result).toHaveLength(2)
    expect(result[0].cityId).toBe('city_0')
    expect(result[1].cityId).toBe('city_1')
  })

  it('should not add a duplicate city (same cityId)', () => {
    const existing = [makeFavorite({ cityId: 'city_1', cityName: '哈尔滨' })]
    const result = addFavoriteToList(existing, city, 'user_001')

    expect(result).toHaveLength(1)
  })

  it('should not mutate the original list', () => {
    const existing = [makeFavorite({ cityId: 'city_0', cityName: '北京' })]
    const originalLength = existing.length

    addFavoriteToList(existing, city, 'user_001')

    expect(existing).toHaveLength(originalLength)
  })

  it('should set _id as openId_cityId', () => {
    const result = addFavoriteToList([], city, 'user_001')
    expect(result[0]._id).toBe('user_001_city_1')
  })

  it('should set createdAt to a valid ISO 8601 string', () => {
    const result = addFavoriteToList([], city, 'user_001')
    const date = new Date(result[0].createdAt)
    expect(date.getTime()).not.toBeNaN()
  })
})

// ============================================================
// removeFavoriteFromList
// ============================================================
describe('removeFavoriteFromList', () => {
  it('should remove a city by cityId', () => {
    const favorites = [
      makeFavorite({ cityId: 'city_1', cityName: '哈尔滨' }),
      makeFavorite({ cityId: 'city_2', cityName: '长春', _id: 'fav_2' }),
    ]

    const result = removeFavoriteFromList(favorites, 'city_1')

    expect(result).toHaveLength(1)
    expect(result[0].cityId).toBe('city_2')
  })

  it('should return empty array when removing the only item', () => {
    const favorites = [makeFavorite({ cityId: 'city_1' })]
    const result = removeFavoriteFromList(favorites, 'city_1')
    expect(result).toHaveLength(0)
  })

  it('should return the same list when cityId is not found', () => {
    const favorites = [
      makeFavorite({ cityId: 'city_1' }),
      makeFavorite({ cityId: 'city_2', _id: 'fav_2' }),
    ]

    const result = removeFavoriteFromList(favorites, 'city_999')

    expect(result).toHaveLength(2)
  })

  it('should return empty array when list is empty', () => {
    const result = removeFavoriteFromList([], 'city_1')
    expect(result).toHaveLength(0)
  })

  it('should not mutate the original list', () => {
    const favorites = [
      makeFavorite({ cityId: 'city_1' }),
      makeFavorite({ cityId: 'city_2', _id: 'fav_2' }),
    ]
    const originalLength = favorites.length

    removeFavoriteFromList(favorites, 'city_1')

    expect(favorites).toHaveLength(originalLength)
  })

  it('should preserve order of remaining items', () => {
    const favorites = [
      makeFavorite({ cityId: 'city_1', cityName: 'A', _id: 'fav_1' }),
      makeFavorite({ cityId: 'city_2', cityName: 'B', _id: 'fav_2' }),
      makeFavorite({ cityId: 'city_3', cityName: 'C', _id: 'fav_3' }),
    ]

    const result = removeFavoriteFromList(favorites, 'city_2')

    expect(result).toHaveLength(2)
    expect(result[0].cityName).toBe('A')
    expect(result[1].cityName).toBe('C')
  })
})

// ============================================================
// getFavoritesWithStatus
// ============================================================
describe('getFavoritesWithStatus', () => {
  it('should attach snowStatus from matching SnowRegion', () => {
    const favorites = [makeFavorite({ cityId: 'city_1', cityName: '哈尔滨' })]
    const snowRegions = [
      createSnowRegion({ cityId: 'city_1', cityName: '哈尔滨', snowLevel: '大雪' }),
    ]

    const result = getFavoritesWithStatus(favorites, snowRegions)

    expect(result).toHaveLength(1)
    expect(result[0].snowStatus).toBe('大雪')
    expect(result[0].cityId).toBe('city_1')
  })

  it('should default snowStatus to "无" when no matching region', () => {
    const favorites = [makeFavorite({ cityId: 'city_1', cityName: '哈尔滨' })]
    const snowRegions = [
      createSnowRegion({ cityId: 'city_2', cityName: '长春', snowLevel: '小雪' }),
    ]

    const result = getFavoritesWithStatus(favorites, snowRegions)

    expect(result).toHaveLength(1)
    expect(result[0].snowStatus).toBe('无')
  })

  it('should handle empty favorites list', () => {
    const snowRegions = [
      createSnowRegion({ cityId: 'city_1', snowLevel: '大雪' }),
    ]

    const result = getFavoritesWithStatus([], snowRegions)
    expect(result).toHaveLength(0)
  })

  it('should handle empty snowRegions list', () => {
    const favorites = [makeFavorite({ cityId: 'city_1' })]

    const result = getFavoritesWithStatus(favorites, [])

    expect(result).toHaveLength(1)
    expect(result[0].snowStatus).toBe('无')
  })

  it('should attach correct status for multiple favorites', () => {
    const favorites = [
      makeFavorite({ cityId: 'city_1', cityName: '哈尔滨', _id: 'fav_1' }),
      makeFavorite({ cityId: 'city_2', cityName: '长春', _id: 'fav_2' }),
      makeFavorite({ cityId: 'city_3', cityName: '北京', _id: 'fav_3' }),
    ]
    const snowRegions = [
      createSnowRegion({ cityId: 'city_1', snowLevel: '暴雪' }),
      createSnowRegion({ cityId: 'city_3', snowLevel: '小雪' }),
    ]

    const result = getFavoritesWithStatus(favorites, snowRegions)

    expect(result).toHaveLength(3)
    expect(result[0].snowStatus).toBe('暴雪')
    expect(result[1].snowStatus).toBe('无')  // city_2 not in snowRegions
    expect(result[2].snowStatus).toBe('小雪')
  })

  it('should preserve all FavoriteCity fields', () => {
    const fav = makeFavorite({
      _id: 'fav_test',
      openId: 'user_test',
      cityId: 'city_test',
      cityName: '测试城市',
      createdAt: '2024-06-01T00:00:00Z',
    })
    const snowRegions = [
      createSnowRegion({ cityId: 'city_test', snowLevel: '中雪' }),
    ]

    const result = getFavoritesWithStatus([fav], snowRegions)

    expect(result[0]._id).toBe('fav_test')
    expect(result[0].openId).toBe('user_test')
    expect(result[0].cityId).toBe('city_test')
    expect(result[0].cityName).toBe('测试城市')
    expect(result[0].createdAt).toBe('2024-06-01T00:00:00Z')
    expect(result[0].snowStatus).toBe('中雪')
  })

  it('should not mutate the original favorites or snowRegions arrays', () => {
    const favorites = [makeFavorite({ cityId: 'city_1' })]
    const snowRegions = [
      createSnowRegion({ cityId: 'city_1', snowLevel: '大雪' }),
    ]
    const favLength = favorites.length
    const regLength = snowRegions.length

    getFavoritesWithStatus(favorites, snowRegions)

    expect(favorites).toHaveLength(favLength)
    expect(snowRegions).toHaveLength(regLength)
  })
})
