from django.contrib import admin, messages
from django.contrib.contenttypes.admin import GenericTabularInline
from django.http import HttpResponseRedirect
import cloudinary
from .models import (
    Ambassador, CulturalCommunity, CulturalHeritage, KenyaRegion,
    Achievement, Partner, KenyaGalleryPhoto, SiteSettings, TeamMember,
    HomePageSettings, KenyaPageSettings, AmbassadorPageSettings,
    EventsPageSettings, GalleryPageSettings, PartnershipPageSettings, AboutPageSettings,
    VotingPageSettings, ContactPageSettings, FAQPageSettings,
    ContributePageSettings, PrivacyPageSettings, TermsPageSettings
)


class KenyaGalleryPhotoInline(GenericTabularInline):
    model = KenyaGalleryPhoto
    extra = 3
    max_num = 10
    fields = ['image', 'caption', 'order']
    ct_field = 'content_type'
    ct_fk_field = 'object_id'


@admin.register(Ambassador)
class AmbassadorAdmin(admin.ModelAdmin):
    list_display = ['name', 'title', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'title']
    readonly_fields = ['created_at', 'updated_at']

    def has_add_permission(self, request):
        # Only allow one ambassador in the system
        return not Ambassador.objects.exists()


@admin.register(CulturalCommunity)
class CulturalCommunityAdmin(admin.ModelAdmin):
    list_display = ['name', 'region', 'featured', 'created_at']
    list_filter = ['region', 'featured', 'created_at']
    search_fields = ['name', 'region', 'description']
    list_editable = ['featured']
    inlines = [KenyaGalleryPhotoInline]


@admin.register(CulturalHeritage)
class CulturalHeritageAdmin(admin.ModelAdmin):
    list_display = ['title', 'heritage_type', 'featured', 'created_at']
    list_filter = ['heritage_type', 'featured', 'created_at']
    search_fields = ['title', 'description']
    list_editable = ['featured']
    inlines = [KenyaGalleryPhotoInline]


@admin.register(KenyaRegion)
class KenyaRegionAdmin(admin.ModelAdmin):
    list_display = ['name', 'featured', 'created_at']
    list_filter = ['featured', 'created_at']
    search_fields = ['name', 'description']
    list_editable = ['featured']
    inlines = [KenyaGalleryPhotoInline]


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['title', 'achievement_type', 'year', 'featured', 'created_at']
    list_filter = ['achievement_type', 'year', 'featured', 'created_at']
    search_fields = ['title', 'description']
    list_editable = ['featured']
    inlines = [KenyaGalleryPhotoInline]


@admin.register(KenyaGalleryPhoto)
class KenyaGalleryPhotoAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'content_type', 'object_id', 'order', 'created_at']
    list_filter = ['content_type', 'created_at']
    raw_id_fields = ['content_type']


