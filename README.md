# Miss Culture Global Kenya

Official digital platform for Miss Culture Global Kenya — a movement showcasing Kenya's heritage through pageants, community programs, and global partnerships.

This repository contains a full-stack web application:
- Frontend: Next.js (App Router) + TypeScript
- Backend: Django REST API

Language composition (approx.): TypeScript (34%), JavaScript (32.5%), Python (21.3%), CSS (11.8%), HTML (0.4%)

Status: Active development. Proprietary; do not redistribute.

---

## Project overview

The site presents the organization through a public website with pages for:
- Home, Kenya (regions & heritage), Ambassador, About, Partnerships, Contact, FAQ, Terms & Privacy
- Gallery (photos & videos with collections and lightbox)
- Events (upcoming, past, featured) with ticketing and checkout
- Voting (public voting for pageants and cultural events)
- Contributions (donation / support flows)

Key backend responsibilities: content management (Django Admin), ticketing, payments (PesaPal), voting, email notifications, and media storage (Cloudinary).

---

## Technical stack

- Frontend: Next.js (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Axios, SWR
- Backend: Django 5.2, Django REST Framework, PostgreSQL (prod), SQLite (local dev), Gunicorn, WhiteNoise
- Media & 3rd party: Cloudinary, PesaPal, Resend (email), optional Telegram alerts

---

## Repository structure

```
MissCultureKenya-Final/
├── frontend/          # Next.js application
│   └── src/
│       ├── app/       # Pages and routes
│       ├── components/
│       └── lib/       # API client and settings hooks
├── backend/           # Django application
│   ├── missculture/   # Project settings
│   ├── main/          # Site content, settings, contact
│   ├── gallery/       # Photos, videos, collections
│   └── events/        # Events, tickets, voting, payments
└── README.md
```

Frontend also includes its own README at `frontend/README.md` with Next.js-specific info.

---

## Getting started (development)

Prerequisites: Node.js 24.x, Python 3.8+, Git, (optional) PostgreSQL for local parity.

Backend (development):

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
# source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Admin: `http://localhost:8000/admin/`
API: `http://localhost:8000/api/`

Frontend (development):

```bash
cd frontend
npm install
npm run dev
```

Site: `http://localhost:3000`

Set environment variable in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## Environment variables

Backend (`backend/.env` or environment):

- `SECRET_KEY` — Django secret key
- `DEBUG` — `True` for local development
- `ALLOWED_HOSTS` — Comma-separated hostnames
- `DATABASE_URL` — PostgreSQL connection string (optional locally)
- `CORS_ALLOWED_ORIGINS` — Frontend origin(s), e.g. `http://localhost:3000`
- `CSRF_TRUSTED_ORIGINS` — Same as CORS for form submissions
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Media storage
- `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET` — Payment gateway
- `PESAPAL_IPN_ID`, `PESAPAL_CALLBACK_URL`, `PESAPAL_IPN_URL` — PesaPal callbacks
- `FRONTEND_URL` — Frontend base URL for payment redirects
- `RESEND_API_KEY`, `DEFAULT_FROM_EMAIL`, `ADMIN_EMAIL` — Email delivery
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — Optional payment notifications

Frontend (`frontend/.env.local`):

- `NEXT_PUBLIC_API_BASE_URL` — Backend URL, e.g. `http://localhost:8000`

---

## API overview (selected endpoints)

Main (`/api/main/`):
- `GET /settings/` — Site-wide settings and logos
- `GET /settings/{page}/` — Page-specific settings (home, kenya, ambassador, events, gallery, etc.)
- `GET /ambassador/`, `/communities/`, `/heritage/`, `/regions/`, `/achievements/`, `/partners/`, `/team/`
- `GET /discover/` — Combined Kenya content
- `POST /contact/` — Contact form submission

Gallery (`/api/gallery/`):
- `GET /collections/`, `/photos/`, `/videos/`, `/settings/`

Events (`/api/events/`):
- `GET /events/`, `/events/upcoming/`, `/events/past/`, `/events/featured/`, `/events/voting_events/`
- `GET /events/{id}/live_results/` — Voting standings
- `POST /events/{id}/register_ticket/` — Free ticket registration
- `POST /events/{id}/initiate_ticket_payment/` — Paid ticket checkout
- `POST /events/{id}/initiate_vote_payment/` — Vote checkout
- `GET /contestants/`, `/ticket-categories/`
- `GET /verify-votes/?phone=` — Vote lookup by phone
- `GET /ticket-lookup/?code=` — Ticket lookup by code
- `POST /contributions/initiate/` — Donation checkout

---

## Tickets, voting & payments (notes)

- Ticket codes use the pattern `PREFIX-RAND4#YY` (e.g. `FOS-WER3#26`)
- Paid flows use PesaPal (M-Pesa and card) and the backend validates IPN callbacks
- Voting payments are calculated from the payment amount and configured vote price
- Ticket lookup and gate scanning are supported via ticket code and `is_used` flag

---

## Deployment

- Backend: migrations run, static files collected, Gunicorn (or similar) serves the Django app. `railway.json` includes a sample Railway config.
- Frontend: build with `npm run build` and serve the built app (platform-specific instructions depend on host — Vercel, Netlify, or a node server).

Production should configure secure environment variables, a production database (Postgres), and a CDN for media when needed.

---

## Contributing

This repository is proprietary. If you are an internal contributor or collaborator:
- Open issues or pull requests in this repository with a clear description of the change
- Run the dev setup locally before submitting changes
- Include tests and update documentation for new features

For access or contribution questions, contact the repository owner/maintainer.

---

## Maintainers & contact

Maintainer: repository owner (mickey-roggers)

For questions about setup, deployment, or integrations (PesaPal, Cloudinary, Resend), open an issue or contact the maintainer directly.

---

## License

Proprietary and confidential. All rights reserved.
