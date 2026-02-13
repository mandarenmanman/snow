<template>
  <view class="share-page">
    <!-- 顶部栏 -->
    <view class="share-topbar" :style="{ paddingTop: navPadding }">
      <view class="share-topbar-btn" hover-class="hover-opacity-60" @click="goBack">
        <text class="fa-icon fa-arrow-left"></text>
      </view>
      <text class="share-topbar-title">分享卡片</text>
      <view style="width: 40px;"></view>
    </view>
    <view class="navbar-placeholder" :style="{ height: navTotalHeight + 'px' }"></view>

    <scroll-view scroll-y class="scroll-content">
      <view class="page-body">
        <!-- 海报 -->
        <snapshot id="shareCard" class="card-wrapper">
          <view class="card">
          <!-- 渐变背景层：用多层 view 模拟，确保 takeSnapshot 能截到 -->
          <view class="card-bg-gradient card-bg-gradient-top"></view>
          <view class="card-bg-gradient card-bg-gradient-bottom"></view>
          <!-- 背景装饰圆 -->
          <view class="card-bg-circle card-bg-circle-1"></view>
          <view class="card-bg-circle card-bg-circle-2"></view>

          <!-- 顶部城市信息 -->
          <view class="card-top">
            <view class="card-city-row">
              <text class="card-city">{{ cityName }}</text>
              <view v-if="snowLevel !== '无'" class="snow-tag">
                <text class="fa-icon fa-snowflake snow-tag-icon"></text>
                <text class="snow-tag-text">{{ snowLevel }}</text>
              </view>
            </view>
            <text class="card-weather-text">{{ weather }}</text>
          </view>

          <!-- 核心温度区 -->
          <view class="card-hero">
            <WeatherIcon v-if="iconCode" :code="iconCode" fill size="48px" />
            <text class="card-temp">{{ temp }}°</text>
          </view>

          <!-- 指标行 -->
          <view class="card-stats">
            <view class="stat-item">
              <text class="stat-val">{{ humidity }}%</text>
              <text class="stat-label">湿度</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
              <text class="stat-val">{{ windSpeed }}km/h</text>
              <text class="stat-label">风速</text>
            </view>
            <view class="stat-divider"></view>
            <view class="stat-item">
              <text class="stat-val">{{ windDirection }}</text>
              <text class="stat-label">风向</text>
            </view>
          </view>

          <!-- 未来降雪预报 -->
          <view v-if="snowDays.length > 0" class="card-snow-forecast">
            <view class="card-snow-forecast-header">
              <text class="fa-icon fa-snowflake card-snow-forecast-icon"></text>
              <text class="card-snow-forecast-title">未来降雪</text>
            </view>
            <view v-for="(day, idx) in snowDays" :key="idx" class="card-snow-forecast-row">
              <text class="card-snow-forecast-label">{{ day.label }}</text>
              <text class="card-snow-forecast-level">{{ day.level }}</text>
            </view>
          </view>

          <!-- 用户心情 -->
          <view v-if="shareText" class="card-quote">
            <text class="card-quote-text">"{{ shareText }}"</text>
          </view>

          <!-- 底部品牌 -->
          <view class="card-brand">
            <view class="brand-line"></view>
            <view class="brand-content">
              <view class="brand-left">
                <text class="brand-name">西门问雪</text>
                <text class="brand-slogan">发现身边的每一场雪</text>
              </view>
              <image class="brand-qrcode" :src="qrcodeUrl" mode="aspectFit" />
            </view>
          </view>
          </view>
        </snapshot>

        <!-- 输入 + 按钮 -->
        <view class="bottom-area">
          <view class="input-wrap">
            <input
              v-model="shareText"
              class="share-input"
              placeholder="写一句分享心情..."
              maxlength="20"
              :placeholder-style="'color:#bbb;font-size:14px'"
            />
            <text class="input-count">{{ shareText.length }}/20</text>
          </view>
          <view
            class="save-btn"
            hover-class="hover-opacity-80"
            :class="{ disabled: isGenerating }"
            @click="handleShare"
          >
            <text class="fa-icon fa-share-nodes save-btn-icon"></text>
            <text class="save-btn-text">{{ isGenerating ? '生成中...' : '保存并分享' }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, getCurrentInstance } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { getNavBarInfo } from '@/utils/navbar'
