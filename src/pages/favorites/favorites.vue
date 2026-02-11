<template>
  <view class="min-h-screen bg-surface" :style="{ paddingTop: navPadding }">
    <OfflineBanner />

    <view class="px-4 pt-4 pb-2">
      <text class="text-headline-md font-bold text-on-surface block">我的订阅</text>
      <text class="text-body-md text-on-surface-variant block mt-1">{{ favorites.length > 0 ? `已订阅 ${favorites.length} 个城市` : '订阅城市，降雪提前通知你' }}</text>
    </view>

    <view v-if="loading" class="flex flex-col items-center justify-center py-12">
      <view class="mb-3">
        <Icon name="snowflake" size="32px" class="text-primary animate-spin" />
      </view>
      <text class="text-body-md text-on-surface-variant">正在加载订阅列表...</text>
    </view>

    <ErrorRetry v-else-if="hasError" :message="errorMessage" @retry="loadFavorites" />

    <EmptyState v-else-if="favorites.length === 0" message="还没有订阅城市，去首页或搜索页添加吧" icon="bell" />

    <view v-else class="px-4 pb-6">
      <view
        v-for="item in favorites"
        :key="item.cityId"
        class="rounded-3xl bg-surface-container shadow-elevation-1 overflow-hidden mb-3 transition-all duration-200"
        hover-class="hover-elevation-2"
        @click="onFavoriteClick(item)"
      >
        <!-- 景区图片 -->
        <view class="relative" style="height: 120px;">
          <image
            v-if="cityImages[item.cityId]"
            :src="cityImages[item.cityId]"
            mode="aspectFill"
            style="width: 100%; height: 120px;"
          />
          <view v-else class="flex items-center justify-center bg-surface-container-high" style="width: 100%; height: 120px;">
            <Icon name="bell" size="28px" class="text-outline-variant" />
          </view>
          <!-- 降雪角标 -->
          <view
            v-if="item.snowStatus && item.snowStatus !== '无' && item.snowStatus !== '未知'"
            class="px-3 py-1 rounded-full flex items-center justify-center"
            :class="getSnowBadgeBg(item.snowStatus)"
            style="position: absolute; top: 10px; right: 10px;"
          >
            <text class="text-label-md text-white">{{ snowLevelToFlakes(item.snowStatus) }}</text>
          </view>
          <!-- 取消收藏 -->
          <view
            class="rounded-full flex items-center justify-center"
            style="position: absolute; top: 10px; left: 10px; width: 32px; height: 32px; background: rgba(0,0,0,0.3);"
            hover-class="hover-opacity-60"
            @click.stop="onRemove(item)"
          >
            <Icon name="xmark" size="14px" class="text-white" />
          </view>
        </view>
        <!-- 信息区 -->
        <view class="px-4 py-3">
          <view class="flex items-center justify-between">
            <view class="flex-1 min-w-0">
              <text class="text-title-md text-on-surface">{{ item.cityName }}</text>
              <text v-if="getProvince(item.cityId)" class="text-body-sm text-on-surface-variant ml-2">{{ getProvince(item.cityId) }}</text>
            </view>
            <Icon name="chevron-right" size="14px" class="text-on-surface-variant flex-shrink-0" />
          </view>
          <view v-if="getScenics(item.cityId).length > 0" class="flex flex-wrap mt-2">
            <text
              v-for="spot in getScenics(item.cityId)"
              :key="spot"
              class="text-label-sm text-primary mr-2 mb-1 px-2 py-0-5 rounded-full bg-primary-container"
            >{{ spot }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getNavBarInfo } from '@/utils/navbar'
import { getScenics, getProvince } from '@/models/scenics'
import { snowLevelToFlakes } from '@/utils/snow'
import Icon from '@/components/Icon.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import EmptyState from '@/components/EmptyState.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'

interface FavoriteItem { cityId: string; cityName: string; latitude: number; longitude: number; snowStatus: string }

const favorites = ref<FavoriteItem[]>([])
const cityImages = ref<Record<string, string>>({})
const loading = ref(false)
const hasError = ref(false)
const errorMessage = ref('获取订阅列表失败，请检查网络连接')

const { totalHeight } = getNavBarInfo()
const navPadding = `${totalHeight}px`

const IMG_CACHE_PREFIX = 'city_img_'

async function loadFavorites() {
  loading.value = true
  hasError.value = false
  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({ name: 'manageFavorites', data: { action: 'list' } })
    const result = res.result as { code?: number; data?: { favorites?: FavoriteItem[] } }
    favorites.value = result.data?.favorites ?? []
    // #endif
    // #ifndef MP-WEIXIN
    favorites.value = []
    // #endif
    // 加载图片：优先本地缓存，未命中则调用云函数
    for (const item of favorites.value) {
      try {
        const cached = uni.getStorageSync(IMG_CACHE_PREFIX + item.cityId)
        if (cached) {
          cityImages.value[item.cityId] = cached
        }
      } catch {}
    }
    // 对没有缓存图片的收藏项，异步请求生成图片
    const uncached = favorites.value.filter((item) => !cityImages.value[item.cityId])
    if (uncached.length > 0) {
      loadCityImages(uncached)
    }
  } catch (err) {
    hasError.value = true
    errorMessage.value = '获取订阅列表失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

/**
 * 异步加载城市图片，逐个请求避免并发过多
 */
async function loadCityImages(items: FavoriteItem[]) {
  for (const item of items) {
    try {
      // #ifdef MP-WEIXIN
      const res = await wx.cloud.callFunction({
        name: 'generateImage-mvdJNQ',
        data: {
          cityId: item.cityId,
          prompt: `${item.cityName}风景，雪景，高清摄影`,
        },
      })
      const result = res.result as { success?: boolean; imageUrl?: string }
      if (result.success && result.imageUrl) {
        cityImages.value[item.cityId] = result.imageUrl
        try {
          uni.setStorageSync(IMG_CACHE_PREFIX + item.cityId, result.imageUrl)
        } catch {}
      }
      // #endif
    } catch (e) {
      console.warn(`加载 ${item.cityName} 图片失败:`, e)
    }
  }
}

function onFavoriteClick(item: FavoriteItem) {
  let url = `/pages/detail/detail?cityId=${item.cityId}`
  if (item.latitude && item.longitude) {
    url += `&latitude=${item.latitude}&longitude=${item.longitude}`
  }
  if (item.cityName) {
    url += `&cityName=${encodeURIComponent(item.cityName)}`
  }
  uni.navigateTo({ url })
}

async function onRemove(item: FavoriteItem) {
  uni.showModal({
    title: '取消订阅',
    content: `确定取消订阅「${item.cityName}」吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        // #ifdef MP-WEIXIN
        await wx.cloud.callFunction({
          name: 'manageFavorites',
          data: { action: 'remove', cityId: item.cityId },
        })
        // #endif
        favorites.value = favorites.value.filter((f) => f.cityId !== item.cityId)
        uni.showToast({ title: '已取消订阅', icon: 'success', duration: 1500 })
      } catch {
        uni.showToast({ title: '操作失败', icon: 'none', duration: 1500 })
      }
    },
  })
}

function getSnowBadgeBg(level: string): string {
  switch (level) {
    case '暴雪': return 'bg-snow-blizzard'
    case '大雪': return 'bg-snow-heavy'
    case '中雪': return 'bg-snow-moderate'
    case '小雪': return 'bg-primary'
    default: return 'bg-snow-none'
  }
}

onShow(() => { loadFavorites() })
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 2s linear infinite; }
</style>
