# FocusGuard Web

React + TypeScript + Vite web app for FocusGuard. The web version mirrors the current SwiftUI planner workflows while adapting the UI for desktop and mobile.

## Local Development

```bash
npm install
npm run dev
```

## Build And Lint

```bash
npm run lint
npm run build
```

The production build outputs to `dist/`.

## Netlify Deploy

This repo includes `netlify.toml`:

- build command: `npm run build`
- publish directory: `dist`
- SPA fallback: `/* -> /index.html`

Connect the repo in Netlify and keep secrets out of the Vite client environment.

## Current MVP

- App-first Today, Calendar, Import, and Settings pages
- Today combines task capture, the priority queue, upcoming work, filters, and one-time/recurring overview
- Local storage persistence isolated in `src/storage.ts`
- `PlannerTaskItem` equivalent model with deadlines, anytime tasks, optional duration, completion, notes, photo attachments, and recurrence series IDs
- Category management with the iOS default category, color palette, and max 8 categories
- Completed-task retention pruning for 7, 30, 60, 90 days, or Never
- Recurring task edit/delete scope handling for "Only this task" and "This and later repeats"
- Month calendar with Apple-style today marker, 4-character task chips, overflow chips, and selected-day task creation
- Paid-only Import UI with mock task suggestions and credit deduction only after accepted results
- Light, dark, and system theme support

## Future Architecture

The browser must never call OpenAI directly.

Production AI import should flow through server-side functions:

1. Browser uploads image/PDF metadata or file payload to a Netlify Function.
2. Function verifies Supabase auth.
3. Function checks the user's credit balance.
4. Function calls OpenAI with server-side secrets.
5. Function returns suggested tasks for user review.
6. Credits are deducted only after the user accepts a successful result.

Stripe should also be server-owned:

- Browser starts Stripe Checkout through a Netlify Function.
- Stripe webhook verifies payment and adds credits.
- Credit balances and purchase history move from local storage to Supabase.

Supabase can replace the storage helpers behind the current API shape:

- `loadTasks` / `saveTasks`
- `pruneExpiredTasks`
- `loadCategories` / `saveCategories`
- notes, attachments, settings, credits, and purchase history loaders
