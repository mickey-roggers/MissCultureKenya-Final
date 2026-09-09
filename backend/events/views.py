import json
import logging
import uuid
from decimal import Decimal

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Sum, F, Q, Value
from django.db.models.functions import Coalesce

from .models import (
    Event, EventCategory,
    TicketCategory, Contestant, GuestSpeaker, Payment, Contribution, Ticket, VoteTransaction, AuditLog, FinanceSettings
)
from .serializers import (
    EventSerializer, EventListSerializer,
    EventCategorySerializer,
    TicketCategorySerializer, ContestantSerializer, ContestantPublicSerializer,
    PaymentSerializer, PaymentCreateSerializer,
    TicketSerializer, TicketDetailSerializer,
    VoteTransactionSerializer, AuditLogSerializer,
    LiveResultSerializer, VoteVerifySerializer,
    PesaPalVotePaymentRequestSerializer, PesaPalTicketPaymentRequestSerializer,
    ContributionCheckoutSerializer, ContributionSerializer,
)
from .utils import (
    generate_ticket_code, calculate_vote_count, 
    send_telegram_message, send_ticket_email
)
from .ticket_pdf import generate_ticket_pdf
from .pesapal import submit_order, get_transaction_status
from .daraja import initiate_stk_push, process_callback

logger = logging.getLogger(__name__)


def _absolute_backend_url(request, path):
    """Build a full backend URL for external callbacks.

    If PESAPAL_CALLBACK_URL is configured, derive the base from it so the
    path argument is always honoured.
    """
    configured = getattr(settings, 'PESAPAL_CALLBACK_URL', '')
    if configured:
        from urllib.parse import urlparse
        parsed = urlparse(configured)
        return f"{parsed.scheme}://{parsed.netloc}{path}"
    host = request.get_host()
    scheme = 'https' if request.is_secure() else 'http'
    return f"{scheme}://{host}{path}"


def _frontend_url(path=''):
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    return f"{base}{path}"


def _short_payment_reference(result, fallback=''):
    reference = (
        result.get('confirmation_code')
        or result.get('payment_reference')
        or result.get('mpesa_reference')
        or result.get('invoice_id')
        or fallback
        or ''
    )
    return str(reference)[:20]


# ── Event ViewSet ────────────────────────────────────────────────────────────

class EventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Event.objects.filter(published=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event_type', 'event_status', 'featured', 'city', 'country', 'voting_enabled']
    search_fields = ['title', 'description', 'venue_name', 'city']
    ordering_fields = ['start_date', 'title', 'created_at']
    ordering = ['-start_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return EventListSerializer
        return EventSerializer

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        upcoming_events = self.get_queryset().filter(
            start_date__gte=timezone.now(),
        ).order_by('start_date')
        serializer = self.get_serializer(upcoming_events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def past(self, request):
        past_events = self.get_queryset().filter(
            start_date__lt=timezone.now()
        ).order_by('-start_date')
        serializer = self.get_serializer(past_events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def featured(self, request):
        featured_events = self.get_queryset().filter(featured=True)
        serializer = self.get_serializer(featured_events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def voting_events(self, request):
        """Get events that have voting enabled and are in voting_open status"""
        events = self.get_queryset().filter(
            voting_enabled=True,
            event_status='voting_open',
        )
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def register_ticket(self, request, pk=None):
        """Register a free ticket for an event. Only works for free events."""
        event = self.get_object()

        # Validate event is free (has a ticket category with price 0)
        ticket_category_id = request.data.get('ticket_category')
        full_name = request.data.get('full_name')
        email = request.data.get('email', '') or ''
        phone = request.data.get('phone', '')

        if not full_name:
            return Response(
                {'error': 'full_name is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        ticket_category = None
        if ticket_category_id:
            try:
                ticket_category = TicketCategory.objects.get(id=ticket_category_id, event=event)
            except TicketCategory.DoesNotExist:
                return Response(
                    {'error': 'Invalid ticket category for this event.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # For free events, generate ticket immediately
        if ticket_category and ticket_category.price > 0:
            return Response(
                {'error': 'This is a paid event. Use the payment flow instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate ticket code
        event_year = event.start_date.year
        ticket_code = generate_ticket_code(event.ticket_prefix, event_year)

        ticket = Ticket.objects.create(
            event=event,
            ticket_category=ticket_category,
            ticket_code=ticket_code,
            full_name=full_name,
            email=email,
            phone=phone,
        )

        # Audit log
        AuditLog.objects.create(
            action='ticket_issued',
            actor='system',
            details=json.dumps({
                'ticket_code': ticket.ticket_code,
                'full_name': full_name,
                'event': event.title,
                'type': 'free_registration',
            }),
            event=event,
        )

        serializer = TicketDetailSerializer(ticket)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def verify_payment(self, request, pk=None):
        """Admin verifies a payment, triggers ticket/vote processing."""
        event = self.get_object()
        payment_id = request.data.get('payment_id')
        new_status = request.data.get('status', 'successful')

        if not payment_id:
            return Response(
                {'error': 'payment_id is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment = Payment.objects.get(id=payment_id, event=event)
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found for this event.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if payment.status == 'successful':
            return Response(
                {'error': 'Payment already verified.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update payment status
        payment.status = new_status
        payment.verified_by = request.user if request.user.is_authenticated else None
        payment.verified_at = timezone.now()
        payment.save()

        results = {}

        if new_status == 'successful':
            if payment.payment_purpose == 'ticket':
                results = self._process_ticket_payment(payment, event)
            elif payment.payment_purpose == 'vote':
                results = self._process_vote_payment(payment, event, request)

        # Audit log
        AuditLog.objects.create(
            action='payment_verified',
            actor=request.user.username if request.user.is_authenticated else 'admin',
            details=json.dumps({
                'payment_id': payment.id,
                'mpesa_code': payment.mpesa_code,
                'amount': str(payment.amount),
                'new_status': new_status,
                'results': results,
            }),
            event=event,
        )

        return Response({
            'payment': PaymentSerializer(payment).data,
            'processing_results': results,
        })

    @action(detail=True, methods=['get'])
    def live_results(self, request, pk=None):
        """Get live voting results based on event's result_visibility setting."""
        event = self.get_object()

        if not event.voting_enabled:
            return Response(
                {'error': 'Voting is not enabled for this event.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        visibility = event.result_visibility

        # If no public updates, return nothing
        if visibility == 'no_public':
            return Response({'message': 'Results are not available publicly at this time.'})

        contestants = Contestant.objects.filter(
            event=event, is_active=True
        ).annotate(
            # Sum returns NULL for contestants with no successful votes; Coalesce
            # to 0 so ordering by -vote_count_annotated puts the highest votes
            # first and zero-vote contestants last (Postgres would otherwise rank
            # NULLs at the top of a DESC sort).
            vote_count_annotated=Coalesce(
                Sum(
                    'vote_transactions__vote_count',
                    filter=Q(vote_transactions__status='successful')
                ),
                Value(0),
            )
        ).order_by('-vote_count_annotated')

        results = []
        for rank, c in enumerate(contestants, 1):
            count = c.vote_count_annotated or 0
            result_entry = {
                'contestant_id': c.id,
                'contestant_name': c.name,
                'contestant_number': c.contestant_number,
                'slug': c.slug,
                'photo_url': _cloudinary_url(c.photo),
            }

            if visibility in ('full_live',):
                result_entry['vote_count'] = count
                result_entry['rank'] = rank
            elif visibility == 'rankings_only':
                result_entry['vote_count'] = None
                result_entry['rank'] = rank
            elif visibility == 'hidden':
                result_entry['vote_count'] = None
                result_entry['rank'] = None

            results.append(result_entry)

        serializer = LiveResultSerializer(results, many=True)
        return Response({
            'event': event.title,
            'result_visibility': visibility,
            'is_voting_active': event.is_voting_active,
            'results': serializer.data,
        })

    @action(detail=True, methods=['get'])
    def vote_verify(self, request, pk=None):
        """Verify votes by phone number for this event."""
        event = self.get_object()
        phone = request.query_params.get('phone', '').strip()

        if not phone:
            return Response(
                {'error': 'phone query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        votes = VoteTransaction.objects.filter(
            event=event,
            phone_number__contains=phone[-9:] if len(phone) >= 9 else phone,
            status='successful',
        ).select_related('contestant', 'event').order_by('-created_at')

        serializer = VoteVerifySerializer(votes, many=True)
        total_votes = votes.aggregate(total=Sum('vote_count'))['total'] or 0
        return Response({
            'event': event.title,
            'total_transactions': votes.count(),
            'total_votes': total_votes,
            'votes': serializer.data,
        })

    @action(detail=True, methods=['post'])
    def initiate_vote_payment(self, request, pk=None):
        """
        Initiate M-Pesa Daraja STK Push for voting.
        Creates a pending Payment record and triggers STK Push to user's phone.
        """
        event = self.get_object()

        if not event.voting_enabled or not event.is_voting_active:
            return Response(
                {'error': 'Voting is not currently active for this event.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PesaPalVotePaymentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone_number = serializer.validated_data['phone_number']
        amount = serializer.validated_data['amount']
        contestant_id = serializer.validated_data['contestant_id']

        # Validate contestant exists and is active
        try:
            contestant = Contestant.objects.get(id=contestant_id, event=event, is_active=True)
        except Contestant.DoesNotExist:
            return Response(
                {'error': 'Contestant not found or not active in this event.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate vote count for informational purposes
        vote_count = calculate_vote_count(amount, event.vote_price)

        # Create pending payment record with payment_purpose
        payment = Payment.objects.create(
            event=event,
            contestant=contestant,
            phone_number=phone_number,
            amount=amount,
            status='pending',
            payment_purpose='vote',
        )

        # Initiate STK Push. Safaricom caps AccountReference at ~12 chars, so we
        # trim the contestant name to fit (falling back to a stable reference).
        callback_url = _absolute_backend_url(request, '/api/events/mpesa-callback/')
        account_reference = (contestant.name or '').strip()[:12] or f"VOTE-{payment.id}"
        transaction_desc = f'Vote for {contestant.name}'

        stk_result = initiate_stk_push(
            phone_number=phone_number,
            amount=amount,
            account_reference=account_reference,
            transaction_desc=transaction_desc,
            callback_url=callback_url,
        )

        payment.checkout_request_id = stk_result.get('checkout_request_id', '')
        payment.merchant_request_id = stk_result.get('merchant_request_id', '')
        payment.stk_response = stk_result.get('raw', {})

        if stk_result.get('success'):
            payment.save()
            return Response({
                'success': True,
                'message': 'STK Push sent to your phone. Enter your M-Pesa PIN to complete payment.',
                'checkout_request_id': payment.checkout_request_id,
                'merchant_request_id': payment.merchant_request_id,
                'vote_count': vote_count,
                'payment_id': payment.id,
            })
        else:
            payment.status = 'failed'
            payment.save()
            return Response({
                'success': False,
                'error': stk_result.get('error', 'Failed to initiate STK Push.'),
                'payment_id': payment.id,
            }, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=['post'])
    def initiate_ticket_payment(self, request, pk=None):
        """
        Initiate M-Pesa Daraja STK Push for ticket purchase.
        Creates a pending Payment record and triggers STK Push to user's phone.
        """
        event = self.get_object()

        serializer = PesaPalTicketPaymentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                "initiate_ticket_payment validation failed for event %s: %s",
                pk, serializer.errors,
            )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone_number = serializer.validated_data['phone_number']
        full_name = serializer.validated_data['full_name']
        email = serializer.validated_data['email']
        ticket_breakdown = serializer.validated_data['ticket_breakdown']

        categories = TicketCategory.objects.filter(event=event, is_active=True, id__in=ticket_breakdown.keys())
        categories_by_id = {c.id: c for c in categories}

        if not categories_by_id:
            logger.warning(
                "initiate_ticket_payment: no valid categories for event %s, breakdown=%s",
                pk, ticket_breakdown,
            )
            return Response({'error': 'No valid ticket categories found for this event.'}, status=status.HTTP_400_BAD_REQUEST)

        total_qty = 0
        total_amount = Decimal('0.00')
        for category_id, qty in ticket_breakdown.items():
            category = categories_by_id.get(int(category_id))
            if not category:
                return Response({'error': f'Invalid ticket category: {category_id}'}, status=status.HTTP_400_BAD_REQUEST)
            if category.available and qty > int(category.available):
                return Response({'error': f'Only {category.available} ticket(s) available for {category.name}.'}, status=status.HTTP_400_BAD_REQUEST)
            total_qty += int(qty)
            total_amount += (category.price * int(qty))

        if total_amount <= 0:
            return Response({'error': 'Selected ticket total is free. Use free registration instead.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create pending payment record with payment_purpose
        payment = Payment.objects.create(
            event=event,
            phone_number=phone_number,
            amount=total_amount,
            status='pending',
            payment_purpose='ticket',
            full_name=full_name,
            email=email,
            ticket_breakdown=ticket_breakdown,
            ticket_quantity=total_qty,
        )

        # Initiate STK Push
        callback_url = _absolute_backend_url(request, '/api/events/mpesa-callback/')
        account_reference = f"TICKET-{payment.id}"
        transaction_desc = f'Tickets for {event.title}'

        stk_result = initiate_stk_push(
            phone_number=phone_number,
            amount=total_amount,
            account_reference=account_reference,
            transaction_desc=transaction_desc,
            callback_url=callback_url,
        )

        payment.checkout_request_id = stk_result.get('checkout_request_id', '')
        payment.merchant_request_id = stk_result.get('merchant_request_id', '')
        payment.stk_response = stk_result.get('raw', {})

        if stk_result.get('success'):
            payment.save()
            return Response({
                'success': True,
                'message': 'STK Push sent to your phone. Enter your M-Pesa PIN to complete payment.',
                'checkout_request_id': payment.checkout_request_id,
                'merchant_request_id': payment.merchant_request_id,
                'payment_id': payment.id,
                'ticket_count': total_qty,
                'amount': str(total_amount),
            })
        payment.status = 'failed'
        payment.save()
        return Response({
            'success': False,
            'error': stk_result.get('error', 'Failed to initiate STK Push.'),
            'payment_id': payment.id,
        }, status=status.HTTP_502_BAD_GATEWAY)

    def _process_ticket_payment(self, payment, event):
        event_year = event.start_date.year
        ticket_breakdown = payment.ticket_breakdown or {}
        tickets = []
        emails_sent = []

        def create_and_email_ticket(ticket_category=None):
            ticket_code = generate_ticket_code(event.ticket_prefix, event_year)
            ticket = Ticket.objects.create(
                event=event,
                ticket_category=ticket_category,
                payment=payment,
                ticket_code=ticket_code,
                full_name=payment.full_name or payment.phone_number,
                email=payment.email or '',
                phone=payment.phone_number,
            )
            
            # Generate PDF and send email
            if ticket.email:
                try:
                    pdf_buffer = generate_ticket_pdf(ticket, event)
                    email_sent = send_ticket_email(ticket, event, pdf_buffer)
                    if email_sent:
                        emails_sent.append(ticket.ticket_code)
                except Exception as e:
                    # Log error but don't fail ticket creation
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send ticket email for {ticket.ticket_code}: {e}")
            
            return ticket

        if ticket_breakdown:
            for category_id, qty in ticket_breakdown.items():
                try:
                    ticket_category = TicketCategory.objects.get(id=int(category_id), event=event)
                except TicketCategory.DoesNotExist:
                    continue

                qty = max(1, int(qty))
                for _ in range(qty):
                    ticket = create_and_email_ticket(ticket_category)
                    tickets.append({'ticket_id': ticket.id, 'ticket_code': ticket.ticket_code, 'ticket_category': ticket_category.id, 'ticket_category_name': ticket_category.name, 'email_sent': ticket.ticket_code in emails_sent})

                ticket_category.available = max(0, int(ticket_category.available or 0) - qty)
                ticket_category.save(update_fields=['available'])
        else:
            ticket_category = payment.ticket_category
            if ticket_category and ticket_category.event_id != event.id:
                ticket_category = None

            quantity = int(payment.ticket_quantity or 1)
            quantity = max(1, quantity)

            for _ in range(quantity):
                ticket = create_and_email_ticket(ticket_category)
                tickets.append({'ticket_id': ticket.id, 'ticket_code': ticket.ticket_code, 'ticket_category': ticket_category.id if ticket_category else None, 'ticket_category_name': ticket_category.name if ticket_category else 'General', 'email_sent': ticket.ticket_code in emails_sent})

            if ticket_category:
                ticket_category.available = max(0, int(ticket_category.available or 0) - quantity)
                ticket_category.save(update_fields=['available'])

        # Send Telegram notification about ticket sales
        if tickets:
            try:
                ticket_lines = '\n'.join([
                    f"• {t['ticket_code']} — {t.get('ticket_category_name') or 'General'}"
                    for t in tickets
                ])
                message = f"""🎫 <b>New Ticket Purchase</b>

Event: {event.title}
Buyer: {payment.full_name}
Phone: {payment.phone_number}
Tickets: {len(tickets)}
Amount: KES {payment.amount}

Tickets (Code — Category):
{ticket_lines}
Emails Sent: {len(emails_sent)}/{len(tickets)}"""
                send_telegram_message(message)
            except:
                pass

        return {'tickets': tickets, 'ticket_count': len(tickets), 'emails_sent': len(emails_sent)}

    def _process_vote_payment(self, payment, event, request):
        """Calculate and create vote transactions after successful payment."""
        vote_count = calculate_vote_count(payment.amount, event.vote_price)

        if vote_count == 0:
            return {'error': 'Payment amount is less than vote price. No votes created.'}

        contestant_id = request.data.get('contestant_id') if request else None
        if not contestant_id:
            contestant_id = payment.contestant_id

        if not contestant_id:
            return {'error': 'contestant_id is required for vote processing.'}

        try:
            contestant = Contestant.objects.get(id=contestant_id, event=event, is_active=True)
        except Contestant.DoesNotExist:
            return {'error': 'Contestant not found or not active in this event.'}

        vote = VoteTransaction.objects.create(
            event=event,
            contestant=contestant,
            payment=payment,
            vote_count=vote_count,
            phone_number=payment.phone_number,
            mpesa_code=payment.mpesa_code,
            status='successful',
            ip_address=self._get_client_ip(request),
        )

        # Notify admins about the new vote via Telegram
        try:
            send_telegram_message(
                f"\U0001f5f3 <b>New Vote Confirmed!</b>\n\n"
                f"Event: {event.title}\n"
                f"Contestant: #{contestant.contestant_number} {contestant.name}\n"
                f"Votes: {vote_count}\n"
                f"Amount: KES {payment.amount}\n"
                f"Phone: {payment.phone_number}\n"
                f"M-Pesa Code: {payment.mpesa_code or '-'}"
            )
        except Exception:
            pass

        return {'vote_id': vote.id, 'vote_count': vote_count, 'contestant': contestant.name}

    @staticmethod
    def _get_client_ip(request):
        if request is None:
            return None
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


# ── EventCategory ViewSet ────────────────────────────────────────────────────

class EventCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EventCategory.objects.all()
    serializer_class = EventCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


# ── TicketCategory ViewSet ───────────────────────────────────────────────────

class TicketCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TicketCategory.objects.filter(is_active=True)
    serializer_class = TicketCategorySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['event']


# ── Contestant ViewSet ───────────────────────────────────────────────────────

class ContestantViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Contestant.objects.filter(is_active=True).select_related('event', 'contestant_category')
    serializer_class = ContestantSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['event', 'is_active', 'contestant_category']
    search_fields = ['name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ContestantPublicSerializer
        return ContestantSerializer

    @action(detail=True, methods=['get'])
    def public_page(self, request, pk=None):
        """Get public contestant data for shareable pages"""
        contestant = self.get_object()
        serializer = ContestantPublicSerializer(contestant)
        return Response(serializer.data)


# ── Payment ViewSet ──────────────────────────────────────────────────────────

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related('event', 'verified_by')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event', 'status', 'payment_purpose']
    search_fields = ['mpesa_code', 'phone_number']
    ordering_fields = ['created_at', 'amount']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]

    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentSerializer

    def retrieve(self, request, *args, **kwargs):
        payment = self.get_object()
        # If payment is pending and has a PesaPal tracking ID, check status
        if payment.status == 'pending' and payment.pesapal_tracking_id:
            try:
                status_result = get_transaction_status(
                    order_tracking_id=payment.pesapal_tracking_id,
                    merchant_reference=payment.pesapal_merchant_ref,
                )
                pesapal_status = status_result.get('payment_status', 'UNKNOWN')
                payment.pesapal_response['poll_status'] = status_result.get('raw', {})
                if pesapal_status == 'COMPLETED':
                    payment.status = 'successful'
                    raw = status_result.get('raw', {})
                    payment.mpesa_code = _short_payment_reference(raw, payment.mpesa_code)
                    payment.save()
                    _process_successful_payment(payment)
                elif pesapal_status in ('FAILED', 'INVALID'):
                    payment.status = 'failed'
                    payment.save()
                else:
                    payment.save()
            except Exception:
                pass
        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    def perform_create(self, serializer):
        payment = serializer.save()

        if payment.status == 'successful':
            if self.request and self.request.user and self.request.user.is_authenticated:
                payment.verified_by = self.request.user
                payment.verified_at = timezone.now()
                payment.save(update_fields=['verified_by', 'verified_at', 'updated_at'])

            results = {}
            if payment.payment_purpose == 'ticket':
                if not payment.tickets.exists():
                    event = payment.event
                    event_year = event.start_date.year
                    created = []
                    ticket_breakdown = payment.ticket_breakdown or {}
                    if ticket_breakdown:
                        for category_id, qty in ticket_breakdown.items():
                            try:
                                ticket_category = TicketCategory.objects.get(id=int(category_id), event=event)
                            except TicketCategory.DoesNotExist:
                                continue

                            qty = max(1, int(qty))
                            for _ in range(qty):
                                ticket_code = generate_ticket_code(event.ticket_prefix, event_year)
                                ticket = Ticket.objects.create(
                                    event=event,
                                    ticket_category=ticket_category,
                                    payment=payment,
                                    ticket_code=ticket_code,
                                    full_name=payment.full_name or payment.phone_number,
                                    email=payment.email or '',
                                    phone=payment.phone_number,
                                )
                                created.append({'ticket_id': ticket.id, 'ticket_code': ticket.ticket_code, 'ticket_category': ticket_category.id})

                            ticket_category.available = max(0, int(ticket_category.available or 0) - qty)
                            ticket_category.save(update_fields=['available'])
                    else:
                        ticket_category = payment.ticket_category
                        if ticket_category and ticket_category.event_id != event.id:
                            ticket_category = None

                        quantity = int(payment.ticket_quantity or 1)
                        quantity = max(1, quantity)

                        for _ in range(quantity):
                            ticket_code = generate_ticket_code(event.ticket_prefix, event_year)
                            ticket = Ticket.objects.create(
                                event=event,
                                ticket_category=ticket_category,
                                payment=payment,
                                ticket_code=ticket_code,
                                full_name=payment.full_name or payment.phone_number,
                                email=payment.email or '',
                                phone=payment.phone_number,
                            )
                            created.append({'ticket_id': ticket.id, 'ticket_code': ticket.ticket_code, 'ticket_category': ticket_category.id if ticket_category else None})

                        if ticket_category:
                            ticket_category.available = max(0, int(ticket_category.available or 0) - quantity)
                            ticket_category.save(update_fields=['available'])

                    results = {'tickets': created, 'ticket_count': len(created)}
            elif payment.payment_purpose == 'vote':
                if payment.contestant_id and not payment.vote_transactions.exists():
                    event = payment.event
                    vote_count = calculate_vote_count(payment.amount, event.vote_price)
                    if vote_count > 0:
                        vote = VoteTransaction.objects.create(
                            event=event,
                            contestant=payment.contestant,
                            payment=payment,
                            vote_count=vote_count,
                            phone_number=payment.phone_number,
                            mpesa_code=payment.mpesa_code or '',
                            status='successful',
                        )
                        results = {'vote_id': vote.id, 'vote_count': vote_count, 'contestant': payment.contestant.name}

            AuditLog.objects.create(
                action='payment_verified',
                actor=self.request.user.username if self.request.user.is_authenticated else 'admin',
                details=json.dumps({
                    'payment_id': payment.id,
                    'mpesa_code': payment.mpesa_code,
                    'amount': str(payment.amount),
                    'payment_purpose': payment.payment_purpose,
                    'event_id': payment.event_id,
                    'results': results,
                }),
                event=payment.event,
            )


# ── Ticket ViewSet ───────────────────────────────────────────────────────────

class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ticket.objects.all().select_related('event', 'ticket_category')
    serializer_class = TicketSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event', 'ticket_category', 'payment', 'is_used']
    search_fields = ['ticket_code', 'full_name', 'email', 'phone']
    ordering_fields = ['issued_at', 'created_at']
    ordering = ['-issued_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TicketDetailSerializer
        return TicketSerializer

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """Look up a ticket by ticket_code via query param."""
        code = request.query_params.get('code', '').strip()
        if not code:
            return Response(
                {'error': 'code query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            ticket = Ticket.objects.get(ticket_code=code)
            serializer = TicketDetailSerializer(ticket)
            return Response(serializer.data)
        except Ticket.DoesNotExist:
            return Response(
                {'error': f'Ticket with code "{code}" not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


# ── VoteTransaction ViewSet ──────────────────────────────────────────────────

class VoteTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VoteTransaction.objects.all().select_related('event', 'contestant', 'payment')
    serializer_class = VoteTransactionSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event', 'contestant', 'status']
    search_fields = ['mpesa_code', 'phone_number']
    ordering_fields = ['created_at', 'vote_count']
    ordering = ['-created_at']


# ── AuditLog ViewSet ─────────────────────────────────────────────────────────

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().select_related('event')
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['action', 'event']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    permission_classes = [IsAdminUser]


# ── Standalone API Endpoints ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def verify_votes_by_phone(request):
    """
    Public endpoint: verify all votes for a phone number across all events.
    Filters by payment_purpose='vote' to exclude ticket purchases.
    """
    phone = request.query_params.get('phone', '').strip()
    if not phone:
        return Response(
            {'error': 'phone query parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Search by last 9 digits for flexibility
    search_digits = phone[-9:] if len(phone) >= 9 else phone
    
    # Find payments with payment_purpose='vote' for this phone
    vote_payments = Payment.objects.filter(
        phone_number__contains=search_digits,
        payment_purpose='vote',
        status='successful'
    ).select_related('event', 'contestant')
    
    # Get all vote transactions associated with these payments
    votes = VoteTransaction.objects.filter(
        payment__in=vote_payments,
        status='successful'
    ).select_related('contestant', 'event').order_by('-created_at')

    from .utils import mask_phone_number
    serializer = VoteVerifySerializer(votes, many=True)
    total_votes = votes.aggregate(total=Sum('vote_count'))['total'] or 0
    return Response({
        'phone_masked': mask_phone_number(phone),
        'total_transactions': votes.count(),
        'total_votes': total_votes,
        'votes': serializer.data,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def ticket_lookup(request):
    """
    Public endpoint: look up tickets by phone number (payment_purpose='ticket' only).
    Also supports looking up a single ticket by ticket_code.
    """
    code = request.query_params.get('code', '').strip()
    phone = request.query_params.get('phone', '').strip()
    
    # If code is provided, look up single ticket by code
    if code:
        try:
            ticket = Ticket.objects.select_related('event', 'ticket_category').get(ticket_code=code)
            serializer = TicketDetailSerializer(ticket)
            return Response(serializer.data)
        except Ticket.DoesNotExist:
            return Response(
                {'error': f'Ticket with code "{code}" not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    # If phone is provided, look up all tickets for that phone (ticket payments only)
    if phone:
        # Search by last 9 digits for flexibility
        search_digits = phone[-9:] if len(phone) >= 9 else phone
        
        # Find payments with payment_purpose='ticket' for this phone
        ticket_payments = Payment.objects.filter(
            phone_number__contains=search_digits,
            payment_purpose='ticket',
            status='successful'
        ).select_related('event')
        
        # Get all tickets associated with these payments
        tickets = Ticket.objects.filter(
            payment__in=ticket_payments
        ).select_related('event', 'ticket_category', 'payment').order_by('-issued_at')
        
        serializer = TicketDetailSerializer(tickets, many=True)
        return Response({
            'phone_masked': phone[:4] + '***' + phone[-4:] if len(phone) >= 8 else phone,
            'total_tickets': tickets.count(),
            'tickets': serializer.data,
        })
    
    return Response(
        {'error': 'Either code or phone query parameter is required.'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def ticket_pdf_download(request):
    """Public endpoint: download a ticket as a PDF, looked up by ticket_code.

    A reliable fallback so an attendee can always get their ticket even if the
    web ticket page fails to load — the browser downloads the PDF directly.
    """
    from django.http import HttpResponse

    code = request.query_params.get('code', '').strip()
    if not code:
        return Response(
            {'error': 'code query parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        ticket = Ticket.objects.select_related('event', 'ticket_category').get(ticket_code=code)
    except Ticket.DoesNotExist:
        return Response(
            {'error': f'Ticket with code "{code}" not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        pdf_buffer = generate_ticket_pdf(ticket, ticket.event)
    except Exception as e:
        logger.error("Failed to generate ticket PDF for %s: %s", code, e)
        return Response(
            {'error': 'Failed to generate the ticket PDF.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    # Ticket codes contain "#"/possibly "/", which are illegal in a filename.
    safe_code = code.replace('#', '-').replace('/', '-')
    response['Content-Disposition'] = f'attachment; filename="ticket_{safe_code}.pdf"'
    return response


def _get_checkin_event(request):
    """Return (event, error_response). Validates the per-event check-in PIN.

    Expects request.data to contain `event` (id) and `pin`.
    """
    event_id = request.data.get('event')
    if not event_id:
        return None, Response({'error': 'event is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return None, Response({'error': 'Event not found.'}, status=status.HTTP_404_NOT_FOUND)

    configured = (event.checkin_pin or '').strip()
    if not configured:
        return None, Response(
            {'error': 'Check-in is not enabled for this event. Set a Check-in PIN in the admin.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    supplied = str(request.data.get('pin', '')).strip()
    if supplied != configured:
        return None, Response({'error': 'Invalid PIN.'}, status=status.HTTP_401_UNAUTHORIZED)
    return event, None


@api_view(['GET'])
@permission_classes([AllowAny])
def checkin_events(request):
    """Public list of events that have check-in enabled (a PIN set).

    Only exposes non-sensitive fields so staff can pick an event to check in.
    """
    events = Event.objects.exclude(checkin_pin='').order_by('-start_date')
    data = [
        {
            'id': e.id,
            'title': e.title,
            'start_date': e.start_date,
            'venue_name': e.venue_name,
            'city': e.city,
        }
        for e in events
    ]
    return Response({'count': len(data), 'events': data})


@api_view(['POST'])
@permission_classes([AllowAny])
def checkin_list(request):
    """PIN-protected list of tickets for one event's gate check-in page.

    Body: { event (id), pin, search? }
    """
    event, err = _get_checkin_event(request)
    if err:
        return err

    tickets = Ticket.objects.select_related('event', 'ticket_category').filter(event=event)

    search = str(request.data.get('search', '')).strip()
    if search:
        tickets = tickets.filter(
            Q(ticket_code__icontains=search)
            | Q(full_name__icontains=search)
            | Q(phone__icontains=search)
            | Q(email__icontains=search)
        )

    tickets = tickets.order_by('full_name')
    data = [
        {
            'id': t.id,
            'ticket_code': t.ticket_code,
            'full_name': t.full_name,
            'phone': t.phone,
            'email': t.email,
            'event_title': t.event.title if t.event else '',
            'ticket_category_name': t.ticket_category.name if t.ticket_category else 'General',
            'is_used': t.is_used,
            'issued_at': t.issued_at,
        }
        for t in tickets
    ]
    return Response({'count': len(data), 'event_title': event.title, 'tickets': data})


@api_view(['POST'])
@permission_classes([AllowAny])
def checkin_toggle(request):
    """PIN-protected check-in toggle. Marks a ticket used/unused (never deletes).

    Body: { event (id), pin, ticket_id (or ticket_code), is_used (bool) }
    """
    event, err = _get_checkin_event(request)
    if err:
        return err

    ticket_id = request.data.get('ticket_id')
    ticket_code = request.data.get('ticket_code')
    try:
        if ticket_id:
            ticket = Ticket.objects.get(id=ticket_id, event=event)
        elif ticket_code:
            ticket = Ticket.objects.get(ticket_code=str(ticket_code).strip(), event=event)
        else:
            return Response(
                {'error': 'ticket_id or ticket_code is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

    is_used = request.data.get('is_used', True)
    ticket.is_used = bool(is_used)
    ticket.save(update_fields=['is_used'])

    return Response({
        'id': ticket.id,
        'ticket_code': ticket.ticket_code,
        'full_name': ticket.full_name,
        'is_used': ticket.is_used,
    })


# ── Finance dashboard (PIN-protected revenue reporting) ──────────────────────

def _finance_pin_ok(request):
    """Validate the global finance PIN. Returns (ok: bool, error_response)."""
    configured = (FinanceSettings.load().pin or '').strip()
    if not configured:
        return False, Response(
            {'error': 'The finance page is not enabled. Set a Finance PIN in the admin (Events - Finance Settings).'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    supplied = str(request.data.get('pin', '')).strip()
    if supplied != configured:
        return False, Response({'error': 'Invalid PIN.'}, status=status.HTTP_401_UNAUTHORIZED)
    return True, None


def _parse_finance_filters(data):
    """Extract the common revenue filter params from request data."""
    return {
        'date_from': str(data.get('date_from') or '').strip(),
        'date_to': str(data.get('date_to') or '').strip(),
        'source': str(data.get('source') or 'all').strip().lower(),
        'event': data.get('event') or None,
        'phone': str(data.get('phone') or '').strip(),
        'mpesa_code': str(data.get('mpesa_code') or '').strip(),
        'status': str(data.get('status') or 'successful').strip().lower(),
    }


def _build_finance_rows(f):
    """Apply filters across Payment (vote/ticket) and Contribution.

    Returns (rows, totals). Money totals count SUCCESSFUL payments only, so they
    reflect what was actually received regardless of the row status filter.
    """
    from datetime import datetime

    def parse_date(s):
        try:
            return datetime.strptime(s, '%Y-%m-%d').date() if s else None
        except ValueError:
            return None

    date_from = parse_date(f['date_from'])
    date_to = parse_date(f['date_to'])
    source = f['source'] or 'all'
    want_vote = source in ('all', 'vote')
    want_ticket = source in ('all', 'ticket')
    want_contribution = source in ('all', 'contribution')

    rows = []

    purposes = []
    if want_vote:
        purposes.append('vote')
    if want_ticket:
        purposes.append('ticket')
    if purposes:
        pq = Payment.objects.select_related('event', 'contestant', 'ticket_category').filter(payment_purpose__in=purposes)
        if f['status'] != 'all':
            pq = pq.filter(status=f['status'])
        if f['event']:
            pq = pq.filter(event_id=f['event'])
        if f['phone']:
            pq = pq.filter(phone_number__icontains=f['phone'])
        if f['mpesa_code']:
            pq = pq.filter(mpesa_code__icontains=f['mpesa_code'])
        if date_from:
            pq = pq.filter(created_at__date__gte=date_from)
        if date_to:
            pq = pq.filter(created_at__date__lte=date_to)
        for p in pq:
            if p.payment_purpose == 'vote':
                ref = p.contestant.name if p.contestant else 'Vote'
            else:
                cat = p.ticket_category.name if p.ticket_category else 'General'
                ref = f"{cat} x{p.ticket_quantity}"
            rows.append({
                'id': f"{p.payment_purpose}-{p.id}",
                'source': p.payment_purpose,
                'date': p.created_at,
                'name': p.full_name or '',
                'phone': p.phone_number or '',
                'mpesa_code': p.mpesa_code or '',
                'amount': float(p.amount or 0),
                'status': p.status,
                'event_title': p.event.title if p.event else '',
                'reference': ref,
            })

    # Contributions have no event, so skip them when an event filter is applied
    if want_contribution and not f['event']:
        cq = Contribution.objects.all()
        if f['status'] != 'all':
            cq = cq.filter(status=f['status'])
        if f['phone']:
            cq = cq.filter(phone_number__icontains=f['phone'])
        if f['mpesa_code']:
            cq = cq.filter(mpesa_code__icontains=f['mpesa_code'])
        if date_from:
            cq = cq.filter(created_at__date__gte=date_from)
        if date_to:
            cq = cq.filter(created_at__date__lte=date_to)
        for c in cq:
            rows.append({
                'id': f"contribution-{c.id}",
                'source': 'contribution',
                'date': c.created_at,
                'name': c.full_name or '',
                'phone': c.phone_number or '',
                'mpesa_code': c.mpesa_code or '',
                'amount': float(c.amount or 0),
                'status': c.status,
                'event_title': '',
                'reference': 'Contribution',
            })

    rows.sort(key=lambda r: r['date'], reverse=True)

    def sum_source(src):
        return round(sum(r['amount'] for r in rows if r['source'] == src and r['status'] == 'successful'), 2)

    totals = {
        'vote': sum_source('vote'),
        'ticket': sum_source('ticket'),
        'contribution': sum_source('contribution'),
    }
    totals['grand'] = round(totals['vote'] + totals['ticket'] + totals['contribution'], 2)
    return rows, totals


@api_view(['POST'])
@permission_classes([AllowAny])
def finance_report(request):
    """PIN-protected revenue report across voting, ticketing and contributions.

    Body: { pin, date_from?, date_to?, source?, event?, phone?, mpesa_code?, status? }
    """
    ok, err = _finance_pin_ok(request)
    if not ok:
        return err
    f = _parse_finance_filters(request.data)
    rows, totals = _build_finance_rows(f)
    transactions = [{**r, 'date': r['date'].isoformat()} for r in rows]
    return Response({
        'count': len(transactions),
        'totals': totals,
        'counts': {
            'vote': sum(1 for r in rows if r['source'] == 'vote'),
            'ticket': sum(1 for r in rows if r['source'] == 'ticket'),
            'contribution': sum(1 for r in rows if r['source'] == 'contribution'),
        },
        'events': list(Event.objects.order_by('-start_date').values('id', 'title')),
        'transactions': transactions,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def finance_statement_pdf(request):
    """PIN-protected PDF statement of the filtered revenue report.

    Body: same filters as finance_report.
    """
    ok, err = _finance_pin_ok(request)
    if not ok:
        return err
    f = _parse_finance_filters(request.data)
    rows, totals = _build_finance_rows(f)
    from django.http import HttpResponse
    from .finance_pdf import generate_finance_statement_pdf
    buffer = generate_finance_statement_pdf(rows, totals, f)
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    filename = f"statement-{timezone.now().strftime('%Y%m%d-%H%M')}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def initiate_contribution_payment(request):
    """Initiate an M-Pesa STK Push for a public contribution/donation.

    Contributions are tracked in the separate Contribution model (kept apart
    from tickets/votes so vote counts are never affected). Confirmation happens
    asynchronously via the shared mpesa-callback endpoint.
    """
    serializer = ContributionCheckoutSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    phone_number = (data.get('phone_number') or '').strip()
    if not phone_number:
        return Response(
            {'success': False, 'error': 'An M-Pesa phone number is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    contribution = Contribution.objects.create(
        full_name=data['full_name'],
        email=data['email'],
        phone_number=phone_number,
        amount=data['amount'],
    )

    # Initiate STK Push. Safaricom caps AccountReference at ~12 chars.
    callback_url = _absolute_backend_url(request, '/api/events/mpesa-callback/')
    account_reference = (data['full_name'] or '').strip()[:12] or 'CONTRIBUTE'
    stk_result = initiate_stk_push(
        phone_number=phone_number,
        amount=contribution.amount,
        account_reference=account_reference,
        transaction_desc='Contribution',
        callback_url=callback_url,
    )

    contribution.stk_response = stk_result.get('raw', {})

    if not stk_result.get('success'):
        contribution.status = 'failed'
        contribution.save()
        return Response({
            'success': False,
            'error': stk_result.get('error', 'Failed to send the M-Pesa prompt.'),
            'contribution_id': contribution.id,
        }, status=status.HTTP_502_BAD_GATEWAY)

    contribution.checkout_request_id = stk_result.get('checkout_request_id', '')
    contribution.merchant_request_id = stk_result.get('merchant_request_id', '')
    contribution.save()

    return Response({
        'success': True,
        'checkout_request_id': contribution.checkout_request_id,
        'merchant_request_id': contribution.merchant_request_id,
        'contribution_id': contribution.id,
        'message': stk_result.get('customer_message') or 'Check your phone for the M-Pesa prompt to complete your contribution.',
    })


def _process_successful_payment(payment):
    event = payment.event
    processor = EventViewSet()
    if payment.payment_purpose == 'ticket':
        if payment.tickets.exists():
            return {'message': 'Tickets already issued.'}
        return processor._process_ticket_payment(payment, event)
    if payment.payment_purpose == 'vote':
        if payment.vote_transactions.exists():
            return {'message': 'Votes already counted.'}
        return processor._process_vote_payment(payment, event, None)
    return {}


def _handle_contribution_callback(contribution, processed, ack):
    """Confirm or fail a Contribution from an M-Pesa STK callback.

    Idempotent: repeated callbacks for an already-successful contribution are
    acknowledged without re-notifying.
    """
    contribution.stk_response = processed.get('raw', {})
    result_code = processed.get('result_code')

    if result_code != 0:
        if contribution.status != 'successful':
            contribution.status = 'failed'
        contribution.save()
        logger.info(
            'mpesa_callback: contribution %s failed (ResultCode=%s, %s)',
            contribution.id, result_code, processed.get('result_desc')
        )
        return ack

    already_successful = contribution.status == 'successful'
    contribution.status = 'successful'
    receipt = processed.get('mpesa_receipt_number')
    if receipt:
        contribution.mpesa_code = receipt
    contribution.save()

    if not already_successful:
        try:
            send_telegram_message(
                f"\U0001f4b0 <b>New Contribution!</b>\n\n"
                f"Name: {contribution.full_name}\n"
                f"Amount: KES {contribution.amount}\n"
                f"Phone: {contribution.phone_number}\n"
                f"M-Pesa Code: {contribution.mpesa_code or '-'}"
            )
        except Exception:
            pass
        try:
            AuditLog.objects.create(
                action='payment_verified',
                actor='system',
                details=json.dumps({
                    'contribution_id': contribution.id,
                    'mpesa_code': contribution.mpesa_code,
                    'amount': str(contribution.amount),
                    'payment_purpose': 'donation',
                    'source': 'mpesa_callback',
                }),
                event=None,
            )
        except Exception:
            logger.exception('mpesa_callback: failed to write AuditLog for contribution %s', contribution.id)

    return ack


@api_view(['GET'])
@permission_classes([AllowAny])
def contribution_status(request, pk):
    """Public: poll the status of a contribution by id (for the STK flow)."""
    contribution = Contribution.objects.filter(pk=pk).first()
    if not contribution:
        return Response({'error': 'Contribution not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ContributionSerializer(contribution).data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def mpesa_callback(request):
    """
    M-Pesa Daraja STK Push callback endpoint.
    Processes payment callbacks and routes based on payment_purpose.

    IMPORTANT: This endpoint always responds with HTTP 200 and the
    Safaricom-expected acknowledgement body. Returning any non-200 status makes
    Safaricom retry the same callback repeatedly, which would double-count votes
    or resend tickets. All errors are logged instead of surfaced as 500s.
    """
    ack = Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})

    try:
        callback_data = request.data
    except Exception:
        callback_data = {}

    try:
        processed = process_callback(callback_data)
        checkout_request_id = processed.get('checkout_request_id')

        if not checkout_request_id:
            logger.warning('mpesa_callback: missing CheckoutRequestID. Raw=%s', callback_data)
            return ack

        payment = Payment.objects.filter(checkout_request_id=checkout_request_id).first()
        if not payment:
            # Not a ticket/vote payment — it may be a contribution/donation.
            contribution = Contribution.objects.filter(checkout_request_id=checkout_request_id).first()
            if contribution:
                return _handle_contribution_callback(contribution, processed, ack)
            logger.warning('mpesa_callback: no payment/contribution for CheckoutRequestID=%s', checkout_request_id)
            return ack

        payment.stk_response = processed.get('raw', {})

        result_code = processed.get('result_code')

        # Non-zero result code => customer cancelled / failed / timed out.
        if result_code != 0:
            if payment.status != 'successful':
                payment.status = 'failed'
            payment.save()
            logger.info(
                'mpesa_callback: payment %s failed (ResultCode=%s, %s)',
                payment.id, result_code, processed.get('result_desc')
            )
            return ack

        # Idempotency guard: if we already processed this payment, do nothing.
        already_processed = (
            payment.status == 'successful'
            and (payment.tickets.exists() or payment.vote_transactions.exists()
                 or payment.payment_purpose == 'donation')
        )

        payment.status = 'successful'
        receipt = processed.get('mpesa_receipt_number')
        if receipt:
            payment.mpesa_code = receipt
        payment.save()

        if already_processed:
            logger.info('mpesa_callback: payment %s already processed, acknowledging retry', payment.id)
            return ack

        # Route based on payment_purpose
        if payment.payment_purpose == 'ticket':
            results = EventViewSet()._process_ticket_payment(payment, payment.event)
            purpose = 'ticket'
        elif payment.payment_purpose == 'vote':
            results = EventViewSet()._process_vote_payment(payment, payment.event, None)
            purpose = 'vote'
        else:
            results = None
            purpose = payment.payment_purpose or 'donation'

        try:
            AuditLog.objects.create(
                action='payment_verified',
                actor='system',
                details=json.dumps({
                    'payment_id': payment.id,
                    'mpesa_code': payment.mpesa_code,
                    'amount': str(payment.amount),
                    'payment_purpose': purpose,
                    'source': 'mpesa_callback',
                    'results': results,
                }),
                event=payment.event,
            )
        except Exception:
            logger.exception('mpesa_callback: failed to write AuditLog for payment %s', payment.id)

        return ack

    except Exception:
        logger.exception('mpesa_callback: unexpected error. Raw=%s', callback_data)
        return ack


# ── Helper ───────────────────────────────────────────────────────────────────

def _cloudinary_url(field_value, resource_type='image'):
    import cloudinary as cd
    if not field_value:
        return None
    url = str(field_value)
    if url.startswith(('http://', 'https://')):
        return url
    return cd.CloudinaryResource(url, default_resource_type=resource_type).build_url()


# ── PesaPal IPN + Redirect ────────────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def pesapal_ipn_callback(request):
    """
    PesaPal IPN (Instant Payment Notification) endpoint.
    PesaPal sends a GET request with OrderTrackingId and OrderMerchantReference
    whenever the payment state changes.

    Handles both Contribution and Payment (vote/ticket) records.
    The OrderMerchantReference encodes the type:
      MCK-VOTE-{id}    → Payment with payment_type='vote'
      MCK-TICKET-{id}  → Payment with payment_type='ticket'
      MCK-CONTRIB-*    → Contribution
    """
    tracking_id = request.query_params.get('OrderTrackingId') or request.query_params.get('order_tracking_id', '')
    merchant_ref = request.query_params.get('OrderMerchantReference') or request.query_params.get('order_merchant_reference', '')

    if not tracking_id and not merchant_ref:
        return Response({'error': 'Missing OrderTrackingId or OrderMerchantReference.'}, status=status.HTTP_400_BAD_REQUEST)

    # ── Try Contribution first ─────────────────────────────────────────────
    contribution = None
    if merchant_ref:
        contribution = Contribution.objects.filter(pesapal_merchant_ref=merchant_ref).first()
    if not contribution and tracking_id:
        contribution = Contribution.objects.filter(pesapal_tracking_id=tracking_id).first()

    if contribution:
        status_result = get_transaction_status(
            order_tracking_id=tracking_id or contribution.pesapal_tracking_id,
            merchant_reference=merchant_ref or contribution.pesapal_merchant_ref,
        )
        payment_status = status_result.get('payment_status', 'UNKNOWN')

        contribution.pesapal_response['ipn_status'] = status_result.get('raw', {})

        if payment_status == 'COMPLETED':
            if contribution.status != 'successful':
                contribution.status = 'successful'
                contribution.save()
                send_telegram_message(
                    f"<b>New Contribution Confirmed</b>\n\n"
                    f"Name: {contribution.full_name}\n"
                    f"Amount: KES {contribution.amount}\n"
                    f"Phone: {contribution.phone_number or '-'}\n"
                    f"Tracking: {tracking_id or '-'}"
                )
            else:
                contribution.save()
        elif payment_status in ('FAILED', 'INVALID'):
            contribution.status = 'failed'
            contribution.save()
        else:
            contribution.save()

        return Response({'status': 'success'})

    # ── Try Payment (vote / ticket) ─────────────────────────────────────────
    payment = None
    if merchant_ref:
        payment = Payment.objects.filter(pesapal_merchant_ref=merchant_ref).first()
    if not payment and tracking_id:
        payment = Payment.objects.filter(pesapal_tracking_id=tracking_id).first()

    if payment:
        status_result = get_transaction_status(
            order_tracking_id=tracking_id or payment.pesapal_tracking_id,
            merchant_reference=merchant_ref or payment.pesapal_merchant_ref,
        )
        payment_status = status_result.get('payment_status', 'UNKNOWN')

        payment.pesapal_response['ipn_status'] = status_result.get('raw', {})

        if payment_status == 'COMPLETED':
            if payment.status != 'successful':
                payment.status = 'successful'
                # Try to extract M-Pesa reference from PesaPal response
                raw = status_result.get('raw', {})
                payment.mpesa_code = _short_payment_reference(raw, payment.mpesa_code)
                payment.save()
                processing = _process_successful_payment(payment)

                # Ticket processing already sends its own detailed Telegram message.
                event = payment.event
                if payment.payment_purpose == 'vote':
                    contestant = payment.contestant
                    vote_count = calculate_vote_count(payment.amount, event.vote_price)
                    send_telegram_message(
                        f"\U0001f5f3 <b>New Vote Confirmed!</b>\n\n"
                        f"Event: {event.title}\n"
                        f"Contestant: {contestant.name if contestant else '-'}\n"
                        f"Votes: {vote_count}\n"
                        f"Amount: KES {payment.amount}\n"
                        f"Phone: {payment.phone_number}\n"
                        f"Tracking: {tracking_id or '-'}"
                    )
                AuditLog.objects.create(
                    action='payment_verified',
                    actor='system',
                    details=json.dumps({
                        'payment_id': payment.id,
                        'amount': str(payment.amount),
                        'payment_purpose': payment.payment_purpose,
                        'source': 'pesapal_ipn',
                        'tracking_id': tracking_id,
                        'merchant_ref': merchant_ref,
                        'processing': processing,
                    }),
                    event=event,
                )
            else:
                payment.save()
        elif payment_status in ('FAILED', 'INVALID'):
            payment.status = 'failed'
            payment.save()
        else:
            payment.save()

        return Response({'status': 'success'})

    return Response({'error': 'Matching record not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def pesapal_payment_redirect(request):
    """
    PesaPal redirects the user's browser here after they complete (or abandon) payment.
    Verifies the status and redirects to the frontend with a status param.

    Routes:
      Contribution → /contribute?payment=success|failed
      Payment (vote) → /voting?payment=success|failed
      Payment (ticket) → /events/{event_id}/checkout/success?payment=success|failed
    """
    tracking_id = request.query_params.get('OrderTrackingId') or request.query_params.get('order_tracking_id', '')
    merchant_ref = request.query_params.get('OrderMerchantReference') or request.query_params.get('order_merchant_reference', '')

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')

    # Try to verify with PesaPal API
    payment_status = 'UNKNOWN'
    if tracking_id or merchant_ref:
        status_result = get_transaction_status(
            order_tracking_id=tracking_id,
            merchant_reference=merchant_ref,
        )
        payment_status = status_result.get('payment_status', 'UNKNOWN')

        # ── Try Contribution ───────────────────────────────────────────────
        contribution = None
        if merchant_ref:
            contribution = Contribution.objects.filter(pesapal_merchant_ref=merchant_ref).first()
        if not contribution and tracking_id:
            contribution = Contribution.objects.filter(pesapal_tracking_id=tracking_id).first()

        if contribution:
            if payment_status == 'COMPLETED' and contribution.status != 'successful':
                contribution.status = 'successful'
                contribution.pesapal_response['redirect_status'] = status_result.get('raw', {})
                contribution.save()
                send_telegram_message(
                    f"<b>New Contribution Confirmed</b>\n\n"
                    f"Name: {contribution.full_name}\n"
                    f"Amount: KES {contribution.amount}\n"
                    f"Phone: {contribution.phone_number or '-'}\n"
                    f"Tracking: {tracking_id or '-'}"
                )
            elif payment_status in ('FAILED', 'INVALID'):
                contribution.status = 'failed'
                contribution.save()

        # ── Try Payment (vote / ticket) ──────────────────────────────────────
        payment = None
        if merchant_ref:
            payment = Payment.objects.filter(pesapal_merchant_ref=merchant_ref).first()
        if not payment and tracking_id:
            payment = Payment.objects.filter(pesapal_tracking_id=tracking_id).first()

        if payment:
            if payment_status == 'COMPLETED' and payment.status != 'successful':
                payment.status = 'successful'
                raw = status_result.get('raw', {})
                payment.mpesa_code = _short_payment_reference(raw, payment.mpesa_code)
                payment.pesapal_response['redirect_status'] = status_result.get('raw', {})
                payment.save()
                _process_successful_payment(payment)
            elif payment_status in ('FAILED', 'INVALID'):
                payment.status = 'failed'
                payment.save()

        # ── Redirect to frontend ─────────────────────────────────────────────
        if payment_status == 'COMPLETED':
            from django.shortcuts import redirect
            if payment:
                if payment.payment_purpose == 'vote':
                    return redirect(f'{frontend_url}/voting?payment=success')
                elif payment.payment_purpose == 'ticket':
                    return redirect(f'{frontend_url}/events/{payment.event_id}/checkout/success?payment=success')
            # Default: contribution
            return redirect(f'{frontend_url}/contribute?payment=success')

    from django.shortcuts import redirect as dj_redirect
    # On failure, try to route to the right page
    payment = None
    if merchant_ref:
        payment = Payment.objects.filter(pesapal_merchant_ref=merchant_ref).first()
    if not payment and tracking_id:
        payment = Payment.objects.filter(pesapal_tracking_id=tracking_id).first()
    if payment:
        if payment.payment_purpose == 'vote':
            return dj_redirect(f'{frontend_url}/voting?payment=failed')
        elif payment.payment_purpose == 'ticket':
            return dj_redirect(f'{frontend_url}/events/{payment.event_id}/checkout/success?payment=failed')
    return dj_redirect(f'{frontend_url}/contribute?payment=failed')
