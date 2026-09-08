# EYMeder — Alumni Platform

A full-featured alumni community platform built with **Next.js 15** and **Supabase**. EYMeder connects alumni through a member directory, events, groups, job board, news, mentorship, messaging, and an integrated store with payments.

## Features

- **Member Directory** — searchable alumni profiles with membership validation, social handles shown as `@username` (LinkedIn/X/Instagram/Facebook)
- **Events** — create, browse, and register for in-app events; also surfaces live upcoming events from Fonzip with a direct ticket link (see [Fonzip integration](#fonzip-integration) below)
- **Groups** — community groups members can create and join, optionally linked to an external chat (WhatsApp/Telegram)
- **Jobs** — alumni job board with postings and applications
- **News** — articles and announcements
- **Mentorship** — connect mentors and mentees
- **Messaging** — direct messages between members
- **Store** — products, cart, and checkout powered by **Stripe**
- **Gallery, Brands, Testimonials** — community content sections; brands can list Instagram/X handles and an alumnus they're connected to
- **Brand discount codes** — partner brands can supply their own code, or we generate one from the discount rate (%10 → `EYB10`, see `src/lib/discountCode.ts`). Each code has an optional validity window and redemption cap, and can either be shared by all members or issued per member as a single-use code (`EYB10-7F3K2A`). Codes are readable only by `dernek_uyesi` members (enforced by RLS, not just the UI). Only a staff-confirmed redemption (`/api/admin/brand-codes/redeem`) counts as use: each one is a row in `brand_code_redemptions`, so a member's repeat visits to a shared code are counted separately, while `brand_code_usages` holds their per-campaign state (revealed, personal code, expiry)
- **Gamification** — points/engagement via `gamificationService`
- **QR Codes & Notifications** — real scannable membership QR codes (`qrcode.react`) and in-app notifications
- **Admin** — member upload and management tooling

### Fonzip integration

Fonzip is the association's dues/membership platform. `src/lib/fonzipClient.ts`
looks up a member's tags (Dernek Üyesi / Mezun Üye / Yönetim) to decide their
`membership_tier`, first by a computed `membership_no`
(`graduation_year` + `school_number`, see `src/lib/fonzipMembershipNo.ts`),
falling back to matching by email/phone if that doesn't find anyone (some
accounts predate that numbering convention, or a member's `graduation_year`
was simply entered wrong at signup). Fonzip's full OpenAPI spec is checked
into the repo at `docs/fonzip-api/fonzip-api-v2.yaml` — check it before
building against a new Fonzip endpoint.

## Tech Stack

| Area | Technology |
|------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (Pages Router, Turbopack) |
| Language | TypeScript |
| Backend / DB / Auth | [Supabase](https://supabase.com/) |
| Payments | [Stripe](https://stripe.com/) |
| Styling | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| Forms & Validation | React Hook Form + Zod |
| Animation | Framer Motion |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project
- A [Stripe](https://stripe.com/) account (for store/payments)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ozgasl/eymeder.git
   cd eymeder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   SUPABASE_DB_PASSWORD=your-db-password
   ```

4. Apply database migrations (requires the [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── components/      # UI components (incl. shadcn/ui in components/ui)
├── contexts/        # React context providers
├── hooks/           # Custom hooks
├── integrations/
│   └── supabase/    # Supabase client & integration
├── lib/             # Utilities
├── pages/           # Next.js routes
│   ├── api/         # API routes (e.g. validate-membership)
│   ├── about/ admin/ auth/ events/ groups/ jobs/ news/ store/
│   └── ...
├── services/        # Domain logic (auth, events, jobs, store, payments, ...)
└── styles/          # Global styles
supabase/
└── migrations/      # Database schema migrations
```

## Project Memory

`memory/PROJECT_MEMORY.md` tracks cross-session architectural decisions and
hard-won lessons (RLS gotchas, Fonzip API quirks, known-unfixed issues) for
whoever — human or AI — picks up work on this repo next. Read it before
starting a new bugfix/feature session; append to it (newest first, under
"Oturum günlüğü") when you finish one.

## Deployment

The app is configured for **Vercel** (`vercel.json`). Set the environment variables above in your Vercel project settings, then deploy from the `main` branch.

## License

Private project — all rights reserved.