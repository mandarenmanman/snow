// 云函数: getSnowData
// 获取降雪数据（列表和详情）
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/** 和风天气 API 密钥 */
const API_KEY = 'f27d9b38adcf4a36a09f6b6ab6133fd7'

/** API 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 10000

/** 和风天气 API 基础 URL */
const WEATHER_API_BASE = 'https://nf5g7caymw.re.qweatherapi.com/v7'

/**
 * 从数据库读取城市列表
 * 集合: cities
 *
 * @param {Object} [filter] - 可选过滤条件，直接传给 where()
 * @returns {Promise<Array>} 城市列表
 */
async function loadCitiesFromDB(filter) {
  const MAX_LIMIT = 100
  let allCities = []
  let offset = 0

  // 分页读取，云数据库单次最多 100 条
  while (true) {
    let query = db.collection('cities')
    if (filter) query = query.where(filter)
    const { data } = await query.skip(offset).limit(MAX_LIMIT).get()

    allCities = allCities.concat(data)
    if (data.length < MAX_LIMIT) break
    offset += MAX_LIMIT
  }

  return allCities.map((c) => ({
    cityId: c.cityId,
    cityName: c.cityName,
    province: c.province || '',
    latitude: c.latitude || 0,
    longitude: c.longitude || 0,
    isHot: c.isHot || false,
    isShow: c.isShow !== false,
    scenics: c.scenics || [],
  }))
}

/**
 * 将和风天气天气代码映射为降雪等级
 *
 * 和风天气降雪相关天气代码:
 * - 400: 小雪
 * - 401, 408: 中雪（含小到中雪）
 * - 402, 409: 大雪（含中到大雪）
 * - 403, 410: 暴雪（含大到暴雪）
 * - 404, 405, 406, 456: 雨夹雪类 → 小雪
 * - 407, 457: 阵雪 → 小雪
 * - 499: 雪 → 小雪
 *
 * @param {number|string} code - 和风天气天气代码
 * @returns {string} 降雪等级
 */
function mapWeatherCodeToSnowLevel(code) {
  const map = {
    400: '小雪',
    401: '中雪',
    402: '大雪',
    403: '暴雪',
    404: '小雪',   // 雨夹雪
    405: '小雪',   // 雨雪天气
    406: '小雪',   // 阵雨夹雪
    407: '小雪',   // 阵雪
    408: '中雪',   // 小到中雪
    409: '大雪',   // 中到大雪
    410: '暴雪',   // 大到暴雪
    456: '小雪',   // 阵雨夹雪
    457: '小雪',   // 阵雪
    499: '小雪',   // 雪
  }
  return map[Number(code)] || '无'
}

/**
 * 构建和风天气 location 参数
 * 优先使用经纬度（格式: "经度,纬度"），回退到 cityId
 *
 * @param {Object} params
 * @param {string} [params.cityId]
 * @param {number} [params.longitude]
 * @param {number} [params.latitude]
 * @returns {string}
 */
function buildLocation({ cityId, longitude, latitude }) {
  if (longitude && latitude) {
    return `${longitude},${latitude}`
  }
  return cityId
}

/**
 * 调用和风天气实时天气 API
 *
 * @param {string} location - 经纬度或城市 ID
 * @returns {Promise<Object>} 实时天气数据
 */
async function fetchCurrentWeather(location) {
  const url = `${WEATHER_API_BASE}/weather/now`
  const response = await axios.get(url, {
    params: { location, key: API_KEY },
    timeout: REQUEST_TIMEOUT,
  })

  if (response.data.code !== '200') {
    throw new Error(`QWeather API error: code=${response.data.code}`)
  }

  return response.data.now
}

/**
 * 调用和风天气 3 天预报 API
 *
 * @param {string} location - 经纬度或城市 ID
 * @returns {Promise<Array>} 3 天预报数据
 */
async function fetchForecast3d(location) {
  const url = `${WEATHER_API_BASE}/weather/3d`
  const response = await axios.get(url, {
    params: { location, key: API_KEY },
    timeout: REQUEST_TIMEOUT,
  })

  if (response.data.code !== '200') {
    throw new Error(`QWeather API error: code=${response.data.code}`)
  }

  return response.data.daily || []
}

/**
 * 处理 cities action：返回前端展示的城市列表（isShow === true）
 */
async function handleCitiesAction() {
  const cities = await loadCitiesFromDB({ isShow: true })
  return { cities }
}

/**
 * 处理 list action：获取前端展示城市的实时天气
 */
