// 云函数: searchCity
// 并发搜索：本地 DB + 和风天气城市查询 + POI 景区搜索
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const API_KEY = 'f27d9b38adcf4a36a09f6b6ab6133fd7'
const TIMEOUT = 8000
const GEO_BASE = 'https://nf5g7caymw.re.qweatherapi.com/geo/v2'

/**
 * 本地 DB 搜索（城市名、省份、景区）
 */
async function searchDB(keyword) {
  const reg = db.RegExp({ regexp: keyword, options: 'i' })
  const [byName, byProvince, byScenic] = await Promise.allSettled([
    db.collection('cities').where({ cityName: reg }).limit(20).get(),
    db.collection('cities').where({ province: reg }).limit(15).get(),
    db.collection('cities').where({ scenics: reg }).limit(15).get(),
  ])

  const map = new Map()
  const extract = (r, type, scenic) => {
    if (r.status !== 'fulfilled') return
    for (const c of r.value.data) {
      if (!map.has(c.cityId)) {
        map.set(c.cityId, {
          cityId: c.cityId,
          cityName: c.cityName,
          province: c.province || '',
          latitude: c.latitude || 0,
          longitude: c.longitude || 0,
          scenics: c.scenics || [],
          matchType: type,
          matchScenic: scenic || '',
        })
      }
    }
  }

  extract(byName, 'city', '')
  extract(byProvince, 'province', '')
  extract(byScenic, 'scenic', keyword)

  return Array.from(map.values())
}

/**
 * 和风天气城市搜索
 */
async function searchGeoCity(keyword) {
  try {
    const res = await axios.get(`${GEO_BASE}/city/lookup`, {
      params: { location: keyword, key: API_KEY, range: 'cn' },
      timeout: TIMEOUT,
    })
    if (res.data.code !== '200') return []
    return (res.data.location || []).map((loc) => ({
      cityId: loc.id,
      cityName: loc.name,
      province: loc.adm1 || '',
      latitude: Number(loc.lat) || 0,
      longitude: Number(loc.lon) || 0,
      scenics: [],
      matchType: 'city',
      matchScenic: '',
    }))
  } catch { return [] }
}

/**
 * 和风天气 POI 景区搜索
 * type=scenic 搜索景点/景区
 */
async function searchGeoPOI(keyword) {
  try {
    const res = await axios.get(`${GEO_BASE}/poi/lookup`, {
      params: { location: keyword, key: API_KEY, type: 'scenic', range: 'cn' },
      timeout: TIMEOUT,
    })
    if (res.data.code !== '200') return []
    return (res.data.poi || []).map((poi) => ({
      cityId: poi.id,
      cityName: poi.name,
      province: poi.adm1 || '',
      district: poi.adm2 || '',
      latitude: Number(poi.lat) || 0,
      longitude: Number(poi.lon) || 0,
      scenics: [],
      matchType: 'scenic',
      matchScenic: poi.name,
      poiCity: poi.adm2 || poi.adm1 || '',
    }))
  } catch { return [] }
}

exports.main = async (event, context) => {
  const { keyword } = event

  try {
    if (!keyword || keyword.trim() === '') {
      return { code: 400, message: '搜索关键词不能为空' }
    }

    const kw = keyword.trim()

    // 三路并发搜索
    const [dbResults, geoResults, poiResults] = await Promise.all([
      searchDB(kw),
      searchGeoCity(kw),
      searchGeoPOI(kw),
    ])

    // 合并去重（DB 优先，再 GeoCity，再 POI）
    const map = new Map()
    for (const c of dbResults) {
      if (!map.has(c.cityId)) map.set(c.cityId, c)
    }
    for (const c of geoResults) {
      if (!map.has(c.cityId)) map.set(c.cityId, c)
    }
    // POI 结果用 poi_ 前缀避免和城市 ID 冲突
    for (const c of poiResults) {
      const key = 'poi_' + c.cityId
      if (!map.has(key)) map.set(key, c)
    }

    const cities = Array.from(map.values())

    return { code: 0, data: { cities } }
  } catch (err) {
    console.error('searchCity error:', err)
    return { code: 500, message: '服务器内部错误', error: err.message }
  }
}
