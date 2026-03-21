# AGENTS.md

## Project Overview

This is an application built with utilizing the following tools: [React](https://react.dev/reference/react), [NEXT.js](https://nextjs.org/docs), [Radix UI](https://www.radix-ui.com/primitives/docs/overview/introduction), [Tailwindcss](https://tailwindcss.com/docs/installation/using-vite), [Tanstack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [NextAuth.js](https://next-auth.js.org/getting-started/introduction), [Zod](https://zod.dev/), [Zustand](https://zustand.docs.pmnd.rs/learn/getting-started/introduction), [Vitest](https://vitest.dev/guide/), [PostgreSQL](https://www.postgresql.org/docs/), [Docker](https://docs.docker.com/), [ESLint](https://eslint.org/docs/latest/), [Prettier](https://prettier.io/docs/).

## Build and Test Instructions

- **Install dependencies:** `npm install`
- **Start development server:** `npm run dev`
- **Run tests:** `npm run test`
- **Run typecheck:** `npm run typecheck`

## Deployment Instructions

- **Build:** `npm run build`
- **Deploy:** `npm run start`

## Environment

- **Framework**: NEXT.js 16 (App Router) + React 19
- **UI**: Radix UI
- **Language**: TypeScript
- **CSS**: Tailwind CSS 4
- **State Management**: Zustand
- **Authentication**: NextAuth.js
- **Password Security**: bcryptjs
- **Testing**: Vitest
- **Typechecking**: TypeScript (`tsc --noEmit`)
- **Validation**: Zod
- **Linting**: ESLint + Prettier
- **Caching**: TanStack Query (+ React Query Devtools for local debugging)
- **Database**: PostgreSQL via `pg`

## Project Structure

.
├── AGENTS.md
├── app
│   ├── api
│   │   ├── auth
│   │   │   ├── [...nextauth]
│   │   │   │   └── route.ts
│   │   │   └── register
│   │   │   └── route.ts
│   │   ├── health
│   │   │   └── route.ts
│   │   └── uploads
│   │   ├── [id]
│   │   │   ├── anomalies
│   │   │   │   └── route.ts
│   │   │   ├── events
│   │   │   │   └── route.ts
│   │   │   ├── route.ts
│   │   │   └── timeline
│   │   │   └── route.ts
│   │   └── route.ts
│   ├── archive
│   │   └── page.tsx
│   ├── dashboard
│   │   └── page.tsx
│   ├── fonts.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── login
│   │   └── page.tsx
│   ├── page.tsx
│   ├── register
│   │   └── page.tsx
│   └── uploads
│   └── [id]
│   └── page.tsx
├── auth.ts
├── components
│   ├── app-navigation.tsx
│   ├── archive-client.tsx
│   ├── dashboard-client.tsx
│   ├── pagination-controls.tsx
│   ├── providers.tsx
│   ├── status-badge.tsx
│   └── upload-details-client.tsx
├── developer
│   ├── documentation
│   │   ├── deployment_vercel_neon.md
│   │   ├── how_ai_works.md
│   │   ├── how_db_works.md
│   │   └── how_queries_work.md
│   ├── implementation-plans
│   │   ├── archiving_plan.md
│   │   └── plan.md
│   ├── prompts
│   │   └── frontend-post
│   │   ├── fill.md
│   │   ├── normalize.md
│   │   ├── research.md
│   │   └── steps.txt
│   └── skills
│   ├── brand-guidelines.md
│   ├── canvas-design.md
│   └── frontend-design.md
├── docker-compose.yml
├── Dockerfile
├── eslint.config.mjs
├── examples
│   ├── zscaler-sample.log
│   ├── zscaler-sample2.log
│   └── zscaler-sample3.log
├── hooks
│   ├── query-keys.ts
│   ├── useAnomaliesQuery.ts
│   ├── useDeleteUploadMutation.ts
│   ├── useEventsInfiniteQuery.ts
│   ├── useTimelineQuery.ts
│   ├── useUploadDetailsQuery.ts
│   ├── useUploadMutation.ts
│   └── useUploadsListQuery.ts
├── lib
│   ├── anomaly-labels.ts
│   ├── anomaly.ts
│   ├── auth-helpers.ts
│   ├── db.ts
│   ├── ingestion.ts
│   ├── parser
│   │   └── log-parser.ts
│   ├── uploads.ts
│   └── users.ts
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── public
├── README.md
├── store
│   └── upload-ui-store.ts
├── test
│   ├── anomaly.test.ts
│   ├── auth-helpers.test.ts
│   ├── auth-options.test.ts
│   ├── auth-register-route.test.ts
│   └── log-parser.test.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── types
│   ├── loggy.ts
│   └── next-auth.d.ts
└── vitest.config.ts

## Skills

All skills are listed in the [skills](./developer/skills) directory. Use these skills to guide the development of the project and new features.

- [Brand Guidelines](./developer/skills/brand-guidelines.md)
- [Canvas Design](./developer/skills/canvas-design.md)
- [Frontend Design](./developer/skills/frontend-design.md)

## Code Conventions

- Operate as a high-level Staff Engineer and treat every task with a high-level of rigor.
- Always check package.json for version numbers before using logic.
- Always check `AGENTS.md` for project constraints, guidelines, and requirements.
- Ensure integrity of answers by using official documentation linked in `AGENTS.md` as a reference point.
- Always give PR summaries in `.md` format.
- Never share values in the `.env` files publicly.

## Dependencies

- Use the [Zustand](https://zustand.docs.pmnd.rs/learn/getting-started/introduction) state manager for global state.
- Use [Radix UI](https://www.radix-ui.com/primitives/docs/overview/introduction) for UI components.
- Use [Tailwindcss](https://tailwindcss.com/docs/installation/using-vite) for styling.
- Use [NextAuth.js](https://next-auth.js.org/getting-started/introduction) for authentication.
- Use [Tanstack Query](https://tanstack.com/query/latest/docs/framework/react/overview) for caching.
- Use [TanStack Query Devtools](https://tanstack.com/query/latest/docs/framework/react/devtools) for local query debugging when needed.
- Use [Zod](https://zod.dev/) for validation.
- Use [pg](https://node-postgres.com/) as the PostgreSQL client in the backend.
- Use [bcryptjs](https://www.npmjs.com/package/bcryptjs) for password hashing and verification.
- Use [ESLint](https://eslint.org/docs/latest/) and [prettier](https://prettier.io/docs/) for linting.
- Use [Vitest](https://vitest.dev/guide/) for testing.
