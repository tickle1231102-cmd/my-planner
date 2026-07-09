import { useCallback, useMemo } from 'react'
import { useCloudSync } from './context/CloudSyncContext.jsx'
import { ImeSafeTextarea } from './components/ImeSafeTextarea.jsx'
import { ImeSafeInput } from './components/ImeSafeInput.jsx'
import { useDebouncedDraft } from './lib/debouncedDraft.js'
import {
  createDefaultMandalaData,
  getMandalaCellClass,
  globalCellIndex,
  normalizeMandalaData,
} from './lib/mandalaStorage.js'

function WavyDivider() {
  return (
    <svg
      viewBox="0 0 800 12"
      preserveAspectRatio="none"
      className="h-3 w-full text-planner-sage/50"
      aria-hidden
    >
      <path
        d="M0 6 Q20 1 40 6 T80 6 T120 6 T160 6 T200 6 T240 6 T280 6 T320 6 T360 6 T400 6 T440 6 T480 6 T520 6 T560 6 T600 6 T640 6 T680 6 T720 6 T760 6 T800 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MandalaCell({ blockIndex, cellIndex, value, onChange }) {
  const cellClass = getMandalaCellClass(blockIndex, cellIndex)
  const isMainGoal = blockIndex === 4 && cellIndex === 4

  return (
    <div
      className={[
        'relative min-h-0 min-w-0 border',
        cellClass,
        isMainGoal ? 'shadow-[inset_0_0_0_1px_rgba(122,158,126,0.25)]' : '',
      ].join(' ')}
    >
      <ImeSafeTextarea
        value={value}
        onChange={onChange}
        rows={2}
        className="h-full min-h-[2.25rem] w-full resize-none bg-transparent px-1 py-0.5 text-center text-[9px] leading-tight text-planner-ink placeholder:text-planner-ink-muted/40 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-planner-sage/30 sm:min-h-[2.75rem] sm:px-1.5 sm:py-1 sm:text-[10px] md:text-xs"
        placeholder=""
        aria-label={`Mandal-Art cell ${globalCellIndex(blockIndex, cellIndex) + 1}`}
      />
    </div>
  )
}

function MandalaBlock({ blockIndex, cells, onCellChange }) {
  const isCenterBlock = blockIndex === 4

  return (
    <div
      className={[
        'grid min-w-0 grid-cols-3 gap-px overflow-hidden rounded-sm sm:rounded-md',
        isCenterBlock ? 'bg-planner-sage-muted/35 p-px ring-1 ring-planner-sage/30' : 'bg-planner-sage/15',
      ].join(' ')}
    >
      {Array.from({ length: 9 }, (_, cellIndex) => {
        const index = globalCellIndex(blockIndex, cellIndex)
        return (
          <MandalaCell
            key={cellIndex}
            blockIndex={blockIndex}
            cellIndex={cellIndex}
            value={cells[index] || ''}
            onChange={(value) => onCellChange(index, value)}
          />
        )
      })}
    </div>
  )
}

function useMandalartStorage() {
  const { mandalaData, updateMandala } = useCloudSync()
  const remoteData = useMemo(
    () => normalizeMandalaData(mandalaData),
    [mandalaData],
  )

  const commitData = useCallback(
    (nextData) => {
      updateMandala(() => nextData)
    },
    [updateMandala],
  )

  const [data, setData] = useDebouncedDraft(remoteData, commitData, {
    resetKey: remoteData.year,
  })

  const patchData = useCallback(
    (patch) => {
      setData((prev) => ({ ...prev, ...patch }))
    },
    [setData],
  )

  const setCell = useCallback(
    (index, value) => {
      setData((prev) => {
        const cells = [...prev.cells]
        cells[index] = value
        return { ...prev, cells }
      })
    },
    [setData],
  )

  return { data, patchData, setCell }
}

export default function MandalartView() {
  const { data, patchData, setCell } = useMandalartStorage()
  const year = data.year || new Date().getFullYear()

  return (
    <div className="overflow-hidden rounded-2xl border border-planner-sand bg-planner-cream shadow-soft">
      <div className="border-b border-planner-sand/80 bg-white/70 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="shrink-0">
            <p className="font-sans text-4xl font-medium tracking-tight text-planner-sage sm:text-5xl">
              LIFE
            </p>
            <span className="mt-2 inline-block rounded-lg bg-planner-sage px-3 py-1 text-sm font-semibold text-white sm:text-base">
              Mandal-Art
            </span>
          </div>

          <div className="min-w-0 flex-1 lg:max-w-md">
            <p className="mb-2 text-center text-xs font-medium text-planner-sage sm:text-sm lg:text-left">
              <span className="inline-block">←</span>
              {' '}
              {year} KEYWORD / {year} Resolution
              {' '}
              <span className="inline-block">→</span>
            </p>
            <div className="relative rounded-2xl border-2 border-planner-sage/70 bg-planner-sage-light/40 p-3 shadow-[4px_4px_0_rgba(122,158,126,0.15)] sm:p-4">
              <div
                className="pointer-events-none absolute -left-2 top-1/2 hidden size-4 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-planner-sage/70 bg-planner-sage-light/40 lg:block"
                aria-hidden
              />
              <ImeSafeInput
                type="text"
                value={data.keyword}
                onChange={(value) => patchData({ keyword: value })}
                placeholder={`${year} Keyword`}
                className="mb-2 w-full border-b border-planner-sage/25 bg-transparent px-1 py-1 text-sm font-medium text-planner-ink placeholder:text-planner-ink-muted/50 focus:border-planner-sage focus:outline-none"
              />
              <ImeSafeTextarea
                value={data.resolution}
                onChange={(value) => patchData({ resolution: value })}
                placeholder={`Write your ${year} resolution`}
                rows={3}
                className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-relaxed text-planner-ink placeholder:text-planner-ink-muted/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <WavyDivider />
        </div>
      </div>

      <div className="p-3 sm:p-4 md:p-6">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-1 sm:gap-1.5 md:gap-2">
          {Array.from({ length: 9 }, (_, blockIndex) => (
            <MandalaBlock
              key={blockIndex}
              blockIndex={blockIndex}
              cells={data.cells}
              onCellChange={setCell}
            />
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] text-planner-ink-muted sm:text-xs">
          Write your core goal in the center yellow cell, and detailed goals and action plans in the green cells.
        </p>
      </div>
    </div>
  )
}

export { createDefaultMandalaData, normalizeMandalaData }
