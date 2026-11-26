import { For, Show, createMemo, createSignal, onSettled } from "solid-js";
import {
  DAYS, MODE_LABEL, Msg, applianceById, hoursGrid, humanName, humanWords, hhmmLabel,
  inRect, pad2, planFor, rangeAt, selRect, titleCaseName,
} from "../core";
import type { Mode } from "../model/types";
import type { ViewProps } from "../types";
import { Button } from "./common";
import { t } from "../i18n";
import type { MessageKey } from "../i18n";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const LEGEND: ReadonlyArray<{ cls: string; label: MessageKey }> = [
  { cls: "confort", label: "Comfort" },
  { cls: "eco", label: "Eco" },
  { cls: "frost", label: "Frost protection" },
  { cls: "temp", label: "Temperature" },
  { cls: "off", label: "Off" },
];

const GRID_ID = "plan-grid";

export default function Schedule(props: ViewProps) {
  /* Drag state is the only local state: the anchor itself lives in the model, and
     every pointer step is a message. */
  let dragging = false;
  const [narrow, setNarrow] = createSignal(
    typeof window !== "undefined" && window.matchMedia("(max-width: 620px)").matches,
  );
  const [mobileDay, setMobileDay] = createSignal(new Date().getDay() === 0 ? 7 : new Date().getDay());
  const now = new Date();
  const today = now.getDay() === 0 ? 7 : now.getDay();
  const currentHour = now.getHours();

  const program = () => props.model.data.programDetail;
  const plannings = () => {
    const detail = program();
    return detail && Array.isArray(detail.plannings) ? detail.plannings : [];
  };
  const plan = () => planFor(props.model);
  const selectedName = () => applianceById(props.model, props.model.ui.selectedApplianceId)?.name || "";
  const planId = () => {
    const current = plan();
    return current ? current.id : null;
  };

  const start = (day: number, hour: number) => props.dispatch(Msg.selectStarted(day, hour));
  const extend = (day: number, hour: number) => props.dispatch(Msg.selectExtended(day, hour));
  const commit = () => props.dispatch(Msg.selectCommitted());
  const cancel = () => props.dispatch(Msg.selectCancelled());

  /* A drag can end anywhere, so the release is watched on the window instead of on
     the cell that started it; Escape drops a live selection. */
  onSettled(() => {
    const query = window.matchMedia("(max-width: 620px)");
    const onQuery = () => setNarrow(query.matches);
    query.addEventListener("change", onQuery);
    const release = () => {
      if (!dragging) return;
      dragging = false;
      commit();
    };
    const abort = () => {
      if (!dragging) return;
      dragging = false;
      cancel();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") abort();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", abort);
    window.addEventListener("keydown", onKey);
    return () => {
      query.removeEventListener("change", onQuery);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", abort);
      window.removeEventListener("keydown", onKey);
    };
  });

  const onDown = (e: PointerEvent, day: number, hour: number) => {
    if (e.button !== 0 || !e.isPrimary) return;
    dragging = true;
    start(day, hour);
  };

  const onEnter = (day: number, hour: number) => {
    if (dragging) extend(day, hour);
  };

  /* A pointer click is already committed on release; a click with detail 0 is the
     keyboard's Enter/Space, which has no pointer path of its own. */
  const onClick = (e: MouseEvent, day: number, hour: number) => {
    if (e.detail !== 0) return;
    start(day, hour);
    commit();
  };

  const rangesOf = (day: number) => {
    const current = plan();
    const daily = current
      ? (current.dailyprogs || []).find((d: any) => d.dayNumber === day)
      : null;
    return daily && Array.isArray(daily.ranges) ? daily.ranges : [];
  };

  const modeText = (day: number, hour: number) => {
    const range = rangeAt(plan(), day, hour);
    if (!range) return t("Not set");
    if (range.isOn === false) return t("Off");
    const mode = range.mode ?? "";
    return t(MODE_LABEL[mode as Mode] || humanWords(mode));
  };

  const slotLabel = (day: number, hour: number) => {
    const to = hhmmLabel((hour + 1) * 60);
    return t(DAYS[day - 1]) + " " + pad2(hour) + ":00–" + to + " · " + modeText(day, hour);
  };

  const slotTitle = (day: number, hour: number) => {
    const to = hhmmLabel((hour + 1) * 60);
    return pad2(hour) + ":00–" + to + " · " + modeText(day, hour);
  };

  const applianceName = (pl: any) => {
    const appliance = applianceById(props.model, pl.idAppliance);
    return titleCaseName((appliance && appliance.name) || pl.nameAppliance) || t("Unnamed appliance");
  };
  const selectedHasPlan = () =>
    plannings().some(pl => pl.idAppliance === props.model.ui.selectedApplianceId);

  return (
    <section class="section schedule-section" id="schedule" aria-labelledby="schedule-title">
      <div class="section-head">
        <h2 class="section-title" id="schedule-title">{t("Schedule")}</h2>
        <Show when={program()}>
          {detail => (
            <span class="section-note">
              {plan() ? applianceName(plan()) + " · " : ""}{humanName(detail().name)}
            </span>
          )}
        </Show>
        <div class="section-actions">
          <Show when={plan()}>
            <Button
              variant="quiet"
              title={t("Copy one day's slots onto other days")}
              onClick={() => props.dispatch(Msg.copyDayOpened())}
            >{t("Copy day")}</Button>
            <Button
              variant="quiet"
              title={t("Copy this appliance's plan to other appliances")}
              onClick={() => props.dispatch(Msg.copyPlanOpened())}
            >{t("Copy to…")}</Button>
          </Show>
        </div>
      </div>

      <Show when={selectedName() && plan() && !selectedHasPlan()}>
        <p class="schedule-warning">
          {t("No weekly plan for {name}; showing {plan}'s week.", { name: titleCaseName(selectedName()), plan: plan() ? applianceName(plan()) : t("another appliance") })}
        </p>
      </Show>

      <Show
        when={plan()}
        fallback={<p class="empty">{t("No weekly plan to show. Choose a program to see its week.")}</p>}
      >
        <div class="schedule-tabs" role="tablist" aria-label={t("Appliances in this program")}>
          <For each={plannings()}>
            {pl => (
              <button
                type="button"
                role="tab"
                id={"plan-tab-" + pl.id}
                aria-controls={GRID_ID}
                aria-selected={pl.id === planId() ? "true" : "false"}
                class={pl.id === planId() ? "tab tab-active" : "tab"}
                data-plan={pl.id}
                onClick={() => props.dispatch(Msg.planTabSelected(pl.id))}
              >{applianceName(pl)}</button>
            )}
          </For>
        </div>

        <Show
          when={!narrow()}
          fallback={
            <div
              class="mobile-week"
              id={GRID_ID}
              role="tabpanel"
              aria-labelledby={planId() != null ? "plan-tab-" + planId() : undefined}
            >
              <div class="mobile-days" role="tablist" aria-label={t("Day")}>
                <For each={DAYS}>
                  {(dayName, index) => (
                    <button
                      type="button"
                      role="tab"
                      class={mobileDay() === index() + 1 ? "mobile-day mobile-day-active" : "mobile-day"}
                      aria-selected={mobileDay() === index() + 1 ? "true" : "false"}
                      onClick={() => setMobileDay(index() + 1)}
                    >{t(dayName)}</button>
                  )}
                </For>
              </div>
              <div class="mobile-hours" role="group" aria-label={t("Week: {day}", { day: t(DAYS[mobileDay() - 1]) })}>
                <For each={[0, 8, 16]}>
                  {start => (
                    <>
                      <div class="mobile-hour-label" aria-hidden="true">{pad2(start)}</div>
                      <For each={Array.from({ length: 8 }, (_, offset) => start + offset)}>
                        {hour => {
                          const day = () => mobileDay();
                          const modes = createMemo(() => hoursGrid(rangesOf(day())));
                          return (
                            <button
                              type="button"
                              class={["cell", "mobile-cell", modes()[hour], {
                                "cell-selecting": inRect(selRect(props.model.ui.sel), day(), hour),
                                "cell-now": day() === today && hour === currentHour,
                              }]}
                              data-slot={day() + ":" + hour}
                              aria-label={slotLabel(day(), hour)}
                              title={slotTitle(day(), hour)}
                              onPointerDown={e => onDown(e, day(), hour)}
                              onPointerEnter={() => onEnter(day(), hour)}
                              onClick={e => onClick(e, day(), hour)}
                            >
                              <span class="mobile-cell-hour">{pad2(hour)}</span>
                            </button>
                          );
                        }}
                      </For>
                    </>
                  )}
                </For>
              </div>
            </div>
          }
        >
          <div
            class="week-scroll"
            id={GRID_ID}
            role="tabpanel"
            aria-labelledby={planId() != null ? "plan-tab-" + planId() : undefined}
          >
            <div class="week" role="group" aria-label={t("Week: hours across, days down")}>
              <div class="week-corner" aria-hidden="true" />
              <For each={HOURS}>
                {hour => (
                  <div
                    class={["week-hour", hour % 6 === 0 && "week-hour-major"].filter(Boolean).join(" ")}
                    aria-hidden="true"
                  >{hour % 3 === 0 ? pad2(hour) : ""}</div>
                )}
              </For>
              <For each={DAYS}>
                {(dayName, index) => {
                  const day = () => index() + 1;
                  const modes = createMemo(() => hoursGrid(rangesOf(day())));
                  return (
                    <>
                      <div class={day() === today ? "week-day week-day-now" : "week-day"} aria-hidden="true">{t(dayName)}</div>
                      <For each={HOURS}>
                        {hour => (
                          <button
                            type="button"
                            class={["cell", modes()[hour], {
                              "cell-selecting": inRect(selRect(props.model.ui.sel), day(), hour),
                              "cell-major": hour % 6 === 0,
                              "cell-now": day() === today && hour === currentHour,
                            }]}
                            data-slot={day() + ":" + hour}
                            aria-label={slotLabel(day(), hour)}
                            title={slotTitle(day(), hour)}
                            onPointerDown={e => onDown(e, day(), hour)}
                            onPointerEnter={() => onEnter(day(), hour)}
                            onClick={e => onClick(e, day(), hour)}
                          />
                        )}
                      </For>
                    </>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>

        <div class="legend">
          <For each={LEGEND}>
            {entry => (
              <span class="legend-item">
                <span class={["swatch", entry.cls].join(" ")} aria-hidden="true" />
                {t(entry.label)}
              </span>
            )}
          </For>
        </div>

        <div class="hint">
          {t("Click a cell to change one hour; drag to change several. Each room follows its own schedule.")}
          <details class="info-inline">
            <summary aria-label={t("Schedule details")} title={t("Schedule details")}>i</summary>
            <span>{t("Select a cell to edit one hour, or drag across cells to set a whole block. A day ends at 23:59, and every change writes the appliance's whole daily plan.")}</span>
          </details>
        </div>
      </Show>
    </section>
  );
}
