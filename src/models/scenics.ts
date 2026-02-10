/**
 * 城市景区 & 省份数据
 *
 * 优先使用从数据库加载的动态数据，静态数据作为兜底。
 */

/** 静态兜底：城市 → 热门景区 */
const STATIC_SCENICS: Record<string, string[]> = {
  '101010100': ['故宫', '长城', '颐和园'],
  '101190101': ['中山陵', '夫子庙', '玄武湖'],
  '101210101': ['西湖', '灵隐寺', '千岛湖'],
  '101180101': ['少林寺', '龙门石窟'],
  '101200101': ['黄鹤楼', '东湖', '武大樱园'],
  '101280101': ['白云山', '长隆', '沙面'],
  '101040100': ['洪崖洞', '磁器口', '武隆天坑'],
  '101270101': ['宽窄巷子', '都江堰', '青城山'],
  '101230101': ['三坊七巷', '鼓山', '西湖公园'],
  '101120101': ['趵突泉', '大明湖', '千佛山'],
  '101070101': ['故宫', '张氏帅府', '棋盘山'],
  '101050101': ['冰雪大世界', '中央大街', '太阳岛'],
}

/** 静态兜底：城市 → 省份 */
const STATIC_PROVINCE: Record<string, string> = {
  '101010100': '北京市',
  '101190101': '江苏省',
  '101210101': '浙江省',
  '101180101': '河南省',
  '101200101': '湖北省',
  '101280101': '广东省',
  '101040100': '重庆市',
  '101270101': '四川省',
  '101230101': '福建省',
  '101120101': '山东省',
  '101070101': '辽宁省',
  '101050101': '黑龙江省',
}

/** 动态数据（从 DB 加载后覆盖） */
const dynamicScenics: Record<string, string[]> = {}
const dynamicProvince: Record<string, string> = {}

/** 城市完整信息缓存 */
export interface CityInfo {
  cityId: string
  cityName: string
  province: string
  latitude: number
  longitude: number
  isHot: boolean
  isShow: boolean
  scenics: string[]
}

let cityListCache: CityInfo[] = []

/**
 * 从云函数加载城市列表并缓存到内存
 */
export async function loadCityList(): Promise<CityInfo[]> {
  if (cityListCache.length > 0) return cityListCache

  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({
      name: 'getSnowData',
      data: { action: 'cities' },
    })
    const result = res.result as { code?: number; data?: { cities?: CityInfo[] } }
    const cities = result.code === 0 && result.data?.cities ? result.data.cities : []

    cityListCache = cities

    // 填充动态映射
    for (const c of cities) {
      if (c.scenics && c.scenics.length > 0) {
        dynamicScenics[c.cityId] = c.scenics
      }
      if (c.province) {
        dynamicProvince[c.cityId] = c.province
      }
    }

    return cities
    // #endif
    // #ifndef MP-WEIXIN
    return []
    // #endif
  } catch (err) {
    console.error('loadCityList failed:', err)
    return []
  }
}

/**
 * 获取热门城市列表（isHot === true）
 */
export function getHotCities(): CityInfo[] {
  return cityListCache.filter((c) => c.isHot)
}

/**
 * 清除缓存（下次调用 loadCityList 会重新请求）
 */
export function clearCityListCache() {
  cityListCache = []
}

export function getScenics(cityId: string): string[] {
  return dynamicScenics[cityId] || STATIC_SCENICS[cityId] || []
}

export function getProvince(cityId: string): string {
  return dynamicProvince[cityId] || STATIC_PROVINCE[cityId] || ''
}
