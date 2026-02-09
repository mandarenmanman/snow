/**
 * SnowRegion 序列化、反序列化和格式化输出工具
 *
 * - serialize: 将 SnowRegion 对象序列化为 JSON 字符串
 * - deserialize: 将 JSON 字符串反序列化为 SnowRegion 对象（通过 createSnowRegion 验证并填充默认值）
 * - prettyPrint: 将 SnowRegion 对象转换为格式化（缩进）的 JSON 字符串
 *
 * Requirements: 7.1, 7.2, 7.3
 */

import type { SnowRegion } from '@/models/types'
import { createSnowRegion } from '@/models/factories'

/**
 * 将 SnowRegion 数据对象序列化为 JSON 字符串
 *
 * @param snowRegion - 要序列化的 SnowRegion 对象
 * @returns JSON 字符串
 */
export function serialize(snowRegion: SnowRegion): string {
  return JSON.stringify(snowRegion)
}

/**
 * 将 JSON 字符串反序列化为 SnowRegion 数据对象
 * 使用 createSnowRegion 工厂函数进行字段验证和默认值填充
 *
 * @param jsonString - JSON 格式的字符串
 * @returns 经过验证的 SnowRegion 对象
 * @throws {SyntaxError} 当 JSON 字符串格式无效时
 */
export function deserialize(jsonString: string): SnowRegion {
  const parsed = JSON.parse(jsonString)
  return createSnowRegion(parsed)
}

/**
 * 将 SnowRegion 数据对象转换为格式化（缩进）的 JSON 字符串
 *
 * @param snowRegion - 要格式化输出的 SnowRegion 对象
 * @returns 格式化的 JSON 字符串（2 空格缩进）
 */
export function prettyPrint(snowRegion: SnowRegion): string {
  return JSON.stringify(snowRegion, null, 2)
}
