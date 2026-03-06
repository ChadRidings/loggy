# Loggy

## Application Overview

This is an application built with utilizing the following tools: [React](https://react.dev/reference/react), [NEXT.js](https://nextjs.org/docs), [Radix UI](https://www.radix-ui.com/primitives/docs/overview/introduction), [Tailwindcss](https://tailwindcss.com/docs/installation/using-vite), [Tanstack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [NextAuth.js](https://next-auth.js.org/getting-started/introduction), [Zod](https://zod.dev/), [Zustand](https://zustand.docs.pmnd.rs/learn/getting-started/introduction), [Vitest](https://vitest.dev/guide/), [PostgreSQL](https://www.postgresql.org/docs/), [Docker](https://docs.docker.com/), [ESLint](https://eslint.org/docs/latest/), [Prettier](https://prettier.io/docs/).

## Build and Test Instructions

Install the correct version of Node.
I've added an `.nvmrc` file to project root that holds the suggested Node version (v24.14.0)

- **Install dependencies:** `npm i`
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
- **Testing**: Vitest
- **Typechecking**: TypeScript (`tsc --noEmit`)
- **Validation**: Zod
- **Linting**: ESLint + Prettier
- **Caching**: TanStack Query
- **Database**: PostgreSQL

## Configure environment

```bash
cp .env.example .env.local
```

Generate a secret for Auth.js:

```bash
openssl rand -base64 32
```

Then set `NEXTAUTH_SECRET` in `.env.local` and fill any service keys you plan to use.
