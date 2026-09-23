from rest_framework import serializers
import cloudinary
from .models import (
    Ambassador, CulturalCommunity, CulturalHeritage, KenyaRegion,
    Achievement, Partner, KenyaGalleryPhoto, SiteSettings, TeamMember,
    HomePageSettings, KenyaPageSettings, AmbassadorPageSettings,
    EventsPageSettings, GalleryPageSettings, PartnershipPageSettings, AboutPageSettings,
    VotingPageSettings, ContactPageSettings, FAQPageSettings,
    ContributePageSettings, PrivacyPageSettings, TermsPageSettings
)


def _cloudinary_url(field_value, resource_type='image', width=None, height=None, crop=None):
    """Build an optimized Cloudinary URL with auto-format and auto-quality."""
    if not field_value:
        return None
    url = str(field_value)
    if url.startswith(('http://', 'https://')):
        return url
    if url.startswith('r2/'):
        return field_value.url
    
    # Build transformation parameters
    transformation = [
        {'fetch_format': 'auto', 'quality': 'auto'},  # f_auto, q_auto for optimization
    ]
    
    if width:
        transformation[0]['width'] = width
    if height:
        transformation[0]['height'] = height
    if crop:
        transformation[0]['crop'] = crop
    
    return cloudinary.CloudinaryResource(
        url, default_resource_type=resource_type
    ).build_url(transformation=transformation)


class KenyaGalleryPhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        return _cloudinary_url(obj.image)

    class Meta:
        model = KenyaGalleryPhoto
        fields = ['id', 'image_url', 'caption', 'order']


class AmbassadorSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()

    def get_profile_image_url(self, obj):
        return _cloudinary_url(obj.profile_image)

    class Meta:
        model = Ambassador
        fields = '__all__'


class CulturalCommunitySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    gallery_photos = KenyaGalleryPhotoSerializer(many=True, read_only=True, source='gallery')

    def get_image_url(self, obj):
        return _cloudinary_url(obj.image)

    class Meta:
        model = CulturalCommunity
        fields = '__all__'


class CulturalHeritageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    audio_clip_url = serializers.SerializerMethodField()
    video_clip_url = serializers.SerializerMethodField()
    gallery_photos = KenyaGalleryPhotoSerializer(many=True, read_only=True, source='gallery')

    def get_image_url(self, obj):
        return _cloudinary_url(obj.image)

    def get_audio_clip_url(self, obj):
        return _cloudinary_url(obj.audio_clip, resource_type='video')

    def get_video_clip_url(self, obj):
        if obj.video_url:
            return obj.video_url
        return _cloudinary_url(obj.video_clip, resource_type='video')

    class Meta:
        model = CulturalHeritage
        fields = '__all__'


class KenyaRegionSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    gallery_photos = KenyaGalleryPhotoSerializer(many=True, read_only=True, source='gallery')

    def get_image_url(self, obj):
        return _cloudinary_url(obj.image)

    class Meta:
        model = KenyaRegion
        fields = '__all__'


class AchievementSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    gallery_photos = KenyaGalleryPhotoSerializer(many=True, read_only=True, source='gallery')

    def get_image_url(self, obj):
        return _cloudinary_url(obj.image)

    class Meta:
        model = Achievement
        fields = '__all__'


class PartnerSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    def get_logo_url(self, obj):
        return _cloudinary_url(obj.logo)

    class Meta:
        model = Partner
        fields = '__all__'


class TeamMemberSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        return _cloudinary_url(obj.image)

    class Meta:
        model = TeamMember
        fields = '__all__'


class SiteSettingsSerializer(serializers.ModelSerializer):
    """Serializer for site-wide logos only"""
    # Logo URLs
    logo_kenya_url = serializers.SerializerMethodField()
    logo_global_url = serializers.SerializerMethodField()
    mpesa_logo_url = serializers.SerializerMethodField()

    def get_logo_kenya_url(self, obj):
        return _cloudinary_url(obj.logo_kenya)

    def get_logo_global_url(self, obj):
        return _cloudinary_url(obj.logo_global)

    def get_mpesa_logo_url(self, obj):
        return _cloudinary_url(obj.mpesa_logo)

    class Meta:
        model = SiteSettings
        fields = [
            'logo_kenya_url', 'logo_global_url', 'mpesa_logo_url',
            'created_at', 'updated_at'
        ]


