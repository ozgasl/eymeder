# EYMeder — Alumni Platform

A full-featured alumni community platform built with **Next.js 15** and **Supabase**. EYMeder connects alumni through a member directory, events, groups, job board, news, mentorship, messaging, and an integrated store with payments.

## Features

- **Member Directory** — searchable alumni profiles with membership validation
- **Events** — create, browse, and register for events (with Fonzip integration)
- **Groups** — community groups members can create and join
- **Jobs** — alumni job board with postings and applications
- **News** — articles and announcements
- **Mentorship** — connect mentors and mentees
- **Messaging** — direct messages between members
- **Store** — products, cart, and checkout powered by **Stripe**
- **Gallery, Brands, Testimonials** — community content sections
- **Gamification** — points/engagement via `gamificationService`
- **QR Codes & Notifications** — membership QR codes and in-app notifications
- **Admin** — member upload and management tooling

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

## Deployment

The app is configured for **Vercel** (`vercel.json`). Set the environment variables above in your Vercel project settings, then deploy from the `main` branch.

## License

Private project — all rights reserved.