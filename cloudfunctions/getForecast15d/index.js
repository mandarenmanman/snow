// 云函数: getForecast15d
// 查询单个城市的实时天气 + 未来15天预报
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

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

function buildSnowPeriod(daySnow, nightSnow) {
  const hasDay = daySnow !== '无'
  const hasNight = nightSnow !== '无'
  if (hasDay && hasNight) return '全天'
  if (hasDay) return '白天'
  if (hasNight) return '夜间'
  return '无降雪'
}

function buildLocation({ cityId, longitude, latitude }) {
  if (longitude && latitude) return `${longitude},${latitude}`
  return cityId
}

/**
 * 云函数入口
 * @param {Object} event
 * @param {string} event.cityId - 城市 ID
 * @param {number} [event.longitude] - 经度
 * @param {number} [event.latitude] - 纬度
 */
exports.main = async (event, context) => {
  const { cityId, longitude, latitude } = event

  if (!cityId) {
    return { code: 400, message: '缺少 cityId 参数' }
  }

  const location = buildLocation({ cityId, longitude, latitude })

  try {
    // 并发请求实时天气和15天预报
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

    if (nowRes.data.code !== '200') {
      throw new Error(`QWeather now API error: code=${nowRes.data.code}`)
    }

    const weatherNow = nowRes.data.now
    const snowLevel = mapWeatherCodeToSnowLevel(weatherNow.icon)

    const current = {
      temperature: Number(weatherNow.temp),
      humidity: Number(weatherNow.humidity),
      windSpeed: Number(weatherNow.windSpeed),
      windDirection: weatherNow.windDir || '',
      snowLevel,
      visibility: Number(weatherNow.vis),
      weatherText: weatherNow.text || '',
      iconCode: weatherNow.icon || '',
    }

    // 组装15天预报
    const daily = (forecastRes.data.code === '200' && forecastRes.data.daily) ? forecastRes.data.daily : []
    const forecast = daily.map((day) => {
      const daySnowLevel = mapWeatherCodeToSnowLevel(day.iconDay)
      const nightSnowLevel = mapWeatherCodeToSnowLevel(day.iconNight)
      const effectiveSnowLevel = getStrongerSnowLevel(daySnowLevel, nightSnowLevel)

      return {
        date: day.fxDate,
        snowLevel: effectiveSnowLevel,
        snowPeriod: buildSnowPeriod(daySnowLevel, nightSnowLevel),
        accumulation: Number(day.precip) || 0,
        tempHigh: Number(day.tempMax),
        tempLow: Number(day.tempMin),
        weatherTextDay: day.textDay || '',
        weatherTextNight: day.textNight || '',
        windDirDay: day.windDirDay || '',
        windScaleDay: day.windScaleDay || '',
        iconDay: day.iconDay || '',
      }
    })

    return {
      code: 0,
      data: {
        cityId,
        current,
        forecast,
        updatedAt: weatherNow.obsTime || new Date().toISOString(),
      },
    }
  } catch (err) {
    console.error('getForecast15d error:', err)
    return { code: 500, message: '服务器内部错误', error: err.message }
  }
}
