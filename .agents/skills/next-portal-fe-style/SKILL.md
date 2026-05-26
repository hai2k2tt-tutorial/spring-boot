---
name: next-portal-fe-style
description: Shared coding style for the repository's Next.js frontend apps. Use when changing, reviewing, or creating components, pages, forms, TanStack React Query usage, Zustand stores, or shadcn/Radix UI in admin-fe, customer-fe-next, shop-fe, fe, or new related frontend apps that should follow the fe/ conventions.
---

# Next Portal FE Style

## Scope

Use `fe/` as the reference implementation for frontend conventions, then adapt to the local app being edited. Start by reading that app's `.gitignore` before broad searches. Prefer `rg`/`rg --files` and avoid ignored paths such as `node_modules/`, `.next/`, `dist/`, `build/`, `coverage/`, and local env files.

Apply these rules to `admin-fe/`, `customer-fe-next/`, `shop-fe/`, and future Next.js frontends in this repository.

For concrete patterns and examples, read `references/coding-style.md`.

## Required Patterns

- Use App Router boundaries deliberately: keep `page.tsx` thin, colocate route-only views under that route, and move reusable UI to `components/`.
- Add `'use client'` only to files that need hooks, browser APIs, event handlers, Zustand, React Hook Form, or client-only libraries.
- Build UI from local `components/ui/*` shadcn-style primitives before adding new primitives.
- Put reusable form wrappers and fields in `components/forms/*`; pages should compose those fields instead of repeating label/input/error markup.
- Use Zod plus React Hook Form for forms. Derive form types from schemas with `z.infer`, `z.input`, or `z.output` when coercion changes the submitted type.
- Use TanStack React Query in client components for server state: remote reads, mutations, loading states, error states, retry/refetch flows, and cache invalidation.
- Use Zustand for client state that is shared across components or routes. Keep local `useState` for purely component-local UI.
- Keep stores typed, action-oriented, and colocated by feature. Split large stores into slices or handler files when behavior grows.
- Use `@/` imports and existing helpers such as `cn` from `@/lib/utils`.
- Keep API access in `lib/api*` or the app's existing API client layer; React Query hooks should call those functions rather than constructing requests inline.
- Validate with the smallest meaningful command, usually `npm run lint` in the edited frontend root.

## Frontend App Notes

- `admin-fe/`, `customer-fe-next/`, and `shop-fe/` currently use Next.js, TypeScript, Tailwind CSS, shadcn-style UI primitives, React Hook Form, Zod, NextAuth, TanStack React Query, and Zustand.
- Their `components.json` aliases map `components`, `ui`, `lib`, and `hooks` to `@/...`; keep new files aligned with those aliases.
- If a frontend does not yet have `components/forms/*`, create that layer before adding additional form-heavy pages.
