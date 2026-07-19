import {
  CATEGORY_META,
  MAIN_CATEGORY_SLUGS,
  getEffectiveCategorySlug,
} from './memoryCategories.js'

const MAX_MEMOS_PER_CATEGORY = 6
const BASE_WIDTH = 1280
const BASE_HEIGHT = 980

function truncate(text, max) {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

/** Approximate node half-sizes for collision checks */
function nodeHalfSize(type) {
  if (type === 'root') return { w: 64, h: 26 }
  if (type === 'category') return { w: 58, h: 24 }
  if (type === 'more') return { w: 32, h: 16 }
  return { w: 48, h: 18 }
}

function overlaps(a, b, padding = 10) {
  const as = nodeHalfSize(a.type)
  const bs = nodeHalfSize(b.type)
  return (
    Math.abs(a.x - b.x) < as.w + bs.w + padding &&
    Math.abs(a.y - b.y) < as.h + bs.h + padding
  )
}

function resolveCollisions(nodes, iterations = 28) {
  for (let iter = 0; iter < iterations; iter += 1) {
    let moved = false
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i]
        const b = nodes[j]
        if (a.type === 'root' || b.type === 'root') continue
        if (!overlaps(a, b)) continue

        const dx = b.x - a.x || 0.01
        const dy = b.y - a.y || 0.01
        const dist = Math.hypot(dx, dy) || 1
        const push = 6 / dist
        const ax = (dx / dist) * push
        const ay = (dy / dist) * push

        if (a.type !== 'category') {
          a.x -= ax
          a.y -= ay
          moved = true
        }
        if (b.type !== 'category') {
          b.x += ax
          b.y += ay
          moved = true
        } else if (a.type === 'category') {
          // both categories — nudge both slightly along tangent
          a.x -= ax * 0.5
          a.y -= ay * 0.5
          b.x += ax * 0.5
          b.y += ay * 0.5
          moved = true
        }
      }
    }
    if (!moved) break
  }
}

export function buildMindMapGraph(memos) {
  const cx = BASE_WIDTH / 2
  const cy = BASE_HEIGHT / 2
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
    ...MAIN_CATEGORY_SLUGS.filter((slug) => (grouped.get(slug) ?? []).length > 0),
    ...(grouped.get('uncategorized').length > 0 ? ['uncategorized'] : []),
  ]

  // Keep ring readable when empty categories would otherwise crowd labels
  const layoutSlugs =
    activeSlugs.length > 0
      ? activeSlugs
      : [...MAIN_CATEGORY_SLUGS]

  const count = layoutSlugs.length || 1
  const categoryRadius = Math.max(260, 160 + count * 42)
  const memoBaseRadius = Math.max(130, 100 + Math.min(count, 6) * 8)

  layoutSlugs.forEach((slug, index) => {
    const meta = CATEGORY_META[slug]
    const categoryMemos = grouped.get(slug) ?? []
    const angle = (2 * Math.PI * index) / count - Math.PI / 2
    const catX = cx + categoryRadius * Math.cos(angle)
    const catY = cy + categoryRadius * Math.sin(angle)

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
    const memoCount = visible.length
    const spread =
      memoCount <= 1
        ? 0
        : Math.min(1.15, 0.55 + memoCount * 0.12)

    visible.forEach((memo, memoIndex) => {
      const offset =
        memoCount === 1
          ? 0
          : (memoIndex - (memoCount - 1) / 2) *
            (spread / Math.max(memoCount - 1, 1))
      const ring = memoIndex % 2 === 0 ? memoBaseRadius : memoBaseRadius + 42
      const memoAngle = angle + offset
      const memoX = catX + ring * Math.cos(memoAngle)
      const memoY = catY + ring * Math.sin(memoAngle)
      const preview = truncate(
        memo.title || memo.content.split('\n')[0] || '메모',
        9,
      )

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
      const moreAngle = angle + (spread || 0.4) * 0.75
      const moreX = catX + (memoBaseRadius + 70) * Math.cos(moreAngle)
      const moreY = catY + (memoBaseRadius + 70) * Math.sin(moreAngle)

      nodes.push({
        id: `more-${slug}`,
        type: 'more',
        label: `+${overflow}`,
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

  resolveCollisions(nodes)

  // Sync edge endpoints after collision resolve
  const byId = new Map(nodes.map((node) => [node.id, node]))
  for (const edge of edges) {
    const parts = edge.id.split('-')
    if (edge.id.startsWith('edge-root-')) {
      const slug = edge.id.replace('edge-root-', '')
      const cat = byId.get(`cat-${slug}`)
      if (cat) {
        edge.to = { x: cat.x, y: cat.y }
      }
    } else if (edge.id.startsWith('edge-more-')) {
      const slug = edge.id.replace('edge-more-', '')
      const cat = byId.get(`cat-${slug}`)
      const more = byId.get(`more-${slug}`)
      if (cat) edge.from = { x: cat.x, y: cat.y }
      if (more) edge.to = { x: more.x, y: more.y }
    } else if (parts[0] === 'edge' && parts.length >= 3) {
      const slug = parts[1]
      const memoId = parts.slice(2).join('-')
      const cat = byId.get(`cat-${slug}`)
      const memo = byId.get(`memo-${memoId}`)
      if (cat) edge.from = { x: cat.x, y: cat.y }
      if (memo) edge.to = { x: memo.x, y: memo.y }
    }
  }

  return { nodes, edges, width: BASE_WIDTH, height: BASE_HEIGHT }
}
