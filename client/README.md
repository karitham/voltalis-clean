# voltalisctl — control Voltalis without MyVoltalis

A dependency-free Python client and CLI for the API that the current MyVoltalis
web app (and, in all likelihood, the mobile app) talks to. It can list your
radiators, read and write manual overrides, and read/write weekly programs.

**Status:** protocol reverse engineered from the app's own JavaScript; offline
tests pass. Live calls still need an account to verify against — see "Verify"
below. No credentials are stored in this repository.

## Where the protocol came from

`https://myvoltalis.com/` is a Vue app. Its bundles (mostly
`assets/store-CbfenBdj.js` and `assets/index-CwadO-Pa.js`, fetched 2026-11-26)
contain an axios client with `baseURL: https://api.myvoltalis.com`, the route
table, and the generated zod schemas for request/response bodies. That is a
much cleaner source than decompiling the APK. The protocol analysis lives in
`docs/GAPS.md`; the production bundle snapshots are not redistributed here.

Auth: `POST /auth/login` with `{"login": "<email>", "password": "<password>"}`
returns `{"token": "..."}`. Pass it as `Authorization: Bearer <token>`.
`GET /api/account/me` returns the user with `defaultSite.id` and `otherSites`,
which are the site ids used in every `/api/site/<id>/...` path.

## Interesting endpoints

| Operation | Request |
| --- | --- |
| Account / sites | `GET /api/account/me`, `GET /api/site` |
| Dashboard | `GET /api/site/{id}/home` |
| Appliances | `GET /api/site/{id}/managed-appliance`, `GET .../managed-appliance/{aid}` |
| Rename / sensor | `PUT .../managed-appliance/{aid}`, `PUT .../{aid}/temperature` |
| Manual overrides | `GET /api/site/{id}/manualsetting`, `PUT .../manualsetting/{sid}` |
| Quick settings | `GET /api/site/{id}/quicksettings`, `PUT .../quicksettings/{qid}`, `PUT .../{qid}/enable` |
| Programs | `GET/POST /api/site/{id}/programming/program`, `GET/PUT/DELETE .../{pid}` |
| Weekly slots | `PUT /api/site/{id}/programming/dailyprog` |
| Copy planning | `PUT /api/site/{id}/programming/planning/` |
| State / reset | `GET .../programming/state`, `GET .../programming/reset` |

Modes (from the app's enum): `NORMAL`, `CONFORT`, `CONFORTMINUS1`,
`CONFORTMINUS2`, `ECO`, `ECOV`, `HORS_GEL`, `TEMPERATURE`.

A program is `{id, name, enabled, plannings: [{id, idAppliance, nameAppliance,
applianceType, availableModes, dailyprogs: [{id, dayNumber (1=Mon..7=Sun),
ranges: [{from:"HH:MM", to:"HH:MM", mode, temperature, isOn}]}]}]}`.
The reliable way to edit a schedule is `GET .../program/{id}`, edit the JSON,
then `PUT .../programming/dailyprog` with the edited `dailyprogs` array.

A manual override body is
`{"idAppliance":11,"mode":"ECO","enabled":true,"isOn":true,
"untilFurtherNotice":false,"endDate":"2026-11-26T22:00","temperatureTarget":null}`.
The `manualsetting` id is per appliance and is listed by `GET .../manualsetting`.

## Usage

```sh
cd client
python3 voltalisctl.py login                 # prompts; saves to ~/.config/voltalis/config.json (0600)
python3 voltalisctl.py sites
python3 voltalisctl.py appliances
python3 voltalisctl.py appliance 1234
python3 voltalisctl.py manual               # find the manual-setting id for each appliance
python3 voltalisctl.py mode 1234 ECO --until 2026-11-26T22:00
python3 voltalisctl.py programs
python3 voltalisctl.py program 567           # readable weekly schedule
python3 voltalisctl.py program 567 --raw --json
```

`--dry-run` on any write prints the exact request instead of sending it.
`--json` gives machine-readable output; `--site ID` selects a non-default site;
`--config PATH` selects another credential file. Credentials can also come from
`VOLTALIS_EMAIL`, `VOLTALIS_PASSWORD`, `VOLTALIS_TOKEN`, and `VOLTALIS_SITE_ID`.

To edit a weekly program through a file:

```sh
python3 voltalisctl.py program 567 --raw --json > program.json
# jq '.plannings[0].dailyprogs' program.json > dailyprogs.json, edit, then:
python3 voltalisctl.py dailyprog-write dailyprogs.json --dry-run
```

## Verify before trusting it

1. Run `python3 -m unittest discover -s tests -v` (6 offline tests, no network).
2. With real credentials, read-only calls first: `whoami`, `sites`, `appliances`,
   `programs`, `program ID`.
3. Then a harmless write: enable/disable a program you can restore, and check
   the app or API reflects it. Only then set modes and schedules.

The API is undocumented and can change without notice. These are your own
devices and your own account, but this is still an unofficial client — keep
credentials out of chat/logs/repo, prefer dry-run for anything destructive,
and expect Voltalis to change the API when they ship a new app version.

## Findings from the wider survey (2026-11-26)

- The Android app is a Flutter WebView wrapper around `https://myvoltalis.com` —
  all appliance/program logic is the web bundle, so the web API is authoritative.
- Only one live API (`api.myvoltalis.com`); `classic.myvoltalis.com` is dead.
  No OAuth/MFA/captcha and no official SDK; no local LAN API on the box.
- HTTP 429 is enforced. Both the CLI and the web UI space requests ~450 ms and
  retry once after a 429. Avoid tight polling loops.
- 401 means log in again; there is no token refresh in the app.
- Community clients confirm that `enabled:false` on a manual setting hands
  control back to the program, while `isOn:false` means manual off.
- Web UI: `../webui/index.html`.
