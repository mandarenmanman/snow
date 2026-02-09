/**
 * FontAwesome 插件配置测试
 *
 * 验证 FontAwesome 按需注册插件的正确性：
 * - 图标库注册（solid + regular）
 * - Vue 插件导出与组件注册
 * - 按需引入的图标可用性
 */
import { describe, it, expect } from 'vitest'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fontAwesomePlugin, FontAwesomeIcon } from '@/plugins/fontawesome'

describe('FontAwesome 插件配置', () => {
  describe('插件导出', () => {
    it('应导出 fontAwesomePlugin 对象', () => {
      expect(fontAwesomePlugin).toBeDefined()
      expect(typeof fontAwesomePlugin.install).toBe('function')
    })

    it('应导出 FontAwesomeIcon 组件', () => {
      expect(FontAwesomeIcon).toBeDefined()
    })
  })

  describe('Solid 图标注册', () => {
    const solidIcons = [
      'snowflake',
      'search',
      'magnifying-glass',
      'location-dot',
      'location-arrow',
      'star',
      'rotate-right',
      'wifi',
      'house',
      'heart',
      'cloud',
      'temperature-half',
      'wind',
      'droplet',
      'eye',
      'calendar-days',
      'circle-exclamation',
      'arrows-rotate',
    ]

    it.each(solidIcons)('应注册 solid 图标: %s', (iconName) => {
      const icon = library.definitions['fas']?.[iconName]
      expect(icon).toBeDefined()
    })
  })

  describe('Regular 图标注册', () => {
    const regularIcons = ['heart', 'star', 'snowflake']

    it.each(regularIcons)('应注册 regular 图标: %s', (iconName) => {
      const icon = library.definitions['far']?.[iconName]
      expect(icon).toBeDefined()
    })
  })

  describe('Vue 插件注册', () => {
    it('install 方法应注册 font-awesome-icon 全局组件', () => {
      const registeredComponents: Record<string, unknown> = {}
      const mockApp = {
        component(name: string, component: unknown) {
          registeredComponents[name] = component
        },
      }

      fontAwesomePlugin.install(mockApp as any)

      expect(registeredComponents['font-awesome-icon']).toBeDefined()
      expect(registeredComponents['font-awesome-icon']).toBe(FontAwesomeIcon)
    })
  })
})
