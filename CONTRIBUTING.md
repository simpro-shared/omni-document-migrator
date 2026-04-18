# Contributing

Thanks for your interest. This is a small, focused tool — contributions are welcome, but the scope stays narrow on purpose.

## In scope

- Bug fixes
- Reliability / error-handling improvements
- Performance improvements to the migration pipeline
- UX polish on the existing screens
- Support for new Omni API endpoints that directly serve the migrate-dashboards use case

## Out of scope (unless discussed first)

- Hosted / multi-user mode — this is a localhost tool by design
- Auth systems beyond the local vault passphrase
- Integrations with non-Omni BI tools
- Large framework swaps (React → X, Fastify → Y)

If in doubt, open an issue first and describe what you want to change and why.

## Development setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

- Server: `src/server` (Fastify + better-sqlite3, ESM, TS strict)
- Web: `src/web` (React 18 + React Router + TanStack Query + Tailwind)
- Shared types: `src/shared`

## Before submitting a PR

1. `pnpm typecheck` passes.
2. `pnpm build` passes.
3. You tested the change end-to-end against a real Omni instance (or explained in the PR why you couldn't).
4. No secrets, `.env` files, or `data/` contents in the diff.
5. Commit messages describe the *why*, not just the *what*.

## Reporting bugs

Include:

- What you did
- What you expected
- What actually happened (server log + browser console if relevant)
- Omni API response bodies/status codes if the failure is at the API boundary

## Code style

- TypeScript strict. No `any` unless you've got a good reason and a comment explaining it.
- Prefer small, focused modules over large ones.
- Don't add dependencies casually — justify them in the PR.
- No comments that restate what the code does. Comments explain *why*.

## License

By contributing you agree your contributions are licensed under the MIT License (see [LICENSE](./LICENSE)).
