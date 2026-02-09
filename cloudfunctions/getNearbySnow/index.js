// 云函数: getNearbySnow
// 获取附近降雪区域
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

/** 默认搜索半径（公里） */
const DEFAULT_RADIUS = 200

/** 地球平均半径（公里） */
const EARTH_RADIUS_KM = 6371

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
 * 将角度转换为弧度
 *
 * @param {number} degrees - 角度值
 * @returns {number} 弧度值
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

/**
 * 使用 Haversine 公式计算两个地理坐标点之间的距离
 *
 * Haversine 公式考虑了地球的球面形状，适用于计算地球表面两点间的大圆距离。
 *
 * @param {number} lat1 - 第一个点的纬度（度）
 * @param {number} lon1 - 第一个点的经度（度）
 * @param {number} lat2 - 第二个点的纬度（度）
 * @param {number} lon2 - 第二个点的经度（度）
 * @returns {number} 两点之间的距离（公里）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
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
 * 获取所有主要城市的实时天气数据
 *
 * 遍历主要城市列表，并发请求实时天气数据。
 * 使用 Promise.allSettled 容忍部分城市请求失败。
 *
 * @returns {Promise<Array>} 包含天气数据的城市列表
 */
async function fetchAllCitiesWeather() {
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
      }
    } catch (err) {
      console.warn(`Failed to fetch weather for ${city.cityName}:`, err.message)
      return null
    }
  })

  const results = await Promise.allSettled(weatherPromises)

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)
}

/**
 * 过滤指定半径内的降雪城市并按距离升序排序
 *
 * 从给定的城市天气数据中，筛选出：
 * 1. 正在下雪的城市（snowLevel !== "无"）
 * 2. 距离用户位置在指定半径内的城市
 *
 * 结果按距离由近到远排序。
 *
 * @param {number} userLat - 用户纬度
 * @param {number} userLon - 用户经度
 * @param {Array} citiesWeather - 城市天气数据列表
 * @param {number} radius - 搜索半径（公里）
 * @returns {Array} 附近降雪城市列表，按距离升序排列
 */
function filterNearbySnowCities(userLat, userLon, citiesWeather, radius) {
  const results = []

  for (const city of citiesWeather) {
    // 只包含正在下雪的城市
    if (city.snowLevel === '无') {
      continue
    }

    const distance = calculateDistance(userLat, userLon, city.latitude, city.longitude)

    // 只包含在指定半径内的城市
    if (distance <= radius) {
      results.push({
        cityId: city.cityId,
        cityName: city.cityName,
        distance: Math.round(distance * 100) / 100, // 保留两位小数
        snowLevel: city.snowLevel,
        temperature: city.temperature,
      })
    }
  }

  // 按距离升序排序
  results.sort((a, b) => a.distance - b.distance)

  return results
}

/**
 * 查找最近的降雪城市（不受半径限制）
 *
 * 从给定的城市天气数据中，找到距离用户位置最近的正在下雪的城市。
 * 如果没有任何城市正在下雪，返回 null。
 *
 * @param {number} userLat - 用户纬度
 * @param {number} userLon - 用户经度
 * @param {Array} citiesWeather - 城市天气数据列表
 * @returns {Object|null} 最近的降雪城市信息，如果没有降雪城市则返回 null
 */
function findNearestSnowCity(userLat, userLon, citiesWeather) {
  let nearest = null
  let minDistance = Infinity

  for (const city of citiesWeather) {
    // 只考虑正在下雪的城市
    if (city.snowLevel === '无') {
      continue
    }

    const distance = calculateDistance(userLat, userLon, city.latitude, city.longitude)

    if (distance < minDistance) {
      minDistance = distance
      nearest = {
        cityId: city.cityId,
        cityName: city.cityName,
        distance: Math.round(distance * 100) / 100, // 保留两位小数
        snowLevel: city.snowLevel,
      }
    }
  }

  return nearest
}

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {number} event.latitude - 用户纬度
 * @param {number} event.longitude - 用户经度
 * @param {number} [event.radius=200] - 搜索半径（公里）
 */
exports.main = async (event, context) => {
  const { latitude, longitude, radius = DEFAULT_RADIUS } = event

  try {
    if (latitude === undefined || longitude === undefined) {
      return { code: 400, message: '缺少经纬度参数' }
    }

    // 获取所有主要城市的实时天气数据
    const citiesWeather = await fetchAllCitiesWeather()

    // 过滤指定半径内的降雪城市并按距离排序
    const nearbySnow = filterNearbySnowCities(latitude, longitude, citiesWeather, radius)

    // 查找最近的降雪城市（不受半径限制，用于"附近无降雪"时推荐）
    const nearest = findNearestSnowCity(latitude, longitude, citiesWeather)

    return {
      code: 0,
      data: {
        nearbySnow,
        nearest,
      },
    }
  } catch (err) {
    console.error('getNearbySnow error:', err)
    return { code: 500, message: '服务器内部错误', error: err.message }
  }
}
