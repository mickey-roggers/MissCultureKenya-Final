import cloudinary
from django.db import models
from django.db.models.fields.files import FieldFile, ImageFieldFile


class R2FileMixin:
    @property
    def url(self):
        if not self.name:
            raise ValueError('The file field has no file associated with it.')
        if self.name.startswith(('http://', 'https://')):
            return self.name
        if self.name.startswith('r2/'):
            return self.storage.url(self.name)
        # Rows saved before the storage switch can still contain Cloudinary IDs.
        return cloudinary.CloudinaryResource(
            self.name, default_resource_type=self.field.resource_type
        ).build_url(secure=True, resource_type=self.field.resource_type)


class R2FieldFile(R2FileMixin, FieldFile):
    pass


class R2ImageFieldFile(R2FileMixin, ImageFieldFile):
    pass


class R2FieldConfigMixin:
    def __init__(self, *args, folder=None, resource_type='image', **kwargs):
        if folder:
            kwargs.setdefault('upload_to', f'r2/{folder}')
        kwargs.setdefault('max_length', 500)
        self.resource_type = resource_type
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if self.resource_type != 'image':
            kwargs['resource_type'] = self.resource_type
        return name, path, args, kwargs


class R2FileField(R2FieldConfigMixin, models.FileField):
    attr_class = R2FieldFile


class R2ImageField(R2FieldConfigMixin, models.ImageField):
    attr_class = R2ImageFieldFile

