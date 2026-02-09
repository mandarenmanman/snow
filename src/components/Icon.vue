<template>
  <text :class="classes" :style="iconStyle">{{ unicode }}</text>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  type?: 'solid' | 'regular'
  size?: string
  color?: string
}>()

/**
 * FontAwesome 6 Free — Unicode 映射表
 * 仅包含本项目用到的图标
 */
const solidMap: Record<string, string> = {
  'snowflake': '\uf2dc',
  'magnifying-glass': '\uf002',
  'search': '\uf002',
  'xmark': '\uf00d',
  'location-dot': '\uf3c5',
  'location-arrow': '\uf124',
  'star': '\uf005',
  'rotate-right': '\uf2f9',
  'wifi': '\uf1eb',
  'house': '\uf015',
  'heart': '\uf004',
  'cloud': '\uf0c2',
  'temperature-half': '\uf2c9',
  'wind': '\uf72e',
  'droplet': '\uf043',
  'eye': '\uf06e',
  'calendar-days': '\uf073',
  'circle-exclamation': '\uf06a',
  'arrows-rotate': '\uf021',
  'chevron-right': '\uf054',
}

const regularMap: Record<string, string> = {
  'star': '\uf005',
  'heart': '\uf004',
  'snowflake': '\uf2dc',
}

const unicode = computed(() => {
  const map = props.type === 'regular' ? regularMap : solidMap
  return map[props.name] || '?'
})

const classes = computed(() => {
  return props.type === 'regular' ? 'icon-far' : 'icon-fas'
})

const iconStyle = computed(() => {
  const s: Record<string, string> = {}
  if (props.size) s['font-size'] = props.size
  if (props.color) s['color'] = props.color
  return s
})
</script>

<style scoped>
.icon-fas, .icon-far {
  font-family: 'Font Awesome 6 Free';
  font-style: normal;
  -webkit-font-smoothing: antialiased;
}
.icon-fas {
  font-weight: 900;
}
.icon-far {
  font-weight: 400;
}
</style>
