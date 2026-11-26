/* The dashboard reads as one page: a heading, four facts, then the workspace.
   No nested panels, no cards around cards. */
import { For, Show } from "solid-js";
import {
  currentProgramName,
  fmtLive,
  fmtTemp,
  humanWords,
  isHeating,
  isObject,
  siteOf,
  weatherGlyph,
} from "../core";
import type { Model, ViewProps } from "../types";
import { t } from "../i18n";
import Devices from "./Devices";
import Programs from "./Programs";
import Energy from "./Energy";
import Health from "./Health";
import Schedule from "./Schedule";

interface HeroFact {
  value?: string;
  label?: string;
  title?: string;
}

/* Facts come only from payloads that really answered; a failed read adds nothing. */
function heroFactsOf(model: Model): HeroFact[] {
  const welcome = isObject(model.data.welcome) ? model.data.welcome : null;
  const live = isObject(model.data.realtime) ? model.data.realtime : null;
  const facts: HeroFact[] = [];
  if (welcome) {
    const outside = fmtTemp(welcome.externalTemp);
    if (outside) facts.push({ value: outside, label: t("outside") });
    if (welcome.iconName) {
      const glyph = weatherGlyph(welcome.iconName);
      /* Unknown codes are not weather. Never print the backend token. */
      if (glyph) {
        const name = humanWords(welcome.iconName);
        facts.push({ value: glyph, label: name, title: name });
      }
    }
  }
  if (live) {
    const text = fmtLive(live);
    if (text) facts.push({ value: text, label: t("live now") });
  }
  return facts;
}

function radiatorsOf(model: Model): number {
  return model.data.appliances.filter(a => a.applianceType !== "WATER_HEATER").length;
}

function heatingCount(model: Model): number {
  return model.data.appliances.filter(a => isHeating(a)).length;
}

export default function Dashboard(props: ViewProps) {
  const demo = () => props.model.session.kind === "demo";
  const title = () => (demo() ? t("Demo heating overview") : t("Heating overview"));
  const subtitle = () => {
    if (demo()) return t("Sample devices — no commands reach Voltalis.");
    const site = siteOf(props.model);
    const name = props.model.session.sites.find(s => s.id === site)?.name;
    return name ? t("Live state · {name}", { name }) : t("Live state");
  };
  const facts = () => heroFactsOf(props.model);

  return (
    <div class="dashboard">
      <section class="hero" aria-labelledby="overview-title">
        <div class="hero-copy">
          <h1 id="overview-title">{title()}</h1>
          <p class="lede">{subtitle()}</p>
          <Show when={facts().length}>
            <div class="hero-facts">
              <For each={facts()}>
                {fact => (
                  <span class="fact" title={fact.title}>
                    <Show when={fact.value}>
                      <span class="fact-value">{fact.value}</span>
                    </Show>
                    {" " + fact.label}
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>
        <dl class="stats">
          <div class="stat stat-live">
            <dt class="k">{t("Heating now")}</dt>
            <dd class={heatingCount(props.model) > 0 ? "v tabular stat-active" : "v tabular stat-zero"}>
              {heatingCount(props.model) === 1 ? t("1 active") : t("{n} active", { n: heatingCount(props.model) })}
            </dd>
          </div>
          <div class="stat">
            <dt class="k">{t("Weekly program")}</dt>
            <dd class="v">{t(currentProgramName(props.model))}</dd>
          </div>
          <div class="stat">
            <dt class="k">{t("Radiators")}</dt>
            <dd class="v tabular">{radiatorsOf(props.model)}</dd>
          </div>
        </dl>
      </section>
      <Devices model={props.model} dispatch={props.dispatch} />
      <Schedule model={props.model} dispatch={props.dispatch} />
      <Energy model={props.model} dispatch={props.dispatch} />
      <div class="workspace support-workspace">
        <div class="column">
          <Programs model={props.model} dispatch={props.dispatch} />
        </div>
        <div class="column">
          <Health model={props.model} dispatch={props.dispatch} />
        </div>
      </div>
    </div>
  );
}
