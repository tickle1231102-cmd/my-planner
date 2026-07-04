import {
  CATEGORY_META,
  MAIN_CATEGORY_SLUGS,
  getEffectiveCategorySlug,
} from './memoryCategories.js'

const MAX_MEMOS_PER_CATEGORY = 8
const CATEGORY_RADIUS = 200
const MEMO_RADIUS = 110
const MEMO_SPREAD = 0.45

function truncate(text, max) {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

export function buildMindMapGraph(memos) {
  const cx = 500
  const cy = 400
  const nodes = []
  const edges = []

  const root = {
    id: 'root',
    type: 'root',
    label: 'My Memory',
    x: cx,
    y: cy,
    color: '#7A9E7E',
  }
  nodes.push(root)

  const grouped = new Map()
  for (const slug of MAIN_CATEGORY_SLUGS) {
    grouped.set(slug, [])
  }
  grouped.set('uncategorized', [])

  for (const memo of memos) {
    const slug = getEffectiveCategorySlug(memo)
    const list = grouped.get(slug) ?? grouped.get('uncategorized')
    list.push(memo)
  }

  const activeSlugs = [
    ...MAIN_CATEGORY_SLUGS,
    ...(grouped.get('uncategorized').length > 0 ? ['uncategorized'] : []),
  ]

  const count = activeSlugs.length || 1

  activeSlugs.forEach((slug, index) => {
    const meta = CATEGORY_META[slug]
    const categoryMemos = grouped.get(slug) ?? []
    const angle = (2 * Math.PI * index) / count - Math.PI / 2
    const catX = cx + CATEGORY_RADIUS * Math.cos(angle)
    const catY = cy + CATEGORY_RADIUS * Math.sin(angle)

    const categoryNode = {
      id: `cat-${slug}`,
      type: 'category',
      label: meta.nameKo,
      x: catX,
      y: catY,
      color: meta.color,
      emoji: meta.emoji,
      slug,
      parentId: root.id,
    }
    nodes.push(categoryNode)

    edges.push({
      id: `edge-root-${slug}`,
      from: { x: root.x, y: root.y },
      to: { x: catX, y: catY },
      color: meta.color,
    })

    const visible = categoryMemos.slice(0, MAX_MEMOS_PER_CATEGORY)
    const overflow = categoryMemos.length - visible.length

    visible.forEach((memo, memoIndex) => {
      const memoCount = visible.length
      const offset =
        memoCount === 1
          ? 0
          : (memoIndex - (memoCount - 1) / 2) * (MEMO_SPREAD / Math.max(memoCount - 1, 1))
      const memoAngle = angle + offset
      const memoX = catX + MEMO_RADIUS * Math.cos(memoAngle)
      const memoY = catY + MEMO_RADIUS * Math.sin(memoAngle)
      const preview = truncate(memo.title || memo.content.split('\n')[0] || '메모', 14)

      const memoNode = {
        id: `memo-${memo.id}`,
        type: 'memo',
        label: preview,
        x: memoX,
        y: memoY,
        color: meta.color,
        memoId: memo.id,
        parentId: categoryNode.id,
      }
      nodes.push(memoNode)

      edges.push({
        id: `edge-${slug}-${memo.id}`,
        from: { x: catX, y: catY },
        to: { x: memoX, y: memoY },
        color: `${meta.color}88`,
      })
    })

    if (overflow > 0) {
      const moreAngle = angle + MEMO_SPREAD * 0.6
      const moreX = catX + (MEMO_RADIUS + 30) * Math.cos(moreAngle)
      const moreY = catY + (MEMO_RADIUS + 30) * Math.sin(moreAngle)

      nodes.push({
        id: `more-${slug}`,
        type: 'more',
        label: `+${overflow}개`,
        x: moreX,
        y: moreY,
        color: meta.color,
        slug,
        parentId: categoryNode.id,
      })

      edges.push({
        id: `edge-more-${slug}`,
        from: { x: catX, y: catY },
        to: { x: moreX, y: moreY },
        color: `${meta.color}55`,
      })
    }
  })

  return { nodes, edges, width: 1000, height: 800 }
}
