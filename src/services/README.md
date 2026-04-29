# `src/services/`

Thin service layer that wraps Supabase access. Components and React
Query hooks must import from here instead of calling `supabase.from(...)`
directly. Centralising the queries gives us:

- One place to enforce input validation (Zod) and shape the row types.
- One place to retry / cancel / log failures.
- A natural seam for testing — components can be rendered against a
  mocked service, no Supabase wiring required.

## Conventions

- Each domain lives in its own file: `bookings.ts`, `quotes.ts`,
  `payments.ts`, etc.
- Functions return plain promises. They do not own caching — that's
  React Query's job (see `src/hooks/queries/`).
- Errors are thrown, not returned as `{ error }`. Hooks turn those into
  toast / state via `useMutation`.

## Migration status

The 1k+ LoC dashboards still call `supabase.from(...)` inline; treat
`CustomerDashboard` + `useCustomerBookings` as the reference pattern
when migrating the rest.
