/* A quick setting: how long it lasts and what every appliance does meanwhile. */
import { For, Show } from "solid-js";
import {
  MODE_LABEL, Msg, QUICK_DURATIONS, applianceById, humanName, humanWords, modeListFor, typeOf,
} from "../core";
import type { ModalProps } from "../types";
import type { QuickConfigModal, QuickPreset } from "../model/types";
import { Button, Field, Modal, Switch } from "../components/common";
import { t } from "../i18n";

export default function QuickConfigModal(props: ModalProps<QuickConfigModal>) {
  const title = () => props.modal.name ? t("{name} · quick setting", { name: humanName(props.modal.name) }) : t("Quick setting");
  const rows = () => props.modal.rows || [];
  const applianceOf = (id: number) => applianceById(props.model, id);

  return (
    <Modal title={title()} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">
          {t("Choose how long this setting lasts and what each appliance does while it runs.")}
        </p>
        <Field id="quickDuration" label={t("Duration")}>
          <select
            id="quickDuration"
            value={props.modal.preset}
            onChange={e => props.dispatch(Msg.quickConfigDurationChanged(e.currentTarget.value as QuickPreset, Date.now()))}
          >
            <For each={QUICK_DURATIONS}>{d => <option value={d.v}>{t(d.label)}</option>}</For>
            <option value="custom">{t("Custom end")}</option>
            <option value="until">{t("Until further notice")}</option>
          </select>
        </Field>
        <Field id="quickEnd" label={t("Ends at")}>
          <input
            id="quickEnd"
            type="datetime-local"
            value={props.modal.end}
            disabled={props.modal.untilFurtherNotice}
            onInput={e => props.dispatch(Msg.quickConfigEndChanged(e.currentTarget.value))}
          />
        </Field>
        <Show when={props.modal.untilFurtherNotice}>
          <p class="hint">{t("Runs until you turn it off or enable another preset.")}</p>
        </Show>
        <div class="program-list">
          <For each={rows()}>
            {row => {
              const appliance = () => applianceOf(row.idAppliance);
              const name = () => {
                const a = appliance();
                return (a && a.name) || row.name || t("Unnamed appliance");
              };
              const kind = () => {
                const a = appliance();
                return a ? typeOf(a) : t("Appliance");
              };
              const modeId = () => "quickMode-" + row.idAppliance;
              const tempId = () => "quickTemp-" + row.idAppliance;
              return (
                <div>
                  <div class="program">
                    <div class="program-copy">
                      <span class="program-name">{name()}</span>
                      <span class="program-kind">{kind()}</span>
                    </div>
                    <div class="program-actions">
                      <Switch
                        checked={row.isOn}
                        label={t("Heat {name}", { name: name() })}
                        onChange={on => props.dispatch(Msg.quickConfigRowOnToggled(row.idAppliance, on))}
                      />
                    </div>
                  </div>
                  <div class="grid-2">
                    <Field id={modeId()} label={t("Mode")}>
                      <select
                        id={modeId()}
                        value={row.mode}
                        onChange={e => props.dispatch(Msg.quickConfigRowModeChanged(row.idAppliance, e.currentTarget.value))}
                      >
                        <For each={modeListFor(appliance(), row.mode)}>
                          {value => <option value={value}>{t(MODE_LABEL[value] || humanWords(value))}</option>}
                        </For>
                      </select>
                    </Field>
                    <Field id={tempId()} label={t("Target °C")}>
                      <input
                        id={tempId()}
                        type="number"
                        min="5"
                        max="60"
                        step="0.5"
                        value={row.temperatureTarget == null ? "" : String(row.temperatureTarget)}
                        onInput={e => props.dispatch(Msg.quickConfigRowTempChanged(row.idAppliance, e.currentTarget.value))}
                      />
                    </Field>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={() => props.dispatch(Msg.quickConfigSubmitted(Date.now()))}>{t("Save and enable")}</Button>
      </footer>
    </Modal>
  );
}
