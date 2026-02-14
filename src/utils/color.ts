const palette = [
  '#FF6B35',
  '#F7B32B',
  '#EE6352',
  '#00A6FB',
  '#4CB5F5',
  '#7DCE82',
  '#FF9F1C',
  '#2EC4B6',
  '#E55934',
]

export function getColorForKey(key: string): string {
  if (!key) return palette[0]
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 997
  }
  return palette[hash % palette.length]
}
