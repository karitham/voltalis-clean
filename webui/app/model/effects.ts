import { TOAST_MS } from "./constants";
import type { MessageKey } from "../i18n";
import { Msg } from "./messages";
import type {
  Account, ApiError, Appliance, Autodiag, Effect, HttpEffect, Model, Msg as MsgValue, ProgramDetail,
  QuickFlag, QuickSetting, ResponseMeta, SiteId, ToastTone,
} from "./types";
import { siteOf } from "./select";

export type ErrTag = (error: ApiError, meta: ResponseMeta) => MsgValue;
export type OkTag<P> = (payload: P, meta: ResponseMeta) => MsgValue;

/* Catalogue keys only: a typo here is a compile error. */
export function toastEffect(text: MessageKey, tone: ToastTone = "ok"): Extract<Effect, { kind: "toast" }> {
  return { kind: "toast", text, tone };
}

/* readableError() has already localized this text; it is not a catalogue key. */
export function toastRawEffect(text: string, tone: ToastTone = "bad"): Extract<Effect, { kind: "toast" }> {
  return { kind: "toast", text, tone };
}

export function httpEffect<P = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body: unknown | null,
  ok: OkTag<P>,
  fail: ErrTag = Msg.actionFailed,
  siteId: SiteId | null = null,
): HttpEffect {
  return {
    kind: "http", method, path,
    body: body === undefined ? null : body,
    tags: {
      ok: (payload, meta) => ok(payload as P, meta),
      fail: (error, meta) => fail(error, meta),
    },
    siteId,
  };
}

export const noopError: ErrTag = () => Msg.noop();

export function detailEffect(model: Model, id: number, failTag: ErrTag = noopError): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<ProgramDetail | null>(
    "GET", "/api/site/" + site + "/programming/program/" + id, null,
    Msg.programDetailLoaded, failTag, site,
  );
  effect.defer = true;
  return effect;
}

export function autodiagEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<Autodiag[]>(
    "GET", "/api/site/" + site + "/autodiag", null,
    Msg.autodiagLoaded, Msg.autodiagFailed, site,
  );
  effect.defer = true;
  return effect;
}

export function welcomeEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<unknown>(
    "GET", "/api/site/" + site + "/consumption/welcome", null,
    Msg.welcomeLoaded, Msg.welcomeFailed, site,
  );
  effect.defer = true;
  return effect;
}

export function realtimeEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<unknown>(
    "GET", "/api/site/" + site + "/consumption/realtime?mode=TEN_MINUTES&numPoints=1", null,
    Msg.realtimeLoaded, Msg.realtimeFailed, site,
  );
  effect.defer = true;
  return effect;
}

export function geolocEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<unknown>(
    "GET", "/api/site/" + site + "/geoloc", null,
    Msg.geolocLoaded, Msg.geolocFailed, site,
  );
  effect.defer = true;
  return effect;
}

export function energyEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const state = model.ui.energy;
  const anchor = state.anchor ?? "";
  return httpEffect<Model["ui"]["energy"]["snapshot"]>(
    "GET", "/api/site/" + site + "/consumption/" + state.period + "/" + anchor + "/full-data", null,
    Msg.energyLoaded, Msg.energyFailed, site,
  );
}

export function temperatureSensorEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<Model["data"]["temperatureSensor"]>(
    "GET", "/api/site/" + site + "/temperature-sensor", null,
    Msg.temperatureSensorLoaded, Msg.welcomeFailed, site,
  );
  effect.defer = true;
  return effect;
}

export function energyManagerEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<Model["data"]["energyManager"]>(
    "GET", "/api/site/" + site + "/energymanager", null,
    Msg.energyManagerLoaded, Msg.welcomeFailed, site,
  );
  effect.defer = true;
  return effect;
}

export function savingsEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<Model["data"]["savings"]>(
    "GET", "/api/site/" + site + "/savings", null,
    Msg.savingsLoaded, noopError, site,
  );
  effect.defer = true;
  return effect;
}

export function objectiveEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<Model["data"]["objective"]>(
    "GET", "/api/site/" + site + "/objective", null,
    Msg.objectiveLoaded, noopError, site,
  );
  effect.defer = true;
  return effect;
}

export function rteAlertsEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  const effect = httpEffect<Model["data"]["rteAlerts"]>(
    "GET", "/api/" + site + "/rte-alerts", null,
    Msg.rteAlertsLoaded, noopError, site,
  );
  effect.defer = true;
  return effect;
}

export function diagAllEffect(model: Model): HttpEffect {
  const site = siteOf(model);
  return httpEffect(
    "POST", "/api/site/" + site + "/autodiag", null,
    Msg.diagAllStarted, Msg.actionFailed, site,
  );
}

export function refreshEffects(model: Model): HttpEffect[] {
  const site = siteOf(model);
  if (site == null) return [];
  const root = "/api/site/" + site;
  return [
    httpEffect<Appliance[]>("GET", root + "/managed-appliance", null, Msg.appliancesLoaded, Msg.loadFailed, site),
    httpEffect<Model["data"]["manual"]>("GET", root + "/manualsetting", null, Msg.manualLoaded, Msg.loadFailed, site),
    httpEffect<QuickSetting[]>("GET", root + "/quicksettings", null, Msg.quickLoaded, Msg.loadFailed, site),
    httpEffect<Model["data"]["programs"]>("GET", root + "/programming/program", null, Msg.programsLoaded, Msg.loadFailed, site),
    httpEffect<Model["data"]["state"]>("GET", root + "/programming/state", null, Msg.programStateLoaded, noopError, site),
    autodiagEffect(model),
    welcomeEffect(model),
    realtimeEffect(model),
    geolocEffect(model),
    temperatureSensorEffect(model),
    energyManagerEffect(model),
    savingsEffect(model),
    objectiveEffect(model),
    rteAlertsEffect(model),
    ...(model.ui.energy.anchor ? [energyEffect(model)] : []),
  ];
}

export function meEffect(): HttpEffect {
  return httpEffect<Account>(
    "GET", "/api/account/me", null, Msg.meLoaded, Msg.meFailed, null,
  );
}

/* The only closure update creates: binds a timer to a toast id. Pure. */
export function toastExpiredTag(id: number): () => MsgValue {
  return () => Msg.toastExpired(id);
}

export function quickFlagsEffect(model: Model, id: number, on: boolean): HttpEffect {
  const site = siteOf(model);
  return httpEffect<QuickFlag[]>(
    "PUT", "/api/site/" + site + "/quicksettings/" + id + "/enable", { enabled: on },
    on ? Msg.quickSwitchedOn : Msg.quickSwitchedOff, Msg.actionFailed, site,
  );
}

export function toastDelay(id: number): { kind: "delay"; ms: number; tags: { ok: () => MsgValue } } {
  return { kind: "delay", ms: TOAST_MS, tags: { ok: toastExpiredTag(id) } };
}

export function storeEffect(key: string, value: string | null): { kind: "store"; key: string; value: string | null } {
  return { kind: "store", key, value };
}

export function focusEffect(selector: string): { kind: "focus"; selector: string } {
  return { kind: "focus", selector };
}

export function scrollEffect(selector: string, block: ScrollLogicalPosition = "center"): { kind: "scroll"; selector: string; block: ScrollLogicalPosition } {
  return { kind: "scroll", selector, block };
}
