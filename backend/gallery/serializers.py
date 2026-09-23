from rest_framework import serializers
from .models import PhotoCollection, Photo, Video, GallerySettings
import cloudinary


def _cloudinary_url(field_value, resource_type='image', width=None, height=None, crop=None):
    """Build an optimized Cloudinary URL with auto-format and auto-quality."""
    if not field_value:
        return None
    url = str(field_value)
    if url.startswith(('http://', 'https://')):
        return url
    if url.startswith('r2/'):
        return field_value.url
    
    # Build transformation parameters with optimization
    transformation = [
        {'fetch_format': 'auto', 'quality': 'auto'},  # f_auto, q_auto
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


def _direct_url_if_external(field_value):
    if not field_value:
        return None
    url = str(field_value)
    if url.startswith(('http://', 'https://')):
        return url
    if url.startswith('r2/'):
        return field_value.url
    return None


class PhotoCollectionSerializer(serializers.ModelSerializer):
    cover_image_url = serializers.SerializerMethodField()

    def get_cover_image_url(self, obj):
        return _cloudinary_url(obj.cover_image)

    class Meta:
        model = PhotoCollection
        fields = '__all__'


class PhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    small_thumbnail_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        return _cloudinary_url(obj.image)

    def get_thumbnail_url(self, obj):
        direct_url = _direct_url_if_external(obj.thumbnail or obj.image)
        if direct_url:
            return direct_url

        # Generate optimized thumbnail with f_auto, q_auto
        if obj.image and not str(obj.image).startswith('r2/'):
            return cloudinary.CloudinaryResource(
                str(obj.image), default_resource_type='image'
            ).build_url(
                transformation=[{
                    'width': 400, 
                    'height': 300, 
                    'crop': 'fill',
                    'fetch_format': 'auto',
                    'quality': 'auto'
                }]
            )
        return None
    
    def get_small_thumbnail_url(self, obj):
        """Generate a small 200x150 thumbnail for grid layouts."""
        direct_url = _direct_url_if_external(obj.thumbnail or obj.image)
        if direct_url:
            return direct_url

        if obj.image and not str(obj.image).startswith('r2/'):
            return cloudinary.CloudinaryResource(
                str(obj.image), default_resource_type='image'
            ).build_url(
                transformation=[{
                    'width': 200, 
                    'height': 150, 
                    'crop': 'fill',
                    'fetch_format': 'auto',
                    'quality': 'auto'
                }]
            )
        return None

    class Meta:
        model = Photo
        fields = '__all__'


class VideoSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    def get_video_url(self, obj):
        # Prioritize external URL (YouTube etc.) over uploaded file
        if obj.video_url:
            return obj.video_url
        return _cloudinary_url(obj.video_file, resource_type='video')

    def get_video_file_url(self, obj):
        return _cloudinary_url(obj.video_file, resource_type='video')

    def get_thumbnail_url(self, obj):
        direct_url = _direct_url_if_external(obj.thumbnail)
        if direct_url:
            return direct_url

        # Auto-generate an optimized thumbnail from the video
        if obj.video_file and not str(obj.video_file).startswith('r2/'):
            return cloudinary.CloudinaryResource(
                str(obj.video_file), default_resource_type='video'
            ).build_url(
                transformation=[{
                    'width': 400, 
                    'height': 300, 
                    'crop': 'fill', 
                    'start_offset': '2',
                    'fetch_format': 'auto',
                    'quality': 'auto'
                }],
                resource_type='video'
            )
        return None

    class Meta:
        model = Video
        fields = '__all__'


class GallerySettingsSerializer(serializers.ModelSerializer):
    hero_image_url = serializers.SerializerMethodField()

    def get_hero_image_url(self, obj):
        return _cloudinary_url(obj.hero_image)

    class Meta:
        model = GallerySettings
        fields = '__all__'

