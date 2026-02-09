# 实现计划：西门催雪 — 下雪查找小程序

## 概述

基于 UniApp（Vue 3）+ TwindCSS + FontAwesome + 微信云开发实现，UI 遵循 M3 Expressive 设计风格。按照项目初始化 → 数据层 → 服务层 → 页面层的顺序逐步构建，每一步都在前一步基础上递增。使用 Vitest + fast-check 进行测试。

## Tasks

- [x] 1. 初始化 UniApp 项目结构与基础配置
  - [x] 1.1 使用 HBuilderX 或 CLI 创建 UniApp Vue 3 项目，配置 `pages.json` 页面路由（index、search、nearby、detail、favorites），配置 `manifest.json` 微信小程序 appid 和云开发环境
    - 创建 `cloudfunctions/` 目录结构
    - 配置 `vue.config.js` 或 `vite.config.ts`
    - _Requirements: 全局_
  - [x] 1.2 安装并配置 TwindCSS，创建 `twind.config.ts` 定义 M3 Expressive 设计令牌（色彩、圆角、字体层级、间距）
    - 安装 `@twind/core`、`@twind/preset-tailwind`
    - 配置自定义主题：冰蓝/雪白主色调、M3 圆角（`rounded-3xl`）、字体层级
    - _Requirements: 全局_
  - [x] 1.3 安装并配置 FontAwesome，创建 `plugins/fontawesome.ts` 按需注册图标
    - 安装 `@fortawesome/fontawesome-svg-core`、`@fortawesome/free-solid-svg-icons`、`@fortawesome/vue-fontawesome`
    - 注册常用图标：`faSnowflake`、`faSearch`、`faLocationDot`、`faStar`、`faRotateRight`、`faWifi` 等
    - _Requirements: 全局_
  - [x] 1.4 初始化测试环境，安装 Vitest、fast-check、`@vue/test-utils`，创建 `vitest.config.ts`
    - 创建 `tests/unit/`、`tests/property/`、`tests/components/` 目录
    - _Requirements: 全局_

- [x] 2. 实现数据模型与序列化层
  - [x] 2.1 创建 `src/models/types.ts`，定义 SnowRegion、SnowForecast、FavoriteCity、CacheEntry 的 TypeScript 接口
    - 创建 `src/models/factories.ts`，实现工厂函数 `createSnowRegion(data)`、`createSnowForecast(data)`、`createFavoriteCity(data)`、`createCacheEntry(data, ttl)`
    - 实现字段验证逻辑，缺失字段使用默认值填充
    - _Requirements: 7.1_
  - [x] 2.2 创建 `src/utils/serializer.ts`，实现 SnowRegion 的序列化、反序列化和格式化输出
    - 实现 `serialize(snowRegion: SnowRegion): string` → JSON 字符串
    - 实现 `deserialize(jsonString: string): SnowRegion` → SnowRegion 对象
    - 实现 `prettyPrint(snowRegion: SnowRegion): string` → 格式化 JSON 字符串
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 2.3 编写属性测试：SnowRegion 序列化往返一致性
    - **Property 13: SnowRegion 序列化往返一致性**
    - **Validates: Requirements 7.1, 7.2, 7.4**
  - [x] 2.4 编写属性测试：格式化输出为有效 JSON
    - **Property 14: 格式化输出为有效 JSON**
    - **Validates: Requirements 7.3**

- [x] 3. 实现缓存服务层
  - [x] 3.1 创建 `src/utils/cache.ts`，实现本地缓存管理
    - 实现 `setCache(key: string, data: any): void` — 写入缓存并记录时间戳，TTL 默认 30 分钟
    - 实现 `getCache<T>(key: string): T | null` — 读取缓存，过期返回 null
    - 实现 `isCacheValid(key: string): boolean` — 判断缓存是否在有效期内
    - 实现 `forceRefresh<T>(key: string, fetchFn: () => Promise<T>): Promise<T>` — 强制刷新缓存
    - 使用 `uni.setStorageSync` / `uni.getStorageSync` 进行本地存储
    - _Requirements: 6.1, 6.2_
  - [x] 3.2 编写属性测试：缓存有效期判定
    - **Property 10: 缓存有效期判定**
    - **Validates: Requirements 6.1**
  - [x] 3.3 编写属性测试：强制刷新更新缓存
    - **Property 11: 强制刷新更新缓存**
    - **Validates: Requirements 6.2**
  - [x] 3.4 编写属性测试：离线模式返回缓存数据
    - **Property 12: 离线模式返回缓存数据**
    - **Validates: Requirements 6.3**

