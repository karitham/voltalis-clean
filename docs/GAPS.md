# MyVoltalis interaction audit vs. our MVU replacement

Scope: the MyVoltalis interaction surface and what this client implements.
Audited against the production bundle at the time of writing. The bundle snapshots and
sanitized session captures are not redistributed in this repository; this document records
the findings and the schema evidence, not the source material. No API calls or credentials
are included.

**Headline:** this audit maps the MyVoltalis interaction surface and records which parts
this client covered at the time. It began as a gap list for a minimal heating client; many
of those gaps have since been closed. Section 6 keeps the protocol findings that still
matter, including the one write pattern that remains suspect (S2).

---

## 0. How this was built (and its limits)

| Evidence | What it gives |
| --- | --- |
| production routing constants | every path/param fragment, as exported enum members |
| production router table | path → lazy view component, nesting, auth flags, page titles |
| production test ids | the components that exist, with their interactive ids |
| generated request/response schemas | exact body shapes, enums and regexes from the OpenAPI contract |
| production data layer | every endpoint, method and body the app actually sends |
| production UI components | quick settings, durations, profile menu and related components |
| sanitized session captures | field names and value sets only — not distributed; see the rule in §3 |

Bundles are minified single-line files; citations give the byte offset (`@N`) and a quoted
fragment, which is unambiguous and greppable.

**Limits.**
- Only part of the app's lazy routes was captured (`ConsoView`, `ProgramPlanningEditView`,
  `HeatingView`, `DiagnosticView`, … were not available). Those pages are therefore evidenced
  by the router, the store and the test ids — not by their markup. Where I infer, I say so.
- No request was made, so "the API rejects X" means "the captured client-side contract rejects X".
  These schemas are generated from the same OpenAPI document the server is built from, so they
  are strong evidence, not proof.

---

## 1. Routes / pages

Grouped from `routes-DWnbmgMt.js` and resolved to components through the router table.
"Auth" = `meta.requiresAuth`.

### 1a. Core heating & schedule

| Path | Name / const | Component | Auth | Notes |
| --- | --- | --- | --- | --- |
| `/` | `HOME` | `LandingView` (anon) / `WelcomeView` (logged) | no | dashboard when signed in: heating section, consumption header, external temp, linky reminder |
| `/welcome` | `WELCOME` | `WelcomeView` (`logged`) | yes | same view, post-signup |
| `/welcome-video` | `WELCOME_VIDEO` | — | yes | onboarding video |
| `/heating` | `HEATING` | `HeatingView` | yes | mode/preset control for all appliances |
| `/heating/:id` | `PARAM_ID` | `HeaterView` | yes | one radiator: state, temperature, diagnostics |
| `/program` | `PROGRAM` | `ProgramlistView` | yes | list + enable/disable + create |
| `/program/create` | `ADDON_CREATE` | `ProgramCreateView` | yes | name → empty program |
| `/program/:id/planning/:idAppliance?` | `ADDON_PLANNING` | `ProgramPlanningView` | yes | 7×24 grid, one tab per appliance |
| `/program/:id/planning/:idAppliance/edit/:day` | `ADDON_EDIT`/`PARAM_DAY` | `ProgramPlanningEditView` | yes | **one-day range editor** |
| `/diagnostic` | `DIAGNOSTIC` | `DiagnosticView` | yes | device status list, multi-select, self-test launch |
| `/diagnostic/:csApplianceId` | `PARAM_DEVICE_ID` | `DeviceStatusView` | yes | one device's diagnostic detail |
| `/first-connection` | `FIRST_CONNECTION` | redirect → `/` | yes | |
| `/close-webview` | `CLOSE_WEBVIEW` | — | no | native shell hook |

### 1b. Consumption & energy

| Path | Name / const | Component | Auth |
| --- | --- | --- | --- |
| `/conso` | `CONSO`, name `conso-month` | `ConsoView` | yes |
| `/conso/conso-detail/:date?` | `CONSO_DETAIL` | `ConsoDetailView` | yes |
| `/conso/repartition-detail/:date` | `CONSO_REPARTITION_DETAIL` | `RepartitionDetailView` | yes |
| `…/:category` | — | `MyVRepartitionSubcategories` | yes |
| `/conso/live` | `CONSO_LIVE` | `LiveView` | yes |
| `/savings` | `SAVINGS` | `SavingsView` | yes |
| `/ecowatt` | `ECOWATT` | `EcowattView` | yes |
| `/advice/advice.ecowatt` | legacy | redirect → `/ecowatt` | — |

Period fragments exist as constants (`CONSO_HOUR='hour'`, `DAY`, `WEEK`, `MONTH`, `YEAR`,
`LIVE='live'`) and the default period is **month** (`name: z.CONSO_MONTH` on `/conso`).

### 1c. Account, housing, contract

| Path | Name | Component |
| --- | --- | --- |
| `/profile` | `PROFILE` | `ProfileView` (redirect → `/profile/my-account`) |
| `/profile/my-account` | `MyAccount` | `MyAccountView` |
| `/profile/contact` | `Contact` | `ContactView` |
| `/profile/contract` | `Contract` | `ContractView` |
| `/profile/security` | `Security` | `SecurityView` |
| `/profile/housing` | `Housing` | `HousingView` |
| `/profile/legal-information` | `LegalInformation` | `LegalInformationView` |
| `/profile/manage-choices` | `ManageChoices` | `ManageChoicesView` (consents) |
| `/login` (+ `/login/help`, `/login/help/forgot-password`) | `LOGIN`, `HELP_LOGIN*` | `LoginView` |
| `/forgot-password`, `/reset-email-token`, `/new-password`, `/new-password/reset-password-success` | `FORGOT_PASSWORD`, `RESET_EMAIL_TOKEN`, `NEW_PASSWORD*` | `ForgotPasswordView`, `ResetEmailTokenView`, `NewPassword` |
| `/activate` … `/activate/verify/upload-invoice-file-general-error` (20 sub-routes) | `ACTIVATE*` | `ActivateView`, `ActivateVerifyView` |
| `/upload-invoice-file-reminder`, `…-add`, `…-help` | `UPLOAD_INVOICE_REMINDER*` | `MyVPdlValidationModal` family |

### 1d. Onboarding, help, appointments, legal

