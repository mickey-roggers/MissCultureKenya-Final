import type { Metadata } from 'next'

// Server-side metadata for individual contestant pages. Without this, every
// contestant URL inherits the parent /voting canonical, so Google treats each
// one as a duplicate of the voting listing and won't index it individually —
// even though the sitemap lists every contestant URL. This gives each
// contestant its own indexable title, description, canonical and share image.

const SITE_URL = 'https://misscultureglobalkenya.com'

function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || ''
  const trimmed = raw.replace(/\/+$/, '')
  return trimmed.endsWith('/admin') ? trimmed.slice(0, -'/admin'.length) : trimmed
}

async function fetchContestant(eventSlug: string, contestantSlug: string) {
  const base = getApiBase()
  if (!base) return null
  try {
    const eventsRes = await fetch(`${base}/api/events/events/voting_events/`, {
      // Revalidate every 5 minutes so previews stay fresh without refetching
      // for every crawler hit.
      next: { revalidate: 300 },
    })
    if (!eventsRes.ok) return null
    const eventsJson = await eventsRes.json()
    const events = Array.isArray(eventsJson) ? eventsJson : (eventsJson?.results || [])
    const event = events.find((e: any) => e.slug === eventSlug)
    if (!event?.id) return null

    const cRes = await fetch(`${base}/api/events/contestants/?event=${event.id}`, {
      next: { revalidate: 300 },
    })
    if (!cRes.ok) return null
    const cJson = await cRes.json()
    const contestants = Array.isArray(cJson) ? cJson : (cJson?.results || [])
    const contestant = contestants.find((c: any) => c.slug === contestantSlug)
    if (!contestant) return null
    return { event, contestant }
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ eventSlug: string; contestantSlug: string }> }
): Promise<Metadata> {
  const { eventSlug, contestantSlug } = await params
  const data = await fetchContestant(eventSlug, contestantSlug)
  const url = `${SITE_URL}/voting/${eventSlug}/${contestantSlug}`

  if (!data) {
    return {
      title: 'Contestant',
      description: 'Meet the contestants of Miss Culture Global Kenya and cast your vote.',
      alternates: { canonical: `/voting/${eventSlug}/${contestantSlug}` },
      openGraph: {
        title: 'Contestant | Miss Culture Global Kenya',
        description: 'Meet the contestants of Miss Culture Global Kenya and cast your vote.',
        url,
        images: ['/opengraph-image'],
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        images: ['/twitter-image'],
      },
    }
  }

  const { event, contestant } = data
  const name: string = contestant.name || 'Contestant'
  const category: string = contestant.contestant_category_name || 'Contestant'
  const number = contestant.contestant_number ? `#${contestant.contestant_number} ` : ''
  const eventTitle: string = event.title || contestant.event_title || 'Miss Culture Global Kenya'
  const intro: string = contestant.bio || contestant.mission_statement || `Meet ${name}, competing in ${eventTitle}.`
  const rawDescription = `${intro} Support ${name}! Cast your vote now.`
  const description =
    rawDescription.length > 200 ? `${rawDescription.slice(0, 197)}...` : rawDescription

  const photo: string | undefined = contestant.photo_url || undefined
  const images = photo
    ? [{ url: photo, width: 1200, height: 630, alt: name }]
    : [{ url: '/opengraph-image', width: 1200, height: 630, alt: name }]

  const title = `${number}${name} — ${category} | ${eventTitle}`

  return {
    title,
    description,
    alternates: { canonical: `/voting/${eventSlug}/${contestantSlug}` },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Miss Culture Global Kenya',
      images,
      locale: 'en_KE',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: photo ? [photo] : ['/twitter-image'],
    },
  }
}

export default function ContestantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
