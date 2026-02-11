// 云函数: searchCity
// AI 意图识别 → DB 搜索 → GeoAPI 兜底
const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const API_KEY = 'f27d9b38adcf4a36a09f6b6ab6133fd7'
const REQUEST_TIMEOUT = 10000
const GEO_API_BASE = 'https://nf5g7caymw.re.qweatherapi.com/geo/v2'

/**
 * 调用 AI 解析用户搜索意图
 *
 * 返回 JSON: { type: "city"|"scenic"|"province"|"unknown", keywords: string[] }
 * - type=city: keywords 是城市名
 * - type=scenic: keywords 是景点名，可能附带城市名
 * - type=province: keywords 是省份名
 */
async function parseIntent(app, keyword) {
  try {
    const ai = app.ai()
    const model = ai.createModel('deepseek')

    const res = await model.generateText({
      model: 'deepseek-v3.2',
      messages: [
        {
          role: 'system',
          content: `你是一个地理搜索意图识别助手。用户会输入一个搜索词，你需要判断它是城市名、景点/景区名、还是省份名，并提取出可用于数据库搜索的关键词。

规则：
1. 如果是明确的城市名（如"北京""杭州""哈尔滨"），type=city，keywords 放城市名
2. 如果是景点/景区（如"故宫""西湖""长城""冰雪大世界"），type=scenic，keywords 放景点名；如果能推断出所在城市也加上
3. 如果是省份（如"浙江""黑龙江"），type=province，keywords 放省份名
4. 如果无法判断，type=unknown，keywords 放原始输入

只返回 JSON，不要任何解释。格式：{"type":"city","keywords":["北京"]}`
        },
        { role: 'user', content: keyword }
      ],
      temperature: 0,
    })


    //输出相应结果
    console.log
      ('AI result:', res.text)
    if (!res.text) throw new Error('AI 没有返回内容')


    const text = (res.text || '').trim()
    // 提取 JSON
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      return JSON.parse(match[0])
    }
  } catch (err) {
    console.warn('AI 意图识别失败:', err.message)
  }

  // AI 失败，返回 unknown
  return { type: 'unknown', keywords: [keyword] }
}

/**
 * 根据 AI 解析结果搜索 cities 集合
 */
async function searchFromDB(intent) {
  const { type, keywords } = intent
  const results = new Map()

  for (const kw of keywords) {
    const reg = db.RegExp({ regexp: kw, options: 'i' })
    let queries = []

    if (type === 'scenic') {
      // 景点优先搜 scenics 字段，再搜城市名
      queries = [
        db.collection('cities').where({ scenics: reg }).limit(20).get(),
        db.collection('cities').where({ cityName: reg }).limit(10).get(),
      ]
    } else if (type === 'province') {
      queries = [
        db.collection('cities').where({ province: reg }).limit(30).get(),
      ]
    } else if (type === 'city') {
      queries = [
        db.collection('cities').where({ cityName: reg }).limit(20).get(),
        db.collection('cities').where({ adm2Zh: reg }).limit(10).get(),
      ]
    } else {
      // unknown: 全维度搜
      queries = [
        db.collection('cities').where({ cityName: reg }).limit(20).get(),
        db.collection('cities').where({ province: reg }).limit(10).get(),
        db.collection('cities').where({ scenics: reg }).limit(10).get(),
      ]
    }

    const settled = await Promise.allSettled(queries)
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        for (const c of r.value.data) {
          if (!results.has(c.cityId)) {
            results.set(c.cityId, {
              cityId: c.cityId,
              cityName: c.cityName,
              province: c.province || '',
              scenics: c.scenics || [],
              latitude: c.latitude || 0,
              longitude: c.longitude || 0,
              matchType: type === 'scenic' ? 'scenic' : type === 'province' ? 'province' : 'city',
            })
          }
        }
      }
    }
  }

  return Array.from(results.values())
}

/**
 * 兜底：和风天气 GeoAPI
 */
async function searchFromGeoAPI(keyword) {
  const url = `${GEO_API_BASE}/city/lookup`
  const response = await axios.get(url, {
    params: { location: keyword, key: API_KEY, range: 'cn' },
    timeout: REQUEST_TIMEOUT,
  })

  if (response.data.code !== '200') {
    throw new Error(`QWeather GeoAPI error: code=${response.data.code}`)
  }

  return (response.data.location || []).map((loc) => ({
    cityId: loc.id,
    cityName: loc.name,
    province: loc.adm1 || '',
    scenics: [],
    latitude: parseFloat(loc.lat) || 0,
    longitude: parseFloat(loc.lon) || 0,
    matchType: 'geo',
  }))
}

exports.main = async (event, context) => {
  const { keyword } = event

  try {
    if (!keyword || keyword.trim() === '') {
      return { code: 400, message: '搜索关键词不能为空' }
    }

    const kw = keyword.trim()
    const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })

    // 1. AI 解析意图
    console.log('搜索关键词:', kw)
    const intent = await parseIntent(app, kw)
    console.log('AI 意图:', JSON.stringify(intent))

    // 2. 根据意图搜 DB
    let cities = await searchFromDB(intent)

    // 3. DB 没结果，用原始关键词兜底 GeoAPI
    if (cities.length === 0) {
      cities = await searchFromGeoAPI(kw)
    }

    return {
      code: 0,
      data: {
        cities,
        intent, // 返回意图信息，方便前端展示
      },
    }
  } catch (err) {
    console.error('searchCity error:', err)
    return { code: 500, message: '服务器内部错误', error: err.message }
  }
}
