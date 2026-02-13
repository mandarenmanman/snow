<template>
  <image
    :src="`https://cdn.jsdelivr.net/npm/qweather-icons@1.8.0/icons/${code}${fill ? '-fill' : ''}.svg`"
    :style="imgStyle"
    mode="aspectFit"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  code: string
  fill?: boolean
  size?: string
  color?: string
}>()

const imgStyle = computed(() => {
  const s = props.size || '24px'
  return { width: s, height: s }
})
</script>
