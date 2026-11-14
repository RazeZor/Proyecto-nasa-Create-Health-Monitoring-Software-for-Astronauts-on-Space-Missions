"use client"

import type { KeyboardEvent } from "react"
import type { Sex } from "@/components/app-context"
import { STATUS_ICON } from "@/components/shared/status"
import { S } from "@/lib/strings"
import type { Status, ZoneId, ZoneResult } from "@/lib/types"
import { cn } from "@/lib/utils"

export type BodySide = "front" | "back"
type Pt = [number, number]

const FILL: Record<Status, string> = {
  ok: "fill-status-ok/20 stroke-status-ok",
  watch: "fill-status-watch/25 stroke-status-watch",
  act: "fill-status-act/25 stroke-status-act",
}

const ICON_COLOR: Record<Status, string> = {
  ok: "text-status-ok",
  watch: "text-status-watch",
  act: "text-status-act",
}

/** Closed Catmull-Rom spline through the points, as cubic Bézier commands. */
function smooth(pts: Pt[]): string {
  const n = pts.length
  const p = (i: number) => pts[(i + n) % n]
  let d = `M${p(0)[0]} ${p(0)[1]}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)]
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`
  }
  return `${d}Z`
}

/** Mirror a right-half outline (dx from centre line) into a full symmetric shape. */
function symmetric(half: Pt[]): string {
  const right = half.map(([dx, y]) => [100 + dx, y] as Pt)
  const left = [...half].reverse().map(([dx, y]) => [100 - dx, y] as Pt)
  return smooth([...right, ...left])
}

const mirrorX = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [200 - x, y])

const DIMS: Record<Sex, { neck: number; shoulder: number; chest: number; waist: number; hip: number; headRx: number; headRy: number }> = {
  male: { neck: 9, shoulder: 46, chest: 40, waist: 29, hip: 32, headRx: 17, headRy: 21 },
  female: { neck: 7, shoulder: 39, chest: 35, waist: 24, hip: 36, headRx: 15.5, headRy: 20 },
}

function buildBody(sex: Sex) {
  const { neck, shoulder: s, chest, waist, hip, headRx, headRy } = DIMS[sex]
  const female = sex === "female"

  const headCy = 36
  const head = `M${100 - headRx} ${headCy}a${headRx} ${headRy} 0 1 0 ${headRx * 2} 0a${headRx} ${headRy} 0 1 0 ${-headRx * 2} 0z`
  const neckPath = `M${100 - neck} 52h${neck * 2}v14h${-neck * 2}z`
  const brain = symmetric([
    [0, 17],
    [6, 16],
    [11, 20],
    [12.5, 27],
    [10, 33],
    [4, 34],
    [0, 33],
  ])

  const torso = symmetric([
    [0, 63],
    [neck, 63],
    [neck + 6, 68],
    [s - 6, 72],
    [s, 81],
    [s - 3, 94],
    [chest, 106],
    [chest - (female ? 5 : 3), 120],
    [waist + 1, 128],
    [0, 128],
  ])

  const abdomen = symmetric([
    [0, 131],
    [waist + 1, 131],
    [waist, 145],
    [waist + (female ? 3 : 1), 160],
    [hip - 2, 174],
    [hip, 184],
    [0, 186],
  ])

  const x0 = 100 - hip
  const legL: Pt[] = [
    [x0, 188],
    [x0 - 1, 215],
    [x0 + 2, 250],
    [x0 + 6, 288],
    [x0 + 5, 312],
    [x0 + 4, 336],
    [x0 + 9, 372],
    [x0 + 11, 402],
    [x0 + 6, 413],
    [x0 + 8, 420],
    [x0 + 23, 420],
    [x0 + 23, 411],
    [x0 + 21, 402],
    [x0 + 21, 372],
    [x0 + 23, 340],
    [x0 + 22, 312],
    [x0 + 23, 290],
    [x0 + 27, 250],
    [97, 206],
    [97, 192],
  ]

  const a = 100 - s
  const armL: Pt[] = [
    [a + 2, 76],
    [a - 3, 86],
    [a - 7, 112],
    [a - 9, 140],
    [a - 12, 170],
    [a - 13, 196],
    [a - 17, 206],
    [a - 17, 222],
    [a - 12, 231],
    [a - 6, 227],
    [a - 3, 212],
    [a - 2, 196],
    [a + 1, 170],
    [a + 4, 145],
    [a + 7, 118],
    [a + 9, 96],
  ]

  const spine = `M97 66h6v116a3 3 0 0 1-6 0z`

  return {
    head: [neckPath, head],
    brain,
    torso,
    abdomen,
    limbs: [smooth(armL), smooth(mirrorX(armL)), smooth(legL), smooth(mirrorX(legL))],
    spine,
    dims: { x0, a, chest, waist, hip, s, neck, headRx, headRy, headCy },
  }
}

