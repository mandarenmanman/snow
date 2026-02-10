<template>
  <text class="qi" :style="iconStyle">{{ unicode }}</text>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** 和风天气图标代码，如 '100'(晴), '400'(小雪) */
  code: string
  /** 是否使用填充样式 */
  fill?: boolean
  size?: string
  color?: string
}>()

/** 线性图标 unicode */
const LINE_MAP: Record<string, string> = {
  '100': '\uF101', '101': '\uF102', '102': '\uF103', '103': '\uF104', '104': '\uF105',
  '150': '\uF106', '151': '\uF107', '152': '\uF108', '153': '\uF109',
  '300': '\uF10A', '301': '\uF10B', '302': '\uF10C', '303': '\uF10D', '304': '\uF10E',
  '305': '\uF10F', '306': '\uF110', '307': '\uF111', '308': '\uF112', '309': '\uF113',
  '310': '\uF114', '311': '\uF115', '312': '\uF116', '313': '\uF117', '314': '\uF118',
  '315': '\uF119', '316': '\uF11A', '317': '\uF11B', '318': '\uF11C',
  '350': '\uF11D', '351': '\uF11E', '399': '\uF11F',
  '400': '\uF120', '401': '\uF121', '402': '\uF122', '403': '\uF123',
  '404': '\uF124', '405': '\uF125', '406': '\uF126', '407': '\uF127',
  '408': '\uF128', '409': '\uF129', '410': '\uF12A',
  '456': '\uF12B', '457': '\uF12C', '499': '\uF12D',
  '500': '\uF12E', '501': '\uF12F', '502': '\uF130', '503': '\uF131', '504': '\uF132',
  '507': '\uF133', '508': '\uF134', '509': '\uF135', '510': '\uF136',
  '511': '\uF137', '512': '\uF138', '513': '\uF139', '514': '\uF13A', '515': '\uF13B',
  '900': '\uF144', '901': '\uF145', '999': '\uF146',
}

/** 填充图标 unicode（偏移 +0xCB） */
const FILL_MAP: Record<string, string> = {
  '100': '\uF1CC', '101': '\uF1CD', '102': '\uF1CE', '103': '\uF1CF', '104': '\uF1D0',
  '150': '\uF1D1', '151': '\uF1D2', '152': '\uF1D3', '153': '\uF1D4',
  '300': '\uF1D5', '301': '\uF1D6', '302': '\uF1D7', '303': '\uF1D8', '304': '\uF1D9',
  '305': '\uF1DA', '306': '\uF1DB', '307': '\uF1DC', '308': '\uF1DD', '309': '\uF1DE',
  '310': '\uF1DF', '311': '\uF1E0', '312': '\uF1E1', '313': '\uF1E2', '314': '\uF1E3',
  '315': '\uF1E4', '316': '\uF1E5', '317': '\uF1E6', '318': '\uF1E7',
  '350': '\uF1E8', '351': '\uF1E9', '399': '\uF1EA',
  '400': '\uF1EB', '401': '\uF1EC', '402': '\uF1ED', '403': '\uF1EE',
  '404': '\uF1EF', '405': '\uF1F0', '406': '\uF1F1', '407': '\uF1F2',
  '408': '\uF1F3', '409': '\uF1F4', '410': '\uF1F5',
  '456': '\uF1F6', '457': '\uF1F7', '499': '\uF1F8',
  '500': '\uF1F9', '501': '\uF1FA', '502': '\uF1FB', '503': '\uF1FC', '504': '\uF1FD',
  '507': '\uF1FE', '508': '\uF1FF',
  '900': '\uF20F', '901': '\uF210', '999': '\uF211',
}

const unicode = computed(() => {
  const map = props.fill ? FILL_MAP : LINE_MAP
  return map[props.code] || LINE_MAP[props.code] || '\uF146' // 999 未知
})

const iconStyle = computed(() => {
  const s: Record<string, string> = { 'font-size': props.size || '24px' }
  if (props.color) s['color'] = props.color
  return s
})
</script>

<style scoped>
.qi {
  font-family: 'qweather-icons' !important;
  font-style: normal;
  font-weight: normal;
  -webkit-font-smoothing: antialiased;
  display: inline-block;
}
</style>
