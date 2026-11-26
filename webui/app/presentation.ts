/* Presentation helpers: model -> small view facts. Pure, so they are easy to test. */
import { isFault, isHeating } from "./model/select";
import { t } from "./i18n";
import type { MessageKey } from "./i18n";
import type { Appliance, DeviceFilter, Model } from "./model/types";

export const DEVICE_FILTERS: ReadonlyArray<{ v: DeviceFilter; label: MessageKey }> = [
  { v: "all", label: "All" },
  { v: "on", label: "Heating" },
  { v: "off", label: "Off" },
  { v: "fault", label: "Faults" },
];

export function statusOf(model: Model) {
  if (model.session.kind === "demo") return { text: t("demo data"), dot: "demo" };
  if (model.ui.page === "dashboard") return { text: t("connected"), dot: "on" };
  if (model.ui.busy) return { text: t("connecting…"), dot: "" };
  return { text: t("not connected"), dot: "" };
}

export function deviceFilterOf(model: Model): DeviceFilter {
  const filter = model.ui.deviceFilter;
  return filter === "on" || filter === "off" || filter === "fault" ? filter : "all";
}

export function matchesFilter(model: Model, appliance: Appliance, filter: DeviceFilter): boolean {
  if (filter === "on") return isHeating(appliance);
  if (filter === "off") return (appliance.programming || {}).isOn === false;
  if (filter === "fault") return isFault(model, appliance);
  return true;
}

export function visibleDevices(model: Model): Appliance[] {
  const filter = deviceFilterOf(model);
  return model.data.appliances.filter(a => matchesFilter(model, a, filter));
}

export function deviceCounts(model: Model) {
  const counts = { all: 0, on: 0, off: 0, manual: 0, program: 0, fault: 0 };
  model.data.appliances.forEach(a => {
    const p = a.programming || {};
    counts.all += 1;
    if (p.isOn === false) counts.off += 1;
    if (isHeating(a)) counts.on += 1;
    if (p.progType === "MANUAL") counts.manual += 1;
    if (p.progType && p.progType !== "MANUAL") counts.program += 1;
    if (isFault(model, a)) counts.fault += 1;
  });
  return counts;
}

export function deviceCountText(model: Model) {
  const total = model.data.appliances.length;
  const shown = visibleDevices(model).length;
  return shown === total
    ? t("{n} appliances", { n: total })
    : t("{shown} of {total} appliances", { shown, total });
}