| Path | Name | Component |
| --- | --- | --- |
| `/help`, `/help/:topic` | `HELP` | `HelpLandingView`, `TopicComponent` |
| `/help/cannot-login-form`, `/help/cannot-login`, `/help/eligibility`, `/help/credentials`, `/help/activate-account` | `HELP_*` | help views |
| `/login/help/forgot-password-success` | `HELP_LOGIN_FORGOT_PASSWORD_SUCCESS` | — |
| `/pas-a-pas/depannage-radiateur` | `HELP_FLOW_HEATER` | `HelpFlow` (guided troubleshooting) |
| `/pas-a-pas/ressenti-temperature` | `HELP_FLOW_TEMPERATURE` | `HelpFlow` |
| `/pas-a-pas/aide-pilotage` | `HELP_FLOW_PILOT` | `HelpFlow` |
| `/help-flow` | `HELP_FLOW` | `MyVHelpFlow` |
| `/contact-help` | `CONTACT_NOT_AUTH` | `ContactView` (unauthenticated) |
| `/legal-information/gcu` | `GCU` | `LegalInformationView`, `requiresAuth: false` |
| `/appointment/planned`, `/planned-flex`, `/planned-flex-video`, `/planned-help*`, `/in-progress`, `/not-planned` | `APPOINTMENT_*` | `AppointmentView` |
| catch-all | — | redirect → `/` |

---

## 2. Interactive actions the real app has

Grouped by where they live. Everything in this table is backed by a test id, a component, or a
request in the store. `→` names the call.

### 2a. Shell & session

| Action | Evidence | Call |
| --- | --- | --- |
| Sign in (email + password) | `login-view/email-input`, `password-input`, `submit-button`, `error` | `POST /auth/login {login,password}` |
| Help link on login | `login-view/help-link` | route `/login/help` |
| 301 = old account → redirect | store `login: …catch(e=>{…status==301&&(window.location.href=e.response.data.oldMyVoltalisUrl)}` | — |
| Open profile menu | `page-main/profile-menu-trigger` | `MyVProfileMenu` |
| Site selector (multi-site) | `profile-menu/site-selector`, `site-option`, `data-site-id`, `aria-pressed` | `PUT /api/site/{id}/init` + full bootstrap + go `/` |
| Housing quick link | `profile-menu/housing-link` | `/profile/housing` |
| Legal information link | `profile-menu/legal-information` | `/profile/legal-information` |
| Diagnostic center link | `profile-menu/diagnostic` | `/diagnostic` |
| Temperature-sensor link (if site has one) | store `getTemperatureSensor` → `{hasTemperatureSensor, redirectionLink}`, opens externally | `GET /api/site/{s}/temperature-sensor` |
| Logout | `profile-menu/logout` | `DELETE /auth/logout`, then forget token |
| Language switch | `MyVLangSelect` | — |
| Back from a subpage | `header-page/return-button` | — |
| Dismiss an error banner | `error-banner/close-button` | — |
| Contract-update popin | `contract-update-popin/acknowledge-button` | — |
| Signature reminder | `signature-reminder` | — |
| Invoice reminder postpone | `upload-invoice-reminder/postpone-button` | — |
| Appointment finished topic | `appointment-finished-topic/acknowledge-button` | — |

### 2b. Home / welcome

| Action | Evidence | Call |
| --- | --- | --- |
| Heating summary | `welcome-view/heating-section` | programming state |
| Consumption teaser | `welcome-view/consumption-header` | `/consumption/...` |
| **External temperature + weather icon** | `welcome-view/external-temperature`, `weather-icon` | `GET /consumption/welcome` → `{externalTemp, iconName, systemStatus, notificationsNumber, messageTitle, messageText}` |
| Linky consent reminder | `welcome-view/linky-reminder` | — |
| Appliance tiles → detail | `MyVAppliancesTile` (renders `router-link` to the appliance), mode icon `sun/leaf-2/snowflake-01/thermometer-03/zap/x-circle` | `GET /managed-appliance` |
| Diagnostic fault badge on a tile | `MyVAppliancesTile` `exclamation-circle` from `diagnostics.find(csApplianceId===id).status!==OK` | `GET /autodiag` |
| Device list layout variants | `MyVAppliancesSlide`, `MyVAppliancesSlider`, `MyVAppliancesList` | — |

### 2c. Heating control (the radiator surface)

| Action | Evidence | Call |
| --- | --- | --- |
| Set one appliance's mode | `Fg` = `NORMAL, CONFORT, CONFORTMINUS1, CONFORTMINUS2, ECO, ECOV, HORS_GEL, TEMPERATURE, STOP` | `PUT /manualsetting/{settingId} {idAppliance,enabled,isOn,mode,untilFurtherNotice,endDate,temperatureTarget}` |
| Set a target temperature | `MyVIconModeTemperature`, tile `temperature` prop | same body, `mode:"TEMPERATURE"` |
| Duration: 1/2/3/6/12/24 h | `MyVCustomDuration` `a=[1,2,3,6,12,24]` | `endDate = now + n h` |
| Duration: 3/5/7/14/21 **days** | `MyVCustomDuration` `o=[3,5,7,14,21]` (long absence) | `endDate = now + n d` |
| Custom end date/time | `MyVDatepicker` `minute-step: 15`, past dates disabled | `endDate = "YYYY-MM-DDTHH:mm:ss"` |
| Until further notice | `heating.duration.untilFurtherNotice` | `untilFurtherNotice: true, endDate: null` |
| Quick settings (presets) | `MyVQuickSettings`, `fD` = `quicksettings.athome/shortleave/longleave`, icons `home-user`, `log-out`, `briefcase-02` | `PUT /quicksettings/{id}/enable {enabled}` |
| Edit a preset's duration / per-appliance modes | `MyVCustomDuration` → `updateQuickSetting({id, body:{untilFurtherNotice, modeEndDate}})` | `PUT /quicksettings/{id} {untilFurtherNotice,modeEndDate,appliancesSettings[]}` |
| Init missing presets | store `initQuickSettings` | `POST /quicksettings/init` |
| Temperature-control explainer (video, "don't ask again") | `MyVTemperatureControlModal` | — |
| Active program / end-of-mode banner | `MyVProgramState`, getter `endModeTitle` (geoloc → "activated by geolocation", `untilFurtherNotice`, else `endDate.calendar()`) | `GET /programming/state` |
| Geolocation-driven heating status | `programList.geolocation.activatedByGeolocation` | `programmingState.geolocCurrentlyOn` |
| Geolocation on/off + radius | — | `GET|PUT /api/site/{s}/geoloc {radius,activatedByUser,latitude?,longitude?}` |
| Pause a running quick setting | store `stopQuickSettings(id)` → `{enabled:false}` | `PUT /quicksettings/{id}/enable` |
| Calibration guard ("stop manual piloting") | store `stopCalibrationManualPilotingIfNeeded` | `PUT /manualsetting/{id} {enabled:false}` |

