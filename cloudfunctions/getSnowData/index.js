// 云函数: getSnowData
// 获取降雪数据（列表和详情）
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

/** 和风天气 API 密钥 */
const API_KEY = 'f27d9b38adcf4a36a09f6b6ab6133fd7'

/** API 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 10000

/** 和风天气 API 基础 URL */
const WEATHER_API_BASE = 'https://nf5g7caymw.re.qweatherapi.com/v7'

/**
 * 主要中国城市列表（用于全国降雪扫描）
 * 包含省会城市和主要地级市，覆盖全国各区域
 * location 为和风天气城市 ID
 */
const MAJOR_CITIES = [
  { cityId: '101010100', cityName: '北京', province: '北京', latitude: 39.90, longitude: 116.41 },
  { cityId: '101020100', cityName: '上海', province: '上海', latitude: 31.23, longitude: 121.47 },
  { cityId: '101030100', cityName: '天津', province: '天津', latitude: 39.13, longitude: 117.20 },
  { cityId: '101040100', cityName: '重庆', province: '重庆', latitude: 29.57, longitude: 106.55 },
  { cityId: '101050101', cityName: '哈尔滨', province: '黑龙江', latitude: 45.75, longitude: 126.65 },
  { cityId: '101050201', cityName: '齐齐哈尔', province: '黑龙江', latitude: 47.35, longitude: 123.97 },
  { cityId: '101050301', cityName: '牡丹江', province: '黑龙江', latitude: 44.58, longitude: 129.63 },
  { cityId: '101060101', cityName: '长春', province: '吉林', latitude: 43.88, longitude: 125.32 },
  { cityId: '101060201', cityName: '吉林', province: '吉林', latitude: 43.84, longitude: 126.55 },
  { cityId: '101070101', cityName: '沈阳', province: '辽宁', latitude: 41.80, longitude: 123.43 },
  { cityId: '101070201', cityName: '大连', province: '辽宁', latitude: 38.91, longitude: 121.62 },
  { cityId: '101080101', cityName: '呼和浩特', province: '内蒙古', latitude: 40.84, longitude: 111.75 },
  { cityId: '101090101', cityName: '石家庄', province: '河北', latitude: 38.04, longitude: 114.51 },
  { cityId: '101100101', cityName: '太原', province: '山西', latitude: 37.87, longitude: 112.55 },
  { cityId: '101110101', cityName: '西安', province: '陕西', latitude: 34.26, longitude: 108.94 },
  { cityId: '101120101', cityName: '济南', province: '山东', latitude: 36.65, longitude: 116.98 },
  { cityId: '101130101', cityName: '乌鲁木齐', province: '新疆', latitude: 43.80, longitude: 87.60 },
  { cityId: '101140101', cityName: '拉萨', province: '西藏', latitude: 29.65, longitude: 91.11 },
  { cityId: '101150101', cityName: '西宁', province: '青海', latitude: 36.62, longitude: 101.78 },
  { cityId: '101160101', cityName: '兰州', province: '甘肃', latitude: 36.06, longitude: 103.83 },
  { cityId: '101170101', cityName: '银川', province: '宁夏', latitude: 38.49, longitude: 106.23 },
  { cityId: '101180101', cityName: '郑州', province: '河南', latitude: 34.76, longitude: 113.65 },
  { cityId: '101190101', cityName: '南京', province: '江苏', latitude: 32.06, longitude: 118.80 },
  { cityId: '101200101', cityName: '武汉', province: '湖北', latitude: 30.58, longitude: 114.30 },
  { cityId: '101210101', cityName: '杭州', province: '浙江', latitude: 30.29, longitude: 120.15 },
  { cityId: '101220101', cityName: '合肥', province: '安徽', latitude: 31.82, longitude: 117.23 },
  { cityId: '101230101', cityName: '福州', province: '福建', latitude: 26.08, longitude: 119.30 },
  { cityId: '101240101', cityName: '南昌', province: '江西', latitude: 28.68, longitude: 115.89 },
  { cityId: '101250101', cityName: '长沙', province: '湖南', latitude: 28.23, longitude: 112.94 },
  { cityId: '101260101', cityName: '贵阳', province: '贵州', latitude: 26.65, longitude: 106.63 },
  { cityId: '101270101', cityName: '成都', province: '四川', latitude: 30.57, longitude: 104.07 },
  { cityId: '101280101', cityName: '广州', province: '广东', latitude: 23.13, longitude: 113.26 },
  { cityId: '101290101', cityName: '昆明', province: '云南', latitude: 25.04, longitude: 102.68 },
  { cityId: '101300101', cityName: '南宁', province: '广西', latitude: 22.82, longitude: 108.37 },
  { cityId: '101310101', cityName: '海口', province: '海南', latitude: 20.04, longitude: 110.35 },
]

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
 * 调用和风天气 3 天预报 API
 *
 * @param {string} cityId - 城市 ID
 * @returns {Promise<Array>} 3 天预报数据
 */
async function fetchForecast3d(cityId) {
  const url = `${WEATHER_API_BASE}/weather/3d`
  const response = await axios.get(url, {
    params: { location: cityId, key: API_KEY },
    timeout: REQUEST_TIMEOUT,
  })

  if (response.data.code !== '200') {
    throw new Error(`QWeather API error: code=${response.data.code}`)
  }

  return response.data.daily || []
}

/**
 * 处理 list action：获取全国降雪城市列表
 *
 * 遍历主要城市，查询实时天气，过滤出正在下雪的城市。
 * 使用 Promise.allSettled 并发请求，容忍部分城市请求失败。
 *
 * @returns {Promise<Object>} 降雪城市列表响应
 */
async function handleListAction() {
  const weatherPromises = MAJOR_CITIES.map(async (city) => {
    try {
      const weatherNow = await fetchCurrentWeather(city.cityId)
      const snowLevel = mapWeatherCodeToSnowLevel(weatherNow.icon)

      return {
        cityId: city.cityId,
        cityName: city.cityName,
        province: city.province,
        temperature: Number(weatherNow.temp),
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

  // 收集成功的结果并过滤出正在下雪的城市
  const snowRegions = results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)
    .filter((region) => region.snowLevel !== '无')

  return {
    snowRegions,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 处理 detail action：获取城市降雪详情
 *
 * 并发请求实时天气和 3 天预报数据，组装为城市详情响应。
 *
 * @param {string} cityId - 城市 ID
 * @returns {Promise<Object>} 城市详情响应
 */
async function handleDetailAction(cityId) {
  // 并发请求实时天气和 3 天预报
  const [weatherNow, forecast3d] = await Promise.all([
    fetchCurrentWeather(cityId),
    fetchForecast3d(cityId),
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
  const { action, cityId } = event

  try {
    if (action === 'list') {
      const data = await handleListAction()
      return {
        code: 0,
        data,
      }
    } else if (action === 'detail') {
      if (!cityId) {
        return { code: 400, message: '缺少 cityId 参数' }
      }
      const data = await handleDetailAction(cityId)
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
