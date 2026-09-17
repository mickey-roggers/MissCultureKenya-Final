'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, CalendarClock } from 'lucide-react'

interface VotingCountdownProps {
  /** ISO timestamp when voting closes */
  endDate?: string | null
  /** ISO timestamp when voting opens (optional) */
  startDate?: string | null
  /** Whether voting is currently open according to the backend */
  isVotingActive?: boolean
  /** Extra classes for the outer wrapper */
  className?: string
}

type Tone = 'green' | 'amber' | 'red'

interface Remaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0')

function computeRemaining(target: number, now: number): Remaining {
  const total = Math.max(0, Math.floor((target - now) / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    total,
  }
}

function formatEndDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const Unit = ({ value, label, tone }: { value: number; label: string; tone: Tone }) => {
  const box =
    tone === 'red' ? 'bg-red-600 text-white'
    : tone === 'amber' ? 'bg-amber-500 text-white'
    : 'bg-green-600 text-white'
  const caption =
    tone === 'red' ? 'text-red-700'
    : tone === 'amber' ? 'text-amber-700'
    : 'text-green-700'
  return (
    <div className="flex flex-col items-center">
      <div className={`min-w-[56px] rounded-xl px-3 py-2 text-center tabular-nums ${box}`}>
        <span className="text-2xl font-bold leading-none">{pad(value)}</span>
      </div>
      <span className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${caption}`}>{label}</span>
    </div>
  )
}

/**
 * Live countdown showing how much time remains before an event's voting closes.
 * Renders nothing when no end date is configured.
 */
const VotingCountdown = ({
  endDate,
  startDate,
  isVotingActive = true,
  className = '',
}: VotingCountdownProps) => {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const end = useMemo(() => (endDate ? new Date(endDate).getTime() : NaN), [endDate])
  const start = useMemo(() => (startDate ? new Date(startDate).getTime() : NaN), [startDate])

  if (now === null) return null
  if (!Number.isFinite(end)) return null

  const remaining = computeRemaining(end, now)

  // Not open yet (only when we know the opening time)
  if (isVotingActive && Number.isFinite(start) && now < start) {
    const untilStart = computeRemaining(start, now)
    return (
      <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-amber-800">
          <CalendarClock className="w-4 h-4" />
          <span className="text-sm font-semibold">Voting opens in</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Unit value={untilStart.days} label="Days" tone="amber" />
          <Unit value={untilStart.hours} label="Hours" tone="amber" />
          <Unit value={untilStart.minutes} label="Mins" tone="amber" />
        </div>
      </div>
    )
  }

  if (remaining.total <= 0) {
    const closedOn = formatEndDate(endDate)
    return (
      <div className={`rounded-2xl border border-gray-200 bg-gray-50 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-semibold">Voting has ended</span>
        </div>
        {closedOn && <p className="mt-1 text-xs text-gray-500">Closed on {closedOn}</p>}
      </div>
    )
  }

  const urgent = remaining.total < 86400 // less than one day left
  const endsOn = formatEndDate(endDate)

  return (
    <div className={`rounded-2xl border p-4 ${urgent ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'} ${className}`}>
      <div className={`flex items-center gap-2 ${urgent ? 'text-red-700' : 'text-green-800'}`}>
        <Clock className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {urgent ? 'Hurry — voting closes soon' : 'Voting closes in'}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Unit value={remaining.days} label="Days" tone={urgent ? 'red' : 'green'} />
        <Unit value={remaining.hours} label="Hours" tone={urgent ? 'red' : 'green'} />
        <Unit value={remaining.minutes} label="Mins" tone={urgent ? 'red' : 'green'} />
        <Unit value={remaining.seconds} label="Secs" tone={urgent ? 'red' : 'green'} />
      </div>
      {endsOn && (
        <p className={`mt-2 text-xs ${urgent ? 'text-red-600' : 'text-green-700'}`}>Voting ends {endsOn}</p>
      )}
    </div>
  )
}

export default VotingCountdown