### 2d. Programs & schedules

| Action | Evidence | Call |
| --- | --- | --- |
| List programs | `MyVSwitch`/`MyVCustomSwitch` rows | `GET /programming/program` |
| Enable / disable a program | store `updateProgram(id,{name,enabled})` | `PUT /programming/program/{id} {name,enabled}` |
| Create a program | `ProgramCreateView` | `POST /programming/program {name}` |
| **Duplicate** a program | store `createOrDuplicateProgram(site,name,id)` → `{name, id}` | `POST /programming/program {name,id}` |
| Rename a program | `updateProgram` merges `{name}` | `PUT /programming/program/{id}` |
| Delete a program | store `deleteProgram` | `DELETE /programming/program/{id}` |
| Create from habits (2-minute onboarding) | `createProgramFromHabit` | `POST /programming/program/onboarding {name,weekBedtime,…}` |
| Planning tab per appliance | `ProgramPlanningView` | `GET /programming/program/{id}` |
| Edit a slot / a day | `ProgramPlanningEditView` (`/edit/:day`) | `PUT /programming/dailyprog {id,ranges[]}` |
| **Copy a planning to other appliances** | store `duplicateProgramPlanning` | `PUT /programming/planning/ {idSource,idProgram,idAppliances[]}` |
| Duplicate days of a planning | schema `{idPlanning,dayNumbers}` | `PUT /programming/planning/` |
| Reset programming to defaults | store `resetProgram` (a GET that mutates) | `GET /programming/reset` |
| Reminder banner for a new program | `MyVProgramReminder` | — |

The day editor's semantics (store @498116 `MD`, `PD='00:00'`, `FD='23:59'`, `RD` all `false`):
ranges are kept sorted, contiguous, covering `00:00 → 23:59`, overlapping slots are **split**
(`HD`/`VD`), identical adjacent slots merged on request, and every range has `{from,to,mode,isOn,temperature}`.

### 2e. Diagnostics

| Action | Evidence | Call |
| --- | --- | --- |
| List devices + status | `diagnostic/row`, `row-status`, `group-title`, `empty`, `load-error`, `retry` | `GET /autodiag` |
| Multi-select devices | `diagnostic/selection-title`, `select-all`, `selection-row`, `selection-submit`, `selection-cancel`, `selection-error` | — |
| Launch self-test on one device | `diagnostic/launch`, `detail-launch` | `POST /autodiag/modulator/{csModulatorId}/selftest` (60 s timeout) |
| Launch all | — | `POST /autodiag` |
| Detail view | `diagnostic/detail`, `detail-name`, `detail-type`, `detail-status`, `detail-resolve`, `detail-error` | — |
| Confirmation step | `diagnostic/confirmation-title`, `confirmation-launch`, `confirmation-resolve` | — |
| Status vocabulary | `db` enum | `NO_CONSUMPTION, PILOTING_ERROR, COMM_ERROR, NOK_UNREACHABLE, NOK_UNREACHABLE_MOMBOX_OFF_SITE, NOK, OK, TEST_IN_PROGRESS` |
| Stabilisation progress after launch | `DiagnosticStabilization-Bopaqk6C.js`, `MyVHelpFlowCalibrationRunningStabilization` | — |

### 2f. Consumption

| Action | Evidence | Call |
| --- | --- | --- |
| Switch period (hour/day/week/month/year/live) | `CONSO_HOUR…CONSO_LIVE`, `MyVTabNav` | `GET /consumption/{day|week|month|year}/{date}?aggregationType=BY_HOUR|BY_DAY|BY_MONTH|BY_YEAR` |
| Detail for one day | `/conso/conso-detail/:date?` | `GET /consumption/{type}/{date}/full-data` |
| Breakdown by category | `MyVRepartitionSubcategories` | `GET /consumption/category/{summary|week|month|year}` |
| Multi-year view | — | `GET /consumption/multi-year/{n}/full-data` |
| **Live consumption** | `LiveView` | `POST /consumption/realtime`, `GET /consumption/realtime?mode&numPoints`, `POST /consumption/stopmodulation` |
| Savings | `SavingsView` | `GET /savings` |
| Ecowatt alert | `MyVEcowattAlert` | `GET /api/:siteId/rte-alerts` |
| Annual objective (kWh / €) | — | `GET/PUT /objective`, `/objective/wh`, `/objective/currency` (query params, no body) |
| PDL validation / invoice upload | `MyVPdlValidationModal` | `GET /pdl/valid`, `GET /pdl/invoice` |
| Contract change popin | `contract-update-popin` | `PUT /subscriber-contract/update-tarifs?contractTarifsChangeDate=` |

### 2g. Housing, account, contract

| Action | Evidence | Call |
| --- | --- | --- |
| Housing form: type, surface, layout, occupants, orientation | `housing-form/type`, `surface`, `layout`, `occupant-number`, `orientation`, `save`, `error` | `PUT /api/site/{siteId}/home` |
| Rename site | — | `PUT /api/site/{s}/name {name}` |
| Make site default | — | `PUT /api/site/{s}/default` |
| Rename an appliance | store `updateAppliance` | `PUT /managed-appliance/{id} {name}` |
| Declare an unmanaged appliance | store `putUnmanagedAppliances` | `PUT /unmanaged-appliance` |
| Legal info browsing by category | `legal-information-view/category`, `category-title`, `subcategory-text` | `GET /legalnotice`, `GET /company` |
| Contact / security / consents | `ContactView`, `SecurityView`, `ManageChoicesView` | `PUT /user/consent`, `/consent/enedis` |
| Notifications | `MyVNotification`, `MyVNotificationCard` | `GET/PUT/DELETE /notification` |


