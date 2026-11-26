/* API payload parsers. These are the only places where untyped JSON becomes the
 * domain model; malformed rows are dropped rather than trusted. */
import { clampNumber, firstNumber, firstUnit, isObject, numbers } from "./format";
import type {
  Account, Appliance, Autodiag, ConsumptionPeriod, ConsumptionPoint, ConsumptionSnapshot, DailyProg,
  EnergyManager, Geoloc, LoginResponse, ManualSetting, Objective, RteAlert, Savings, TemperatureSensor,
  Mode, Planning, Program, ProgramDetail, ProgramState, Programming, QuickApplianceSetting,
  QuickFlag, QuickSetting, Range, Realtime, Site, Welcome,
} from "./types";

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}
function id(value: unknown): number | null {
  const n = numbers(value);
  return n == null ? null : n;
}
function bool(value: unknown): boolean { return !!value; }
function optionalBool(value: unknown): boolean | undefined {
  return value == null ? undefined : !!value;
}
function optionalString(value: unknown): string | null {
  return value == null ? null : String(value);
}
function mode(value: unknown): Mode | string | undefined {
  return typeof value === "string" ? value : undefined;
}
function mapArray<T>(value: unknown, parse: (row: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const row of value) {
    if (!isObject(row)) continue;
    const parsed = parse(row);
    if (parsed) out.push(parsed);
  }
  return out;
}

function parseSite(row: Record<string, unknown>): Site | null {
  const siteId = id(row.id);
  if (siteId == null) return null;
  return { id: siteId, name: typeof row.name === "string" ? row.name : undefined };
}
export function parseAccount(payload: unknown): Account {
  if (!isObject(payload)) return {};
  const defaultSite = isObject(payload.defaultSite) ? parseSite(payload.defaultSite) ?? undefined : undefined;
  const others = Array.isArray(payload.otherSites)
    ? payload.otherSites.filter(isObject).map(parseSite).filter((s): s is Site => !!s)
    : [];
  return { defaultSite, otherSites: others };
}
export function parseLogin(payload: unknown): LoginResponse | null {
  if (!isObject(payload) || typeof payload.token !== "string" || !payload.token) return null;
  return { token: payload.token };
}

function parseProgramming(value: unknown): Programming | undefined {
  if (!isObject(value)) return undefined;
  return {
    progType: typeof value.progType === "string" ? value.progType : undefined,
    progName: optionalString(value.progName),
    idManualSetting: id(value.idManualSetting),
    idPlanning: id(value.idPlanning),
    isOn: optionalBool(value.isOn),
    untilFurtherNotice: optionalBool(value.untilFurtherNotice),
    mode: mode(value.mode),
    endDate: optionalString(value.endDate),
    temperatureTarget: numbers(value.temperatureTarget),
    defaultTemperature: numbers(value.defaultTemperature),
    heatingLevel: numbers(value.heatingLevel),
    applianceType: typeof value.applianceType === "string" ? value.applianceType : undefined,
    modulatorType: typeof value.modulatorType === "string" ? value.modulatorType : undefined,
  };
}
export function parseAppliance(row: Record<string, unknown>): Appliance | null {
  const applianceId = id(row.id);
  if (applianceId == null) return null;
  const available = Array.isArray(row.availableModes)
    ? row.availableModes.filter((m): m is Mode => typeof m === "string")
    : undefined;
  return {
    id: applianceId,
    name: str(row.name, "Appliance " + applianceId),
    applianceType: typeof row.applianceType === "string" ? row.applianceType : undefined,
    modulatorType: typeof row.modulatorType === "string" ? row.modulatorType : undefined,
    heatingLevel: numbers(row.heatingLevel),
    availableModes: available,
    programming: parseProgramming(row.programming),
  };
}
export function parseAppliances(payload: unknown): Appliance[] {
  return mapArray(payload, parseAppliance);
}

export function parseManual(row: Record<string, unknown>): ManualSetting | null {
  const settingId = id(row.id), applianceId = id(row.idAppliance);
  if (settingId == null || applianceId == null) return null;
  return {
    id: settingId, idAppliance: applianceId,
    enabled: bool(row.enabled), isOn: optionalBool(row.isOn),
    mode: mode(row.mode), untilFurtherNotice: optionalBool(row.untilFurtherNotice),
    endDate: optionalString(row.endDate), temperatureTarget: numbers(row.temperatureTarget),
    applianceName: typeof row.applianceName === "string" ? row.applianceName : undefined,
    applianceType: typeof row.applianceType === "string" ? row.applianceType : undefined,
    heatingLevel: numbers(row.heatingLevel),
  };
}
export function parseManualSettings(payload: unknown): ManualSetting[] {
  return mapArray(payload, parseManual);
}

