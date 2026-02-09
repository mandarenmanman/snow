import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { StorageAdapter } from '@/utils/cache'
import {
  setCache,
  getCache,
  isCacheValid,
  forceRefresh,
  setStorageAdapter,
} from '@/utils/cache'
import { DEFAULT_CACHE_TTL } from '@/models/types'

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

describe('cache module', () => {
  let mockStorage: ReturnType<typeof createMockStorage>

  beforeEach(() => {
    mockStorage = createMockStorage()
    setStorageAdapter(mockStorage)
  })

  describe('setCache', () => {
    it('should store a cache entry with data, timestamp, and default TTL', () => {
      const data = { cityId: 'BJ001', cityName: '北京' }
      setCache('snow_data', data)

      const stored = mockStorage.store.get('snow_data') as any
      expect(stored).toBeDefined()
      expect(stored.data).toEqual(data)
      expect(typeof stored.timestamp).toBe('number')
      expect(stored.ttl).toBe(DEFAULT_CACHE_TTL)
    })

    it('should store string data', () => {
      setCache('simple_key', 'hello')

      const stored = mockStorage.store.get('simple_key') as any
      expect(stored.data).toBe('hello')
    })

    it('should store array data', () => {
      const arr = [1, 2, 3]
      setCache('array_key', arr)

      const stored = mockStorage.store.get('array_key') as any
      expect(stored.data).toEqual([1, 2, 3])
    })

    it('should store null data', () => {
      setCache('null_key', null)

      const stored = mockStorage.store.get('null_key') as any
      expect(stored.data).toBeNull()
    })

    it('should overwrite existing cache entry', () => {
      setCache('key', 'first')
      setCache('key', 'second')

      const stored = mockStorage.store.get('key') as any
      expect(stored.data).toBe('second')
    })

    it('should set timestamp close to current time', () => {
      const before = Date.now()
      setCache('time_key', 'data')
      const after = Date.now()

      const stored = mockStorage.store.get('time_key') as any
      expect(stored.timestamp).toBeGreaterThanOrEqual(before)
      expect(stored.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('getCache', () => {
    it('should return cached data when cache is valid', () => {
      const data = { cityName: '哈尔滨', snowLevel: '大雪' }
      setCache('snow', data)

      const result = getCache<typeof data>('snow')
      expect(result).toEqual(data)
    })

    it('should return null for non-existent key', () => {
      const result = getCache('nonexistent')
      expect(result).toBeNull()
    })

    it('should return null for expired cache', () => {
      // Manually store an expired entry
      mockStorage.store.set('expired', {
        data: 'old data',
        timestamp: Date.now() - DEFAULT_CACHE_TTL - 1000,
        ttl: DEFAULT_CACHE_TTL,
      })

      const result = getCache('expired')
      expect(result).toBeNull()
    })

    it('should return data for cache that is not yet expired', () => {
      // Manually store a fresh entry
      mockStorage.store.set('fresh', {
        data: 'fresh data',
        timestamp: Date.now() - 1000, // 1 second ago
        ttl: DEFAULT_CACHE_TTL,
      })

      const result = getCache<string>('fresh')
      expect(result).toBe('fresh data')
    })

    it('should return null for malformed cache entry (missing timestamp)', () => {
      mockStorage.store.set('bad', { data: 'something' })

      const result = getCache('bad')
      expect(result).toBeNull()
    })

    it('should return null for non-object cache entry', () => {
      mockStorage.store.set('primitive', 'just a string')

      const result = getCache('primitive')
      expect(result).toBeNull()
    })
  })

  describe('isCacheValid', () => {
    it('should return true for fresh cache', () => {
      setCache('valid', 'data')
      expect(isCacheValid('valid')).toBe(true)
    })

    it('should return false for expired cache', () => {
      mockStorage.store.set('expired', {
        data: 'old',
        timestamp: Date.now() - DEFAULT_CACHE_TTL - 1,
        ttl: DEFAULT_CACHE_TTL,
      })

      expect(isCacheValid('expired')).toBe(false)
    })

    it('should return false for non-existent key', () => {
      expect(isCacheValid('nonexistent')).toBe(false)
    })

    it('should return true for cache just within TTL boundary', () => {
      // Cache that is 29 minutes old (within 30 min TTL)
      mockStorage.store.set('boundary', {
        data: 'data',
        timestamp: Date.now() - (29 * 60 * 1000),
        ttl: DEFAULT_CACHE_TTL,
      })

      expect(isCacheValid('boundary')).toBe(true)
    })

    it('should return false for cache exactly at TTL boundary', () => {
      // Cache that is exactly 30 minutes old
      mockStorage.store.set('exact', {
        data: 'data',
        timestamp: Date.now() - DEFAULT_CACHE_TTL,
        ttl: DEFAULT_CACHE_TTL,
      })

      expect(isCacheValid('exact')).toBe(false)
    })

    it('should return false for malformed entry (missing ttl)', () => {
      mockStorage.store.set('no_ttl', {
        data: 'data',
        timestamp: Date.now(),
      })

      expect(isCacheValid('no_ttl')).toBe(false)
    })
  })

  describe('forceRefresh', () => {
    it('should call fetchFn and store the result in cache', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ cityName: '长春', snowLevel: '暴雪' })

      const result = await forceRefresh('snow_changchun', fetchFn)

      expect(fetchFn).toHaveBeenCalledOnce()
      expect(result).toEqual({ cityName: '长春', snowLevel: '暴雪' })

      // Verify it was cached
      const cached = getCache<{ cityName: string; snowLevel: string }>('snow_changchun')
      expect(cached).toEqual({ cityName: '长春', snowLevel: '暴雪' })
    })

    it('should overwrite existing cache with fresh data', async () => {
      // Set initial cache
      setCache('refresh_key', 'old data')

      const fetchFn = vi.fn().mockResolvedValue('new data')
      const result = await forceRefresh('refresh_key', fetchFn)

      expect(result).toBe('new data')
      expect(getCache<string>('refresh_key')).toBe('new data')
    })

    it('should update the timestamp after refresh', async () => {
      // Set an old cache entry
      mockStorage.store.set('old_cache', {
        data: 'old',
        timestamp: Date.now() - DEFAULT_CACHE_TTL - 5000,
        ttl: DEFAULT_CACHE_TTL,
      })

      expect(isCacheValid('old_cache')).toBe(false)

      const fetchFn = vi.fn().mockResolvedValue('refreshed')
      await forceRefresh('old_cache', fetchFn)

      expect(isCacheValid('old_cache')).toBe(true)
      expect(getCache<string>('old_cache')).toBe('refreshed')
    })

    it('should propagate errors from fetchFn', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(forceRefresh('error_key', fetchFn)).rejects.toThrow('Network error')
    })

    it('should not update cache when fetchFn fails', async () => {
      setCache('existing', 'original data')

      const fetchFn = vi.fn().mockRejectedValue(new Error('fail'))

      try {
        await forceRefresh('existing', fetchFn)
      } catch {
        // expected
      }

      // Original cache should still be there
      expect(getCache<string>('existing')).toBe('original data')
    })
  })
})
