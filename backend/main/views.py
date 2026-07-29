import logging

from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
import resend
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from .models import (
    Ambassador, CulturalCommunity, CulturalHeritage, KenyaRegion,
    Achievement, Partner, SiteSettings, TeamMember,
    HomePageSettings, KenyaPageSettings, AmbassadorPageSettings,
    EventsPageSettings, GalleryPageSettings, PartnershipPageSettings, AboutPageSettings,
    VotingPageSettings, ContactPageSettings, FAQPageSettings,
    ContributePageSettings, PrivacyPageSettings, TermsPageSettings
)
from .serializers import (
    AmbassadorSerializer, CulturalCommunitySerializer, CulturalHeritageSerializer,
    KenyaRegionSerializer, AchievementSerializer,
    PartnerSerializer, DiscoverKenyaSerializer,
    SiteSettingsSerializer, TeamMemberSerializer,
    HomePageSettingsSerializer, KenyaPageSettingsSerializer, AmbassadorPageSettingsSerializer,
    EventsPageSettingsSerializer, GalleryPageSettingsSerializer, PartnershipPageSettingsSerializer,
    AboutPageSettingsSerializer,
    VotingPageSettingsSerializer, ContactPageSettingsSerializer, FAQPageSettingsSerializer,
    ContributePageSettingsSerializer, PrivacyPageSettingsSerializer, TermsPageSettingsSerializer
)

logger = logging.getLogger(__name__)


class AmbassadorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ambassador.objects.all()
    serializer_class = AmbassadorSerializer


class CulturalCommunityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CulturalCommunity.objects.all()
    serializer_class = CulturalCommunitySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['region', 'featured']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class CulturalHeritageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CulturalHeritage.objects.all()
    serializer_class = CulturalHeritageSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['heritage_type', 'featured']
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'created_at']


class KenyaRegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = KenyaRegion.objects.all()
    serializer_class = KenyaRegionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['featured']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['achievement_type', 'featured', 'year']
    search_fields = ['title', 'description']
    ordering_fields = ['title', 'year', 'created_at']


class PartnerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['partner_type', 'featured']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class TeamMemberViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TeamMember.objects.all()
    serializer_class = TeamMemberSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['team_type', 'featured']
    ordering_fields = ['order', 'name']
    ordering = ['order', 'name']


class SiteSettingsAPIView(APIView):
    """Return hero images for every navbar tab."""
    permission_classes = [AllowAny]

    def get(self, request):
        settings = SiteSettings.objects.first()
        if not settings:
            return Response({})
        serializer = SiteSettingsSerializer(settings)
        return Response(serializer.data)


