from rest_framework import serializers
from django.db.models import Sum, Count
from .models import (
    Event, EventCategory,
    TicketCategory, ContestantCategory, Contestant, GuestSpeaker, Payment, Contribution, Ticket, VoteTransaction, AuditLog
)
import cloudinary


def _cloudinary_url(field_value, resource_type='image', width=None, height=None, crop=None):
    """Build an optimized Cloudinary URL with auto-format and auto-quality."""
    if not field_value:
        return None
    url = str(field_value)

    if url.startswith('r2/'):
        return field_value.url

    transformation = {
        'fetch_format': 'auto',
        'quality': 'auto:eco',
    }
    if width:
        transformation['width'] = width
    if height:
        transformation['height'] = height
    if crop:
        transformation['crop'] = crop

    if url.startswith(('http://', 'https://')):
        if 'res.cloudinary.com' in url and '/upload/' in url:
            parts = []
            if crop:
                parts.append(f'c_{crop}')
            if width:
                parts.append(f'w_{width}')
            if height:
                parts.append(f'h_{height}')
            parts.extend(['f_auto', 'q_auto:eco'])
            return url.replace('/upload/', f"/upload/{','.join(parts)}/", 1)
        return url
    
    return cloudinary.CloudinaryResource(
        url, default_resource_type=resource_type
    ).build_url(transformation=[transformation])


# ── Event ────────────────────────────────────────────────────────────────────

class EventSerializer(serializers.ModelSerializer):
    featured_image_url = serializers.SerializerMethodField()
    contestant_count = serializers.SerializerMethodField()
    total_votes = serializers.SerializerMethodField()
    is_voting_active = serializers.ReadOnlyField()
    ticket_categories = serializers.SerializerMethodField()
    guest_speakers = serializers.SerializerMethodField()
    contestant_categories = serializers.SerializerMethodField()

    def get_featured_image_url(self, obj):
        return _cloudinary_url(obj.featured_image)

    def get_contestant_count(self, obj):
        return obj.contestants.filter(is_active=True).count()

    def get_total_votes(self, obj):
        # Respect result_visibility: only expose totals when fully public
        if getattr(obj, 'result_visibility', 'full_live') != 'full_live':
            return None
        result = obj.vote_transactions.filter(status='successful').aggregate(
            total=Sum('vote_count')
        )
        return result['total'] or 0

    def get_ticket_categories(self, obj):
        cats = obj.ticket_categories.filter(is_active=True).order_by('order', 'price')
        return [{
            'id': c.id,
            'name': c.name,
            'price': 'Free' if c.price == 0 else f'KSh {int(c.price):,}',
            'price_value': str(c.price),
            'description': c.description,
            'available': c.available,
            'total': c.total,
        } for c in cats]

    def get_guest_speakers(self, obj):
        speakers = obj.guest_speakers.filter(is_active=True).order_by('order', 'name')
        return GuestSpeakerSerializer(speakers, many=True).data

    def get_contestant_categories(self, obj):
        cats = obj.contestant_categories.filter(is_active=True).order_by('order', 'name')
        return ContestantCategorySerializer(cats, many=True).data

    class Meta:
        model = Event
        fields = '__all__'


class EventListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    featured_image_url = serializers.SerializerMethodField()
    is_voting_active = serializers.ReadOnlyField()
    contestant_count = serializers.SerializerMethodField()

    def get_featured_image_url(self, obj):
        return _cloudinary_url(obj.featured_image)

    def get_contestant_count(self, obj):
        return obj.contestants.filter(is_active=True).count()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'slug', 'event_type', 'event_status',
            'start_date', 'end_date', 'venue_name', 'city', 'country',
            'featured_image_url', 'featured', 'published',
            'voting_enabled', 'vote_price', 'is_voting_active',
            'result_visibility', 'contestant_count',
            'payment_method', 'till_number', 'account_name',
        ]


# ── EventCategory ────────────────────────────────────────────────────────────

class EventCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCategory
        fields = '__all__'


# ── TicketCategory ───────────────────────────────────────────────────────────

class TicketCategorySerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = TicketCategory
        fields = '__all__'


class ContestantCategorySerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = ContestantCategory
        fields = '__all__'


# ── Contestant ───────────────────────────────────────────────────────────────

class ContestantSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    vote_count = serializers.SerializerMethodField()
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_slug = serializers.CharField(source='event.slug', read_only=True)
    contestant_category_name = serializers.CharField(source='contestant_category.name', read_only=True, default=None)

    def get_photo_url(self, obj):
        return _cloudinary_url(obj.photo, width=900, height=1200, crop='fill')

    def get_vote_count(self, obj):
        # Respect event.result_visibility so hidden/rankings_only/no_public don't leak totals
        event = obj.event
        if getattr(event, 'result_visibility', 'full_live') != 'full_live':
            return None
        result = obj.vote_transactions.filter(status='successful').aggregate(
            total=Sum('vote_count')
        )
        return result['total'] or 0

    class Meta:
        model = Contestant
        fields = [
            'id', 'event', 'event_title', 'event_slug', 'name', 'bio',
            'beliefs', 'achievements', 'mission_statement',
            'contestant_category', 'contestant_category_name',
            'photo', 'photo_url', 'contestant_number', 'slug', 'is_active',
            'vote_count', 'created_at', 'updated_at',
        ]


