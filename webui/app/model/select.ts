import { CONNECTION, MODE_CLS } from "./constants";
import { humanName, minutes, numbers } from "./format";
import { t } from "../i18n";
import type {
  Appliance, ApplianceId, Autodiag, Mode, ModeClass, Model, Planning, Program, ProgramDetail,
  QuickApplianceSetting, QuickConfigRow, QuickFlag, QuickSetting, Range, SiteId,
} from "./types";

export function siteOf(model: Model): SiteId | null {
  if (model.session.siteId != null) return model.session.siteId;
  const first = model.session.sites[0];
  return first ? first.id : null;
}

export function modeOf(appliance: Appliance | null | undefined): Mode {
  return (appliance?.programming?.mode as Mode | undefined) ?? "NORMAL";
}

export function applianceById(model: Model, id: ApplianceId | null | undefined): Appliance | null {
  if (id == null) return null;
  return model.data.appliances.find(a => a.id === id) ?? null;
}

export function programById(model: Model, id: number | null | undefined): Program | null {
  if (id == null) return null;
  return model.data.programs.find(p => p.id === id) ?? null;
}

/* idManualSetting is null on real appliances; the manualsetting list is the truth. */
export function manualSettingFor(model: Model, appliance: Appliance | null): Model["data"]["manual"][number] | null {
  if (!appliance) return null;
  return model.data.manual.find(m => m.idAppliance === appliance.id) ?? null;
}

export function settingId(model: Model, appliance: Appliance | null): number | null {
  if (!appliance) return null;
  if (appliance.programming?.idManualSetting) return appliance.programming.idManualSetting;
  return manualSettingFor(model, appliance)?.id ?? null;
}

/* Every manualsetting write carries a number: seed from what the appliance already
   asks for, so a CONFORT override keeps its temperature. */
export function targetTemperatureOf(model: Model, appliance: Appliance | null): number | null {
  if (!appliance) return null;
  const setting = manualSettingFor(model, appliance);
  const p = appliance.programming ?? {};
  return numbers(setting?.temperatureTarget ?? p.temperatureTarget ?? p.defaultTemperature);
}

export function currentProgramName(model: Model): string {
  const enabled = model.data.programs.find(p => p.enabled);
  if (enabled) return humanName(enabled.name);
  return model.data.state?.programType === "QUICK" ? "Quick setting" : "No program";
}

export function planFor(model: Model): Planning | null {
  const program = model.data.programDetail;
  const plannings = program?.plannings ?? [];
  if (!plannings.length) return null;
  const selected = model.ui.selectedApplianceId;
  return plannings.find(pl => pl.idAppliance === selected) ?? plannings[0] ?? null;
}

/* The API ends a day with 23:59 (not 24:00); both cover the 23:00 cell. */
export function endMinutes(range: Range | null | undefined): number {
  const m = minutes(range?.to);
  return m >= 1439 ? 1440 : m;
}
export function startHour(range: Range | null | undefined): number { return Math.floor(minutes(range?.from) / 60); }
export function endHour(range: Range | null | undefined): number { return Math.min(24, Math.ceil(endMinutes(range) / 60)); }

/* A range covers every hour it overlaps; the last one wins, matching hoursGrid. */
export function rangeAt(plan: Planning | null, day: number, hour: number): Range | null {
  if (!plan) return null;
  const daily = plan.dailyprogs?.find(d => d.dayNumber === day);
  if (!daily) return null;
  let hit: Range | null = null;
  for (const r of daily.ranges) {
    if (startHour(r) <= hour && endHour(r) > hour) hit = r;
  }
  return hit;
}

export function hoursGrid(dayRanges: readonly Range[] | null | undefined): Array<ModeClass | "off" | ""> {
  const cells: Range[][] = Array.from({ length: 24 }, () => []);
  for (const r of dayRanges ?? []) {
    for (let h = startHour(r); h < endHour(r); h++) {
      if (cells[h]) cells[h].push(r);
    }
  }
  return cells.map(list => {
    if (!list.length) return "";
    const last = list[list.length - 1];
    return last.isOn === false ? "off" : (MODE_CLS[last.mode as Mode] ?? "off");
  });
}

export function diagOf(model: Model, id: ApplianceId): Autodiag | null {
  return model.data.autodiag.find(d => String(d.csApplianceId) === String(id)) ?? null;
}

export interface Connection { text: string; tone: string; consumption: string }
export function connectionOf(model: Model, appliance: Appliance): Connection {
  const diag = diagOf(model, appliance.id);
  const known = diag?.status ? CONNECTION[diag.status] : undefined;
  return {
    text: t(known?.text ?? "Status unknown"),
    tone: known?.tone ?? "unknown",
    consumption: diag?.consumptionStatus != null ? String(diag.consumptionStatus) : "",
  };
}

export function isFault(model: Model, appliance: Appliance): boolean {
  const diag = diagOf(model, appliance.id);
  return !!diag && (diag.status === "NOK" || diag.status === "COMM_ERROR");
}

export function heatingLevelOf(appliance: Appliance): number | null {
  return numbers(appliance.heatingLevel ?? appliance.programming?.heatingLevel);
}
export function isHeating(appliance: Appliance): boolean {
  if (appliance.programming?.isOn === false) return false;
  const level = heatingLevelOf(appliance);
  return level == null ? true : level > 0;
}

/* The backend owns quick-setting exclusivity; its flag list is the truth. */
export function mergeQuickFlags(model: Model, flags: readonly QuickFlag[]): Model {
  if (!flags.length || !model.data.quick.length) return model;
  const byId = new Map(flags.map(f => [String(f.id), f.enabled]));
  const complete = flags.length === model.data.quick.length;
  return {
    ...model,
    data: {
      ...model.data,
      quick: model.data.quick.map(q => {
        const known = byId.get(String(q.id));
        return { ...q, enabled: known !== undefined ? known : (complete ? false : q.enabled) };
      }),
    },
  };
}

/* Seed a quick preset from its stored appliance rows, or from the live appliances. */
export function quickConfigRows(model: Model, quick: QuickSetting): QuickConfigRow[] {
  const stored = quick.appliancesSettings ?? [];
  const source: QuickApplianceSetting[] = stored.length
    ? stored
    : model.data.appliances.map(a => ({
        idAppliance: a.id,
        isOn: a.programming?.isOn !== false,
        mode: modeOf(a),
        temperatureTarget: targetTemperatureOf(model, a),
      }));
  return source
    .filter(s => s.idAppliance != null)
    .map(s => {
      const appliance = applianceById(model, s.idAppliance);
      return {
        idAppliance: s.idAppliance,
        name: s.applianceName ?? appliance?.name ?? t("Appliance {n}", { n: s.idAppliance }),
        isOn: s.isOn !== false,
        mode: s.mode ?? (appliance ? modeOf(appliance) : "ECO"),
        temperatureTarget: numbers(s.temperatureTarget),
      };
    });
}

export function planTemperature(model: Model, plan: Planning | null): number {
  const appliance = plan ? applianceById(model, plan.idAppliance) : null;
  return targetTemperatureOf(model, appliance) ?? 18;
}

export function programDetailOf(model: Model): ProgramDetail | null { return model.data.programDetail; }
