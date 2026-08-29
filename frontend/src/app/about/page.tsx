'use client'

import { motion } from 'framer-motion'
import { Zap, Shield, Heart, Sparkles, Award, BookOpen, ExternalLink, Handshake, GraduationCap, ChevronRight, Users, Lightbulb, Landmark, Target, Globe, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAboutPageSettings } from '@/lib/usePageSettings'
import apiClient from '@/lib/api'

type AboutTeamMember = {
  name: string
  title: string
  role: string
  bio: string
  image: string
  team_type: string
}

const mergeTeamMembers = (primary: AboutTeamMember[], secondary: AboutTeamMember[]) => {
  const seen = new Set<string>()

  return [...primary, ...secondary].filter((member) => {
    const name = member.name.trim()
    if (!name) return false

    const key = name.toLowerCase()
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

const shouldClampBio = (bio: string) => bio.trim().length > 180

const AboutPage = () => {
  const { settings, loading } = useAboutPageSettings()

  const historyMilestones = [
    { year: '2025', title: 'Foundation', description: 'Miss Culture Global Kenya was founded to celebrate, preserve, and promote Kenyan culture on the global stage.' },
    { year: '2025', title: 'First International Representation', description: 'Our first representative carried the Kenyan flag onto the international Miss Culture Global stage.' },
    { year: '2025', title: 'Community Outreach Programs', description: 'To promote, Preserve and Celebrate our Kenyan cultures.' },
    { year: '2025', title: 'Digital Transformation', description: 'Expanding our reach through digital platforms to share Kenyan culture with global audiences.' },
    { year: '2025', title: 'Youth Empowerment', description: 'Equipping young Kenyans with leadership, confidence, and cultural ambassadorship skills.' },
    { year: '2025', title: 'Global Recognition', description: 'Gaining international recognition for our contribution to cultural preservation and promotion.' }
  ]

  const values = [
    { title: '1. Empowerment', description: 'We are committed to equipping young women and youth with the confidence, skills, and opportunities needed to lead and succeed.', icon: Zap },
    { title: '2. Leadership & Integrity', description: 'We nurture ethical, responsible, and visionary leaders who positively influence society.', icon: Shield },
    { title: '3. Cultural Pride & Diversity', description: 'We celebrate and promote Kenya\'s rich cultural heritage while embracing diversity and inclusion.', icon: Heart },
    { title: '4. Professionalism & Etiquette', description: 'We uphold high standards of conduct, grooming, communication, and personal branding.', icon: Sparkles },
    { title: '5. Excellence', description: 'We strive for quality, innovation, and continuous improvement in all our programs and partnerships.', icon: Award }
  ]

  const objectives = [
    { title: '1. Cultural Preservation & Innovation', description: 'To document and promote diverse Kenyan traditions while integrating them into the modern creative economy — fashion, arts, and digital media.', icon: Lightbulb },
    { title: '2. Global Ambassadorship', description: 'To equip titleholders with the diplomacy and communication skills necessary to represent Kenya on international stages and attract foreign investment.', icon: Globe },
    { title: '3. Youth & Female Leadership', description: 'To provide a rigorous mentorship ecosystem focused on entrepreneurship, public speaking, and community project management.', icon: GraduationCap },
    { title: '4. Sustainable Tourism Advocacy', description: 'To partner with stakeholders in the travel industry to highlight Kenya\'s "Hidden Gems" — promoting eco-tourism and community-based travel.', icon: Landmark }
  ]

  const [leadershipTeam, setLeadershipTeam] = useState<AboutTeamMember[]>([])
  const [committeeTeam, setCommitteeTeam] = useState<AboutTeamMember[]>([])
  const [teamLoading, setTeamLoading] = useState(true)
  const [expandedLeadershipBios, setExpandedLeadershipBios] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setTeamLoading(true)
        const response = await apiClient.getTeamMembers()
        const data = Array.isArray(response) ? response : (response.results || [])
        const normalized = data.map((m: any) => ({
          name: m.name,
          title: m.title || '',
          role: m.role || '',
          bio: m.bio || '',
          image: m.image_url || '',
          team_type: m.team_type || '',
        }))
        setLeadershipTeam(normalized.filter((m: AboutTeamMember) => m.team_type === 'leadership'))
        setCommitteeTeam(normalized.filter((m: AboutTeamMember) => m.team_type === 'committee'))
      } catch {
        setLeadershipTeam([])
        setCommitteeTeam([])
      } finally {
        setTeamLoading(false)
      }
    }
    fetchTeam()
  }, [])

  const settingsLeadershipTeam: AboutTeamMember[] = [
    { name: settings.leader_1_name, title: settings.leader_1_title, role: '', bio: settings.leader_1_bio, image: settings.leader_1_image_url || '', team_type: 'leadership' },
    { name: settings.leader_2_name, title: settings.leader_2_title, role: '', bio: settings.leader_2_bio, image: settings.leader_2_image_url || '', team_type: 'leadership' },
    { name: settings.leader_3_name, title: settings.leader_3_title, role: '', bio: settings.leader_3_bio, image: settings.leader_3_image_url || '', team_type: 'leadership' },
    { name: settings.leader_4_name, title: settings.leader_4_title, role: '', bio: settings.leader_4_bio, image: settings.leader_4_image_url || '', team_type: 'leadership' },
    { name: settings.leader_5_name, title: settings.leader_5_title, role: '', bio: settings.leader_5_bio, image: settings.leader_5_image_url || '', team_type: 'leadership' },
    { name: settings.leader_6_name, title: settings.leader_6_title, role: '', bio: settings.leader_6_bio, image: settings.leader_6_image_url || '', team_type: 'leadership' },
  ]

  const settingsCommitteeTeam: AboutTeamMember[] = [
    { name: settings.committee_1_name, title: '', role: settings.committee_1_role, bio: settings.committee_1_bio, image: '', team_type: 'committee' },
    { name: settings.committee_2_name, title: '', role: settings.committee_2_role, bio: settings.committee_2_bio, image: '', team_type: 'committee' },
    { name: settings.committee_3_name, title: '', role: settings.committee_3_role, bio: settings.committee_3_bio, image: '', team_type: 'committee' },
    { name: settings.committee_4_name, title: '', role: settings.committee_4_role, bio: settings.committee_4_bio, image: '', team_type: 'committee' },
    { name: settings.committee_5_name, title: '', role: settings.committee_5_role, bio: settings.committee_5_bio, image: '', team_type: 'committee' },
    { name: settings.committee_6_name, title: '', role: settings.committee_6_role, bio: settings.committee_6_bio, image: '', team_type: 'committee' },
  ]

  const displayLeadershipTeam = mergeTeamMembers(settingsLeadershipTeam, leadershipTeam)
  const displayCommitteeTeam = mergeTeamMembers(settingsCommitteeTeam, committeeTeam)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[55vh] min-h-[450px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-black/80">
            {settings.hero_image_url ? (
              <div className="w-full h-full bg-cover bg-center bg-no-repeat opacity-40 mix-blend-overlay" style={{ backgroundImage: `url(${settings.hero_image_url})` }} />
            ) : null}
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl animate-pulse-glow z-10" />
        <div className="absolute bottom-1/4 right-10 w-40 h-40 bg-green-500/20 rounded-full blur-3xl animate-pulse-glow delay-1000 z-10" />

        <div className="relative z-20 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white tracking-tight">
              {settings.page_title || 'About Us'}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto font-light leading-relaxed">
              {settings.page_subtitle || 'Our story, mission, and values'}
            </p>
            <div className="mt-8 flex justify-center">
              <div className="h-1 w-24 bg-red-600 rounded-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Who We Are — Official Intro */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1 bg-red-50 text-red-600 rounded-full text-sm font-bold uppercase tracking-wider mb-6">
              About Us
            </span>
            <p className="text-xl md:text-2xl text-gray-800 leading-relaxed mb-6 font-light">
              Miss Culture Global Kenya is a <span className="font-semibold text-green-700">Cultural Diplomacy Platform</span>. We identify and nurture young Kenyan women to become global ambassadors who represent the soul of our nation&mdash;our culture, our diversity, and our untapped economic potential.
            </p>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed mb-8 font-light">
              By blending &ldquo;The Beauty of Purpose&rdquo; with &ldquo;The Power of Culture,&rdquo; we create a stage where culture drives sustainable development and global unity.
            </p>
            <div className="inline-block border-t-2 border-red-600/30 pt-6 max-w-2xl">
              <p className="text-lg md:text-xl text-gray-900 font-semibold italic leading-relaxed">
                A platform that builds young women&apos;s confidence and purpose beyond words.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 1. Mission & Vision */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our <span className="text-red-600">Mission</span></h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                To identify, mentor, and empower visionary young women who will safeguard Kenyan cultural identity, promote responsible tourism, and foster cross-cultural partnerships that create tangible impact in local communities.
              </p>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Strategic Focus</h3>
                  <p className="text-sm text-gray-500">Preservation, Education, Empowerment</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-green-600/10 rounded-2xl transform rotate-3" />
              {settings.mission_image_url ? (
                <img
                  src={settings.mission_image_url}
                  alt="Kenyan Culture"
                  className="relative rounded-2xl shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500"
                />
              ) : (
                <div className="relative rounded-2xl shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500 bg-green-100 flex items-center justify-center h-64">
                  <Landmark className="w-16 h-16 text-green-300" />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="py-24 bg-green-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 decorative-pattern opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-[100px]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-8">Our <span className="text-red-600">Vision</span></h2>
            <p className="text-xl md:text-2xl text-green-100 font-light leading-relaxed max-w-3xl mx-auto">
              To be Kenya&apos;s premier leadership platform that transforms culture into a global asset for social-economic empowerment and international diplomacy through Miss Culture Global PTY Ethical values.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Objectives */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 decorative-dots opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Our <span className="text-red-600">Objectives</span></h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              Four strategic commitments that translate our mission and vision into measurable impact — across Kenya and beyond.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {objectives.map((obj, index) => (
              <motion.div
                key={obj.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-3xl p-8 hover:shadow-elegant-lg hover:bg-white transition-all duration-300 border border-gray-100 hover:border-green-100 group"
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center group-hover:bg-red-100 transition-colors duration-300">
                    <obj.icon className="w-7 h-7 text-red-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-700 transition-colors duration-300">{obj.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{obj.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Part of Miss Culture Global */}
      <section className="py-16 bg-black relative overflow-hidden">
        <div className="absolute inset-0 decorative-pattern opacity-5" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left"
          >
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Globe className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">A Proud Franchise of Miss Culture Global</h3>
              <p className="text-gray-400 leading-relaxed mb-4">
                Miss Culture Global Kenya operates as the Kenyan franchise of Miss Culture Global, the international cultural diplomacy platform. Together, we share a unified mission: to transform cultural heritage into a global asset for socio-economic empowerment and international diplomacy — connecting nations, building bridges, and empowering young women worldwide.
              </p>
              <a
                href="https://misscultureglobal.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-yellow-400/50 text-white hover:text-yellow-300 rounded-full text-sm font-semibold transition-all duration-300 group"
              >
                Visit Miss Culture Global
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Culture with Impact Pillars */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Culture with <span className="text-red-600">Impact</span></h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              Our core pillars that define our commitment to cultural preservation and community empowerment.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Heritage & Fashion', description: 'Showcasing the evolution of Kenyan textiles and craftsmanship — where tradition meets the modern creative economy.', icon: Sparkles },
              { title: 'Diplomacy & Peace', description: 'Using culture as a tool for national cohesion and international relations — building bridges across borders.', icon: Handshake },
              { title: 'Economic Empowerment', description: 'Supporting the "Made in Kenya" movement through brand endorsements and entrepreneurial training.', icon: TrendingUp },
            ].map((pillar, index) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-10 text-center group border border-gray-100 hover:border-green-100"
              >
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-red-100 transition-colors duration-300">
                  <pillar.icon className="w-8 h-8 text-red-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-700 transition-colors duration-300">{pillar.title}</h3>
                <p className="text-gray-600 leading-relaxed">{pillar.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. History Timeline */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-green-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Our <span className="text-red-600">Journey</span></h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              A timeline of milestones in promoting Kenyan culture globally — from a single vision to a movement spanning 50+ nations.
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-green-100 hidden md:block"></div>
            <div className="space-y-16">
              {historyMilestones.map((milestone, index) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`flex flex-col md:flex-row ${index % 2 === 0 ? 'md:flex-row-reverse' : ''} items-center group`}
                >
                  <div className="md:w-1/2 mb-8 md:mb-0 md:px-12 w-full">
                    <div className="bg-white rounded-2xl shadow-elegant p-8 border border-gray-100 group-hover:border-green-200 transition-colors duration-300 relative">
                      <div className={`absolute top-1/2 ${index % 2 === 0 ? '-left-3' : '-right-3'} w-6 h-6 bg-white transform -translate-y-1/2 rotate-45 border-b border-l border-gray-100 hidden md:block group-hover:border-green-200 transition-colors duration-300 ${index % 2 === 0 ? 'border-r-0 border-t-0' : 'border-l-0 border-b-0 border-r border-t'}`} />
                      <span className="inline-block px-4 py-1 bg-green-100 text-green-700 rounded-full font-bold text-sm mb-4">{milestone.year}</span>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{milestone.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex md:w-16 h-16 rounded-full bg-white border-4 border-green-500 items-center justify-center text-green-600 font-bold text-lg z-10 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    {milestone.year.slice(2)}
                  </div>
                  <div className="md:w-1/2 md:px-12"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Values */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 decorative-dots opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Core <span className="text-red-600">Pillars</span></h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              The strategic pillars that guide our mission and shape our approach to cultural representation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl shadow-elegant p-8 text-center hover:shadow-elegant-lg transition-all duration-300 group"
              >
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-100 transition-colors duration-300">
                  <value.icon className="w-10 h-10 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                <p className="text-gray-600 leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Leadership Team */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Leadership <span className="text-red-600">Team</span></h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              The visionary leaders guiding our mission to promote Kenyan culture globally.
            </p>
          </motion.div>

          <div className="grid items-start md:grid-cols-2 lg:grid-cols-3 gap-10">
            {displayLeadershipTeam.map((leader, index) => (
              <motion.div
                key={leader.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl shadow-elegant overflow-hidden hover:shadow-elegant-lg transition-all duration-300 group flex min-h-[560px] flex-col"
              >
                {leader.image ? (
                  <div className="h-80 overflow-hidden relative">
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                    <img
                      src={leader.image}
                      alt={leader.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="h-80 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
                    <span className="text-5xl font-bold text-white/80">{leader.name.split(' ').map((n: string) => n[0]).join('')}</span>
                  </div>
                )}
                <div className="p-8 flex flex-1 flex-col">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{leader.name}</h3>
                  <p className="text-green-600 font-medium mb-4">{leader.title}</p>
                  <p className={`text-gray-600 leading-relaxed text-sm ${expandedLeadershipBios[leader.name] ? '' : 'max-h-24 overflow-hidden'}`}>
                    {leader.bio}
                  </p>
                  {shouldClampBio(leader.bio) && (
                    <button
                      type="button"
                      onClick={() => setExpandedLeadershipBios((current) => ({
                        ...current,
                        [leader.name]: !current[leader.name],
                      }))}
                      className="mt-4 self-start text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
                      aria-expanded={Boolean(expandedLeadershipBios[leader.name])}
                    >
                      {expandedLeadershipBios[leader.name] ? 'See less' : 'See more'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          {!teamLoading && !loading && displayLeadershipTeam.length === 0 && (
            <p className="mt-10 text-center text-sm text-gray-500">
              No leadership team members have been added yet.
            </p>
          )}
        </div>
      </section>

      {/* 7. Organizing Committee */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Organizing <span className="text-red-600">Committee</span></h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              The dedicated professionals who make our programs and events possible.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCommitteeTeam.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-green-100"
              >
                <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                <p className="text-green-600 font-medium text-sm mb-2">{member.role || member.title}</p>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </motion.div>
            ))}
          </div>
          {!teamLoading && !loading && displayCommitteeTeam.length === 0 && (
            <p className="mt-10 text-center text-sm text-gray-500">
              No organizing committee members have been added yet.
            </p>
          )}
        </div>
      </section>

      {/* 9. CTA */}
      <section className="py-20 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 decorative-pattern opacity-5" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Be Part of This <span className="text-red-600">Story</span>?</h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              Whether you want to participate, partner, volunteer, or donate — there&apos;s a place for you in Kenya&apos;s cultural future.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/contribute" className="inline-flex items-center justify-center bg-red-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 gap-2">
                Support the Mission <ChevronRight className="w-5 h-5" />
              </Link>
              <Link href="/partnership" className="inline-flex items-center justify-center bg-transparent border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 gap-2">
                Partner With Us <ChevronRight className="w-5 h-5" />
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center bg-transparent border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 gap-2">
                Get in Touch <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
