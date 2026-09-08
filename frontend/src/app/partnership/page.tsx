'use client'

import { motion } from 'framer-motion'
import { Eye, Heart, Globe, Camera, ChevronRight, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import ContactModal from '@/components/ContactModal'
import apiClient from '@/lib/api'
import { usePartnershipPageSettings } from '@/lib/usePageSettings'

const valuePropositions = [
  {
    title: 'Targeted Brand Visibility',
    description: 'Align your brand with values of integrity, diversity, and national pride — reaching a massive demographic of young achievers and cultural enthusiasts.',
    icon: Eye,
    impact: 'Brand Alignment'
  },
  {
    title: 'Corporate Social Responsibility',
    description: 'Direct involvement in our community-led initiatives — from education and environmental conservation to women\u2019s economic empowerment.',
    icon: Heart,
    impact: 'Community-Led Impact'
  },
  {
    title: 'Cross-Border Networking',
    description: 'Access to the Miss Culture Global international network — facilitating connections with global brands, embassies, and cultural institutions.',
    icon: Globe,
    impact: 'International Network'
  },
  {
    title: 'Content & Storytelling',
    description: "High-quality collaborative content that showcases your brand\u2019s commitment to Kenyan heritage and future-ready leadership.",
    icon: Camera,
    impact: 'Collaborative Storytelling'
  }
]

const PartnershipPage = () => {
  const [sponsors, setSponsors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const { settings } = usePartnershipPageSettings()

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true)
        const response = await apiClient.getPartners()
        const partnersData = Array.isArray(response) ? response : (response.results || [])
        setSponsors(partnersData.map((partner: any) => ({
          name: partner.name,
          logo: partner.logo_url || partner.logo || '',
          partner_type: partner.partner_type || 'partner',
          display_order: partner.display_order ?? 0,
          description: partner.description || `Supporting ${partner.partner_type || 'our mission'}`,
          since: partner.since || 'Partner',
          website_url: partner.website_url || ''
        })))
      } catch (err) {
        console.error('Error fetching partners:', err)
        setSponsors([])
      } finally {
        setLoading(false)
      }
    }
    fetchPartners()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative h-[55vh] min-h-[450px] flex items-center justify-center overflow-hidden">
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
              style={settings.hero_image_url ? { backgroundImage: `url(${settings.hero_image_url})` } : undefined}
            />
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-green-600/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight drop-shadow-2xl tracking-tight">
              {settings.page_title || 'Partnership'}
            </h1>
            <div className="w-24 h-1 bg-red-600 mx-auto mb-8 rounded-full" />
            <p className="text-lg sm:text-xl md:text-2xl text-gray-100 max-w-3xl mx-auto px-4 drop-shadow-lg font-light leading-relaxed">
              {settings.page_subtitle || 'Partner with us to make a difference'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Partner — Value Propositions */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 decorative-pattern opacity-[0.03]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Partner With <span className="text-red-600">Us</span></h2>
              <div className="w-20 h-1 bg-green-500 mx-auto rounded-full" />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {valuePropositions.map((area, index) => (
                <motion.div
                  key={area.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 text-center group border border-gray-100 hover:border-green-100 transform hover:-translate-y-2"
                >
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-100 transition-colors duration-300">
                    <area.icon className="w-10 h-10 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-700 transition-colors duration-300">{area.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">{area.description}</p>
                  <div className="inline-block bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
                    {area.impact}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Current Sponsors */}
      <section className="py-20 bg-green-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Our Valued <span className="text-red-600">Partners & Sponsors</span>
              </h2>
              <p className="text-xl text-green-100 max-w-3xl mx-auto font-light leading-relaxed">
                These brands have already chosen to align with heritage, purpose, and global reach. Join them.
              </p>
            </div>

            <div className="space-y-14">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <p className="mt-4 text-green-100">Loading partners...</p>
                </div>
              ) : sponsors.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <p className="text-green-100 text-lg font-light">Our partner announcements are coming soon.</p>
                  <p className="text-green-200/60 text-sm mt-2">Be the first to partner with us!</p>
                </div>
              ) : (
                (['partner', 'sponsor'] as const).map((partnerType) => {
                  const group = sponsors.filter((sponsor) => partnerType === 'partner' ? sponsor.partner_type !== 'sponsor' : sponsor.partner_type === 'sponsor')
                  if (group.length === 0) return null

                  const groupTitle = partnerType === 'partner' ? 'Our Partners' : 'Our Sponsors'
                  return (
                    <div key={partnerType}>
                      <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">{groupTitle}</h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {group.map((sponsor, index) => {
                  const cardInner = (
                    <>
                      <div className="mb-4 h-28 flex items-center justify-center bg-white rounded-xl p-1 group-hover:scale-105 transition-transform duration-300 shadow-lg">
                        {sponsor.logo ? (
                          <img src={sponsor.logo} alt={sponsor.name} className="max-h-full max-w-full w-auto object-contain" />
                        ) : (
                          <span className="text-gray-500 font-semibold text-sm text-center">{sponsor.name}</span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-white mb-1 flex items-center justify-center gap-1.5">
                        {sponsor.name}
                        {sponsor.website_url && (
                          <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                        )}
                      </h4>
                      <p className="text-xs text-green-100 opacity-60 group-hover:opacity-100 transition-opacity duration-300">{sponsor.since || sponsor.description}</p>
                    </>
                  )

                  const cardClasses = `rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-6 hover:bg-white/20 transition-all duration-300 group text-center ${sponsor.website_url ? 'cursor-pointer block' : ''}`

                  return (
                    <motion.div
                      key={sponsor.name}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      title={sponsor.website_url ? `Visit ${sponsor.name}` : (sponsor.since || sponsor.description)}
                    >
                      {sponsor.website_url ? (
                        <a
                          href={sponsor.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cardClasses}
                          aria-label={`Visit ${sponsor.name} website (opens in new tab)`}
                        >
                          {cardInner}
                        </a>
                      ) : (
                        <div className={cardClasses}>
                          {cardInner}
                        </div>
                      )}
                    </motion.div>
                  )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="mt-16 text-center">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="inline-flex items-center gap-2 bg-red-600 text-white px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Become a Partner <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        type="partnership"
      />
    </div>
  )
}

export default PartnershipPage
