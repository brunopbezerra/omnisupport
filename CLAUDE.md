# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier (writes in place)
npm run typecheck    # TypeScript check (no emit)
```

No test suite is configured. Environment requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Supabase** for database, auth, and Realtime subscriptions
- **shadcn/ui** (radix-maia style) + **Tailwind CSS 4** + **HugeIcons**
- **TanStack Table v8** for the data grid
- **dnd-kit** for drag-and-drop
- **Sonner** for toasts, **next-themes** for dark mode, **date-fns** for dates
- Prettier: 2-space indent, no semicolons, 80-char width

## Architecture

### Data Flow

All data access is **client-side via Supabase** — there are no Next.js API routes. The pattern is: custom hooks fetch data, subscribe to Realtime channels, and expose state + mutation functions to components.

Key hooks (all scoped to `activeOrgId` from `WorkspaceContext`):
- `hooks/use-tickets.ts` — ticket list with Realtime sync
- `hooks/use-ticket-details.ts` — single ticket data + mutations (reply, status, assign)
- `hooks/use-agents.ts` — agent/admin profiles in the active org
- `hooks/use-categories.ts` — categories with Realtime sync
- `hooks/use-ticket-table.ts` — TanStack table state (sorting, filters, pagination)

### Workspace & RBAC

`components/providers/workspace-provider.tsx` holds `WorkspaceContext`:
- `currentUser` — authenticated user profile (id, full_name, role, org_id)
- `activeOrgId` / `activeOrg` — the org whose data is currently displayed
- `setActiveOrgId` — only meaningful for `super-admin` users; ignored for others
- `allOrgs` — populated for super-admins to enable the workspace switcher

Roles: `agent` | `admin` | `super-admin`. All hooks read `activeOrgId` from context and add `.eq('org_id', activeOrgId)` to every query — RLS on the DB side enforces the same constraint.

The `WorkspaceProvider` is mounted in `app/dashboard/layout.tsx` and is required by all dashboard hooks. Never call dashboard hooks outside the dashboard route tree.

**Settings pages** (all under `app/dashboard/settings/`):
- `workspace/page.tsx` — edit org name/slug (admin + super-admin only)
- `team/page.tsx` — invite/promote/remove members (admin + super-admin only)
- `profile/page.tsx` — update name, avatar, password (all roles)

### Routes

```
/                  → Home
/login             → Supabase email/password auth
/[slug]            → Public ticket submission form (anonymous, per organization slug)
/dashboard         → Sidebar shell (layout.tsx wraps all dashboard pages)
/dashboard/inbox   → Master-detail ticket view (default)
```

### Dashboard Layout (Master-Detail)

`app/dashboard/page.tsx` renders a master-detail layout:
- **Left**: `data-table.tsx` (TanStack Table with filters, bulk actions, column reorder via dnd-kit)
- **Right**: `components/ticket-details-content.tsx` (messages, events, assignments, categories)

The selected ticket ID is held in parent state; the detail panel derives the current ticket from the live `tickets` array so data stays fresh after Realtime updates.

On mobile, only one panel shows at a time (`hidden md:flex` / `md:hidden` pattern).

### Public Form (`/[slug]`)

Uses a **separate anonymous Supabase client** (no session persistence) for unauthenticated ticket creation. File uploads go to Supabase Storage (max 5 files × 5 MB). The org is resolved by slug from the `organizations` table.

### Supabase Schema (inferred)

- `organizations` (id, slug, ticket_prefix)
- `tickets` (id, org_id, ref_token, customer_email, subject, status, assigned_to, created_at)
- `profiles` (id, full_name, avatar_url, role: `agent` | `admin`)
- `messages` (id, ticket_id, body, sender_role, sender_id, created_at)
- `attachments` (id, message_id, file_path, file_name, file_size, file_type)
- `categories` (id, name, color)
- `ticket_categories` (ticket_id, category_id)
- `ticket_events` (id, ticket_id, actor_id, event_type, old_value, new_value, created_at)

### Component Organization

- `components/ui/` — shadcn/ui primitives (do not edit directly)
- `components/reui/` — custom rich components: `data-grid/` (advanced table) and `filters/` (filter system with React Context)
- `components/shell/` — layout shell (sidebar, header)
- `components/patterns/` — reusable patterns (breadcrumbs, etc.)
- Feature components live directly in `components/` (e.g., `ticket-details-content.tsx`, `assign-select.tsx`)

### Filtering

`components/reui/filters/` implements an advanced filter system with operators (is, contains, between, etc.). Filter field options (agents, categories) are populated dynamically. The filter state is managed via React Context inside `data-grid/`. Filter UI copy is in Portuguese (pt-BR).

### Theming

`next-themes` with system detection. Press **D** to toggle dark/light (hotkey registered in `components/theme-provider.tsx`). CSS variables drive all colors (defined in `app/globals.css`).

## Skills

Skills are in `.claude/skills/`. Apply them automatically based on context:

- **`clean-code`** — apply to all code written or refactored in this project. Meaningful names, small focused functions, no side effects, avoid null returns.
- **`component-architecture`** — apply when creating or modifying any React component. Keep components under 150 lines; extract stateful logic into custom hooks; split only at natural boundaries of responsibility.
- **`shadcn-ui`** — apply when working with `components/ui/`, installing new UI components, or customizing themes. Components live in the codebase (not node_modules); extend via wrapper components in `components/`, never edit `components/ui/` primitives directly.
- **`web-accessibility`** — apply when creating interactive elements (forms, modals, dropdowns, buttons). Semantic HTML first, ARIA as last resort, never remove focus outlines.
- **`frontend-design`** — apply when creating new pages or large UI sections. Commit to a clear aesthetic direction; avoid generic AI aesthetics; use distinctive typography and intentional color choices.
