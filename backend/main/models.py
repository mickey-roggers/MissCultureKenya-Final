from django.db import models
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType
import cloudinary.models


class Ambassador(models.Model):
    """Model for Susan's ambassador profile"""
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    bio = models.TextField()
    mission_statement = models.TextField()
    profile_image = cloudinary.models.CloudinaryField('profile_image', folder='missculture/ambassador', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ambassador"
        verbose_name_plural = "Ambassador"
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class KenyaGalleryPhoto(models.Model):
    """Gallery photos for Kenya sections (regions, communities, heritage, achievements)"""
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    image = cloudinary.models.CloudinaryField('image', folder='missculture/kenya-gallery', blank=True, null=True)
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Kenya Gallery Photo"
        verbose_name_plural = "Kenya Gallery Photos"
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"Photo for {self.content_type.model} #{self.object_id}"


class CulturalCommunity(models.Model):
    """Model for different Kenyan cultural communities"""
    name = models.CharField(max_length=100)
    description = models.TextField()
    region = models.CharField(max_length=100)
    image = cloudinary.models.CloudinaryField('image', folder='missculture/communities', blank=True, null=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    gallery = GenericRelation(KenyaGalleryPhoto)

    class Meta:
        verbose_name = "Kenya - Community"
        verbose_name_plural = "Kenya - Communities"
        ordering = ['-featured', 'name']

    def __str__(self):
        return self.name


class CulturalHeritage(models.Model):
    """Model for cultural heritage items"""
    HERITAGE_TYPES = [
        ('language', 'Language'),
        ('ceremony', 'Ceremony'),
        ('dance', 'Dance'),
        ('music', 'Music'),
        ('art', 'Art'),
        ('craft', 'Craft'),
    ]
    
    title = models.CharField(max_length=200)
    heritage_type = models.CharField(max_length=20, choices=HERITAGE_TYPES)
    description = models.TextField()
    image = cloudinary.models.CloudinaryField('image', folder='missculture/heritage', blank=True, null=True)
    audio_clip = cloudinary.models.CloudinaryField('audio_clip', folder='missculture/audio', resource_type='video', blank=True, null=True)
    video_clip = cloudinary.models.CloudinaryField('video_clip', folder='missculture/heritage-video', resource_type='video', blank=True, null=True)
    video_url = models.URLField('video_url', blank=True, help_text="External video link (YouTube, etc.) — overrides uploaded video clip")
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    gallery = GenericRelation(KenyaGalleryPhoto)

    class Meta:
        verbose_name = "Kenya - Heritage"
        verbose_name_plural = "Kenya - Heritage"
        ordering = ['-featured', 'title']

    def __str__(self):
        return self.title


class KenyaRegion(models.Model):
    """Model for different regions of Kenya"""
    name = models.CharField(max_length=100)
    description = models.TextField()
    image = cloudinary.models.CloudinaryField('image', folder='missculture/regions', blank=True, null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    gallery = GenericRelation(KenyaGalleryPhoto)

    class Meta:
        verbose_name = "Kenya - Region"
        verbose_name_plural = "Kenya - Regions"
        ordering = ['-featured', 'name']

    def __str__(self):
        return self.name


class Achievement(models.Model):
    """Model for Kenya's global achievements"""
    ACHIEVEMENT_TYPES = [
        ('sports', 'Sports'),
        ('technology', 'Technology'),
        ('arts', 'Arts'),
        ('tourism', 'Tourism'),
        ('innovation', 'Innovation'),
    ]
    
    title = models.CharField(max_length=200)
    achievement_type = models.CharField(max_length=20, choices=ACHIEVEMENT_TYPES)
    description = models.TextField()
    image = cloudinary.models.CloudinaryField('image', folder='missculture/achievements', blank=True, null=True)
    year = models.IntegerField()
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    gallery = GenericRelation(KenyaGalleryPhoto)

    class Meta:
        verbose_name = "Kenya - Achievement"
        verbose_name_plural = "Kenya - Achievements"
        ordering = ['-featured', '-year', 'title']

    def __str__(self):
        return self.title


class Partner(models.Model):
    """Model for partners and sponsors"""
    name = models.CharField(max_length=200)
    logo = cloudinary.models.CloudinaryField('logo', folder='missculture/partners', blank=True, null=True)
    website_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    partner_type = models.CharField(max_length=50, choices=[
        ('sponsor', 'Sponsor'),
        ('partner', 'Partner'),
        ('supporter', 'Supporter'),
    ])
    display_order = models.PositiveIntegerField(default=0, help_text='Lower numbers appear first within each logo group.')
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Partnership - Partner/Sponsor"
        verbose_name_plural = "Partnership - Partners/Sponsors"
        ordering = ['partner_type', 'display_order', '-featured', 'name']

    def __str__(self):
        return self.name


class TeamMember(models.Model):
    """Model for leadership team members displayed on the About page"""
    TEAM_TYPE = [
        ('leadership', 'Leadership'),
        ('committee', 'Organizing Committee'),
    ]
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=200, blank=True, help_text="Role or title (e.g. Miss Culture Global Kenya, Director of Operations)")
    role = models.CharField(max_length=200, blank=True, help_text="Committee role (only for committee members)")
    bio = models.TextField(blank=True)
    image = cloudinary.models.CloudinaryField('image', folder='missculture/team', blank=True, null=True)
    team_type = models.CharField(max_length=20, choices=TEAM_TYPE, default='leadership')
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower = shown first)")
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "About - Team Member"
        verbose_name_plural = "About - Team Members"
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_team_type_display()})"


