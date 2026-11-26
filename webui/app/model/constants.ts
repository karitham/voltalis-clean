import type {
  ConnectionInfo, Mode, ModeClass, ModeInfo, OverrideDuration, OverrideDurationInfo,
  QuickDurationInfo, SiteId,
} from "./types";
import type { MessageKey } from "../i18n";

export const BASE = "https://api.myvoltalis.com";
export const MIN_INTERVAL_MS = 450;
export const TOAST_MS = 4500;
export const TOAST_LIMIT = 4;
export const DEMO_SITE_ID: SiteId = 42;

export const STORE = {
  token: "voltalis.token",
  email: "voltalis.email",
  site: "voltalis.site",
} as const;

export const MODES: readonly ModeInfo[] = [
  { v: "CONFORT", label: "Comfort", cls: "confort" },
  { v: "CONFORTMINUS1", label: "Comfort −1", cls: "confort" },
  { v: "CONFORTMINUS2", label: "Comfort −2", cls: "confort" },
  { v: "ECO", label: "Eco", cls: "eco" },
  { v: "ECOV", label: "Eco V", cls: "eco" },
  { v: "HORS_GEL", label: "Frost protection", cls: "frost" },
  { v: "TEMPERATURE", label: "Temperature", cls: "temp" },
  { v: "NORMAL", label: "Normal", cls: "confort" },
];

export const MODE_LABEL: Record<Mode, MessageKey> = Object.fromEntries(
  MODES.map(m => [m.v, m.label]),
) as Record<Mode, MessageKey>;
export const MODE_CLS: Record<Mode, ModeClass> = Object.fromEntries(
  MODES.map(m => [m.v, m.cls]),
) as Record<Mode, ModeClass>;

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const DURATIONS: readonly OverrideDurationInfo[] = [
  { v: "1", label: "1 hour" },
  { v: "2", label: "2 hours" },
  { v: "4", label: "4 hours" },
  { v: "8", label: "8 hours" },
  { v: "until", label: "Until 22:00" },
  { v: "forever", label: "Until further notice" },
];

export const PROGRAM_NAMES: Readonly<Record<string, MessageKey>> = {
  "quicksettings.athome": "At home",
  "quicksettings.shortleave": "Short absence",
  "quicksettings.longleave": "Long absence",
  "program.default": "Default program",
};

export const CONNECTION: Readonly<Record<string, ConnectionInfo>> = {
  OK: { text: "Connected", tone: "ok" },
  NOK: { text: "Fault", tone: "nok" },
  TEST_IN_PROGRESS: { text: "Test running", tone: "test" },
  NO_CONSUMPTION: { text: "No consumption", tone: "none" },
  COMM_ERROR: { text: "Comm. error", tone: "error" },
};

export const QUICK_DURATIONS: readonly QuickDurationInfo[] = [
  { v: "h1", label: "1 hour", ms: 3600e3 },
  { v: "h2", label: "2 hours", ms: 7200e3 },
  { v: "h3", label: "3 hours", ms: 3 * 3600e3 },
  { v: "h6", label: "6 hours", ms: 6 * 3600e3 },
  { v: "h12", label: "12 hours", ms: 12 * 3600e3 },
  { v: "h24", label: "24 hours", ms: 24 * 3600e3 },
  { v: "d3", label: "3 days", ms: 3 * 864e5 },
  { v: "d5", label: "5 days", ms: 5 * 864e5 },
  { v: "d7", label: "7 days", ms: 7 * 864e5 },
  { v: "d14", label: "14 days", ms: 14 * 864e5 },
  { v: "d21", label: "21 days", ms: 21 * 864e5 },
];

export const LIVE_KEYS = [
  "value", "consumption", "consumptionValue", "power", "powerValue", "watt",
  "watts", "total", "sum", "liveConsumption", "instantConsumption", "realTimeConsumption",
] as const;
export const LIVE_KEY = /(value|cons|power|watt|total|sum|kwh)/i;
export const SKIP_KEY = /(id|date|time|status|code|count|num)/i;

export const OVERRIDE_DURATIONS: ReadonlySet<OverrideDuration> = new Set(
  DURATIONS.map(d => d.v),
);