---

## 3. Verified from real session

Two sanitized captures of authenticated sessions were used as **schema evidence only**.

**Sanitisation rule applied to this document.** No identifier, name, address, date, count or
schedule pattern from either capture is reproduced here. Shapes are quoted as placeholders
(`{s}`, `<id>`, `YYYY-MM-DDTHH:mm:ss`, `[…]`), and value sets are quoted only where they are
enumerations from the API contract. The same rule applies to anything derived from this audit:
do not carry captured values into code, fixtures, tests, logs or commit messages — use the
placeholder forms.

Capture 1 covered the read path and quick-setting toggles; capture 2 covered a manual override and
the `autodiag` / `temperature-sensor` / `energymanager` reads. Neither contains `/auth/login`.

### 3a. What the traffic confirms

| Claim | Confirmed by |
| --- | --- |
| `POST /auth/login` body `{login,password}` | **not** in either capture — still only the store: `h_={login:(e,t)=>W.post(LOGIN,{login:e,password:t})` |
| Quick-setting toggle body is exactly `{"enabled": true}` | the write request body |
| Enabling one quick setting disables the others **server-side** | that call's response returns the whole list with a single `enabled:true` |
| A quick setting is a preset object, not a flag | `{id,name,untilFurtherNotice,modeEndDate,appliancesSettings:[{idAppliance,applianceName,applianceType,isOn,mode,temperatureTarget}],enabled}`; the three built-ins carry `CONFORT`, `ECO` and `HORS_GEL` respectively |
| A manual setting is one row per appliance, with its own id | `{id,enabled,idAppliance,applianceName,applianceType,untilFurtherNotice,isOn,mode,heatingLevel,endDate,temperatureTarget}`; `enabled:false` rows still carry a numeric `temperatureTarget`; `endDate` is `null` only with `untilFurtherNotice:true` |
| `PUT /manualsetting/{id}` write body | the same field set without `id` (capture 2): `enabled`, `isOn`, `mode`, `untilFurtherNotice`, `endDate`, `temperatureTarget` |
| An appliance may report `idManualSetting: null` while a manual setting exists | appliance `programming` block `null` plus a `/manualsetting` row for the same appliance ⇒ the fallback in the original prototype is load-bearing, not defensive |
| Appliance `programming` block | `{progType,progName,idManualSetting,isOn,untilFurtherNotice,mode,idPlanning,endDate,temperatureTarget,defaultTemperature}`, plus appliance-level `heatingLevel`, `modulatorType`, `pairedToSameSiteGateway` |
| Heater `availableModes` | a subset of the mode enum; `NORMAL` never appears on a heater |
| Program detail | `{id,name,enabled,plannings:[{id,idAppliance,nameAppliance,applianceType,availableModes,dailyprogs:[{id,dayNumber,ranges:[{from,to,mode,temperature,isOn}]}]}]}` — one `id` per daily prog |
| Ranges are contiguous and day-bounded | a day's first range starts `00:00`, its last ends `23:59`; `24:00` never appears; `isOn` is boolean; `temperature` is numeric |
| Programming state | `{id,programType,programName,untilFurtherNotice,endDate,geolocCurrentlyOn}` |
| Program list | `[{id,name,enabled}]` |
| Post-write refresh | the client re-reads `managed-appliance`, `manualsetting`, `quicksettings`, `program`, `state` and the active program detail — the same set as our `refreshEffects` + `detailEffect` |
| `endDate` / `modeEndDate` format | `YYYY-MM-DDTHH:mm:ss`, no zone, no fraction: identical to our `isoLocal` (the original prototype) |
| `GET /autodiag` | array of `{csApplianceId,csModulatorId,diagTestEnabled,name,status,…}` |
| `GET /temperature-sensor` | `{hasTemperatureSensor,redirectionLink}` |
| `GET /energymanager` | object carrying `hasEnergyManager` |

### 3b. Mismatches with the original prototype

| # | Mismatch | Evidence |
| --- | --- | --- |
| H1 | A quick setting is a preset over appliances, with a duration and a per-appliance mode; we toggle a boolean and lose `modeEndDate`, `untilFurtherNotice` and `appliancesSettings`. Enabling one in the real app sets each radiator's mode (the away preset uses `HORS_GEL`); ours only flips `enabled`. | 3a vs the original prototype |
| H2 | `temperatureTarget` is numeric in real data, including on disabled rows; our override sends `null` for every non-`TEMPERATURE` mode. | 3a vs the original prototype, `649` |
| H3 | "Auto" sends `mode:"NORMAL"`, which no captured heater advertises. | 3a vs the original prototype schedule writer |
| H4 | Day end is `23:59` in real data; our hour-23 cell and demo fixture produce `24:00`. | 3a vs the original prototype, `1284` |
| H5 | Real ranges always carry a numeric `temperature`; we write `null` for non-`TEMPERATURE` slots, clearing the stored setpoint. | 3a vs the original prototype |
| H6 | `me` carries a `displayGroup.rights` list used to gate pages; we ignore it, so a white-label user could see controls their brand has disabled. | 3a vs the original prototype |
| H7 | We derive "the active program" from the first `enabled` program in the list; the per-appliance truth is `programming.progType` / `progName`, and appliances can differ. | 3a vs the original prototype, `868-870` |

## 4. Coverage: implemented / partial / missing

Legend: **I** implemented, **P** partial, **M** missing. “The prototype” means the original local prototype; it is not distributed here.

### 4a. Session & shell

| Action | | Note | Evidence |
| --- | --- | --- | --- |
| Sign in with email+password | **I** | correct body; 301 message instead of redirect | `840-862`, `407-417` |
| Paste a bearer token | **I** | extra vs. the real app, harmless | the original prototype login/token form |
| Demo mode | **I** | fixture never touches the network | `491-502`, `1251-1365` |
| Forgot password / new password / activation | **M** | no recovery path at all; a forgotten password means leaving the page | routes `HELP_*`, `NEW_PASSWORD*` |
| Profile menu | **P** | only a "Sign out" button; no menu, no links | `836` |
| Site selector | **P** | `<select>` over `me.defaultSite+otherSites`; no `PUT /api/site/{id}/init`, no `/api/site` list, no address in options | `829-835`, `514-523` |
| Housing / contract / legal / diagnostics links | **M** | — | `profile-menu/*` ids |
| Error banner with dismiss | **P** | toasts auto-expire instead | `1064-1068` |
| Language switch | **M** | UI is English-only, the real app is FR/EN | `MyVLangSelect` |

