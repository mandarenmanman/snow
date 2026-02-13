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