class ContestantPublicSerializer(serializers.ModelSerializer):
    """Public-facing contestant data for shareable pages"""
    photo_url = serializers.SerializerMethodField()
    vote_count = serializers.SerializerMethodField()
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_slug = serializers.CharField(source='event.slug', read_only=True)
    contestant_category_name = serializers.CharField(source='contestant_category.name', read_only=True, default=None)

    def get_photo_url(self, obj):
        return _cloudinary_url(obj.photo, width=900, height=1200, crop='fill')

    def get_vote_count(self, obj):
        event = obj.event
        # Respect result_visibility settings
        # Only 'full_live' exposes raw totals to the public
        if getattr(event, 'result_visibility', 'full_live') != 'full_live':
            return None
        result = obj.vote_transactions.filter(status='successful').aggregate(
            total=Sum('vote_count')
        )
        return result['total'] or 0

    class Meta:
        model = Contestant
        fields = [
            'id', 'name', 'bio', 'beliefs', 'achievements', 'mission_statement',
            'photo_url', 'contestant_number',
            'slug', 'vote_count', 'event_title', 'event_slug',
            'contestant_category', 'contestant_category_name',
        ]

class GuestSpeakerSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    event_title = serializers.CharField(source='event.title', read_only=True)

    def get_photo_url(self, obj):
        return _cloudinary_url(obj.photo)

    class Meta:
        model = GuestSpeaker
        fields = [
            'id', 'event', 'event_title', 'name', 'title', 'bio',
            'photo_url', 'is_active', 'order',
        ]