### 4b. Radiator control

| Action | | Note | Evidence |
| --- | --- | --- | --- |
| Per-appliance mode | **I** | 8 modes + `OFF`, filtered by `availableModes` | `16-25`, `992-1017` |
| Target temperature | **I** | `TEMPERATURE` only, 12–28 °C in the input | `1005-1008` |
| Duration presets | **P** | 1/2/4/8 h + "until 22:00" + forever; real app has 1/2/3/6/12/24 h, 3/5/7/14/21 **days**, custom date-time (15-min steps) | `30-33` vs `MyVCustomDuration` |
| Custom end date | **M** | — | `MyVDatepicker` |
| Hand back to schedule ("Auto") | **P** | works only when `progType === 'MANUAL'`; body questionable (H3) | `641-657`, `882` |
| Quick settings as presets | **P** | 3 switches, no duration, no per-appliance modes, no icons/labels beyond 3 hard-coded names | the original prototype quick-setting panel |
| Per-appliance live state (heating level, current target) | **P** | shows mode/`isOn`/`defaultTemperature`; ignores `heatingLevel`, `temperatureTarget` when not `TEMPERATURE` | `864-883` |
| Single-radiator detail page | **M** | the tile is not a link; no `/heating/:id` equivalent | route `HEATING` + `PARAM_ID` |
| Global "stop"/pause all | **M** | real path is enabling a quick setting (`HORS_GEL` on every appliance) | `Fg.Stop`, longleave |
| Geolocation status/toggle | **M** | — | `/geoloc` |
| Temperature-sensor link | **M** | — | `getTemperatureSensor` |

### 4c. Schedules

| Action | | Note | Evidence |
| --- | --- | --- | --- |
| Program list + enable/disable | **I** | correct body; enabling another disables the old one first | `893-910`, `696-727` |
| Create an empty program | **I** | `{name}` | `759-780` |
| 7×24 grid per appliance tab | **I** | first-match-by-start-hour rendering | `912-944`, `115-136` |
| Edit one hour slot | **P** | writes the whole week (verified correct body) but still replaces overlapping ranges destructively (S4) | `309-357` |
| Delete a slot | **P** | same body problem; can empty a day, which the API rejects (`.min(1)`) | `690`, `327-339` |
| Day editor (ranges as a list, split/merge) | **M** | the real app edits a whole day at `/program/:id/planning/:app/edit/:day` | route `ADDON_EDIT` |
| Rename program | **M** | — | `PUT {name}` |
| Delete program | **M** | — | `DELETE` |
| Duplicate program | **M** | — | `POST {name,id}` |
| Copy planning to other radiators | **M** | highest-value schedule action (see §5.2) | `PUT /planning/ {idSource,idProgram,idAppliances}` |
| Program from habits (2-min onboarding) | **M** | — | `POST /program/onboarding` |
| Reset programming | **M** | — | `GET /programming/reset` |

### 4d. Everything else

| Area | | Note |
| --- | --- | --- |
| Diagnostics (list, multi-select, launch, detail, confirmation) | **M** | 22 test ids, 3 endpoints, whole feature absent |
| Consumption (5 periods, detail, breakdown, live, savings, ecowatt, objective) | **M** | no consumption surface at all |
| External temperature + weather icon | **M** | one GET, one line of UI |
| Housing form | **M** | 5 fields + save |
| Account, security, consents, contact, contract, appointments, legal, help flows | **M** | out of a radiator-only scope, listed for completeness |
| Notification centre | **M** | — |
| Appliance rename, unmanaged appliance | **M** | — |
| API activity log | **I** | ours only; useful for debugging, keep it |

---

## 5. Top 10 missing interactions, ranked for radiator + schedule control

Ranked by "someone whose only goal is to keep the house at the right temperature and have the
weekly plan do what they set". Each item: what a user loses today, then the minimal build.

### 5.1 Quick setting with a duration — the "I'm away for three days" button
Today: flipping *Long absence* on applies a stored preset we can neither see nor change. A preset
may hold `untilFurtherNotice: true` with `modeEndDate: null`, i.e. every radiator in `HORS_GEL`
**indefinitely**. The real app asks "for how long?" and writes `modeEndDate` before enabling.

```
PUT /api/site/{s}/quicksettings/{id}      {"untilFurtherNotice":false,"modeEndDate":"<YYYY-MM-DDTHH:mm:ss>","appliancesSettings":[{"idAppliance":"<id>","isOn":true,"mode":"<MODE>","temperatureTarget":"<number>"},…]}
PUT /api/site/{s}/quicksettings/{id}/enable  {"enabled":true}
```
`appliancesSettings` may be omitted only if you are happy with the stored modes; to set them,
send the full array `[{idAppliance,isOn,mode,temperatureTarget}]` copied from the GET and patched.
Minimum UI: a duration step between "toggle" and "apply" (1/2/3/6/12/24 h, 3/5/7/14/21 d for
longleave, custom, until-further-notice). Two MVU messages: `quickOpened(id)`, `quickApplied(id, {until, days})`.

### 5.2 Copy a schedule to the other radiators
Today: a house with several radiators means drawing the same week once per radiator.
```
PUT /api/site/{s}/programming/planning/   {"idSource":"<planningId>","idProgram":"<programId>","idAppliances":["<applianceId>",…]}
```
Returns the new plannings. One button on the planning tab: "Copy to…" + appliance checkboxes.
Also `{"idPlanning":N,"dayNumbers":[1,2,3,4,5]}` duplicates specific days.

### 5.3 Day editor instead of a one-hour modal
Today: each cell opens a `from/to/mode/temp` modal that rewrites the whole week; a sub-range edit
deletes the surrounding ranges (S4). Real editor: one day as an ordered list of ranges, split and
merge, `00:00 → 23:59`, never empty.
```
PUT /api/site/{s}/programming/dailyprog  {"id":"<dailyProgId>","ranges":[{"from":"00:00","to":"08:00","mode":"<MODE>","temperature":"<number>","isOn":true},…]}
```
A whole-week array is also valid; the captured write sends all seven days in one request.

