'use client'

import { motion } from 'framer-motion'
import { AlertCircle, Check, GraduationCap, Globe2, Home, Loader2, Palette } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useContributePageSettings } from '@/lib/usePageSettings'
import apiClient from '@/lib/api'
import type { ApiError } from '@/lib/api'

const impactAreas = [
  {
    title: 'Cultural Preservation',
    description: 'Documenting and promoting diverse Kenyan traditions while integrating them into the modern creative economy — fashion, arts, and digital media.',
    icon: Palette,
    impact: 'Heritage & Innovation'
  },
  {
    title: 'Youth & Female Leadership',
    description: 'A rigorous mentorship ecosystem for young women and youth — entrepreneurship, public speaking, etiquette, and community project management.',
    icon: GraduationCap,
    impact: 'Mentorship Ecosystem'
  },
  {
    title: 'Global Ambassadorship',
    description: 'Equipping titleholders with the diplomacy and communication skills to represent Kenya on international stages and attract foreign investment.',
    icon: Globe2,
    impact: 'Cultural Diplomacy'
  },
  {
    title: 'Community Development',
    description: "Partnering with the travel industry to highlight Kenya's \u201CHidden Gems\u201D — promoting eco-tourism, community-based travel, and tangible impact in local communities.",
    icon: Home,
    impact: 'Sustainable Tourism'
  }
]

const ContributePage = () => {
  const { settings } = useContributePageSettings()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [successMsg, setSuccessMsg] = useState('')
  const [pending, setPending] = useState(false)
  const [pendingMsg, setPendingMsg] = useState('')
  const [contributionId, setContributionId] = useState<number | null>(null)

  // Poll the contribution status while the M-Pesa prompt is pending.
  useEffect(() => {
    if (!pending || !contributionId) return
    let attempts = 0
    const maxAttempts = 40 // ~2 minutes at 3s intervals
    const interval = setInterval(async () => {
      attempts += 1
      try {
        const res = await apiClient.getContributionStatus(contributionId)
        if (res?.status === 'successful') {
          clearInterval(interval)
          setPending(false)
          setPendingMsg('')
          setSuccessMsg('Thank you! Your contribution was received successfully.')
          return
        }
        if (res?.status === 'failed' || res?.status === 'cancelled') {
          clearInterval(interval)
          setPending(false)
          setPendingMsg('')
          setError('Payment was not completed or was cancelled. Please try again.')
          return
        }
      } catch {
        // Ignore transient errors and keep polling.
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setPending(false)
        setPendingMsg('')
        setError("We didn't get a confirmation in time. If you completed the payment on your phone, it will reflect shortly.")
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [pending, contributionId])

  // Handle payment return URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')
    if (paymentStatus === 'success') {
      setSuccessMsg('Thank you! Your contribution was received successfully.')
      window.history.replaceState({}, '', '/contribute')
    } else if (paymentStatus === 'failed') {
      setError('Payment was not completed. Please try again.')
      window.history.replaceState({}, '', '/contribute')
    }
  }, [])

  const handleSubmit = async () => {
    const numericAmount = Number(amount)
    if (!fullName.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!phone.trim()) {
      setError('Please enter your M-Pesa phone number.')
      return
    }
    if (!numericAmount || numericAmount < 1) {
      setError('Please enter a valid contribution amount.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    try {
      const result = await apiClient.initiateContributionPayment({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phone.trim(),
        amount: numericAmount,
      })

      if (result?.success) {
        // STK Push sent — wait on the phone and poll for confirmation.
        setContributionId(result.contribution_id || null)
        setPendingMsg(result.message || 'Check your phone for the M-Pesa prompt and enter your PIN to complete your contribution.')
        setPending(true)
      } else {
        setError(result?.error || 'Failed to send the M-Pesa prompt.')
      }
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr.message || 'Failed to start contribution payment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[55vh] min-h-[450px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/70 z-10" />
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
            className="w-full h-full bg-cover bg-center"
            style={settings.hero_image_url ? { backgroundImage: `url(${settings.hero_image_url})` } : undefined}
          />
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
            <p className="text-sm sm:text-base uppercase tracking-[0.3em] text-green-400 mb-4 font-semibold">Support Our Mission</p>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white tracking-tight">
              {settings.page_title || "Contribute"}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto font-light leading-relaxed">
              {settings.page_subtitle || "Support our mission"}
            </p>
            <div className="mt-8 flex justify-center">
              <div className="h-1 w-24 bg-red-600 rounded-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Where Donations Go */}
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
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Where Your <span className="text-red-600">Money</span> Goes</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Every shilling is channeled into programs that directly advance our four strategic objectives — from cultural preservation to community development.</p>
              <div className="h-1 w-20 bg-green-500 mx-auto rounded-full mt-4" />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {impactAreas.map((area, index) => (
                <motion.div
                  key={area.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-3xl shadow-elegant hover:shadow-elegant-lg transition-all duration-300 p-8 text-center group border border-gray-100 hover:border-green-100"
                >
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-100 transition-colors duration-300">
                    <area.icon className="w-10 h-10 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{area.title}</h3>
                  <p className="text-gray-600 mb-4 leading-relaxed text-sm">{area.description}</p>
                  <div className="inline-block px-4 py-1 bg-green-50 text-green-700 rounded-full font-semibold text-sm">
                    {area.impact}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Payment */}
      <section className="py-20 bg-gray-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-green-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute top-20 right-10 w-64 h-64 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-green-600" />

            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Make a Contribution</h2>
              </div>
              <p className="text-gray-600 max-w-2xl mx-auto">Secure, fast, and every shilling goes directly to our programs.</p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setError('') }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="font-normal text-gray-400">(optional)</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">M-Pesa Phone Number</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-sm text-gray-600 font-medium">
                      +254
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '')
                        if (v.startsWith('254')) v = v.slice(3)
                        else if (v.startsWith('0')) v = v.slice(1)
                        setPhone(v.slice(0, 9)); setError('')
                      }}
                      placeholder="712345678"
                      maxLength={12}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (KES)</label>
                  <input
                    type="number"
                    value={amount}
                    placeholder="Enter amount"
                    min={1}
                    onChange={(e) => { setAmount(e.target.value); setError('') }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-bold"
                  />
                </div>

                {successMsg && (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-700">{successMsg}</p>
                  </div>
                )}

                {pending && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <Loader2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0 animate-spin" />
                    <p className="text-sm text-blue-700">{pendingMsg || 'Waiting for M-Pesa confirmation...'}</p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || pending}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {(submitting || pending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {submitting ? 'Sending M-Pesa prompt...' : pending ? 'Waiting for confirmation...' : 'Pay with M-Pesa'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default ContributePage
