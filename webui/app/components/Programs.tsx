import { For, Show } from "solid-js";
import { Msg, humanName, isObject } from "../core";
import type { Program, QuickSetting } from "../model/types";
import type { ViewProps } from "../types";
import { Button, Switch } from "./common";
import { t } from "../i18n";

type ProgramKind = "QUICK" | "USER";

export default function Programs(props: ViewProps) {
  const quick = () => props.model.data.quick;
  const weekly = () => props.model.data.programs;
  const geoloc = () => (isObject(props.model.data.geoloc) ? props.model.data.geoloc : null);
  const hasPrograms = () => quick().length > 0 || weekly().length > 0;

  /* A row keeps its identity across updates, so it re-reads its own entry instead of
     closing over the object it was built from: a transport may answer with the same
     object it just mutated. */
  const live = (kind: ProgramKind, item: QuickSetting | Program) => {
    const list: Array<QuickSetting | Program> = kind === "QUICK" ? props.model.data.quick : props.model.data.programs;
    return list.find(entry => entry.id === item.id) ?? item;
  };

  const row = (kind: ProgramKind, item: QuickSetting | Program) => {
    const current = () => live(kind, item);
    return (
      <li class={["program", { "program-active": !!current().enabled }]}>
        <div class="program-copy">
          <span class="program-name">{humanName(current().name)}</span>
          <span class="program-kind">
            {kind === "QUICK" ? t("Built-in quick setting") : t("Weekly program")}
          </span>
        </div>
        <div class="program-actions">
          <Show
            when={kind === "QUICK"}
            fallback={
              <>
                <Button
                  variant="quiet"
                  title={t("Show this program's weekly plan")}
                  onClick={() => props.dispatch(Msg.programEditRequested(item.id))}
                >{t("Edit")}</Button>
                <Button
                  variant="quiet"
                  title={t("Rename, duplicate or delete this program")}
                  onClick={() => props.dispatch(Msg.programManageOpened(item.id))}
                >{t("Manage")}</Button>
              </>
            }
          >
            <Button
              variant="quiet"
              title={t("Set the duration and each appliance's mode for this quick setting")}
              onClick={() => props.dispatch(Msg.quickConfigOpened(item.id, Date.now()))}
            >{t("Configure")}</Button>
          </Show>
          <Switch
            checked={!!current().enabled}
            label={(current().enabled ? t("Disable {name}", { name: humanName(current().name) }) : t("Enable {name}", { name: humanName(current().name) }))}
            title={current().enabled ? t("Turn this program off") : t("Turn this program on")}
            onChange={on => props.dispatch(Msg.programSwitchRequested(kind, item.id, on))}
          />
        </div>
      </li>
    );
  };

  return (
    <section class="section section-recessed" id="programs" aria-labelledby="programs-title">
      <div class="section-head">
        <h2 class="section-title" id="programs-title">{t("Programs")}</h2>
        <div class="section-actions">
          <Show when={geoloc()}>
            {geo => (
              <>
                <span class="muted">{t("Geolocation")}</span>
                <Switch
                  label={t("Geolocation")}
                  title={t("Let this site use the location it already stores")}
                  checked={!!geo().activatedByUser}
                  onChange={on => props.dispatch(Msg.geolocToggleRequested(on))}
                />
              </>
            )}
          </Show>
          <Button
            variant="primary"
            title={t("Create a new weekly program")}
            onClick={() => props.dispatch(Msg.newProgramOpened())}
          >{t("Create program")}</Button>
        </div>
      </div>

      <Show
        when={hasPrograms()}
        fallback={<p class="empty">{t("No programs yet. Create one to plan a week.")}</p>}
      >
        <Show when={!quick().length}>
          <Button variant="quiet" onClick={() => props.dispatch(Msg.quickRestoreRequested())}>{t("Restore default presets")}</Button>
        </Show>
        <ul class="program-list">
          <For each={quick()}>{item => row("QUICK", item)}</For>
          <For each={weekly()}>{item => row("USER", item)}</For>
        </ul>
      </Show>

      <p class="hint">
        {t("Only one program runs at a time: turning one on turns the others off.")}
      </p>
    </section>
  );
}
