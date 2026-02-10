// 云函数: syncCities
// 从 qwd/LocationList 同步中国城市列表到 cities 集合
// 支持定时触发器，建议每周执行一次
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/** CSV 原始文件地址 */
const CSV_URL =
  'https://raw.githubusercontent.com/qwd/LocationList/master/China-City-List-latest.csv'

/** 请求超时 */
const REQUEST_TIMEOUT = 30000

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
  const resp = await axios.get(CSV_URL, {
    timeout: REQUEST_TIMEOUT,
    responseType: 'text',
  })

  const text = resp.data
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
 * 批量写入数据库（upsert 逻辑）
 *
 * - 已存在（按 cityId）→ 更新地理字段，保留 isShow / isHot / scenics
 * - 不存在 → 新增，isShow 默认 false
 */
async function upsertCities(cities) {
  let added = 0
  let updated = 0
  let failed = 0

  // 读取已有 cityId 集合
  const existingIds = new Set()
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

  console.log(`数据库已有 ${existingIds.size} 条城市记录`)

  // 分批处理，每批 50 条
  const BATCH = 50
  for (let i = 0; i < cities.length; i += BATCH) {
    const batch = cities.slice(i, i + BATCH)
    const promises = batch.map(async (city) => {
      try {
        if (existingIds.has(city.cityId)) {
          // 更新全部地理字段，不覆盖 isShow / isHot / scenics
          await db
            .collection('cities')
            .where({ cityId: city.cityId })
            .update({
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
            })
          updated++
        } else {
          await db.collection('cities').add({
            data: {
              ...city,
              isShow: false,   // 是否在前端展示列表
              isHot: false,    // 是否热门城市
              scenics: [],     // 景区列表（手动维护）
              createdAt: db.serverDate(),
              updatedAt: db.serverDate(),
            },
          })
          added++
        }
      } catch (err) {
        console.warn(`处理城市 ${city.cityId} ${city.cityName} 失败:`, err.message)
        failed++
      }
    })
    await Promise.all(promises)
    console.log(`进度: ${Math.min(i + BATCH, cities.length)} / ${cities.length}`)
  }

  return { added, updated, failed }
}

/**
 * 云函数入口
 *
 * 定时触发器: 0 0 3 * * 1 （每周一凌晨3点）
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
