/**
 * FontAwesome 图标按需注册插件
 *
 * 仅注册项目中使用到的图标，减小包体积。
 * 使用方式：在模板中通过 <font-awesome-icon :icon="['fas', 'snowflake']" /> 使用图标
 */
import type { App } from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

// Solid 图标（fas）
import {
  faSnowflake,
  faSearch,
  faMagnifyingGlass,
  faLocationDot,
  faLocationArrow,
  faStar,
  faRotateRight,
  faWifi,
  faHouse,
  faHeart,
  faCloud,
  faTemperatureHalf,
  faWind,
  faDroplet,
  faEye,
  faCalendarDays,
  faCircleExclamation,
  faArrowsRotate,
} from '@fortawesome/free-solid-svg-icons'

// Regular 图标（far）— 用于收藏等切换状态
import {
  faHeart as farHeart,
  faStar as farStar,
  faSnowflake as farSnowflake,
} from '@fortawesome/free-regular-svg-icons'

// 批量注册所有图标到 library
library.add(
  // Solid
  faSnowflake,
  faSearch,
  faMagnifyingGlass,
  faLocationDot,
  faLocationArrow,
  faStar,
  faRotateRight,
  faWifi,
  faHouse,
  faHeart,
  faCloud,
  faTemperatureHalf,
  faWind,
  faDroplet,
  faEye,
  faCalendarDays,
  faCircleExclamation,
  faArrowsRotate,
  // Regular
  farHeart,
  farStar,
  farSnowflake,
)

/**
 * FontAwesome Vue 插件
 * 全局注册 <font-awesome-icon> 组件
 */
export const fontAwesomePlugin = {
  install(app: App) {
    app.component('font-awesome-icon', FontAwesomeIcon)
  },
}

export { FontAwesomeIcon }
