<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { initNetworkMonitor } from '@/utils/network'

onLaunch(() => {
  console.log('App Launch')

  // 初始化网络状态监测（Requirements: 6.3, 6.4）
  initNetworkMonitor()

  // #ifdef MP-WEIXIN
  // 初始化微信云开发
  if (wx.cloud) {
    wx.cloud.init({
      env: 'cloud-8gtloz12c121c4fa',
      traceUser: true,
    })
  }

  // 加载字体
  const fonts = [
    { family: 'Font Awesome 6 Free', source: 'url("https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2")', desc: { weight: '900' } },
    { family: 'Font Awesome 6 Free', source: 'url("https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2")', desc: { weight: '400' } }
  ]
  fonts.forEach((f) => {
    wx.loadFontFace({
      global: true,
      family: f.family,
      source: f.source,
      desc: f.desc,
      success: () => console.log(`${f.family} loaded`),
      fail: (err: any) => console.warn(`${f.family} failed:`, err),
    })
  })

  // #endif
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 全局样式 */
page {
  background-color: #F7F9FC;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #1B1F26;
}
</style>
