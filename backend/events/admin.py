from django.contrib import admin
from django.utils import timezone
import json
from .models import (
    Event, EventCategory,
    TicketCategory, Contestant, ContestantCategory, GuestSpeaker, Payment, Contribution, Ticket, VoteTransaction, AuditLog, FinanceSettings
)
from .utils import generate_ticket_code, calculate_vote_count


# ── Inlines ───────────────────────────────────────────────────────────��[...]

class TicketCategoryInline(admin.TabularInline):
    model = TicketCategory
    extra = 1
    fields = ['name', 'price', 'description', 'available', 'total', 'is_active', 'order']
    ordering = ['order', 'price']


class ContestantInline(admin.TabularInline):
    model = Contestant
    extra = 1
    fields = ['contestant_number', 'name', 'contestant_category', 'slug', 'photo', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['contestant_number']

class ContestantCategoryInline(admin.TabularInline):
    model = ContestantCategory
    extra = 1
    fields = ['name', 'is_active', 'order']
    ordering = ['order', 'name']

class GuestSpeakerInline(admin.TabularInline):
    model = GuestSpeaker
    extra = 1
    fields = ['name', 'title', 'photo', 'is_active', 'order']
    ordering = ['order', 'name']


# ── Event Admin ──────────────────────────────────────────────────────────�[...]

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'event_type', 'event_status', 'start_date', 'venue_name', 'voting_enabled', 'featured', 'published']
    list_filter = ['event_type', 'event_status', 'voting_enabled', 'featured', 'published', 'start_date', 'created_at']
    search_fields = ['title', 'description', 'venue_name', 'city']
    list_editable = ['featured', 'published', 'event_status']
    ordering = ['-start_date']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at', 'ticket_prefix']
    date_hierarchy = 'start_date'
    filter_horizontal = ['gallery']
    inlines = [TicketCategoryInline, ContestantCategoryInline, ContestantInline, GuestSpeakerInline]

    fieldsets = (
        ('Event Details', {
            'fields': ('title', 'slug', 'description', 'event_type', 'event_status')
        }),
        ('Date & Time', {
            'fields': ('start_date', 'end_date', 'is_all_day')
        }),
        ('Location', {
            'fields': ('venue_name', 'city', 'country', 'latitude', 'longitude')
        }),
        ('Media', {
            'fields': ('featured_image', 'gallery')
        }),
        ('Ticketing', {
            'fields': ('capacity', 'registration_required', 'ticket_prefix', 'ticket_url', 'registration_url', 'checkin_pin')
        }),
        ('Voting Configuration', {
            'fields': ('voting_enabled', 'vote_price', 'voting_start', 'voting_end', 'result_visibility'),
            'classes': ('collapse',),
            'description': 'Configure voting for this event. Set event_status to "voting_open" to allow voting.'
        }),
        ('Payment Configuration', {
            'fields': ('payment_method', 'till_number', 'account_name'),
            'classes': ('collapse',),
        }),
        ('SEO & Visibility', {
            'fields': ('featured', 'published', 'meta_description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        # Auto-derive ticket_prefix on save
        if not obj.ticket_prefix and obj.title:
            obj.ticket_prefix = obj._derive_prefix(obj.title)
        super().save_model(request, obj, form, change)


# ── EventCategory Admin ──────────────────────────────────────────────────────

@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'color', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


# ── TicketCategory Admin ─────────────────────────────────────────────────────

@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'event', 'price', 'available', 'total', 'is_active', 'order']
    list_filter = ['is_active', 'event']
    list_editable = ['is_active', 'order']
    search_fields = ['name', 'event__title']
    ordering = ['event', 'order', 'price']


# ── Contestant Admin ────────────────────────────────────────────────────────�[...]

@admin.register(Contestant)
class ContestantAdmin(admin.ModelAdmin):
    list_display = ['contestant_number', 'name', 'contestant_category', 'event', 'is_active', 'created_at']
    list_filter = ['is_active', 'event', 'contestant_category', 'created_at']
    list_editable = ['is_active']
    search_fields = ['name', 'event__title']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['event', 'contestant_number']

    fieldsets = (
        ('Basic Information', {
            'fields': ('event', 'contestant_category', 'name', 'slug', 'contestant_number', 'is_active')
        }),
        ('Profile Details', {
            'fields': ('photo', 'bio', 'beliefs', 'mission_statement', 'achievements')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ContestantCategory)
class ContestantCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'event', 'is_active', 'order', 'created_at']
    list_filter = ['event', 'is_active']
    list_editable = ['is_active', 'order']
    search_fields = ['name', 'event__title']
    ordering = ['event', 'order', 'name']

    def save_model(self, request, obj, form, change):
        if change:
            # Audit log for contestant category edits
            AuditLog.objects.create(
                action='contestant_category_edit',
                actor=request.user.username,
                details=json.dumps({
                    'contestant_category_id': obj.id,
                    'contestant_category_name': obj.name,
                    'event': obj.event.title,
                }),
                event=obj.event,
            )
        super().save_model(request, obj, form, change)


# ── Payment Admin ─────────────────────────────────────────────────────────�[...]

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['mpesa_code', 'event', 'phone_number', 'amount', 'payment_purpose', 'status', 'checkout_request_id', 'verified_by', 'created_at']
    list_filter = ['status', 'payment_purpose', 'event', 'created_at']
    search_fields = ['mpesa_code', 'phone_number', 'checkout_request_id', 'pesapal_tracking_id', 'pesapal_merchant_ref']
    readonly_fields = ['checkout_request_id', 'merchant_request_id', 'stk_response', 'pesapal_tracking_id', 'pesapal_merchant_ref', 'pesapal_response', 'created_at', 'updated_at', 'verified_at']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    actions = ['mark_successful', 'mark_failed', 'mark_reversed']

    @admin.action(description='Mark selected payments as successful')
    def mark_successful(self, request, queryset):
        updated = 0
        for payment in queryset.filter(status='pending'):
            payment.status = 'successful'
            payment.verified_by = request.user
            payment.verified_at = timezone.now()
            payment.save()
            results = {}
            if payment.payment_purpose == 'ticket':
                if not payment.tickets.exists():
                    event = payment.event
                    event_year = event.start_date.year
                    created_codes = []
                    ticket_breakdown = payment.ticket_breakdown or {}
                    if ticket_breakdown:
                        for category_id, qty in ticket_breakdown.items():
                            try:
                                ticket_category = TicketCategory.objects.get(id=int(category_id), event=event)
                            except TicketCategory.DoesNotExist:
                                continue

                            qty = max(1, int(qty))
                            for _ in range(qty):
                                code = generate_ticket_code(event.ticket_prefix, event_year)
                                Ticket.objects.create(
                                    event=event,
                                    ticket_category=ticket_category,
                                    payment=payment,
                                    ticket_code=code,
                                    full_name=payment.full_name or payment.phone_number,
                                    email=payment.email or '',
                                    phone=payment.phone_number,
                                )
                                created_codes.append(code)

                            ticket_category.available = max(0, int(ticket_category.available or 0) - qty)
                            ticket_category.save(update_fields=['available'])
                    else:
                        ticket_category = payment.ticket_category
                        if ticket_category and ticket_category.event_id != event.id:
                            ticket_category = None

                        quantity = int(payment.ticket_quantity or 1)
                        quantity = max(1, quantity)

                        for _ in range(quantity):
                            code = generate_ticket_code(event.ticket_prefix, event_year)
                            Ticket.objects.create(
                                event=event,
                                ticket_category=ticket_category,
                                payment=payment,
                                ticket_code=code,
                                full_name=payment.full_name or payment.phone_number,
                                email=payment.email or '',
                                phone=payment.phone_number,
                            )
                            created_codes.append(code)

                        if ticket_category:
                            ticket_category.available = max(0, int(ticket_category.available or 0) - quantity)
                            ticket_category.save(update_fields=['available'])

                    results = {'ticket_codes': created_codes, 'ticket_count': len(created_codes)}
                    AuditLog.objects.create(
                        action='ticket_issued',
                        actor=request.user.username,
                        details=f"Issued {len(created_codes)} ticket(s) for payment {payment.mpesa_code}: {', '.join(created_codes)}",
                        event=event,
                    )
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
                        results = {'vote_id': vote.id, 'vote_count': vote_count}
            AuditLog.objects.create(
                action='payment_verified',
                actor=request.user.username,
                details=f"Admin marked payment {payment.mpesa_code} (KES {payment.amount}) as successful. Results: {results}",
                event=payment.event,
            )
            updated += 1
        self.message_user(request, f'{updated} payment(s) marked as successful.')

    @admin.action(description='Mark selected payments as failed')
    def mark_failed(self, request, queryset):
        updated = queryset.filter(status='pending').update(status='failed')
        self.message_user(request, f'{updated} payment(s) marked as failed.')

    @admin.action(description='Mark selected payments as reversed')
    def mark_reversed(self, request, queryset):
        updated = 0
        for payment in queryset.exclude(status='reversed'):
            payment.status = 'reversed'
            payment.save()
            # Reverse associated votes
            VoteTransaction.objects.filter(payment=payment).update(status='reversed')
            AuditLog.objects.create(
                action='payment_adjustment',
                actor=request.user.username,
                details=f"Reversed payment {payment.mpesa_code} (KES {payment.amount})",
                event=payment.event,
            )
            updated += 1
        self.message_user(request, f'{updated} payment(s) marked as reversed.')


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'phone_number', 'amount', 'status', 'pesapal_tracking_id', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['full_name', 'email', 'phone_number', 'pesapal_tracking_id', 'pesapal_merchant_ref']
    readonly_fields = ['pesapal_tracking_id', 'pesapal_merchant_ref', 'pesapal_response', 'created_at', 'updated_at']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'


# ── Ticket Admin ─────────────────────────────────────────────────────────��[...]

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_code', 'full_name', 'event', 'ticket_category', 'is_used', 'issued_at']
    list_filter = ['event', 'ticket_category', 'is_used', 'issued_at']
    search_fields = ['ticket_code', 'full_name', 'email', 'phone']
    readonly_fields = ['ticket_code', 'issued_at']
    ordering = ['-issued_at']
    date_hierarchy = 'issued_at'

    def has_delete_permission(self, request, obj=None):
        return False  # Tickets should never be deleted


# ── VoteTransaction Admin ────────────────────────────────────────────────────

@admin.register(VoteTransaction)
class VoteTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'contestant', 'event', 'vote_count', 'phone_number', 'mpesa_code', 'status', 'created_at']
    list_filter = ['status', 'event', 'contestant', 'created_at']
    search_fields = ['mpesa_code', 'phone_number', 'contestant__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def has_delete_permission(self, request, obj=None):
        return False  # Vote transactions are immutable

    def has_add_permission(self, request):
        return False  # Votes are only created through payment processing


# ── AuditLog Admin ─────────────────────────────────────────────────────────[...]

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'actor', 'event', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['actor', 'details']
    readonly_fields = ['action', 'actor', 'details', 'event', 'created_at']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(FinanceSettings)
class FinanceSettingsAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'updated_at']
    fields = ['pin', 'updated_at']
    readonly_fields = ['updated_at']

    def has_add_permission(self, request):
        # Singleton: only allow adding if none exists
        return not FinanceSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


# ── Timezone import for PaymentAdmin actions ─────────────────────────────────

from django.utils import timezone
