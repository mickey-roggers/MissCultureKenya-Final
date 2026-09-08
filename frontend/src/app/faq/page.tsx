'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Mail, Phone, HelpCircle } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { useFAQPageSettings } from '@/lib/usePageSettings'

const faqCategories = [
  {
    title: 'Frequently Asked Questions',
    subtitle: 'Official information about Miss Culture Global Kenya',
    icon: HelpCircle,
    color: 'bg-green-50 text-green-600 border-green-100',
    faqs: [
      ['What is Miss Culture Global Kenya?', 'Miss Culture Global Kenya (MCGK) is a national female-led model award and pageantry programme that provides a platform for young Kenyan women to showcase their beauty, talent, confidence, leadership, cultural identity and commitment to community development.'],
      ['Is Miss Culture Global Kenya a beauty pageant?', 'Yes. However, MCGK goes beyond physical beauty. The programme focuses on modelling, confidence, talent, culture, leadership, etiquette, personal development and community service.'],
      ['Who is eligible to participate?', 'The programme is open to Kenyan women aged 18–30 years who are unmarried, including women with or without children, subject to the official eligibility requirements for the particular competition year.'],
      ['Is Miss Culture Global Kenya only for professional models?', 'No. Previous modelling experience is not necessarily required. The programme welcomes women who demonstrate confidence, potential, talent, commitment and willingness to learn and develop.'],
      ['Is Miss Culture Global Kenya female-led?', 'Yes. Miss Culture Global Kenya is a female-led institution and a female-only model award and pageantry programme, created to provide opportunities for women to develop and showcase their abilities.'],
      ['Who manages Miss Culture Global Kenya in Kenya?', 'The Miss Culture Global Kenya programmes are managed nationally by The MissComm EVENTS, a youth- and women-led organisation that serves as the official managing agency.'],
      ['Who is the National Managing Director?', 'The National Managing Director of Miss Culture Global Kenya is M/s. Awuor Pacific.'],
      ['Who is the current Reigning Queen?', "The current reigning Queen is Miss Susan Abong'o – Miss Culture Global Kenya 2025–2026."],
      ['Who is the major sponsor?', 'The current major financial sponsor of Miss Culture Global Kenya is The MissComm EVENTS, which is also the national managing agency.'],
      ['Who are the current major sponsors of the 2026 Grand Finale?', 'The Village Market Management is the major in-kind sponsor, The MissComm Events, Citicasts, R_Empire, and Timz vintage Find, supporting the 2026 Grand Finale.'],
      ['What is the relationship between MissComm EVENTS and Miss Culture Global Kenya?', 'The MissComm EVENTS is the official managing agency of Miss Culture Global Kenya in Kenya, providing programme management, coordination, financial support, partnerships, training and operational support.'],
      ['Is Miss Culture Global Kenya affiliated with Miss Culture Global International?', 'Yes. Miss Culture Global Kenya operates as a franchise of Miss Culture Global International, an international pageantry organisation headquartered in South Africa and founded in 2020 by Miss Lorraine Shaquan Kijajic.'],
      ['What opportunities does the winner receive?', "The national winner becomes Miss Culture Global Kenya and may receive opportunities to represent Kenya internationally, participate in cultural and community initiatives, access mentorship and training, and engage in national and international promotional activities, subject to the programme's terms."],
      ['What does Miss Culture Global Kenya promote?', 'MCGK promotes Kenyan culture and heritage, women’s empowerment, leadership, confidence, modelling, talent, personal development, community service, cultural exchange and international representation.'],
      ['What does “Culture” mean in Miss Culture Global Kenya?', 'Culture is at the heart of the programme. Contestants are encouraged to learn, preserve and promote their heritage, including language, food, music, dance, names, dress, customs, ceremonies and other cultural practices.'],
      ['Are contestants expected to participate in community service?', 'Yes. Contestants are encouraged to undertake meaningful community and CSR activities within their counties and communities.'],
      ['What training do contestants receive?', 'Depending on the programme schedule, contestants may receive training in modelling, runway walking, pageantry, public speaking, etiquette, cultural awareness, personal branding, leadership, community engagement and stage performance.'],
      ['When and where is the 2026 Grand Finale?', 'The Miss Culture Global Kenya 2026 Grand Finale is scheduled for 7th November 2026 at The Village Market, Nairobi.'],
      ['How can an organisation become a sponsor or partner?', 'Organisations, corporates, institutions and individuals can contact us to explore financial sponsorship, in-kind support, media partnerships, branding, travel, accommodation, training, gift hampers and other strategic collaborations.'],
      ['Does Miss Culture Global Kenya offer training outside the pageant?', 'Yes. Through The MissComm EVENTS, programmes may include modelling, dancing, pageantry, etiquette, stage presentation, school-based CBC/CBE training, weekend programmes and holiday training programmes.']
    ].map(([question, answer]) => ({ question, answer }))
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