function parseQuickSetting(row: Record<string, unknown>): QuickApplianceSetting | null {
  const applianceId = id(row.idAppliance);
  if (applianceId == null) return null;
  return {
    idAppliance: applianceId,
    applianceName: typeof row.applianceName === "string" ? row.applianceName : undefined,
    isOn: optionalBool(row.isOn), mode: mode(row.mode),
    temperatureTarget: numbers(row.temperatureTarget),
  };
}
export function parseQuick(row: Record<string, unknown>): QuickSetting | null {
  const quickId = id(row.id);
  if (quickId == null) return null;
  return {
    id: quickId,
    name: typeof row.name === "string" ? row.name : undefined,
    enabled: bool(row.enabled),
    untilFurtherNotice: optionalBool(row.untilFurtherNotice),
    modeEndDate: optionalString(row.modeEndDate),
    appliancesSettings: Array.isArray(row.appliancesSettings)
      ? row.appliancesSettings.filter(isObject).map(parseQuickSetting).filter((x): x is QuickApplianceSetting => !!x)
      : undefined,
  };
}
export function parseQuickSettings(payload: unknown): QuickSetting[] {
  return mapArray(payload, parseQuick);
}
export function parseQuickFlags(payload: unknown): QuickFlag[] {
  return mapArray(payload, row => {
    const quickId = id(row.id);
    if (quickId == null || !("enabled" in row)) return null;
    return { id: quickId, enabled: bool(row.enabled) };
  });
}

export function parseProgram(row: Record<string, unknown>): Program | null {
  const programId = id(row.id);
  if (programId == null) return null;
  return { id: programId, name: str(row.name, "Program " + programId), enabled: bool(row.enabled) };
}
export function parsePrograms(payload: unknown): Program[] {
  return mapArray(payload, parseProgram);
}

function parseRange(row: Record<string, unknown>): Range | null {
  if (typeof row.from !== "string" || typeof row.to !== "string") return null;
  return {
    from: row.from, to: row.to, mode: mode(row.mode),
    temperature: numbers(row.temperature), isOn: row.isOn === false ? false : true,
  };
}
function parseDaily(row: Record<string, unknown>): DailyProg | null {
  const dayNumber = numbers(row.dayNumber), dayId = numbers(row.id);
  if (dayNumber == null) return null;
  return {
    id: dayId ?? dayNumber,
    dayNumber,
    ranges: Array.isArray(row.ranges)
      ? row.ranges.filter(isObject).map(parseRange).filter((r): r is Range => !!r)
      : [],
  };
}
function parsePlanning(row: Record<string, unknown>): Planning | null {
  const planningId = id(row.id), applianceId = id(row.idAppliance);
  if (planningId == null || applianceId == null) return null;
  return {
    id: planningId, idAppliance: applianceId,
    nameAppliance: typeof row.nameAppliance === "string" ? row.nameAppliance : undefined,
    applianceType: typeof row.applianceType === "string" ? row.applianceType : undefined,
    availableModes: Array.isArray(row.availableModes) ? row.availableModes.filter((m): m is Mode => typeof m === "string") : undefined,
    dailyprogs: Array.isArray(row.dailyprogs)
      ? row.dailyprogs.filter(isObject).map(parseDaily).filter((d): d is DailyProg => !!d)
      : [],
  };
}
export function parseProgramDetail(payload: unknown): ProgramDetail | null {
  if (!isObject(payload)) return null;
  const programId = id(payload.id);
  if (programId == null) return null;
  return {
    id: programId, name: str(payload.name, "Program " + programId), enabled: bool(payload.enabled),
    plannings: Array.isArray(payload.plannings)
      ? payload.plannings.filter(isObject).map(parsePlanning).filter((p): p is Planning => !!p)
      : [],
  };
}
export function parseProgramState(payload: unknown): ProgramState | null {
  if (!isObject(payload)) return null;
  return {
    id: id(payload.id) ?? undefined,
    programType: typeof payload.programType === "string" ? payload.programType : undefined,
    programName: typeof payload.programName === "string" ? payload.programName : undefined,
    untilFurtherNotice: optionalBool(payload.untilFurtherNotice),
    endDate: optionalString(payload.endDate),
  };
}

export function parseAutodiag(row: Record<string, unknown>): Autodiag | null {
  const applianceId = id(row.csApplianceId);
  if (applianceId == null) return null;
  const rawModulator = row.csModulatorId;
  const numericModulator = rawModulator === "" ? null : id(rawModulator);
  return {
    csApplianceId: applianceId,
    csModulatorId: numericModulator ?? (typeof rawModulator === "string" && rawModulator ? rawModulator : null),
    status: typeof row.status === "string" ? row.status : undefined,
    consumptionStatus: typeof row.consumptionStatus === "string" ? row.consumptionStatus : undefined,
    diagTestEnabled: optionalBool(row.diagTestEnabled),
    name: typeof row.name === "string" ? row.name : undefined,
  };
}
export function parseAutodiagList(payload: unknown): Autodiag[] {
  return mapArray(payload, parseAutodiag);
}

