/**
 * TwindCSS 配置文件
 *
 * 定义 M3 Expressive 设计令牌：
 * - 色彩系统：冰蓝/雪白主色调，基于 M3 Dynamic Color
 * - 圆角：M3 Expressive 大圆角（rounded-3xl）
 * - 字体层级：Display、Headline、Title、Body、Label
 * - 间距：M3 标准间距系统
 */
import { defineConfig } from '@twind/core'
import presetTailwind from '@twind/preset-tailwind'

/**
 * M3 Expressive 色彩系统 — 冰蓝/雪白色系
 *
 * 基于 Material Design 3 的 Dynamic Color 方案，
 * 以冰蓝（ice-blue）为主色调，雪白（snow-white）为辅助色调。
 */
const m3Colors = {
  // 主色调 — 冰蓝 (Primary)
  primary: {
    DEFAULT: '#4FC3F7',   // 冰蓝主色
    light: '#8BF6FF',     // 浅冰蓝
    dark: '#0093C4',      // 深冰蓝
    container: '#E1F5FE', // 主色容器（浅底）
    'on-container': '#01579B', // 主色容器上的文字
  },
  // 辅助色调 — 雪白 (Secondary)
  secondary: {
    DEFAULT: '#B3E5FC',   // 雪白蓝
    light: '#E6FFFF',     // 极浅雪白
    dark: '#82B3C9',      // 深雪白
    container: '#F0F9FF', // 辅助色容器
    'on-container': '#0D47A1', // 辅助色容器上的文字
  },
  // 第三色调 — 霜紫 (Tertiary)
  tertiary: {
    DEFAULT: '#CE93D8',   // 霜紫
    light: '#FFC4FF',     // 浅霜紫
    dark: '#9C64A6',      // 深霜紫
    container: '#F3E5F5', // 第三色容器
    'on-container': '#4A148C', // 第三色容器上的文字
  },
  // 表面色 (Surface)
  surface: {
    DEFAULT: '#FAFCFF',   // 主表面色（近白）
    dim: '#D7DADD',       // 暗表面
    bright: '#FFFFFF',    // 亮表面
    'container-lowest': '#FFFFFF',
    'container-low': '#F1F4F8',
    container: '#EBF0F5',
    'container-high': '#E5EAF0',
    'container-highest': '#DFE4EA',
  },
  // 功能色
  error: {
    DEFAULT: '#BA1A1A',
    container: '#FFDAD6',
    'on-container': '#410002',
  },
  // 轮廓色
  outline: {
    DEFAULT: '#73777F',
    variant: '#C3C7CF',
  },
  // 降雪强度色彩
  snow: {
    light: '#E3F2FD',     // 小雪 — 浅蓝
    moderate: '#90CAF9',  // 中雪 — 中蓝
    heavy: '#42A5F5',     // 大雪 — 深蓝
    blizzard: '#1565C0',  // 暴雪 — 极深蓝
    none: '#E0E0E0',      // 无雪 — 灰色
  },
  // 文字色
  'on-primary': '#FFFFFF',
  'on-secondary': '#003258',
  'on-surface': '#1A1C1E',
  'on-surface-variant': '#43474E',
}

/**
 * M3 Expressive 圆角系统
 *
 * M3 Expressive 强调圆润形态，使用大圆角。
 */
const m3BorderRadius = {
  none: '0px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '28px',       // M3 Expressive 标准大圆角
  full: '9999px',
}

/**
 * M3 字体层级系统
 *
 * 遵循 Material Design 3 的 Type Scale：
 * Display → Headline → Title → Body → Label
 */
