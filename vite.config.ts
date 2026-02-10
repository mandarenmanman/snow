import { defineConfig } from 'vite'
import { cpSync, existsSync } from 'fs'
import { resolve } from 'path'
import uniModule from '@dcloudio/vite-plugin-uni'

const uni = uniModule.default || uniModule

/**
 * 将 cloudfunctions 目录原样复制到编译输出目录（不经过编译）
 */
function copyCloudFunctions() {
  const src = resolve(__dirname, 'cloudfunctions')
  return {
    name: 'copy-cloudfunctions',
    closeBundle() {
      if (!existsSync(src)) return
      // build 模式
      const buildDest = resolve(__dirname, 'dist/build/mp-weixin/cloudfunctions')
      try { cpSync(src, buildDest, { recursive: true }) } catch {}
      // dev 模式
      const devDest = resolve(__dirname, 'dist/dev/mp-weixin/cloudfunctions')
      try { cpSync(src, devDest, { recursive: true }) } catch {}
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
    copyCloudFunctions(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
