# Omni Document Migrator

Localhost tool for migrating [Omni](https://omni.co) dashboards between instances. Run it on your machine, point it at a source and one or more destinations, pick the dashboards, hit migrate.

Built for teams that run multiple Omni instances (e.g. QA / AU / UK / US) and need to keep dashboards in sync without clicking through the UI twenty times.

## Features

- Multi-destination fan-out — migrate one dashboard to N instances in a single job.
- Folder-scoped — list a source folder, pick what moves.
- Optional "empty destination folder before import" step.
- Credentials stay on your machine. API keys live in an encrypted SQLite vault (`./data/vault.enc`), unlocked by a passphrase at startup.
- Job history with per-document status and logs.
- Local web UI. No cloud. No telemetry.

## Requirements

- Node.js 20+
- pnpm 10+
- Omni API keys for each source/destination instance

## Quick start

```bash
pnpm install
cp .env.example .env      # optional — fill in to seed the vault
pnpm seed-env             # optional — imports .env values into the encrypted vault
pnpm dev                  # runs server (5174) + vite dev server
```

Then open the URL printed by Vite, set a vault passphrase, and configure instances in the UI.

For a production-style local run:

```bash
pnpm build
pnpm start                # serves API + built web UI on http://127.0.0.1:5174
```

## How it works

- `GET  /v1/documents` — list source folder contents
- `GET  /unstable/documents/:id/export` — pull dashboard payload
- `POST /unstable/documents/import` — push into destination by folder path
- `DELETE /v1/documents/:id` — used when "empty folder first" is enabled

Jobs run in-process on the local Fastify server. Progress is streamed to the UI.

## Configuration

Instances are configured in the UI (Base URL, API key, user/model IDs, folder path + folder ID). `.env.example` documents the shape if you prefer to seed from a file via `pnpm seed-env`.

## Security notes

- The vault is AES-encrypted with a key derived from your passphrase. If you lose the passphrase, delete `./data/vault.enc` and reconfigure.
- Don't run this tool on a shared machine without a strong passphrase.
- The server binds to `127.0.0.1` only.

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
