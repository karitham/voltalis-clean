# AGENTS.md

This repository is **MyVoltalis / Voltalis Control**, an unofficial client for the
undocumented MyVoltalis API. It has two surfaces:

- `webui/` — the primary SolidJS 2 + TypeScript single-page app, built into one
  self-contained `webui/index.html` and installable as a PWA.
- `client/` — a standard-library Python CLI used for cautious writes, dry runs and
  endpoint experiments.

Read `README.md`, `webui/README.md` and `docs/GAPS.md` before changing the web app.
`docs/GAPS.md` is the endpoint map; it distinguishes verified behaviour from guesses.

## Commands

Web app:

```sh
cd webui
npm ci
npm run typecheck
python3 build.py
python3 check.py
```

`build.py` runs Vite, writes the committed `webui/index.html`, and copies the PWA
files (`manifest.webmanifest`, `sw.js`, `favicon.svg`, `favicon.ico`, `icons/`) from
`webui/dist/` to the repo-relative web root. Do not hand-edit `webui/index.html`;
edit `webui/app/` and rebuild. Commit the generated page and the PWA assets together.

CLI:

```sh
cd client
python3 -m unittest discover -s tests -q
```

Node is only needed to rebuild the web page. Node >= 22 is required. In this
environment Node may not be on `PATH`; use the project toolchain available to you
rather than hardcoding a store path into source.

## Web app architecture

Keep the MVU shape:

- `webui/app/model/types.ts` — domain resources, `Session`, `Modal`, `Msg`, `Effect`,
  `Model`, `Ui` and `Data`. Every interaction is a discriminated message.
- `webui/app/model/update.ts` — the pure reducer. It must be exhaustive over `Msg`;
  finish with `message satisfies never` in the default branch.
- `webui/app/model/parse.ts` — all API boundary parsing. Never pass raw response
  shapes into components; normalise there.
- `webui/app/model/effects.ts` and `messages.ts` — effect/message constructors.
- `webui/app/model/schedule.ts` — weekly-plan transforms, including copy-day.
- `webui/app/shell.ts` — the only impure runtime: batched commits, effects-as-data,
  serialised HTTP writes, one 429 retry, localStorage and the demo transport.
- `webui/app/components/` and `webui/app/modals/` — SolidJS views. They read the
  model through props and dispatch messages. They do not own transport, timers or
  persistent state.

Adding a message usually means touching all four places: the `Msg` union, the
constructor in `messages.ts`, the `update.ts` case, and the effect/UI that emits it.
Prefer `httpEffect` and `refreshEffects` over ad-hoc fetch calls. Writes are
serialised by the shell; do not add parallel write loops.

The demo transport (`webui/app/demo.ts`) is a first-class path: when adding a read or
write, teach the demo the same endpoint so `Try demo` remains a complete smoke test.
It may stay loosely typed, but it must return the same envelope and realistic units.

## UI conventions

- **TSX and SolidJS 2**, not React. Use `Show`, `For`, signals/memos and the existing
  common components (`Button`, `Field`, `Modal`, `Dot`). No component-level CSS.
- **TSX files only** for views; keep the model pure and typed.
- `webui/app/styles.css` is standalone: tokens only, no CDNs, host-specific
  variables or remote stylesheets. Light and dark both come from the token block and
  `prefers-color-scheme`.
- Display type is **Space Grotesk** and UI type is **Inter**, self-hosted as embedded
  WOFF2 in `webui/app/fonts.css`. Both are SIL OFL 1.1; licence texts live in
  `webui/app/fonts/`. Do not add a remote font stylesheet or CDN.
- No random database ids, appliance ids or raw notification `contentKey`s in the
  user-facing UI. Show names, labels and human values; ids belong in keys/URLs only.
- Numeric precision: temperatures use one decimal; energy uses one decimal below
  100 kWh and integers from 100 kWh; money uses two decimals; CO₂ uses integers.
  Reuse `fmtKwh`, `fmtMoney`, `fmtTemp` and `fmtNumber` rather than formatting ad hoc.
  The formatter locale follows the active UI locale.
- A schedule header must name the plan actually rendered. If the selected appliance has no
  planning, say so explicitly; never fall back silently to another appliance's week under
  the selected appliance's name.
- Layout contract after the recent IA pass:
  - desktop and phone share one vertical flow: Devices (a responsive card grid on
    desktop), then the full-width Schedule, then Energy; Programs and Health are a lower
    `.support-workspace`;
  - phone (≤620 px): devices are one column and the schedule is a one-day, 3×8-hour view
    with day tabs, not a horizontally scrolling 7×24 grid;
  - no horizontal page overflow at 380 px; test at 380×687 as well as 1440×900.
- The top band is a compact control header, not a marketing hero. Keep the title,
  live facts and three stats dense enough that the control surface is visible early.
- Appliance cards are square, neutral panels in a two-column grid; the action column
  is capped so longer French labels wrap without squeezing the room name. Cards in
  the same row stretch to equal height.