- [x] 4. Checkpoint — 确保数据层和缓存层测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 5. 实现降雪数据服务层
  - [x] 5.1 创建 `src/services/snow-service.ts`，实现降雪数据获取与过滤逻辑
    - 实现 `fetchSnowRegions(): Promise<SnowRegion[]>` — 通过 `wx.cloud.callFunction` 调用云函数获取全国降雪城市列表（带缓存）
    - 实现 `filterSnowingCities(weatherData: SnowRegion[]): SnowRegion[]` — 从天气数据中过滤出正在下雪的城市
    - 实现 `formatSnowListItem(snowRegion: SnowRegion): string` — 格式化列表项（城市名、温度、降雪强度、更新时间）
    - _Requirements: 1.1, 1.2_
  - [x] 5.2 编写属性测试：降雪城市过滤正确性
    - **Property 1: 降雪城市过滤正确性**
    - **Validates: Requirements 1.1**
  - [x] 5.3 编写属性测试：降雪列表项包含完整信息
    - **Property 2: 降雪列表项包含完整信息**
    - **Validates: Requirements 1.2**
  - [x] 5.4 实现城市搜索功能
    - 在 `src/services/snow-service.ts` 中添加 `searchCities(keyword: string, cityList: City[]): City[]` — 根据关键词过滤城市
    - _Requirements: 2.1, 2.3_
  - [x] 5.5 编写属性测试：城市搜索匹配正确性
    - **Property 3: 城市搜索匹配正确性**
    - **Validates: Requirements 2.1**
  - [x] 5.6 实现城市详情数据获取与格式化
    - 在 `src/services/snow-service.ts` 中添加 `fetchCityDetail(cityId: string): Promise<CityDetail>` — 调用云函数获取城市详情（带缓存）
    - 实现 `formatCityDetail(detailData: CityDetail): string` — 格式化详情信息
    - _Requirements: 2.2_
  - [x] 5.7 编写属性测试：城市详情包含完整信息
    - **Property 4: 城市详情包含完整信息**
    - **Validates: Requirements 2.2**

- [x] 6. 实现附近降雪与预报服务
  - [x] 6.1 创建 `src/services/geo-service.ts`，实现地理位置相关逻辑
    - 实现 `calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number` — Haversine 公式计算两点距离
    - 实现 `filterNearbySnow(userLocation: Location, snowRegions: SnowRegion[], radius: number): NearbySnowResult[]` — 过滤并按距离排序
    - 实现 `findNearestSnow(userLocation: Location, snowRegions: SnowRegion[]): SnowRegion | null` — 查找最近降雪城市
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 6.2 编写属性测试：附近降雪过滤与排序
    - **Property 5: 附近降雪过滤与排序**
    - **Validates: Requirements 3.1, 3.2**
  - [x] 6.3 在 `src/services/snow-service.ts` 中添加预报数据获取与格式化
    - 实现 `fetchForecast(cityId: string): Promise<SnowForecast[]>` — 调用云函数获取未来 3 天预报
    - 实现 `formatForecast(forecastData: SnowForecast[]): string` — 格式化预报信息
    - _Requirements: 4.1, 4.2_
  - [x] 6.4 编写属性测试：降雪预报天数与字段完整性
    - **Property 6: 降雪预报天数与字段完整性**
    - **Validates: Requirements 4.1, 4.2**

- [x] 7. 实现收藏功能
  - [x] 7.1 创建 `src/services/favorites-service.ts`，实现收藏管理逻辑
    - 实现 `addFavorite(openId: string, city: City): Promise<void>` — 调用云函数添加收藏
    - 实现 `removeFavorite(openId: string, cityId: string): Promise<void>` — 调用云函数移除收藏
    - 实现 `getFavorites(openId: string): Promise<FavoriteCity[]>` — 获取收藏列表（附带降雪状态）
    - 实现 `checkSnowAlert(openId: string, previousStatus: string, currentStatus: string): boolean` — 判断是否需要发送降雪提醒
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 7.2 编写属性测试：收藏添加/移除往返一致性
    - **Property 7: 收藏添加/移除往返一致性**
    - **Validates: Requirements 5.1, 5.4**
  - [x] 7.3 编写属性测试：收藏城市降雪状态摘要完整性
    - **Property 8: 收藏城市降雪状态摘要完整性**
    - **Validates: Requirements 5.2**
  - [x] 7.4 编写属性测试：降雪提醒触发正确性
    - **Property 9: 降雪提醒触发正确性**
    - **Validates: Requirements 5.3**

- [x] 8. Checkpoint — 确保服务层全部测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 9. 实现微信云函数
  - [x] 9.1 创建云函数 `cloudfunctions/getSnowData/index.js`
    - 实现 list 和 detail 两种 action
    - 调用和风天气 API 获取数据
    - 使用 snow-service 中的过滤和格式化逻辑
    - _Requirements: 1.1, 2.2_
  - [x] 9.2 创建云函数 `cloudfunctions/searchCity/index.js`
    - 调用和风天气城市搜索 API
    - _Requirements: 2.1_
  - [x] 9.3 创建云函数 `cloudfunctions/getNearbySnow/index.js`
    - 接收经纬度参数，调用 geo-service 过滤附近降雪
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 9.4 创建云函数 `cloudfunctions/manageFavorites/index.js`
    - 实现 add、remove、list 三种 action，操作云数据库
    - _Requirements: 5.1, 5.2, 5.4_
  - [x] 9.5 创建云函数 `cloudfunctions/sendSnowAlert/index.js`
    - 定时触发，检查收藏城市降雪状态变化，发送微信订阅消息
    - _Requirements: 5.3_

