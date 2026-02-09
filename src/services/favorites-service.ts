/**
 * 收藏管理服务层
 *
 * 提供收藏城市的添加、移除、查询和降雪提醒判断功能。
 * - addFavorite: 调用云函数添加收藏
 * - removeFavorite: 调用云函数移除收藏
 * - getFavorites: 获取收藏列表（附带降雪状态）
 * - checkSnowAlert: 判断是否需要发送降雪提醒（纯函数）
 *
 * 纯辅助函数（用于属性测试）：
 * - addFavoriteToList: 将城市添加到收藏列表
 * - removeFavoriteFromList: 从收藏列表中移除城市
 * - getFavoritesWithStatus: 为收藏列表附加降雪状态
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import type { City, FavoriteCity, SnowRegion } from '@/models/types'

/**
 * 调用云函数添加收藏
 *
 * 通过 wx.cloud.callFunction 调用 manageFavorites 云函数，
 * 将指定城市添加到用户的收藏列表中。
 *
 * @param openId - 用户 OpenID
 * @param city - 要收藏的城市信息
 *
 * Requirements: 5.1
 */
export async function addFavorite(openId: string, city: City): Promise<void> {
  // #ifdef MP-WEIXIN
  await wx.cloud.callFunction({
    name: 'manageFavorites',
    data: {
      action: 'add',
      cityId: city.cityId,
      openId,
    },
  })
  // #endif
}

/**
 * 调用云函数移除收藏
 *
 * 通过 wx.cloud.callFunction 调用 manageFavorites 云函数，
 * 将指定城市从用户的收藏列表中移除。
 *
 * @param openId - 用户 OpenID
 * @param cityId - 要移除的城市 ID
 *
 * Requirements: 5.4
 */
export async function removeFavorite(openId: string, cityId: string): Promise<void> {
  // #ifdef MP-WEIXIN
  await wx.cloud.callFunction({
    name: 'manageFavorites',
    data: {
      action: 'remove',
      cityId,
      openId,
    },
  })
  // #endif
}

/**
 * 获取收藏列表（附带降雪状态）
 *
 * 通过 wx.cloud.callFunction 调用 manageFavorites 云函数，
 * 获取用户的收藏城市列表。云函数返回的数据已包含降雪状态摘要。
 *
 * @param openId - 用户 OpenID
 * @returns 收藏城市列表
 *
 * Requirements: 5.2
 */
export async function getFavorites(openId: string): Promise<FavoriteCity[]> {
  // #ifdef MP-WEIXIN
  const res = await wx.cloud.callFunction({
    name: 'manageFavorites',
    data: {
      action: 'list',
      openId,
    },
  })

  const result = res.result as { favorites?: FavoriteCity[] }
  return result.favorites ?? []
  // #endif

  // #ifndef MP-WEIXIN
  return []
  // #endif
}

/**
 * 判断是否需要发送降雪提醒（纯函数）
 *
 * 当收藏城市的降雪状态从"无"变为任意降雪等级时，返回 true。
 * 其他状态变化（如从"小雪"变为"大雪"，或从"大雪"变为"无"）不触发提醒。
 *
 * @param _openId - 用户 OpenID（保留参数，用于未来扩展）
 * @param previousStatus - 之前的降雪状态
 * @param currentStatus - 当前的降雪状态
 * @returns 是否需要发送降雪提醒
 *
 * Requirements: 5.3
 */
export function checkSnowAlert(
  _openId: string,
  previousStatus: string,
  currentStatus: string,
): boolean {
  return previousStatus === '无' && currentStatus !== '无'
}

// ============================================================
// 纯辅助函数（用于属性测试，不涉及云函数调用）
// ============================================================

/**
 * 将城市添加到收藏列表（纯函数）
 *
 * 创建一个新的 FavoriteCity 对象并追加到列表末尾。
 * 如果城市已存在于列表中（根据 cityId 判断），不会重复添加。
 *
 * @param favorites - 当前收藏列表
 * @param city - 要添加的城市
 * @param openId - 用户 OpenID
 * @returns 添加后的新收藏列表
 *
 * Requirements: 5.1
 */
export function addFavoriteToList(
  favorites: FavoriteCity[],
  city: City,
  openId: string,
): FavoriteCity[] {
  // 如果城市已存在，直接返回原列表
  const exists = favorites.some((fav) => fav.cityId === city.cityId)
  if (exists) {
    return [...favorites]
  }

  const newFavorite: FavoriteCity = {
    _id: `${openId}_${city.cityId}`,
    openId,
    cityId: city.cityId,
    cityName: city.cityName,
    createdAt: new Date().toISOString(),
  }

  return [...favorites, newFavorite]
}

/**
 * 从收藏列表中移除城市（纯函数）
 *
 * 根据 cityId 从列表中移除对应的收藏记录。
 *
 * @param favorites - 当前收藏列表
 * @param cityId - 要移除的城市 ID
 * @returns 移除后的新收藏列表
 *
 * Requirements: 5.4
 */
export function removeFavoriteFromList(
  favorites: FavoriteCity[],
  cityId: string,
): FavoriteCity[] {
  return favorites.filter((fav) => fav.cityId !== cityId)
}

/**
 * 为收藏列表附加降雪状态（纯函数）
 *
 * 将收藏城市列表与降雪区域数据进行匹配，
 * 为每个收藏城市附加当前的降雪状态摘要。
 * 如果某个收藏城市在降雪区域数据中找不到匹配，降雪状态默认为"无"。
 *
 * @param favorites - 收藏城市列表
 * @param snowRegions - 降雪区域数据列表
 * @returns 附带降雪状态的收藏城市列表
 *
 * Requirements: 5.2
 */
export function getFavoritesWithStatus(
  favorites: FavoriteCity[],
  snowRegions: SnowRegion[],
): Array<FavoriteCity & { snowStatus: string }> {
  return favorites.map((fav) => {
    const matchingRegion = snowRegions.find(
      (region) => region.cityId === fav.cityId,
    )

    return {
      ...fav,
      snowStatus: matchingRegion ? matchingRegion.snowLevel : '无',
    }
  })
}