# ── Payment ──────────────────────────────────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)
    contestant_name = serializers.CharField(source='contestant.name', read_only=True, default=None)
    verified_by_name = serializers.CharField(source='verified_by.username', read_only=True, default=None)
    ticket_category_name = serializers.CharField(source='ticket_category.name', read_only=True, default=None)

    class Meta:
        model = Payment
        fields = [
            'id', 'event', 'event_title', 'contestant', 'contestant_name',
            'ticket_category', 'ticket_category_name', 'ticket_quantity',
            'ticket_breakdown',
            'full_name', 'email',
            'phone_number', 'mpesa_code', 'amount', 'status', 'payment_purpose',
            'checkout_request_id', 'merchant_request_id',
            'pesapal_tracking_id', 'pesapal_merchant_ref',
            'verified_by', 'verified_by_name', 'verified_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['verified_by', 'verified_at', 'checkout_request_id', 'merchant_request_id', 'pesapal_tracking_id', 'pesapal_merchant_ref']


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payments (admin manual verification)"""
    class Meta:
        model = Payment
        fields = [
            'event', 'contestant', 'ticket_category', 'ticket_quantity',
            'ticket_breakdown',
            'full_name', 'email',
            'phone_number', 'mpesa_code', 'amount',
            'status', 'payment_purpose',
        ]

    def validate_ticket_quantity(self, value):
        if value is None:
            return 1
        if int(value) < 1:
            raise serializers.ValidationError("ticket_quantity must be at least 1.")
        return value

    def validate_mpesa_code(self, value):
        # Allow blank/null for pending payments
        if not value:
            return value
        if Payment.objects.filter(mpesa_code=value).exists():
            raise serializers.ValidationError("This M-Pesa transaction code has already been used.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        payment_purpose = attrs.get('payment_purpose')
        if payment_purpose == 'ticket':
            ticket_category = attrs.get('ticket_category')
            ticket_breakdown = attrs.get('ticket_breakdown') or {}
            if not ticket_category and not ticket_breakdown:
                raise serializers.ValidationError({'ticket_category': 'Select at least one ticket category.'})
            if ticket_category and ticket_breakdown:
                raise serializers.ValidationError({'ticket_breakdown': 'Provide either ticket_category or ticket_breakdown, not both.'})
            if not attrs.get('full_name'):
                raise serializers.ValidationError({'full_name': 'full_name is required for ticket payments.'})
            if not attrs.get('email'):
                raise serializers.ValidationError({'email': 'email is required for ticket payments.'})
            if ticket_breakdown:
                if not isinstance(ticket_breakdown, dict):
                    raise serializers.ValidationError({'ticket_breakdown': 'ticket_breakdown must be an object like {"12": 2, "15": 1}.'})
                cleaned = {}
                for k, v in ticket_breakdown.items():
                    try:
                        category_id = int(k)
                    except Exception:
                        raise serializers.ValidationError({'ticket_breakdown': 'Ticket category keys must be numeric IDs.'})
                    try:
                        qty = int(v)
                    except Exception:
                        raise serializers.ValidationError({'ticket_breakdown': 'Ticket quantities must be integers.'})
                    if qty < 1:
                        raise serializers.ValidationError({'ticket_breakdown': 'Ticket quantities must be at least 1.'})
                    cleaned[category_id] = qty
                attrs['ticket_breakdown'] = cleaned
        return attrs


# ── Ticket ───────────────────────────────────────────────────────────────────

class TicketSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)
    ticket_category_name = serializers.CharField(source='ticket_category.name', read_only=True, default=None)

    class Meta:
        model = Ticket
        fields = [
            'id', 'event', 'event_title', 'ticket_category', 'ticket_category_name',
            'ticket_code', 'full_name', 'email', 'phone',
            'is_used', 'issued_at',
        ]
        read_only_fields = ['ticket_code', 'issued_at']


class TicketDetailSerializer(serializers.ModelSerializer):
    """Detailed ticket for public verification"""
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_slug = serializers.CharField(source='event.slug', read_only=True)
    ticket_category_name = serializers.CharField(source='ticket_category.name', read_only=True, default=None)
    featured_image_url = serializers.SerializerMethodField()

    def get_featured_image_url(self, obj):
        return _cloudinary_url(obj.event.featured_image)

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_code', 'full_name', 'email', 'phone',
            'event_title', 'event_slug', 'ticket_category_name',
            'is_used', 'issued_at', 'featured_image_url',
        ]


# ── VoteTransaction ──────────────────────────────────────────────────────────

class VoteTransactionSerializer(serializers.ModelSerializer):
    contestant_name = serializers.CharField(source='contestant.name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = VoteTransaction
        fields = [
            'id', 'event', 'event_title', 'contestant', 'contestant_name',
            'vote_count', 'phone_number', 'mpesa_code', 'status',
            'ip_address', 'created_at', 'updated_at',
        ]
        read_only_fields = ['vote_count', 'ip_address']


# ── AuditLog ─────────────────────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'action', 'actor', 'details', 'event', 'event_title', 'created_at',
        ]
        read_only_fields = fields  # Fully read-only


# ── Live Results ─────────────────────────────────────────────────────────────

class LiveResultSerializer(serializers.Serializer):
    """Serializer for live voting results per event"""
    contestant_id = serializers.IntegerField()
    contestant_name = serializers.CharField()
    contestant_number = serializers.IntegerField()
    slug = serializers.CharField()
    photo_url = serializers.CharField(allow_null=True)
    vote_count = serializers.IntegerField(allow_null=True)
    rank = serializers.IntegerField(allow_null=True)


class VoteVerifySerializer(serializers.Serializer):
    """Serializer for vote verification by phone number.

    Serializes VoteTransaction instances; the display fields are pulled from the
    related event/contestant/payment via `source`.
    """
    event_title = serializers.CharField(source='event.title', read_only=True)
    contestant_name = serializers.CharField(source='contestant.name', read_only=True)
    vote_count = serializers.IntegerField(read_only=True)
    amount = serializers.DecimalField(source='payment.amount', max_digits=10, decimal_places=2, read_only=True)
    mpesa_code = serializers.CharField(read_only=True, allow_blank=True)
    status = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


# ── PesaPal checkout requests ────────────────────────────────────────────────

class PesaPalVotePaymentRequestSerializer(serializers.Serializer):
    """Serializer for initiating a PesaPal payment for voting."""
    phone_number = serializers.CharField(max_length=20, required=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=True, min_value=1)
    contestant_id = serializers.IntegerField(required=True)

    def validate(self, data):
        contestant_id = data.get('contestant_id')
        amount = data.get('amount')
        
        try:
            contestant = Contestant.objects.select_related('event').get(id=contestant_id)
            vote_price = contestant.event.vote_price
            
            if vote_price and vote_price > 0:
                if float(amount) % float(vote_price) != 0:
                    raise serializers.ValidationError({
                        "amount": f"Amount must be divisible by the vote price of {int(vote_price)} KES."
                    })
        except Contestant.DoesNotExist:
            raise serializers.ValidationError({"contestant_id": "Contestant does not exist."})
            
        return data

class PesaPalTicketPaymentRequestSerializer(serializers.Serializer):
    """Serializer for initiating a PesaPal payment for tickets."""
    phone_number = serializers.CharField(max_length=20, required=True)
    full_name = serializers.CharField(max_length=200, required=True)
    # Email is optional — attendees always get the ticket via download/on-screen.
    # When provided, we also email the PDF as a convenience.
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    ticket_breakdown = serializers.JSONField(required=True)

    def validate_ticket_breakdown(self, value):
        if not isinstance(value, dict) or not value:
            raise serializers.ValidationError("ticket_breakdown must be an object like {\"12\": 2, \"15\": 1}.")
        cleaned = {}
        for k, v in value.items():
            try:
                category_id = int(k)
            except Exception:
                raise serializers.ValidationError("Ticket category keys must be numeric IDs.")
            try:
                qty = int(v)
            except Exception:
                raise serializers.ValidationError("Ticket quantities must be integers.")
            if qty < 1:
                raise serializers.ValidationError("Ticket quantities must be at least 1.")
            cleaned[category_id] = qty
        return cleaned


class ContributionCheckoutSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=200, required=True)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    phone_number = serializers.CharField(max_length=20, required=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=True, min_value=1)


class ContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contribution
        fields = [
            'id', 'full_name', 'email', 'phone_number', 'amount', 'status',
            'mpesa_code', 'checkout_request_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

