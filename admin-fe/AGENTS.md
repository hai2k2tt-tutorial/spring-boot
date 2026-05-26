# Frontend Rules

- Follow the shared style in `../.agents/skills/next-portal-fe-style` for Next.js, shadcn UI, TanStack React Query, Zustand, and React Hook Form/Zod work.
- Use `../fe` as the reference implementation for component/form/store organization.
- Read this app's `.gitignore` before broad scans. Use `rg`/`rg --files` and avoid `.next/`, `node_modules/`, `dist/`, `coverage/`, and local env files.
- Keep reusable form wrappers and fields in `components/forms/*`; pages should compose those components instead of repeating label/input/error markup.
- Use TanStack React Query in client components for remote reads and mutations so loading, error, retry/refetch, pending submit state, and cache invalidation are handled consistently.
- Keep shared client state in typed Zustand stores under feature-specific files. Split large stores into slices or handlers when behavior grows.
- Add shadcn/Radix primitives under `components/ui/*` and keep business-specific behavior in feature components, not UI primitives.
- Validate frontend edits from this directory with `npm run lint`; run `npm run build` for routing, auth, Next config, or server/client boundary changes.
