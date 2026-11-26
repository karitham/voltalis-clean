import { Msg } from "./messages";
import type { MessageKey } from "../i18n";
import { detailEffect, httpEffect, toastEffect } from "./effects";
import { keep, patchModal, setModal } from "./init";
import { hhmm, minutes, numbers, replaceBand } from "./format";
import { planFor, planTemperature, rangeAt, siteOf } from "./select";
import type {
  DailyProg, Effect, Model, QuickConfigRow, Range, SlotModal, UiMode, UpdateResult,
} from "./types";

export function slotModal(model: Model, day: number, hour: number): SlotModal {
  const plan = planFor(model);
  const range = rangeAt(plan, day, hour);
  return {
    kind: "slot", day, hour,
    from: range?.from ?? hhmm(hour * 60),
    to: range?.to ?? hhmm((hour + 1) * 60),
    mode: range ? (range.isOn === false ? "OFF" : ((range.mode as UiMode | undefined) ?? "ECO")) : "ECO",
    temp: range?.temperature != null ? range.temperature : planTemperature(model, plan),
    isOn: range ? range.isOn !== false : true,
  };
}

function cloneWeek(plan: NonNullable<ReturnType<typeof planFor>>): DailyProg[] {
  return (plan.dailyprogs ?? []).map(d => ({ ...d, ranges: d.ranges.map(r => ({ ...r })) }));
}

/* Never 0, always above every id already in the week. */
function nextDayId(days: readonly DailyProg[]): number {
  return days.reduce((max, d) => Math.max(max, Number(d.id) || 0), 0) + 1;
}

/** Write one slot. The whole daily plan is sent back, because that is the endpoint contract. */
export function commitSlot(model: Model, remove: boolean): UpdateResult {
  const modal = model.ui.modal;
  if (!modal || modal.kind !== "slot") return keep(model);
  const plan = planFor(model);
  if (!plan) return keep(model);

  if (!/^[0-9]{2}:[0-9]{2}$/.test(modal.from) || !/^[0-9]{2}:[0-9]{2}$/.test(modal.to)) {
    return { model, effects: [toastEffect("Enter both a start and an end time", "bad")] };
  }
  const a = minutes(modal.from), b = minutes(modal.to);
  if (b <= a) return { model, effects: [toastEffect("End time must be after start time", "bad")] };

  const days = cloneWeek(plan);
  const original = rangeAt(plan, modal.day, modal.hour);
  let target = days.find(d => d.dayNumber === modal.day);
  if (!target) {
    target = { id: nextDayId(days), dayNumber: modal.day, ranges: [] };
    days.push(target);
  }
  const next: Range | null = remove ? null : {
    from: modal.from, to: modal.to,
    mode: modal.mode === "OFF" ? (plan.availableModes?.[0] ?? "ECO") : modal.mode,
    temperature: modal.mode === "TEMPERATURE" ? numbers(modal.temp)
      : (original?.temperature != null ? original.temperature : planTemperature(model, plan)),
    isOn: modal.mode !== "OFF",
  };
  target.ranges = replaceBand(target.ranges, a, b, next);
  days.sort((x, y) => x.dayNumber - y.dayNumber);

  const site = siteOf(model);
  return {
    model,
    effects: [httpEffect(
      "PUT", "/api/site/" + site + "/programming/dailyprog", days,
      remove ? Msg.slotRemoved : Msg.slotWritten, Msg.actionFailed, site,
    )],
  };
}

/** Apply one mode to every hour of the dragged rectangle, preserving outside ranges. */
export function commitRange(model: Model): UpdateResult {
  const modal = model.ui.modal;
  if (!modal || modal.kind !== "range") return keep(model);
  const plan = planFor(model);
  if (!plan) return keep(model);

  const temp = numbers(modal.temp);
  if (modal.mode === "TEMPERATURE" && (temp === null || temp < 5 || temp > 30)) {
    return { model, effects: [toastEffect("Enter a target temperature", "bad")] };
  }

  const a = modal.hour1 * 60, b = (modal.hour2 + 1) * 60;
  const days = cloneWeek(plan);
  let freshDayId = nextDayId(days);
  const fallback = plan.availableModes?.[0] ?? "ECO";
  const mode = modal.mode === "OFF" ? fallback : modal.mode;

  for (let day = modal.day1; day <= modal.day2; day++) {
    let target = days.find(d => d.dayNumber === day);
    if (!target) {
      target = { id: freshDayId++, dayNumber: day, ranges: [] };
      days.push(target);
    }
    const was = rangeAt(plan, day, modal.hour1);
    const kept = was?.temperature != null ? was.temperature : planTemperature(model, plan);
    target.ranges = replaceBand(target.ranges, a, b, {
      from: hhmm(a), to: hhmm(b), mode,
      temperature: modal.mode === "TEMPERATURE" ? temp : kept,
      isOn: modal.mode !== "OFF",
    });
  }
  days.sort((x, y) => x.dayNumber - y.dayNumber);

  const site = siteOf(model);
  return {
    model,
    effects: [httpEffect(
      "PUT", "/api/site/" + site + "/programming/dailyprog", days,
      Msg.rangeWritten, Msg.actionFailed, site,
    )],
  };
}

export function afterSlotWrite(model: Model, text: MessageKey): UpdateResult {
  const program = model.data.programDetail;
  const effects: Effect[] = [toastEffect(text, "ok")];
  if (program?.id != null) effects.push(detailEffect(model, program.id));
  return { model: setModal(model, null), effects };
}

export function patchQuickRow(model: Model, applianceId: number, patch: Partial<QuickConfigRow>): UpdateResult {
  const modal = model.ui.modal;
  if (!modal || modal.kind !== "quickConfig") return keep(model);
  const rows = modal.rows.map(row =>
    String(row.idAppliance) === String(applianceId) ? { ...row, ...patch } : row,
  );
  return keep(patchModal(model, { rows }));
}


/** Copy one day's ranges onto other days, preserving each target day's id. */
export function commitCopyDay(model: Model): UpdateResult {
  const modal = model.ui.modal;
  if (modal?.kind !== "copyDay") return keep(model);
  const plan = planFor(model);
  if (!plan) return keep(model);
  const source = (plan.dailyprogs ?? []).find(day => day.dayNumber === modal.sourceDay);
  if (!source || !source.ranges.length) {
    return { model, effects: [toastEffect("The source day has no slots to copy", "bad")] };
  }
  const targets = modal.targets.filter(day => day !== modal.sourceDay);
  if (!targets.length) return { model, effects: [toastEffect("Choose at least one day", "bad")] };

  const days = cloneWeek(plan);
  let freshId = nextDayId(days);
  for (const dayNumber of targets) {
    let target = days.find(day => day.dayNumber === dayNumber);
    if (!target) {
      target = { id: freshId++, dayNumber, ranges: [] };
      days.push(target);
    }
    target.ranges = source.ranges.map(range => ({ ...range }));
  }
  days.sort((x, y) => x.dayNumber - y.dayNumber);
  const site = siteOf(model);
  return {
    model,
    effects: [httpEffect(
      "PUT", "/api/site/" + site + "/programming/dailyprog", days,
      Msg.copyDayWritten, Msg.actionFailed, site,
    )],
  };
}
