'use client'

import { useState, useEffect, use } from 'react'
import { motion } from 'framer-motion'
import { Ticket, CheckCircle, Calendar, MapPin, User, Mail, Phone, Loader2, AlertCircle, ArrowLeft, Printer, Download } from 'lucide-react'
import Link from 'next/link'
import apiClient from '@/lib/api'
import type { ApiError } from '@/lib/api'
import { formatEventTime } from '@/lib/eventDate'

interface TicketData {
  id: number
  ticket_code: string
  full_name: string
  email: string
  phone: string
  event_title: string
  event_slug: string
  ticket_category_name: string | null
  is_used: boolean
  issued_at: string
  featured_image_url: string | null
}

export default function TicketPage({ params }: { params: Promise<{ id: string; ticketCode: string }> }) {
  const { id, ticketCode } = use(params)
  // Ticket codes contain a "#" (e.g. FFS-HEUG#26). It travels in the URL as %23.
  // Decode it here so we hand the real code to the API (otherwise axios re-encodes
  // the "%" and the backend searches for the literal "%23" and returns 404).
  let decodedCode = ticketCode
  try {
    decodedCode = decodeURIComponent(ticketCode)
  } catch {
    decodedCode = ticketCode
  }
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const data = await apiClient.getTicketByCode(decodedCode)
        setTicket(data)
      } catch (err) {
        const apiErr = err as ApiError
        setError(apiErr.message || 'Ticket not found')
      } finally {
        setLoading(false)
      }
    }
    fetchTicket()
  }, [decodedCode])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = (dateStr: string) => {
    return formatEventTime(dateStr)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ticket Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The ticket code you entered does not match any records.'}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={apiClient.ticketPdfUrl(decodedCode)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-semibold text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Ticket (PDF)
            </a>
            <Link href="/events" className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-semibold text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 print:hidden">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/events" className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>
          <div className="flex items-center gap-4">
            <a
              href={apiClient.ticketPdfUrl(ticket.ticket_code)}
              className="flex items-center gap-1.5 text-gray-600 hover:text-green-600 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-gray-600 hover:text-green-600 transition-colors text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Card */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden print:border-gray-300"
        >
          {/* Header with Event Image */}
          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-green-600 to-green-800">
            {ticket.featured_image_url && (
              <img
                src={ticket.featured_image_url}
                alt={ticket.event_title}
                className="w-full h-full object-cover opacity-40"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Ticket className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <h1 className="text-xl font-bold">{ticket.event_title}</h1>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${
              ticket.is_used
                ? 'bg-gray-500 text-white'
                : 'bg-green-500 text-white'
            }`}>
              {ticket.is_used ? 'Used' : 'Valid'}
            </div>
          </div>

          {/* Dashed Separator */}
          <div className="relative">
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-gray-200" style={{ top: '-1px' }} />
            <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-gray-50" />
            <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-gray-50" />
          </div>

          {/* Ticket Details */}
          <div className="p-6 space-y-4">
            {/* Ticket Code */}
            <div className="text-center py-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ticket Code</p>
              <p className="text-2xl font-bold font-mono text-green-700 tracking-widest">{ticket.ticket_code}</p>
            </div>

            {/* QR Code Placeholder */}
            <div className="flex justify-center py-4">
              <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-400">QR Code</p>
                  <p className="text-[10px] text-gray-400">(Phase 2)</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Name</p>
                  <p className="text-sm font-semibold text-gray-900">{ticket.full_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm font-semibold text-gray-900 break-all">{ticket.email}</p>
                </div>
              </div>
              {ticket.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-sm font-semibold text-gray-900">{ticket.phone}</p>
                  </div>
                </div>
              )}
              {ticket.ticket_category_name && (
                <div className="flex items-start gap-2">
                  <Ticket className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Category</p>
                    <p className="text-sm font-semibold text-gray-900">{ticket.ticket_category_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Issued</p>
                  <p className="text-sm font-semibold text-gray-900">{formatDate(ticket.issued_at)}</p>
                  <p className="text-xs text-gray-500">{formatTime(ticket.issued_at)}</p>
                </div>
              </div>
            </div>

            {/* Valid Indicator */}
            {!ticket.is_used && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-700">This ticket is valid</p>
                  <p className="text-xs text-green-600">Present this ticket at the entrance</p>
                </div>
              </div>
            )}

            {ticket.is_used && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <CheckCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-600">This ticket has been used</p>
                  <p className="text-xs text-gray-400">It was scanned at the entrance</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-400 mt-6 print:hidden">
          Miss Culture Global Kenya — Official Ticket
        </p>
      </div>
    </div>
  )
}