- [x] 10. 实现公共 Vue 组件（M3 Expressive 风格）
  - [x] 10.1 创建 `src/components/SnowCard.vue`，降雪城市卡片组件
    - 使用 TwindCSS 实现 M3 Expressive 圆角卡片（`rounded-3xl`、柔和阴影、动态色彩）
    - 使用 FontAwesome `faSnowflake` 图标展示降雪强度
    - Props: `snowRegion: SnowRegion`
    - _Requirements: 1.2_
  - [x] 10.2 创建 `src/components/ForecastItem.vue`，预报条目组件
    - M3 列表项样式，展示日期、降雪时段、强度、累计量
    - _Requirements: 4.2_
  - [x] 10.3 创建 `src/components/ErrorRetry.vue`，错误提示组件
    - M3 Expressive 按钮样式，FontAwesome `faRotateRight` 重试图标
    - Props: `message: string`，Emits: `retry`
    - _Requirements: 2.4, 6.4_
  - [x] 10.4 创建 `src/components/EmptyState.vue`，空状态提示组件
    - M3 插图 + 文字风格
    - Props: `message: string`、`icon: string`
    - _Requirements: 2.3, 3.3_

- [x] 11. 实现前端页面（UniApp Vue 3 SFC）
  - [x] 11.1 实现首页 `pages/index/index.vue`
    - 使用 Vue 3 Composition API（`setup`）
    - 顶部展示降雪地图（UniApp `map` 组件 + markers）
    - 下方使用 SnowCard 组件展示降雪城市列表
    - 支持下拉刷新（`onPullDownRefresh`）
    - 底部 TabBar 导航（首页、搜索、附近、收藏），使用 FontAwesome 图标
    - TwindCSS 实现 M3 Expressive 布局样式
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.2, 6.3_
  - [x] 11.2 实现搜索页 `pages/search/search.vue`
    - M3 Expressive 搜索栏样式
    - 搜索框输入联想，使用 `v-model` 双向绑定
    - 搜索结果列表使用 SnowCard 组件
    - 无结果使用 EmptyState 组件，错误使用 ErrorRetry 组件
    - _Requirements: 2.1, 2.3, 2.4_
  - [x] 11.3 实现附近降雪页 `pages/nearby/nearby.vue`
    - 通过 `uni.getLocation` 请求位置权限
    - 展示附近降雪列表（按距离排序），使用 SnowCard 组件
    - 无降雪时使用 EmptyState 推荐最近城市
    - 权限拒绝引导弹窗
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 11.4 实现城市详情页 `pages/detail/detail.vue`
    - 当前天气信息卡片（M3 Expressive 大圆角卡片）
    - 使用 ForecastItem 组件展示未来 3 天降雪预报
    - 收藏按钮（FontAwesome `faStar` / `faStarRegular` 切换）
    - 预报不可用使用 EmptyState 提示
    - _Requirements: 2.2, 4.1, 4.2, 4.3, 5.1, 5.4_
  - [x] 11.5 实现收藏列表页 `pages/favorites/favorites.vue`
    - 使用 SnowCard 组件展示收藏城市及降雪状态摘要
    - 点击跳转详情页（`uni.navigateTo`）
    - _Requirements: 5.2_
  - [x] 11.6 编写单元测试：边界情况与错误处理
    - 搜索无结果提示（需求 2.3）
    - 搜索超时错误处理（需求 2.4）
    - 附近无降雪推荐逻辑（需求 3.3）
    - 位置权限拒绝引导（需求 3.4）
    - 预报数据不可用提示（需求 4.3）
    - 无缓存且无网络错误提示（需求 6.4）
    - _Requirements: 2.3, 2.4, 3.3, 3.4, 4.3, 6.4_

- [x] 12. 集成与联调
  - [x] 12.1 将所有页面与云函数联调，确保数据流通
    - 首页加载 → `wx.cloud.callFunction({name: 'getSnowData'})` → 展示列表和地图
    - 搜索 → searchCity 云函数 → 选择 → getSnowData(detail) → 详情页
    - 附近 → getNearbySnow 云函数 → 列表 → 详情页
    - 收藏 → manageFavorites 云函数 → 列表 → 详情页
    - _Requirements: 全局_
  - [x] 12.2 实现离线模式降级逻辑
    - 使用 `uni.getNetworkType` 检测网络状态
    - 缓存回退 + 离线标识展示（FontAwesome `faWifi` 图标 + 提示文字）
    - _Requirements: 6.3, 6.4_

- [x] 13. Final Checkpoint — 确保所有测试通过
  - 确保所有测试通过，如有问题请向用户确认。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务都引用了对应的需求编号，确保可追溯性
- Checkpoint 任务用于阶段性验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
- 前端使用 TypeScript 开发，云函数使用 JavaScript
