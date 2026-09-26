import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import CookieConsent from '@/components/CookieConsent'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { Providers } from '@/components/Providers'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://misscultureglobalkenya.com'),
  title: {
    default: 'Miss Culture Global Kenya | Official Website',
    template: '%s | Miss Culture Global Kenya'
  },
  description: 'Miss Culture Global Kenya (MCGK) is the official Kenyan cultural preservation and youth empowerment movement — showcasing Kenya\'s heritage through pageants, community programs, and global partnerships. Based in Nairobi. Brand Ambassador: Susan Abong\'o.',
  keywords: [
    'Miss Culture Global Kenya',
    'Kenya Heritage',
    'Cultural Ambassador Kenya',
    'Susan Abong\'o',
    'Miss Culture Kenya',
    'Kenyan Traditions',
    'Beauty with a Purpose Kenya',
    'Cultural Tourism Kenya',
    'Kenyan Fashion',
    'Miss Culture Global',
    'Kenya Tourism',
    'Kenya cultural pageant',
    'Youth empowerment Kenya',
    'African cultural preservation',
  ],
  authors: [{ name: 'Miss Culture Global Kenya' }],
  creator: 'Miss Culture Global Kenya',
  publisher: 'Miss Culture Global Kenya',
  category: 'Culture & Heritage',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Miss Culture Global Kenya — Heritage. Empowerment. Global Impact.',
    description: 'Official digital platform for Miss Culture Global Kenya. Celebrating Kenya\'s diverse cultural heritage through pageants, community programs, and global partnerships.',
    url: 'https://misscultureglobalkenya.com',
    siteName: 'Miss Culture Global Kenya',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Miss Culture Global Kenya — Kenya\'s Culture. The World\'s Stage.',
      },
    ],
    locale: 'en_KE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Miss Culture Global Kenya',
    description: 'Kenya\'s culture, heritage, and events brought to a global audience. Brand Ambassador: Susan Abong\'o.',
    images: ['/twitter-image'],
  },
  alternates: {
    canonical: 'https://misscultureglobalkenya.com',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  other: {
    'ai-content-declaration': 'This website contains original content about Miss Culture Global Kenya, a cultural preservation organization based in Nairobi, Kenya.',
    'ai-org-name': 'Miss Culture Global Kenya',
    'ai-org-description': 'Cultural preservation and youth empowerment movement showcasing Kenya\'s heritage through pageants, community programs, and global partnerships.',
    'ai-ambassador': 'Susan Abong\'o',
    'ai-location': 'Nairobi, Kenya',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Google Analytics (gtag.js) — loads only after cookie consent */}
        <GoogleAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://misscultureglobalkenya.com/#organization',
                'name': 'Miss Culture Global Kenya',
                'alternateName': ['Miss Culture Kenya', 'MCGK'],
                'url': 'https://misscultureglobalkenya.com',
                'logo': {
                  '@type': 'ImageObject',
                  'url': 'https://misscultureglobalkenya.com/official-logo.png',
                  'width': 300,
                  'height': 300
                },
                'description': 'Miss Culture Global Kenya is a cultural preservation and youth empowerment movement showcasing Kenya\'s heritage through pageants, community programs, and global partnerships.',
                'foundingLocation': {
                  '@type': 'Place',
                  'name': 'Nairobi, Kenya'
                },
                'address': {
                  '@type': 'PostalAddress',
                  'addressLocality': 'Nairobi',
                  'addressRegion': 'Nairobi County',
                  'postalCode': '00100',
                  'addressCountry': 'KE'
                },
                'contactPoint': {
                  '@type': 'ContactPoint',
                  'contactType': 'customer service',
                  'email': 'info@misscultureglobalkenya.com',
                  'telephone': '+254721706983',
                  'availableLanguage': ['English', 'Swahili']
                },
                'sameAs': [
                  'https://www.instagram.com/misscultureglobalkenya',
                  'https://www.tiktok.com/@misscultureglobalkenya',
                  'https://www.facebook.com/misscultureglobalkenya'
                ],
                'knowsAbout': [
                  'Kenyan cultural heritage',
                  'Youth empowerment',
                  'Cultural pageants',
                  'Community development',
                  'Global cultural diplomacy'
                ],
                'areaServed': {
                  '@type': 'Country',
                  'name': 'Kenya'
                }
              },
              {
                '@type': 'WebSite',
                '@id': 'https://misscultureglobalkenya.com/#website',
                'url': 'https://misscultureglobalkenya.com',
                'name': 'Miss Culture Global Kenya',
                'description': 'Official website of Miss Culture Global Kenya - cultural preservation and youth empowerment.',
                'publisher': { '@id': 'https://misscultureglobalkenya.com/#organization' },
                'inLanguage': 'en-KE',
                'potentialAction': {
                  '@type': 'SearchAction',
                  'target': 'https://misscultureglobalkenya.com/search?q={search_term_string}',
                  'query-input': 'required name=search_term_string'
                }
              },
              {
                '@type': 'Person',
                '@id': 'https://misscultureglobalkenya.com/#ambassador',
                'name': 'Susan Abong\'o',
                'jobTitle': 'Brand Ambassador',
                'description': 'Official Brand Ambassador of Miss Culture Global Kenya, championing cultural preservation and youth empowerment on the global stage.',
                'url': 'https://misscultureglobalkenya.com/ambassador',
                'affiliation': { '@id': 'https://misscultureglobalkenya.com/#organization' },
                'nationality': {
                  '@type': 'Country',
                  'name': 'Kenya'
                }
              },
              {
                '@type': 'WebPage',
                '@id': 'https://misscultureglobalkenya.com/#webpage',
                'url': 'https://misscultureglobalkenya.com',
                'name': 'Miss Culture Global Kenya | Official Website',
                'isPartOf': { '@id': 'https://misscultureglobalkenya.com/#website' },
                'about': { '@id': 'https://misscultureglobalkenya.com/#organization' },
                'speakable': {
                  '@type': 'SpeakableSpecification',
                  'cssSelector': ['h1', 'h2', '.hero-description', 'main p']
                }
              }
            ]
          }) }}
        />
        <Providers>
          <Navigation />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
          <CookieConsent />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
