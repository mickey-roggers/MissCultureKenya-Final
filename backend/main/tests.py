from unittest.mock import patch

from django.core.files.base import ContentFile
from django.forms import ImageField as FormImageField
from django.test import SimpleTestCase, override_settings
from storages.backends.s3 import S3Storage

from events.models import Contestant
from gallery.models import Photo
from main.models import Ambassador
from main.serializers import AmbassadorSerializer


@override_settings(STORAGES={
    'default': {
        'BACKEND': 'storages.backends.s3.S3Storage',
        'OPTIONS': {
            'bucket_name': 'test-media',
            'endpoint_url': 'https://example.r2.cloudflarestorage.com',
            'access_key': 'test-key',
            'secret_key': 'test-secret',
            'region_name': 'auto',
            'custom_domain': 'media.example.com',
            'querystring_auth': False,
            'file_overwrite': False,
        },
    },
})
class R2AdminUploadTests(SimpleTestCase):
    def test_ambassador_upload_uses_r2_and_returns_public_url(self):
        ambassador = Ambassador()
        with patch.object(S3Storage, 'exists', return_value=False), patch.object(
            S3Storage, '_save', side_effect=lambda name, content: name
        ) as upload:
            ambassador.profile_image.save('portrait.jpg', ContentFile(b'image'), save=False)

        self.assertEqual(upload.call_count, 1)
        self.assertEqual(ambassador.profile_image.name, 'r2/missculture/ambassador/portrait.jpg')
        self.assertEqual(
            AmbassadorSerializer(ambassador).data['profile_image_url'],
            'https://media.example.com/r2/missculture/ambassador/portrait.jpg',
        )
        self.assertIsInstance(Ambassador._meta.get_field('profile_image').formfield(), FormImageField)

    def test_contestant_photo_uses_r2(self):
        contestant = Contestant()
        with patch.object(S3Storage, 'exists', return_value=False), patch.object(
            S3Storage, '_save', side_effect=lambda name, content: name
        ):
            contestant.photo.save('contestant.png', ContentFile(b'image'), save=False)

        self.assertEqual(contestant.photo.name, 'r2/missculture/contestants/contestant.png')
        self.assertEqual(
            contestant.photo.url,
            'https://media.example.com/r2/missculture/contestants/contestant.png',
        )

    def test_existing_public_url_is_preserved(self):
        ambassador = Ambassador(profile_image='https://media.example.com/older-image.jpg')
        self.assertEqual(ambassador.profile_image.url, 'https://media.example.com/older-image.jpg')

    def test_gallery_record_with_legacy_image_can_be_edited(self):
        photo = Photo(title='Older image', category='fashion', image='missculture/older-photo')
        photo.full_clean()

