/// <reference types="@dcloudio/types" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 微信小程序云开发类型声明
declare namespace WechatMiniprogram {
  interface Wx {
    cloud: {
      init(config: { env: string; traceUser?: boolean }): void
      callFunction(params: {
        name: string
        data?: Record<string, any>
      }): Promise<{ result: any }>
    }
  }
}
