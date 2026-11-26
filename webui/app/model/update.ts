/* The whole reducer: one case per message, no clock, no DOM, no transport.
 * Payloads are parsed at this edge; every modal is narrowed by kind before it is read. */
import { DEMO_SITE_ID, MODES, STORE, TOAST_LIMIT } from "./constants";
import {
  autodiagEffect, detailEffect, energyEffect, focusEffect, geolocEffect, httpEffect, meEffect,
  refreshEffects, scrollEffect, storeEffect, toastDelay, toastEffect, toastRawEffect,
} from "./effects";
import {
  clampInt, dateTimeInputValue, durationMs, energyAnchor, isoLocal, normalizeDateTime, numbers, selRect,
  shiftEnergyAnchor,
} from "./format";
import { blankData, blankLogin, keep, loginModel, patchModal, setData, setModal, setUi } from "./init";
import { Msg } from "./messages";
import {
  parseAccount, parseAppliances, parseAutodiagList, parseConsumption, parseEnergyManager, parseGeoloc, parseLogin, parseManualSettings, parseObjective, parseRteAlerts, parseSavings,
  parseProgramDetail, parseProgramState, parsePrograms, parseQuickFlags, parseQuickSettings, parseTemperatureSensor,
  parseRealtime, parseWelcome,
} from "./parse";
import { afterSlotWrite, commitCopyDay, commitRange, commitSlot, patchQuickRow, slotModal } from "./schedule";
import {
  applianceById, diagOf, mergeQuickFlags, modeOf, planFor, programById, quickConfigRows, rangeAt,
  settingId, siteOf, targetTemperatureOf,
} from "./select";
import type {
  CopyPlanModal, Effect, HttpEffect, LoginDraft, Model, Msg as Message,
  NewProgramModal, OverrideModal, ProgramManageModal, QuickConfigModal, RangeModal, ResponseMeta,
  Site, SlotField, SlotModal, UiMode, UpdateResult,
} from "./types";

/* A response that names a site only applies while that site is the one on screen. */
function sameSite(model: Model, meta: ResponseMeta | null): boolean {
  if (meta == null || meta.siteId == null) return true;
  return meta.siteId === siteOf(model);
}

const UI_MODES: readonly string[] = [...MODES.map(mode => mode.v), "OFF"];

function isUiMode(value: unknown): value is UiMode {
  return typeof value === "string" && UI_MODES.includes(value);
}

/* The slot editor patches one field at a time; an unknown mode leaves the draft alone. */
function slotFieldPatch(field: SlotField, value: string | number): Partial<SlotModal> | null {
  switch (field) {
    case "from": return typeof value === "string" ? { from: value } : null;
    case "to": return typeof value === "string" ? { to: value } : null;
    case "mode": return isUiMode(value) ? { mode: value, isOn: value !== "OFF" } : null;
    case "temp": return { temp: value };
  }
}

function loginWithField(login: LoginDraft, field: keyof LoginDraft, value: string): LoginDraft {
  switch (field) {
    case "email": return { ...login, email: value };
    case "password": return { ...login, password: value };
    case "token": return { ...login, token: value };
  }
}

