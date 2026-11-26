/* Manual override: one mode for one appliance, for a while. */
import { For, Show } from "solid-js";
import { DURATIONS, MODES, Msg, applianceById } from "../core";
import type { ModalProps } from "../types";
import type { OverrideDuration, OverrideModal } from "../model/types";
import { Button, Field, Modal } from "../components/common";
import { t } from "../i18n";

export default function OverrideModal(props: ModalProps<OverrideModal>) {
  const appliance = () => applianceById(props.model, props.modal.applianceId);
  const name = () => {
    const a = appliance();
    return (a && a.name) || t("Appliance {n}", { n: props.modal.applianceId });
  };
  /* Only the modes the appliance advertises, plus the one it is in now if the
     backend no longer lists it: an active button always matches the model. */
  const modes = () => {
    const a = appliance();
    const available = a && a.availableModes;
    const picked = Array.isArray(available) && available.length
      ? MODES.filter(m => available.indexOf(m.v) >= 0)
      : MODES.slice();
    const current = props.modal.mode;
    if (current && current !== "OFF" && !picked.some(m => m.v === current)) {
      const known = MODES.find(m => m.v === current);
      if (known) picked.push(known);
    }
    return picked;
  };

  return (
    <Modal title={t("{name} · manual override", { name: name() })} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">
          {t("Choose a mode and how long it should last. “Off” keeps the override active but stops heating.")}
        </p>
        <div class="mode-row" role="group" aria-label={t("Mode")}>
          <For each={modes()}>
            {mode => (
              <button
                type="button"
                class={["mode-btn", props.modal.mode === mode.v && "mode-btn-active"].filter(Boolean).join(" ")}
                aria-pressed={props.modal.mode === mode.v ? "true" : "false"}
                onClick={() => props.dispatch(Msg.overrideModeChanged(mode.v))}
              >{t(mode.label)}</button>
            )}
          </For>
          <button
            type="button"
            class={["mode-btn", props.modal.mode === "OFF" && "mode-btn-active"].filter(Boolean).join(" ")}
            aria-pressed={props.modal.mode === "OFF" ? "true" : "false"}
            onClick={() => props.dispatch(Msg.overrideModeChanged("OFF"))}
          >{t("Off")}</button>
        </div>
        <Field id="overrideDuration" label={t("Duration")}>
          <select
            id="overrideDuration"
            value={props.modal.duration}
            onChange={e => props.dispatch(Msg.overrideDurationChanged(e.currentTarget.value as OverrideDuration))}
          >
            <For each={DURATIONS}>{d => <option value={d.v}>{t(d.label)}</option>}</For>
          </select>
        </Field>
        <Show when={props.modal.mode === "TEMPERATURE"}>
          <Field id="target" label={t("Target temperature (°C)")}>
            <input
              id="target"
              type="number"
              min="12"
              max="28"
              step="0.5"
              value={props.modal.target}
              onInput={e => props.dispatch(Msg.overrideTargetChanged(e.currentTarget.value))}
            />
          </Field>
        </Show>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={() => props.dispatch(Msg.overrideSubmitted(Date.now()))}>{t("Apply override")}</Button>
      </footer>
    </Modal>
  );
}