@admin.register(Partner)
class PartnerAdmin(admin.ModelAdmin):
    list_display = ['name', 'partner_type', 'display_order', 'featured', 'created_at']
    list_filter = ['partner_type', 'featured', 'created_at']
    search_fields = ['name', 'description']
    list_editable = ['partner_type', 'display_order', 'featured']


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ['name', 'title', 'role', 'team_type', 'order', 'featured', 'updated_at']
    list_filter = ['team_type', 'featured', 'created_at']
    search_fields = ['name', 'title', 'role', 'bio']
    list_editable = ['team_type', 'order', 'featured']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Profile', {
            'fields': ('name', 'title', 'role', 'bio', 'image')
        }),
        ('Display', {
            'fields': ('team_type', 'order', 'featured')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    """Site-wide logos only — organized on their own tab"""
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Logos', {
            'fields': (
                'logo_kenya',
                'logo_global',
                'mpesa_logo',
            ),
            'description': 'Upload logos for Miss Culture Global Kenya, Miss Culture Global, and M-Pesa payment branding'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)


# ── Individual Page Settings Admins ──────────────────────────────────────────

@admin.register(HomePageSettings)
class HomePageSettingsAdmin(admin.ModelAdmin):
    """Home page settings — hero, highlights, and feature toggles"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image',),
        }),
        ('Kenya Highlight Card (on Homepage)', {
            'fields': ('kenya_highlight_image', 'kenya_highlight_enabled'),
            'description': 'Image and toggle for the Kenya highlight card shown on homepage'
        }),
        ('Ambassador Highlight Card (on Homepage)', {
            'fields': ('ambassador_highlight_image', 'ambassador_highlight_enabled'),
            'description': 'Image and toggle for the Ambassador spotlight card shown on homepage'
        }),
        ('Events Section', {
            'fields': ('upcoming_event_enabled', 'recent_event_enabled'),
            'description': 'Toggle event sections on homepage'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not HomePageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)


@admin.register(KenyaPageSettings)
class KenyaPageSettingsAdmin(admin.ModelAdmin):
    """Kenya page settings — hero, content toggles"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image', 'page_title', 'page_subtitle')
        }),
        ('Content Sections', {
            'fields': (
                'show_cultural_facts',
                'show_regions',
                'show_communities',
                'show_heritage',
                'show_achievements'
            ),
            'description': 'Toggle which sections appear on the Kenya page'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not KenyaPageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)


@admin.register(AmbassadorPageSettings)
class AmbassadorPageSettingsAdmin(admin.ModelAdmin):
    """Ambassador page settings — hero, profile, content toggles"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image', 'page_title', 'page_subtitle')
        }),
        ('Profile Media', {
            'fields': ('profile_image', 'video_url'),
            'description': 'Profile image and featured video for the ambassador'
        }),
        ('Content Sections', {
            'fields': (
                'show_story_arc',
                'show_impact_stats',
                'show_core_messages',
                'show_gallery',
                'show_videos',
                'show_contact_cta'
            ),
            'description': 'Toggle which sections appear on the Ambassador page'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not AmbassadorPageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)


@admin.register(EventsPageSettings)
class EventsPageSettingsAdmin(admin.ModelAdmin):
    """Events page settings"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image', 'page_title', 'page_subtitle')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not EventsPageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)


@admin.register(GalleryPageSettings)
class GalleryPageSettingsAdmin(admin.ModelAdmin):
    """Gallery page settings"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image', 'page_title', 'page_subtitle')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not GalleryPageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)


@admin.register(PartnershipPageSettings)
class PartnershipPageSettingsAdmin(admin.ModelAdmin):
    """Partnership page settings"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image', 'page_title', 'page_subtitle')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not PartnershipPageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)


@admin.register(AboutPageSettings)
class AboutPageSettingsAdmin(admin.ModelAdmin):
    """About page settings — hero, mission, leaders, committee"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image', 'page_title', 'page_subtitle')
        }),
        ('Mission Section', {
            'fields': ('mission_image',)
        }),
        ('Leader 1', {
            'fields': ('leader_1_image', 'leader_1_name', 'leader_1_title', 'leader_1_bio'),
            'classes': ('collapse',)
        }),
        ('Leader 2', {
            'fields': ('leader_2_image', 'leader_2_name', 'leader_2_title', 'leader_2_bio'),
            'classes': ('collapse',)
        }),
        ('Leader 3', {
            'fields': ('leader_3_image', 'leader_3_name', 'leader_3_title', 'leader_3_bio'),
            'classes': ('collapse',)
        }),
        ('Leader 4', {
            'fields': ('leader_4_image', 'leader_4_name', 'leader_4_title', 'leader_4_bio'),
            'classes': ('collapse',)
        }),
        ('Leader 5', {
            'fields': ('leader_5_image', 'leader_5_name', 'leader_5_title', 'leader_5_bio'),
            'classes': ('collapse',)
        }),
        ('Leader 6', {
            'fields': ('leader_6_image', 'leader_6_name', 'leader_6_title', 'leader_6_bio'),
            'classes': ('collapse',)
        }),
        ('Committee Members', {
            'fields': (
                'committee_1_name', 'committee_1_role', 'committee_1_bio',
                'committee_2_name', 'committee_2_role', 'committee_2_bio',
                'committee_3_name', 'committee_3_role', 'committee_3_bio',
                'committee_4_name', 'committee_4_role', 'committee_4_bio',
                'committee_5_name', 'committee_5_role', 'committee_5_bio',
                'committee_6_name', 'committee_6_role', 'committee_6_bio',
            ),
            'classes': ('collapse',),
            'description': 'Organizing committee member details'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not AboutPageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)




@admin.register(VotingPageSettings)

class VotingPageSettingsAdmin(admin.ModelAdmin):

    """Voting page settings ��   hero, event images, participant images"""

    readonly_fields = ['created_at', 'updated_at']

    

    fieldsets = (

        ('Hero Section', {

            'fields': ('hero_image', 'page_title', 'page_subtitle'),

        }),

        ('Voting Event Images', {

            'fields': (

                'event_1_image', 'event_2_image',

                'event_3_image', 'event_4_image',

            ),

            'classes': ('collapse',)

        }),

        ('Voting Participant Images', {

            'fields': (

                'participant_1_image', 'participant_2_image',

                'participant_3_image', 'participant_4_image',

                'participant_5_image', 'participant_6_image',

            ),

            'classes': ('collapse',)

        }),


        ('Metadata', {

            'fields': ('created_at', 'updated_at'),

            'classes': ('collapse',)

        }),

    )

    

    def has_add_permission(self, request):

        return not VotingPageSettings.objects.exists()



    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):

        try:

            return super().changeform_view(

                request, object_id=object_id, form_url=form_url, extra_context=extra_context

            )

        except Exception as e:

            self.message_user(

                request,

                f"Error saving settings: {str(e)}",

                level=messages.ERROR,

            )

            return HttpResponseRedirect(request.path)





@admin.register(ContactPageSettings)

class ContactPageSettingsAdmin(admin.ModelAdmin):

    """Contact page settings ��   hero and page details"""

    readonly_fields = ['created_at', 'updated_at']

    

    fieldsets = (

        ('Hero Section', {

            'fields': ('hero_image', 'page_title', 'page_subtitle'),

        }),


        ('Metadata', {

            'fields': ('created_at', 'updated_at'),

            'classes': ('collapse',)

        }),

    )

    

    def has_add_permission(self, request):

        return not ContactPageSettings.objects.exists()



    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):

        try:

            return super().changeform_view(

                request, object_id=object_id, form_url=form_url, extra_context=extra_context

            )

        except Exception as e:

            self.message_user(

                request,

                f"Error saving settings: {str(e)}",

                level=messages.ERROR,

            )

            return HttpResponseRedirect(request.path)





@admin.register(FAQPageSettings)

class FAQPageSettingsAdmin(admin.ModelAdmin):

    """FAQ page settings ��   hero and page details"""

    readonly_fields = ['created_at', 'updated_at']

    

    fieldsets = (

        ('Hero Section', {

            'fields': ('hero_image', 'page_title', 'page_subtitle'),

        }),


        ('Metadata', {

            'fields': ('created_at', 'updated_at'),

            'classes': ('collapse',)

        }),

    )

    

    def has_add_permission(self, request):

        return not FAQPageSettings.objects.exists()



    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):

        try:

            return super().changeform_view(

                request, object_id=object_id, form_url=form_url, extra_context=extra_context

            )

        except Exception as e:

            self.message_user(

                request,

                f"Error saving settings: {str(e)}",

                level=messages.ERROR,

            )

            return HttpResponseRedirect(request.path)


@admin.register(ContributePageSettings)
class ContributePageSettingsAdmin(admin.ModelAdmin):
    """Contribute page settings — hero and page details"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image', 'page_title', 'page_subtitle'),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not ContributePageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)


@admin.register(PrivacyPageSettings)
class PrivacyPageSettingsAdmin(admin.ModelAdmin):
    """Privacy page settings — hero and page details"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image', 'page_title', 'page_subtitle'),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not PrivacyPageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)


@admin.register(TermsPageSettings)
class TermsPageSettingsAdmin(admin.ModelAdmin):
    """Terms page settings — hero and page details"""
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Hero Section', {
            'fields': ('hero_image', 'page_title', 'page_subtitle'),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not TermsPageSettings.objects.exists()

    def changeform_view(self, request, object_id=None, form_url="", extra_context=None):
        try:
            return super().changeform_view(
                request, object_id=object_id, form_url=form_url, extra_context=extra_context
            )
        except Exception as e:
            self.message_user(
                request,
                f"Error saving settings: {str(e)}",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(request.path)