class DiscoverKenyaAPIView(APIView):
    """
    Consolidated endpoint for the unified Kenya page.
    Optional query params:
    - featured_only=true|false
    - regions_limit, communities_limit, heritage_limit, achievements_limit
    - include_gallery=true|false  (include gallery photos per item)
    """
    def get(self, request):
        featured_only = request.query_params.get('featured_only', 'false').lower() == 'true'

        regions_qs = KenyaRegion.objects.all().order_by('-featured', 'name')
        communities_qs = CulturalCommunity.objects.all().order_by('-featured', 'name')
        heritage_qs = CulturalHeritage.objects.all().order_by('-featured', 'title')
        achievements_qs = Achievement.objects.all().order_by('-featured', '-year', 'title')

        if featured_only:
            regions_qs = regions_qs.filter(featured=True)
            communities_qs = communities_qs.filter(featured=True)
            heritage_qs = heritage_qs.filter(featured=True)
            achievements_qs = achievements_qs.filter(featured=True)

        def parse_limit(name, default):
            try:
                return max(1, int(request.query_params.get(name, default)))
            except (TypeError, ValueError):
                return default

        regions_limit = parse_limit('regions_limit', 8)
        communities_limit = parse_limit('communities_limit', 8)
        heritage_limit = parse_limit('heritage_limit', 8)
        achievements_limit = parse_limit('achievements_limit', 8)

        payload = {
            'regions': regions_qs[:regions_limit],
            'communities': communities_qs[:communities_limit],
            'heritage': heritage_qs[:heritage_limit],
            'achievements': achievements_qs[:achievements_limit],
        }

        serializer = DiscoverKenyaSerializer(payload, context={'request': request})
        return Response(serializer.data)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def contact_message(request):
    """Receive a contact form submission and email it to the admin."""
    data = request.data
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    subject = data.get('subject', 'General Inquiry').strip()
    message = data.get('message', '').strip()
    inquiry_type = data.get('type', 'general').strip()

    if not name or not email or not message:
        return Response(
            {'error': 'Name, email, and message are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Build the subject line for the notification email
    subject_prefixes = {
        'general': 'General Inquiry',
        'partnership': 'Partnership Inquiry',
        'event': 'Event Booking Inquiry',
        'media': 'Media Inquiry',
    }
    email_subject = f"[Miss Culture Kenya] {subject_prefixes.get(inquiry_type, 'Contact')}: {subject}"

    # Build HTML body
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #15803d;">New Contact Message — Miss Culture Global Kenya</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; width: 120px;">Name:</td><td style="padding: 8px;">{name}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:{email}">{email}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;">{phone or 'Not provided'}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Type:</td><td style="padding: 8px;">{subject_prefixes.get(inquiry_type, inquiry_type)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Subject:</td><td style="padding: 8px;">{subject}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <h3 style="color: #374151;">Message</h3>
        <p style="white-space: pre-wrap; color: #4b5563; line-height: 1.6;">{message}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">This message was sent via the Miss Culture Global Kenya website contact form.</p>
    </div>
    """

    plain_body = (
        f"New Contact Message\n"
        f"-------------------\n"
        f"Name: {name}\n"
        f"Email: {email}\n"
        f"Phone: {phone or 'Not provided'}\n"
        f"Type: {subject_prefixes.get(inquiry_type, inquiry_type)}\n"
        f"Subject: {subject}\n\n"
        f"Message:\n{message}\n\n"
        f"---\nSent via Miss Culture Global Kenya website"
    )

    if not getattr(settings, 'RESEND_API_KEY', ''):
        return Response(
            {'error': 'Email service is not configured.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Send admin notification via Resend
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            'from': settings.DEFAULT_FROM_EMAIL,
            'to': settings.ADMIN_EMAIL,
            'subject': email_subject,
            'html': html_body,
            'text': plain_body,
            'reply_to': email,
        })
    except Exception as e:
        logger.exception('Failed to send admin email via Resend')
        return Response(
            {'error': 'Failed to send message. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Send auto-reply to the sender
    auto_subject = "Thank you for contacting Miss Culture Global Kenya"
    auto_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #15803d;">Thank You, {name}!</h2>
        <p style="color: #4b5563; line-height: 1.6;">
            We have received your message and will get back to you within 24-48 hours.
        </p>
        <p style="color: #4b5563; line-height: 1.6;">
            In the meantime, feel free to follow us on social media for the latest updates.
        </p>
        <table role="presentation" style="border-collapse: collapse; margin: 16px 0;">
            <tr>
                <td style="padding-right: 8px;">
                    <a href="https://www.instagram.com/misscultureglobalkenya?igsh=MmpjY3Z5ODZ5NThx" style="display: inline-block; padding: 8px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9999px; color: #15803d; font-size: 13px; font-weight: bold; text-decoration: none;">Instagram</a>
                </td>
                <td style="padding-right: 8px;">
                    <a href="https://www.facebook.com/share/1E3tuDcxXT/" style="display: inline-block; padding: 8px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9999px; color: #15803d; font-size: 13px; font-weight: bold; text-decoration: none;">Facebook</a>
                </td>
                <td>
                    <a href="https://www.tiktok.com/@miss.culture.global.ke?_r=1&_t=ZS-95zsRay3Mii" style="display: inline-block; padding: 8px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9999px; color: #15803d; font-size: 13px; font-weight: bold; text-decoration: none;">TikTok</a>
                </td>
            </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">
            Miss Culture Global Kenya<br>
            info@misscultureglobalkenya.com
        </p>
    </div>
    """
    auto_plain = (
        f"Thank You, {name}!\n\n"
        f"We have received your message and will get back to you within 24-48 hours.\n\n"
        f"In the meantime, feel free to follow us on social media for the latest updates:\n"
        f"Instagram: https://www.instagram.com/misscultureglobalkenya?igsh=MmpjY3Z5ODZ5NThx\n"
        f"Facebook: https://www.facebook.com/share/1E3tuDcxXT/\n"
        f"TikTok: https://www.tiktok.com/@miss.culture.global.ke?_r=1&_t=ZS-95zsRay3Mii\n\n"
        f"Miss Culture Global Kenya\ninfo@misscultureglobalkenya.com"
    )
    # Send auto-reply to sender via Resend
    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            'from': settings.DEFAULT_FROM_EMAIL,
            'to': email,
            'subject': auto_subject,
            'html': auto_html,
            'text': auto_plain,
        })
    except Exception as e:
        logger.exception('Failed to send auto-reply via Resend')


    return Response(
        {'success': 'Your message has been sent successfully. We will get back to you soon!'},
        status=status.HTTP_200_OK,
    )

