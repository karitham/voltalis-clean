/* Copy one day's slots onto other days of the same planning. */
import { For } from "solid-js";
import { DAYS, Msg } from "../core";
import type { ModalProps } from "../types";
import type { CopyDayModal } from "../model/types";
import { Button, Field, Modal, Switch } from "../components/common";
import { t } from "../i18n";

export default function CopyDayModal(props: ModalProps<CopyDayModal>) {
  const targets = () => props.modal.targets;
  return (
    <Modal title={t("Copy a day")} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">
          {t("Copy every slot from one day onto other days of this week. The source day stays unchanged; days outside the copy keep theirs.")}
        </p>
        <Field id="copyDaySource" label={t("Copy from")}>
          <select
            id="copyDaySource"
            value={props.modal.sourceDay}
            onChange={e => props.dispatch(Msg.copyDaySourceChanged(Number(e.currentTarget.value)))}
          >
            <For each={DAYS}>{(day, index) => <option value={index() + 1}>{t(day)}</option>}</For>
          </select>
        </Field>
        <div class="program-list">
          <For each={DAYS}>
            {(day, index) => {
              const number = () => index() + 1;
              const isSource = () => props.modal.sourceDay === number();
              return (
                <div class="program">
                  <div class="program-copy">
                    <span class="program-name">{t(day)}</span>
                    {isSource() && <span class="program-kind">{t("source")}</span>}
                  </div>
                  <div class="program-actions">
                    <Switch
                      checked={targets().includes(number())}
                      disabled={isSource()}
                      label={t("Copy to {day}", { day: t(day) })}
                      onChange={() => props.dispatch(Msg.copyDayTargetToggled(number()))}
                    />
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant="primary" disabled={!targets().length} onClick={() => props.dispatch(Msg.copyDaySubmitted())}>
          {targets().length === 1 ? t("Copy to 1 day") : t("Copy to {n} days", { n: targets().length })}
        </Button>
      </footer>
    </Modal>
  );
}
