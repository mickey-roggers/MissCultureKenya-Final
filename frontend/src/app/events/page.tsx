'use client'

import { motion } from 'framer-motion'
import { Calendar, MapPin, Clock, Users, ExternalLink, ArrowRight, Camera, Heart, Sparkles, Handshake, Quote, Ticket } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ContactModal from '@/components/ContactModal'
import apiClient from '@/lib/api'
import { useEventsPageSettings } from '@/lib/usePageSettings'
import { formatEventTime } from '@/lib/eventDate'

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
}
const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

const EVENT_CATEGORIES = [
  { key: 'All', label: 'All Events', desc: 'Browse everything' },
  { key: 'Pageant', label: 'Pageant Events', desc: 'Competition nights, crowning ceremonies, cultural walks' },
  { key: 'Workshop', label: 'Cultural Workshops', desc: 'Hands-on sessions in crafts, fashion, storytelling' },
  { key: 'Conference', label: 'Conferences', desc: 'Diplomatic & cultural forums for professionals' },
  { key: 'Fashion', label: 'Fashion Shows', desc: 'Runway showcases celebrating Kenyan designers' },
  { key: 'Community', label: 'Community Events', desc: 'Grassroots gatherings, school outreaches, artisan markets' },
]

const TESTIMONIALS = [
  {
    quote: "The pageant night was electric. I have never felt prouder to be Kenyan — the energy, the culture, the community. I am bringing everyone next year.",
    name: 'Akinyi O.',
    event: 'Heritage Gala 2024',
  },
  {
    quote: "As a sponsor, the ROI exceeded our expectations. The audience engagement was phenomenal, and the cultural authenticity resonated deeply with our brand values.",
    name: 'James M.',
    event: 'Cultural Conference 2024',
  },
  {
    quote: "My daughter attended the youth workshop and came home transformed — proud of her heritage for the first time. That is worth more than any ticket price.",
    name: 'Wanjiku N.',
    event: 'Youth Empowerment Workshop',
  },
]

