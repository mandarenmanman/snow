# 需求文档：西门催雪 — 下雪查找小程序

## 简介

「西门催雪」是一款微信小程序，帮助用户快速查找当前哪些地方正在下雪或即将下雪。用户可以通过地图浏览、城市搜索、定位等方式获取降雪信息，满足赏雪出行、摄影爱好、冬季运动等场景需求。

## 术语表

- **小程序（Mini_Program）**：基于微信平台运行的轻量级应用程序
- **降雪查询服务（Snow_Query_Service）**：负责从天气数据源获取降雪信息并返回结果的后端服务
- **天气数据源（Weather_Data_Source）**：提供实时和预报天气数据的第三方 API（如中国气象局、和风天气等）
- **降雪区域（Snow_Region）**：当前正在下雪或预报即将下雪的地理区域
- **用户（User）**：使用该小程序的微信用户
- **收藏列表（Favorites_List）**：用户保存的关注城市列表
- **降雪地图（Snow_Map）**：以地图形式展示降雪区域分布的可视化组件

## 需求

### 需求 1：查看当前降雪区域

**用户故事：** 作为用户，我想查看当前哪些地方正在下雪，以便我可以规划赏雪出行。

#### 验收标准

1. WHEN 用户打开小程序首页, THE Snow_Query_Service SHALL 获取并展示当前全国范围内正在下雪的城市列表
2. WHEN 用户查看降雪城市列表, THE Mini_Program SHALL 展示每个城市的名称、当前温度、降雪强度（小雪/中雪/大雪/暴雪）和更新时间
3. WHEN 降雪数据加载完成, THE Snow_Map SHALL 在地图上以可视化标记展示所有降雪区域的位置
4. WHEN 用户点击地图上的降雪标记, THE Mini_Program SHALL 展示该区域的详细降雪信息

### 需求 2：搜索指定城市降雪情况

**用户故事：** 作为用户，我想搜索某个城市是否在下雪，以便我可以了解目的地的天气状况。

#### 验收标准

1. WHEN 用户在搜索框中输入城市名称, THE Snow_Query_Service SHALL 返回匹配的城市列表供用户选择
2. WHEN 用户选择一个城市, THE Mini_Program SHALL 展示该城市当前的降雪状态、温度、湿度、风力和未来 24 小时降雪预报
3. WHEN 用户输入的城市名称无匹配结果, THE Mini_Program SHALL 提示"未找到该城市，请检查输入"
4. IF 搜索请求超时或失败, THEN THE Mini_Program SHALL 展示错误提示并提供重试按钮

### 需求 3：基于定位查找附近降雪

**用户故事：** 作为用户，我想基于我的当前位置查找附近哪里在下雪，以便我可以就近前往赏雪。

#### 验收标准

1. WHEN 用户授权地理位置权限, THE Snow_Query_Service SHALL 查询用户当前位置周边指定半径内的降雪区域
2. WHEN 附近存在降雪区域, THE Mini_Program SHALL 按距离由近到远排序展示降雪区域列表，包含距离、城市名和降雪强度
3. WHEN 附近无降雪区域, THE Mini_Program SHALL 提示"附近暂无降雪，为您推荐最近的降雪城市"并展示最近的降雪城市
4. IF 用户拒绝授权地理位置权限, THEN THE Mini_Program SHALL 提示用户需要位置权限才能使用此功能，并引导用户前往设置页开启权限

### 需求 4：降雪预报

**用户故事：** 作为用户，我想查看未来几天的降雪预报，以便我可以提前规划行程。

#### 验收标准

1. WHEN 用户查看某个城市的详情页, THE Mini_Program SHALL 展示该城市未来 3 天的逐日降雪预报
2. WHEN 降雪预报数据可用, THE Mini_Program SHALL 展示每日的预计降雪时段、降雪强度和累计降雪量
3. IF 预报数据暂不可用, THEN THE Mini_Program SHALL 展示"预报数据更新中，请稍后再试"

### 需求 5：收藏关注城市

**用户故事：** 作为用户，我想收藏我关注的城市，以便我可以快速查看这些城市的降雪情况。

#### 验收标准

1. WHEN 用户点击城市详情页的收藏按钮, THE Mini_Program SHALL 将该城市添加到用户的 Favorites_List 中
2. WHEN 用户查看收藏列表, THE Mini_Program SHALL 展示所有已收藏城市的当前降雪状态摘要
3. WHEN 已收藏城市开始下雪, THE Mini_Program SHALL 通过微信服务通知向用户发送降雪提醒
4. WHEN 用户再次点击已收藏城市的收藏按钮, THE Mini_Program SHALL 将该城市从 Favorites_List 中移除

### 需求 6：降雪数据缓存与刷新

**用户故事：** 作为用户，我想获得流畅的使用体验，即使在网络不佳时也能查看最近的降雪数据。

#### 验收标准

1. THE Snow_Query_Service SHALL 将降雪数据缓存在本地，缓存有效期为 30 分钟
2. WHEN 用户下拉刷新页面, THE Snow_Query_Service SHALL 强制从 Weather_Data_Source 获取最新数据并更新缓存
3. WHILE 网络不可用, THE Mini_Program SHALL 展示最近一次缓存的降雪数据，并标注"数据更新于 [时间]，当前为离线模式"
4. IF 本地无缓存数据且网络不可用, THEN THE Mini_Program SHALL 展示"无法获取降雪数据，请检查网络连接"

### 需求 7：降雪数据序列化与存储

**用户故事：** 作为开发者，我想将降雪数据以 JSON 格式序列化和反序列化，以便在本地缓存和网络传输中保持数据一致性。

#### 验收标准

1. WHEN 从 Weather_Data_Source 接收降雪数据, THE Snow_Query_Service SHALL 将 JSON 响应反序列化为 Snow_Region 数据对象
2. WHEN 缓存降雪数据到本地存储, THE Snow_Query_Service SHALL 将 Snow_Region 数据对象序列化为 JSON 格式
3. THE Snow_Query_Service SHALL 提供格式化输出功能，将 Snow_Region 数据对象转换为可读的 JSON 字符串
4. FOR ALL 有效的 Snow_Region 数据对象, 序列化后再反序列化 SHALL 产生与原始对象等价的结果（往返一致性）
