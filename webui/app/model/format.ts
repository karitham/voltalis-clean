import { LIVE_KEY, LIVE_KEYS, MODES, PROGRAM_NAMES, QUICK_DURATIONS, SKIP_KEY } from "./constants";
import { localeCode, t, term } from "../i18n";
import type {
  Appliance, ConsumptionPeriod, Mode, Programming, QuickPreset, Range, Rect, Selection,
} from "./types";

export function esc(value: unknown): string {
  return String(value == null ? "" : value).replace(/[&<>"']/g, c => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[c];
  });
}

export function pad2(n: number): string { return String(n).padStart(2, "0"); }

/* Deterministic formatting of an instant supplied by the shell (never Date.now()). */
export function isoLocal(ms: number): string {
  const d = new Date(ms);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
    "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
}

export function humanName(n: string | null | undefined): string {
  const raw = String(n ?? "");
  if (PROGRAM_NAMES[raw]) return t(PROGRAM_NAMES[raw]);
  if (/^(quicksettings|program)\./.test(raw)) return humanWords(raw.split(".").pop() ?? raw);
  return raw;
}

export function minutes(hhmm: string | null | undefined): number {
  const parts = String(hhmm ?? "00:00").split(":");
  return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
export function numbers(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function asArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isObject) as T[];
}

