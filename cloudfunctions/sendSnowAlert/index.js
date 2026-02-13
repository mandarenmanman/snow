// 云函数: sendSnowAlert
// 每天早上8点触发，查询订阅城市未来15天预报，有雪则推送提醒
const cloud = require('wx-server-sdk')
const axios = require('axios')

// 初始化 - 确保使用最新版本
cloud.init({
  env: 'cloud-8gtloz12c121c4fa',
  throwOnInvalidAppId: true // 添加这个选项有助于调试
})

const db = cloud.database()
const favoritesCollection = db.collection('favorites')

const API_KEY = 'f27d9b38adcf4a36a09f6b6ab6133fd7'
const REQUEST_TIMEOUT = 10000
const WEATHER_API_BASE = 'https://nf5g7caymw.re.qweatherapi.com/v7'
const TEMPLATE_ID = 'Qd_NN-RSHCa2reTPIC7MHo_PMwN0MLLK1Y4jfYlAths'

/**
 * 模板字段（模板编号 482 — 天气提醒）：
 * date1             — 日期
 * phrase2           — 城市（≤5字）
 * phrase3           — 天气（≤5字）
 * character_string4 — 温度
 * thing5            — 温馨提示（≤20字）
 */

function mapWeatherCodeToSnowLevel(code) {
  const n = Number(code)
  if (n >= 400 && n <= 402) return '小雪'
  if (n >= 403 && n <= 404) return '中雪'
  if (n >= 405 && n <= 406) return '大雪'
  if (n >= 407 && n <= 410) return '暴雪'
  return '无'
}

function getStrongerSnowLevel(a, b) {
  const order = { '无': 0, '小雪': 1, '中雪': 2, '大雪': 3, '暴雪': 4 }
  return (order[a] || 0) >= (order[b] || 0) ? a : b
}

/** 查询15天预报，返回最近一次降雪信息 */
async function fetchSnowForecast(cityId) {
  const res = await axios.get(`${WEATHER_API_BASE}/weather/15d`, {
    params: { location: cityId, key: API_KEY },
    timeout: REQUEST_TIMEOUT,
  })
  if (res.data.code !== '200' || !res.data.daily) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const day of res.data.daily) {
    const daySnow = mapWeatherCodeToSnowLevel(day.iconDay)
    const nightSnow = mapWeatherCodeToSnowLevel(day.iconNight)
    const snowLevel = getStrongerSnowLevel(daySnow, nightSnow)

    if (snowLevel !== '无') {
      const forecastDate = new Date(day.fxDate)
      const daysFromNow = Math.round((forecastDate - today) / (1000 * 60 * 60 * 24))
      return {
        snowLevel,
        date: day.fxDate,
        daysFromNow,
        tempMin: day.tempMin,
        tempMax: day.tempMax,
      }
    }
  }
  return null
}

/** 查询所有已订阅城市（去重） */
async function getSubscribedCities() {
  const MAX_LIMIT = 100
  let all = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data } = await favoritesCollection
      .where({ subscribed: true })
      .skip(offset)
      .limit(MAX_LIMIT)
      .get()
    all = all.concat(data)
    offset += data.length
    hasMore = data.length === MAX_LIMIT
  }

  const cityMap = new Map()
  for (const fav of all) {
    if (!cityMap.has(fav.cityId)) {
      cityMap.set(fav.cityId, fav.cityName)
    }
  }
  return Array.from(cityMap.entries()).map(([cityId, cityName]) => ({ cityId, cityName }))
}

/** 查询订阅了指定城市的用户 openId 列表 */
async function getUsersForCity(cityId) {
  const MAX_LIMIT = 100
  let all = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data } = await favoritesCollection
      .where({ cityId, subscribed: true })
      .skip(offset)
      .limit(MAX_LIMIT)
      .get()
    all = all.concat(data)
    offset += data.length
    hasMore = data.length === MAX_LIMIT
  }

  return [...new Set(all.map((r) => r.openId))]
}

function formatDayLabel(daysFromNow) {
  if (daysFromNow === 0) return '今天'
  if (daysFromNow === 1) return '明天'
  if (daysFromNow === 2) return '后天'
  return `${daysFromNow}天后`
}

// 在发送消息时添加错误处理
async function sendSubscriptionMessage(openId, cityId, cityName, snowLevel, daysFromNow, tempMin, tempMax) {
  const dayLabel = formatDayLabel(daysFromNow)
  try {
    // 确保 cloud.openapi 存在
    if (!cloud.openapi) {
      console.error('cloud.openapi 未初始化')
      return false
    }

    const result = await cloud.openapi.subscribeMessage.send({
      touser: openId,
      templateId: TEMPLATE_ID,
      page: `/pages/detail/detail?cityId=${cityId}&cityName=${encodeURIComponent(cityName)}`,
      data: {
        date1: { value: new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) },
        phrase2: { value: cityName.slice(0, 5) },
        phrase3: { value: snowLevel },
        character_string4: { value: `${tempMin}~${tempMax}°C` },
        thing5: { value: `${cityName}${dayLabel}有${snowLevel}，注意保暖` },
      },
    })
    console.log(`Alert sent to ${openId}:`, result)
    return true
  } catch (err) {
    console.warn(`Failed to send to ${openId}:`, err)
    console.warn('错误详情:', err.errCode, err.errMsg)
    return false
  }
}

exports.main = async (event, context) => {

  // 添加调试信息，确认云调用是否可用
  console.log('云函数开始执行')
  console.log('cloud.openapi 是否存在:', !!cloud.openapi)
  console.log('环境信息:', process.env)
  let alertsSent = 0

  try {
    const cities = await getSubscribedCities()
    console.log(`Found ${cities.length} subscribed cities`)

    if (cities.length === 0) {
      return { code: 0, message: '无订阅城市', alertsSent: 0 }
    }

    for (const city of cities) {
      try {
        const snow = await fetchSnowForecast(city.cityId)
        if (!snow) continue

        console.log(`${city.cityName} ${formatDayLabel(snow.daysFromNow)}有${snow.snowLevel}，开始推送`)
        const userOpenIds = await getUsersForCity(city.cityId)

        for (const openId of userOpenIds) {
          const ok = await sendSubscriptionMessage(
            openId, city.cityId, city.cityName,
            snow.snowLevel, snow.daysFromNow, snow.tempMin, snow.tempMax
          )
          if (ok) alertsSent++
        }
      } catch (err) {
        console.warn(`处理 ${city.cityName} 失败:`, err.message)
      }
    }

    console.log(`完成，共发送 ${alertsSent} 条提醒`)
    return { code: 0, message: '降雪提醒检查完成', alertsSent }
  } catch (err) {
    console.error('sendSnowAlert error:', err)
    return { code: 500, message: '服务器内部错误' }
  }
}