const m3FontSize = {
  // Display — 大标题（用于首页 Hero 区域）
  'display-lg': ['57px', { lineHeight: '64px', letterSpacing: '-0.25px', fontWeight: '400' }],
  'display-md': ['45px', { lineHeight: '52px', letterSpacing: '0px', fontWeight: '400' }],
  'display-sm': ['36px', { lineHeight: '44px', letterSpacing: '0px', fontWeight: '400' }],
  // Headline — 页面标题
  'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '0px', fontWeight: '400' }],
  'headline-md': ['28px', { lineHeight: '36px', letterSpacing: '0px', fontWeight: '400' }],
  'headline-sm': ['24px', { lineHeight: '32px', letterSpacing: '0px', fontWeight: '400' }],
  // Title — 卡片/区块标题
  'title-lg': ['22px', { lineHeight: '28px', letterSpacing: '0px', fontWeight: '500' }],
  'title-md': ['16px', { lineHeight: '24px', letterSpacing: '0.15px', fontWeight: '500' }],
  'title-sm': ['14px', { lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' }],
  // Body — 正文
  'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '0.5px', fontWeight: '400' }],
  'body-md': ['14px', { lineHeight: '20px', letterSpacing: '0.25px', fontWeight: '400' }],
  'body-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.4px', fontWeight: '400' }],
  // Label — 标签/按钮文字
  'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' }],
  'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.5px', fontWeight: '500' }],
  'label-sm': ['11px', { lineHeight: '16px', letterSpacing: '0.5px', fontWeight: '500' }],
}

/**
 * M3 间距系统
 *
 * 基于 4px 基准网格，扩展常用间距值。
 */
const m3Spacing = {
  '0': '0px',
  '0.5': '2px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
}

/**
 * M3 Expressive 阴影系统
 *
 * M3 使用柔和阴影，强调层级感。
 */
const m3BoxShadow = {
  'elevation-1': '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
  'elevation-2': '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
  'elevation-3': '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px rgba(0, 0, 0, 0.3)',
  'elevation-4': '0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px rgba(0, 0, 0, 0.3)',
  'elevation-5': '0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px rgba(0, 0, 0, 0.3)',
}

/**
 * M3 Expressive 动画过渡
 *
 * M3 Expressive 使用弹性动画（spring-based motion）。
 */
const m3Transition = {
  'standard': 'all 300ms cubic-bezier(0.2, 0, 0, 1)',
  'standard-decelerate': 'all 250ms cubic-bezier(0, 0, 0, 1)',
  'standard-accelerate': 'all 200ms cubic-bezier(0.3, 0, 1, 1)',
  'emphasized': 'all 500ms cubic-bezier(0.2, 0, 0, 1)',
  'emphasized-decelerate': 'all 400ms cubic-bezier(0.05, 0.7, 0.1, 1)',
  'emphasized-accelerate': 'all 200ms cubic-bezier(0.3, 0, 0.8, 0.15)',
}

/**
 * TwindCSS 配置导出
 */
export const twindConfig = defineConfig({
  presets: [presetTailwind()],
  theme: {
    extend: {
      colors: m3Colors,
      borderRadius: m3BorderRadius,
      fontSize: m3FontSize,
      spacing: m3Spacing,
      boxShadow: m3BoxShadow,
      transitionProperty: {
        'standard': m3Transition.standard,
        'emphasized': m3Transition.emphasized,
      },
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
    },
  },
  /* 自定义规则：M3 Expressive 快捷类 */
  rules: [
    // M3 Expressive 卡片样式
    ['m3-card', 'bg-surface-container rounded-3xl shadow-elevation-1 p-4'],
    ['m3-card-elevated', 'bg-surface-container-low rounded-3xl shadow-elevation-2 p-4'],
    // M3 Expressive 按钮样式
    ['m3-btn-filled', 'bg-primary text-on-primary rounded-full px-6 py-3 text-label-lg'],
    ['m3-btn-tonal', 'bg-secondary-container text-secondary-on-container rounded-full px-6 py-3 text-label-lg'],
    ['m3-btn-outlined', 'border border-outline rounded-full px-6 py-3 text-label-lg text-primary'],
    // M3 搜索栏
    ['m3-search-bar', 'bg-surface-container-high rounded-full px-4 py-3 text-body-lg'],
  ],
})

/**
 * 导出设计令牌常量，供组件直接引用
 */
export const designTokens = {
  colors: m3Colors,
  borderRadius: m3BorderRadius,
  fontSize: m3FontSize,
  spacing: m3Spacing,
  boxShadow: m3BoxShadow,
  transition: m3Transition,
} as const
