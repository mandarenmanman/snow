// 云函数: searchCity
// 搜索城市（调用和风天气 GeoAPI 城市搜索）
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

/** 和风天气 API 密钥 */
const API_KEY = 'f27d9b38adcf4a36a09f6b6ab6133fd7'

/** API 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 10000

/** 和风天气 GeoAPI 基础 URL */
const GEO_API_BASE = 'https://nf5g7caymw.re.qweatherapi.com/geo/v2'

/**
 * 调用和风天气城市搜索 API
 *
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 匹配的城市列表
 */
async function searchCityByKeyword(keyword) {
  const url = `${GEO_API_BASE}/city/lookup`
  const response = await axios.get(url, {
    params: {
      location: keyword,
      key: API_KEY,
      range: 'cn',
    },
    timeout: REQUEST_TIMEOUT,
  })

  if (response.data.code !== '200') {
    throw new Error(`QWeather GeoAPI error: code=${response.data.code}`)
  }

  return response.data.location || []
}

/**
 * 云函数入口
 * @param {Object} event - 请求参数
 * @param {string} event.keyword - 搜索关键词
 */
exports.main = async (event, context) => {
  const { keyword } = event

  try {
    if (!keyword || keyword.trim() === '') {
      return { code: 400, message: '搜索关键词不能为空' }
    }

    const locations = await searchCityByKeyword(keyword.trim())

    // 将和风天气 GeoAPI 返回的城市数据映射为统一格式
    const cities = locations.map((loc) => ({
      cityId: loc.id,
      cityName: loc.name,
      province: loc.adm1 || '',
    }))

    return {
      code: 0,
      data: {
        cities,
      },
    }
  } catch (err) {
    console.error('searchCity error:', err)
    return { code: 500, message: '服务器内部错误', error: err.message }
  }
}
