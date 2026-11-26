/* Radiators and loads: one list, one row per appliance. A row is a click target for
   selection; its buttons act on the appliance and never select it. */
import { For, Show } from "solid-js";
import {
  MODE_CLS,
  MODE_LABEL,
  Msg,
  asArray,
  connectionOf,
  fmtTemp,
  heatingLevelOf,
  humanName,
  manualSettingFor,
  modeOf,
  targetTemperatureOf,
  titleCaseName,
  typeOf,
  untilLabel,
} from "../core";
import {
  DEVICE_FILTERS,
  deviceCountText,
  deviceCounts,
  deviceFilterOf,
  visibleDevices,
} from "../presentation";
import type { Model, ViewProps } from "../types";
import { Button, Temperature } from "./common";
import { t } from "../i18n";

interface Fact {
  value?: string;
  label?: string;
  title?: string;
}

function isOff(appliance: any): boolean {
  return (appliance.programming || {}).isOn === false;
}

function modeLabel(appliance: any): string {
  const mode = modeOf(appliance);
  return t(MODE_LABEL[mode] || mode);
}

function modeClass(appliance: any): string {
  return MODE_CLS[modeOf(appliance)] || "off";
}

/* The source of the current setting, in the same words the models use. */
function sourceOf(appliance: any): string {
  const progType = (appliance.programming || {}).progType;
  if (progType === "MANUAL") return t("Manual override");
  if (progType === "QUICK") return t("Quick setting");
  if (progType === "USER") return t("Weekly program");
  return t("Default program");
}

function metaOf(appliance: any): string {
  const p = appliance.programming || {};
  const parts = [sourceOf(appliance)];
  if (p.progName) parts.push(humanName(p.progName));
  return parts.join(" · ");
}

/* Hardware and protocol details: available on demand, never in the first read. */
function technicalFactsOf(model: Model, appliance: any): Fact[] {
  const facts: Fact[] = [];
  const level = heatingLevelOf(appliance);
  if (level != null) {
    facts.push(level > 0
      ? { value: t("Heating level {n}", { n: level }), title: t("Stage reported by the appliance; 0 is idle") }
      : { value: t("Idle"), title: t("The appliance reports no heating output") });
  }
  facts.push({ label: typeOf(appliance) });
  const connection = connectionOf(model, appliance);
  facts.push({
    label: connection.text,
    title: connection.consumption ? t("Consumption: {value}", { value: connection.consumption }) : undefined,
  });
  return facts;
}