async function handleListAction() {
  const cities = await loadCitiesFromDB({ isShow: true })

  const weatherPromises = cities.map(async (city) => {
    try {
      const location = buildLocation(city)
      const weatherNow = await fetchCurrentWeather(location)
      const snowLevel = mapWeatherCodeToSnowLevel(weatherNow.icon)

      return {
        cityId: city.cityId,
        cityName: city.cityName,
        province: city.province,
        temperature: Number(weatherNow.temp),
        humidity: Number(weatherNow.humidity),
        windSpeed: Number(weatherNow.windSpeed),
        windDirection: weatherNow.windDir || '',
        snowLevel,
        latitude: city.latitude,
        longitude: city.longitude,
        updatedAt: weatherNow.obsTime || new Date().toISOString(),
      }
    } catch (err) {
      console.warn(`Failed to fetch weather for ${city.cityName}:`, err.message)
      return null
    }
  })

  const results = await Promise.allSettled(weatherPromises)

  // 收集成功的结果
  const snowRegions = results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)

  return {
    snowRegions,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 处理 detail action：获取城市降雪详情
 *
 * 统一使用经纬度查询天气，兼容城市和景区。
 *
 * @param {string} cityId - 城市 ID 或 POI 景区 ID
 * @param {number} [longitude] - 经度
 * @param {number} [latitude] - 纬度
 * @returns {Promise<Object>} 城市详情响应
 */
async function handleDetailAction(cityId, longitude, latitude) {
  const location = buildLocation({ cityId, longitude, latitude })

  // 并发请求实时天气和 3 天预报
  const [weatherNow, forecast3d] = await Promise.all([
    fetchCurrentWeather(location),
    fetchForecast3d(location),
  ])

  const snowLevel = mapWeatherCodeToSnowLevel(weatherNow.icon)

  // 组装当前天气数据
  const current = {
    temperature: Number(weatherNow.temp),
    humidity: Number(weatherNow.humidity),
    windSpeed: Number(weatherNow.windSpeed),
    windDirection: weatherNow.windDir || '',
    snowLevel,
    visibility: Number(weatherNow.vis),
  }

  // 组装预报数据
  const forecast = forecast3d.map((day) => {
    const daySnowLevel = mapWeatherCodeToSnowLevel(day.iconDay)
    const nightSnowLevel = mapWeatherCodeToSnowLevel(day.iconNight)
    // 取白天和夜间中较强的降雪等级
    const effectiveSnowLevel = getStrongerSnowLevel(daySnowLevel, nightSnowLevel)

    return {
      date: day.fxDate,
      snowLevel: effectiveSnowLevel,
      snowPeriod: buildSnowPeriod(daySnowLevel, nightSnowLevel),
      accumulation: Number(day.precip) || 0,
      tempHigh: Number(day.tempMax),
      tempLow: Number(day.tempMin),
    }
  })

  return {
    cityId,
    cityName: weatherNow.text || '',
    current,
    forecast,
    updatedAt: weatherNow.obsTime || new Date().toISOString(),
  }
}

/**
 * 比较两个降雪等级，返回较强的一个
 *
 * @param {string} level1 - 降雪等级 1
 * @param {string} level2 - 降雪等级 2
 * @returns {string} 较强的降雪等级
 */
function getStrongerSnowLevel(level1, level2) {
  const order = { '无': 0, '小雪': 1, '中雪': 2, '大雪': 3, '暴雪': 4 }
  const rank1 = order[level1] || 0
  const rank2 = order[level2] || 0
  return rank1 >= rank2 ? level1 : level2
}

/**
 * 根据白天和夜间降雪情况构建降雪时段描述
 *
 * @param {string} daySnow - 白天降雪等级
 * @param {string} nightSnow - 夜间降雪等级
 * @returns {string} 降雪时段描述
 */
function buildSnowPeriod(daySnow, nightSnow) {
  const hasDay = daySnow !== '无'
  const hasNight = nightSnow !== '无'

  if (hasDay && hasNight) return '全天'
  if (hasDay) return '白天'
  if (hasNight) return '夜间'
  return '无降雪'
}

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.action - 操作类型: "list" | "detail"
 * @param {string} [event.cityId] - 城市 ID（detail 模式必填）
 */
exports.main = async (event, context) => {
  const { action, cityId, longitude, latitude } = event

  try {
    if (action === 'cities') {
      const data = await handleCitiesAction()
      return { code: 0, data }
    } else if (action === 'list') {
      const data = await handleListAction()
      return {
        code: 0,
        data,
      }
    } else if (action === 'detail') {
      if (!cityId) {
        return { code: 400, message: '缺少 cityId 参数' }
      }
      const data = await handleDetailAction(cityId, longitude, latitude)
      return {
        code: 0,
        data,
      }
    } else {
      return { code: 400, message: '无效的 action 参数' }
    }
  } catch (err) {
    console.error('getSnowData error:', err)
    return { code: 500, message: '服务器内部错误', error: err.message }
  }
}
