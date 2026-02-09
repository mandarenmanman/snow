/**
 * 本地缓存管理模块
 *
 * 提供缓存的读写、有效期判定和强制刷新功能。
 * 内部使用可替换的存储适配器，默认使用 uni.setStorageSync / uni.getStorageSync，
 * 测试时可通过 setStorageAdapter 注入 mock 存储。
 *
 * Requirements: 6.1, 6.2
 */

import type { CacheEntry } from '@/models/types'
import { DEFAULT_CACHE_TTL } from '@/models/types'
import { createCacheEntry } from '@/models/factories'

/**
 * 存储适配器接口
 * 抽象底层存储操作，便于测试时注入 mock
 */
export interface StorageAdapter {
  getItem(key: string): unknown
  setItem(key: string, value: unknown): void
}

/**
 * 默认存储适配器 — 使用 uni.setStorageSync / uni.getStorageSync
 */
const uniStorageAdapter: StorageAdapter = {
  getItem(key: string): unknown {
    return uni.getStorageSync(key)
  },
  setItem(key: string, value: unknown): void {
    uni.setStorageSync(key, value)
  },
}

/** 当前使用的存储适配器 */
let storageAdapter: StorageAdapter = uniStorageAdapter

/**
 * 设置存储适配器（用于测试时注入 mock 存储）
 *
 * @param adapter - 自定义存储适配器
 */
export function setStorageAdapter(adapter: StorageAdapter): void {
  storageAdapter = adapter
}

/**
 * 重置存储适配器为默认的 uni 存储
 */
export function resetStorageAdapter(): void {
  storageAdapter = uniStorageAdapter
}

/**
 * 写入缓存并记录时间戳，TTL 默认 30 分钟
 *
 * @param key - 缓存键名
 * @param data - 要缓存的数据
 */
export function setCache(key: string, data: unknown): void {
  const entry = createCacheEntry(data)
  storageAdapter.setItem(key, entry)
}

/**
 * 读取缓存，过期返回 null
 *
 * @param key - 缓存键名
 * @returns 缓存的数据，过期或不存在时返回 null
 */
export function getCache<T>(key: string): T | null {
  const entry = storageAdapter.getItem(key) as CacheEntry<T> | null | undefined
  if (!entry || typeof entry !== 'object' || !('timestamp' in entry) || !('data' in entry)) {
    return null
  }

  if (!isCacheValid(key)) {
    return null
  }

  return entry.data
}

/**
 * 判断缓存是否在有效期内
 *
 * @param key - 缓存键名
 * @returns 缓存有效返回 true，无效或不存在返回 false
 */
export function isCacheValid(key: string): boolean {
  const entry = storageAdapter.getItem(key) as CacheEntry<unknown> | null | undefined
  if (!entry || typeof entry !== 'object' || !('timestamp' in entry) || !('ttl' in entry)) {
    return false
  }

  const now = Date.now()
  const elapsed = now - entry.timestamp
  return elapsed < entry.ttl
}

/**
 * 强制刷新缓存：调用 fetchFn 获取最新数据，更新缓存并返回
 *
 * @param key - 缓存键名
 * @param fetchFn - 获取最新数据的异步函数
 * @returns 最新获取的数据
 */
export async function forceRefresh<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  const data = await fetchFn()
  setCache(key, data)
  return data
}
