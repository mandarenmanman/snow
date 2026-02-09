/**
 * 网络状态监测模块
 *
 * 使用 uni.getNetworkType 检测初始网络状态，
 * 使用 uni.onNetworkStatusChange 监听网络状态变化。
 * 导出响应式变量 isOnline 和 networkType 供全局使用。
 *
 * Requirements: 6.3, 6.4
 */
import { ref } from 'vue'

/** 当前是否在线 */
export const isOnline = ref(true)

/** 当前网络类型（wifi / 2g / 3g / 4g / 5g / ethernet / none / unknown） */
export const networkType = ref<string>('unknown')

/**
 * 初始化网络状态监测
 *
 * 应在 App.vue 的 onLaunch 中调用一次。
 * - 获取初始网络状态
 * - 监听后续网络状态变化
 */
export function initNetworkMonitor(): void {
  // 获取初始网络状态
  uni.getNetworkType({
    success: (res) => {
      networkType.value = res.networkType
      isOnline.value = res.networkType !== 'none'
    },
  })

  // 监听网络状态变化
  uni.onNetworkStatusChange((res) => {
    isOnline.value = res.isConnected
    networkType.value = res.networkType
  })
}
