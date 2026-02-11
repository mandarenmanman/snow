<template>
  <view class="min-h-screen bg-surface" :style="{ paddingTop: navPadding }">
    <OfflineBanner />

    <!-- 搜索栏 -->
    <view class="px-4 pt-4 pb-2">
      <view class="flex items-center bg-surface-container rounded-full px-4 shadow-elevation-1" style="height: 96rpx;">
        <Icon name="magnifying-glass" size="18px" class="text-on-surface-variant mr-3" />
        <input
          v-model="keyword"
          class="flex-1 text-body-lg text-on-surface"
          type="text"
          placeholder="搜索城市、省份、景区..."
          placeholder-class="text-on-surface-variant"
          confirm-type="search"
          :focus="autoFocus"
          @input="onInput"
          @confirm="onConfirm"
        />
        <view
          v-if="keyword.length > 0"
          class="ml-2 flex items-center justify-center rounded-full"
          hover-class="hover-opacity-60"
          style="width: 36px; height: 36px;"
          @click="onClear"
        >
          <Icon name="xmark" size="16px" class="text-on-surface-variant" />
        </view>
      </view>
    </view>

    <!-- 加载 -->
    <view v-if="loading" class="flex flex-col items-center justify-center py-12">
      <view class="mb-3">
        <Icon name="snowflake" size="32px" class="text-primary animate-spin" />
      </view>
      <text class="text-body-md text-on-surface-variant">正在搜索...</text>
    </view>

    <ErrorRetry v-else-if="hasError" :message="errorMessage" @retry="doSearch" />

    <EmptyState v-else-if="hasSearched && searchResults.length === 0" message="未找到相关城市或景区，请换个关键词试试" icon="magnifying-glass" />

    <!-- 搜索结果 -->
    <view v-else-if="searchResults.length > 0" class="px-4 pb-6">
      <view class="mb-3">
        <text class="text-title-md text-on-surface">搜索结果（{{ searchResults.length }}）</text>
      </view>
      <view
        v-for="city in searchResults"
        :key="city.cityId"
        class="rounded-3xl bg-surface-container shadow-elevation-1 mb-3 px-4 py-4 transition-all duration-200"
        hover-class="hover-elevation-2"
        @click="onCityClick(city)"
      >
        <view class="flex items-center justify-between">
          <view class="flex items-center flex-1 min-w-0">
            <view class="mr-3 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0" style="width: 40px; height: 40px;">
              <Icon :name="city.matchType === 'scenic' ? 'mountain-sun' : 'location-dot'" size="18px" class="text-primary-on-container" />
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-title-md text-on-surface block">{{ city.cityName }}</text>
              <text class="text-body-sm text-on-surface-variant block mt-1">{{ city.province }}</text>
            </view>
          </view>
          <Icon name="chevron-right" size="14px" class="text-on-surface-variant flex-shrink-0" />
        </view>
        <view v-if="city.scenics && city.scenics.length > 0" class="flex flex-wrap mt-2 ml-13">
          <text
            v-for="spot in city.scenics"
            :key="spot"
            class="text-label-sm text-primary mr-2 mb-1 px-2 py-0-5 rounded-full bg-primary-container"
          >{{ spot }}</text>
        </view>
      </view>
    </view>

    <!-- 初始提示 -->
    <view v-else class="flex flex-col items-center justify-center py-16 px-6">
      <view class="mb-6 rounded-full bg-primary-container flex items-center justify-center" style="width: 80px; height: 80px;">
        <Icon name="magnifying-glass" size="36px" class="text-primary-on-container" />
      </view>
      <text class="text-body-lg text-on-surface-variant text-center">输入城市、省份或景区名称搜索</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getNavBarInfo } from '@/utils/navbar'
import Icon from '@/components/Icon.vue'
import ErrorRetry from '@/components/ErrorRetry.vue'
import EmptyState from '@/components/EmptyState.vue'
import OfflineBanner from '@/components/OfflineBanner.vue'

interface SearchCity {
  cityId: string
  cityName: string
  province: string
  scenics?: string[]
  matchType?: string
}

const keyword = ref('')
const searchResults = ref<SearchCity[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const hasError = ref(false)
const errorMessage = ref('搜索失败，请检查网络连接')
const autoFocus = ref(true)

const { totalHeight } = getNavBarInfo()
const navPadding = `${totalHeight}px`
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_DELAY = 300

function onInput() {
  if (debounceTimer !== null) clearTimeout(debounceTimer)
  const trimmed = keyword.value.trim()
  if (trimmed === '') {
    searchResults.value = []
    hasSearched.value = false
    hasError.value = false
    return
  }
  debounceTimer = setTimeout(() => { doSearch() }, DEBOUNCE_DELAY)
}

function onConfirm() {
  if (debounceTimer !== null) { clearTimeout(debounceTimer); debounceTimer = null }
  doSearch()
}

function onClear() {
  keyword.value = ''
  searchResults.value = []
  hasSearched.value = false
  hasError.value = false
  if (debounceTimer !== null) { clearTimeout(debounceTimer); debounceTimer = null }
}

async function doSearch() {
  const trimmed = keyword.value.trim()
  if (trimmed === '') return
  loading.value = true
  hasError.value = false
  try {
    let cities: SearchCity[] = []
    // #ifdef MP-WEIXIN
    const res = await wx.cloud.callFunction({ name: 'searchCity', data: { keyword: trimmed } })
    const result = res.result as { code?: number; data?: { cities?: SearchCity[] } }
    if (result.code === 0 && result.data?.cities) cities = result.data.cities
    // #endif
    searchResults.value = cities
    hasSearched.value = true
  } catch (err) {
    hasError.value = true
    errorMessage.value = '搜索失败，请检查网络连接'
  } finally {
    loading.value = false
  }
}

function onCityClick(city: SearchCity) {
  uni.navigateTo({ url: `/pages/detail/detail?cityId=${city.cityId}` })
}

onLoad(() => { autoFocus.value = true })
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin { animation: spin 2s linear infinite; }
</style>
