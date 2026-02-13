/**
 * 获取自定义导航栏所需的高度信息
 * 适配微信小程序胶囊按钮位置
 */
export function getNavBarInfo() {
  let statusBarHeight = 20
  let navBarHeight = 44
  let totalHeight = 64

  // #ifdef MP-WEIXIN
  try {
    const windowInfo = wx.getWindowInfo()
    statusBarHeight = windowInfo.statusBarHeight ?? 20

    const capsule = wx.getMenuButtonBoundingClientRect()
    // 导航栏高度 = 胶囊底部 + 胶囊顶部与状态栏的间距
    const capsuleMargin = capsule.top - statusBarHeight
    navBarHeight = capsule.height + capsuleMargin * 2
    totalHeight = statusBarHeight + navBarHeight
  } catch {
    totalHeight = statusBarHeight + navBarHeight
  }
  // #endif

  // #ifndef MP-WEIXIN
  totalHeight = statusBarHeight + navBarHeight
  // #endif

  return { statusBarHeight, navBarHeight, totalHeight }
}
