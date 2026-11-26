/* Consumption for one day, week, month or year. Plain SVG, no chart library. */
import { For, Show, createEffect } from "solid-js";
import { Msg, applianceById, clampNumber, consumptionPeriodLabel, fmtKwh, fmtMoney, fmtNumber, fmtTemp, titleCaseName } from "../core";
import { localeCode, t } from "../i18n";
import type { MessageKey } from "../i18n";
import type { ConsumptionPeriod, ConsumptionPoint } from "../model/types";
import type { ViewProps } from "../types";

const PERIODS: ReadonlyArray<{ v: ConsumptionPeriod; label: MessageKey }> = [
  { v: "day", label: "Day" },
  { v: "week", label: "Week" },
  { v: "month", label: "Month" },
  { v: "year", label: "Year" },
];

function shortDate(iso: string): string {
  const day = new Date(iso.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(day.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat(localeCode(), { day: "numeric", month: "short" }).format(day);
}

function pointLabel(point: ConsumptionPoint, period: ConsumptionPeriod): string {
  if (period === "year") return point.timestamp.slice(5, 7);
  if (period === "month") return point.timestamp.slice(8, 10);
  if (period === "day") return point.timestamp.slice(11, 16);
  return point.timestamp.slice(5, 10);
}

export default function Energy(props: ViewProps) {
  const energy = () => props.model.ui.energy;
  const snapshot = () => energy().snapshot;

  /* Initial dashboard load and every site switch: request the current period once
     the model has no coordinates for it. */
  createEffect(
    () => ({
      site: props.model.session.siteId,
      period: props.model.ui.energy.period,
      anchor: props.model.ui.energy.anchor,
      loading: props.model.ui.energy.loading,
    }),
    state => {
      if (state.site != null && !state.anchor && !state.loading) {
        props.dispatch(Msg.energyRequested(state.period, Date.now()));
      }
    },
  );

  const choose = (period: ConsumptionPeriod) => props.dispatch(Msg.energyRequested(period, Date.now()));
  const shift = (delta: number) => props.dispatch(Msg.energyShifted(delta, Date.now()));

  const savings = () => props.model.data.savings;
  const savingsStart = () => savings()?.startDate ? shortDate(savings()!.startDate) : "";
  const readings = () => {
    const points = snapshot()?.points ?? [];
    return points.filter(point => point.totalWh > 0);
  };
  const firstReading = () => readings()[0] ?? null;
  /* A partial month starts on its first active day, not on the 1st. */
  const chartPoints = () => {
    const all = snapshot()?.points ?? [];
    const first = all.findIndex(point => point.totalWh > 0);
    return first > 0 ? all.slice(first) : all;
  };
  const coverage = () => {
    const points = snapshot()?.points ?? [];
    const active = readings().length;
    if (!active || active === points.length) return "";
    return active === 1
      ? t("{n} day with data", { n: active })
      : t("{n} days with data", { n: active });
  };

  const kwhTicks = () => {
    const max = chart().max / 1000;
    return [1, 0.5, 0].map(fraction => ({
      label: fmtNumber(max * fraction, max * fraction < 100 ? 1 : 0) + (fraction === 1 ? " kWh" : ""),
      top: (1 - fraction) * 100,
    }));
  };

  const chart = () => {
    const points = chartPoints();
    const width = 640, height = 180, gap = 3;
    const barWidth = points.length ? Math.max(2, (width - gap * (points.length - 1)) / points.length) : 0;
    const rest = points.slice(1);
    const restMax = Math.max(1, ...rest.map(point => Math.max(point.totalWh, point.peakWh + point.offPeakWh)));
    const rawMax = Math.max(1, ...points.map(point => Math.max(point.totalWh, point.peakWh + point.offPeakWh)));
    /* A first point carrying a catch-up can dwarf the real days; cap it. */
    const capped = points.length > 1 && points[0].totalWh > restMax * 2.5;
    const max = capped ? restMax : rawMax;
    const temps = points.map(point => point.temperatureC).filter((value): value is number => value != null);
    const tempMin = temps.length ? Math.min(...temps) : 0;
    const tempMax = temps.length ? Math.max(...temps) : 1;
    const tempY = (value: number) => height - 10 - ((value - tempMin) / Math.max(1, tempMax - tempMin)) * (height - 30);
    const line = points.map((point, index) => {
      if (point.temperatureC == null) return null;
      return (index * (barWidth + gap) + barWidth / 2) + "," + tempY(point.temperatureC);
    }).filter((value): value is string => value != null).join(" ");
    const tempTicks = temps.length
      ? [
          { label: Math.round(tempMax) + "°", top: (10 / height) * 100 },
          { label: Math.round((tempMin + tempMax) / 2) + "°", top: ((10 + height - 20) / 2 / height) * 100 },
          { label: Math.round(tempMin) + "°", top: ((height - 20) / height) * 100 },
        ]
      : [];
    return { points, width, height, gap, barWidth, max, capped, tempMin, tempMax, tempY, line, tempTicks };
  };

  return (
    <section class="section section-recessed energy" aria-labelledby="energy-title">
      <div class="section-head">
        <h2 class="section-title" id="energy-title">{t("Energy")}</h2>
        <div class="section-actions">
          <div class="energy-periods" role="tablist" aria-label={t("Consumption period")}>
            <For each={PERIODS}>
              {period => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={period.v === energy().period ? "true" : "false"}
                  class={period.v === energy().period ? "tab tab-active" : "tab"}
                  onClick={() => choose(period.v)}
                >{t(period.label)}</button>
              )}
            </For>
          </div>
          <button type="button" class="icon-btn" aria-label={t("Previous period")} title={t("Previous period")} onClick={() => shift(-1)}>‹</button>
          <button type="button" class="icon-btn" aria-label={t("Next period")} title={t("Next period")} onClick={() => shift(1)}>›</button>
        </div>
      </div>

      <Show
        when={snapshot()}
        fallback={
          <Show when={energy().loading} fallback={<p class="empty">{t(energy().error ?? "No consumption data yet.")}</p>}>
            <p class="empty">{t("Loading consumption…")}</p>
          </Show>
        }
      >
        {data => (
          <>
            <p class="energy-anchor">
              {consumptionPeriodLabel(data().period, data().anchor)}
              <Show when={coverage()}><span class="energy-coverage"> · {coverage()}</span></Show>
            </p>
            <Show when={firstReading() && readings().length < data().points.length}>
              <div class="energy-note">
                {t("Data starts {date}. Earlier days were not tracked.", { date: shortDate(firstReading()?.timestamp ?? "") })}
                <details class="info-inline">
                  <summary aria-label={t("Consumption details")} title={t("Consumption details")}>i</summary>
                  <span>{t("Earlier periods have no consumption data; the first point can include a catch-up from before the connection was active.")}</span>
                </details>
              </div>
            </Show>
            <details class="energy-table-panel">
              <summary>
                <span class="energy-table-title">{t("Used vs saved")}</span>
                <span class="energy-table-preview">
                  <span><b>{fmtKwh(data().summary.totalWh)}</b> {t("used")}</span>
                  <span class="is-saved">
                    <b>{savings() ? fmtKwh(savings()!.totalKwh * 1000) : "—"}</b> {t("saved")}
                  </span>
                </span>
                <span class="energy-disclosure" aria-hidden="true">+</span>
              </summary>
              <div class="energy-table-body">
                <div class="energy-compare">
                  <span aria-hidden="true" />
                  <span class="energy-compare-head">{t("used")}</span>
                  <span class="energy-compare-head is-saved">
                    {t("saved")}
                    <Show when={savingsStart()}><small>{t("since {date}", { date: savingsStart() })}</small></Show>
                  </span>

                  <span class="energy-compare-label">{t("Energy")}</span>
                  <span class="energy-compare-value is-used">{fmtKwh(data().summary.totalWh)}</span>
                  <span class="energy-compare-value is-saved">
                    {savings() ? fmtKwh(savings()!.totalKwh * 1000) : "—"}
                  </span>

                  <span class="energy-compare-label">{t("Cost")}</span>
                  <span class="energy-compare-value is-used">{fmtMoney(data().summary.totalCurrency)}</span>
                  <span class="energy-compare-value is-saved">
                    {savings() ? fmtMoney(savings()!.totalCurrency) : "—"}
                  </span>

                  <span class="energy-compare-label">{t("CO₂")}</span>
                  <span class="energy-compare-value is-used">—</span>
                  <span class="energy-compare-value is-saved">
                    {savings() ? fmtNumber(savings()!.co2Kg, 0) + " kg" : "—"}
                  </span>
                </div>
                <Show when={savingsStart()}>
                  <p class="energy-basis">
                    {t("Used covers {period}; saved is cumulative since {date}.", {
                      period: consumptionPeriodLabel(data().period, data().anchor),
                      date: savingsStart(),
                    })}
                  </p>
                </Show>
              </div>
            </details>

            <dl class="energy-context">
              <Show when={data().summary.estimatedWh > 0}>
                <div>
                  <dt>{t("estimated")}</dt>
                  <dd>{fmtKwh(data().summary.estimatedWh)}</dd>
                </div>
              </Show>
              <Show when={data().summary.temperatureC != null}>
                <div>
                  <dt>{t("average outside")}</dt>
                  <dd>{fmtTemp(clampNumber(data().summary.temperatureC ?? 0, -50, 60))}</dd>
                </div>
              </Show>
              <Show when={props.model.data.objective?.currency != null || props.model.data.objective?.wh != null}>
                <div>
                  <dt>{t("Annual objective:")}</dt>
                  <dd>
                    {props.model.data.objective?.currency != null ? fmtMoney(props.model.data.objective.currency) : ""}
                    <Show when={props.model.data.objective?.wh != null}>
                      <span class="muted"> · {fmtKwh(props.model.data.objective!.wh!)}</span>
                    </Show>
                  </dd>
                </div>
              </Show>
            </dl>

            <Show when={data().perAppliance.length}>
              <div class="energy-appliances">
                <span class="energy-appliances-label">{t("By appliance")}</span>
                <For each={data().perAppliance.slice(0, 4)}>
                  {row => (
                    <span class="energy-appliance">
                      {titleCaseName(applianceById(props.model, row.applianceId)?.name) || t("Unnamed appliance")}
                      <b>{fmtKwh(row.totalWh)}</b>
                    </span>
                  )}
                </For>
              </div>
            </Show>

            <Show when={data().points.length} fallback={<p class="empty">{t("This period has no detail points.")}</p>}>
              <div class="energy-legend">
                <span class="legend-item" title={t("Peak hours are when electricity is most in demand, so they cost the most; off-peak hours are cheaper, usually overnight.")}><i class="swatch energy-swatch-peak" /> {t("Peak hours")}</span>
                <span class="legend-item" title={t("Peak hours are when electricity is most in demand, so they cost the most; off-peak hours are cheaper, usually overnight.")}><i class="swatch energy-swatch-offpeak" /> {t("Off-peak hours")}</span>
                <Show when={chart().line}><span class="legend-item"><i class="swatch energy-swatch-temp" /> {t("Outside temperature")}</span></Show>
              </div>
              <div class="energy-chart">
                <div class="energy-plot">
                  <div class="energy-kwh-axis" aria-hidden="true">
                    <For each={kwhTicks()}>
                      {tick => <span style={{ top: tick.top + "%" }}>{tick.label}</span>}
                    </For>
                  </div>
                  <div class="energy-plot-main">
                <svg
                  viewBox={"0 0 " + chart().width + " " + chart().height}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={t("Consumption chart for {date}", { date: consumptionPeriodLabel(data().period, data().anchor) })}
                >
                  <For each={chart().points}>
                    {(point, index) => {
                      const total = () => Math.max(2, (Math.min(point.totalWh, chart().max) / chart().max) * (chart().height - 18));
                      const peak = () => (Math.min(point.peakWh, point.totalWh, chart().max) / chart().max) * (chart().height - 18);
                      const offPeak = () => (Math.min(point.offPeakWh, point.totalWh, chart().max) / chart().max) * (chart().height - 18);
                      const x = () => index() * (chart().barWidth + chart().gap);
                      return (
                        <>
                          <rect
                            x={x()} y={chart().height - total()} width={chart().barWidth} height={total()}
                            rx="2" class="energy-bar energy-bar-offpeak"
                          >
                            <title>{t("{label}: {value} total", { label: pointLabel(point, data().period), value: fmtKwh(point.totalWh) })}</title>
                          </rect>
                          <Show when={point.peakWh > 0}>
                            <rect
                              x={x()} y={chart().height - total()} width={chart().barWidth} height={peak()}
                              rx="2" class="energy-bar energy-bar-peak"
                            >
                              <title>{t("{label}: {value} peak", { label: pointLabel(point, data().period), value: fmtKwh(point.peakWh) })}</title>
                            </rect>
                          </Show>
                          <Show when={point.offPeakWh > 0}>
                            <rect
                              x={x()} y={chart().height - offPeak()} width={chart().barWidth} height={offPeak()}
                              rx="2" class="energy-bar energy-bar-offpeak"
                            >
                              <title>{t("{label}: {value} off-peak", { label: pointLabel(point, data().period), value: fmtKwh(point.offPeakWh) })}</title>
                            </rect>
                          </Show>
                        </>
                      );
                    }}
                  </For>
                  <Show when={chart().line}>
                    <polyline points={chart().line} class="energy-temp-line" fill="none" />
                  </Show>
                </svg>
                <div class="energy-axis">
                  <For each={chart().points}>
                    {(point, index) => {
                      const step = Math.max(1, Math.ceil(chart().points.length / 8));
                      return (
                        <Show when={index() % step === 0 || index() === chart().points.length - 1}>
                          <span style={{ left: (index() / Math.max(1, chart().points.length - 1)) * 100 + "%" }}>
                            {pointLabel(point, data().period)}
                          </span>
                        </Show>
                      );
                    }}
                  </For>
                </div>
                  </div>
                  <div class="energy-temp-axis" aria-hidden="true">
                    <For each={chart().tempTicks}>
                      {tick => <span style={{ top: tick.top + "%" }}>{tick.label}</span>}
                    </For>
                  </div>
                </div>
              </div>
              <Show when={chart().capped}>
                <p class="energy-note energy-capped">
                  {t("The first point is capped: it includes a catch-up from before data collection.")}
                </p>
              </Show>
            </Show>
          </>
        )}
      </Show>
    </section>
  );
}