@api_view(['GET'])
@permission_classes([AllowAny])
def check_email_connection(request):
    """Check Resend API connection status"""
    try:
        resend.api_key = settings.RESEND_API_KEY
        # Try to get domains list to verify API key works
        domains = resend.Domains.list()
        return Response({
            'status': 'connected',
            'service': 'Resend API',
            'api_key_configured': bool(settings.RESEND_API_KEY),
            'from_email': settings.DEFAULT_FROM_EMAIL,
            'admin_email': settings.ADMIN_EMAIL,
        })
    except Exception as e:
        return Response({
            'status': 'error',
            'service': 'Resend API',
            'error': str(e),
            'api_key_configured': bool(settings.RESEND_API_KEY),
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── Page Settings API Endpoints ─────────────────────────────────────────────

class HomePageSettingsAPIView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        settings = HomePageSettings.objects.first()
        if not settings:
            settings = HomePageSettings.objects.create()
        serializer = HomePageSettingsSerializer(settings)
        return Response(serializer.data)


class KenyaPageSettingsAPIView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        settings = KenyaPageSettings.objects.first()
        if not settings:
            settings = KenyaPageSettings.objects.create()
        serializer = KenyaPageSettingsSerializer(settings)
        return Response(serializer.data)


class AmbassadorPageSettingsAPIView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        settings = AmbassadorPageSettings.objects.first()
        if not settings:
            settings = AmbassadorPageSettings.objects.create()
        serializer = AmbassadorPageSettingsSerializer(settings)
        return Response(serializer.data)


class EventsPageSettingsAPIView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        settings = EventsPageSettings.objects.first()
        if not settings:
            settings = EventsPageSettings.objects.create()
        serializer = EventsPageSettingsSerializer(settings)
        return Response(serializer.data)


class GalleryPageSettingsAPIView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        settings = GalleryPageSettings.objects.first()
        if not settings:
            settings = GalleryPageSettings.objects.create()
        serializer = GalleryPageSettingsSerializer(settings)
        return Response(serializer.data)


class PartnershipPageSettingsAPIView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        settings = PartnershipPageSettings.objects.first()
        if not settings:
            settings = PartnershipPageSettings.objects.create()
        serializer = PartnershipPageSettingsSerializer(settings)
        return Response(serializer.data)


class AboutPageSettingsAPIView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        settings = AboutPageSettings.objects.first()
        if not settings:
            settings = AboutPageSettings.objects.create()
        serializer = AboutPageSettingsSerializer(settings)
        return Response(serializer.data)


class VotingPageSettingsAPIView(APIView):
    """API endpoint for voting page settings"""
    permission_classes = [AllowAny]

    def get(self, request):
        settings = VotingPageSettings.objects.first()
        if not settings:
            settings = VotingPageSettings.objects.create()
        serializer = VotingPageSettingsSerializer(settings)
        return Response(serializer.data)


class ContactPageSettingsAPIView(APIView):
    """API endpoint for contact page settings"""
    permission_classes = [AllowAny]

    def get(self, request):
        settings = ContactPageSettings.objects.first()
        if not settings:
            settings = ContactPageSettings.objects.create()
        serializer = ContactPageSettingsSerializer(settings)
        return Response(serializer.data)


class FAQPageSettingsAPIView(APIView):
    """API endpoint for FAQ page settings"""
    permission_classes = [AllowAny]

    def get(self, request):
        settings = FAQPageSettings.objects.first()
        if not settings:
            settings = FAQPageSettings.objects.create()
        serializer = FAQPageSettingsSerializer(settings)
        return Response(serializer.data)


class ContributePageSettingsAPIView(APIView):
    """API endpoint for Contribute page settings"""
    permission_classes = [AllowAny]

    def get(self, request):
        settings = ContributePageSettings.objects.first()
        if not settings:
            settings = ContributePageSettings.objects.create()
        serializer = ContributePageSettingsSerializer(settings)
        return Response(serializer.data)


class PrivacyPageSettingsAPIView(APIView):
    """API endpoint for Privacy page settings"""
    permission_classes = [AllowAny]

    def get(self, request):
        settings = PrivacyPageSettings.objects.first()
        if not settings:
            settings = PrivacyPageSettings.objects.create()
        serializer = PrivacyPageSettingsSerializer(settings)
        return Response(serializer.data)


class TermsPageSettingsAPIView(APIView):
    """API endpoint for Terms page settings"""
    permission_classes = [AllowAny]

    def get(self, request):
        settings = TermsPageSettings.objects.first()
        if not settings:
            settings = TermsPageSettings.objects.create()
        serializer = TermsPageSettingsSerializer(settings)
        return Response(serializer.data)


from django.http import FileResponse
from .pdf_generator import generate_test_pdf, generate_multi_page_pdf


@api_view(['GET'])
@permission_classes([AllowAny])
def generate_test_pdf_view(request):
    """
    Generate a PDF with random statements for testing content
    
    Query params:
    - type: home, ambassador, events, partnership, about, all (default: all)
    - pages: number of pages for multi-page PDF (default: 5)
    """
    page_type = request.query_params.get('type', 'all')
    num_pages = int(request.query_params.get('pages', 5))
    multi_page = request.query_params.get('multi', 'false').lower() == 'true'
    
    try:
        if multi_page:
            pdf_buffer = generate_multi_page_pdf(num_pages=num_pages)
            filename = f"test_multi_page_{num_pages}pages.pdf"
        else:
            pdf_buffer = generate_test_pdf(page_type=page_type)
            filename = f"test_{page_type}_content.pdf"
        
        return FileResponse(
            pdf_buffer,
            as_attachment=True,
            filename=filename,
            content_type='application/pdf'
        )
    except Exception as e:
        logger.exception("PDF generation failed")
        return Response(
            {'error': f'PDF generation failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
