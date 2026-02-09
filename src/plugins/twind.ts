/**
 * TwindCSS 初始化插件
 *
 * 在应用启动时调用 `setup()` 安装 twind，
 * 使得全局可以使用 `tw()` 函数和 `cx()` 工具生成原子化样式。
 *
 * 用法：
 *   在 main.ts 中 import '@/plugins/twind'
 *   在组件中 import { tw, cx } from '@/plugins/twind'
 */
import { setup, tw as twindTw, cx as twindCx } from '@twind/core'
import { twindConfig } from '../twind.config'

// 执行 twind 安装，注册配置
setup(twindConfig)

/**
 * tw — 生成原子化 CSS 类名
 *
 * @example
 * ```vue
 * <template>
 *   <view :class="tw('bg-primary rounded-3xl p-4 text-body-md')">
 *     M3 Expressive 卡片
 *   </view>
 * </template>
 * ```
 */
export const tw = twindTw

/**
 * cx — 条件合并类名工具
 *
 * @example
 * ```vue
 * <template>
 *   <view :class="tw(cx('rounded-3xl p-4', isActive && 'bg-primary', !isActive && 'bg-surface'))">
 *     条件样式
 *   </view>
 * </template>
 * ```
 */
export const cx = twindCx

export default {
  tw,
  cx,
}
