# Cloudinary to Cloudflare R2 migration

This backend includes a Django management command that copies existing
Cloudinary media references to Cloudflare R2 and updates the database fields to
public R2 URLs.

The command is safe by default: without `--commit` it only performs a dry run.

## Required environment variables

Set these in the backend environment before running with `--commit`:

```env
R2_BUCKET_NAME=your-bucket-name
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_PUBLIC_BASE_URL=https://media.your-domain.com
R2_KEY_PREFIX=missculture
```

`R2_PUBLIC_BASE_URL` must be a public custom domain or public R2 URL that can
serve objects from the bucket. The command stores this URL in the database.

## Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

## Run a small dry run

```bash
python manage.py migrate_cloudinary_to_r2 --limit 5
```

You should see Cloudinary source URLs and the R2 URLs that would be written.
No upload or database update happens during a dry run.

## Test one model first

```bash
python manage.py migrate_cloudinary_to_r2 --only-model Contestant --limit 3
```

## Commit the migration

Back up the production database first, then run:

```bash
python manage.py migrate_cloudinary_to_r2 --commit
```

Useful narrower command:

```bash
python manage.py migrate_cloudinary_to_r2 --commit --only-model gallery.Photo
```

## Repair already-migrated R2 URLs

If an early migration saved a public URL without the extension but the R2 object
exists with an extension such as `.bin`, `.jpg`, or `.webp`, run:

```bash
python manage.py migrate_cloudinary_to_r2 --repair-r2-urls
```

If the dry run shows the correct replacements, commit them:

```bash
python manage.py migrate_cloudinary_to_r2 --repair-r2-urls --commit
```

## What it migrates

The command scans every Django model field that uses `CloudinaryField`, including:

- contestant photos
- event featured images
- gallery photos, thumbnails, and collection covers
- page hero images
- logos
- Kenya page images
- ambassador and team images
- uploaded gallery videos and thumbnails

Rows that already contain a non-Cloudinary `https://...` URL are skipped.

## After migration

The serializers now pass external R2 URLs through unchanged. Gallery thumbnail
fields also avoid Cloudinary transformations when the stored media value is an
external URL.

New admin uploads still use the current Cloudinary storage backend until the
project is switched to an R2 storage backend.
