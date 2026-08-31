'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Mail, Phone, Heart, Calendar, Users, Globe, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { useFAQPageSettings } from '@/lib/usePageSettings'

const faqCategories = [
  {
    title: 'General Information',
    subtitle: 'Foundational questions about legitimacy & structure',
    icon: Heart,
    color: 'bg-green-50 text-green-600 border-green-100',
    faqs: [
      {
        question: 'What is Miss Culture Global Kenya?',
        answer: 'Miss Culture Global Kenya is a cultural preservation movement, a youth empowerment platform, and Kenya\'s voice in a global conversation spanning 50+ nations. It is not just a pageant — it is a cultural diplomacy platform that transforms heritage into a global asset for socio-economic empowerment.'
      },
      {
        question: 'How are you connected to Miss Culture Global?',
        answer: 'Miss Culture Global Kenya operates as the Kenyan franchise of Miss Culture Global, the international cultural diplomacy platform. We share a unified mission: to transform cultural heritage into a global asset for socio-economic empowerment and international diplomacy.'
      },
      {
        question: 'When was this started?',
        answer: 'Miss Culture Global Kenya was established in 2025 with the vision to celebrate and preserve Kenya\'s rich cultural heritage while promoting it globally. Since then, we\'ve grown to impact 100+ communities across Kenya.'
      },
      {
        question: 'Is this a nonprofit?',
        answer: 'Yes, Miss Culture Global Kenya is a registered non-profit organization. All funds raised go directly toward our cultural preservation, youth empowerment, and community development programs.'
      }
    ]
  },
  {
    title: 'Participation & Events',
    subtitle: 'Action-oriented questions from participants',
    icon: Calendar,
    color: 'bg-red-50 text-red-600 border-red-100',
    faqs: [
      {
        question: 'How do I enter the pageant?',
        answer: 'Applications open every January. To enter, you must be: aged 18–30 years; a Kenyan citizen by birth or registration; holding a valid Kenyan ID and passport; unmarried (with or without kids); and of all shapes and sizes. A passion for cultural preservation is what unites every contestant.'
      },
      {
        question: 'What are the age requirements?',
        answer: 'The main pageant is for adults aged 18-28. Our Junior Cultural Ambassador program is for teens aged 13-17. We also have programs for children under 13 focused on cultural education rather than competition.'
      },
      {
        question: 'What do events cost?',
        answer: 'Event costs vary. Many of our community events are free to attend. Our major pageant events have ticket categories ranging from General Admission (free or low-cost) to VIP Experience (KSh 2,000+). Check individual event pages for details.'
      },
      {
        question: 'Can I attend virtually?',
        answer: 'Select events offer live-streaming options. Follow our social media channels for virtual event announcements. We\'re working toward making all major events accessible online.'
      },
      {
        question: 'How is voting done?',
        answer: 'Voting is done through our website using M-Pesa. Each vote has a set price (varies by event). You can vote as many times as you like — your votes are counted immediately after payment confirmation. Live vote counts may be displayed depending on the event\'s visibility settings.'
      }
    ]
  },
  {
    title: 'Community Involvement',
    subtitle: 'Questions from non-financial supporters',
    icon: Users,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    faqs: [
      {
        question: 'How can I volunteer?',
        answer: 'We welcome volunteers for events, community programs, and administrative support. Volunteer roles range from event coordination to cultural research to social media management.'
      },
      {
        question: 'Do you have student programs?',
        answer: 'Yes! We offer cultural education programs for schools and universities, including workshops, mentorship sessions, and scholarship opportunities for students interested in cultural studies.'
      },
      {
        question: 'Can schools partner with you?',
        answer: 'Absolutely. We actively collaborate with educational institutions to promote cultural education among youth. We offer tailored school programs, workshops, and cultural exchange opportunities.'
      },
      {
        question: 'How do I nominate someone?',
        answer: 'You can nominate potential contestants, volunteers, or community leaders through our contact form. Select "General Inquiry" and include the nominee\'s name, background, and why they would be a great fit.'
      }
    ]
  },
  {
    title: 'Support & Partnerships',
    subtitle: 'Financial & business questions',
    icon: Globe,
    color: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    faqs: [
      {
        question: 'How do I become a sponsor?',
        answer: 'We offer three partnership tiers: Event Sponsorship (KES 50K-500K), Program Support (KES 500K-2M annually), and Global Outreach Partnership (KES 2M+). Each tier offers different levels of visibility, impact, and engagement.'
      },
      {
        question: 'Are donations tax-deductible?',
        answer: 'Yes. We\'re registered as a nonprofit organization in Kenya, so contributions are tax-deductible under Kenyan law. Contact us for an official receipt for your tax records.'
      },
      {
        question: 'Can individuals donate?',
        answer: 'Absolutely. Individual donations of any amount are welcome. You can contribute securely via M-Pesa. Suggested amounts start at KES 500.'
      },
      {
        question: 'What are the partnership requirements?',
        answer: 'We partner with organizations that share our values of cultural preservation, youth empowerment, and community development. No specific requirements beyond alignment with our mission and a commitment to making a positive impact.'
      }
    ]
  }
]

