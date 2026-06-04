# Frontend Rules

- Follow the shared style in `../.agents/skills/next-portal-fe-style` for Next.js, shadcn UI, TanStack React Query, Zustand, and React Hook Form/Zod work.
- Read this app's `.gitignore` before broad scans. Use `rg`/`rg --files` and avoid `.next/`, `node_modules/`, `dist/`, `coverage/`, and local env files.
- Use TanStack React Query for wallet reads/mutations and invalidate wallet history after money movement.
