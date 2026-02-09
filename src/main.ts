import { createSSRApp } from 'vue'
import App from './App.vue'

// M3 Expressive 静态样式（替代 twind 运行时，兼容小程序）
import './styles/m3.css'

export function createApp() {
  const app = createSSRApp(App)

  return {
    app,
  }
}