class SiteSettings(models.Model):
    """Singleton model for site-wide logos only"""

    # ── Logos (site-wide, used across all pages) ──
    logo_kenya = cloudinary.models.CloudinaryField('logo_kenya', folder='missculture/logos', blank=True, null=True,
        help_text='Logo for Miss Culture Global Kenya (local franchise)')
    logo_global = cloudinary.models.CloudinaryField('logo_global', folder='missculture/logos', blank=True, null=True,
        help_text='Logo for Miss Culture Global (parent organization)')
    mpesa_logo = cloudinary.models.CloudinaryField('mpesa_logo', folder='missculture/logos', blank=True, null=True,
        help_text='M-Pesa logo for payment sections')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"

    def __str__(self):
        return "Site Settings"


class AboutPageSettings(models.Model):
    """About page specific settings"""
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/about', blank=True, null=True)
    mission_image = cloudinary.models.CloudinaryField('mission', folder='missculture/pages/about', blank=True, null=True)
    
    page_title = models.CharField(max_length=200, default='About Us')
    page_subtitle = models.TextField(blank=True, default='Our story, mission, and values')
    
    leader_1_image = cloudinary.models.CloudinaryField('leader_1', folder='missculture/pages/about/leaders', blank=True, null=True)
    leader_1_name = models.CharField(max_length=100, blank=True, default='')
    leader_1_title = models.CharField(max_length=200, blank=True, default='')
    leader_1_bio = models.TextField(blank=True, default='')
    
    leader_2_image = cloudinary.models.CloudinaryField('leader_2', folder='missculture/pages/about/leaders', blank=True, null=True)
    leader_2_name = models.CharField(max_length=100, blank=True, default='')
    leader_2_title = models.CharField(max_length=200, blank=True, default='')
    leader_2_bio = models.TextField(blank=True, default='')
    
    leader_3_image = cloudinary.models.CloudinaryField('leader_3', folder='missculture/pages/about/leaders', blank=True, null=True)
    leader_3_name = models.CharField(max_length=100, blank=True, default='')
    leader_3_title = models.CharField(max_length=200, blank=True, default='')
    leader_3_bio = models.TextField(blank=True, default='')

    leader_4_image = cloudinary.models.CloudinaryField('leader_4', folder='missculture/pages/about/leaders', blank=True, null=True)
    leader_4_name = models.CharField(max_length=100, blank=True, default='')
    leader_4_title = models.CharField(max_length=200, blank=True, default='')
    leader_4_bio = models.TextField(blank=True, default='')

    leader_5_image = cloudinary.models.CloudinaryField('leader_5', folder='missculture/pages/about/leaders', blank=True, null=True)
    leader_5_name = models.CharField(max_length=100, blank=True, default='')
    leader_5_title = models.CharField(max_length=200, blank=True, default='')
    leader_5_bio = models.TextField(blank=True, default='')

    leader_6_image = cloudinary.models.CloudinaryField('leader_6', folder='missculture/pages/about/leaders', blank=True, null=True)
    leader_6_name = models.CharField(max_length=100, blank=True, default='')
    leader_6_title = models.CharField(max_length=200, blank=True, default='')
    leader_6_bio = models.TextField(blank=True, default='')
    
    committee_1_name = models.CharField(max_length=100, blank=True, default='')
    committee_1_role = models.CharField(max_length=200, blank=True, default='')
    committee_1_bio = models.TextField(blank=True, default='')
    
    committee_2_name = models.CharField(max_length=100, blank=True, default='')
    committee_2_role = models.CharField(max_length=200, blank=True, default='')
    committee_2_bio = models.TextField(blank=True, default='')
    
    committee_3_name = models.CharField(max_length=100, blank=True, default='')
    committee_3_role = models.CharField(max_length=200, blank=True, default='')
    committee_3_bio = models.TextField(blank=True, default='')
    
    committee_4_name = models.CharField(max_length=100, blank=True, default='')
    committee_4_role = models.CharField(max_length=200, blank=True, default='')
    committee_4_bio = models.TextField(blank=True, default='')
    
    committee_5_name = models.CharField(max_length=100, blank=True, default='')
    committee_5_role = models.CharField(max_length=200, blank=True, default='')
    committee_5_bio = models.TextField(blank=True, default='')
    
    committee_6_name = models.CharField(max_length=100, blank=True, default='')
    committee_6_role = models.CharField(max_length=200, blank=True, default='')
    committee_6_bio = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "About Page Settings"
        verbose_name_plural = "About Page Settings"
    
    def __str__(self):
        return "About Page Settings"


