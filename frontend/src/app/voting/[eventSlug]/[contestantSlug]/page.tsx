'use client'

import { useState, useEffect, use } from 'react'
import { motion } from 'framer-motion'
import { Vote, Trophy, ArrowLeft, Share2, Loader2, AlertCircle, Check, Copy, Shield, Star, Target } from 'lucide-react'
import Link from 'next/link'
import apiClient from '@/lib/api'
import type { ApiError } from '@/lib/api'
import VotePaymentModal from '@/components/VotePaymentModal'

interface ContestantData {
  id: number
  name: string
  bio: string
  beliefs?: string
  achievements?: string
  mission_statement?: string
  photo_url: string | null
  contestant_number: number
  slug: string
  vote_count: number | null
  event_title: string
  event_slug: string
  contestant_category_name?: string | null
}

interface EventData {
  id: number
  title: string
  vote_price: number
  account_name: string
  payment_method: string
  till_number: string
  is_voting_active: boolean
  result_visibility: string
}

export default function ContestantPage({ params }: { params: Promise<{ eventSlug: string; contestantSlug: string }> }) {
  const { eventSlug, contestantSlug } = use(params)
  const [contestant, setContestant] = useState<ContestantData | null>(null)
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [voteModalOpen, setVoteModalOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch contestants for this event, then find the matching one
        const eventsData = await apiClient.getVotingEvents()
        const eventsList = Array.isArray(eventsData) ? eventsData : (eventsData?.results || [])
        const matchedEvent = eventsList.find((e: any) => e.slug === eventSlug)

        if (matchedEvent) {
          setEvent({
            id: matchedEvent.id,
            title: matchedEvent.title,
            vote_price: matchedEvent.vote_price,
            account_name: matchedEvent.account_name || 'The Misscomm Events',
            payment_method: matchedEvent.payment_method || 'till_number',
            till_number: matchedEvent.till_number || '4766976',
            is_voting_active: matchedEvent.is_voting_active,
            result_visibility: matchedEvent.result_visibility || 'full_live',
          })

          const contestantsData = await apiClient.getEventContestants(matchedEvent.id)
          const contestantsList = Array.isArray(contestantsData) ? contestantsData : (contestantsData?.results || [])
          const matched = contestantsList.find((c: any) => c.slug === contestantSlug)

          if (matched) {
            setContestant(matched)
          } else {
            setError('Contestant not found')
          }
        } else {
          setError('Event not found')
        }
      } catch (err) {
        const apiErr = err as ApiError
        setError(apiErr.message || 'Failed to load contestant data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [eventSlug, contestantSlug])

  const handleShare = async () => {
    const url = window.location.href
    const category = contestant?.contestant_category_name || 'Contestant'
    const eventTitle = contestant?.event_title || 'Miss Culture Global Kenya'
    const intro = contestant?.bio || contestant?.mission_statement || `Meet ${contestant?.name} in ${eventTitle}.`
    const shortIntro = intro.length > 140 ? `${intro.slice(0, 137)}...` : intro
    const shareTitle = `#${contestant?.contestant_number || ''} ${contestant?.name} — ${category} | ${eventTitle}`
    const shareText = `${shortIntro}

  Support ${contestant?.name}! Cast your vote now.`
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        })
      } catch {}
    } else {
    await navigator.clipboard.writeText(`${shareText}
  ${url}`)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  if (error || !contestant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contestant Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The contestant you are looking for does not exist.'}</p>
          <Link href="/voting" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Voting
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/voting" className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Voting
          </Link>
          <button onClick={handleShare} className="flex items-center gap-1.5 text-gray-600 hover:text-green-600 transition-colors text-sm font-medium">
            {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
            {copiedLink ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>

      {/* Contestant Profile */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        >
          <div className="md:flex">
            {/* Photo */}
            <div className="md:w-2/5">
              <div className="relative aspect-[3/4] md:aspect-auto md:h-full md:min-h-[500px] overflow-hidden bg-gray-100">
                {contestant.photo_url ? (
                  <img
                    src={contestant.photo_url}
                    alt={contestant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                    <span className="text-6xl font-bold text-green-200">#{contestant.contestant_number}</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  #{contestant.contestant_number}
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share contestant profile"
                  className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-sm font-semibold text-gray-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white hover:text-green-700 md:hidden"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                  {copiedLink ? 'Copied!' : 'Share'}
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="md:w-3/5 p-6 md:p-8 flex flex-col">
              <div className="flex-1">
                <p className="text-sm text-green-600 font-semibold uppercase tracking-wider mb-1">
                  {contestant.event_title}
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {contestant.name}
                </h1>

                {contestant.bio && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                      About Me
                    </h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{contestant.bio}</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-6 mb-8">
                  {contestant.beliefs && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Shield className="w-4 h-4 text-green-600" />
                        My Beliefs
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{contestant.beliefs}</p>
                    </div>
                  )}
                  {contestant.mission_statement && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Target className="w-4 h-4 text-green-600" />
                        My Mission
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{contestant.mission_statement}</p>
                    </div>
                  )}
                </div>

                {contestant.achievements && (
                  <div className="mb-8 bg-green-50/50 rounded-xl p-5 border border-green-100">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <Star className="w-4 h-4 text-green-600" />
                      Achievements
                    </h4>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{contestant.achievements}</p>
                  </div>
                )}

                {/* Vote Count */}
                {event?.result_visibility === 'full_live' && contestant.vote_count !== null && contestant.vote_count !== undefined && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-700">{contestant.vote_count.toLocaleString()}</p>
                        <p className="text-xs text-green-600">votes received</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vote Price */}
                {event && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <p className="text-sm text-gray-500">
                      Vote price: <span className="font-bold text-gray-900">KES {event.vote_price}</span> per vote
                    </p>
                  </div>
                )}
              </div>

              {/* Vote Button */}
              {event && (
                <button
                  onClick={() => setVoteModalOpen(true)}
                  disabled={!event.is_voting_active}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Vote className="w-5 h-5" />
                  {event.is_voting_active ? 'Vote Now' : 'Voting Closed'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Vote Payment Modal */}
      {event && contestant && (
        <VotePaymentModal
          isOpen={voteModalOpen}
          onClose={() => setVoteModalOpen(false)}
          event={{
            id: event.id,
            title: event.title,
            vote_price: event.vote_price,
          }}
          contestant={{
            id: contestant.id,
            name: contestant.name,
            contestant_number: contestant.contestant_number,
            photo_url: contestant.photo_url,
          }}
        />
      )}
    </div>
  )
}
