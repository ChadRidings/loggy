---
name: brand-guidelines
description: Defines the current Loggy visual system so new UI, marketing artifacts, and internal design work match the application already shipping in this repository.
---

# Loggy Brand Guidelines

## Overview

Use this guide when creating or updating anything that should look like the current Loggy application.

Loggy's visual language is a dark, SOC-oriented interface with cool blue surfaces, cyan interaction states, lime highlights, and a distinct retro-futuristic wordmark. The UI should feel technical, focused, and readable rather than playful or generic.

## Design Principles

- Prioritize clarity for operational workflows such as uploads, anomaly review, timelines, and event tables.
- Keep the interface dark-first and data-forward.
- Use color to direct attention, not to decorate every surface.
- Preserve strong contrast between content, chrome, and calls to action.
- Pair condensed utility typography with the distinctive `LOGGY` wordmark for personality.

## Styling System

### Tailwind CSS

Loggy uses Tailwind CSS 4 through [`app/globals.css`](../../app/globals.css) with:

- `@import "tailwindcss";`
- CSS custom properties defined in `:root`
- Tailwind arbitrary value syntax such as `bg-(--background)` and `border-(--border)`

When extending the UI:

- Prefer existing CSS variables over introducing new hard-coded hex values.
- Use Tailwind utility classes for spacing, layout, borders, and typography.
- Reuse current surface treatments like `rounded-2xl`, `border border-(--border)`, and `bg-(--background)/50`.
- Match the existing motion style: subtle hover transitions, usually `transition-colors` with moderate duration.

### Core Tokens

These are the application-level tokens currently defined in [`app/globals.css`](../../app/globals.css):

- `--background: #081722`
- `--textmain: #a1bbcf`
- `--textdark: var(--color-slate-900)`
- `--white: #ffffff`
- `--border: #2d3a43`
- `--accent: #61d7e6`

The body background also layers multiple blue and violet gradients over the base background color. New full-page views should feel compatible with that atmospheric backdrop instead of replacing it with flat fills.

## Color Guidelines

### Primary Palette

- Deep navy background: `#081722`
- Main body text: `#a1bbcf`
- Border and divider tone: `#2d3a43`
- Accent cyan: `#61d7e6`
- High-contrast dark text on accent surfaces: Tailwind `slate-900`
- Pure white for strong emphasis: `#ffffff`

### Supporting UI Colors In Use

The current app also uses Tailwind palette colors in consistent ways:

- Lime for brand/page emphasis: `lime-300`
- Dark input and menu surfaces: `slate-900`
- Secondary interactive states: `slate-800`
- Muted form and body text: `slate-200`, `slate-300`
- Neutral scroll/thumb tones: `slate-500`
- Divider overlays: `slate-700/40`

### Status Colors

Status badges currently map to:

- Completed: `lime-300` background with `slate-900` text
- Partial success: `amber-100` background with `slate-900` text
- Failed: `red-100` background with `slate-900` text
- Processing: `blue-100` background with `slate-900` text
- Queued: `slate-100` background with `slate-900` text

### Color Usage Rules

- Use `--background` for app shells, large surfaces, and translucent panels.
- Use `--accent` for primary actions, selected navigation, links, focus rings, and highlighted pills.
- Use `lime-300` sparingly for page titles and the `LOGGY` brand wordmark.
- Keep standard body copy on `--textmain`.
- Reserve white for section headings and moments that need stronger emphasis than body copy.
- Prefer `--border` for borders across cards, tables, filters, and nav chrome.

## Typography

### Fonts

Loggy uses Next.js Google Fonts defined in [`app/fonts.ts`](../../app/fonts.ts):

- `Roboto Condensed`
  - Weights in use: `400`, `700`
  - CSS variable: `--font-roboto-condensed`
  - Utility class: `.font-roboto-condensed`
  - Primary font for headings and general UI copy
- `Geostar Fill`
  - Weight in use: `400`
  - CSS variable: `--font-geostar-fill`
  - Utility class: `.font-geostar-fill`
  - Reserved for the `LOGGY` wordmark and brand moments

These font variables are attached globally in [`app/layout.tsx`](../../app/layout.tsx).

### Font Roles

- Use `Roboto Condensed` for page headings, section headings, form labels, buttons, table content, and body copy.
- Use `Geostar Fill` only for the `LOGGY` brand mark or very limited branded display text.
- Do not introduce additional font families unless the application brand is intentionally changing.

## Type Scale

This is the type sizing pattern currently used in the app:

- `text-xs`
  - Metadata, helper text, timestamps, compact secondary details, confidence pills
- `text-sm`
  - Default body copy, nav links, labels, buttons, table content, form copy, empty states
- `text-lg`
  - Secondary modal titles and smaller section titles
- `text-xl`
  - Standard section headers inside pages and panels
- `text-2xl`
  - Primary page titles, auth titles, upload detail title, and the `LOGGY` wordmark

### Weight Guidance

- Use `font-semibold` for page and section headings.
- Use `font-medium` for labels that need slightly more emphasis inside cards and forms.
- Use regular weight for most body text.

## Layout and Surface Patterns

### Shell

- Main authenticated pages use a centered container: `mx-auto w-full max-w-7xl px-6 py-10`
- Auth screens use a narrower centered container: `mx-auto flex min-h-screen w-full max-w-md items-center px-6`

### Panels and Cards

Common card treatment:

- `rounded-2xl`
- `border border-(--border)`
- `bg-(--background)` or `bg-(--background)/50`
- Generous internal spacing, often `p-6` or `p-8`

### Interaction Styling

- Links default to `--accent` and shift to white on hover.
- Primary buttons use `bg-(--accent)` with dark text via `text-(--textdark)`.
- Active navigation uses the accent background.
- Inputs and menus typically use `bg-slate-900` with light slate text.

## Brand Expression

Loggy should feel like:

- A focused security operations tool
- Technical and reliable
- Slightly stylized, but still production-serious
- High contrast, with disciplined use of accent color
- Responsive utilizing Tailwinds media queries

Avoid:

- Bright multi-color marketing palettes
- Warm, soft, or pastel-first themes
- Generic startup gradients that ignore the app's dark shell
- Overusing `Geostar Fill` outside the brand wordmark
- Replacing the current condensed utilitarian text style with a neutral sans stack

## Implementation Notes

- Check [`app/globals.css`](../../app/globals.css) before adding any new brand token.
- Check [`app/fonts.ts`](../../app/fonts.ts) before changing font usage.
- Match existing Tailwind patterns already present in:
  - [`components/app-navigation.tsx`](../../components/app-navigation.tsx)
  - [`components/dashboard-client.tsx`](../../components/dashboard-client.tsx)
  - [`components/upload-details-client.tsx`](../../components/upload-details-client.tsx)
  - [`app/login/page.tsx`](../../app/login/page.tsx)
  - [`app/register/page.tsx`](../../app/register/page.tsx)

## Quick Reference

- App shell background: `#081722`
- Main text: `#a1bbcf`
- Border: `#2d3a43`
- Accent/action color: `#61d7e6`
- Brand/title highlight: Tailwind `lime-300`
- Main UI font: `Roboto Condensed`
- Brand font: `Geostar Fill`
- Default UI size: `text-sm`
- Standard section heading: `font-roboto-condensed text-xl font-semibold text-white`
- Standard page heading: `font-roboto-condensed text-2xl font-semibold text-lime-300`
