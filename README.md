# Voltalis Control

An unofficial, dependency-free client for the MyVoltalis API. Control radiators, manual
overrides, weekly schedules, quick settings and programs; read consumption history, live
temperature and system health; and manage the site itself — all through the same API the
official web app uses.

## Two ways to use it

Agent and contributor conventions live in [`AGENTS.md`](AGENTS.md).

### 1. Web app (open the file; no server required)

Open `webui/index.html` in a browser. It is one self-contained file: SolidJS 2 and the
stylesheet and self-hosted fonts are bundled in, with no external assets, CDNs or API keys. Sign in with
your MyVoltalis email and password (kept in that browser's local storage), paste a bearer
token, or choose **Try demo** for synthetic data.

If you prefer a served origin:

```sh
python3 -m http.server 8000 --directory webui
# open http://localhost:8000/index.html
```

Serving over HTTP(S) also enables the installable PWA: the manifest, icons and service
worker live next to `index.html`. Opening the file directly still works, but browsers do
not register service workers for `file://`.

The page talks directly to `https://api.myvoltalis.com`. Requests are serialised at ~450 ms
with one 429 retry, because Voltalis rate-limits.

The UI follows the browser language on first load (French or English) and has a compact
language toggle that persists the choice in local storage.

The web source is SolidJS 2 + TypeScript. To rebuild after editing:

```sh
cd webui
npm install
python3 build.py       # vite build + copy dist/index.html to index.html
python3 check.py       # self-contained/static gate
npm run typecheck
```

Requires Node >= 22 for rebuilding only. The committed `webui/index.html` is the built
single-file app.

### 2. Python CLI

Standard library only (Python 3.10+):

```sh
cd client
python3 voltalisctl.py login
python3 voltalisctl.py appliances
python3 voltalisctl.py programs
python3 voltalisctl.py program 123
python3 voltalisctl.py mode 456 ECO --until 2026-11-26T22:00
python3 voltalisctl.py dailyprog-write edited.json --dry-run
python3 -m unittest discover -s tests -v
```

Credentials go in `~/.config/voltalis/config.json` (created mode 0600) or in
`VOLTALIS_EMAIL`, `VOLTALIS_PASSWORD`, `VOLTALIS_TOKEN`, `VOLTALIS_SITE_ID`. Every write
supports `--dry-run`. `raw METHOD PATH [--body JSON]` is an escape hatch for any endpoint.

## Architecture

The web app keeps the previous MVU model:

- a typed domain in `webui/app/model/`: `types.ts`, exhaustive pure `update.ts`, parsers,
  selectors, schedule transforms and effects; every interaction and async result is a
  discriminated `Msg`;
- one impure shell in `webui/app/shell.ts` that batches one commit per drained message
  batch, runs effects-as-data, serialises HTTP and owns storage;
- SolidJS components that only read the model and dispatch messages;
- a standalone token system in `webui/app/styles.css` (no host variables).

## Protocol

Reverse engineered from the current MyVoltalis web bundle. Login is
`POST /auth/login {"login","password"} -> {"token"}`; the token is sent as
`Authorization: Bearer <token>`; the site id comes from `GET /api/account/me`.
Programs, manual overrides, quick settings and diagnostics are under
`/api/site/{siteId}/...`. See `client/README.md` and `docs/GAPS.md` for the endpoint map and
contract notes. Nothing here is endorsed by Voltalis; the API is undocumented and may change.

## Privacy

No credentials or account data are included. Demo data is entirely synthetic. Live writes
were not exercised against a real account in automated tests; verify reads first and use
dry-run for writes.

## Deployment

Pushing to `main` runs `.github/workflows/pages.yml`, rebuilds the single-page app and
publishes only `webui/dist` to GitHub Pages. Enable **Settings → Pages → Source:
GitHub Actions** once for the repository; the workflow uses the `github-pages` environment.
The client calls `api.myvoltalis.com` directly from the Pages origin, so it does not need a
server of its own.

## License

Copyright (C) 2026 albedo <albedo@karitham.dev>.

Licensed under the [European Union Public Licence, version 1.2](LICENSE)
(SPDX: `EUPL-1.2`).
