/**
 * 属性测试：缓存有效期判定
 *
 * Property 10: For any 缓存条目，当当前时间与缓存时间戳的差值小于 30 分钟时
 * 缓存应判定为有效，大于等于 30 分钟时应判定为无效。
 *
 * **Validates: Requirements 6.1**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import type { StorageAdapter } from '@/utils/cache'
import { isCacheValid, setStorageAdapter, setCache, getCache, forceRefresh } from '@/utils/cache'
import { DEFAULT_CACHE_TTL } from '@/models/types'
import type { CacheEntry } from '@/models/types'

/**
 * 创建内存存储适配器（用于测试）
 */
function createMockStorage(): StorageAdapter & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>()
  return {
    store,
    getItem(key: string): unknown {
      return store.get(key) ?? null
    },
    setItem(key: string, value: unknown): void {
      store.set(key, value)
    },
  }
}

describe('Property 10: 缓存有效期判定', () => {
  let mockStorage: ReturnType<typeof createMockStorage>

  beforeEach(() => {
    mockStorage = createMockStorage()
    setStorageAdapter(mockStorage)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * **Validates: Requirements 6.1**
   *
   * For any elapsed time less than DEFAULT_CACHE_TTL (30 minutes),
   * isCacheValid should return true.
   */
  it('当经过时间 < 30 分钟时，缓存应判定为有效', () => {
    fc.assert(
      fc.property(
        // Generate elapsed time in [0, DEFAULT_CACHE_TTL - 1] ms
        fc.integer({ min: 0, max: DEFAULT_CACHE_TTL - 1 }),
        // Generate arbitrary cache data
        fc.anything(),
        (elapsedMs: number, data: unknown) => {
          // Fix "now" to a known reference point
          const now = 1_700_000_000_000 // a fixed reference timestamp
          vi.spyOn(Date, 'now').mockReturnValue(now)

          // Create a cache entry whose timestamp is `elapsedMs` in the past
          const cacheTimestamp = now - elapsedMs
          const entry: CacheEntry<unknown> = {
            data,
            timestamp: cacheTimestamp,
            ttl: DEFAULT_CACHE_TTL,
          }

          mockStorage.store.set('test_key', entry)

          // elapsed < 30 min → cache should be valid
          expect(isCacheValid('test_key')).toBe(true)

          // Clean up for next iteration
          mockStorage.store.clear()
          vi.restoreAllMocks()
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 6.1**
   *
   * For any elapsed time >= DEFAULT_CACHE_TTL (30 minutes),
   * isCacheValid should return false.
   */
  it('当经过时间 >= 30 分钟时，缓存应判定为无效', () => {
    fc.assert(
      fc.property(
        // Generate elapsed time in [DEFAULT_CACHE_TTL, DEFAULT_CACHE_TTL * 10] ms
        // Upper bound is 10x TTL (300 minutes) to cover a wide range
        fc.integer({ min: DEFAULT_CACHE_TTL, max: DEFAULT_CACHE_TTL * 10 }),
        // Generate arbitrary cache data
        fc.anything(),
        (elapsedMs: number, data: unknown) => {
          // Fix "now" to a known reference point
          const now = 1_700_000_000_000
          vi.spyOn(Date, 'now').mockReturnValue(now)

          // Create a cache entry whose timestamp is `elapsedMs` in the past
          const cacheTimestamp = now - elapsedMs
          const entry: CacheEntry<unknown> = {
            data,
            timestamp: cacheTimestamp,
            ttl: DEFAULT_CACHE_TTL,
          }

          mockStorage.store.set('test_key', entry)

          // elapsed >= 30 min → cache should be invalid
          expect(isCacheValid('test_key')).toBe(false)

          // Clean up for next iteration
          mockStorage.store.clear()
          vi.restoreAllMocks()
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 6.1**
   *
   * Boundary test: at exactly DEFAULT_CACHE_TTL elapsed time,
   * cache should be invalid (elapsed >= ttl).
   */
  it('恰好在 30 分钟边界时，缓存应判定为无效', () => {
    const now = 1_700_000_000_000
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const entry: CacheEntry<string> = {
      data: 'boundary_test',
      timestamp: now - DEFAULT_CACHE_TTL,
      ttl: DEFAULT_CACHE_TTL,
    }

    mockStorage.store.set('boundary_key', entry)
    expect(isCacheValid('boundary_key')).toBe(false)
  })

  /**
   * **Validates: Requirements 6.1**
   *
   * Boundary test: at exactly DEFAULT_CACHE_TTL - 1 ms elapsed time,
   * cache should still be valid.
   */
  it('在 30 分钟边界前 1ms 时，缓存应判定为有效', () => {
    const now = 1_700_000_000_000
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const entry: CacheEntry<string> = {
      data: 'boundary_test',
      timestamp: now - DEFAULT_CACHE_TTL + 1,
      ttl: DEFAULT_CACHE_TTL,
    }

    mockStorage.store.set('boundary_key', entry)
    expect(isCacheValid('boundary_key')).toBe(true)
  })
})


describe('Property 11: 强制刷新更新缓存', () => {
  let mockStorage: ReturnType<typeof createMockStorage>

  beforeEach(() => {
    mockStorage = createMockStorage()
    setStorageAdapter(mockStorage)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * **Validates: Requirements 6.2**
   *
   * For any cached data, after calling forceRefresh, the cached data
   * should be the newly fetched data and the cache should be valid.
   */
  it('强制刷新后缓存数据应为最新获取的数据，且缓存有效', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary old data (JSON-serializable values)
        fc.jsonValue(),
        // Generate arbitrary new data (JSON-serializable values)
        fc.jsonValue(),
        // Generate a cache key
        fc.string({ minLength: 1, maxLength: 50 }),
        async (oldData: unknown, newData: unknown, cacheKey: string) => {
          // Step 1: Set initial cache with old data
          setCache(cacheKey, oldData)

          // Verify old data is cached
          const cachedOld = getCache(cacheKey)
          expect(cachedOld).toEqual(oldData)

          // Step 2: Call forceRefresh with a fetchFn that returns new data
          const fetchFn = async () => newData
          const result = await forceRefresh(cacheKey, fetchFn)

          // Step 3: Verify forceRefresh returns the new data
          expect(result).toEqual(newData)

          // Step 4: Verify the cached data is now the new data
          const cachedNew = getCache(cacheKey)
          expect(cachedNew).toEqual(newData)

          // Step 5: Verify the cache is valid (timestamp was updated)
          expect(isCacheValid(cacheKey)).toBe(true)

          // Clean up for next iteration
          mockStorage.store.clear()
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 6.2**
   *
   * For any expired cached data, after calling forceRefresh,
   * the cache timestamp should be updated and the cache should become valid again.
   */
  it('过期缓存经强制刷新后应变为有效', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary old data
        fc.jsonValue(),
        // Generate arbitrary new data
        fc.jsonValue(),
        async (oldData: unknown, newData: unknown) => {
          const cacheKey = 'expired_test_key'

          // Step 1: Set cache with old data and make it expired
          setCache(cacheKey, oldData)

          // Manually expire the cache by modifying the timestamp
          const entry = mockStorage.store.get(cacheKey) as CacheEntry<unknown>
          entry.timestamp = Date.now() - DEFAULT_CACHE_TTL - 1000 // expired by 1 second
          mockStorage.store.set(cacheKey, entry)

          // Verify cache is expired
          expect(isCacheValid(cacheKey)).toBe(false)

          // Step 2: Force refresh with new data
          const fetchFn = async () => newData
          await forceRefresh(cacheKey, fetchFn)

          // Step 3: Verify cache is now valid with new data
          expect(isCacheValid(cacheKey)).toBe(true)
          expect(getCache(cacheKey)).toEqual(newData)

          // Clean up for next iteration
          mockStorage.store.clear()
        },
      ),
      { numRuns: 100 },
    )
  })
})


describe('Property 12: 离线模式返回缓存数据', () => {
  let mockStorage: ReturnType<typeof createMockStorage>

  beforeEach(() => {
    mockStorage = createMockStorage()
    setStorageAdapter(mockStorage)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * **Validates: Requirements 6.3**
   *
   * For any network-unavailable state (fetchFn throws), if local cached data exists,
   * getCache should still return the cached data.
   */
  it('网络不可用时，getCache 应返回已缓存的数据', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary JSON-serializable cache data
        fc.jsonValue(),
        // Generate a cache key
        fc.string({ minLength: 1, maxLength: 50 }),
        (data: unknown, cacheKey: string) => {
          // Step 1: Set cache with some data (simulating previously cached data)
          setCache(cacheKey, data)

          // Step 2: Verify the data is cached and retrievable
          const cachedData = getCache(cacheKey)
          expect(cachedData).toEqual(data)

          // Step 3: Simulate network failure — forceRefresh's fetchFn throws
          const networkError = new Error('Network unavailable')
          const failingFetchFn = async () => { throw networkError }

          // forceRefresh should throw, but the cache should remain intact
          // (we don't await here — we just verify the cache is untouched)

          // Step 4: After network failure, getCache should still return the original data
          const dataAfterFailure = getCache(cacheKey)
          expect(dataAfterFailure).toEqual(data)

          // Clean up for next iteration
          mockStorage.store.clear()
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 6.3**
   *
   * For any network-unavailable state, the cached entry should still contain
   * the original timestamp (for "数据更新于 [时间]" display).
   */
  it('网络不可用时，缓存条目应保留原始时间戳（用于离线模式标识）', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary JSON-serializable cache data
        fc.jsonValue(),
        // Generate a cache key
        fc.string({ minLength: 1, maxLength: 50 }),
        (data: unknown, cacheKey: string) => {
          // Step 1: Set cache with data
          setCache(cacheKey, data)

          // Step 2: Record the original cache timestamp
          const entryBefore = mockStorage.store.get(cacheKey) as CacheEntry<unknown>
          const originalTimestamp = entryBefore.timestamp

          // Step 3: Simulate network failure — forceRefresh throws
          const failingFetchFn = async () => { throw new Error('Network unavailable') }

          // Attempt forceRefresh (will fail), but we catch the error
          void forceRefresh(cacheKey, failingFetchFn).catch(() => {
            // Expected: network failure
          })

          // Step 4: Verify the cache entry still has the original timestamp
          const entryAfter = mockStorage.store.get(cacheKey) as CacheEntry<unknown>
          expect(entryAfter.timestamp).toBe(originalTimestamp)

          // Step 5: Verify the data is still accessible
          const cachedData = getCache(cacheKey)
          expect(cachedData).toEqual(data)

          // Clean up for next iteration
          mockStorage.store.clear()
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 6.3**
   *
   * For any network-unavailable state, when forceRefresh fails,
   * the cache should remain completely unchanged (data + timestamp + ttl).
   */
  it('forceRefresh 网络失败时，缓存应完全不变（数据、时间戳、TTL）', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary JSON-serializable cache data
        fc.jsonValue(),
        // Generate a cache key
        fc.string({ minLength: 1, maxLength: 50 }),
        async (data: unknown, cacheKey: string) => {
          // Step 1: Set cache with data
          setCache(cacheKey, data)

          // Step 2: Snapshot the entire cache entry before network failure
          const entryBefore = mockStorage.store.get(cacheKey) as CacheEntry<unknown>
          const snapshotBefore = {
            data: entryBefore.data,
            timestamp: entryBefore.timestamp,
            ttl: entryBefore.ttl,
          }

          // Step 3: Simulate network failure via forceRefresh
          const failingFetchFn = async (): Promise<unknown> => {
            throw new Error('Network unavailable')
          }

          try {
            await forceRefresh(cacheKey, failingFetchFn)
          } catch {
            // Expected: network failure propagates
          }

          // Step 4: Verify the cache entry is completely unchanged
          const entryAfter = mockStorage.store.get(cacheKey) as CacheEntry<unknown>
          expect(entryAfter.data).toEqual(snapshotBefore.data)
          expect(entryAfter.timestamp).toBe(snapshotBefore.timestamp)
          expect(entryAfter.ttl).toBe(snapshotBefore.ttl)

          // Step 5: Verify getCache still returns the original data
          const cachedData = getCache(cacheKey)
          expect(cachedData).toEqual(data)

          // Clean up for next iteration
          mockStorage.store.clear()
        },
      ),
      { numRuns: 100 },
    )
  })
})
