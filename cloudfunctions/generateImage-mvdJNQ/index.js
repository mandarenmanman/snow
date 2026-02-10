const tcb = require("@cloudbase/node-sdk")

/**
 * 云函数: generateImage
 * 生成城市景区图片，优先从数据库读取缓存，未命中再调用 AI 生成并存库
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
                return { success: true, imageUrl: data[0].imageUrl, cached: true }
            }
        } catch (e) {
            // 查询失败不阻塞，继续生成
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
        const imageUrl = url || ''

        // 生成成功且有 cityId，写入数据库缓存
        if (imageUrl && cityId) {
            try {
                await collection.add({
                    cityId,
                    imageUrl,
                    prompt: event.prompt,
                    createdAt: new Date().toISOString(),
                })
            } catch (e) {
                console.warn('写入缓存失败:', e.message)
            }
        }

        return { ...rest, imageUrl, success: true, cached: false }
    } catch (e) {
        return { success: false, code: 'request_error', message: e.message }
    }
}