import WeatherIcon from '@/components/WeatherIcon.vue'

const cityId = ref('')
const cityName = ref('')
const temp = ref('')
const weather = ref('')
const iconCode = ref('')
const snowLevel = ref('无')
const humidity = ref('')
const windSpeed = ref('')
const windDirection = ref('')
const shareText = ref('')
const isGenerating = ref(false)
const qrcodeUrl = ref('/static/qrcode.jpg')
const snowDays = ref<Array<{ label: string; level: string }>>([])

const { statusBarHeight, totalHeight } = getNavBarInfo()
const navPadding = `${statusBarHeight}px`
const navTotalHeight = totalHeight

function goBack() {
  uni.navigateBack({ delta: 1 })
}

async function handleShare() {
  if (isGenerating.value) return
  isGenerating.value = true

  try {
    uni.showLoading({ title: '生成中...' })
    await nextTick()

    setTimeout(() => {
      // #ifdef MP-WEIXIN
      const instance = getCurrentInstance()
      const query = wx.createSelectorQuery().in(instance?.proxy)
      query.select('#shareCard').node().exec((res: any) => {
        if (res && res[0] && res[0].node) {
          const node = res[0].node
          node.takeSnapshot({
            type: 'arraybuffer',
            format: 'png',
            success: (snapshotRes: any) => {
              const filePath = `${wx.env.USER_DATA_PATH}/snow_share_${Date.now()}.png`
              const fs = wx.getFileSystemManager()
              fs.writeFile({
                filePath,
                data: snapshotRes.data,
                encoding: 'binary',
                success: () => {
                  uni.hideLoading()
                  wx.showShareImageMenu({
                    path: filePath,
                    style: 'v2',
                    entrys: ['shareAppMessage', 'shareTimeline', 'addToFavorites', 'saveImageToPhotosAlbum'],
                  })
                  isGenerating.value = false
                },
                fail: (err: any) => {
                  uni.hideLoading()
                  console.error('写入文件失败:', err)
                  uni.showToast({ title: '生成失败', icon: 'none' })
                  isGenerating.value = false
                },
              })
            },
            fail: (err: any) => {
              uni.hideLoading()
              console.error('takeSnapshot 失败:', err)
              uni.showModal({
                title: '提示',
                content: '海报生成失败，您可以截屏保存当前页面',
                confirmText: '知道了',
                showCancel: false,
              })
              isGenerating.value = false
            },
          })
        } else {
          uni.hideLoading()
          uni.showToast({ title: '截图组件未就绪', icon: 'none' })
          isGenerating.value = false
        }
      })
      // #endif
    }, 500)
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '生成失败', icon: 'none' })
    isGenerating.value = false
  }
}

onShareAppMessage(() => ({
  title: `${cityName.value} ${weather.value} ${temp.value}°C — 西门问雪`,
  path: `/pages/detail/detail?cityId=${cityId.value}&cityName=${encodeURIComponent(cityName.value)}`,
}))

onLoad((options) => {
  if (options) {
    cityId.value = options.cityId || ''
    cityName.value = decodeURIComponent(options.cityName || '')
    temp.value = options.temp || ''
    weather.value = decodeURIComponent(options.weather || '')
    iconCode.value = options.iconCode || ''
    snowLevel.value = decodeURIComponent(options.snowLevel || '无')
    humidity.value = options.humidity || ''
    windSpeed.value = options.windSpeed || ''
    windDirection.value = decodeURIComponent(options.windDirection || '')
    // 解析未来降雪预报: "label1|level1,label2|level2"
    if (options.snowDays) {
      const raw = decodeURIComponent(options.snowDays)
      snowDays.value = raw.split(',').map((s) => {
        const [label, level] = s.split('|')
        return { label: label || '', level: level || '' }
      }).filter((d) => d.label && d.level)
    }
  }
  loadQRCode()
})