export function parseWelcome(payload: unknown): Welcome | null {
  if (!isObject(payload)) return null;
  return {
    externalTemp: numbers(payload.externalTemp),
    iconName: typeof payload.iconName === "string" ? payload.iconName : "",
    systemStatus: payload.systemStatus == null ? "" : String(payload.systemStatus),
    notificationsNumber: numbers(payload.notificationsNumber) ?? 0,
    messageTitle: typeof payload.messageTitle === "string" ? payload.messageTitle : "",
    messageText: typeof payload.messageText === "string" ? payload.messageText : "",
  };
}
export function parseRealtime(payload: unknown): Realtime | null {
  const value = firstNumber(payload);
  return value === null ? null : { value, unit: firstUnit(payload) };
}
export function parseGeoloc(payload: unknown): Geoloc | null {
  if (!isObject(payload)) return null;
  return {
    radius: numbers(payload.radius),
    activatedByUser: bool(payload.activatedByUser),
    latitude: numbers(payload.latitude),
    longitude: numbers(payload.longitude),
  };
}


function parseConsumptionPoint(value: unknown): ConsumptionPoint | null {
  if (!isObject(value)) return null;
  const temp = numbers(value.temperatureInCelsiusDegree);
  return {
    timestamp: str(value.stepTimestampOnSite),
    totalWh: Math.max(0, numbers(value.totalConsumptionInWh) ?? 0),
    totalCurrency: Math.max(0, numbers(value.totalConsumptionInCurrency) ?? 0),
    estimatedWh: Math.max(0, numbers(value.estimatedConsumptionInWh) ?? 0),
    peakWh: Math.max(0, numbers(value.peakHourConsumptionInWh) ?? 0),
    offPeakWh: Math.max(0, numbers(value.offPeakHourConsumptionInWh) ?? 0),
    temperatureC: temp == null ? null : clampNumber(temp, -50, 60),
  };
}

export function parseConsumption(payload: unknown, period: ConsumptionPeriod, anchor: string): ConsumptionSnapshot | null {
  if (!isObject(payload)) return null;
  const summary = parseConsumptionPoint(payload.summary);
  if (!summary) return null;
  const points = Array.isArray(payload.dataPoints)
    ? payload.dataPoints.map(parseConsumptionPoint).filter((p): p is ConsumptionPoint => !!p)
    : [];
  const perAppliance: Array<{ applianceId: number; totalWh: number }> = [];
  if (isObject(payload.perAppliance)) {
    for (const [key, series] of Object.entries(payload.perAppliance)) {
      const applianceId = Number(key);
      if (!Number.isFinite(applianceId) || !Array.isArray(series)) continue;
      const total = series
        .filter(isObject)
        .reduce((sum, point) => sum + Math.max(0, numbers(point.totalConsumptionInWh) ?? 0), 0);
      if (total > 0) perAppliance.push({ applianceId, totalWh: total });
    }
  }
  perAppliance.sort((a, b) => b.totalWh - a.totalWh);
  return { period, anchor, summary, points, perAppliance };
}

export function parseTemperatureSensor(payload: unknown): TemperatureSensor | null {
  if (!isObject(payload)) return null;
  return {
    hasTemperatureSensor: bool(payload.hasTemperatureSensor),
    redirectionLink: typeof payload.redirectionLink === "string" ? payload.redirectionLink : "",
  };
}
export function parseEnergyManager(payload: unknown): EnergyManager | null {
  if (!isObject(payload)) return null;
  return { hasEnergyManager: bool(payload.hasEnergyManager) };
}


export function parseSavings(payload: unknown): Savings | null {
  if (!isObject(payload)) return null;
  return {
    startDate: str(payload.startDate),
    totalKwh: (numbers(payload.energyTotalSavingsInKWh) ?? 0),
    totalCurrency: numbers(payload.energyTotalSavingsInCurrency) ?? 0,
    co2Kg: numbers(payload.co2SavingInKg) ?? 0,
    hasNoProgramming: bool(payload.hasNoPrograming),
  };
}
export function parseObjective(payload: unknown): Objective | null {
  if (!isObject(payload)) return null;
  const wh = numbers(payload.yearlyObjectiveInWh);
  const currency = numbers(payload.yearlyObjectiveInCurrency);
  return wh == null && currency == null ? null : { wh, currency };
}
export function parseRteAlerts(payload: unknown): RteAlert[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter(isObject).map(row => ({
    alertLevel: str(row.alertLevel),
    from: str(row.from),
    to: str(row.to),
  })).filter(row => row.alertLevel !== "");
}
