'use client'

import { useState, useEffect } from 'react'
import Hero from '@/components/Hero'
import MissionVision from '@/components/MissionVision'
import CultureImpact from '@/components/CultureImpact'
import CoreValues from '@/components/CoreValues'
import AmbassadorSpotlight from '@/components/AmbassadorSpotlight'
import SupportBlocks from '@/components/SupportBlocks'
import SocialFeed from '@/components/SocialFeed'
import FollowCTA from '@/components/FollowCTA'
import EventDetailsModal from '@/components/EventDetailsModal'
import apiClient from '@/lib/api'

export default function Home() {
  const [showEventModal, setShowEventModal] = useState(false)
  const [upcomingEvent, setUpcomingEvent] = useState<any>(null)

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

  // Fetch upcoming event from API
  useEffect(() => {
    const fetchUpcomingEvent = async () => {
      try {
        const events = await apiClient.getUpcomingEvents()
        const eventsArray = Array.isArray(events) ? events : []
        if (eventsArray.length > 0) {
          const event = eventsArray[0]
          const ticketCategories = event.ticket_categories || []
          setUpcomingEvent({
            id: event.id,
            title: event.title || event.name,
            date: event.start_date || event.date,
            time: event.start_time || event.time || '10:00 AM',
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
            votingEnabled: event.voting_enabled || false,
            currentVotes: event.current_votes || 0
          })
        }
      } catch (err) {
        console.error('Error fetching upcoming event:', err)
      }
    }

    fetchUpcomingEvent()
  }, [])

  // Show event modal after 20 seconds on initial page load (only if event exists)
  useEffect(() => {
    if (upcomingEvent) {
      const timer = setTimeout(() => {
        setShowEventModal(true)
      }, 20000)

      return () => clearTimeout(timer)
    }
  }, [upcomingEvent])

  return (
    <div className="min-h-screen">
      <Hero />
      <MissionVision />
      <CultureImpact />
      <CoreValues />
      <AmbassadorSpotlight />
      <SupportBlocks />
      <FollowCTA />
      
      {/* Upcoming Event Modal */}
      {upcomingEvent && (
        <EventDetailsModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          event={upcomingEvent}
        />
      )}
    </div>
  )
}