async function loadQRCode() {
  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({
      name: 'getQRCode',
      data: {
        scene: `cityId=${cityId.value}`,
        page: 'pages/detail/detail',
      },
    })
    const result = res.result as { code?: number; data?: { url?: string } }
    if (result.code === 0 && result.data?.url) {
      qrcodeUrl.value = result.data.url
    }
    // #endif
  } catch {
    // 获取失败，保持本地默认图片 /static/qrcode.jpg
  }
}
</script>

<style>
/* ---- 字体图标 ---- */
@font-face {
  font-family: 'FontAwesome';
  src: url('https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.ttf') format('truetype');
  font-weight: 900;
  font-style: normal;
}
.fa-icon {
  font-family: 'FontAwesome' !important;
  font-style: normal;
  font-weight: 900;
  -webkit-font-smoothing: antialiased;
}
.fa-arrow-left::before { content: '\f060'; }
.fa-snowflake::before { content: '\f2dc'; }
.fa-share-nodes::before { content: '\f1e0'; }

/* ---- 页面 ---- */
.share-page {
  min-height: 100vh;
  background-color: #dce3ed;
  background-image: linear-gradient(160deg, #e8edf5 0%, #dce3ed 50%, #d0dae8 100%);
  display: flex;
  flex-direction: column;
}

/* ---- 顶部栏 ---- */
.share-topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; flex-direction: row; align-items: center; justify-content: space-between;
  padding: 8px 16px;
  background-color: rgba(255,255,255,0.85);
}
.share-topbar-btn {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
}
.share-topbar-btn .fa-icon { font-size: 18px; color: #333; }
.share-topbar-title { font-size: 17px; font-weight: 600; color: #1B1F26; }
.navbar-placeholder { flex-shrink: 0; }
.scroll-content { flex: 1; }

/* ---- 页面主体 ---- */
.page-body {
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 28px 80px;
}

/* ---- 卡片 ---- */
.card-wrapper {
  background-color: #dce3ed;
  padding: 12px;
}
.card {
  width: 295px;
  border-radius: 24px;
  background-color: #4a8fd6;
  padding: 32px 24px 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(59,108,181,0.25);
}

/* 渐变背景层：用纯色 view 叠加模拟渐变，takeSnapshot 可截到 */
.card-bg-gradient {
  position: absolute;
  left: 0;
  right: 0;
}
.card-bg-gradient-top {
  top: 0;
  height: 50%;
  background-color: #3b6cb5;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
}
.card-bg-gradient-bottom {
  bottom: 0;
  height: 50%;
  background-color: #6aaee8;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
}

/* 装饰圆 */
.card-bg-circle {
  position: absolute;
  border-radius: 999px;
  background-color: rgba(255,255,255,0.06);
}
.card-bg-circle-1 {
  width: 200px; height: 200px;
  top: -60px; right: -50px;
}
.card-bg-circle-2 {
  width: 140px; height: 140px;
  bottom: -30px; left: -40px;
}

/* ---- 城市 ---- */
.card-top {
  display: flex; flex-direction: column;
  position: relative; z-index: 1;
}
.card-city-row {
  display: flex; flex-direction: row; align-items: center;
}
.card-city {
  font-size: 20px; font-weight: 700; color: #fff; letter-spacing: 1px;
}
.snow-tag {
  display: flex; flex-direction: row; align-items: center;
  margin-left: 8px;
  background-color: rgba(255,255,255,0.2);
  border-radius: 20px;
  padding: 2px 10px 2px 6px;
}
.snow-tag-icon { font-size: 10px; color: #fff; margin-right: 3px; }
.snow-tag-text { font-size: 11px; color: #fff; font-weight: 500; margin-left: 3px; }
.card-weather-text {
  font-size: 13px; color: rgba(255,255,255,0.75); margin-top: 4px;
}

/* ---- 温度 ---- */
.card-hero {
  display: flex; flex-direction: row; align-items: center; justify-content: center;
  margin-top: 24px; margin-bottom: 20px;
  position: relative; z-index: 1;
}
.card-temp {
  font-size: 72px; font-weight: 200; color: #fff;
  line-height: 1; letter-spacing: -3px; margin-left: 8px;
}

/* ---- 指标 ---- */
.card-stats {
  display: flex; flex-direction: row; align-items: center; justify-content: space-between;
  background-color: rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 14px 12px;
  position: relative; z-index: 1;
}
.stat-item {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
}
.stat-val { font-size: 14px; font-weight: 600; color: #fff; }
.stat-label { font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 3px; }
.stat-divider {
  width: 1px; height: 24px;
  background-color: rgba(255,255,255,0.15);
}

/* ---- 未来降雪 ---- */
.card-snow-forecast {
  margin-top: 14px;
  padding: 10px 12px;
  background-color: rgba(255,255,255,0.1);
  border-radius: 12px;
  position: relative; z-index: 1;
}
.card-snow-forecast-header {
  display: flex; flex-direction: row; align-items: center;
  margin-bottom: 6px;
}
.card-snow-forecast-icon {
  font-size: 11px; color: rgba(255,255,255,0.7); margin-right: 5px;
}
.card-snow-forecast-title {
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.8);
}
.card-snow-forecast-row {
  display: flex; flex-direction: row; align-items: center; justify-content: space-between;
  padding: 3px 0;
}
.card-snow-forecast-label {
  font-size: 11px; color: rgba(255,255,255,0.65);
}
.card-snow-forecast-level {
  font-size: 11px; font-weight: 500; color: #fff;
}

/* ---- 引用 ---- */.card-quote {
  margin-top: 16px;
  padding: 10px 14px;
  background-color: rgba(255,255,255,0.1);
  border-radius: 12px;
  border-left-width: 3px;
  border-left-style: solid;
  border-left-color: rgba(255,255,255,0.4);
  position: relative; z-index: 1;
}
.card-quote-text {
  font-size: 13px; color: rgba(255,255,255,0.85);
  line-height: 1.6;
}

/* ---- 品牌 ---- */
.card-brand {
  display: flex; flex-direction: column; align-items: center;
  margin-top: 20px;
  position: relative; z-index: 1;
}
.brand-line {
  width: 100%; height: 1px;
  background-color: rgba(255,255,255,0.15);
  margin-bottom: 12px;
}
.brand-content {
  display: flex; flex-direction: row; align-items: center; justify-content: space-between;
  width: 100%;
}
.brand-left {
  display: flex; flex-direction: column;
}
.brand-name {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5);
  letter-spacing: 3px;
}
.brand-slogan {
  font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 3px;
}
.brand-qrcode {
  width: 48px; height: 48px;
  border-radius: 6px;
}

/* ---- 底部操作区 ---- */
.bottom-area {
  width: 100%; margin-top: 24px;
}
.input-wrap {
  display: flex; flex-direction: row; align-items: center;
  background-color: #fff;
  border-radius: 14px;
  padding: 0 14px;
  height: 48px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.share-input {
  flex: 1; font-size: 14px; color: #333;
}
.input-count {
  font-size: 12px; color: #ccc; margin-left: 8px; flex-shrink: 0;
}

.save-btn {
  display: flex; flex-direction: row; align-items: center; justify-content: center;
  width: 100%; height: 48px;
  border-radius: 24px;
  background-color: #4a8fd6;
  background-image: linear-gradient(135deg, #4a8fd6 0%, #5c6bc0 100%);
  margin-top: 16px;
  box-shadow: 0 4px 16px rgba(74,143,214,0.3);
}
.save-btn.disabled { opacity: 0.55; }
.save-btn-icon { font-size: 15px; color: #fff; margin-right: 6px; }
.save-btn-text { font-size: 15px; font-weight: 500; color: #fff; margin-left: 6px; }

/* hover */
.hover-opacity-60 { opacity: 0.6; }
.hover-opacity-80 { opacity: 0.8; }
</style>
