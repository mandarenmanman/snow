// 云函数: syncCities
// 从 qwd/LocationList 同步中国城市列表到 cities 集合
// 支持定时触发器，建议每周执行一次
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/** CSV 文件地址（多个源，按顺序尝试） */
const CSV_URLS = [
  'https://gh-proxy.com/https://raw.githubusercontent.com/qwd/LocationList/master/China-City-List-latest.csv',
  'https://ghfast.top/https://raw.githubusercontent.com/qwd/LocationList/master/China-City-List-latest.csv',
  'https://raw.githubusercontent.com/qwd/LocationList/master/China-City-List-latest.csv',
]

/** 请求超时 */
const REQUEST_TIMEOUT = 500 * 2

/**
 * CSV 实际列顺序:
 *
 * Location_ID, Location_Name_EN, Location_Name_ZH,
 * ISO_3166_1, Country_Region_EN, Country_Region_ZH,
 * Adm1_Name_EN, Adm1_Name_ZH, Adm2_Name_EN, Adm2_Name_ZH,
 * Timezone, Latitude, Longitude, AD_code
 */
const COL = {
  LOCATION_ID: 0,
  NAME_EN: 1,
  NAME_ZH: 2,
  ISO_3166_1: 3,
  COUNTRY_EN: 4,
  COUNTRY_ZH: 5,
  ADM1_EN: 6,
  ADM1_ZH: 7,
  ADM2_EN: 8,
  ADM2_ZH: 9,
  TIMEZONE: 10,
  LAT: 11,
  LON: 12,
  AD_CODE: 13,
}

/**
 * 下载并解析 CSV
 * @returns {Array<Object>} 解析后的城市数组
 */
async function fetchAndParseCSV() {
  let text = ''

  // 依次尝试多个源
  for (const url of CSV_URLS) {
    try {
      console.log('尝试下载:', url)
      const resp = await axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        responseType: 'text',
      })
      text = resp.data
      console.log('下载成功:', url)
      break
    } catch (err) {
      console.warn('下载失败:', url, err.message)
    }
  }

  if (!text) {
    throw new Error('所有 CSV 源均下载失败')
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim())

  // 跳过表头
  const header = lines[0]
  console.log('CSV header:', header)

  const cities = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 13) continue

    const cityId = cols[COL.LOCATION_ID]?.trim()
    const cityName = cols[COL.NAME_ZH]?.trim()
    if (!cityId || !cityName) continue

    cities.push({
      cityId,
      cityName,
      cityNameEn: cols[COL.NAME_EN]?.trim() || '',
      iso3166: cols[COL.ISO_3166_1]?.trim() || '',
      countryEn: cols[COL.COUNTRY_EN]?.trim() || '',
      countryZh: cols[COL.COUNTRY_ZH]?.trim() || '',
      adm1En: cols[COL.ADM1_EN]?.trim() || '',
      province: cols[COL.ADM1_ZH]?.trim() || '',
      adm2En: cols[COL.ADM2_EN]?.trim() || '',
      adm2Zh: cols[COL.ADM2_ZH]?.trim() || '',
      timezone: cols[COL.TIMEZONE]?.trim() || '',
      latitude: parseFloat(cols[COL.LAT]) || 0,
      longitude: parseFloat(cols[COL.LON]) || 0,
      adCode: cols[COL.AD_CODE]?.trim() || '',
    })
  }

  return cities
}

/**
 * 批量写入数据库
 *
 * 首次（集合为空）：直接批量 add，速度最快
 * 非首次：先清空集合再批量 add，保留不了 isShow/isHot/scenics
 *        所以非首次走逐批并发 upsert，但并发数拉满（100条/批）
 *
 * 优化点：用集合级 update 替代逐条 where().update()
 */
async function upsertCities(cities) {
  let added = 0
  let updated = 0
  let failed = 0

  // 读取已有 cityId 集合
  const existingIds = new Set()
  const countRes = await db.collection('cities').count()
  const total = countRes.total

  if (total > 0) {
    let offset = 0
    const MAX_LIMIT = 100
    while (true) {
      const { data } = await db
        .collection('cities')
        .field({ cityId: true })
        .skip(offset)
        .limit(MAX_LIMIT)
        .get()
      data.forEach((d) => existingIds.add(d.cityId))
      if (data.length < MAX_LIMIT) break
      offset += MAX_LIMIT
    }
  }

  console.log(`数据库已有 ${existingIds.size} 条城市记录`)

  // 分离新增和更新
  const toAdd = []
  const toUpdate = []
  for (const city of cities) {
    if (existingIds.has(city.cityId)) {
      toUpdate.push(city)
    } else {
      toAdd.push(city)
    }
  }

  // 批量新增（每批 100 条并发 add）
  if (toAdd.length > 0) {
    const BATCH = 100
    for (let i = 0; i < toAdd.length; i += BATCH) {
      const batch = toAdd.slice(i, i + BATCH)
      const promises = batch.map((city) =>
        db.collection('cities').add({
          data: {
            ...city,
            isShow: false,
            isHot: false,
            scenics: [],
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        }).then(() => { added++ }).catch((err) => {
          console.warn(`新增 ${city.cityId} 失败:`, err.message)
          failed++
        })
      )
      await Promise.all(promises)
    }
    console.log(`新增完成: ${added} 条`)
  }

  // 批量更新（每批 100 条并发 update）
  if (toUpdate.length > 0) {
    const BATCH = 100
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH)
      const promises = batch.map((city) =>
        db.collection('cities').where({ cityId: city.cityId }).update({
          data: {
            cityName: city.cityName,
            cityNameEn: city.cityNameEn,
            iso3166: city.iso3166,
            countryEn: city.countryEn,
            countryZh: city.countryZh,
            adm1En: city.adm1En,
            province: city.province,
            adm2En: city.adm2En,
            adm2Zh: city.adm2Zh,
            timezone: city.timezone,
            latitude: city.latitude,
            longitude: city.longitude,
            adCode: city.adCode,
            updatedAt: db.serverDate(),
          },
        }).then(() => { updated++ }).catch((err) => {
          console.warn(`更新 ${city.cityId} 失败:`, err.message)
          failed++
        })
      )
      await Promise.all(promises)
      if (i % 500 === 0) console.log(`更新进度: ${Math.min(i + BATCH, toUpdate.length)} / ${toUpdate.length}`)
    }
    console.log(`更新完成: ${updated} 条`)
  }

  return { added, updated, failed }
}

/**
 * 云函数入口
 *
 * 定时触发器: 每天 14:20
 */
exports.main = async (event, context) => {
  console.log('syncCities 开始执行', new Date().toISOString())

  try {
    console.log('正在下载 CSV...')
    const cities = await fetchAndParseCSV()
    console.log(`解析到 ${cities.length} 个城市`)

    if (cities.length === 0) {
      return { code: 0, message: '未解析到任何城市数据', data: { total: 0 } }
    }

    console.log('正在同步到数据库...')
    const result = await upsertCities(cities)
    console.log('同步完成:', result)

    return {
      code: 0,
      message: '同步完成',
      data: { total: cities.length, ...result },
    }
  } catch (err) {
    console.error('syncCities 执行失败:', err)
    return { code: 500, message: '同步失败', error: err.message }
  }
}