### 5.4 Rename a program
`PUT /api/site/{s}/programming/program/{id}` `{"name":"Hiver","enabled":true}` — the same call we
already make for the toggle; add an editable name in the program row.

### 5.5 Delete a program
`DELETE /api/site/{s}/programming/program/{id}` — with a confirm step, because deleting the active
program leaves the site on the default plan.

### 5.6 Duplicate a program
`POST /api/site/{s}/programming/program` `{"name":"<new name>","id":"<programId to copy>"}` — the cheapest way to
build next season's plan from this one.

### 5.7 One radiator's page: state, target, and a self-test
Today a radiator shows a badge and an Override button; nothing tells you *why* it is cold.
```
GET  /api/site/{s}/managed-appliance/{applianceId}     → programming{…}, heatingLevel
GET  /api/site/{s}/autodiag                            → [{csApplianceId,csModulatorId,diagTestEnabled,name,status}]
POST /api/site/{s}/autodiag/modulator/{csModulatorId}/selftest   (60 s timeout)
```
Statuses: `OK, NO_CONSUMPTION, PILOTING_ERROR, COMM_ERROR, NOK_UNREACHABLE, NOK, TEST_IN_PROGRESS`.
Minimum: a "Test" button on the card + the status badge the tiles already carry.

### 5.8 External temperature on the dashboard
`GET /api/site/{s}/consumption/welcome` → `{externalTemp, iconName, systemStatus, notificationsNumber,
messageTitle, messageText}`. One number and one icon next to the hero; it explains why a radiator
is fighting the weather.

### 5.9 Geolocation on/off
`GET|PUT /api/site/{s}/geoloc` `{radius,activatedByUser,latitude?,longitude?}`; the state also
arrives as `programmingState.geolocCurrentlyOn` and the real app labels an active mode
"activated by geolocation". Minimal: show the flag, allow off, and say so on the override banner.

### 5.10 Live consumption
`POST /api/site/{s}/consumption/realtime` to start, `GET …/realtime?mode=&numPoints=` to poll,
`POST …/stopmodulation` to stop. This is the only feedback loop that answers "did my change do
anything?" within seconds — worth more than the whole historical consumption section for a
radiator-only user.

**Deliberately not in the top 10:** historical consumption graph/repartition, savings, ecowatt,
contract, housing, appointments, help flows. They are real surface (sections 1–2) but none of them
help control a radiator.


---

## 6. Bug risks in our current implementation

Ordered by damage. "Contract" means the request/response schemas captured in
`index-CwadO-Pa.js` @1551755–1564660 (generated from the same OpenAPI document the server is built
from); they are strong evidence, not proof, so S1/S2/S3 carry a one-request verification each.

### S1 — RESOLVED: the whole-week array is the real request shape

A user-provided recording of an actual successful `PUT /programming/dailyprog` showed the request
is a list of seven day objects, each with `id`, `dayNumber` and `ranges`, and the response is the
same list. The generated single-day zod schema is not the shape the app sends. Keep the array.
The real risks that remain in this path are S3 (end time `23:59`), S4 (range splitting) and S10
(never invent a day id).

<details><summary>Original, now-disproved analysis</summary>

### S1 (original) — the schedule write sends the wrong body shape
the original prototype sends `days`: the whole array of seven `{id, dayNumber, ranges}` objects.

```js
var days = (plan.dailyprogs || []).map(function (d) { … });          // 332
httpEffect('PUT', '/api/site/' + site + '/programming/dailyprog', days, …)   // 354
```

The contract for that endpoint is a **single day object**:

`z({id:r7, ranges:Mn(z({from:i7,to:i7,mode:u5,temperature:Y5.nullish(),isOn:xt().optional().default(!1)})).min(1)})`
(`index-CwadO-Pa.js` @1563711) — note `.min(1)`: a day may never be empty, and there is no
array-of-days request body anywhere in the captured contract (the only `Mn(o7)` use is inside the
*planning* response object `c7`, @1564249).

Consequence: "Save slot" and "Delete slot" most likely return 400 against the real API — i.e. the
weekly schedule cannot be edited at all. `PUT` is called with `body: JSON.stringify(days)`
(the original prototype), so the wire form is a JSON array.

Fix: send `{id: target.id, ranges: target.ranges}` for the edited day only; keep the 7-day object
in the model. Verify with one `GET /programming/program/{id}` → `PUT` of a day whose ranges are
unchanged; expect 200 and an identical GET.

</details>

### S2 — `temperatureTarget: null` on every non-temperature override (likely 400)
the original prototype (override) and the original prototype schedule writer (auto) send `"temperatureTarget": null`.

Contract: `z({idAppliance:o5,untilFurtherNotice:xt().optional(),enabled:xt().optional(),isOn:xt().optional(),mode:u5,endDate:f5.nullish(),temperatureTarget:Y5.optional()})`
(@1562686) — `endDate` is explicitly `nullish()`, `temperatureTarget` is only `optional()`, i.e. a
number or absent, never `null`. The captures agree: every `manualsetting` row carries a numeric
`temperatureTarget`, including rows that are `enabled:false`.

Consequence: Confort/Éco/Hors-gel overrides — the common case — may all fail, while a
`TEMPERATURE` override succeeds. That asymmetry is a nasty bug to diagnose from the UI.

Fix: omit the key when `mode !== 'TEMPERATURE'` (or resend the appliance's current
`temperatureTarget`). One-line change at `624` and `649`.

### S3 — `to: "24:00"` (rejected by the contract, contradicted by real data)
the original prototype defaults a slot's end to `pad2(hour + 1) + ':00'`, so hour 23 yields `24:00`; the demo
fixture uses `24:00` in four places (`1284`–`1290`); `commitSlot` accepts it because its regex is
`^[0-9]{2}:[0-9]{2}$` (`327`).

Contract: `i7 = R().regex(/^([01]\d|2[0-3]):[0-5]\d$/)` (@1563669) — 00:00–23:59 only. Every range in the captures ends at `23:59` at the latest; the
real editor's day constant is
`e.OneMinuteBeforeMidnight='23:59'` (`store` @498116).

Fix: represent the day end as `23:59` when writing, and treat `24:00` from old data as `23:59`.

