// 云函数: manageFavorites
// 管理收藏城市（添加、移除、订阅开关）
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const favoritesCollection = db.collection('favorites')

async function handleAddAction(openId, cityId, cityName, latitude, longitude) {
  const { data: existing } = await favoritesCollection
    .where({ openId, cityId })
    .get()

  if (existing.length > 0) {
    return { code: 0, message: '该城市已在收藏列表中' }
  }

  await favoritesCollection.add({
    data: {
      openId,
      cityId,
      cityName,
      latitude: latitude || 0,
      longitude: longitude || 0,
      subscribed: false,
      createdAt: new Date().toISOString(),
    },
  })

  return { code: 0, message: '收藏成功' }
}

async function handleRemoveAction(openId, cityId) {
  const { stats } = await favoritesCollection
    .where({ openId, cityId })
    .remove()

  if (stats.removed === 0) {
    return { code: 0, message: '该城市不在收藏列表中' }
  }

  return { code: 0, message: '取消收藏成功' }
}
