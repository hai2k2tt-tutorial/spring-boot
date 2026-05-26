# Repository Instructions

- Before broad repository scans, read the root `.gitignore` and any relevant nested `.gitignore` for the area being inspected.
- When searching or listing files, respect ignored paths by default. Prefer `rg`/`rg --files`, which honors `.gitignore`, and avoid scanning ignored directories such as dependency folders, build output, IDE files, local data, and volumes.
- If a fallback tool is needed, add explicit excludes or prune rules based on `.gitignore` before running recursive `find`, `grep`, or similar commands.
- Only use ignore-bypassing options such as `rg --no-ignore` when the task specifically requires ignored files, and state why.

## Frontend Rules

- For Next.js frontend work in `fe/`, `admin-fe/`, `customer-fe-next/`, `shop-fe/`, or related apps, use the project skill at `.agents/skills/next-portal-fe-style`.
- Treat `fe/` as the reference implementation for component splitting, shadcn UI primitives, `components/forms/*`, React Hook Form/Zod, TanStack React Query, and Zustand patterns.
- In client components, use TanStack React Query for remote reads and mutations so loading state, error state, retry/refetch, pending submit state, and cache invalidation are handled consistently.
- Use Zustand for shared client/workspace UI state, not as the default owner of server state already managed by React Query.
