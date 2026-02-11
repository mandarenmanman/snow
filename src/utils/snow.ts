/**
 * 将降雪等级转为雪花符号 + 文字
 * 小雪 → ❄ 小雪  中雪 → ❄❄ 中雪  大雪 → ❄❄❄ 大雪  暴雪 → ❄❄❄❄ 暴雪
 */
export function snowLevelToFlakes(level: string): string {
  switch (level) {
    case '小雪': return '❄ 小雪'
    case '中雪': return '❄❄ 中雪'
    case '大雪': return '❄❄❄ 大雪'
    case '暴雪': return '❄❄❄❄ 暴雪'
    default: return level
  }
}
