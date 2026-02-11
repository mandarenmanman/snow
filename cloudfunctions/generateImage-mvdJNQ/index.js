const tcb = require("@cloudbase/node-sdk")
const https = require("https")
const http = require("http")

/**
 * 下载远程图片，返回 Buffer
 */
function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http
        client.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadImage(res.headers.location).then(resolve).catch(reject)
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`下载图片失败，状态码: ${res.statusCode}`))
            }
            const chunks = []
            res.on('data', (chunk) => chunks.push(chunk))
            res.on('end', () => resolve(Buffer.concat(chunks)))
            res.on('error', reject)
        }).on('error', reject)
    })
}

/**
 * 云函数: generateImage
 * 生成城市景区图片，优先从数据库读取缓存，未命中再调用 AI 生成并持久化到云存储
 *
 * @param {string} event.cityId - 城市 ID（用于缓存查询）
 * @param {string} event.prompt - 图片生成 prompt
 * @returns {{ success: boolean, imageUrl: string }}
 */
exports.main = async (event, context) => {
    const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
    const db = app.database()
    const collection = db.collection('city_images')

    if (!event.prompt) {
        return { success: false, code: 'invalid_param', message: '缺少 prompt 参数' }
    }

    const { cityId, style, model = 'hunyuan-image', ...restEvent } = event

    // 有 cityId 时先查数据库缓存
    if (cityId) {
        try {
            const { data } = await collection.where({ cityId }).limit(1).get()
            if (data && data.length > 0 && data[0].imageUrl) {
                return { success: true, imageUrl: data[0].imageUrl, fileID: data[0].fileID || '', cached: true }
            }
        } catch (e) {
            console.warn('查询缓存失败:', e.message)
        }
    }

    // 缓存未命中，调用 AI 生成
    try {
        const ai = app.ai()
        const imageModel = ai.createImageModel(process.env.PROVIDER || "hunyuan-image")
        if (process.env.ENDPOINT_PATH) {
            imageModel.defaultGenerateImageSubUrl = process.env.ENDPOINT_PATH
        }

        const res = await imageModel.generateImage({
            model,
            ...(/hunyuan-image-v3.0/.test(model) ? {
                revise: { "value": false },
                enable_thinking: { "value": false }
            } : {}),
            ...restEvent,
        })

        const { data, error } = res

        if (error) {
            return { success: false, ...error }
        }

        const img = data?.[0] || {}
        const { url, ...rest } = img
        const tempUrl = url || ''

        if (!tempUrl) {
            return { ...rest, imageUrl: '', success: true, cached: false }
        }

        // 下载图片并上传到云存储，获取永久地址
        let imageUrl = tempUrl
        let fileID = ''
        try {
            const buffer = await downloadImage(tempUrl)
            const cloudPath = `city_images/${cityId || Date.now()}_${Date.now()}.png`

            const uploadRes = await app.uploadFile({
                cloudPath,
                fileContent: buffer,
            })
            fileID = uploadRes.fileID

            // 通过 fileID 获取可访问的临时 URL（有效期较长）
            const urlRes = await app.getTempFileURL({ fileList: [fileID] })
            const fileUrl = urlRes.fileList?.[0]?.tempFileURL
            if (fileUrl) {
                imageUrl = fileUrl
            }
        } catch (e) {
            console.warn('上传云存储失败，回退使用临时 URL:', e.message)
            // 上传失败时 imageUrl 保持为 tempUrl
        }

        // 生成成功且有 cityId，写入数据库缓存
        if (imageUrl && cityId) {
            try {
                await collection.add({
                    cityId,
                    imageUrl,
                    fileID,
                    prompt: event.prompt,
                    createdAt: new Date().toISOString(),
                })
            } catch (e) {
                console.warn('写入缓存失败:', e.message)
            }
        }

        return { ...rest, imageUrl, fileID, success: true, cached: false }
    } catch (e) {
        return { success: false, code: 'request_error', message: e.message }
    }
}
