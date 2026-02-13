// 云函数: sendSnowAlert
// 定时触发，检查收藏城市降雪状态变化，发送微信订阅消息
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/** 收藏记录集合 */
const favoritesCollection = db.collection('favorites')

/** 降雪状态记录集合 */
const snowStatusCollection = db.collection('snow_status')

/** 和风天气 API 密钥 */
const API_KEY = 'f27d9b38adcf4a36a09f6b6ab6133fd7'

/** API 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 10000

/** 和风天气 API 基础 URL */
const WEATHER_API_BASE = 'https://nf5g7caymw.re.qweatherapi.com/v7'

/** 订阅消息模板 ID（需要在微信公众平台「订阅消息」中配置） */
const TEMPLATE_ID = 'Qd_NN-RSHCa2reTPIC7MHo_PMwN0MLLK1Y4jfYlAths'

/**
 * 模板字段对应（模板编号 482 — 天气提醒）：
 * date1             — 日期
 * phrase2           — 城市（≤5字）
 * phrase3           — 天气（≤5字）
 * character_string4 — 温度
 * thing5            — 温馨提示（≤20字）
 */

/**
 * 将和风天气天气代码映射为降雪等级
 *
 * 和风天气降雪相关天气代码:
 * - 400, 401, 402: 小雪
 * - 403, 404: 中雪
 * - 405, 406: 大雪
 * - 407, 408, 409, 410: 暴雪
 *
 * @param {number|string} code - 和风天气天气代码
 * @returns {string} 降雪等级
 */
function mapWeatherCodeToSnowLevel(code) {
  const numCode = Number(code)
  if (numCode >= 400 && numCode <= 402) return '小雪'
  if (numCode >= 403 && numCode <= 404) return '中雪'
  if (numCode >= 405 && numCode <= 406) return '大雪'
  if (numCode >= 407 && numCode <= 410) return '暴雪'
  return '无'
}


/**
 * 调用和风天气实时天气 API
 *
 * @param {string} cityId - 城市 ID
 * @returns {Promise<Object>} 实时天气数据
 */
async function fetchCurrentWeather(cityId) {
  const url = `${WEATHER_API_BASE}/weather/now`
  const response = await axios.get(url, {
    params: { location: cityId, key: API_KEY },
    timeout: REQUEST_TIMEOUT,
  })

  if (response.data.code !== '200') {
    throw new Error(`QWeather API error: code=${response.data.code}`)
  }

  return response.data.now
}

/**
 * 查询所有收藏记录中的唯一城市列表
 *
 * 由于云数据库单次查询最多返回 100 条记录，
 * 使用分页查询获取所有收藏记录，然后按 cityId 去重。
 *
 * @returns {Promise<Array<{cityId: string, cityName: string}>>} 唯一城市列表
 */
async function getUniqueFavoritedCities() {
  const MAX_LIMIT = 100
  let allFavorites = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data } = await favoritesCollection
      .skip(offset)
      .limit(MAX_LIMIT)
      .get()

    allFavorites = allFavorites.concat(data)
    offset += data.length
    hasMore = data.length === MAX_LIMIT
  }

  // 按 cityId 去重，保留 cityName
  const cityMap = new Map()
  for (const fav of allFavorites) {
    if (!cityMap.has(fav.cityId)) {
      cityMap.set(fav.cityId, fav.cityName)
    }
  }

  return Array.from(cityMap.entries()).map(([cityId, cityName]) => ({
    cityId,
    cityName,
  }))
}

/**
 * 获取城市上次已知的降雪状态
 *
 * 从 snow_status 集合中查询指定城市的上次降雪状态。
 * 如果没有记录，返回 "无"（表示之前未跟踪过该城市）。
 *
 * @param {string} cityId - 城市 ID
 * @returns {Promise<string>} 上次已知的降雪等级
 */
async function getPreviousSnowStatus(cityId) {
  const { data } = await snowStatusCollection
    .where({ cityId })
    .get()

  if (data.length === 0) {
    return '无'
  }

  return data[0].snowLevel || '无'
}


/**
 * 更新城市的降雪状态记录
 *
 * 如果 snow_status 集合中已有该城市的记录，则更新；
 * 否则插入新记录。
 *
 * @param {string} cityId - 城市 ID
 * @param {string} snowLevel - 当前降雪等级
 */
async function updateSnowStatus(cityId, snowLevel) {
  const { data } = await snowStatusCollection
    .where({ cityId })
    .get()

  if (data.length > 0) {
    // 更新已有记录
    await snowStatusCollection
      .where({ cityId })
      .update({
        data: {
          snowLevel,
          updatedAt: new Date().toISOString(),
        },
      })
  } else {
    // 插入新记录
    await snowStatusCollection.add({
      data: {
        cityId,
        snowLevel,
        updatedAt: new Date().toISOString(),
      },
    })
  }
}

/**
 * 查询收藏了指定城市且开启了订阅的用户 openId 列表
 *
 * @param {string} cityId - 城市 ID
 * @returns {Promise<string[]>} 用户 openId 列表
 */