### S4 — editing a sub-range destroys the rest of the range (data loss)
the original prototype:
```js
target.ranges = target.ranges.filter(function (r) { return minutes(r.to) <= a || minutes(r.from) >= b; });
```
Any range that *overlaps* `[from,to)` is dropped whole. Take a typical day laid out as three
contiguous ranges (`00:00–08:00`, `08:00–20:00`, `20:00–23:59`) and edit 09:00–10:00: the whole
`08:00–20:00` range is replaced by `09:00–10:00`, leaving **gaps** at 08:00–09:00 and 10:00–20:00,
so the day is no longer contiguous. The real editor splits
ranges instead — `HD`/`VD` (`store` @498816) cut the overlapped range into the parts outside the
edit and keep full coverage.

The same happens on delete: the modal pre-fills from/to from the clicked range, so the normal path
is exact, but a user who narrows the times and presses Delete wipes more than they see.

Fix: split instead of filter — keep `[r.from, min(b,r.from))`… i.e. for each overlapping range
retain the left part `{from: r.from, to: a}` and the right part `{from: b, to: r.to}` when non-empty.

### S5 — "Auto" sends `mode: "NORMAL"`, which the radiator may not support
the original prototype:
```js
{ idAppliance: auto.id, enabled: false, isOn: true, untilFurtherNotice: false,
  endDate: isoLocal(msg.b + 60e3), mode: 'NORMAL', temperatureTarget: null }
```
No captured heater advertises `NORMAL`; `availableModes` is always a subset of the mode enum.
The real client sends `{enabled:false}` alone and lets the store fill `idAppliance`,
`mode`, `isOn`, `endDate`, `temperatureTarget` from the existing setting
(`store` @507784). Sending an unsupported mode is at best ignored, at worst a 400, and `isOn:true`
on a "stop overriding" write is semantically backwards.

Fix: `{idAppliance, enabled:false, untilFurtherNotice:false, endDate: isoLocal(now), mode: <current
mode of the appliance>, isOn: <current isOn>, temperatureTarget: <current>}`.

### S6 — quick settings and programs share an id namespace, and we ignore `kind` when resolving
the original prototype:
```js
var prog = programById(model, id) || asArray(model.data.quick).find(…);
```
`programById` is tried first regardless of `kind`, so a quick-setting id that collides with a
program id resolves to the *program* (`prog` is then only used for `name`, so today the damage is a
wrong name in the `PUT …/programming/program/{id}` body). The comment on line 698 says the two
lists "share an id space" — which is exactly why the lookup must be keyed by `kind`, not by order.
In practice the two lists use separate id ranges, so this is latent rather than live — but the
lookup is wrong on its face and will bite whichever list grows into the other's range.

Fix: `var prog = kind === 'QUICK' ? quickById(id) : programById(id);`

### S7 — switching site never initialises it server-side
the original prototype sets `session.siteId`, stores it and re-runs the five GETs. The real client calls
`PUT /api/site/{id}/init` (`store` @681396), then wipes caches and re-bootstraps. Without it,
whatever the backend keys off "current site" (diagnostics, notifications, consumption caches) may
keep answering for the previous site.

Fix: add `PUT /api/site/{id}/init` to `siteChanged`'s effects before the refresh, and treat a
failure as non-fatal (the real app does).

### S8 — every GET carries `Content-Type: application/json` (preflight on a throttled API)
the original prototype sets both headers unconditionally and adds a body only when there is one. A GET
with `application/json` is not a CORS-simple request, so each new `(method,path)` needs an OPTIONS
round trip unless the API sends `Access-Control-Max-Age`. Writes need it anyway; reads do not.

Fix: `if (effect.body != null) headers['Content-Type'] = 'application/json';`

### S9 — the grid can silently edit a different radiator
the original prototype: `plannings.find(pl => pl.idAppliance === id) || plannings[0]`. If the selected
appliance has no planning in the opened program (common: a program created yesterday, a
newly-added radiator), clicking a cell edits **another appliance's** schedule and the toast says
"Schedule updated". Same fallback feeds `slotModal`.

Fix: return `null` and render a disabled grid + "This radiator has no planning in this program".

### S10 — a new day is created with `id: 0`
the original prototype pushes `{id: 0, dayNumber, ranges}` when the day is absent. The body schema requires a
real int32 `id`; `0` is unlikely to be a valid daily-prog id.

Fix: when the day is missing, create it through the planning/duplicate endpoint or refuse with a
clear message rather than inventing an id.

### S11 — wrong-password reads "Session expired"
`readableError` answers `status === 401` before looking at the payload (the original prototype), and
`loginFailed` renders `err.message` verbatim (`455-461`), so a bad password says "Session expired —
connect again." and hides "Incorrect email or password." even though the mapping exists two lines
above. Documented as preserved behaviour in `INTERACTIONS.md`, but it is still a bug.

Fix: in `loginFailed`, prefer the payload key (`backend.error.subscriber.badcredentials`) over the
status.

### S12 — minor
- Temperature input is clamped to 12–28 °C (the original prototype, `1027`); the API's own convention is
  7–30 °C in 0.5 steps, and the appliance-temperature endpoint validates 7–45
  (`z({temperatureMeasurement:L().gte(7).lte(45)})`, @1551755).
- An `OFF` slot is written as `mode: availableModes[0]` (the original prototype), i.e. the first mode the
  appliance happens to advertise, with `isOn:false`. Fine, but it silently rewrites the mode;
  prefer the range's previous mode.
- `hoursGrid`/`rangeAt` bucket by start hour only (`115-136`), so a half-hour boundary inside a
  range is drawn from the top of the hour and the grid is one cell off on such plans. Display-only.
- Five GETs fire after every override/toggle (`refreshEffects`, `166-177`). The real client does the
  same, so this is fine — but at 450 ms per request it is ~2.3 s before the UI settles; an
  optimistic patch of the returned objects would feel much better.

### What is solid (so it does not get rewritten)
- `settingId()` (`95-100`) correctly falls back to `/manualsetting` when
  `programming.idManualSetting` is `null` — verified necessary by the captures (§3a).
- Login body, program create/update bodies, quick-setting enable body, `isoLocal` date format, the
  "disable the others first" cascade, the 429 retry, `sameSite` staleness guard, and the
  post-write refresh set all match the real client.