const FAQPage = () => {
  const { settings } = useFAQPageSettings()
  const [openIndex, setOpenIndex] = useState<string | null>(null)

  const toggleAccordion = (key: string) => {
    setOpenIndex(openIndex === key ? null : key)
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
            <p className="text-sm sm:text-base uppercase tracking-[0.3em] text-green-400 mb-4 font-semibold">Quick Answers</p>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white tracking-tight">
              {settings.page_title || "FAQ"}
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto font-light leading-relaxed">
              {settings.page_subtitle || "Frequently asked questions"}
            </p>
            <div className="mt-8 flex justify-center">
              <div className="h-1 w-24 bg-red-600 rounded-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-20 bg-gray-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-green-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute top-20 right-10 w-64 h-64 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="space-y-10">
            {faqCategories.map((category, categoryIndex) => (
              <motion.div
                key={category.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl shadow-elegant overflow-hidden border border-gray-100 hover:shadow-elegant-lg transition-shadow duration-300"
              >
                {/* Category Header */}
                <div className={`px-8 py-6 border-b ${category.color.split(' ').slice(1).join(' ')} ${category.color.split(' ')[0]}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${category.color.split(' ')[0]} flex items-center justify-center`}>
                      <category.icon className={`w-5 h-5 ${category.color.split(' ')[1]}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{category.title}</h3>
                      <p className="text-sm text-gray-500">{category.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* FAQ Items */}
                <div className="divide-y divide-gray-100">
                  {category.faqs.map((faq, faqIndex) => {
                    const key = `${categoryIndex}-${faqIndex}`
                    const isOpen = openIndex === key

                    return (
                      <div key={faqIndex} className="px-8 bg-white transition-colors duration-300 hover:bg-gray-50/50">
                        <button
                          className="w-full py-6 text-left flex justify-between items-center focus:outline-none group"
                          onClick={() => toggleAccordion(key)}
                        >
                          <span className={`text-base font-medium transition-colors duration-300 pr-4 ${isOpen ? 'text-green-700' : 'text-gray-900 group-hover:text-green-700'}`}>
                            {faq.question}
                          </span>
                          <div className={`ml-4 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-green-100 text-green-600 rotate-180' : 'bg-gray-100 text-gray-500 group-hover:bg-green-50 group-hover:text-green-600'}`}>
                            <ChevronDown className="w-5 h-5" />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="pb-6 pt-2 text-gray-600 leading-relaxed border-t border-dashed border-gray-100">
                                <p>{faq.answer}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Still Have Questions CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-20 bg-green-900 rounded-3xl shadow-2xl p-10 md:p-16 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Still Have Questions?</h2>
              <p className="text-xl text-green-50 mb-10 max-w-2xl mx-auto font-light">
                Our team is here to help. Reach out and we&apos;ll get back to you within 24-48 hours on business days.
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center bg-white text-green-700 hover:bg-gray-50 font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Contact Us
                </Link>
                <a
                  href="tel:+254721706983"
                  className="inline-flex items-center justify-center bg-transparent border-2 border-white/30 text-white hover:bg-white/10 hover:border-white font-bold py-4 px-8 rounded-xl transition-all duration-300 backdrop-blur-sm gap-2"
                >
                  <Phone className="w-5 h-5" />
                  Call Us
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default FAQPage
