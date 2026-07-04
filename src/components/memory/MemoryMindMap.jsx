import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildMindMapGraph } from '../../lib/memoryMindMapLayout.js'

function curvePath(from, to) {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const cx = mx - dy * 0.15
  const cy = my + dx * 0.15
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

function NodeShape({ node, selected, onSelect }) {
  const isRoot = node.type === 'root'
  const isCategory = node.type === 'category'
  const isMore = node.type === 'more'

  const width = isRoot ? 120 : isCategory ? 96 : isMore ? 56 : 88
  const height = isRoot ? 44 : isCategory ? 40 : isMore ? 28 : 32
  const rx = isRoot ? 22 : isCategory ? 20 : isMore ? 14 : 16

  return (
    <g
      className="cursor-pointer"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(node)
      }}
    >
      <rect
        x={node.x - width / 2}
        y={node.y - height / 2}
        width={width}
        height={height}
        rx={rx}
        fill={isRoot ? node.color : `${node.color}18`}
        stroke={node.color}
        strokeWidth={selected ? 2.5 : isRoot ? 0 : 1.5}
        className="transition-all duration-200"
      />
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        className={[
          'pointer-events-none select-none fill-planner-ink',
          isRoot && 'text-sm font-bold fill-white',
          isCategory && 'text-xs font-semibold',
          isMore && 'text-[10px] font-medium',
          !isRoot && !isCategory && !isMore && 'text-[10px]',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {node.emoji && isCategory ? (
          <tspan x={node.x} dy={-6}>
            {node.emoji}
          </tspan>
        ) : null}
        <tspan x={node.x} dy={node.emoji && isCategory ? 14 : 0}>
          {node.label}
        </tspan>
      </text>
    </g>
  )
}

export function MemoryMindMap({ memos, onSelectCategory, onSelectMemo }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [selectedId, setSelectedId] = useState(null)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const graph = useMemo(() => buildMindMapGraph(memos), [memos])

  useEffect(() => {
    const element = containerRef.current
    if (!element || memos.length === 0) return
    const pad = 40
    const sx = (element.clientWidth - pad * 2) / graph.width
    const sy = (element.clientHeight - pad * 2) / graph.height
    setScale(Math.min(1.2, Math.max(0.4, Math.min(sx, sy))))
    setOffset({ x: 0, y: 0 })
  }, [graph.width, graph.height, memos.length])

  const handleWheel = useCallback((event) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    setScale((value) => Math.min(2.5, Math.max(0.35, value * delta)))
  }, [])

  const handlePointerDown = useCallback(
    (event) => {
      if (event.target.closest('g.cursor-pointer')) return
      setDragging(true)
      dragStart.current = {
        x: event.clientX,
        y: event.clientY,
        ox: offset.x,
        oy: offset.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [offset],
  )

  const handlePointerMove = useCallback(
    (event) => {
      if (!dragging) return
      setOffset({
        x: dragStart.current.ox + (event.clientX - dragStart.current.x),
        y: dragStart.current.oy + (event.clientY - dragStart.current.y),
      })
    },
    [dragging],
  )

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  const handleNodeSelect = useCallback(
    (node) => {
      setSelectedId(node.id)
      if (node.type === 'memo' && node.memoId) {
        onSelectMemo?.(node.memoId)
      } else if ((node.type === 'category' || node.type === 'more') && node.slug) {
        onSelectCategory?.(node.slug)
      }
    },
    [onSelectCategory, onSelectMemo],
  )

  const fitView = () => {
    const element = containerRef.current
    if (!element) return
    const pad = 40
    const sx = (element.clientWidth - pad * 2) / graph.width
    const sy = (element.clientHeight - pad * 2) / graph.height
    setScale(Math.min(1.2, Math.max(0.4, Math.min(sx, sy))))
    setOffset({ x: 0, y: 0 })
  }

  if (memos.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-planner-sand bg-planner-warm/40 p-8 text-center">
        <p className="text-4xl">🗺️</p>
        <p className="mt-3 text-sm font-medium text-planner-ink">아직 기록이 없습니다</p>
        <p className="mt-1 text-xs text-planner-ink-muted">
          메모를 작성하면 마인드맵으로 연결됩니다
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-planner-sand bg-planner-cream/50 shadow-soft">
      <div className="absolute right-3 top-3 z-10 flex gap-1">
        <button
          type="button"
          onClick={() => setScale((value) => Math.min(2.5, value * 1.15))}
          className="rounded-lg border border-planner-sand bg-white px-2.5 py-1.5 text-xs text-planner-ink-muted shadow-soft hover:bg-planner-warm"
          aria-label="확대"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setScale((value) => Math.max(0.35, value * 0.85))}
          className="rounded-lg border border-planner-sand bg-white px-2.5 py-1.5 text-xs text-planner-ink-muted shadow-soft hover:bg-planner-warm"
          aria-label="축소"
        >
          −
        </button>
        <button
          type="button"
          onClick={fitView}
          className="rounded-lg border border-planner-sand bg-white px-2.5 py-1.5 text-xs text-planner-sage shadow-soft hover:bg-planner-warm"
          aria-label="화면 맞춤"
        >
          맞춤
        </button>
      </div>

      <p className="absolute left-3 top-3 z-10 rounded-lg border border-planner-sand/80 bg-white/90 px-2 py-1 text-xs text-planner-ink-muted shadow-soft">
        드래그로 이동 · 스크롤로 확대/축소 · 노드 클릭
      </p>

      <div
        ref={containerRef}
        className={[
          'min-h-[420px] flex-1 touch-none overflow-hidden',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        ].join(' ')}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          className="h-full w-full min-h-[420px]"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 0.05s ease-out',
          }}
        >
          {graph.edges.map((edge) => (
            <path
              key={edge.id}
              d={curvePath(edge.from, edge.to)}
              fill="none"
              stroke={edge.color}
              strokeWidth={edge.color.endsWith('88') ? 1.5 : 2}
              strokeLinecap="round"
            />
          ))}

          {graph.nodes.map((node) => (
            <NodeShape
              key={node.id}
              node={node}
              selected={selectedId === node.id}
              onSelect={handleNodeSelect}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
