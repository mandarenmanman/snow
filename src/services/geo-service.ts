/**
 * 地理位置服务层
 *
 * 提供地理位置相关的计算和查询功能：
 * - calculateDistance: Haversine 公式计算两点间距离
 * - filterNearbySnow: 过滤指定半径内的降雪区域并按距离排序
 * - findNearestSnow: 查找最近的降雪城市
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import type { Location, NearbySnowResult, SnowRegion } from '@/models/types'

/** 地球平均半径（公里） */
const EARTH_RADIUS_KM = 6371

/**
 * 将角度转换为弧度
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * 使用 Haversine 公式计算两个地理坐标点之间的距离
 *
 * Haversine 公式考虑了地球的球面形状，适用于计算地球表面两点间的大圆距离。
 *
 * @param lat1 - 第一个点的纬度（度）
 * @param lon1 - 第一个点的经度（度）
 * @param lat2 - 第二个点的纬度（度）
 * @param lon2 - 第二个点的经度（度）
 * @returns 两点之间的距离（公里）
 *
 * Requirements: 3.1
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * c
}

/**
 * 过滤指定半径内的降雪区域并按距离升序排序
 *
 * 从给定的降雪区域列表中，筛选出：
 * 1. 正在下雪的城市（snowLevel !== "无"）
 * 2. 距离用户位置在指定半径内的城市
 *
 * 结果按距离由近到远排序。
 *
 * @param userLocation - 用户当前位置坐标
 * @param snowRegions - 降雪区域列表
 * @param radius - 搜索半径（公里）
 * @returns 附近降雪结果列表，按距离升序排列
 *
 * Requirements: 3.1, 3.2
 */
export function filterNearbySnow(
  userLocation: Location,
  snowRegions: SnowRegion[],
  radius: number,
): NearbySnowResult[] {
  const results: NearbySnowResult[] = []

  for (const region of snowRegions) {
    // 只包含正在下雪的城市
    if (region.snowLevel === '无') {
      continue
    }

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      region.latitude,
      region.longitude,
    )

    // 只包含在指定半径内的城市
    if (distance <= radius) {
      results.push({
        cityId: region.cityId,
        cityName: region.cityName,
        distance,
        snowLevel: region.snowLevel,
        temperature: region.temperature,
      })
    }
  }

  // 按距离升序排序
  results.sort((a, b) => a.distance - b.distance)

  return results
}

/**
 * 查找最近的降雪城市
 *
 * 从给定的降雪区域列表中，找到距离用户位置最近的正在下雪的城市。
 * 如果没有任何城市正在下雪，返回 null。
 *
 * @param userLocation - 用户当前位置坐标
 * @param snowRegions - 降雪区域列表
 * @returns 最近的降雪城市，如果没有降雪城市则返回 null
 *
 * Requirements: 3.3
 */
export function findNearestSnow(
  userLocation: Location,
  snowRegions: SnowRegion[],
): SnowRegion | null {
  let nearestRegion: SnowRegion | null = null
  let minDistance = Infinity

  for (const region of snowRegions) {
    // 只考虑正在下雪的城市
    if (region.snowLevel === '无') {
      continue
    }

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      region.latitude,
      region.longitude,
    )

    if (distance < minDistance) {
      minDistance = distance
      nearestRegion = region
    }
  }

  return nearestRegion
}
