# FocusGuard Web

Web-first version of FocusGuard built with React, TypeScript, and Vite.

## Current Scope

- Month calendar with Apple/Google-style day cells
- Four-character task chips inside calendar days
- Selected-day task list
- Add and complete tasks
- Local browser storage for the first prototype
- Paid-only AI credits UI
- Netlify build config

## Product Direction

The web app should stay usable for free users without AI spend. AI features should require purchased credits:

- AI task import
- AI schedule cleanup
- AI planning suggestions

Future production wiring:

- Supabase for auth, tasks, and credit balances
- Netlify Functions for protected API calls
- Stripe Checkout for credit packs
- Stripe webhooks to add credits after payment
- OpenAI calls only from server-side functions

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
