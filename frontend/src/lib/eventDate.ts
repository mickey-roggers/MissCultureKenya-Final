const EVENT_TIME_ZONE = 'Africa/Nairobi'

export function formatEventTime(dateValue?: string | null): string {
  if (!dateValue) return ''

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-KE', {
    timeZone: EVENT_TIME_ZONE,
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