export function clampInt(value: unknown, lo: number, hi: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/* Minutes since midnight back to the API's HH:MM; a day ends at 23:59, never 24:00. */
export function hhmm(total: number): string {
  const m = Math.min(1440, Math.max(0, Math.round(total)));
  if (m >= 1440) return "23:59";
  return pad2(Math.floor(m / 60)) + ":" + pad2(m % 60);
}
/* For humans only: the same instant, but a day's end reads as 24:00 in a title. */
export function hhmmLabel(total: number): string {
  const m = Math.min(1440, Math.max(0, Math.round(total)));
  return m >= 1440 ? "24:00" : hhmm(m);
}

export function selRect(sel: Selection | null): Rect | null {
  if (!sel) return null;
  return {
    day1: Math.min(sel.aDay, sel.day), day2: Math.max(sel.aDay, sel.day),
    hour1: Math.min(sel.aHour, sel.hour), hour2: Math.max(sel.aHour, sel.hour),
  };
}

export function inRect(rect: Rect | null, day: number, hour: number): boolean {
  return !!rect && day >= rect.day1 && day <= rect.day2 && hour >= rect.hour1 && hour <= rect.hour2;
}

/* Replace the [a,b) minute band of one day. Ranges outside are kept, an edge-straddling
   range is split, and the replacement is inserted sorted. */
export function replaceBand(ranges: readonly Range[], a: number, b: number, next: Range | null): Range[] {
  const out: Range[] = [];
  for (const r of ranges) {
    const from = minutes(r.from), to = minutes(r.to);
    if (!(to > a && from < b)) { out.push({ ...r }); continue; }
    if (from < a) out.push({ ...r, to: hhmm(a) });
    if (to > b) out.push({ ...r, from: hhmm(b) });
  }
  if (next) out.push(next);
  out.sort((x, y) => minutes(x.from) - minutes(y.from));
  return out;
}

export function humanWords(value: unknown): string {
  const raw = String(value);
  if (raw.toUpperCase() === "ON_OFF") return term("on/off");
  const parts = raw.split("_");
  if (parts.length > 1 && /^[A-Z]{2,3}$/.test(parts[0])) {
    return parts[0] + " " + parts.slice(1).join(" ").toLowerCase();
  }
  const s = raw.toLowerCase().replace(/_/g, " ");
  return term(s.charAt(0).toUpperCase() + s.slice(1));
}

export function typeOf(appliance: Appliance): string {
  const p = appliance.programming ?? {};
  const type = appliance.applianceType ?? p.applianceType ?? "";
  const modulator = appliance.modulatorType ?? p.modulatorType ?? "";
  const base = type === "WATER_HEATER" ? t("Water heater") : type === "HEATER" ? t("Radiator") : (type ? humanWords(type) : t("Appliance"));
  return modulator ? base + " · " + humanWords(modulator) : base;
}

export function untilLabel(p: Programming): string {
  if (p.untilFurtherNotice) return t("until further notice");
  const raw = p.endDate ? String(p.endDate) : "";
  if (!raw) return "";
  if (raw.length >= 16) return t("until {date}", { date: raw.slice(8, 10) + "/" + raw.slice(5, 7) + " " + raw.slice(11, 16) });
  return t("until {date}", { date: raw });
}

export function firstNumber(node: unknown, depth = 0): number | null {
  if (node == null || depth > 4) return null;
  if (typeof node === "number") return Number.isFinite(node) ? node : null;
  if (typeof node === "string") {
    const text = Number(node);
    return node.trim() !== "" && Number.isFinite(text) ? text : null;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = firstNumber(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  if (!isObject(node)) return null;
  for (const key of LIVE_KEYS) {
    if (key in node) {
      const named = firstNumber(node[key], depth + 1);
      if (named !== null) return named;
    }
  }
  const keys = Object.keys(node);
  for (const key of keys) {
    if (!LIVE_KEY.test(key) || SKIP_KEY.test(key)) continue;
    const hinted = firstNumber(node[key], depth + 1);
    if (hinted !== null) return hinted;
  }
  for (const key of keys) {
    if (SKIP_KEY.test(key)) continue;
    const deep = firstNumber(node[key], depth + 1);
    if (deep !== null) return deep;
  }
  return null;
}

export function firstUnit(node: unknown, depth = 0): string {
  if (node == null || depth > 3) return "";
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = firstUnit(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (!isObject(node)) return "";
  for (const key of ["unit", "unitName", "unitSymbol", "unite"]) {
    const value = node[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const key of Object.keys(node)) {
    const found = firstUnit(node[key], depth + 1);
    if (found) return found;
  }
  return "";
}

export function fmtNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(localeCode(), { maximumFractionDigits }).format(value);
}

function unitSpace(): string {
  return localeCode() === "fr-FR" ? "\u202f" : " ";
}

export function titleCaseName(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/(^|[\s'-])(\p{L})/gu, (_match: string, separator: string, letter: string) =>
    separator + letter.toLocaleUpperCase(localeCode()),
  );
}

export function fmtTemp(value: unknown): string {
  const n = numbers(value);
  return n === null ? "" : (Math.round(n * 10) / 10).toLocaleString(localeCode(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + unitSpace() + "°C";
}

export function fmtLive(live: { value: number; unit: string } | null | undefined): string {
  if (!live) return "";
  const n = numbers(live.value);
  if (n === null) return "";
  if (live.unit) return (Math.round(n * 100) / 100).toLocaleString(localeCode(), { maximumFractionDigits: 2 }) + unitSpace() + live.unit;
  if (Math.abs(n) >= 1000) return (Math.round(n / 100) / 10).toLocaleString(localeCode(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + unitSpace() + "kW";
  return (Math.round(n * 10) / 10).toLocaleString(localeCode(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + unitSpace() + "W";
}

export function weatherGlyph(iconName: string): string {
  const name = iconName.toLowerCase();
  if (!name) return "";
  if (/sun|clear/.test(name)) return "☀";
  if (/snow|frost|ice/.test(name)) return "❄";
  if (/storm|thunder|lightning/.test(name)) return "⚡";
  if (/rain|shower|drizzle/.test(name)) return "☂";
  if (/cloud|overcast|fog|mist/.test(name)) return "☁";
  return "";
}

export function durationMs(value: QuickPreset): number | null {
  const hit = QUICK_DURATIONS.find(d => d.v === value);
  return hit ? hit.ms : null;
}

/* endDate / modeEndDate: local time, seconds, no zone (YYYY-MM-DDTHH:mm:ss). */
export function normalizeDateTime(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/.test(raw)) return raw + ":00";
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(raw)) return raw;
  return null;
}

export function dateTimeInputValue(value: unknown): string {
  const normal = normalizeDateTime(value);
  return normal ? normal.slice(0, 16) : "";
}

/* A preset may carry a mode the appliance no longer advertises; keep it selectable. */
export function modeListFor(appliance: Appliance | null | undefined, current: string | undefined): Mode[] {
  if (appliance && Array.isArray(appliance.availableModes) && appliance.availableModes.length) {
    const list = appliance.availableModes.slice();
    if (current && !list.includes(current as Mode)) list.unshift(current as Mode);
    return list;
  }
  return MODES.map(m => m.v);
}

export function hasId(list: readonly number[] | null | undefined, id: number): boolean {
  return (list ?? []).some(x => String(x) === String(id));
}

export function readableError(payload: unknown, status: number): string {
  const items = Array.isArray(payload) ? payload : [payload];
  const text = items.map(x => {
    if (!isObject(x)) return "";
    const description = x.description, message = x.message;
    return typeof description === "string" ? description : typeof message === "string" ? message : "";
  }).filter(Boolean).join(", ");
  const known: Record<string, string> = {
    missingtoken: t("Session expired — connect again."),
    badcredentials: t("Incorrect email or password."),
    invalidcredentials: t("Incorrect email or password."),
    forbidden: t("Access denied."),
  };
  const key = text.replace("backend.error.subscriber.", "");
  if (known[key]) return known[key];
  if (status === 401) return t("Session expired — connect again.");
  if (status === 301) return t("Voltalis wants you on the old site; re-link your account.");
  return known[key] || text || t("Request failed ({status})", { status });
}


/* ---------- consumption periods ---------- */

function localDate(ms: number): Date { return new Date(ms); }
function dateKey(d: Date): string {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
export function energyAnchor(period: ConsumptionPeriod, now: number): string {
  const d = localDate(now);
  if (period === "day") return dateKey(d);
  if (period === "week") {
    const offset = (d.getDay() + 6) % 7;   // Monday = 0
    d.setDate(d.getDate() - offset);
    return dateKey(d);
  }
  if (period === "month") return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
  return String(d.getFullYear());
}
export function shiftEnergyAnchor(period: ConsumptionPeriod, anchor: string, delta: number): string {
  if (period === "month") {
    const [year, month] = anchor.split("-").map(Number);
    const d = new Date(year, (month || 1) - 1 + delta, 1);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
  }
  if (period === "year") return String(Number(anchor) + delta);
  const d = new Date(anchor + "T00:00:00");
  d.setDate(d.getDate() + (period === "week" ? delta * 7 : delta));
  return dateKey(d);
}
export function consumptionPeriodLabel(period: ConsumptionPeriod, anchor: string): string {
  if (period === "year") return anchor;
  if (period === "month") {
    const [year, month] = anchor.split("-").map(Number);
    return new Date(year, (month || 1) - 1, 1)
      .toLocaleDateString(localeCode(), { month: "long", year: "numeric" });
  }
  const d = new Date(anchor + "T00:00:00");
  if (period === "day") return d.toLocaleDateString(localeCode(), { day: "numeric", month: "short", year: "numeric" });
  return t("Week of {date}", { date: d.toLocaleDateString(localeCode(), { day: "numeric", month: "short", year: "numeric" }) });
}
export function fmtKwh(wh: number): string {
  const kwh = wh / 1000;
  const digits = kwh < 100 ? 1 : 0;
  return fmtNumber(Math.round(kwh * 10) / 10, digits) + unitSpace() + "kWh";
}
export function fmtMoney(value: number): string {
  return (Math.round(value * 100) / 100).toLocaleString(localeCode(), { style: "currency", currency: "EUR" });
}