async function getUsersForCity(cityId) {
  const MAX_LIMIT = 100
  let allRecords = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data } = await favoritesCollection
      .where({ cityId, subscribed: true })
      .skip(offset)
      .limit(MAX_LIMIT)
      .get()

    allRecords = allRecords.concat(data)
    offset += data.length
    hasMore = data.length === MAX_LIMIT
  }

  // 提取唯一的 openId
  const openIdSet = new Set(allRecords.map((record) => record.openId))
  return Array.from(openIdSet)
}

/**
 * 向用户发送降雪提醒订阅消息
 *
 * @param {string} openId - 用户 OpenID
 * @param {string} cityId - 城市 ID
 * @param {string} cityName - 城市名称
 * @param {string} snowLevel - 降雪等级
 * @param {string} temperature - 当前温度
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendSubscriptionMessage(openId, cityId, cityName, snowLevel, temperature) {
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: openId,
      templateId: TEMPLATE_ID,
      page: `/pages/detail/detail?cityId=${cityId}&cityName=${encodeURIComponent(cityName)}`,
      data: {
        date1: { value: new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) },
        phrase2: { value: cityName.slice(0, 5) },
        phrase3: { value: snowLevel },
        character_string4: { value: `${temperature}°C` },
        thing5: { value: `${cityName}正在下${snowLevel}，注意保暖` },
      },
    })
    console.log(`Alert sent to ${openId} for ${cityName} (${snowLevel})`)
    return true
  } catch (err) {
    console.warn(`Failed to send alert to ${openId} for ${cityName}:`, err.message)
    return false
  }
}


/**
 * 判断是否需要发送降雪提醒
 *
 * 当城市的降雪状态从"无"变为任意降雪等级时，返回 true。
 * 其他状态变化（如从"小雪"变为"大雪"，或从"大雪"变为"无"）不触发提醒。
 *
 * @param {string} previousStatus - 之前的降雪状态
 * @param {string} currentStatus - 当前的降雪状态
 * @returns {boolean} 是否需要发送降雪提醒
 */
function checkSnowAlert(previousStatus, currentStatus) {
  return previousStatus === '无' && currentStatus !== '无'
}

/**
 * 云函数入口
 * 定时触发，检查收藏城市降雪状态变化，发送微信订阅消息
 *
 * 执行流程：
 * 1. 查询所有收藏记录中的唯一城市列表
 * 2. 对每个城市，调用和风天气 API 获取当前天气
 * 3. 将当前降雪状态与 snow_status 集合中的上次状态对比
 * 4. 如果状态从"无"变为降雪，向所有收藏该城市的用户发送订阅消息
 * 5. 更新 snow_status 集合中的状态记录
 *
 * @param {Object} event - 定时触发器事件参数
 * @param {Object} context - 云函数上下文
 */
exports.main = async (event, context) => {
  let alertsSent = 0

  try {
    // 1. 查询所有收藏记录中的唯一城市列表
    const uniqueCities = await getUniqueFavoritedCities()
    console.log(`Found ${uniqueCities.length} unique favorited cities`)

    if (uniqueCities.length === 0) {
      return {
        code: 0,
        message: '无收藏城市，跳过检查',
        alertsSent: 0,
      }
    }

    // 2. 逐个城市检查降雪状态变化
    for (const city of uniqueCities) {
      try {
        // 获取当前天气数据
        const weatherNow = await fetchCurrentWeather(city.cityId)
        const currentSnowLevel = mapWeatherCodeToSnowLevel(weatherNow.icon)

        // 获取上次已知的降雪状态
        const previousSnowLevel = await getPreviousSnowStatus(city.cityId)

        // 判断是否需要发送提醒（状态从"无"变为降雪）
        if (checkSnowAlert(previousSnowLevel, currentSnowLevel)) {
          console.log(
            `Snow alert triggered for ${city.cityName}: ${previousSnowLevel} -> ${currentSnowLevel}`
          )

          // 查询所有收藏了该城市的用户
          const userOpenIds = await getUsersForCity(city.cityId)

          // 向每个用户发送订阅消息
          for (const openId of userOpenIds) {
            const success = await sendSubscriptionMessage(
              openId,
              city.cityId,
              city.cityName,
              currentSnowLevel,
              weatherNow.temp || ''
            )
            if (success) {
              alertsSent++
            }
          }
        }

        // 更新 snow_status 集合中的状态记录
        await updateSnowStatus(city.cityId, currentSnowLevel)
      } catch (err) {
        // 单个城市处理失败不影响其他城市
        console.warn(`Failed to process city ${city.cityName}:`, err.message)
      }
    }

    console.log(`Snow alert check completed. Alerts sent: ${alertsSent}`)

    return {
      code: 0,
      message: '降雪提醒检查完成',
      alertsSent,
    }
  } catch (err) {
    console.error('sendSnowAlert error:', err)
    return { code: 500, message: '服务器内部错误' }
  }
}
