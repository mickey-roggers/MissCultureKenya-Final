'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, MapPin, Users, ExternalLink, Share2, ArrowLeft, Vote, Check, Ticket, AlertCircle, Loader2, Mail, Phone, User, CreditCard, Download, X, ChevronLeft } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import apiClient, { downloadTickets } from '@/lib/api'
import type { ApiError } from '@/lib/api'
import { formatEventTime } from '@/lib/eventDate'

interface TicketCategoryData {
  id: number
  name: string
  price: string
  description: string
  available: number
  total: number
  is_active: boolean
}

interface ContestantData {
  id: number
  name: string
  bio: string
  photo_url: string | null
  contestant_number: number
  slug: string
  contestant_category: number | null
  contestant_category_name: string | null
}

interface ContestantCategoryData {
  id: number
  name: string
  is_active: boolean
  order: number
}

interface GuestSpeakerData {
  id: number
  name: string
  title: string
  bio: string
  photo_url: string | null
  order: number
}

const derivePriceLabel = (ticketCategories: any[], fallback?: any): string => {
  if (!Array.isArray(ticketCategories) || ticketCategories.length === 0) {
    if (typeof fallback === 'string' && fallback.trim()) return fallback
    if (typeof fallback === 'number' && Number.isFinite(fallback)) {
      return Number(fallback) <= 0 ? 'Free' : `From KES ${Number(fallback).toLocaleString()}`
    }
    return ''
  }
  const prices = ticketCategories
    .map((tc) => {
      const pv = tc?.price_value
      if (pv !== undefined && pv !== null && pv !== '') return Number(pv)
      const p = tc?.price
      if (typeof p === 'number') return p
      if (typeof p === 'string') {
        if (p.toLowerCase() === 'free') return 0
        const n = Number(String(p).replace(/[^\d.]/g, ''))
        return Number.isFinite(n) ? n : NaN
      }
      return NaN
    })
    .filter((n) => Number.isFinite(n)) as number[]
  if (prices.length === 0) return ''
  const min = Math.min(...prices)
  return min <= 0 ? 'Free' : `From KES ${min.toLocaleString()}`
}

const EventDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const eventId = params?.id as string
  const [event, setEvent] = useState<any>(null)
  const [rawData, setRawData] = useState<any>(null)
  const [ticketCategories, setTicketCategories] = useState<TicketCategoryData[]>([])
  const [contestants, setContestants] = useState<ContestantData[]>([])
  const [contestantsLoading, setContestantsLoading] = useState(false)
  const [showContestants, setShowContestants] = useState(false)
  const [selectedContestantCategory, setSelectedContestantCategory] = useState<number | 'all' | 'uncategorized'>('all')
  const [contestantSearch, setContestantSearch] = useState('')
  const [activeContestantId, setActiveContestantId] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Ticket registration state
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [ticketQuantities, setTicketQuantities] = useState<Record<number, number>>({})
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regSubmitting, setRegSubmitting] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState<any>(null)

  // Vote verification (per-event)
  const [verifyPhone, setVerifyPhone] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [verifyResults, setVerifyResults] = useState<any[] | null>(null)
  const [verifyTotalVotes, setVerifyTotalVotes] = useState<number | null>(null)
  const [verifyTotalTransactions, setVerifyTotalTransactions] = useState<number | null>(null)

  useEffect(() => {
    if (!eventId) return
    const fetchEvent = async () => {
      try {
        setLoading(true)
        const data = await apiClient.getEvent(eventId)
        setRawData(data)
        const transformed = {
          id: data.id,
          title: data.title || data.name,
          date: data.start_date || data.date,
          time: data.start_time || data.time || formatEventTime(data.start_date) || 'Time not set',
          venue: data.venue_name || data.venue,
          location: `${data.city || ''}, ${data.country || 'Kenya'}`.trim().replace(/^,\s*/, ''),
          description: data.description,
          image: data.featured_image_url || data.featured_image || data.image || '',
          category: data.event_type || data.category || 'Event',
          capacity: data.capacity || 0,
          price: derivePriceLabel(data.ticket_categories || [], data.price),
          organizer: data.organizer || 'Miss Culture Global Kenya',
          contactEmail: data.contact_email || 'info@misscultureglobalkenya.com',
          contactPhone: data.contact_phone || '+254 721 706983',
          audience: data.audience || 'General Public',
          voting_enabled: data.voting_enabled || false,
          is_voting_active: data.is_voting_active || false,
          vote_price: data.vote_price || 10,
          event_status: data.event_status || 'draft',
          till_number: data.till_number || '4766976',
          account_name: data.account_name || 'The Misscomm Events',
          payment_method: data.payment_method || 'till_number',
          contestant_count: data.contestant_count || 0,
          total_votes: data.total_votes ?? null,
          result_visibility: data.result_visibility || 'full_live',
          slug: data.slug || '',
          ticket_url: data.ticket_url || '',
          registration_url: data.registration_url || '',
          guest_speakers: (data.guest_speakers || []) as GuestSpeakerData[],
          contestant_categories: (data.contestant_categories || []) as ContestantCategoryData[],
        }
        setEvent(transformed)

        // Fetch ticket categories from API
        try {
          const tcData = await apiClient.getTicketCategories(data.id)
          const tcResults = Array.isArray(tcData) ? tcData : (tcData?.results || [])
          setTicketCategories(tcResults)
        } catch {
          // Ticket categories not available, that's OK
        }

        setContestantsLoading(true)
        try {
          const cData = await apiClient.getEventContestants(data.id, { is_active: true })
          const cResults = Array.isArray(cData) ? cData : (cData?.results || [])
          setContestants(cResults)
        } catch {
          setContestants([])
        } finally {
          setContestantsLoading(false)
        }
      } catch (err: any) {
        const apiErr = err as ApiError
        setError(apiErr?.message || 'Failed to load event. It may not exist or has been removed.')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const handleShare = useCallback(async () => {
    if (!event) return
    const eventUrl = `https://misscultureglobalkenya.com/events/${event.id}`
    const shareData = { title: event.title, text: `Check out ${event.title} — ${event.date} at ${event.time}, ${event.venue}`, url: eventUrl }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
      alert('Link copied to clipboard!')
    }
  }, [event])

  const handleVerifyForEvent = async () => {
    if (!event) return
    if (!verifyPhone.trim()) {
      setVerifyError('Enter a phone number to check')
      return
    }
    setVerifyLoading(true)
    setVerifyError('')
    setVerifyResults(null)
    try {
      const data = await apiClient.verifyVotesByEvent(event.id, `254${verifyPhone.trim()}`)
      setVerifyResults(data.votes || [])
      setVerifyTotalVotes(data.total_votes ?? 0)
      setVerifyTotalTransactions(data.total_transactions ?? 0)
    } catch (err: any) {
      const apiErr = err as any
      setVerifyError(apiErr.message || 'Failed to verify votes')
    } finally {
      setVerifyLoading(false)
    }
  }

  const selectedItems = ticketCategories
    .map((tc) => ({ tc, qty: ticketQuantities[tc.id] || 0 }))
    .filter((x) => x.qty > 0)

  const totalTickets = selectedItems.reduce((sum, x) => sum + x.qty, 0)
  const totalAmount = selectedItems.reduce((sum, x) => sum + (Number(x.tc.price) * x.qty), 0)
  const requiresPayment = totalAmount > 0

  const contestantCategories: ContestantCategoryData[] = Array.isArray(event?.contestant_categories)
    ? event.contestant_categories
    : []

  const contestantCategoriesById = new Map<number, ContestantCategoryData>(
    contestantCategories.map((c) => [c.id, c]),
  )

  const filteredContestants = contestants
    .filter((c) => {
      if (selectedContestantCategory === 'all') return true
      if (selectedContestantCategory === 'uncategorized') return !c.contestant_category
      return (c.contestant_category || null) === selectedContestantCategory
    })
    .filter((c) => {
      const q = contestantSearch.trim().toLowerCase()
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        String(c.contestant_number).includes(q) ||
        (c.contestant_category_name || '').toLowerCase().includes(q)
      )
    })
    .slice()
    .sort((a, b) => a.contestant_number - b.contestant_number)

  const activeContestant = activeContestantId ? filteredContestants.find((c) => c.id === activeContestantId) : null

  const openContestants = () => {
    if (event?.slug) {
      router.push(`/voting?event=${encodeURIComponent(event.slug)}`)
    }
  }

  const updateTicketQuantity = (ticketCategoryId: number, nextQty: number) => {
    const tc = ticketCategories.find((x) => x.id === ticketCategoryId)
    const maxAvail = Number(tc?.available || 0)
    const clamped = maxAvail > 0 ? Math.max(0, Math.min(nextQty, maxAvail)) : Math.max(0, nextQty)
    setTicketQuantities((prev) => ({ ...prev, [ticketCategoryId]: clamped }))
  }

  const startCheckout = () => {
    const numericEventId = Number(eventId)
    if (!numericEventId || !Number.isFinite(numericEventId)) return
    if (selectedItems.length === 0) {
      setRegError('Select at least one ticket category and quantity')
      return
    }
    const draft = {
      eventId: numericEventId,
      items: selectedItems.map((x) => ({ ticket_category_id: x.tc.id, quantity: x.qty })),
      totalTickets,
      totalAmount,
    }
    sessionStorage.setItem(`checkout:event:${numericEventId}`, JSON.stringify(draft))
    router.push(`/events/${numericEventId}/checkout`)
  }

  const handleRegisterTicket = async () => {
    if (!regName) {
      setRegError('Name is required')
      return
    }
    if (regEmail.trim() && !regEmail.includes('@')) {
      setRegError('Please enter a valid email address, or leave it blank')
      return
    }
    if (selectedItems.length === 0) {
      setRegError('Select at least one ticket category and quantity')
      return
    }

    for (const item of selectedItems) {
      const maxAvail = Number(item.tc.available || 0)
      if (maxAvail > 0 && item.qty > maxAvail) {
        setRegError(`Only ${maxAvail} ticket(s) available for "${item.tc.name}"`)
        return
      }
    }

    if (requiresPayment) {
      startCheckout()
      return
    }

    setRegSubmitting(true)
    setRegError('')
    try {
      const ticketCodes: string[] = []
      for (const item of selectedItems) {
        for (let i = 0; i < item.qty; i += 1) {
          const result = await apiClient.registerFreeTicket(Number(eventId), {
            full_name: regName,
            email: regEmail,
            phone: regPhone ? `+254${regPhone}` : '',
            ticket_category: item.tc.id,
          })
          if (result?.ticket_code) ticketCodes.push(result.ticket_code)
        }
      }
      setRegSuccess({ ticket_codes: ticketCodes })
      // Auto-download the issued ticket(s) so the attendee keeps a copy.
      if (ticketCodes.length > 0) {
        downloadTickets(ticketCodes)
      }
    } catch (err) {
      const apiErr = err as ApiError
      setRegError(apiErr.message || 'Failed to register ticket')
    } finally {
      setRegSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This event may have been removed or the link is incorrect.'}</p>
          <Link href="/events" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
        </div>
      </div>
    )
  }

  const isVotingOpen = Boolean(event.voting_enabled && event.is_voting_active)

  const priceLabel = ticketCategories.length > 0
    ? derivePriceLabel(ticketCategories, event.price)
    : (event.price || '')

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative h-[45vh] min-h-[350px] flex items-end overflow-hidden">
        {event.image ? (
          <img src={event.image} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-900" />
        )}
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <Link href="/events" className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Events
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase">{event.category}</span>
            {event.audience && <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">{event.audience}</span>}
            {priceLabel && <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">{priceLabel}</span>}
            {isVotingOpen && (
              <Link href={event.slug ? `/voting?event=${encodeURIComponent(event.slug)}` : '/voting'} className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 hover:bg-red-700 transition-colors">
                <Vote className="w-3 h-3" /> Voting Open
              </Link>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">{event.title}</h1>
          <p className="text-gray-200 text-sm sm:text-base line-clamp-2 max-w-2xl">{event.description}</p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Calendar, label: 'Date', value: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                { icon: Clock, label: 'Time', value: event.time },
                { icon: MapPin, label: 'Venue', value: event.venue },
                { icon: Users, label: 'Capacity', value: `${event.capacity} guests` },
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-2 bg-green-50 rounded-xl px-3 py-3">
                  <item.icon className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-xs font-semibold text-gray-900 truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">About This Event</h2>
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
            </div>

            {(contestantsLoading || contestants.length > 0) && (
              <div>
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">Contestants</h2>
                    {!event.voting_enabled && (
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        Voting not open yet
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={openContestants}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                  >
                    View Contestants
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                {contestantsLoading ? (
                  <p className="text-sm text-gray-500">Loading contestants...</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl p-4 bg-white">
                    <p className="text-sm text-gray-600">
                      Browse all contestants and read their bio, even before voting starts.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 overflow-x-auto">
                      {contestantCategories.length > 0 ? (
                        contestantCategories.map((cat) => {
                          const count = contestants.filter((c) => (c.contestant_category || null) === cat.id).length
                          return (
                            <span
                              key={cat.id}
                              className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap"
                            >
                              {cat.name} · {count}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                          {contestants.length} total
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {showContestants && (
                  <div className="fixed inset-0 z-50">
                    <button
                      type="button"
                      aria-label="Close contestants"
                      onClick={() => setShowContestants(false)}
                      className="absolute inset-0 bg-black/60"
                    />
                    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
                      <div className="w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[85vh] flex flex-col lg:block">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-shrink-0">
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">Contestants</p>
                            <h3 className="text-lg font-bold text-gray-900 truncate">{event.title}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowContestants(false)}
                            className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-sm font-semibold text-gray-700"
                          >
                            Close
                          </button>
                        </div>

                        <div className="grid lg:grid-cols-3 lg:max-h-[calc(85vh-4rem)] lg:overflow-hidden flex-1 overflow-y-auto">
                          {/* Column 1: Names */}
                          <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col lg:h-full">
                            <div className="p-4 space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setSelectedContestantCategory('all'); setActiveContestantId(null) }}
                                  className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                                    selectedContestantCategory === 'all'
                                      ? 'bg-green-600 border-green-600 text-white'
                                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  All · {contestants.length}
                                </button>
                                {contestantCategories.map((cat) => {
                                  const count = contestants.filter((c) => (c.contestant_category || null) === cat.id).length
                                  return (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => { setSelectedContestantCategory(cat.id); setActiveContestantId(null) }}
                                      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                                        selectedContestantCategory === cat.id
                                          ? 'bg-green-600 border-green-600 text-white'
                                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      {cat.name} · {count}
                                    </button>
                                  )
                                })}
                                {contestants.some((c) => !c.contestant_category) && (
                                  <button
                                    type="button"
                                    onClick={() => { setSelectedContestantCategory('uncategorized'); setActiveContestantId(null) }}
                                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                                      selectedContestantCategory === 'uncategorized'
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    Uncategorized · {contestants.filter((c) => !c.contestant_category).length}
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <input
                                  value={contestantSearch}
                                  onChange={(e) => setContestantSearch(e.target.value)}
                                  placeholder="Search by name, number, category..."
                                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-sm"
                                />
                              </div>
                            </div>

                            <div className="max-h-[40vh] lg:max-h-[calc(85vh-12rem)] lg:flex-1 lg:min-h-0 overflow-y-auto">
                              {filteredContestants.length === 0 ? (
                                <div className="p-4 text-sm text-gray-500">No contestants found.</div>
                              ) : (
                                <div className="divide-y divide-gray-100">
                                  {filteredContestants.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => { setActiveContestantId(c.id); setDetailsOpen(true) }}
                                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                        activeContestantId === c.id ? 'bg-green-50' : 'bg-white'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="font-semibold text-gray-900 truncate">
                                            #{c.contestant_number} · {c.name}
                                          </p>
                                          <p className="text-xs text-gray-500 truncate">
                                            {c.contestant_category_name || (c.contestant_category ? contestantCategoriesById.get(c.contestant_category)?.name : null) || 'Uncategorized'}
                                          </p>
                                        </div>
                                        <span className="text-xs font-semibold text-green-700">View</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Columns 2 & 3: Bio + Image — inline on desktop, slide-over from right on mobile */}
                          {/* Mobile backdrop */}
                          {detailsOpen && (
                            <div
                              className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
                              onClick={() => setDetailsOpen(false)}
                              aria-hidden="true"
                            />
                          )}
                          <div
                            className={`lg:col-span-2 flex flex-col lg:flex-row lg:static fixed inset-y-0 right-0 z-[61] w-full max-w-md bg-white lg:bg-transparent lg:max-w-none lg:z-auto shadow-2xl lg:shadow-none transition-transform duration-300 ease-out ${detailsOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`}
                          >
                            {/* Mobile: slide-over header with Back */}
                            <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setDetailsOpen(false)}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
                              >
                                <ChevronLeft className="w-4 h-4" /> Back to list
                              </button>
                              <button
                                type="button"
                                onClick={() => setDetailsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                                aria-label="Close"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="flex-1 overflow-y-auto lg:overflow-visible flex flex-col lg:flex-row">
                              {/* Column 2: Bio / details */}
                              <div className="lg:w-3/5 p-4 lg:overflow-y-auto lg:max-h-[calc(85vh-4rem)]">
                                {!activeContestant ? (
                                  <div className="border border-dashed border-gray-300 rounded-xl p-4 text-sm text-gray-600">
                                    Select a contestant to read their bio.
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-xs text-gray-500">Contestant</p>
                                    <h4 className="text-lg font-bold text-gray-900">
                                      #{activeContestant.contestant_number} · {activeContestant.name}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {activeContestant.contestant_category_name ||
                                        (activeContestant.contestant_category
                                          ? contestantCategoriesById.get(activeContestant.contestant_category)?.name
                                          : null) ||
                                        'Uncategorized'}
                                    </p>
                                    {activeContestant.bio ? (
                                      <p className="text-sm text-gray-700 leading-relaxed mt-3 whitespace-pre-line">
                                        {activeContestant.bio}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-gray-500 mt-3">Bio not provided yet.</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Column 3: Image */}
                              <div className="lg:w-2/5 p-4 border-t lg:border-t-0 lg:border-l border-gray-200 lg:overflow-y-auto lg:max-h-[calc(85vh-4rem)]">
                                {!activeContestant ? (
                                  <div className="border border-dashed border-gray-300 rounded-xl p-4 text-sm text-gray-600">
                                    Photo appears here.
                                  </div>
                                ) : (
                                  <div className="w-full min-h-[14rem] rounded-xl overflow-hidden bg-gray-100 relative">
                                    {activeContestant.photo_url ? (
                                      <img
                                        src={activeContestant.photo_url}
                                        alt={activeContestant.name}
                                        className="w-full h-auto object-contain object-top"
                                      />
                                    ) : (
                                      <div className="w-full min-h-[14rem] flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                                        <span className="text-5xl font-bold text-green-200">#{activeContestant.contestant_number}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {Array.isArray(event.guest_speakers) && event.guest_speakers.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">
                  {event.guest_speakers.length === 1 ? 'Guest Speaker' : 'Guest Speakers'}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {event.guest_speakers
                    .slice()
                    .sort((a: GuestSpeakerData, b: GuestSpeakerData) => (a.order || 0) - (b.order || 0))
                    .map((s: GuestSpeakerData) => (
                      <div key={s.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                        <div className="flex items-start gap-3">
                          {s.photo_url ? (
                            <img
                              src={s.photo_url}
                              alt={s.name}
                              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                              <Users className="w-5 h-5 text-green-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                            {s.title && <p className="text-xs text-gray-500 mt-0.5">{s.title}</p>}
                            {s.bio && <p className="text-sm text-gray-600 mt-1 line-clamp-3">{s.bio}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Ticket Categories */}
            {ticketCategories.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Tickets</h2>
                <div className="space-y-3">
                  {ticketCategories.map((tc) => {
                    const availableNum = Number(tc.available) || 0
                    const totalNum = Number(tc.total) || 0
                    // A category is capacity-limited only when a total is set.
                    // It's sold out when that capacity has been fully depleted.
                    const isSoldOut = totalNum > 0 && availableNum <= 0
                    return (
                    <div
                      key={tc.id}
                      className={`p-4 border-2 rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 transition-all ${
                        isSoldOut
                          ? 'border-gray-200 bg-gray-50 opacity-75'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{tc.name}</h4>
                          {isSoldOut && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Sold Out</span>
                          )}
                        </div>
                        {tc.description && <p className="text-xs text-gray-500 line-clamp-2">{tc.description}</p>}
                        {isSoldOut ? (
                          <p className="text-xs font-semibold text-red-600 mt-1">Sold out</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">{availableNum} of {Math.max(totalNum, availableNum)} available</p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                        <span className="text-base sm:text-lg font-bold text-green-700 whitespace-nowrap text-center sm:text-left">
                          {Number(tc.price) === 0 ? 'Free' : `KES ${Number(tc.price).toLocaleString()}`}
                        </span>
                        {isSoldOut ? (
                          <span className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold text-center border border-gray-200 whitespace-nowrap">
                            Sold Out
                          </span>
                        ) : (
                        <div className="flex items-center gap-2 justify-center sm:justify-start">
                          <button
                            type="button"
                            onClick={() => updateTicketQuantity(tc.id, (ticketQuantities[tc.id] || 0) - 1)}
                            disabled={(ticketQuantities[tc.id] || 0) <= 0}
                            className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-700 font-bold"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-semibold text-gray-900">
                            {ticketQuantities[tc.id] || 0}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateTicketQuantity(tc.id, (ticketQuantities[tc.id] || 0) + 1)}
                            disabled={Number(tc.available) > 0 && (ticketQuantities[tc.id] || 0) >= Number(tc.available)}
                            className="w-9 h-9 rounded-xl bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-700 font-bold"
                          >
                            +
                          </button>
                        </div>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
                {totalTickets > 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-semibold text-gray-900">{totalTickets} ticket{totalTickets > 1 ? 's' : ''} selected</p>
                      <p className="text-xs text-gray-600">
                        Total: {totalAmount === 0 ? 'Free' : `KES ${totalAmount.toLocaleString()}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRegError('')
                        if (totalAmount > 0) {
                          startCheckout()
                          return
                        }
                        setShowTicketForm(true)
                      }}
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                    >
                      {totalAmount > 0 ? 'Checkout' : 'Continue'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Voting Section */}
            {event.voting_enabled && (
              <div className="bg-gradient-to-r from-red-50 to-green-50 rounded-xl p-5 border border-red-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Vote className="w-5 h-5 text-red-600 flex-shrink-0" />
                      {isVotingOpen ? 'Voting is Open' : 'Voting is Closed'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      KES {event.vote_price} per vote | {event.contestant_count} contestants{event.total_votes !== null && event.total_votes !== undefined ? ` | ${event.total_votes} votes cast` : ''}
                    </p>
                    {!isVotingOpen && (
                      <p className="text-xs text-gray-500 mt-1">
                        Voting is enabled for this event, but it is not currently active.
                      </p>
                    )}
                  </div>
                  {isVotingOpen ? (
                    <Link
                      href={event.slug ? `/voting?event=${encodeURIComponent(event.slug)}` : '/voting'}
                      className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors text-center whitespace-nowrap flex-shrink-0"
                    >
                      Vote Now
                    </Link>
                  ) : null}
                </div>

                {/* Per-event vote verification UI */}
                <div className="mt-4 border-t border-red-200/50 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Check Your Votes for this Event</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex w-full sm:flex-1">
                      <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-sm text-gray-600 font-medium">+254</span>
                      <input
                        type="tel"
                        value={verifyPhone}
                        onChange={(e) => { setVerifyPhone(e.target.value.replace(/\D/g, '')); setVerifyError('') }}
                        placeholder="712345678"
                        maxLength={9}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      />
                    </div>
                    <button
                      onClick={handleVerifyForEvent}
                      disabled={verifyLoading}
                      className="w-full sm:w-auto px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-semibold text-sm transition-colors whitespace-nowrap"
                    >
                      {verifyLoading ? 'Checking…' : 'Check My Votes'}
                    </button>
                  </div>
                  {verifyError && <p className="text-sm text-red-700 mt-2">{verifyError}</p>}
                  {verifyResults && (
                    <div className="mt-3 bg-white border border-gray-100 rounded-xl p-3 overflow-hidden">
                      <p className="text-xs text-gray-500">Results for +254{verifyPhone}</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">Total Votes: {verifyTotalVotes ?? 0} · Transactions: {verifyTotalTransactions ?? 0}</p>
                      <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                        {verifyResults.length === 0 ? (
                          <p className="text-sm text-gray-500">No matching vote transactions found.</p>
                        ) : (
                          verifyResults.map((v: any) => (
                            <div key={v.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm bg-green-50/30 p-2 rounded-md">
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{v.contestant_name || 'Contestant'}</p>
                                <p className="text-xs text-gray-600">Votes: {v.vote_count} · {new Date(v.created_at).toLocaleString()}</p>
                              </div>
                              <div className="text-xs text-gray-700 whitespace-nowrap">Ref: {v.mpesa_code || (v.payment ? v.payment.pesapal_tracking_id : '') || '—'}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Share & Action Buttons */}
            <div className="flex items-center gap-3">
              <button onClick={handleShare} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors">
                <Share2 className="w-4 h-4" /> Share Event
              </button>
              {event.ticket_url && (
                <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">
                  <ExternalLink className="w-4 h-4" /> Buy Tickets
                </a>
              )}
              {event.registration_url && (
                <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors">
                  <ExternalLink className="w-4 h-4" /> Register
                </a>
              )}
              {!event.ticket_url && !event.registration_url && ticketCategories.length === 0 && (
                <button onClick={() => setShowTicketForm(true)} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors">
                  <Ticket className="w-4 h-4" /> Register
                </button>
              )}
            </div>

            {/* Ticket Registration Form */}
            {showTicketForm && !regSuccess && (
              <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-200 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg sm:text-xl">Register for This Event</h3>

                {!requiresPayment ? (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                    This is a free event. Fill in your details and your ticket will be generated immediately.
                  </p>
                ) : (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    This is a paid ticket. You&apos;ll pay securely with M-Pesa on the next step.
                  </p>
                )}

                {selectedItems.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Your Order</p>
                    <div className="space-y-1">
                      {selectedItems.map(({ tc, qty }) => (
                        <div key={tc.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{tc.name} <span className="text-gray-400">x{qty}</span></span>
                          <span className="font-semibold text-gray-900">
                            {Number(tc.price) === 0 ? 'Free' : `KES ${(Number(tc.price) * qty).toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-gray-100 pt-2 mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">Total</span>
                        <span className="text-sm font-bold text-green-700">{totalAmount === 0 ? 'Free' : `KES ${totalAmount.toLocaleString()}`}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => { setRegName(e.target.value); setRegError('') }}
                      placeholder="Your full name"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => { setRegEmail(e.target.value); setRegError('') }}
                      placeholder="your@email.com"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-sm text-gray-600 font-medium">+254</span>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="712345678"
                      maxLength={9}
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                </div>

                {/* Paid tickets are completed via M-Pesa STK Push on the checkout page */}

                {regError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{regError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTicketForm(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegisterTicket}
                    disabled={regSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    {regSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                    {!requiresPayment ? 'Get Ticket' : 'Pay with M-Pesa'}
                  </button>
                </div>
              </div>
            )}

            {/* Registration Success */}
            {regSuccess && (
              <div className="bg-green-50 rounded-xl p-6 border border-green-200 text-center space-y-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-green-900 text-lg">
                  {regSuccess?.ticket_code || regSuccess?.ticket_codes?.length ? 'Ticket Registered!' : 'Payment Submitted!'}
                </h3>
                {(regSuccess.ticket_code || regSuccess?.ticket_codes?.length) && (
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
                    <Download className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">
                      Your ticket has been downloaded to your device. Check your downloads, or use the button below.
                    </p>
                  </div>
                )}
                {(regSuccess.ticket_code || regSuccess?.ticket_codes?.length) && (
                  <div className="bg-white rounded-lg p-3 inline-block text-left">
                    <p className="text-xs text-gray-500 mb-2">Ticket Code{regSuccess?.ticket_codes?.length > 1 ? 's' : ''}</p>
                    {regSuccess.ticket_code && (
                      <p className="text-xl font-bold font-mono text-green-700 tracking-widest">{regSuccess.ticket_code}</p>
                    )}
                    {Array.isArray(regSuccess.ticket_codes) && regSuccess.ticket_codes.length > 0 && (
                      <div className="space-y-1">
                        {regSuccess.ticket_codes.map((code: string) => (
                          <p key={code} className="text-sm font-bold font-mono text-green-700 tracking-widest">{code}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-sm text-green-700">
                  {regSuccess?.ticket_code || regSuccess?.ticket_codes?.length
                    ? 'Your ticket is ready! Save your ticket code.'
                    : 'Your payment has been submitted for verification. Your ticket will be issued after confirmation.'}
                </p>
                {regSuccess.ticket_code && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link
                      href={`/events/${eventId}/ticket/${encodeURIComponent(regSuccess.ticket_code)}`}
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                    >
                      <Ticket className="w-4 h-4" /> View Ticket
                    </Link>
                    <a
                      href={apiClient.ticketPdfUrl(regSuccess.ticket_code)}
                      className="inline-flex items-center gap-2 bg-white border border-green-600 text-green-700 hover:bg-green-50 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  </div>
                )}
                {Array.isArray(regSuccess.ticket_codes) && regSuccess.ticket_codes.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {regSuccess.ticket_codes.map((code: string) => (
                      <div key={code} className="inline-flex items-center gap-1">
                        <Link
                          href={`/events/${eventId}/ticket/${encodeURIComponent(code)}`}
                          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-l-xl font-semibold text-sm transition-colors"
                        >
                          <Ticket className="w-4 h-4" /> View {code}
                        </Link>
                        <a
                          href={apiClient.ticketPdfUrl(code)}
                          className="inline-flex items-center bg-white border border-green-600 text-green-700 hover:bg-green-50 px-3 py-2 rounded-r-xl font-semibold text-sm transition-colors"
                          title={`Download ${code}`}
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Organizer Card */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Organizer</h3>
              <p className="text-gray-700 text-sm mb-2">{event.organizer}</p>
              {event.contactEmail && (
                <a href={`mailto:${event.contactEmail}`} className="text-green-700 hover:text-green-600 text-sm underline underline-offset-2 block mb-1">{event.contactEmail}</a>
              )}
              {event.contactPhone && (
                <a href={`tel:${event.contactPhone}`} className="text-green-700 hover:text-green-600 text-sm underline underline-offset-2 block">{event.contactPhone}</a>
              )}
            </div>

            {/* Payment Info */}
            <div className="bg-green-50 rounded-xl p-5 border border-green-100">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment Info
              </h3>
              <p className="text-sm text-green-800">
                Paid tickets and votes are completed securely with M-Pesa.
              </p>
            </div>

            {/* Event Status */}
            {event.event_status && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">Event Status</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  event.event_status === 'voting_open' ? 'bg-red-100 text-red-700' :
                  event.event_status === 'active' ? 'bg-green-100 text-green-700' :
                  event.event_status === 'draft' ? 'bg-gray-100 text-gray-600' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {event.event_status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default EventDetailPage