class DiscoverKenyaSerializer(serializers.Serializer):
    regions = KenyaRegionSerializer(many=True)
    communities = CulturalCommunitySerializer(many=True)
    heritage = CulturalHeritageSerializer(many=True)
    achievements = AchievementSerializer(many=True)


# ── Individual Page Settings Serializers ────────────────────────────────────

class HomePageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    kenya_highlight_image_url = serializers.SerializerMethodField()
    ambassador_highlight_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = HomePageSettings
        fields = [
            'hero_image', 'hero_image_url',
            'kenya_highlight_image', 'kenya_highlight_image_url', 'kenya_highlight_enabled',
            'ambassador_highlight_image', 'ambassador_highlight_image_url', 'ambassador_highlight_enabled',
            'upcoming_event_enabled', 'recent_event_enabled',
            'created_at', 'updated_at'
        ]
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)

    def get_kenya_highlight_image_url(self, obj):
        return _cloudinary_url(obj.kenya_highlight_image)
    
    def get_ambassador_highlight_image_url(self, obj):
        return _cloudinary_url(obj.ambassador_highlight_image)


class KenyaPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = KenyaPageSettings
        fields = [
            'hero_image', 'hero_image_url', 'page_title', 'page_subtitle',
            'show_cultural_facts', 'show_regions', 'show_communities',
            'show_heritage', 'show_achievements',
            'created_at', 'updated_at'
        ]
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)


class AmbassadorPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AmbassadorPageSettings
        fields = [
            'hero_image', 'hero_image_url', 'profile_image', 'profile_image_url',
            'video_url', 'page_title', 'page_subtitle',
            'show_story_arc', 'show_impact_stats', 'show_core_messages',
            'show_gallery', 'show_videos', 'show_contact_cta',
            'created_at', 'updated_at'
        ]
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)
    
    def get_profile_image_url(self, obj):
        return _cloudinary_url(obj.profile_image)


class EventsPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = EventsPageSettings
        fields = ['hero_image', 'hero_image_url', 'page_title', 'page_subtitle', 'created_at', 'updated_at']
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)


class GalleryPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = GalleryPageSettings
        fields = ['hero_image', 'hero_image_url', 'page_title', 'page_subtitle', 'created_at', 'updated_at']
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)


class PartnershipPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PartnershipPageSettings
        fields = ['hero_image', 'hero_image_url', 'page_title', 'page_subtitle', 'created_at', 'updated_at']
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)


class AboutPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    mission_image_url = serializers.SerializerMethodField()
    leader_1_image_url = serializers.SerializerMethodField()
    leader_2_image_url = serializers.SerializerMethodField()
    leader_3_image_url = serializers.SerializerMethodField()
    leader_4_image_url = serializers.SerializerMethodField()
    leader_5_image_url = serializers.SerializerMethodField()
    leader_6_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AboutPageSettings
        fields = [
            'hero_image', 'hero_image_url', 'page_title', 'page_subtitle',
            'mission_image', 'mission_image_url',
            'leader_1_image', 'leader_1_image_url', 'leader_1_name', 'leader_1_title', 'leader_1_bio',
            'leader_2_image', 'leader_2_image_url', 'leader_2_name', 'leader_2_title', 'leader_2_bio',
            'leader_3_image', 'leader_3_image_url', 'leader_3_name', 'leader_3_title', 'leader_3_bio',
            'leader_4_image', 'leader_4_image_url', 'leader_4_name', 'leader_4_title', 'leader_4_bio',
            'leader_5_image', 'leader_5_image_url', 'leader_5_name', 'leader_5_title', 'leader_5_bio',
            'leader_6_image', 'leader_6_image_url', 'leader_6_name', 'leader_6_title', 'leader_6_bio',
            'committee_1_name', 'committee_1_role', 'committee_1_bio',
            'committee_2_name', 'committee_2_role', 'committee_2_bio',
            'committee_3_name', 'committee_3_role', 'committee_3_bio',
            'committee_4_name', 'committee_4_role', 'committee_4_bio',
            'committee_5_name', 'committee_5_role', 'committee_5_bio',
            'committee_6_name', 'committee_6_role', 'committee_6_bio',
            'created_at', 'updated_at'
        ]
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)
    
    def get_mission_image_url(self, obj):
        return _cloudinary_url(obj.mission_image)
    
    def get_leader_1_image_url(self, obj):
        return _cloudinary_url(obj.leader_1_image)
    
    def get_leader_2_image_url(self, obj):
        return _cloudinary_url(obj.leader_2_image)
    
    def get_leader_3_image_url(self, obj):
        return _cloudinary_url(obj.leader_3_image)

    def get_leader_4_image_url(self, obj):
        return _cloudinary_url(obj.leader_4_image)

    def get_leader_5_image_url(self, obj):
        return _cloudinary_url(obj.leader_5_image)

    def get_leader_6_image_url(self, obj):
        return _cloudinary_url(obj.leader_6_image)


class VotingPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    event_1_image_url = serializers.SerializerMethodField()
    event_2_image_url = serializers.SerializerMethodField()
    event_3_image_url = serializers.SerializerMethodField()
    event_4_image_url = serializers.SerializerMethodField()
    participant_1_image_url = serializers.SerializerMethodField()
    participant_2_image_url = serializers.SerializerMethodField()
    participant_3_image_url = serializers.SerializerMethodField()
    participant_4_image_url = serializers.SerializerMethodField()
    participant_5_image_url = serializers.SerializerMethodField()
    participant_6_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = VotingPageSettings
        fields = [
            'hero_image', 'hero_image_url', 'page_title', 'page_subtitle',
            'event_1_image', 'event_1_image_url',
            'event_2_image', 'event_2_image_url',
            'event_3_image', 'event_3_image_url',
            'event_4_image', 'event_4_image_url',
            'participant_1_image', 'participant_1_image_url',
            'participant_2_image', 'participant_2_image_url',
            'participant_3_image', 'participant_3_image_url',
            'participant_4_image', 'participant_4_image_url',
            'participant_5_image', 'participant_5_image_url',
            'participant_6_image', 'participant_6_image_url',
            'created_at', 'updated_at'
        ]
    
    def get_hero_image_url(self, obj): return _cloudinary_url(obj.hero_image)
    def get_event_1_image_url(self, obj): return _cloudinary_url(obj.event_1_image)
    def get_event_2_image_url(self, obj): return _cloudinary_url(obj.event_2_image)
    def get_event_3_image_url(self, obj): return _cloudinary_url(obj.event_3_image)
    def get_event_4_image_url(self, obj): return _cloudinary_url(obj.event_4_image)
    def get_participant_1_image_url(self, obj): return _cloudinary_url(obj.participant_1_image)
    def get_participant_2_image_url(self, obj): return _cloudinary_url(obj.participant_2_image)
    def get_participant_3_image_url(self, obj): return _cloudinary_url(obj.participant_3_image)
    def get_participant_4_image_url(self, obj): return _cloudinary_url(obj.participant_4_image)
    def get_participant_5_image_url(self, obj): return _cloudinary_url(obj.participant_5_image)
    def get_participant_6_image_url(self, obj): return _cloudinary_url(obj.participant_6_image)


class ContactPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ContactPageSettings
        fields = ['hero_image', 'hero_image_url', 'page_title', 'page_subtitle', 'created_at', 'updated_at']
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)


class FAQPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = FAQPageSettings
        fields = ['hero_image', 'hero_image_url', 'page_title', 'page_subtitle', 'created_at', 'updated_at']
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)


class ContributePageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ContributePageSettings
        fields = ['hero_image', 'hero_image_url', 'page_title', 'page_subtitle', 'created_at', 'updated_at']
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)


class PrivacyPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PrivacyPageSettings
        fields = ['hero_image', 'hero_image_url', 'page_title', 'page_subtitle', 'created_at', 'updated_at']
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)


class TermsPageSettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TermsPageSettings
        fields = ['hero_image', 'hero_image_url', 'page_title', 'page_subtitle', 'created_at', 'updated_at']
    
    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)