- Keep the install/PWA path working: `webui/app/public/` is the source for
  `manifest.webmanifest`, `sw.js`, `favicon.svg`, `favicon.ico` and `icons/`.
  The service worker caches the shell only; never cache API responses.
- Accessibility: every icon-only button needs an `aria-label` and `title`; modals
  need a title and Escape close; keyboard selection in the schedule uses
  Enter/Space; drag actions must not trap pointer release.

## Language and translation

The app ships in **French and English**. On first load it follows the browser:
`fr` when `navigator.languages` prefers French, otherwise `en`. A compact **language
toggle** is always available (including on the login screen), switches the whole UI,
persists the choice in localStorage and updates `<html lang>`. The browser preference
remains the default until the person uses the toggle.

Rules for every change that touches copy:

- No user-facing English (or French) literals in components, modals, toasts, labels,
  placeholders, `aria-label`s or titles. Route every string through `app/i18n.ts`
  (`t("English source string")`); English is the catalogue key, French lives in the
  same file.
- `i18n.ts` exports `MessageKey = keyof typeof fr`; `t()` and `toastEffect()` are
  typed against it, so a new missing French entry is a **compile error**, not a silent
  English fallback. Keep `fr` complete and remove stale keys.
- Backend/demo vocabulary (weather names, alert levels, welcome text) belongs in the
  explicit `term()` dictionary used by `humanWords()`/`safeText()`, not in the UI
  catalogue. Unknown backend tokens must be hidden rather than printed.
- Translations must be native product language, not word-for-word filler. Keep the
  established French terms for *radiator*, *override*, *schedule*, *off-peak/peak*,
  *frost protection*, *programme*, etc.; use tooltips for jargon such as “dérogation”
  and “heures pleines/creuses”. Keep units and number/date formatting local with
  `Intl`; do not hardcode `kWh`, `°C`, dates or currency separators outside the
  formatter.
- Set `<html lang>` from the resolved locale. Format pluralisation and lists with the
  locale's rules; do not concatenate translated fragments.
- API notification `contentKey`s are translation keys, not display text. Add their
  mapping to the catalogue; never show a raw key or an invented English sentence.
- When changing a key's meaning, update both locales and every call site in the same
  change. Remove unused keys.
- Preserve French typography: U+2019 apostrophes, accents on capitals, U+202F before
  `: ; ! ?` and between value/unit, and « guillemets » with U+202F. Keep labels and
  buttons in sentence case; only proper nouns take capitals. Lowercase French month
  names come from `Intl`.
- `check.py` still rejects duplicate catalogue keys and keys without French entries;
  the `MessageKey` type is the primary compile-time parity check. Run both.

## API and safety rules

- The API is undocumented and rate-limited. Reads are cheap; writes are serialised
  at ~450 ms. Preserve the one-retry behaviour for 429.
- Do not ship an unverified write endpoint as a guess. Check `docs/GAPS.md` and the
  official bundle/CLI before wiring it into the UI. In particular, programme reset
  and planning duplication semantics are not confirmed.
- Schedule edits write the **whole week** through
  `PUT /api/site/{site}/programming/dailyprog`; copy-day must preserve target ids
  and leave the source day untouched. Do not convert this into per-cell writes.
- Never commit real names, addresses, temperatures, dates, tokens, site/appliance
  ids or HAR payloads. Demo fixtures are synthetic. Keep credentials in the
  browser/local config, never in source, tests or logs.
- A destructive bulk action needs an explicit confirmation modal and a refresh
  after the queued writes settle.

## Verification before reporting done

1. `npm run typecheck` (exit 0).
2. `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` (exit 0; keep dead code out).
3. `python3 build.py` (writes `webui/index.html`).
4. `python3 check.py` (asset/static gate; must be clean).
5. CLI tests when touching `client/`.
6. `check.py` also rejects duplicate catalogue keys and `t("…")` calls without a
   French entry; `MessageKey` catches missing French at compile time. Smoke both
   locales and confirm the toggle persists across reload.
6. Browser smoke on the demo at **1440×900** and **380×687**:
   - no horizontal page overflow at 380;
   - `window.__errs` empty;
   - top band and control workspace visible without a huge scroll;
   - day tabs and slot modal work on the phone layout;
   - one read path and one write path in demo.
7. If you touched PWA files: confirm manifest, service worker and all icons are
   present in `webui/` after build, and that an offline reload serves the shell.

Report real results, including any skipped check. Do not claim live API writes were
tested unless they were.

## Maintenance

Update this file whenever the build commands, source layout, PWA asset set, layout
contract, API safety rules or verification procedure change. Keep it short enough to
be read before a change; move protocol detail to `docs/GAPS.md` and usage detail to
the READMEs. Prefer concrete paths and commands over general advice.

## License

This repository is licensed under the **EUPL-1.2**. Keep the copyright and licence
notice intact; see `LICENSE`.
