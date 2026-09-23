import hashlib
import mimetypes
import os
import posixpath
import re
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import quote, urlparse

import cloudinary
import cloudinary.models
import requests
from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import models


try:
    import boto3
except ImportError:  # pragma: no cover - reported clearly at runtime
    boto3 = None


CLOUDINARY_HOST = "res.cloudinary.com"


@dataclass
class MediaFieldRef:
    model: type[models.Model]
    field: models.Field
    resource_type: str


def iter_cloudinary_fields() -> Iterable[MediaFieldRef]:
    for model in apps.get_models():
        for field in model._meta.fields:
            if isinstance(field, cloudinary.models.CloudinaryField):
                resource_type = getattr(field, "resource_type", None) or "image"
                yield MediaFieldRef(model=model, field=field, resource_type=resource_type)


def clean_prefix(value: str) -> str:
    return value.strip().strip("/").replace("\\", "/")


def sanitize_key_part(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._/-]+", "-", value.strip())
    value = re.sub(r"-{2,}", "-", value)
    return value.strip("-./") or "asset"


def is_cloudinary_url(value: str) -> bool:
    try:
        return urlparse(value).netloc.lower() == CLOUDINARY_HOST
    except Exception:
        return False


def source_url(value: str, resource_type: str) -> str:
    if value.startswith(("http://", "https://")):
        return value
    return cloudinary.CloudinaryResource(
        value,
        default_resource_type=resource_type,
    ).build_url(secure=True, resource_type=resource_type)


def extension_from_response(url: str, content_type: str | None, fallback: str) -> str:
    path_ext = os.path.splitext(urlparse(url).path)[1]
    if path_ext and len(path_ext) <= 8:
        return path_ext
    guessed = mimetypes.guess_extension((content_type or "").split(";")[0].strip())
    if guessed:
        return guessed
    fallback_ext = os.path.splitext(fallback)[1]
    return fallback_ext if fallback_ext else ".bin"


def public_url(base_url: str, key: str) -> str:
    return f"{base_url.rstrip('/')}/{quote(key, safe='/')}"