function Details({ sex, side, body }: { sex: Sex; side: BodySide; body: ReturnType<typeof buildBody> }) {
  const { x0, a, chest, waist, hip, s, neck, headRx } = body.dims
  const female = sex === "female"
  const knees = [x0 + 14, 200 - (x0 + 14)]
  const elbows = [a - 2, 200 - (a - 2)]

  if (side === "front") {
    return (
      <g className="pointer-events-none fill-none stroke-foreground/25" strokeWidth={1.2} strokeLinecap="round" aria-hidden>
        <path d={`M${100 - neck - 2} 70Q${100 - s / 2} 74 ${100 - s + 6} 74M${100 + neck + 2} 70Q${100 + s / 2} 74 ${100 + s - 6} 74`} />
        {female ? (
          <path d={`M${100 - chest + 6} 100Q${100 - chest / 2} 120 ${100 - 3} 104M${100 + chest - 6} 100Q${100 + chest / 2} 120 ${100 + 3} 104`} />
        ) : (
          <>
            <path d={`M${100 - chest + 5} 104Q${100 - chest / 2} 112 100 104Q${100 + chest / 2} 112 ${100 + chest - 5} 104`} />
            <path d="M100 108v62M88 128h24M89 144h22M90 158h20" />
          </>
        )}
        <circle cx={100} cy={female ? 156 : 166} r={1.6} />
        <path d={`M${100 - hip + 6} 176Q${100 - 6} 192 100 196Q${100 + 6} 192 ${100 + hip - 6} 176`} />
        {knees.map((x) => (
          <path key={x} d={`M${x - 5} 292q5 6 10 0`} />
        ))}
        <path d={`M${100 - 6} 33h3M${100 + 3} 33h3M${100 - 3} 46q3 2 6 0`} className="stroke-foreground/40" />
        <path d={`M${100 - waist + 2} 133Q${100 - waist + 8} 150 ${100 - waist + 4} 166M${100 + waist - 2} 133Q${100 + waist - 8} 150 ${100 + waist - 4} 166`} />
        {female ? null : <path d={`M${100 - headRx + 2} 44q-2 -4 0 -6M${100 + headRx - 2} 44q2 -4 0 -6`} />}
      </g>
    )
  }

  return (
    <g className="pointer-events-none fill-none stroke-foreground/25" strokeWidth={1.2} strokeLinecap="round" aria-hidden>
      <path d={`M${100 - 8} 84Q${100 - s / 2 - 4} 80 ${100 - s / 2 - 6} 100Q${100 - s / 2} 114 ${100 - 8} 108`} />
      <path d={`M${100 + 8} 84Q${100 + s / 2 + 4} 80 ${100 + s / 2 + 6} 100Q${100 + s / 2} 114 ${100 + 8} 108`} />
      <path d={`M${100 - waist} 150Q${100 - waist / 2} 146 ${100 - 6} 152M${100 + waist} 150Q${100 + waist / 2} 146 ${100 + 6} 152`} />
      <path d={`M100 186v14M${100 - hip + 4} 196Q${100 - hip / 2} 210 ${100 - 3} 200M${100 + hip - 4} 196Q${100 + hip / 2} 210 ${100 + 3} 200`} />
      {knees.map((x) => (
        <path key={x} d={`M${x - 6} 296q6 -4 12 0M${x - 4} 320q4 14 0 28M${x + 4} 320q-4 14 0 28`} />
      ))}
      {elbows.map((x) => (
        <path key={x} d={`M${x - 3} 140q3 3 6 0`} />
      ))}
    </g>
  )
}