- `readableError`'s payload mapping, `esc()` on every interpolation, and the `data-key` focus
  restoration are correct; I found no injection path and no unbounded growth (activity capped at
  40, toasts at 4).

---

## 7. Appendix — request contract actually used by the real app

Bodies as built by the captured client (`store-CbfenBdj.js`) and validated by the captured
schemas (`index-CwadO-Pa.js`). `{s}` = site id. All dates are `YYYY-MM-DDTHH:mm[:ss]`, no zone.

| Call | Body |
| --- | --- |
| `POST /auth/login` | `{login, password}` → `{token}` |
| `GET /api/account/me` | — → user + `defaultSite` + `otherSites` + `displayGroup.rights[]` (feature gates) |
| `GET /api/site` | — → site list |
| `PUT /api/site/{s}/init` | no body |
| `PUT /api/site/{s}/default` | no body |
| `PUT /api/site/{s}/name` | `{name}` |
| `PUT /api/site/{s}/home` | housing form |
| `GET /api/site/{s}/managed-appliance` | — → appliances (sorted: water heaters last, then by name) |
| `PUT /api/site/{s}/managed-appliance/{id}` | `{name}` |
| `PUT /api/site/{s}/managed-appliance/{id}/temperature` | `{temperatureMeasurement}` 7–45 |
| `GET/PUT /api/site/{s}/unmanaged-appliance` | list |
| `GET /api/site/{s}/manualsetting` | — → `[{id,idAppliance,enabled,isOn,mode,untilFurtherNotice,endDate,temperatureTarget,…}]` |
| `PUT /api/site/{s}/manualsetting/{settingId}` | `{idAppliance, enabled, isOn, mode, untilFurtherNotice, endDate, temperatureTarget}` (extra fields harmless) |
| `GET /api/site/{s}/quicksettings` | — → 3 presets with `appliancesSettings[]` |
| `PUT /api/site/{s}/quicksettings/{id}/enable` | `{enabled}` → returns the full list |
| `PUT /api/site/{s}/quicksettings/{id}` | `{untilFurtherNotice, modeEndDate, appliancesSettings:[{idAppliance,isOn,mode,temperatureTarget}]}` |
| `POST /api/site/{s}/quicksettings/init` | no body |
| `GET /api/site/{s}/programming/program` | — → `[{id,name,enabled}]` |
| `POST /api/site/{s}/programming/program` | `{name}` or `{name,id}` (duplicate) |
| `PUT /api/site/{s}/programming/program/{id}` | `{name, enabled}` |
| `DELETE /api/site/{s}/programming/program/{id}` | — |
| `POST /api/site/{s}/programming/program/onboarding` | habits: `{name?, weekBedtime, weekWakeUpTime, weekendBedtime, weekendWakeUpTime, weekLeavingHomeTime?, …ZoneAppliances?}` |
| `GET /api/site/{s}/programming/program/{id}` | — → program + `plannings[]` (each with `dailyprogs[]`) |
| `PUT /api/site/{s}/programming/dailyprog` | `{id, ranges:[{from,to,mode,temperature,isOn}]}`, ≥1 range, times 00:00–23:59 |
| `PUT /api/site/{s}/programming/planning/` | `{idSource,idProgram,idAppliances[]}` or `{idPlanning,dayNumbers[]}` |
| `GET /api/site/{s}/programming/state` | — → `{id,programType,programName,untilFurtherNotice,endDate,geolocCurrentlyOn}` |
| `GET /api/site/{s}/programming/reset` | mutating GET |
| `GET /api/site/{s}/energymanager` | — → object carrying `hasEnergyManager` |
| `GET /api/site/{s}/consumption/welcome` | — → `{externalTemp,iconName,systemStatus,notificationsNumber,…}` |
| `GET /api/site/{s}/consumption/{day\|week\|month\|year}/{date}` | query `aggregationType=BY_HOUR\|BY_DAY\|BY_MONTH\|BY_YEAR` |
| `GET /api/site/{s}/consumption/category/{summary\|week\|month\|year}` | query `months`/`weeks`/`years` |
| `GET /api/site/{s}/consumption/{type}/{date}/full-data`, `/multi-year/{n}/full-data` | — |
| `GET/POST /api/site/{s}/consumption/realtime`, `POST …/stopmodulation` | `mode`, `numPoints` |
| `GET /api/site/{s}/savings` | — |
| `GET /api/{s}/rte-alerts` | — |
| `GET/PUT/DELETE /api/site/{s}/objective` (`/wh`, `/currency`) | query `objectiveInWh` / `objectiveInCurrency` |
| `GET /api/site/{s}/autodiag` | — → `[{csApplianceId,csModulatorId,diagTestEnabled,name,status,…}]` |
| `POST …/autodiag`, `POST …/autodiag/modulator/{csModulatorId}/selftest` | no body |
| `GET/PUT /api/site/{s}/geoloc`, `GET/POST /api/site/{s}/geoloc/phone`, `PUT/DELETE …/phone/{deviceId}` | `{radius,activatedByUser,latitude?,longitude?}` / `{deviceId,name,brand}` / `{name}` |
| `GET /api/site/{s}/temperature-sensor` | — → `{hasTemperatureSensor,redirectionLink}` |
| `GET /api/site/{s}/notification`, `PUT`, `DELETE` | notification ids |
| `GET /api/site/{s}/pdl/valid`, `GET /api/site/{s}/pdl/invoice` | — |
| `GET /api/site/{s}/subscriber-contract`, `PUT …/update-tarifs?contractTarifsChangeDate=` | no body |
| `GET/PUT /api/site/{s}/user/consent`, `…/consent/enedis` | `{nameKey,enabled}` |
| `GET /api/site/{s}/signature/signing-link` | — → `{signatureUrl}` |

Enums: modes `NORMAL, CONFORT, CONFORTMINUS1, CONFORTMINUS2, ECO, ECOV, HORS_GEL, TEMPERATURE`
(+ UI-only `STOP`); progTypes `DEFAULT, USER, QUICK, MANUAL`; days 1–7 (Mon–Sun);
diagnostic statuses `OK, NO_CONSUMPTION, PILOTING_ERROR, COMM_ERROR, NOK_UNREACHABLE,
NOK_UNREACHABLE_MOMBOX_OFF_SITE, NOK, TEST_IN_PROGRESS`.
