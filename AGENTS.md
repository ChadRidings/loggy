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
- **Testing**: Vitest
- **Typechecking**: TypeScript (`tsc --noEmit`)
- **Validation**: Zod
- **Linting**: ESLint + Prettier
- **Caching**: TanStack Query
- **Database**: PostgreSQL

## Project Structure

.
├── .env.example
├── .env.local
├── .gitignore
├── .nvmrc
├── .prettierrc
├── AGENTS.md
├── auth.ts
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── plan.md
├── postcss.config.mjs
├── README.md
├── tsconfig.json

## Code Conventions

- Operate as a high-level Principal Engineer and treat every task with a high-level of rigor.
- Always check package.json for version numbers before using logic.
- Use the [Zustand](https://zustand.docs.pmnd.rs/learn/getting-started/introduction) state manager for global state.
- Use [Radix UI](https://www.radix-ui.com/primitives/docs/overview/introduction) for UI components.
- Use [Tailwindcss](https://tailwindcss.com/docs/installation/using-vite) for styling.
- Use [NextAuth.js](https://next-auth.js.org/getting-started/introduction) for authentication.
- Use [Tanstack Query](https://tanstack.com/query/latest/docs/framework/react/overview) for caching.
- Use [Zod](https://zod.dev/) for validation.
- Use [ESLint](https://eslint.org/docs/latest/) and [prettier](https://prettier.io/docs/) for linting.
- Use [Vitest](https://vitest.dev/guide/) for testing.
