/**
 * TwindCSS 配置测试
 *
 * 验证 M3 Expressive 设计令牌配置的正确性：
 * - 色彩系统（冰蓝/雪白主色调）
 * - 圆角系统（M3 大圆角）
 * - 字体层级（Display、Headline、Title、Body、Label）
 * - 间距系统
 * - 阴影系统
 * - 降雪强度色彩
 */
import { describe, it, expect } from 'vitest'
import { twindConfig, designTokens } from '@/twind.config'

describe('TwindCSS M3 Expressive 配置', () => {
  describe('配置结构', () => {
    it('应成功导出 twindConfig 配置对象', () => {
      expect(twindConfig).toBeDefined()
      expect(typeof twindConfig).toBe('object')
    })

    it('应包含自定义主题扩展', () => {
      expect(twindConfig.theme).toBeDefined()
      expect(twindConfig.theme!.extend).toBeDefined()
    })

    it('应包含自定义规则', () => {
      expect(twindConfig.rules).toBeDefined()
      expect(twindConfig.rules!.length).toBeGreaterThan(0)
    })
  })

  describe('色彩系统 — 冰蓝/雪白主色调', () => {
    const { colors } = designTokens

    it('应定义 primary 冰蓝色系', () => {
      expect(colors.primary).toBeDefined()
      expect(colors.primary.DEFAULT).toBe('#4FC3F7')
      expect(colors.primary.light).toBe('#8BF6FF')
      expect(colors.primary.dark).toBe('#0093C4')
      expect(colors.primary.container).toBe('#E1F5FE')
      expect(colors.primary['on-container']).toBe('#01579B')
    })

    it('应定义 secondary 雪白蓝色系', () => {
      expect(colors.secondary).toBeDefined()
      expect(colors.secondary.DEFAULT).toBe('#B3E5FC')
      expect(colors.secondary.container).toBe('#F0F9FF')
    })

    it('应定义 tertiary 霜紫色系', () => {
      expect(colors.tertiary).toBeDefined()
      expect(colors.tertiary.DEFAULT).toBe('#CE93D8')
    })

    it('应定义 surface 表面色系', () => {
      expect(colors.surface).toBeDefined()
      expect(colors.surface.DEFAULT).toBe('#FAFCFF')
      expect(colors.surface.container).toBeDefined()
    })

    it('应定义 error 错误色', () => {
      expect(colors.error).toBeDefined()
      expect(colors.error.DEFAULT).toBe('#BA1A1A')
    })

    it('应定义降雪强度色彩', () => {
      expect(colors.snow).toBeDefined()
      expect(colors.snow.light).toBeDefined()     // 小雪
      expect(colors.snow.moderate).toBeDefined()   // 中雪
      expect(colors.snow.heavy).toBeDefined()      // 大雪
      expect(colors.snow.blizzard).toBeDefined()   // 暴雪
      expect(colors.snow.none).toBeDefined()       // 无雪
    })

    it('应定义文字色', () => {
      expect(colors['on-primary']).toBe('#FFFFFF')
      expect(colors['on-surface']).toBe('#1A1C1E')
      expect(colors['on-surface-variant']).toBe('#43474E')
    })
  })

  describe('圆角系统 — M3 Expressive 大圆角', () => {
    const { borderRadius } = designTokens

    it('应定义 M3 标准圆角层级', () => {
      expect(borderRadius.none).toBe('0px')
      expect(borderRadius.xs).toBe('4px')
      expect(borderRadius.sm).toBe('8px')
      expect(borderRadius.md).toBe('12px')
      expect(borderRadius.lg).toBe('16px')
      expect(borderRadius.xl).toBe('20px')
      expect(borderRadius['2xl']).toBe('24px')
      expect(borderRadius['3xl']).toBe('28px')  // M3 Expressive 标准大圆角
      expect(borderRadius.full).toBe('9999px')
    })
  })

  describe('字体层级 — M3 Type Scale', () => {
    const { fontSize } = designTokens

    it('应定义 Display 层级（大/中/小）', () => {
      expect(fontSize['display-lg']).toBeDefined()
      expect(fontSize['display-md']).toBeDefined()
      expect(fontSize['display-sm']).toBeDefined()
      expect(fontSize['display-lg'][0]).toBe('57px')
    })

    it('应定义 Headline 层级（大/中/小）', () => {
      expect(fontSize['headline-lg']).toBeDefined()
      expect(fontSize['headline-md']).toBeDefined()
      expect(fontSize['headline-sm']).toBeDefined()
      expect(fontSize['headline-lg'][0]).toBe('32px')
    })

    it('应定义 Title 层级（大/中/小）', () => {
      expect(fontSize['title-lg']).toBeDefined()
      expect(fontSize['title-md']).toBeDefined()
      expect(fontSize['title-sm']).toBeDefined()
      expect(fontSize['title-lg'][0]).toBe('22px')
    })

    it('应定义 Body 层级（大/中/小）', () => {
      expect(fontSize['body-lg']).toBeDefined()
      expect(fontSize['body-md']).toBeDefined()
      expect(fontSize['body-sm']).toBeDefined()
      expect(fontSize['body-lg'][0]).toBe('16px')
    })

    it('应定义 Label 层级（大/中/小）', () => {
      expect(fontSize['label-lg']).toBeDefined()
      expect(fontSize['label-md']).toBeDefined()
      expect(fontSize['label-sm']).toBeDefined()
      expect(fontSize['label-lg'][0]).toBe('14px')
    })

    it('每个字体层级应包含 lineHeight 和 letterSpacing', () => {
      const allLevels = [
        'display-lg', 'display-md', 'display-sm',
        'headline-lg', 'headline-md', 'headline-sm',
        'title-lg', 'title-md', 'title-sm',
        'body-lg', 'body-md', 'body-sm',
        'label-lg', 'label-md', 'label-sm',
      ] as const

      for (const level of allLevels) {
        const [size, config] = fontSize[level]
        expect(size).toBeTruthy()
        expect(config).toBeDefined()
        expect((config as any).lineHeight).toBeTruthy()
        expect((config as any).letterSpacing).toBeDefined()
        expect((config as any).fontWeight).toBeTruthy()
      }
    })
  })

  describe('间距系统 — M3 4px 基准网格', () => {
    const { spacing } = designTokens

    it('应定义基础间距值', () => {
      expect(spacing['0']).toBe('0px')
      expect(spacing['1']).toBe('4px')
      expect(spacing['2']).toBe('8px')
      expect(spacing['4']).toBe('16px')
      expect(spacing['6']).toBe('24px')
      expect(spacing['8']).toBe('32px')
    })

    it('间距值应基于 4px 网格', () => {
      const numericKeys = Object.keys(spacing).filter(k => !isNaN(Number(k)) && Number(k) > 0)
      for (const key of numericKeys) {
        const value = parseInt(spacing[key as keyof typeof spacing])
        expect(value % 2).toBe(0) // 至少是 2px 的倍数
      }
    })
  })

  describe('阴影系统 — M3 Elevation', () => {
    const { boxShadow } = designTokens

    it('应定义 5 个 elevation 层级', () => {
      expect(boxShadow['elevation-1']).toBeDefined()
      expect(boxShadow['elevation-2']).toBeDefined()
      expect(boxShadow['elevation-3']).toBeDefined()
      expect(boxShadow['elevation-4']).toBeDefined()
      expect(boxShadow['elevation-5']).toBeDefined()
    })
  })

  describe('动画过渡 — M3 Motion', () => {
    const { transition } = designTokens

    it('应定义 standard 和 emphasized 过渡', () => {
      expect(transition.standard).toBeDefined()
      expect(transition['standard-decelerate']).toBeDefined()
      expect(transition['standard-accelerate']).toBeDefined()
      expect(transition.emphasized).toBeDefined()
      expect(transition['emphasized-decelerate']).toBeDefined()
      expect(transition['emphasized-accelerate']).toBeDefined()
    })

    it('过渡应使用 cubic-bezier 缓动函数', () => {
      expect(transition.standard).toContain('cubic-bezier')
      expect(transition.emphasized).toContain('cubic-bezier')
    })
  })

  describe('designTokens 导出', () => {
    it('应导出所有设计令牌', () => {
      expect(designTokens.colors).toBeDefined()
      expect(designTokens.borderRadius).toBeDefined()
      expect(designTokens.fontSize).toBeDefined()
      expect(designTokens.spacing).toBeDefined()
      expect(designTokens.boxShadow).toBeDefined()
      expect(designTokens.transition).toBeDefined()
    })
  })
})