# ── Individual Page Settings Models ──────────────────────────────────────────

class HomePageSettings(models.Model):
    """Home page specific settings - hero, highlights, and feature toggles"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/home', blank=True, null=True)
    
    # Kenya Highlight Card (shown on homepage)
    kenya_highlight_image = cloudinary.models.CloudinaryField('kenya_highlight', folder='missculture/pages/home/highlights', blank=True, null=True,
        help_text='Image for Kenya highlight card on homepage')
    kenya_highlight_enabled = models.BooleanField(default=True, help_text='Show Kenya highlight section on homepage')
    
    # Ambassador Highlight Card (shown on homepage)
    ambassador_highlight_image = cloudinary.models.CloudinaryField('ambassador_highlight', folder='missculture/pages/home/highlights', blank=True, null=True,
        help_text='Image for Ambassador highlight card on homepage')
    ambassador_highlight_enabled = models.BooleanField(default=True, help_text='Show Ambassador spotlight section on homepage')
    
    # Events Section toggles
    upcoming_event_enabled = models.BooleanField(default=True, help_text='Show upcoming events section on homepage')
    recent_event_enabled = models.BooleanField(default=True, help_text='Show recent events section on homepage')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Home Page Settings"
        verbose_name_plural = "Home Page Settings"
    
    def __str__(self):
        return "Home Page Settings"


class KenyaPageSettings(models.Model):
    """Kenya page specific settings - hero and content toggles"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/kenya', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='Kenya')
    page_subtitle = models.TextField(blank=True, default='Our homeland, our culture, our global stage.')
    
    # Content toggles
    show_cultural_facts = models.BooleanField(default=True)
    show_regions = models.BooleanField(default=True)
    show_communities = models.BooleanField(default=True)
    show_heritage = models.BooleanField(default=True)
    show_achievements = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Kenya Page Settings"
        verbose_name_plural = "Kenya Page Settings"
    
    def __str__(self):
        return "Kenya Page Settings"


class AmbassadorPageSettings(models.Model):
    """Ambassador page specific settings - hero, profile, video, and content toggles"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/ambassador', blank=True, null=True)
    page_title = models.CharField(max_length=200, default="Susan — Kenya's Voice on the World Stage")
    page_subtitle = models.TextField(blank=True, default='Miss Culture Global Kenya Ambassador · Cultural diplomat · Youth champion')
    
    # Profile Section
    profile_image = cloudinary.models.CloudinaryField('profile', folder='missculture/pages/ambassador', blank=True, null=True,
        help_text='Profile image for ambassador (also used on homepage spotlight)')
    video_url = models.URLField('video_url', blank=True, null=True, help_text='Featured video URL for ambassador page')
    
    # Content sections
    show_story_arc = models.BooleanField(default=True)
    show_impact_stats = models.BooleanField(default=True)
    show_core_messages = models.BooleanField(default=True)
    show_gallery = models.BooleanField(default=True)
    show_videos = models.BooleanField(default=True)
    show_contact_cta = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Ambassador Page Settings"
        verbose_name_plural = "Ambassador Page Settings"
    
    def __str__(self):
        return "Ambassador Page Settings"


class EventsPageSettings(models.Model):
    """Events page specific settings - hero only"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/events', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='Events')
    page_subtitle = models.TextField(blank=True, default='Upcoming events and past highlights')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Events Page Settings"
        verbose_name_plural = "Events Page Settings"
    
    def __str__(self):
        return "Events Page Settings"


