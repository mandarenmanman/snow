<template>
  <view class="min-h-screen bg-surface" :style="{ paddingTop: navPadding }">
    <OfflineBanner />

    <view class="px-4 pt-4 pb-2">
      <text class="text-headline-md font-bold text-on-surface block">我的收藏</text>
      <text class="text-body-md text-on-surface-variant block mt-1">关注城市的降雪状态</text>
    </view>

    <view v-if="loading" class="flex flex-col items-center justify-center py-12">
      <view class="mb-3">
        <Icon name="snowflake" size="32px" class="text-primary animate-spin" />
      </view>
      <text class="text-body-md text-on-surface-variant">正在加载收藏列表...</text>
    </view>

    <ErrorRetry v-else-if="hasError" :message="errorMessage" @retry="loadFavorites" />

    <EmptyState v-else-if="favorites.length === 0" message="还没有收藏城市，去首页或搜索页添加吧" icon="star" />

    <view v-else class="px-4 pb-6">
      <view class="flex items-center justify-between mb-3">
        <text class="text-title-md text-on-surface">已收藏（{{ favorites.length }}）</text>
      </view>
      <view
        v-for="item in favorites"
        :key="item.cityId"
        class="rounded-3xl shadow-elevation-1 p-4 mb-3 transition-all duration-200 bg-surface-container border border-outline-variant-30"
        hover-class="hover-elevation-2"
        @click="onFavoriteClick(item)"
      >
        <view class="flex items-center justify-between">
          <view class="flex items-center">
            <view class="rounded-full bg-primary-container flex items-center justify-center mr-3" style="width: 40px; height: 40px;">
              <Icon name="star" size="18px" class="text-primary-on-container" />
            </view>
            <view>
              <text class="text-title-lg text-on-surface block">{{ item.cityName }}</text>
              <text class="text-body-sm text-on-surface-variant block mt-1">
                降雪状态：{{ item.snowStatus || '未知' }}
              </text>
            </view>
          </view>
          <view class="px-3 py-1 rounded-full flex items-center" :class="getSnowBadgeClass(item.snowStatus)">
            <Icon name="snowflake" size="12px" class="mr-1" :class="getSnowIconClass(item.snowStatus)" />
            <text class="text-label-sm" :class="getSnowTextClass(item.snowStatus)">
              {{ item.snowStatus || '未知' }}
            </text>
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
import Icon from '@/components/Icon.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import EmptyState from '@/components/EmptyState.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'

interface FavoriteItem { cityId: string; cityName: string; snowStatus: string }

const favorites = ref<FavoriteItem[]>([])
const loading = ref(false)
const hasError = ref(false)
const errorMessage = ref('获取收藏列表失败，请检查网络连接')

const { totalHeight } = getNavBarInfo()
const navPadding = `${totalHeight}px`

async function loadFavorites() {
  loading.value = true
  hasError.value = false
  try {
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({ name: 'manageFavorites', data: { action: 'list', openId: '' } })
    const result = res.result as { code?: number; data?: { favorites?: FavoriteItem[] } }
    favorites.value = result.data?.favorites ?? []
    // #endif
    // #ifndef MP-WEIXIN
    favorites.value = []
    // #endif
  } catch (err) {
    hasError.value = true
    errorMessage.value = '获取收藏列表失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

function onFavoriteClick(item: FavoriteItem) {
  uni.navigateTo({ url: `/pages/detail/detail?cityId=${item.cityId}` })
}

function getSnowBadgeClass(s: string): string {
  switch (s) {
    case '暴雪': return 'bg-snow-blizzard-15'
    case '大雪': return 'bg-snow-heavy-15'
    case '中雪': return 'bg-snow-moderate-15'
    case '小雪': return 'bg-primary-container'
    default: return 'bg-surface-container-high'
  }
}

function getSnowIconClass(s: string): string {
  switch (s) {
    case '暴雪': return 'text-snow-blizzard'
    case '大雪': return 'text-snow-heavy'
    case '中雪': return 'text-snow-moderate'
    case '小雪': return 'text-primary'
    default: return 'text-snow-none'
  }
}

function getSnowTextClass(s: string): string {
  switch (s) {
    case '暴雪': return 'text-snow-blizzard'
    case '大雪': return 'text-snow-heavy'
    case '中雪': return 'text-snow-moderate'
    case '小雪': return 'text-primary'
    default: return 'text-on-surface-variant'
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
