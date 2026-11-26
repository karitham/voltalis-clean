/* One hour of the weekly plan: a precise from/to editor for a single cell. */
import { For, Show } from "solid-js";
import { DAYS, MODES, Msg, pad2, planFor, rangeAt } from "../core";
import type { ModalProps } from "../types";
import type { SlotModal } from "../model/types";
import { Button, Field, Modal } from "../components/common";
import { t } from "../i18n";

export default function SlotModal(props: ModalProps<SlotModal>) {
  const range = () => rangeAt(planFor(props.model), props.modal.day, props.modal.hour);
  const title = () => {
    const day = t(DAYS[props.modal.day - 1] || t("Day {n}", { n: props.modal.day }));
    return day + " · " + pad2(props.modal.hour) + ":00";
  };

  return (
    <Modal title={title()} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">{t("Set the mode for this time slot. Overlapping slots are replaced.")}</p>
        <div class="grid-2">
          <Field id="fromTime" label={t("From")}>
            <input
              id="fromTime"
              type="time"
              step="1800"
              value={props.modal.from}
              onInput={e => props.dispatch(Msg.slotFieldChanged("from", e.currentTarget.value))}
            />
          </Field>
          <Field id="toTime" label={t("To")}>
            <input
              id="toTime"
              type="time"
              step="1800"
              value={props.modal.to}
              onInput={e => props.dispatch(Msg.slotFieldChanged("to", e.currentTarget.value))}
            />
          </Field>
        </div>
        <Field id="slotMode" label={t("Mode")}>
          <select
            id="slotMode"
            value={props.modal.mode}
            onChange={e => props.dispatch(Msg.slotFieldChanged("mode", e.currentTarget.value))}
          >
            <For each={MODES}>{m => <option value={m.v}>{t(m.label)}</option>}</For>
            <option value="OFF">{t("Off")}</option>
          </select>
        </Field>
        <Show when={props.modal.mode === "TEMPERATURE"}>
          <Field id="slotTemp" label={t("Target temperature (°C)")}>
            <input
              id="slotTemp"
              type="number"
              min="12"
              max="28"
              step="0.5"
              value={props.modal.temp}
              onInput={e => props.dispatch(Msg.slotFieldChanged("temp", e.currentTarget.value))}
            />
          </Field>
        </Show>
      </div>
      <footer class="modal-actions">
        <Show when={range()}>
          <Button variant="danger" onClick={() => props.dispatch(Msg.slotDeleteRequested())}>{t("Delete slot")}</Button>
        </Show>
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={() => props.dispatch(Msg.slotSaveRequested())}>{t("Save slot")}</Button>
      </footer>
    </Modal>
  );
}
