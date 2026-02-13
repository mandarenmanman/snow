// 云函数: getMyFavorites
// 查询我的收藏列表，附带每个城市的实时天气和未来15天降雪预报
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const API_KEY = 'f27d9b38adcf4a36a09f6b6ab6133fd7'
const REQUEST_TIMEOUT = 10000
const WEATHER_API_BASE = 'https://nf5g7caymw.re.qweatherapi.com/v7'

function mapWeatherCodeToSnowLevel(code) {
  const map = {
    400: '小雪', 401: '中雪', 402: '大雪', 403: '暴雪',
    404: '小雪', 405: '小雪', 406: '小雪', 407: '小雪',
    408: '中雪', 409: '大雪', 410: '暴雪',
    456: '小雪', 457: '小雪', 499: '小雪',
  }
  return map[Number(code)] || '无'
}

function getStrongerSnowLevel(level1, level2) {
  const order = { '无': 0, '小雪': 1, '中雪': 2, '大雪': 3, '暴雪': 4 }
  return (order[level1] || 0) >= (order[level2] || 0) ? level1 : level2
}

function buildLocation(longitude, latitude, cityId) {
  if (longitude && latitude) return `${longitude},${latitude}`
  return cityId
}

/**
 * 查询单个城市的实时天气 + 未来15天降雪预报
 */
async function fetchWeatherInfo(longitude, latitude, cityId) {
  const location = buildLocation(longitude, latitude, cityId)
  const result = { snowStatus: '未知', temperature: '', weatherText: '', iconCode: '', snowForecast: null }

  try {
    const [nowRes, forecastRes] = await Promise.all([
      axios.get(`${WEATHER_API_BASE}/weather/now`, {
        params: { location, key: API_KEY },
        timeout: REQUEST_TIMEOUT,
      }),
      axios.get(`${WEATHER_API_BASE}/weather/15d`, {
        params: { location, key: API_KEY },
        timeout: REQUEST_TIMEOUT,
      }),
    ])

    if (nowRes.data.code === '200' && nowRes.data.now) {
      const now = nowRes.data.now
      result.snowStatus = mapWeatherCodeToSnowLevel(now.icon)
      result.temperature = now.temp
      result.weatherText = now.text || ''
      result.iconCode = now.icon || ''
    }

    if (forecastRes.data.code === '200' && forecastRes.data.daily) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const day of forecastRes.data.daily) {
        const daySnow = mapWeatherCodeToSnowLevel(day.iconDay)
        const nightSnow = mapWeatherCodeToSnowLevel(day.iconNight)
        const snowLevel = getStrongerSnowLevel(daySnow, nightSnow)

        if (snowLevel !== '无') {
          const forecastDate = new Date(day.fxDate)
          const diffDays = Math.round((forecastDate - today) / (1000 * 60 * 60 * 24))
          result.snowForecast = { daysFromNow: diffDays, snowLevel, date: day.fxDate }
          break
        }
      }
    }
  } catch (err) {
    console.warn(`fetchWeatherInfo failed for ${cityId}:`, err.message)
  }

  return result
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  if (!openId) {
    return { code: 401, message: '无法获取用户身份' }
  }

  try {
    const { data } = await db.collection('favorites')
      .where({ openId, subscribed: true })
      .orderBy('createdAt', 'desc')
      .get()

    // 并发查询每个收藏城市的天气
    const favorites = await Promise.all(
      data.map(async (item) => {
        const weather = await fetchWeatherInfo(item.longitude, item.latitude, item.cityId)
        return {
          cityId: item.cityId,
          cityName: item.cityName,
          latitude: item.latitude || 0,
          longitude: item.longitude || 0,
          subscribed: item.subscribed || false,
          snowStatus: weather.snowStatus,
          temperature: weather.temperature,
          weatherText: weather.weatherText,
          iconCode: weather.iconCode,
          snowForecast: weather.snowForecast,
        }
      })
    )

    return { code: 0, data: { favorites } }
  } catch (err) {
    console.error('getMyFavorites error:', err)
    return { code: 500, message: '服务器内部错误' }
  }
}