class Command(BaseCommand):
    help = (
        "Copy Cloudinary-backed media fields to Cloudflare R2 and optionally "
        "update the database fields to the new public R2 URLs."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--commit",
            action="store_true",
            help="Actually upload files and update database rows. Default is dry-run.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Stop after this many assets. Useful for testing.",
        )
        parser.add_argument(
            "--only-model",
            default="",
            help="Optional model filter, e.g. events.Contestant or Contestant.",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Upload even if the object key already exists in R2.",
        )
        parser.add_argument(
            "--prefix",
            default=os.environ.get("R2_KEY_PREFIX", "missculture"),
            help="R2 object key prefix. Defaults to R2_KEY_PREFIX or 'missculture'.",
        )

    def handle(self, *args, **options):
        commit = options["commit"]
        limit = options["limit"]
        only_model = options["only_model"].lower().strip()
        prefix = clean_prefix(options["prefix"])

        bucket = os.environ.get("R2_BUCKET_NAME", "").strip()
        endpoint_url = os.environ.get("R2_ENDPOINT_URL", "").strip()
        access_key = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
        secret_key = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
        public_base = os.environ.get("R2_PUBLIC_BASE_URL", "").strip()

        if commit:
            missing = [
                name for name, value in (
                    ("R2_BUCKET_NAME", bucket),
                    ("R2_ENDPOINT_URL", endpoint_url),
                    ("R2_ACCESS_KEY_ID", access_key),
                    ("R2_SECRET_ACCESS_KEY", secret_key),
                    ("R2_PUBLIC_BASE_URL", public_base),
                )
                if not value
            ]
            if missing:
                raise CommandError(f"Missing required R2 environment variables: {', '.join(missing)}")
            if boto3 is None:
                raise CommandError("boto3 is required. Install requirements first: pip install -r requirements.txt")
            s3 = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name="auto",
            )
        else:
            s3 = None

        self.stdout.write(self.style.WARNING("DRY RUN: no uploads or database updates") if not commit else self.style.SUCCESS("COMMIT: uploading and updating rows"))

        processed = 0
        uploaded = 0
        updated = 0
        skipped = 0
        failed = 0

        for ref in iter_cloudinary_fields():
            model_label = ref.model._meta.label
            if only_model and only_model not in {model_label.lower(), ref.model.__name__.lower()}:
                continue

            qs = ref.model.objects.exclude(**{f"{ref.field.name}__isnull": True}).exclude(**{ref.field.name: ""})
            for obj in qs.iterator():
                raw_value = str(getattr(obj, ref.field.name) or "").strip()
                if not raw_value:
                    continue
                if raw_value.startswith(("http://", "https://")) and not is_cloudinary_url(raw_value):
                    skipped += 1
                    continue

                processed += 1
                if limit and processed > limit:
                    self.stdout.write(self.style.WARNING(f"Limit reached: {limit} asset(s)."))
                    self._summary(processed - 1, uploaded, updated, skipped, failed)
                    return

                try:
                    src = source_url(raw_value, ref.resource_type)
                    obj_key, content, content_type = self._download_and_key(
                        src=src,
                        raw_value=raw_value,
                        ref=ref,
                        obj=obj,
                        prefix=prefix,
                    )
                    dest = public_url(public_base or "https://example-r2-domain.invalid", obj_key)

                    self.stdout.write(f"{model_label}#{obj.pk}.{ref.field.name}")
                    self.stdout.write(f"  {src}")
                    self.stdout.write(f"  -> {dest}")

                    if commit:
                        if not options["overwrite"] and self._exists(s3, bucket, obj_key):
                            self.stdout.write("  exists in R2, keeping object")
                        else:
                            s3.put_object(
                                Bucket=bucket,
                                Key=obj_key,
                                Body=content,
                                ContentType=content_type or "application/octet-stream",
                            )
                            uploaded += 1

                        setattr(obj, ref.field.name, dest)
                        obj.save(update_fields=[ref.field.name])
                        updated += 1
                except Exception as exc:
                    failed += 1
                    self.stderr.write(self.style.ERROR(f"Failed {model_label}#{obj.pk}.{ref.field.name}: {exc}"))

        self._summary(processed, uploaded, updated, skipped, failed)

    def _download_and_key(self, src: str, raw_value: str, ref: MediaFieldRef, obj: models.Model, prefix: str):
        response = requests.get(src, timeout=60)
        response.raise_for_status()
        content = response.content
        content_type = response.headers.get("content-type")
        digest = hashlib.sha256(content).hexdigest()[:12]

        basename = sanitize_key_part(posixpath.basename(urlparse(src).path) or raw_value)
        ext = extension_from_response(src, content_type, basename)
        stem = sanitize_key_part(os.path.splitext(basename)[0])
        app_label = sanitize_key_part(ref.model._meta.app_label)
        model_name = sanitize_key_part(ref.model.__name__.lower())
        field_name = sanitize_key_part(ref.field.name)
        pk = sanitize_key_part(str(obj.pk))

        key_parts = [part for part in (prefix, app_label, model_name, field_name, pk, f"{stem}-{digest}{ext}") if part]
        return "/".join(key_parts), content, content_type

    def _exists(self, s3, bucket: str, key: str) -> bool:
        try:
            s3.head_object(Bucket=bucket, Key=key)
            return True
        except Exception:
            return False

    def _summary(self, processed: int, uploaded: int, updated: int, skipped: int, failed: int):
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Migration summary"))
        self.stdout.write(f"  Cloudinary assets found: {processed}")
        self.stdout.write(f"  Uploaded to R2: {uploaded}")
        self.stdout.write(f"  Database rows updated: {updated}")
        self.stdout.write(f"  Already non-Cloudinary URLs skipped: {skipped}")
        self.stdout.write(f"  Failed: {failed}")