export function update(model: Model, msg: Message): UpdateResult {
  /* The shell may dispatch nothing; the old core treated that as a no-op. */
  const message: Message = msg ?? { type: "noop" };
  const meta = "meta" in message ? message.meta : null;

  /* Any 401 on a live session ends it, whatever the request was. */
  if (meta != null && meta.status === 401 && model.session.kind === "live" && message.type !== "loginFailed") {
    const expired = "Session expired — connect again.";
    const effects: Effect[] = [
      storeEffect(STORE.token, null),
      storeEffect(STORE.site, null),
      toastEffect(expired, "bad"),
    ];
    return { model: loginModel(model, expired), effects };
  }

  switch (message.type) {

    /* ---- session ---- */

    case "sessionRestored": {
      const next: Model = {
        session: { kind: "live", token: message.token, email: message.email || "", siteId: message.siteId, sites: [] },
        data: blankData(),
        ui: { ...model.ui, page: "login", busy: true, loginError: "", login: blankLogin(message.email) },
      };
      return { model: next, effects: [meEffect()] };
    }

    case "loginFieldChanged": {
      if (model.ui.page !== "login") return keep(model);
      return keep(setUi(model, { login: loginWithField(model.ui.login, message.field, message.value) }));
    }

    case "loginSubmitted": {
      if (model.ui.busy) return keep(model);
      const creds = model.ui.login;
      if (!creds.email || !creds.password) {
        return keep(setUi(model, { loginError: "Enter your email and password." }));
      }
      const login: HttpEffect = httpEffect(
        "POST", "/auth/login", { login: creds.email, password: creds.password },
        Msg.loginSucceeded, Msg.loginFailed, null,
      );
      /* Logging in cannot carry the token it is about to mint. */
      login.auth = false;
      return { model: setUi(model, { busy: true, loginError: "" }), effects: [login] };
    }

    case "tokenSubmitted": {
      const pasted = model.ui.login.token.trim();
      if (!pasted) return keep(model);
      const email = model.ui.login.email || model.session.email || "";
      const live = setUi(
        {
          ...model,
          session: { kind: "live", token: pasted, email, siteId: model.session.siteId, sites: model.session.sites },
        },
        { busy: true, loginError: "", login: { ...model.ui.login, token: "" } },
      );
      const effects: Effect[] = [storeEffect(STORE.token, pasted)];
      if (email) effects.push(storeEffect(STORE.email, email));
      effects.push(meEffect());
      return { model: live, effects };
    }

    case "loginSucceeded": {
      const payload = parseLogin(message.payload);
      if (!payload) {
        const missing = "No token in login response";
        return {
          model: setUi(model, { busy: false, loginError: missing }),
          effects: [toastEffect(missing, "bad")],
        };
      }
      const email = model.ui.login.email || "";
      const next = setUi(
        {
          ...model,
          session: { kind: "live", token: payload.token, email, siteId: model.session.siteId, sites: model.session.sites },
        },
        { busy: true, loginError: "", login: { ...model.ui.login, password: "" } },
      );
      const effects: Effect[] = [storeEffect(STORE.token, payload.token)];
      if (email) effects.push(storeEffect(STORE.email, email));
      effects.push(meEffect());
      return { model: next, effects };
    }

    case "loginFailed": {
      const text = message.error.message;
      return {
        model: setUi(model, { busy: false, loginError: text }),
        effects: [toastRawEffect(text, "bad")],
      };
    }

    case "meLoaded": {
      const me = parseAccount(message.payload);
      const sites: Site[] = [me.defaultSite, ...(me.otherSites ?? [])]
        .filter((site): site is Site => site != null);
      const known = model.session.siteId;
      const keepSite = known != null && sites.some(site => site.id === known)
        ? known
        : (me.defaultSite ?? sites[0])?.id ?? null;
      const connected = setUi(
        { ...model, session: { ...model.session, kind: "live", sites, siteId: keepSite } },
        { page: "dashboard", busy: false, loginError: "", login: blankLogin(""), tokenOpen: false },
      );
      const effects: Effect[] = [storeEffect(STORE.token, connected.session.token)];
      if (keepSite != null) effects.push(storeEffect(STORE.site, String(keepSite)));
      if (connected.session.email) effects.push(storeEffect(STORE.email, connected.session.email));
      effects.push(...refreshEffects(connected));
      return { model: connected, effects };
    }

    case "meFailed": {
      const text = message.error.message;
      return {
        model: setUi(model, { busy: false, loginError: text }),
        effects: [toastRawEffect(text, "bad")],
      };
    }

    case "demoRequested": {
      const demo: Model = {
        session: { kind: "demo", token: "", email: "", siteId: DEMO_SITE_ID, sites: [{ id: DEMO_SITE_ID, name: "Home" }] },
        data: blankData(),
        ui: {
          ...model.ui, page: "dashboard", modal: null, selectedApplianceId: null,
          loginError: "", busy: false, login: blankLogin(""), tokenOpen: false,
          energy: { period: "month", anchor: null, snapshot: null, loading: false, error: null },
        },
      };
      return { model: demo, effects: [{ kind: "demoReset" }, ...refreshEffects(demo)] };
    }

    case "signOutRequested": {
      return {
        model: loginModel(model, ""),
        effects: [storeEffect(STORE.token, null), storeEffect(STORE.site, null)],
      };
    }

    case "siteManageOpened": {
      const site = siteOf(model);
      if (site == null) return keep(model);
      const known = model.session.sites.find(s => s.id === site);
      return keep(setModal(model, { kind: "siteManage", name: known?.name ?? "" }));
    }

    case "siteNameChanged": {
      const modal = model.ui.modal;
      if (modal?.kind !== "siteManage") return keep(model);
      return keep(patchModal(model, { name: message.name }));
    }

    case "siteNameSubmitted": {
      const modal = model.ui.modal;
      if (modal?.kind !== "siteManage") return keep(model);
      const name = modal.name.trim();
      if (!name) return { model, effects: [toastEffect("Enter a site name", "bad")] };
      const site = siteOf(model);
      if (site == null) return keep(model);
      return {
        model,
        effects: [httpEffect("PUT", "/api/site/" + site + "/name", { name }, Msg.siteRenamed, Msg.actionFailed, site)],
      };
    }

    case "siteDefaultRequested": {
      const site = siteOf(model);
      if (site == null) return keep(model);
      return {
        model,
        effects: [httpEffect("PUT", "/api/site/" + site + "/default", null, Msg.siteDefaulted, Msg.actionFailed, site)],
      };
    }

    case "siteRenamed": {
      const site = siteOf(model);
      const modal = model.ui.modal;
      if (site == null || modal?.kind !== "siteManage") return keep(model);
      const name = modal.name.trim();
      return {
        model: setModal({
          ...model,
          session: {
            ...model.session,
            sites: model.session.sites.map(s => s.id === site ? { ...s, name } : s),
          },
        }, null),
        effects: [toastEffect("Site renamed", "ok")],
      };
    }

    case "siteDefaulted": {
      return {
        model: setModal(model, null),
        effects: [toastEffect("Default site updated", "ok"), meEffect()],
      };
    }

    case "siteChanged": {
      const moved: Model = {
        ...model,
        session: { ...model.session, siteId: message.siteId },
        /* Header facts and energy belong to one site: do not carry them across. */
        data: {
          ...model.data, welcome: null, realtime: null, geoloc: null,
          temperatureSensor: null, energyManager: null,
          savings: null, objective: null, rteAlerts: [],
        },
        ui: {
          ...model.ui,
          energy: { ...model.ui.energy, anchor: null, snapshot: null, loading: false, error: null },
        },
      };
      return {
        model: moved,
        effects: [
          httpEffect("PUT", "/api/site/" + message.siteId + "/init", null, Msg.noop, Msg.loadFailed, message.siteId),
          storeEffect(STORE.site, String(message.siteId)),
          ...refreshEffects(moved),
        ],
      };
    }

    /* ---- site data ---- */

    case "appliancesLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      const appliances = parseAppliances(message.payload);
      let selected = model.ui.selectedApplianceId;
      if ((selected == null || !selected) && appliances.length) selected = appliances[0].id;
      return keep(setUi(setData(model, { appliances }), { selectedApplianceId: selected }));
    }

    case "manualLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      return keep(setData(model, { manual: parseManualSettings(message.payload) }));
    }

    case "quickLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      return keep(setData(model, { quick: parseQuickSettings(message.payload) }));
    }

    case "programStateLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      return keep(setData(model, { state: parseProgramState(message.payload) }));
    }

    case "autodiagLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      return keep(setData(model, { autodiag: parseAutodiagList(message.payload) }));
    }

    /* Diagnostics are a nicety: a failed fetch leaves every card at "Status unknown". */
    case "autodiagFailed": return keep(model);

    /* Header facts: absent data is a normal state, never an error and never a toast. */
    case "welcomeLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      return keep(setData(model, { welcome: parseWelcome(message.payload) }));
    }

    case "realtimeLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      return keep(setData(model, { realtime: parseRealtime(message.payload) }));
    }

    case "geolocLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      return keep(setData(model, { geoloc: parseGeoloc(message.payload) }));
    }

    case "welcomeFailed":
    case "realtimeFailed":
    case "geolocFailed": return keep(model);

    case "programsLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      const programs = parsePrograms(message.payload);
      const detail = model.data.programDetail;
      const chosen = programs.find(program => detail != null && program.id === detail.id)
        ?? programs.find(program => program.enabled)
        ?? programs[0]
        ?? null;
      /* Keep showing the current schedule while a newly chosen one is in flight, and
         drop it only when the list is empty (the program was deleted). */
      const withPrograms = setData(model, { programs, programDetail: chosen != null ? detail : null });
      /* A refresh must not add a request: the detail is fetched only when the program
         on screen is not the one the list points at. Every write that changes it asks. */
      if (chosen != null && (detail == null || detail.id !== chosen.id)) {
        return { model: withPrograms, effects: [detailEffect(withPrograms, chosen.id)] };
      }
      return { model: withPrograms, effects: [] };
    }

    case "programDetailLoaded": {
      if (!sameSite(model, meta)) return keep(model);
      return keep(setData(model, { programDetail: parseProgramDetail(message.payload) }));
    }

    case "loadFailed": {
      return { model, effects: [toastRawEffect(message.error.message, "bad")] };
    }

    /* ---- appliances / overrides ---- */

    case "applianceSelected": {
      return keep(setUi(model, { selectedApplianceId: message.applianceId }));
    }

    case "applianceRenameOpened": {
      const appliance = applianceById(model, message.applianceId);
      if (!appliance) return keep(model);
      return {
        model: setModal(model, { kind: "renameAppliance", applianceId: appliance.id, name: appliance.name }),
        effects: [focusEffect("#applianceName")],
      };
    }

    case "applianceRenameNameChanged": {
      const modal = model.ui.modal;
      if (modal?.kind !== "renameAppliance") return keep(model);
      return keep(patchModal(model, { name: message.name }));
    }

    case "applianceRenameSubmitted": {
      const modal = model.ui.modal;
      if (modal?.kind !== "renameAppliance") return keep(model);
      const name = modal.name.trim();
      if (!name) return { model, effects: [toastEffect("Enter an appliance name", "bad")] };
      const site = siteOf(model);
      if (site == null) return keep(model);
      return {
        model,
        effects: [httpEffect(
          "PUT", "/api/site/" + site + "/managed-appliance/" + modal.applianceId,
          { name }, Msg.applianceRenamed, Msg.actionFailed, site,
        )],
      };
    }

    case "applianceRenamed": {
      return {
        model: setModal(model, null),
        effects: [toastEffect("Appliance renamed", "ok"), ...refreshEffects(model)],
      };
    }

    case "deviceFilterChanged": {
      return keep(setUi(model, { deviceFilter: message.filter }));
    }

    case "overrideOpened": {
      const target = applianceById(model, message.applianceId);
      if (!target) return keep(model);
      const seeded = targetTemperatureOf(model, target);
      return keep(setModal(model, {
        kind: "override", applianceId: target.id, mode: modeOf(target), duration: "4",
        target: seeded == null ? "" : String(seeded),
      }));
    }

    case "overrideModeChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "override") return keep(model);
      return keep(patchModal<OverrideModal>(model, { mode: message.mode }));
    }

    case "overrideDurationChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "override") return keep(model);
      return keep(patchModal<OverrideModal>(model, { duration: message.duration }));
    }

    case "overrideTargetChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "override") return keep(model);
      return keep(patchModal<OverrideModal>(model, { target: message.target }));
    }

    case "overrideSubmitted": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "override") return keep(model);
      const appliance = applianceById(model, modal.applianceId) ?? applianceById(model, model.ui.selectedApplianceId);
      if (!appliance) return keep(model);
      const sid = settingId(model, appliance);
      if (!sid) {
        return { model, effects: [toastEffect("This appliance cannot be adjusted manually.", "bad")] };
      }
      const now = message.now;
      let forever = false;
      let until: string | null = null;
      if (modal.duration === "forever") {
        forever = true;
      } else if (modal.duration === "until") {
        const evening = new Date(now);
        evening.setHours(22, 0, 0, 0);
        until = isoLocal(evening.getTime() > now ? evening.getTime() : evening.getTime() + 864e5);
      } else {
        until = isoLocal(now + Number(modal.duration) * 3600e3);
      }
      const temperature = numbers(modal.target) ?? targetTemperatureOf(model, appliance);
      const body = {
        idAppliance: appliance.id,
        enabled: true,
        isOn: modal.mode !== "OFF",
        mode: modal.mode === "OFF" ? (appliance.programming?.mode || "ECO") : modal.mode,
        untilFurtherNotice: forever,
        endDate: forever ? null : until,
        temperatureTarget: temperature,
      };
      const site = siteOf(model);
      return {
        model,
        effects: [httpEffect("PUT", "/api/site/" + site + "/manualsetting/" + sid, body, Msg.overrideApplied, Msg.actionFailed, site)],
      };
    }

    case "overrideApplied": {
      return {
        model: setModal(model, null),
        effects: [toastEffect("Override applied", "ok"), ...refreshEffects(model)],
      };
    }

    case "autoRequested": {
      const auto = applianceById(model, message.applianceId);
      const autoSid = settingId(model, auto);
      if (!auto || !autoSid) {
        return { model, effects: [toastEffect("This appliance cannot be adjusted manually.", "bad")] };
      }
      const body = {
        idAppliance: auto.id, enabled: false, isOn: true, untilFurtherNotice: false,
        endDate: isoLocal(message.now + 60e3),
        mode: auto.programming?.mode || auto.availableModes?.[0] || "ECO",
        temperatureTarget: targetTemperatureOf(model, auto),
      };
      const site = siteOf(model);
      return {
        model,
        effects: [httpEffect("PUT", "/api/site/" + site + "/manualsetting/" + autoSid, body, Msg.autoRestored, Msg.actionFailed, site)],
      };
    }

    case "autoRestored": {
      return {
        model,
        effects: [toastEffect("Back to weekly program", "ok"), ...refreshEffects(model)],
      };
    }

    /* ---- weekly schedule ---- */

    case "planTabSelected": {
      const program = model.data.programDetail;
      if (!program) return keep(model);
      const planning = (program.plannings ?? []).find(plan => plan.id === message.planningId);
      if (!planning) return keep(model);
      return keep(setUi(model, { selectedApplianceId: planning.idAppliance, sel: null }));
    }

    case "slotOpened": {
      if (!planFor(model)) return keep(model);
      return keep(setUi(model, { sel: null, modal: slotModal(model, message.day, message.hour) }));
    }

    case "slotFieldChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "slot") return keep(model);
      const patch = slotFieldPatch(message.field, message.value);
      if (patch == null) return keep(model);
      return keep(patchModal<SlotModal>(model, patch));
    }

    case "slotSaveRequested": return commitSlot(model, false);
    case "slotDeleteRequested": return commitSlot(model, true);
    case "slotWritten": return afterSlotWrite(model, "Schedule updated");
    case "slotRemoved": return afterSlotWrite(model, "Slot removed");

    /* ---- range selection: drag a block of cells, then pick one mode ---- */

    case "selectStarted": {
      const day = clampInt(message.day, 1, 7);
      const hour = clampInt(message.hour, 0, 23);
      return keep(setUi(model, { sel: { aDay: day, aHour: hour, day, hour } }));
    }

    case "selectExtended": {
      const sel = model.ui.sel;
      if (!sel) return keep(model);
      const day = clampInt(message.day, 1, 7);
      const hour = clampInt(message.hour, 0, 23);
      if (day === sel.day && hour === sel.hour) return keep(model);
      return keep(setUi(model, { sel: { aDay: sel.aDay, aHour: sel.aHour, day, hour } }));
    }

    case "selectCommitted": {
      const rect = selRect(model.ui.sel);
      if (!rect) return keep(model);
      /* One cell is still a plain click: keep the precise from/to editor. */
      if (rect.day1 === rect.day2 && rect.hour1 === rect.hour2) {
        return keep(setUi(model, { sel: null, modal: slotModal(model, rect.day1, rect.hour1) }));
      }
      const base = rangeAt(planFor(model), rect.day1, rect.hour1);
      const mode: UiMode = base == null
        ? "ECO"
        : base.isOn === false ? "OFF" : (isUiMode(base.mode) ? base.mode : "ECO");
      return keep(setUi(model, {
        sel: null,
        modal: {
          kind: "range", day1: rect.day1, day2: rect.day2, hour1: rect.hour1, hour2: rect.hour2,
          mode,
          temp: base != null && base.temperature != null ? base.temperature : 19,
        },
      }));
    }

    case "selectCancelled": return keep(setUi(model, { sel: null }));

    case "rangeModeChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "range") return keep(model);
      return keep(patchModal<RangeModal>(model, { mode: message.mode }));
    }

    case "rangeTempChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "range") return keep(model);
      return keep(patchModal<RangeModal>(model, { temp: message.value }));
    }

    case "rangeApplied": return commitRange(model);
    case "rangeWritten": return afterSlotWrite(model, "Schedule updated");

    /* ---- programs ---- */

    case "programSwitchRequested": {
      /* QUICK settings and USER programs are separate lists that may share an id space,
         so the kind decides which list is searched — never a fallback across both. */
      const site = siteOf(model);
      const root = "/api/site/" + site;
      if (message.kind === "QUICK") {
        if (!model.data.quick.some(quick => quick.id === message.id)) return keep(model);
        const flag = message.on ? Msg.quickSwitchedOn : Msg.quickSwitchedOff;
        return {
          model,
          effects: [httpEffect("PUT", root + "/quicksettings/" + message.id + "/enable", { enabled: message.on }, flag, Msg.actionFailed, site)],
        };
      }
      const program = programById(model, message.id);
      if (!program) return keep(model);
      const effects: Effect[] = [];
      if (message.on) {
        for (const other of model.data.programs) {
          if (other.enabled && other.id !== message.id) {
            effects.push(httpEffect(
              "PUT", root + "/programming/program/" + other.id,
              { name: other.name, enabled: false }, Msg.noop, Msg.actionFailed, site,
            ));
          }
        }
      }
      const result = message.on ? Msg.programSwitchedOn : Msg.programSwitchedOff;
      effects.push(httpEffect(
        "PUT", root + "/programming/program/" + message.id,
        { name: program.name, enabled: message.on }, result, Msg.actionFailed, site,
      ));
      return { model, effects };
    }

    case "programSwitchedOn": {
      return { model, effects: [toastEffect("Program enabled", "ok"), ...refreshEffects(model)] };
    }

    case "programSwitchedOff": {
      return { model, effects: [toastEffect("Program disabled", "ok"), ...refreshEffects(model)] };
    }

    /* A quick setting's PUT answers the flags of every quick setting; the backend owns
       exclusivity, so that list is the truth and no client-side disabling is needed. */
    case "quickSwitchedOn": {
      return {
        model: mergeQuickFlags(model, parseQuickFlags(message.payload)),
        effects: [toastEffect("Quick setting enabled", "ok"), ...refreshEffects(model)],
      };
    }

    case "quickSwitchedOff": {
      return {
        model: mergeQuickFlags(model, parseQuickFlags(message.payload)),
        effects: [toastEffect("Quick setting disabled", "ok"), ...refreshEffects(model)],
      };
    }

    case "programEditRequested": {
      const program = programById(model, message.programId);
      if (!program) return keep(model);
      return {
        model,
        effects: [
          detailEffect(model, program.id, Msg.actionFailed),
          scrollEffect("#schedule", "center"),
        ],
      };
    }

    case "newProgramOpened": {
      return {
        model: setModal(model, { kind: "newProgram", name: "Hiver" }),
        effects: [focusEffect("#newName")],
      };
    }

    case "newProgramNameChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "newProgram") return keep(model);
      return keep(patchModal<NewProgramModal>(model, { name: message.name }));
    }

    case "newProgramSubmitted": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "newProgram") return keep(model);
      const name = modal.name.trim();
      if (!name) return keep(model);
      const site = siteOf(model);
      return {
        model,
        effects: [httpEffect("POST", "/api/site/" + site + "/programming/program", { name }, Msg.programCreated, Msg.actionFailed, site)],
      };
    }

    case "programCreated": {
      const createdId = message.payload.id;
      const effects: Effect[] = [toastEffect("Program created", "ok")];
      if (createdId != null) effects.push(detailEffect(model, createdId));
      effects.push(...refreshEffects(model));
      return { model: setModal(model, null), effects };
    }

    /* ---- program management: one modal with three states ---- */

    case "programManageOpened": {
      const managed = programById(model, message.programId);
      if (!managed) return keep(model);
      return {
        model: setModal(model, {
          kind: "programManage", id: managed.id, mode: "edit",
          name: managed.name, copyName: managed.name + " copy",
        }),
        effects: [focusEffect("#programName")],
      };
    }

    case "programManageModeChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "programManage") return keep(model);
      const mode = message.mode === "duplicate" || message.mode === "delete" ? message.mode : "edit";
      const patch: Partial<ProgramManageModal> = { mode };
      if (mode === "duplicate" && !modal.copyName.trim()) {
        patch.copyName = modal.name + " copy";
      }
      return {
        model: patchModal<ProgramManageModal>(model, patch),
        effects: mode === "delete" ? [] : [focusEffect(mode === "duplicate" ? "#programCopyName" : "#programName")],
      };
    }

    case "programManageNameChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "programManage") return keep(model);
      return keep(patchModal<ProgramManageModal>(model,
        modal.mode === "duplicate" ? { copyName: message.name } : { name: message.name }));
    }

    case "programRenameSubmitted": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "programManage" || modal.mode !== "edit") return keep(model);
      const name = modal.name.trim();
      if (!name) return { model, effects: [toastEffect("Enter a program name", "bad")] };
      const row = programById(model, modal.id);
      const site = siteOf(model);
      /* The same PUT as the toggle: a program is written as {name, enabled}. */
      return {
        model,
        effects: [httpEffect(
          "PUT", "/api/site/" + site + "/programming/program/" + modal.id,
          { name, enabled: row != null ? row.enabled : false }, Msg.programRenamed, Msg.actionFailed, site,
        )],
      };
    }

    case "programDuplicateSubmitted": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "programManage" || modal.mode !== "duplicate") return keep(model);
      const name = modal.copyName.trim();
      if (!name) return { model, effects: [toastEffect("Enter a name for the copy", "bad")] };
      const site = siteOf(model);
      /* A program is duplicated by POSTing a new one that names the source id. */
      return {
        model,
        effects: [httpEffect(
          "POST", "/api/site/" + site + "/programming/program",
          { name, id: modal.id }, Msg.programDuplicated, Msg.actionFailed, site,
        )],
      };
    }

    case "programDeleteConfirmed": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "programManage" || modal.mode !== "delete") return keep(model);
      const site = siteOf(model);
      return {
        model,
        effects: [httpEffect(
          "DELETE", "/api/site/" + site + "/programming/program/" + modal.id,
          null, Msg.programDeleted, Msg.actionFailed, site,
        )],
      };
    }

    case "programRenamed": {
      const open = model.data.programDetail;
      const renamedId = model.ui.modal?.kind === "programManage" ? model.ui.modal.id : null;
      const effects: Effect[] = [toastEffect("Program renamed", "ok"), ...refreshEffects(model)];
      /* The list refresh drops the stale name; the detail only needs a re-read when it
         is the program on screen. */
      if (renamedId != null && open != null && open.id === renamedId) {
        effects.push(detailEffect(model, renamedId));
      }
      return { model: setModal(model, null), effects };
    }

    case "programDuplicated": {
      return {
        model: setModal(model, null),
        effects: [toastEffect("Program duplicated", "ok"), ...refreshEffects(model)],
      };
    }

    case "programDeleted": {
      const deletedId = model.ui.modal?.kind === "programManage" ? model.ui.modal.id : null;
      const shown = model.data.programDetail;
      /* Never leave the schedule panel showing a program we just deleted. */
      const trimmed = deletedId != null && shown != null && shown.id === deletedId
        ? setData(model, { programDetail: null })
        : model;
      return {
        model: setModal(trimmed, null),
        effects: [toastEffect("Program deleted", "ok"), ...refreshEffects(trimmed)],
      };
    }

    /* ---- bulk appliance actions ---- */

    case "bulkOpened": {
      return keep(setModal(model, { kind: "bulk", action: message.action }));
    }

    case "bulkConfirmed": {
      const site = siteOf(model);
      if (site == null) return keep(model);
      const targets = model.data.appliances.filter(appliance => settingId(model, appliance) != null);
      if (!targets.length) {
        return { model: setModal(model, null), effects: [toastEffect("No appliance has a writable setting", "bad")] };
      }
      const effects: Effect[] = [];
      for (const appliance of targets) {
        const setting = settingId(model, appliance);
        if (setting == null) continue;
        const mode = modeOf(appliance);
        const body = message.action === "off"
          ? { idAppliance: appliance.id, enabled: true, isOn: false, untilFurtherNotice: true, endDate: null, mode, temperatureTarget: targetTemperatureOf(model, appliance) }
          : { idAppliance: appliance.id, enabled: false, isOn: true, untilFurtherNotice: false, endDate: isoLocal(message.now + 60e3), mode, temperatureTarget: targetTemperatureOf(model, appliance) };
        effects.push(httpEffect(
          "PUT", "/api/site/" + site + "/manualsetting/" + setting, body,
          Msg.noop, Msg.actionFailed, site,
        ));
      }
      effects.push({ kind: "delay", ms: 450 * (targets.length + 1), tags: { ok: () => Msg.bulkApplied() } });
      return {
        model: setModal(model, null),
        effects,
      };
    }

    case "bulkApplied": {
      return {
        model,
        effects: [toastEffect("Appliance states updated", "ok"), ...refreshEffects(model)],
      };
    }

    /* ---- copy one day onto other days ---- */

    case "copyDayOpened": {
      const plan = planFor(model);
      if (!plan) return { model, effects: [toastEffect("Open a program first", "bad")] };
      return keep(setModal(model, { kind: "copyDay", sourceDay: 1, targets: [] }));
    }

    case "copyDaySourceChanged": {
      const modal = model.ui.modal;
      if (modal?.kind !== "copyDay") return keep(model);
      const day = clampInt(message.day, 1, 7);
      return keep(patchModal(model, { sourceDay: day, targets: modal.targets.filter(target => target !== day) }));
    }

    case "copyDayTargetToggled": {
      const modal = model.ui.modal;
      if (modal?.kind !== "copyDay" || message.day === modal.sourceDay) return keep(model);
      const day = clampInt(message.day, 1, 7);
      const has = modal.targets.includes(day);
      return keep(patchModal(model, {
        targets: has ? modal.targets.filter(target => target !== day) : [...modal.targets, day].sort((a, b) => a - b),
      }));
    }

    case "copyDaySubmitted": return commitCopyDay(model);

    case "copyDayWritten": {
      const program = model.data.programDetail;
      const effects: Effect[] = [toastEffect("Days copied", "ok")];
      if (program?.id != null) effects.push(detailEffect(model, program.id));
      return { model: setModal(model, null), effects };
    }

    /* ---- copy one planning to other appliances ---- */

    case "copyPlanOpened": {
      const program = model.data.programDetail;
      const source = planFor(model);
      if (!program || !source) {
        return { model, effects: [toastEffect("Open a program first", "bad")] };
      }
      return keep(setModal(model, {
        kind: "copyPlan", programId: program.id, sourceId: source.id,
        sourceApplianceId: source.idAppliance, targets: [],
      }));
    }

    case "copyPlanTargetToggled": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "copyPlan") return keep(model);
      const targets = modal.targets.slice();
      let at = -1;
      targets.forEach((applianceId, index) => {
        if (String(applianceId) === String(message.applianceId)) at = index;
      });
      if (at >= 0) targets.splice(at, 1); else targets.push(message.applianceId);
      return keep(patchModal<CopyPlanModal>(model, { targets }));
    }

    case "copyPlanSubmitted": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "copyPlan") return keep(model);
      if (!modal.targets.length) {
        return { model, effects: [toastEffect("Choose at least one appliance", "bad")] };
      }
      const site = siteOf(model);
      /* The planning collection keeps its trailing slash. */
      return {
        model,
        effects: [httpEffect(
          "PUT", "/api/site/" + site + "/programming/planning/",
          { idSource: modal.sourceId, idProgram: modal.programId, idAppliances: modal.targets },
          Msg.copyPlanWritten, Msg.actionFailed, site,
        )],
      };
    }

    case "copyPlanWritten": {
      const copiedInto = model.ui.modal?.kind === "copyPlan" ? model.ui.modal.programId : null;
      const effects: Effect[] = [toastEffect("Week copied", "ok"), ...refreshEffects(model)];
      /* The copied plannings become new tabs, so the detail is re-read explicitly. */
      if (copiedInto != null) effects.push(detailEffect(model, copiedInto));
      return { model: setModal(model, null), effects };
    }

    /* ---- a quick setting's duration and per-appliance modes ---- */

    case "quickConfigOpened": {
      const quick = model.data.quick.find(setting => setting.id === message.quickId);
      if (!quick) return keep(model);
      const seeded = dateTimeInputValue(quick.modeEndDate);
      const end = seeded || isoLocal(message.now + 24 * 3600e3).slice(0, 16);
      return {
        model: setModal(model, {
          kind: "quickConfig", id: quick.id, name: quick.name ?? "",
          untilFurtherNotice: !!quick.untilFurtherNotice,
          preset: quick.untilFurtherNotice ? "until" : "custom",
          end,
          rows: quickConfigRows(model, quick),
        }),
        effects: [focusEffect("#quickDuration")],
      };
    }

    case "quickConfigDurationChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "quickConfig") return keep(model);
      const preset = message.preset;
      if (preset === "until") {
        return keep(patchModal<QuickConfigModal>(model, { preset: "until", untilFurtherNotice: true }));
      }
      if (preset === "custom") {
        return keep(patchModal<QuickConfigModal>(model, { preset: "custom", untilFurtherNotice: false }));
      }
      const span = durationMs(preset);
      if (span === null) {
        return keep(patchModal<QuickConfigModal>(model, { preset: "custom", untilFurtherNotice: false }));
      }
      return keep(patchModal<QuickConfigModal>(model, {
        preset, untilFurtherNotice: false, end: isoLocal(message.now + span).slice(0, 16),
      }));
    }

    case "quickConfigEndChanged": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "quickConfig") return keep(model);
      return keep(patchModal<QuickConfigModal>(model, { end: message.value }));
    }

    case "quickConfigRowOnToggled":
      return patchQuickRow(model, message.applianceId, { isOn: message.on });
    case "quickConfigRowModeChanged":
      return patchQuickRow(model, message.applianceId, { mode: message.mode });
    case "quickConfigRowTempChanged":
      return patchQuickRow(model, message.applianceId, { temperatureTarget: message.value });

    case "quickConfigSubmitted": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "quickConfig") return keep(model);
      const forever = modal.untilFurtherNotice;
      const end = forever ? null : normalizeDateTime(modal.end);
      if (!forever && !end) {
        return { model, effects: [toastEffect("Choose when the quick setting ends", "bad")] };
      }
      const site = siteOf(model);
      const body = {
        untilFurtherNotice: forever,
        modeEndDate: end,
        appliancesSettings: modal.rows.map(row => ({
          idAppliance: row.idAppliance,
          isOn: row.isOn,
          mode: row.mode,
          temperatureTarget: numbers(row.temperatureTarget),
        })),
      };
      /* Save the preset first; the enable call follows once the server answered. */
      return {
        model,
        effects: [httpEffect("PUT", "/api/site/" + site + "/quicksettings/" + modal.id, body, Msg.quickConfigured, Msg.actionFailed, site)],
      };
    }

    case "quickConfigured": {
      const enableId = model.ui.modal?.kind === "quickConfig" ? model.ui.modal.id : null;
      if (enableId == null) return keep(model);
      const site = siteOf(model);
      /* The enable answer carries the flags of every quick setting, so it is the truth. */
      return {
        model: setModal(model, null),
        effects: [httpEffect(
          "PUT", "/api/site/" + site + "/quicksettings/" + enableId + "/enable",
          { enabled: true }, Msg.quickSwitchedOn, Msg.actionFailed, site,
        )],
      };
    }

    /* ---- per-appliance diagnostics ---- */

    case "diagOpened": {
      const appliance = applianceById(model, message.applianceId);
      if (!appliance) return keep(model);
      return keep(setModal(model, { kind: "diag", applianceId: appliance.id }));
    }

    case "calibrationOpened": {
      const appliance = applianceById(model, message.applianceId);
      if (!appliance) return keep(model);
      return keep(setModal(model, { kind: "calibrate", applianceId: appliance.id, value: "" }));
    }
    case "calibrationValueChanged": {
      const modal = model.ui.modal;
      if (modal?.kind !== "calibrate") return keep(model);
      return keep(patchModal(model, { value: message.value }));
    }
    case "calibrationSubmitted": {
      const modal = model.ui.modal;
      if (modal?.kind !== "calibrate") return keep(model);
      const value = numbers(modal.value);
      if (value == null || value < 7 || value > 45) {
        return { model, effects: [toastEffect("Enter a measured temperature between 7 and 45 °C", "bad")] };
      }
      const site = siteOf(model);
      if (site == null) return keep(model);
      return {
        model,
        effects: [httpEffect(
          "PUT", "/api/site/" + site + "/managed-appliance/" + modal.applianceId + "/temperature",
          { temperatureMeasurement: value }, Msg.calibrationSaved, Msg.actionFailed, site,
        )],
      };
    }
    case "calibrationSaved": {
      return {
        model: setModal(model, null),
        effects: [toastEffect("Temperature calibration saved", "ok"), ...refreshEffects(model)],
      };
    }

    case "diagRefreshRequested": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "diag") return keep(model);
      return { model, effects: [autodiagEffect(model)] };
    }

    case "diagTestRequested": {
      const modal = model.ui.modal;
      if (modal == null || modal.kind !== "diag") return keep(model);
      const diag = diagOf(model, modal.applianceId);
      if (!diag) {
        return { model, effects: [toastEffect("No diagnostic record for this appliance", "bad")] };
      }
      if (!diag.diagTestEnabled) {
        return { model, effects: [toastEffect("Self-test is disabled for this appliance", "bad")] };
      }
      /* An empty modulator id arrives as 0 once parsed; both mean "none reported". */
      const modulatorId = diag.csModulatorId;
      if (modulatorId == null || modulatorId === "" || modulatorId === 0) {
        return { model, effects: [toastEffect("A self-test is not available for this appliance.", "bad")] };
      }
      const site = siteOf(model);
      return {
        model,
        effects: [httpEffect(
          "POST", "/api/site/" + site + "/autodiag/modulator/" + encodeURIComponent(String(modulatorId)) + "/selftest",
          null, Msg.diagTestStarted, Msg.actionFailed, site,
        )],
      };
    }

    case "diagTestStarted": {
      /* The status only changes on the appliance: re-read it, after this paint. */
      return { model, effects: [toastEffect("Self-test launched", "ok"), autodiagEffect(model)] };
    }

    /* ---- energy and system health ---- */

    case "energyRequested": {
      const anchor = energyAnchor(message.period, message.now);
      const next = setUi(model, {
        energy: { period: message.period, anchor, snapshot: null, loading: true, error: null },
      });
      return { model: next, effects: [energyEffect(next)] };
    }

    case "energyShifted": {
      const current = model.ui.energy;
      const base = current.anchor ?? energyAnchor(current.period, message.now);
      const anchor = shiftEnergyAnchor(current.period, base, message.delta);
      const next = setUi(model, {
        energy: { ...current, anchor, snapshot: null, loading: true, error: null },
      });
      return { model: next, effects: [energyEffect(next)] };
    }

    case "energyLoaded": {
      const current = model.ui.energy;
      const anchor = current.anchor ?? "";
      const snapshot = parseConsumption(message.payload, current.period, anchor);
      return keep(setUi(model, {
        energy: { ...current, snapshot, loading: false, error: snapshot ? null : "No consumption data for this period." },
      }));
    }

    case "energyFailed": {
      return keep(setUi(model, {
        energy: { ...model.ui.energy, loading: false, error: message.error.message || "Could not load consumption." },
      }));
    }

    case "savingsLoaded": {
      if (!sameSite(model, message.meta)) return keep(model);
      return keep(setData(model, { savings: parseSavings(message.payload) }));
    }
    case "objectiveLoaded": {
      if (!sameSite(model, message.meta)) return keep(model);
      return keep(setData(model, { objective: parseObjective(message.payload) }));
    }
    case "rteAlertsLoaded": {
      if (!sameSite(model, message.meta)) return keep(model);
      return keep(setData(model, { rteAlerts: parseRteAlerts(message.payload) }));
    }

    case "temperatureSensorLoaded": {
      if (!sameSite(model, message.meta)) return keep(model);
      return keep(setData(model, { temperatureSensor: parseTemperatureSensor(message.payload) }));
    }
    case "energyManagerLoaded": {
      if (!sameSite(model, message.meta)) return keep(model);
      return keep(setData(model, { energyManager: parseEnergyManager(message.payload) }));
    }

    case "refreshRequested": return { model, effects: refreshEffects(model) };

    case "quickRestoreRequested": {
      const site = siteOf(model);
      if (site == null) return keep(model);
      return { model, effects: [httpEffect("POST", "/api/site/" + site + "/quicksettings/init", null, Msg.quickRestored, Msg.actionFailed, site)] };
    }
    case "quickRestored": {
      return { model, effects: [toastEffect("Default presets restored", "ok"), ...refreshEffects(model)] };
    }

    case "diagAllRequested": {
      const site = siteOf(model);
      if (site == null) return keep(model);
      return { model, effects: [httpEffect("POST", "/api/site/" + site + "/autodiag", null, Msg.diagAllStarted, Msg.actionFailed, site)] };
    }
    case "diagAllStarted": {
      return { model, effects: [toastEffect("Self-tests launched", "ok"), autodiagEffect(model)] };
    }

    /* ---- geolocation flag ---- */

    case "geolocToggleRequested": {
      const geoloc = model.data.geoloc;
      if (!geoloc) return keep(model);
      const on = message.on;
      if (geoloc.activatedByUser === on) return keep(model);
      const radius = numbers(geoloc.radius) ?? 1000;
      const body: { radius: number; activatedByUser: boolean; latitude?: number; longitude?: number } = {
        radius, activatedByUser: on,
      };
      /* Only a position the site already stored is echoed back; the browser is never asked
         for one, so the flag can be switched without touching a location. */
      const latitude = numbers(geoloc.latitude);
      const longitude = numbers(geoloc.longitude);
      if (latitude != null && longitude != null) {
        body.latitude = latitude;
        body.longitude = longitude;
      }
      const site = siteOf(model);
      return {
        model,
        effects: [httpEffect("PUT", "/api/site/" + site + "/geoloc", body, Msg.geolocSaved, Msg.actionFailed, site)],
      };
    }

    case "geolocSaved": {
      const saved = parseGeoloc(message.payload);
      return {
        model: saved ? setData(model, { geoloc: saved }) : model,
        effects: [toastEffect("Geolocation updated", "ok"), geolocEffect(model)],
      };
    }

    /* ---- ui ---- */

    case "modalCloseRequested": return keep(setUi(model, { modal: null, sel: null }));
    case "tokenSectionToggled": return keep(setUi(model, { tokenOpen: message.open }));

    case "toastShown": {
      const toastId = model.ui.toastSeq + 1;
      const toasts = [...model.ui.toasts, { id: toastId, text: message.text, tone: message.tone }]
        .slice(-TOAST_LIMIT);
      return {
        model: setUi(model, { toasts, toastSeq: toastId }),
        effects: [toastDelay(toastId)],
      };
    }

    case "toastDismissed":
    case "toastExpired": {
      const remaining = model.ui.toasts.filter(toast => toast.id !== message.toastId);
      if (remaining.length === model.ui.toasts.length) return keep(model);
      return keep(setUi(model, { toasts: remaining }));
    }

    case "actionFailed": {
      return { model, effects: [toastRawEffect(message.error.message, "bad")] };
    }

    case "noop": return keep(model);

    default: {
      message satisfies never;
      return keep(model);
    }
  }
}
