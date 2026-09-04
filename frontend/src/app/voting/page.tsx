'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Trophy, Search, Vote, Phone, ChevronRight, ChevronDown, AlertCircle, Loader2, Check, X, Crown, Medal, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/api'
import type { ApiError } from '@/lib/api'
import VotePaymentModal from '@/components/VotePaymentModal'
import ContestantDetailsModal from '@/components/ContestantDetailsModal'
import { useVotingPageSettings } from '@/lib/usePageSettings'
import { formatEventTime } from '@/lib/eventDate'

interface Contestant {
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
  event_title?: string
  event_slug?: string
}

interface VotingEvent {
  id: number
  title: string
  slug: string
  start_date: string
  venue_name: string
  featured_image_url: string | null
  voting_enabled: boolean
  vote_price: number
  is_voting_active: boolean
  result_visibility: string
  contestant_count: number
  account_name: string
  payment_method: string
  till_number: string
}

interface VoteRecord {
  event_title: string
  contestant_name: string
  vote_count: number
  amount: string
  mpesa_code: string
  status: string
  created_at: string
}

interface LiveResult {
  contestant_id: number
  contestant_name: string
  contestant_number: number
  slug: string
  photo_url: string | null
  vote_count: number | null
  rank: number | null
}

const VotingPage = () => {
  const router = useRouter()
  const [events, setEvents] = useState<VotingEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<VotingEvent | null>(null)
  const [contestants, setContestants] = useState<Contestant[]>([])
  const [loading, setLoading] = useState(true)
  const [contestantsLoading, setContestantsLoading] = useState(false)
  const [error, setError] = useState('')
  const [requestedEventSlug, setRequestedEventSlug] = useState('')

  // Leaderboard (respects the event's result_visibility)
  const [leaderboard, setLeaderboard] = useState<LiveResult[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  // Vote modal state
  const [voteModalOpen, setVoteModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(null)

  // Verify votes state
  const [verifyPhone, setVerifyPhone] = useState('')
  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([])
  const [voteSummary, setVoteSummary] = useState({ totalVotes: 0, totalTransactions: 0 })
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [showVerify, setShowVerify] = useState(false)
  const { settings: pageSettings } = useVotingPageSettings()

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('event')
    setRequestedEventSlug(slug || '')
  }, [])

  // Fetch voting events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await apiClient.getVotingEvents()
        const results: VotingEvent[] = Array.isArray(data) ? data : (data?.results || [])
        setEvents(results)
        if (results.length > 0) {
          setSelectedEvent(results.find((event) => event.slug === requestedEventSlug) || results[0])
        }
      } catch (err) {
        const apiErr = err as ApiError
        setError(apiErr.message || 'Failed to load voting events')
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [requestedEventSlug])

  // Fetch contestants when event changes
  useEffect(() => {
    if (!selectedEvent) return
    const fetchContestants = async () => {
      setContestantsLoading(true)
      try {
        const data = await apiClient.getEventContestants(selectedEvent.id)
        const results = Array.isArray(data) ? data : (data?.results || [])
        setContestants(results)
      } catch (err) {
        const apiErr = err as ApiError
        setError(apiErr.message || 'Failed to load contestants')
      } finally {
        setContestantsLoading(false)
      }
    }
    fetchContestants()
  }, [selectedEvent])

  // Fetch the leaderboard for the selected event (only when totals or rankings are public)
  const fetchLeaderboard = useCallback(async (evt: VotingEvent) => {
    const vis = evt?.result_visibility
    if (!evt?.voting_enabled || (vis !== 'full_live' && vis !== 'rankings_only')) {
      setLeaderboard([])
      return
    }
    setLeaderboardLoading(true)
    try {
      const data = await apiClient.getLiveResults(evt.id)
      setLeaderboard(Array.isArray(data?.results) ? data.results : [])
    } catch {
      setLeaderboard([])
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedEvent) return
    fetchLeaderboard(selectedEvent)
    // Auto-refresh live totals while voting is open
    if (selectedEvent.result_visibility === 'full_live' && selectedEvent.is_voting_active) {
      const interval = setInterval(() => fetchLeaderboard(selectedEvent), 20000)
      return () => clearInterval(interval)
    }
  }, [selectedEvent, fetchLeaderboard])

  const handleVoteClick = useCallback((contestant: Contestant) => {
    if (!selectedEvent) return
    setSelectedContestant(contestant)
    setDetailsModalOpen(false) // Close details if open
    setVoteModalOpen(true)
  }, [selectedEvent])

  const handleDetailsClick = useCallback((contestant: Contestant) => {
    if (!selectedEvent?.slug || !contestant.slug) return
    router.push(`/voting/${selectedEvent.slug}/${contestant.slug}`)
  }, [router, selectedEvent])

  const handleVerifyVotes = async () => {
    if (!verifyPhone || verifyPhone.length < 9) {
      setVerifyError('Please enter a valid phone number')
      return
    }
    setVerifyLoading(true)
    setVerifyError('')
    try {
      const data = await apiClient.verifyVotesByPhone(verifyPhone)
      setVoteRecords(data?.votes || [])
      setVoteSummary({
        totalVotes: Number(data?.total_votes || 0),
        totalTransactions: Number(data?.total_transactions || 0),
      })
    } catch (err) {
      const apiErr = err as ApiError
      setVerifyError(apiErr.message || 'Failed to verify votes')
      setVoteSummary({ totalVotes: 0, totalTransactions: 0 })
    } finally {
      setVerifyLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return formatEventTime(dateStr)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading voting events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-green-900">
        {pageSettings.hero_image_url && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${pageSettings.hero_image_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-sm uppercase tracking-[0.3em] text-green-300 mb-3 font-semibold">Your Voice Shapes the Stage</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 tracking-tight">
              {pageSettings.page_title || 'Vote'}
            </h1>
            <div className="w-20 h-1 bg-red-500 mx-auto mb-6 rounded-full" />
            <p className="text-lg text-gray-200 max-w-2xl mx-auto font-light">
              {pageSettings.page_subtitle || "Cast your vote for contestants competing to represent Kenya's cultural future."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* No Events Message */}
      {events.length === 0 && !loading && (
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Voting Coming Soon</h2>
            <p className="text-lg text-gray-600 mb-8">
              Voting events and participants will be available here once they are set up by the admin team.
              Stay tuned — your voice will shape who represents Kenya&apos;s cultural future.
            </p>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold text-sm transition-colors"
            >
              <Calendar className="w-4 h-4" />
              View Upcoming Events
            </Link>
          </div>
        </section>
      )}

      {/* Events with Voting */}
      {events.length > 0 && (
        <>
          {/* Event Selector */}
          <section className="py-8 bg-white border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {events.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      selectedEvent?.id === evt.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {evt.title}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Selected Event Info */}
          {selectedEvent && (
            <section className="py-8 bg-white">
              <div className="max-w-7xl mx-auto px-4">
                <div className="bg-gradient-to-r from-green-50 to-white rounded-2xl border border-green-100 p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedEvent.title}</h2>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(selectedEvent.start_date)}
                        </span>
                        <span>{selectedEvent.venue_name}</span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {selectedEvent.contestant_count} Contestants
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">KES {selectedEvent.vote_price}</p>
                        <p className="text-xs text-gray-500">per vote</p>
                      </div>
                      {selectedEvent.is_voting_active ? (
                        <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Voting Open
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-sm font-semibold">
                          Voting Closed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Live Leaderboard — respects result_visibility (full_live shows totals, rankings_only hides them) */}
          {selectedEvent && leaderboard.length > 0 && (
            <section className="pt-10">
              <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight">
                          {selectedEvent.result_visibility === 'full_live' ? 'Live Leaderboard' : 'Current Standings'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {selectedEvent.result_visibility === 'full_live'
                            ? 'Vote totals update automatically'
                            : 'Rankings shown — vote totals are hidden'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => fetchLeaderboard(selectedEvent)}
                      disabled={leaderboardLoading}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${leaderboardLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {leaderboard.map((r) => {
                      const rank = r.rank ?? 0
                      const medal =
                        rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        rank === 2 ? 'bg-gray-200 text-gray-600' :
                        rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      return (
                        <div key={r.contestant_id} className="flex items-center gap-3 px-5 sm:px-6 py-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${medal}`}>
                            {rank === 1 ? <Crown className="w-4 h-4" /> : rank <= 3 && rank > 0 ? <Medal className="w-4 h-4" /> : rank || '—'}
                          </div>
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                            {r.photo_url ? (
                              <img src={r.photo_url} alt={r.contestant_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-green-400">
                                #{r.contestant_number}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 truncate">{r.contestant_name}</p>
                            <p className="text-xs text-gray-400">Contestant #{r.contestant_number}</p>
                          </div>
                          {selectedEvent.result_visibility === 'full_live' && r.vote_count !== null && (
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-green-700">{r.vote_count.toLocaleString()}</p>
                              <p className="text-xs text-gray-400">votes</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Contestants Grid */}
          <section className="py-12">
            <div className="max-w-7xl mx-auto px-4">
              {contestantsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                </div>
              ) : contestants.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-500">No contestants found for this event.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {contestants.map((contestant, index) => (
                    <motion.div
                      key={contestant.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden group"
                    >
                      {/* Photo */}
                      <div 
                        className="relative aspect-[3/4] overflow-hidden bg-gray-100 cursor-pointer"
                        onClick={() => handleDetailsClick(contestant)}
                      >
                        {contestant.photo_url ? (
                          <img
                            src={contestant.photo_url}
                            alt={contestant.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                            <span className="text-4xl font-bold text-green-300">#{contestant.contestant_number}</span>
                          </div>
                        )}
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white/90 text-gray-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg">View Profile</span>
                        </div>
                        {/* Number Badge */}
                        <div className="absolute top-3 left-3 bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                          {contestant.contestant_number}
                        </div>
                        {/* Vote count if visible */}
                        {selectedEvent?.result_visibility === 'full_live' && contestant.vote_count !== null && contestant.vote_count !== undefined && (
                          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold">
                            {contestant.vote_count.toLocaleString()} votes
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 mb-1">{contestant.name}</h3>
                        {contestant.bio && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{contestant.bio}</p>
                        )}
                        <div className="flex gap-2">
                          {selectedEvent?.is_voting_active && (
                            <button
                              onClick={() => handleVoteClick(contestant)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Vote className="w-3.5 h-3.5" />
                              Vote
                            </button>
                          )}
                          <button
                            onClick={() => handleDetailsClick(contestant)}
                            className="px-3 py-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors text-xs font-semibold whitespace-nowrap"
                          >
                            Why Vote For Me
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Vote Verification */}
          <section className="py-16 bg-white">
            <div className="max-w-2xl mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Votes</h2>
                <p className="text-gray-600">Enter your phone number to check your vote history</p>
              </div>

              <button
                onClick={() => setShowVerify(!showVerify)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <span className="flex items-center gap-2 text-gray-700 font-medium">
                  <Phone className="w-4 h-4" />
                  Check Vote Status
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showVerify ? 'rotate-180' : ''}`} />
              </button>

              {showVerify && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex flex-1 min-w-0">
                      <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-sm text-gray-600 font-medium">
                        +254
                      </span>
                      <input
                        type="tel"
                        value={verifyPhone}
                        onChange={(e) => { setVerifyPhone(e.target.value.replace(/\D/g, '')); setVerifyError('') }}
                        placeholder="712345678"
                        maxLength={9}
                        className="flex-1 min-w-0 px-3 py-3 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <button
                      onClick={handleVerifyVotes}
                      disabled={verifyLoading}
                      className="flex-shrink-0 justify-center bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-5 py-3 sm:py-0 rounded-xl font-semibold text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Search
                    </button>
                  </div>

                  {verifyError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{verifyError}</p>
                    </div>
                  )}

                  {voteRecords.length > 0 && (
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                        <p className="text-sm font-semibold text-green-900">
                          {voteSummary.totalVotes.toLocaleString()} total vote(s) bought
                        </p>
                        <p className="text-xs text-green-700 mt-0.5">
                          Across {voteSummary.totalTransactions.toLocaleString()} successful vote transaction(s)
                        </p>
                      </div>
                      {voteRecords.map((record, i) => (
                        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">{record.contestant_name}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              record.status === 'successful' ? 'bg-green-100 text-green-700' :
                              record.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              record.status === 'reversed' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-gray-500">
                            <span className="truncate">Event: {record.event_title}</span>
                            <span>Votes: {record.vote_count}</span>
                            <span>Amount: KES {parseFloat(record.amount).toLocaleString()}</span>
                            <span className="truncate">Code: {record.mpesa_code}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {voteRecords.length === 0 && verifyPhone && !verifyLoading && !verifyError && (
                    <p className="text-sm text-gray-500 text-center py-4">No vote records found for this phone number.</p>
                  )}
                </motion.div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Error State */}
      {error && (
        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800">Error loading voting data</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Vote Payment Modal */}
      {selectedEvent && selectedContestant && (
        <VotePaymentModal
          isOpen={voteModalOpen}
          onClose={() => setVoteModalOpen(false)}
          event={{
            id: selectedEvent.id,
            title: selectedEvent.title,
            vote_price: selectedEvent.vote_price,
          }}
          contestant={{
            id: selectedContestant.id,
            name: selectedContestant.name,
            contestant_number: selectedContestant.contestant_number,
            photo_url: selectedContestant.photo_url,
          }}
        />
      )}

      {/* Contestant Details Modal */}
      <ContestantDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        contestant={selectedContestant}
        onVote={handleVoteClick}
        isVotingActive={selectedEvent?.is_voting_active || false}
        resultVisibility={selectedEvent?.result_visibility}
      />
    </div>
  )
}

export default VotingPage
