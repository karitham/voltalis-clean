# Voltalis Control — web app

A single-page control surface for MyVoltalis radiators, schedules, quick settings,
diagnostics, consumption history and site health. SolidJS 2 + TypeScript, built into one
self-contained `index.html` with Vite.
The committed page runs with no server and no CDN; the source needs Node only to rebuild.

## Use

Open `index.html` directly in a browser, or serve it:

```sh
python3 -m http.server 8000 --directory .
# http://localhost:8000/index.html
```

Serving it over HTTP(S) enables the PWA install path (`manifest.webmanifest`, `sw.js`,
`favicon.svg`, `icons/`). A `file://` page still runs, but has no service worker.

Sign in with your MyVoltalis credentials (kept in this browser's local storage), paste a
bearer token, or choose **Try demo** for synthetic devices. The page talks to
`https://api.myvoltalis.com` directly. Requests are serialised at ~450 ms with one 429 retry.

## Rebuild

Requires Node >= 22:

```sh
npm install
python3 build.py       # vite build + copy dist/index.html to index.html
python3 check.py       # standalone/static gate
npm run typecheck      # tsc --noEmit
npm run dev            # local Vite server
```

`build.py` writes the committed single file. `dist/` is generated and not part of the
source of truth.

## Architecture

The MVU core is preserved from the previous implementation:

- `app/model/types.ts` — the domain: typed API resources, discriminated `Session`, `Modal`,
  `Msg` and `Effect` unions, and the model itself.
- `app/model/update.ts` — the pure reducer, exhaustive over `Msg`; payloads are parsed at
  this edge by `app/model/parse.ts`.
- `app/model/` also holds constants, selectors, schedule transforms, effects and constructors.
  `app/core.ts` is only a compatibility barrel for the views.
- `app/shell.ts` — the only impure runtime: one batched commit per drained message batch,
  effects as data, serialised fetch queue, localStorage, demo transport.
- `app/App.tsx` and `app/components/` — SolidJS views. They read the model through props
  and dispatch messages; no component owns transport or persistent state.
- `app/styles.css` — standalone tokens (colour, type, spacing, radii). There are no
  host-specific variables, external fonts or asset URLs.

The model is the source of truth for every dialog, filter, selection and draft. The only
local view state is the pointer-drag flag in `Schedule.tsx`; every drag step is a message.

## Privacy

The demo fixture is synthetic. No account identifiers, addresses, tokens or schedules from
the reverse-engineering capture are included. Live writes were not exercised against a real
account in automated tests; verify reads first and use the CLI's `--dry-run` for cautious
writes.
