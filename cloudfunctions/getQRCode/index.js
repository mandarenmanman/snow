// 云函数: getQRCode
// 调用 getUnlimitedQRCode 生成小程序码，上传到云存储返回 URL
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { scene = '', page = '' } = event

  try {
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: scene || 'default',
      page: page || undefined,
      width: 280,
      isHyaline: false,
    })

    if (!result.buffer) {
      return { code: -1, message: '生成小程序码失败' }
    }

    // 上传到云存储
    const fileName = `qrcode/wxacode_${Date.now()}.png`
    const uploadRes = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: result.buffer,
    })

    // 获取临时访问链接
    const urlRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID],
    })

    const fileUrl = urlRes.fileList[0].tempFileURL

    return { code: 0, data: { url: fileUrl } }
  } catch (err) {
    console.error('getQRCode error:', err)
    return { code: -1, message: '生成小程序码失败', error: err.message }
  }
}