class GalleryPageSettings(models.Model):
    """Gallery page specific settings - hero only"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/gallery', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='Gallery')
    page_subtitle = models.TextField(blank=True, default='Photos and videos from our journey')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Gallery Page Settings"
        verbose_name_plural = "Gallery Page Settings"
    
    def __str__(self):
        return "Gallery Page Settings"


class PartnershipPageSettings(models.Model):
    """Partnership page specific settings"""
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/partnership', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='Partnership')
    page_subtitle = models.TextField(blank=True, default='Partner with us to make a difference')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Partnership Page Settings"
        verbose_name_plural = "Partnership Page Settings"
    
    def __str__(self):
        return "Partnership Page Settings"


class VotingPageSettings(models.Model):
    """Voting page specific settings - hero and voting images"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/voting', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='Vote')
    page_subtitle = models.TextField(blank=True, default='Support your favorite contestants')
    
    # Event images for voting page
    event_1_image = cloudinary.models.CloudinaryField('event_1', folder='missculture/pages/voting/events', blank=True, null=True)
    event_2_image = cloudinary.models.CloudinaryField('event_2', folder='missculture/pages/voting/events', blank=True, null=True)
    event_3_image = cloudinary.models.CloudinaryField('event_3', folder='missculture/pages/voting/events', blank=True, null=True)
    event_4_image = cloudinary.models.CloudinaryField('event_4', folder='missculture/pages/voting/events', blank=True, null=True)
    
    # Participant images for voting page
    participant_1_image = cloudinary.models.CloudinaryField('participant_1', folder='missculture/pages/voting/participants', blank=True, null=True)
    participant_2_image = cloudinary.models.CloudinaryField('participant_2', folder='missculture/pages/voting/participants', blank=True, null=True)
    participant_3_image = cloudinary.models.CloudinaryField('participant_3', folder='missculture/pages/voting/participants', blank=True, null=True)
    participant_4_image = cloudinary.models.CloudinaryField('participant_4', folder='missculture/pages/voting/participants', blank=True, null=True)
    participant_5_image = cloudinary.models.CloudinaryField('participant_5', folder='missculture/pages/voting/participants', blank=True, null=True)
    participant_6_image = cloudinary.models.CloudinaryField('participant_6', folder='missculture/pages/voting/participants', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Voting Page Settings"
        verbose_name_plural = "Voting Page Settings"
    
    def __str__(self):
        return "Voting Page Settings"


class ContactPageSettings(models.Model):
    """Contact page specific settings - hero only"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/contact', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='Contact Us')
    page_subtitle = models.TextField(blank=True, default='Get in touch with us')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Contact Page Settings"
        verbose_name_plural = "Contact Page Settings"
    
    def __str__(self):
        return "Contact Page Settings"


class FAQPageSettings(models.Model):
    """FAQ page specific settings - hero only"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/faq', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='FAQ')
    page_subtitle = models.TextField(blank=True, default='Frequently asked questions')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "FAQ Page Settings"
        verbose_name_plural = "FAQ Page Settings"
    
    def __str__(self):
        return "FAQ Page Settings"


class ContributePageSettings(models.Model):
    """Contribute page specific settings - hero only"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/contribute', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='Contribute')
    page_subtitle = models.TextField(blank=True, default='Support our mission')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Contribute Page Settings"
        verbose_name_plural = "Contribute Page Settings"
    
    def __str__(self):
        return "Contribute Page Settings"


class PrivacyPageSettings(models.Model):
    """Privacy page specific settings - hero only"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/privacy', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='Privacy Policy')
    page_subtitle = models.TextField(blank=True, default='Your privacy matters to us')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Privacy Page Settings"
        verbose_name_plural = "Privacy Page Settings"
    
    def __str__(self):
        return "Privacy Page Settings"


class TermsPageSettings(models.Model):
    """Terms page specific settings - hero only"""
    # Hero Section
    hero_image = cloudinary.models.CloudinaryField('hero', folder='missculture/pages/terms', blank=True, null=True)
    page_title = models.CharField(max_length=200, default='Terms of Service')
    page_subtitle = models.TextField(blank=True, default='Terms and conditions')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Terms Page Settings"
        verbose_name_plural = "Terms Page Settings"
    
    def __str__(self):
        return "Terms Page Settings"