const EventsPage = () => {
  const router = useRouter()
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [pastEvents, setPastEvents] = useState<any[]>([])
  const [eventCategories, setEventCategories] = useState<string[]>(['All'])
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { settings: pageSettings, loading: settingsLoading } = useEventsPageSettings()

  const derivePriceLabel = (ticketCategories: any[], fallback?: any) => {
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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const upcomingData = await apiClient.getUpcomingEvents()
        setUpcomingEvents(Array.isArray(upcomingData) ? upcomingData : [])

        const pastData = await apiClient.getPastEvents()
        setPastEvents(Array.isArray(pastData) ? pastData : [])

        const categoriesData = await apiClient.getEventCategories()
        const categories = Array.isArray(categoriesData)
          ? categoriesData
          : (categoriesData.results || [])
        const categoryNames = ['All', ...categories.map((cat: any) => cat.name || cat.title)]
        setEventCategories(categoryNames)
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to load events.')
        setUpcomingEvents([])
        setPastEvents([])
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const transformEvent = (event: any) => {
    const ticketCategories = event.ticket_categories || []
    return {
      id: event.id,
      title: event.title || event.name,
      date: event.start_date || event.date,
      time: event.start_time || event.time || formatEventTime(event.start_date) || 'Time not set',
      venue: event.venue_name || event.venue,
      location: `${event.city || ''}, ${event.country || 'Kenya'}`.trim().replace(/^,\s*/, ''),
      description: event.description,
      image: event.featured_image_url || event.featured_image || event.image || '',
      category: event.event_type || event.category || 'Event',
      capacity: event.capacity || 0,
      price: derivePriceLabel(ticketCategories, event.price),
      organizer: event.organizer || 'Miss Culture Global Kenya',
      contactEmail: event.contact_email || 'info@misscultureglobalkenya.com',
      contactPhone: event.contact_phone || '+254 721 706983',
      ticketCategories,
      audience: event.audience || 'General Public',
      status: event.event_status || event.status || 'active',
      votingEnabled: event.voting_enabled || false,
      currentVotes: event.current_votes || 0,
    }
  }

  const displayUpcomingEvents = upcomingEvents.map(transformEvent)

  const displayPastEvents = pastEvents.map(transformEvent)

  const filteredEvents = activeCategory === 'All'
    ? displayUpcomingEvents
    : displayUpcomingEvents.filter((e: any) => e.category === activeCategory)

  const handleEventClick = (event: any) => {
    router.push(`/events/${event.id}`)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return {
      day: d.toLocaleDateString('en-US', { day: '2-digit' }),
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      full: d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ===================== 1. HERO ===================== */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
            className="w-full h-full"
          >
            <div className="absolute inset-0 bg-black/60 z-10" />
            <div
              className="w-full h-full bg-cover bg-center"
              style={pageSettings.hero_image_url ? { backgroundImage: `url(${pageSettings.hero_image_url})` } : undefined}
            />
          </motion.div>
        </div>

        <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight drop-shadow-2xl tracking-tight">
              {pageSettings.page_title || 'Events'}
            </h1>
            <p className="text-lg sm:text-xl text-gray-200 max-w-3xl mx-auto px-4 drop-shadow-lg font-light leading-relaxed">
              {pageSettings.page_subtitle || 'Upcoming events and past highlights'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===================== 2. EVENT CATEGORIES ===================== */}
      <div className="py-14 sm:py-16 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-green-700 font-semibold tracking-wider uppercase text-sm mb-3">
              <Calendar className="w-4 h-4" /> What Kind of Event Are You Looking For?
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Event Categories</h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
            {EVENT_CATEGORIES.filter(c => c.key !== 'All').map((cat, idx) => (
              <motion.button
                key={cat.key}
                {...stagger}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                onClick={() => setActiveCategory(cat.key)}
                className={`p-4 rounded-xl text-center transition-all duration-300 border ${
                  activeCategory === cat.key
                    ? 'bg-green-900 text-white border-green-900 shadow-lg'
                    : 'bg-white text-gray-700 border-gray-100 hover:border-green-200 hover:shadow-md'
                }`}
              >
                <div className={`font-bold text-sm mb-1 ${activeCategory === cat.key ? 'text-yellow-400' : 'text-gray-900'}`}>
                  {cat.label}
                </div>
                <div className={`text-xs leading-snug ${activeCategory === cat.key ? 'text-green-100' : 'text-gray-500'}`}>
                  {cat.desc}
                </div>
              </motion.button>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {eventCategories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2.5 rounded-full font-semibold transition-all duration-300 text-sm ${
                  activeCategory === category
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===================== 3. UPCOMING EVENTS ===================== */}
      <div className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-green-600" />
              Upcoming <span className="text-green-600">Events</span>
            </h2>
            <p className="text-gray-600 mt-2">Secure your spot — these events fill up fast.</p>
          </motion.div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
              <p className="mt-4 text-gray-600">Loading events...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No upcoming events in this category. Check back soon or browse all events.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredEvents.map((event: any, index: number) => {
                const dateInfo = formatDate(event.date)
                const seatsLeft = event.ticketCategories
                  ? event.ticketCategories.reduce((sum: number, t: any) => sum + (t.available || 0), 0)
                  : event.capacity
                const isLowSeats = seatsLeft < 50

                return (
                  <motion.div
                    key={event.id}
                    {...stagger}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="bg-white rounded-2xl transition-all duration-300 overflow-hidden group cursor-pointer border border-gray-100 flex flex-col lg:flex-row"
                    onClick={() => handleEventClick(event)}
                  >
                    {/* Event Image with date overlay */}
                    <div className="lg:w-48 flex-shrink-0 relative h-48 lg:h-auto overflow-hidden">
                      {event.image ? (
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-green-900 flex items-center justify-center">
                          <Calendar className="w-10 h-10 text-green-400/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent lg:bg-gradient-to-r lg:from-black/50 lg:via-transparent lg:to-transparent" />
                      {/* Date badge overlay */}
                      <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm">
                        <p className="text-lg font-bold text-gray-900 leading-none">{dateInfo.day}</p>
                        <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider">{dateInfo.month}</p>
                      </div>
                      {/* Price tag */}
                      <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                        {event.price}
                      </div>
                    </div>

                    <div className="flex-1 p-4 sm:p-5 lg:p-6 flex flex-col">
                      {/* Category + Audience tags */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">
                          {event.category}
                        </span>
                        {event.audience && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                            {event.audience}
                          </span>
                        )}
                        {event.status && (
                          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide">
                            {event.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-3 line-clamp-2 flex-grow">
                        {event.description}
                      </p>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}</span>
                        <span className="flex min-w-0 items-start gap-1 whitespace-normal break-words"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /><span>{event.venue}</span></span>
                      </div>

                      {/* Seats + CTA */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        {isLowSeats && (
                          <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> {seatsLeft} left
                          </span>
                        )}
                        {!isLowSeats && <span />}
                        <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-sm group-hover:gap-2 transition-all">
                          Get Tickets <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===================== 4. URGENCY & SOCIAL PROOF ===================== */}
      <div className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Social Proof / Testimonials — DISABLED
          <motion.div {...fadeInUp} className="text-center mb-10">
            <span className="inline-flex items-center gap-2 text-green-700 font-semibold tracking-wider uppercase text-sm mb-3">
              <Quote className="w-4 h-4" /> What Past Attendees Say
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">What Past Attendees Say</h3>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-14">
            {TESTIMONIALS.map((t, idx) => (
              <motion.div
                key={t.name}
                {...stagger}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-100"
              >
                <Quote className="w-6 h-6 text-green-300 mb-4" />
                <p className="text-gray-700 leading-relaxed mb-4 text-sm italic">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
          */}

          {/* Past Events — DISABLED
          {displayPastEvents.length > 0 ? (
            <>
              <motion.div {...fadeInUp} className="text-center mb-10">
                <span className="inline-flex items-center gap-2 text-gray-500 font-semibold tracking-wider uppercase text-sm mb-3">
                  <Camera className="w-4 h-4" /> Missed It? See What Happened
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">Past Events</h3>
                <p className="text-gray-600 mt-2">Every past event lives in the gallery — photos, videos, and highlights from the stage to the sidelines.</p>
              </motion.div>

              <div className="grid md:grid-cols-2 gap-6">
                {displayPastEvents.map((event: any, index: number) => (
                  <motion.div
                    key={event.id}
                    {...stagger}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="bg-white rounded-2xl overflow-hidden group border border-gray-100 flex flex-col sm:flex-row transition-shadow"
                  >
                    <div className="sm:w-2/5 h-40 sm:h-auto overflow-hidden relative">
                      {event.image ? (
                        <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">
                          {event.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 sm:w-3/5 flex flex-col justify-center">
                      <h4 className="font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">{event.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(event.date).toLocaleDateString('en-US')}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue}</span>
                      </div>
                      <Link href="/gallery" className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 font-semibold text-sm group/btn">
                        View Photos <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Camera className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No past events yet. Check back after our upcoming events.</p>
            </div>
          )}
          */}

        </div>
      </div>

      {/* ===================== 5. BRIDGE CTAs ===================== */}
      <div className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full border border-red-200 bg-red-50 text-red-600 text-xs sm:text-sm font-bold tracking-widest uppercase mb-6">
              Where Do I Go Next
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Take the Next Step</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <Link href="/partnership">
              <motion.div
                {...stagger}
                transition={{ duration: 0.5, delay: 0 }}
                className="group bg-green-900 rounded-2xl p-8 sm:p-10 text-white relative overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer h-full"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6 border border-white/20 group-hover:bg-white/20 transition-colors">
                    <Handshake className="w-7 h-7 text-yellow-400" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-3">Partner or Sponsor</h3>
                  <p className="text-green-100 leading-relaxed mb-6">
                    Put your brand in front of a live cultural audience. Event sponsorship packages available for every budget.
                  </p>
                  <span className="inline-flex items-center gap-2 text-yellow-400 font-semibold group-hover:gap-3 transition-all">
                    View partnership tiers <ArrowRight className="w-5 h-5" />
                  </span>
                </div>
              </motion.div>
            </Link>

            <Link href="/gallery">
              <motion.div
                {...stagger}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="group bg-red-600 rounded-2xl p-8 sm:p-10 text-white relative overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer h-full"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6 border border-white/20 group-hover:bg-white/20 transition-colors">
                    <Camera className="w-7 h-7 text-yellow-300" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-3">See the Gallery</h3>
                  <p className="text-red-100 leading-relaxed mb-6">
                    Every past event lives in the gallery — photos, videos, and highlights from the stage to the sidelines.
                  </p>
                  <span className="inline-flex items-center gap-2 text-yellow-300 font-semibold group-hover:gap-3 transition-all">
                    Browse gallery <ArrowRight className="w-5 h-5" />
                  </span>
                </div>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        type="event"
      />
    </div>
  )
}

export default EventsPage
