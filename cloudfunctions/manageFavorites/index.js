// 云函数: manageFavorites
// 管理收藏城市（添加、移除、查询）
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const favoritesCollection = db.collection('favorites')

/**
 * 处理 add action：添加城市到收藏
 *
 * @param {string} openId - 用户 OpenID
 * @param {string} cityId - 城市 ID
 * @param {string} cityName - 城市名称
 * @param {number} [latitude] - 纬度
 * @param {number} [longitude] - 经度
 * @returns {Promise<Object>} 操作结果
 */
async function handleAddAction(openId, cityId, cityName, latitude, longitude) {
  // 检查是否已收藏（防止重复）
  const { data: existing } = await favoritesCollection
    .where({ openId, cityId })
    .get()

  if (existing.length > 0) {
    return { code: 0, message: '该城市已在收藏列表中' }
  }

  // 添加收藏记录
  await favoritesCollection.add({
    data: {
      openId,
      cityId,
      cityName,
      latitude: latitude || 0,
      longitude: longitude || 0,
      createdAt: new Date().toISOString(),
    },
  })

  return { code: 0, message: '收藏成功' }
}

/**
 * 处理 remove action：从收藏中移除城市
 *
 * 根据 openId 和 cityId 匹配并删除记录。
 *
 * @param {string} openId - 用户 OpenID
 * @param {string} cityId - 城市 ID
 * @returns {Promise<Object>} 操作结果
 */
async function handleRemoveAction(openId, cityId) {
  const { stats } = await favoritesCollection
    .where({ openId, cityId })
    .remove()

  if (stats.removed === 0) {
    return { code: 0, message: '该城市不在收藏列表中' }
  }

  return { code: 0, message: '取消收藏成功' }
}

/**
 * 处理 list action：获取用户的收藏列表
 *
 * 查询指定 openId 的所有收藏记录，返回收藏城市列表。
 * snowStatus 返回空字符串，由前端负责获取实时降雪状态。
 *
 * @param {string} openId - 用户 OpenID
 * @returns {Promise<Object>} 收藏列表响应
 */
async function handleListAction(openId) {
  const { data } = await favoritesCollection
    .where({ openId })
    .orderBy('createdAt', 'desc')
    .get()

  const favorites = data.map((item) => ({
    cityId: item.cityId,
    cityName: item.cityName,
    latitude: item.latitude || 0,
    longitude: item.longitude || 0,
    snowStatus: '',
  }))

  return {
    code: 0,
    data: {
      favorites,
    },
  }
}

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型: "add" | "remove" | "list"
 * @param {string} [event.cityId] - 城市 ID（add/remove 必填）
 * @param {string} [event.cityName] - 城市名称（add 必填）
 */
exports.main = async (event, context) => {
  const { action, cityId, cityName, latitude, longitude } = event
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  try {
    if (!openId) {
      return { code: 401, message: '无法获取用户身份' }
    }

    if (action === 'add') {
      if (!cityId) {
        return { code: 400, message: '缺少 cityId 参数' }
      }
      if (!cityName) {
        return { code: 400, message: '缺少 cityName 参数' }
      }
      return await handleAddAction(openId, cityId, cityName, latitude, longitude)
    } else if (action === 'remove') {
      if (!cityId) {
        return { code: 400, message: '缺少 cityId 参数' }
      }
      return await handleRemoveAction(openId, cityId)
    } else if (action === 'list') {
      return await handleListAction(openId)
    } else {
      return { code: 400, message: '无效的 action 参数' }
    }
  } catch (err) {
    console.error('manageFavorites error:', err)
    return { code: 500, message: '服务器内部错误' }
  }
}
