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
