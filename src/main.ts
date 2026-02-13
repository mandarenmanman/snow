import { createSSRApp } from 'vue'
import App from './App.vue'

// M3 Expressive 静态样式（替代 twind 运行时，兼容小程序）
import './styles/m3.css'

declare const wx: any

// 加载字体
// Font Awesome字体加载函数
function loadFontAwesome() {
  console.log('main.ts 开始加载Font Awesome字体')
  
  // 检查是否为H5环境
  if (typeof window !== 'undefined') {
    console.log('H5环境：通过CSS加载Font Awesome字体')
    // H5环境下，字体通过CSS文件加载，无需额外处理
    return
  }
  
  // 微信小程序环境 - 使用CDN加载字体（wx.loadFontFace只支持http/https协议）
  if (typeof wx !== 'undefined' && wx.loadFontFace) {
    console.log('微信小程序环境：开始调用wx.loadFontFace加载CDN字体')
    
    // Font Awesome CDN地址（使用jsDelivr CDN）
    const FA_CDN_BASE = 'https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/font-awesome/6.5.1/webfonts'
    
    // 加载 Solid 字体（实心图标）- CDN路径
    wx.loadFontFace({
      family: 'FontAwesome',
      source: `url('${FA_CDN_BASE}/fa-solid-900.woff2')`,
      global: true,
      success: () => {
        console.log('✅ Font Awesome Solid字体加载成功')
      },
      fail: (err: any) => {
        console.error('❌ Font Awesome Solid字体加载失败:', err)
      }
    })
    
    // 加载 Regular 字体（空心图标）- CDN路径
    wx.loadFontFace({
      family: 'FontAwesomeRegular',
      source: `url('${FA_CDN_BASE}/fa-regular-400.woff2')`,
      global: true,
      success: () => {
        console.log('✅ Font Awesome Regular字体加载成功')
      },
      fail: (err: any) => {
        console.error('❌ Font Awesome Regular字体加载失败:', err)
      }
    })

 
  } else {
    console.warn('⚠️ wx对象或wx.loadFontFace方法不可用')
  }
}

loadFontAwesome()

export function createApp() {
  const app = createSSRApp(App)

  return {
    app,
  }
}
