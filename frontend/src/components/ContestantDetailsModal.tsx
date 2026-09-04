'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, Star, Target, Vote, Trophy, Share2, Check } from 'lucide-react'
import { useState } from 'react'

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
  event_slug?: string
  event_title?: string
  contestant_category_name?: string | null
}

interface ContestantDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  contestant: Contestant | null
  onVote: (contestant: Contestant) => void
  isVotingActive: boolean
  resultVisibility?: string
}

const ContestantDetailsModal = ({ isOpen, onClose, contestant, onVote, isVotingActive, resultVisibility = 'full_live' }: ContestantDetailsModalProps) => {
  const [copied, setCopied] = useState(false)

  if (!contestant) return null
  const visibleVoteCount = resultVisibility === 'full_live' ? contestant.vote_count : null

  const handleShare = async () => {
    const url = contestant.event_slug 
      ? `${window.location.origin}/voting/${contestant.event_slug}/${contestant.slug}`
      : `${window.location.origin}/voting`
    if (navigator.share) {
      try {
        const category = contestant.contestant_category_name || 'Contestant'
        const eventTitle = contestant.event_title || 'Miss Culture Global Kenya'
        const intro = contestant.bio || contestant.mission_statement || `Meet ${contestant.name} in ${eventTitle}.`
        await navigator.share({
          title: `${contestant.name} | ${category} | ${eventTitle}`,
          text: `${contestant.name} | ${category}\n${eventTitle}\n\n${intro}\n\nSupport ${contestant.name} by voting now:`,
          url,
        })
      } catch {}
    } else {
      const category = contestant.contestant_category_name || 'Contestant'
      const eventTitle = contestant.event_title || 'Miss Culture Global Kenya'
      const intro = contestant.bio || contestant.mission_statement || `Meet ${contestant.name} in ${eventTitle}.`
      await navigator.clipboard.writeText(`${contestant.name} | ${category}\n${eventTitle}\n\n${intro}\n\nSupport ${contestant.name} by voting now:\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Photo Section */}
            <div className="md:w-2/5 relative bg-gray-100 min-h-[300px]">
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
              <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                #{contestant.contestant_number}
              </div>
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share contestant profile"
                className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-sm font-semibold text-gray-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-white hover:text-green-700"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Share'}
              </button>
            </div>

            {/* Content Section */}
            <div className="md:w-3/5 p-6 md:p-8 overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-1">{contestant.name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  {visibleVoteCount !== null && visibleVoteCount !== undefined && (
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-semibold">
                      <Trophy className="w-4 h-4" />
                      {visibleVoteCount.toLocaleString()} votes
                    </div>
                  )}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-green-600 transition-colors text-sm font-medium"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                    {copied ? 'Copied Link' : 'Share Profile'}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {contestant.bio && (
                  <div>
                    <h3 className="text-sm uppercase tracking-wider font-bold text-gray-400 mb-2">About Me</h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">{contestant.bio}</p>
                  </div>
                )}

                {(contestant.beliefs || contestant.mission_statement || contestant.achievements) && (
                  <div>
                    <h3 className="text-sm uppercase tracking-wider font-bold text-green-700 mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Why Vote For Me
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {contestant.beliefs && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <Shield className="w-3.5 h-3.5 text-green-600" />
                            Beliefs
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{contestant.beliefs}</p>
                        </div>
                      )}
                      {contestant.mission_statement && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider">
                            <Target className="w-3.5 h-3.5 text-green-600" />
                            Mission
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed">{contestant.mission_statement}</p>
                        </div>
                      )}
                    </div>
                    {contestant.achievements && (
                      <div className="bg-green-50/50 rounded-xl p-4 border border-green-100 mt-4">
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider">
                          <Star className="w-3.5 h-3.5 text-green-600" />
                          Achievements
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{contestant.achievements}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={() => onVote(contestant)}
                  disabled={!isVotingActive}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                >
                  <Vote className="w-5 h-5" />
                  {isVotingActive ? 'Vote Now' : 'Voting Closed'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ContestantDetailsModal
