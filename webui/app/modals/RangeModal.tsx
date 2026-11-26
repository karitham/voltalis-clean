/* A dragged block of cells: one mode for every hour inside it. */
import { For, Show } from "solid-js";
import { DAYS, MODES, Msg, hhmmLabel } from "../core";
import type { ModalProps } from "../types";
import type { RangeModal, UiMode } from "../model/types";
import { Button, Field, Modal } from "../components/common";
import { t } from "../i18n";

export default function RangeModal(props: ModalProps<RangeModal>) {
  const title = () => {
    const from = t(DAYS[props.modal.day1 - 1] || t("Day {n}", { n: props.modal.day1 }));
    const to = t(DAYS[props.modal.day2 - 1] || t("Day {n}", { n: props.modal.day2 }));
    const days = props.modal.day1 === props.modal.day2 ? from : from + " – " + to;
    const hours = hhmmLabel(props.modal.hour1 * 60) + " – " + hhmmLabel((props.modal.hour2 + 1) * 60);
    return days + " · " + hours;
  };
  const cells = () => (props.modal.day2 - props.modal.day1 + 1) * (props.modal.hour2 - props.modal.hour1 + 1);
  const days = () => props.modal.day2 - props.modal.day1 + 1;

  return (
    <Modal title={title()} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">
          {t("One mode for {hours} across {days}. Ranges outside the block stay as they are.", {
            hours: cells() === 1 ? t("1 hour") : t("{n} hours", { n: cells() }),
            days: days() === 1 ? t("1 day") : t("{n} days", { n: days() }),
          })}
        </p>
        <Field id="rangeMode" label={t("Mode for every selected hour")}>
          <select
            id="rangeMode"
            value={props.modal.mode}
            onChange={e => props.dispatch(Msg.rangeModeChanged(e.currentTarget.value as UiMode))}
          >
            <For each={MODES}>{m => <option value={m.v}>{t(m.label)}</option>}</For>
            <option value="OFF">{t("Off")}</option>
          </select>
        </Field>
        <Show when={props.modal.mode === "TEMPERATURE"}>
          <Field id="rangeTemp" label={t("Target temperature (°C)")}>
            <input
              id="rangeTemp"
              type="number"
              min="12"
              max="28"
              step="0.5"
              value={props.modal.temp}
              onInput={e => props.dispatch(Msg.rangeTempChanged(e.currentTarget.value))}
            />
          </Field>
        </Show>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={() => props.dispatch(Msg.rangeApplied())}>{t("Apply to {n}", { n: cells() })}</Button>
      </footer>
    </Modal>
  );
}