function Hair({ sex, side, body }: { sex: Sex; side: BodySide; body: ReturnType<typeof buildBody> }) {
  const { headRx, headCy, headRy } = body.dims
  const top = headCy - headRy - 2
  if (sex === "female") {
    const w = headRx + 4
    const d =
      side === "back"
        ? `M${100 - w} ${headCy}C${100 - w} ${top} ${100 + w} ${top} ${100 + w} ${headCy}C${100 + w + 2} 62 ${100 + w - 2} 76 ${100 + w - 6} 80H${100 - w + 6}C${100 - w + 2} 76 ${100 - w - 2} 62 ${100 - w} ${headCy}z`
        : `M${100 - w} ${headCy}C${100 - w} ${top} ${100 + w} ${top} ${100 + w} ${headCy}C${100 + w + 1} 58 ${100 + w - 1} 70 ${100 + w - 4} 74H${100 + headRx - 6}C${100 + headRx - 2} 56 ${100 + headRx} 40 ${100 + headRx - 2} 30Q100 20 ${100 - headRx + 2} 30C${100 - headRx} 40 ${100 - headRx + 2} 56 ${100 - headRx + 6} 74H${100 - w + 4}C${100 - w + 1} 70 ${100 - w - 1} 58 ${100 - w} ${headCy}z`
    return <path d={d} className="pointer-events-none fill-foreground/25" aria-hidden />
  }
  const d =
    side === "back"
      ? `M${100 - headRx - 1} ${headCy}C${100 - headRx - 1} ${top} ${100 + headRx + 1} ${top} ${100 + headRx + 1} ${headCy}Q${100 + headRx} 48 ${100 + headRx - 4} 50H${100 - headRx + 4}Q${100 - headRx} 48 ${100 - headRx - 1} ${headCy}z`
      : `M${100 - headRx - 1} ${headCy - 2}C${100 - headRx - 1} ${top} ${100 + headRx + 1} ${top} ${100 + headRx + 1} ${headCy - 2}Q${100 + headRx - 2} 24 100 22Q${100 - headRx + 2} 24 ${100 - headRx - 1} ${headCy - 2}z`
  return <path d={d} className="pointer-events-none fill-foreground/25" aria-hidden />
}

export function BodyFigure({
  zones,
  selected,
  onSelect,
  sex,
  side,
}: {
  zones: ZoneResult[]
  selected: ZoneId | null
  onSelect: (z: ZoneId) => void
  sex: Sex
  side: BodySide
}) {
  const byId = Object.fromEntries(zones.map((z) => [z.zone, z])) as Record<ZoneId, ZoneResult>
  const body = buildBody(sex)
  const { x0 } = body.dims

  const parts: { id: ZoneId; d: string[]; icon: Pt }[] = [
    { id: "bone", d: side === "back" ? [...body.limbs, body.spine] : body.limbs, icon: [x0 + 4, 236] },
    { id: "blood", d: [body.abdomen], icon: [93, side === "back" ? 160 : 140] },
    { id: "heart", d: [body.torso], icon: [side === "back" ? 93 : 103, side === "back" ? 74 : 86] },
    { id: "head", d: body.head, icon: [93, 40] },
    { id: "mind", d: [body.brain], icon: [93, 18] },
  ]

  const onKey = (e: KeyboardEvent, z: ZoneId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onSelect(z)
    }
  }

  const renderPart = ({ id, d, icon }: (typeof parts)[number]) => {
    const z = byId[id]
    const Icon = STATUS_ICON[z.status]
    const label = `${S.zones[id]}: ${S.status[z.status]}`
    return (
      <g
        key={id}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={selected === id}
        onClick={() => onSelect(id)}
        onKeyDown={(e) => onKey(e, id)}
        className="cursor-pointer outline-none [&:focus-visible_path]:stroke-foreground [&:focus-visible_path]:[stroke-width:3]"
      >
        <title>{label}</title>
        {d.map((path, i) => (
          <path
            key={i}
            d={path}
            strokeLinejoin="round"
            className={cn(
              FILL[z.status],
              "transition-[stroke-width] hover:[stroke-width:2.5]",
              selected === id ? "[stroke-width:3]" : "[stroke-width:1.5]",
            )}
          />
        ))}
        <Icon x={icon[0]} y={icon[1]} width={14} height={14} aria-hidden className={cn("pointer-events-none", ICON_COLOR[z.status])} />
      </g>
    )
  }

  const [bone, blood, heart, head, mind] = parts

  return (
    <svg
      viewBox="20 -2 160 426"
      className="h-full max-h-[520px] w-auto"
      role="group"
      aria-label={`${S.body.figureLabel} (${S.body[sex]}, ${S.body[side]})`}
    >
      {sex === "female" && side === "front" ? <Hair sex={sex} side={side} body={body} /> : null}
      {renderPart(bone)}
      {renderPart(blood)}
      {renderPart(heart)}
      {renderPart(head)}
      {side === "back" || sex === "male" ? <Hair sex={sex} side={side} body={body} /> : null}
      <Details sex={sex} side={side} body={body} />
      {renderPart(mind)}
    </svg>
  )
}