export default function Devices(props: ViewProps) {
  const appliances = () => asArray(props.model.data.appliances);
  const counts = () => deviceCounts(props.model);
  const shown = () => visibleDevices(props.model);
  const filter = () => deviceFilterOf(props.model);

  const selected = (appliance: any) => appliance.id === props.model.ui.selectedApplianceId;

  const rowClass = (appliance: any) =>
    ["device", selected(appliance) && "device-selected", isOff(appliance) && "device-off"]
      .filter(Boolean)
      .join(" ");

  const open = (appliance: any) => props.dispatch(Msg.applianceSelected(appliance.id));

  /* A click anywhere in the row selects it, except on a button, which has its own action. */
  const clicked = (event: MouseEvent, appliance: any) => {
    if ((event.target as HTMLElement).closest("button, summary")) return;
    open(appliance);
  };

  const pressed = (event: KeyboardEvent, appliance: any) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if ((event.target as HTMLElement).closest("button, summary")) return;
    event.preventDefault();
    open(appliance);
  };

  const targetOf = (appliance: any) => targetTemperatureOf(props.model, appliance);
  const targetLabel = (appliance: any) => {
    const p = appliance.programming || {};
    const setting = manualSettingFor(props.model, appliance);
    const manualOn = !!setting && setting.enabled === true && setting.temperatureTarget != null;
    const isTarget = p.temperatureTarget != null || manualOn || p.defaultTemperature == null;
    return isTarget ? t("target") : t("default");
  };

  return (
    <section class="section devices-section" aria-labelledby="devices-title">
      <header class="section-head">
        <h2 class="section-title" id="devices-title">{t("Radiators & loads")}</h2>
        <span class="section-note">{deviceCountText(props.model)}</span>
        <Show when={appliances().length}>
          <div class="section-actions bulk-actions">
            <Button variant="danger" onClick={() => props.dispatch(Msg.bulkOpened("off"))}>{t("Stop all heating")}</Button>
            <Button variant="primary" onClick={() => props.dispatch(Msg.bulkOpened("resume"))}>{t("Resume all schedules")}</Button>
          </div>
        </Show>
      </header>

      <Show when={counts().all}>
        <div class="filters" role="group" aria-label={t("Filter appliances")}>
          <For each={DEVICE_FILTERS}>
            {option => (
              <button
                type="button"
                class={option.v === filter() ? "filter filter-active" : "filter"}
                aria-pressed={option.v === filter() ? "true" : "false"}
                onClick={() => props.dispatch(Msg.deviceFilterChanged(option.v))}
              >
                {t(option.label)} <b class="tabular">{counts()[option.v]}</b>
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show
        when={appliances().length}
        fallback={<p class="empty">{t("No appliances found on this site.")}</p>}
      >
        <Show
          when={shown().length}
          fallback={<p class="empty">{t("No appliances match this filter — choose All to see them.")}</p>}
        >
          <div class="device-list">
            <For each={shown()}>
              {appliance => (
                <article
                  class={rowClass(appliance)}
                  tabindex="0"
                  role="button"
                  aria-label={t("Select {name}", { name: titleCaseName(appliance.name) || t("this appliance") }) + (isOff(appliance) ? t(" (off)") : "")}
                  aria-pressed={selected(appliance) ? "true" : "false"}
                  onClick={event => clicked(event, appliance)}
                  onKeyDown={event => pressed(event, appliance)}
                >
                  <div class="device-main">
                    <div class="device-head">
                      <h3 class="device-name">{titleCaseName(appliance.name) || t("Unnamed appliance")}</h3>
                      <span class={"device-mode " + modeClass(appliance)}>
                        {modeLabel(appliance)}{isOff(appliance) ? " · " + t("Off") : ""}
                      </span>
                      <button
                        type="button"
                        class="icon-btn device-rename"
                        aria-label={t("Rename {name}", { name: titleCaseName(appliance.name) || t("this appliance") })}
                        title={t("Rename appliance")}
                        onClick={() => props.dispatch(Msg.applianceRenameOpened(appliance.id))}
                      >✎</button>
                    </div>
                    <p class="device-meta">{metaOf(appliance)}</p>
                    <div class="device-readout">
                      <Show
                        when={targetOf(appliance) != null}
                        fallback={<span class="device-temp device-temp-empty">—</span>}
                      >
                        <span class="device-temp"><Temperature value={fmtTemp(targetOf(appliance))} /></span>
                      </Show>
                      <Show when={targetOf(appliance) != null}>
                        <span class="device-target-label">{targetLabel(appliance)}</span>
                      </Show>
                    </div>
                    <Show when={untilLabel((appliance.programming || {}))}>
                      {until => <p class="device-until">{until()}</p>}
                    </Show>
                    <details class="device-details">
                      <summary>{t("Technical details")}</summary>
                      <div class="device-facts">
                        <For each={technicalFactsOf(props.model, appliance)}>
                          {fact => (
                            <span class="fact" title={fact.title}>
                              <Show when={fact.value}>
                                <span class="fact-value">{fact.value}</span>
                              </Show>
                              {fact.label ? " " + fact.label : ""}
                            </span>
                          )}
                        </For>
                      </div>
                    </details>
                  </div>
                  <div class="device-actions">
                    <Button
                      variant="primary"
                      title={t("Set this room's heating by hand for a while; its schedule resumes afterwards.")}
                      onClick={() => props.dispatch(Msg.overrideOpened(appliance.id))}
                    >
                      {t("Adjust heating")}
                    </Button>
                    <Show when={(appliance.programming || {}).progType === "MANUAL"}>
                      <Button
                        variant="secondary"
                        title={t("Return this appliance to its program")}
                        onClick={() => props.dispatch(Msg.autoRequested(appliance.id, Date.now()))}
                      >
                        {t("Use schedule")}
                      </Button>
                    </Show>
                    <Button
                      variant="quiet"
                      title={t("Diagnostics and self-test")}
                      onClick={() => props.dispatch(Msg.diagOpened(appliance.id))}
                    >
                      {t("View details")}
                    </Button>
                  </div>
                </article>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  );
}
