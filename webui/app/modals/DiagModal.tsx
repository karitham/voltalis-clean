/* What one appliance reports about itself, and the self-test when it is allowed. */
import { Show } from "solid-js";
import { CONNECTION, Msg, applianceById, diagOf, typeOf } from "../core";
import type { ModalProps } from "../types";
import type { DiagModal } from "../model/types";
import { Button, Modal } from "../components/common";
import { t } from "../i18n";

export default function DiagModal(props: ModalProps<DiagModal>) {
  const appliance = () => applianceById(props.model, props.modal.applianceId);
  const row = () => diagOf(props.model, props.modal.applianceId);
  const name = () => {
    const a = appliance();
    return (a && a.name) || t("Unnamed appliance");
  };
  const type = () => {
    const current = appliance();
    return current ? t(typeOf(current)) : t("Unknown");
  };
  const connection = () => {
    const current = row();
    if (!current) return null;
    const known = current.status ? CONNECTION[current.status] : undefined;
    return known ? t(known.text) : t("Unknown");
  };
  const rawStatus = () => {
    const current = row();
    return current && current.status != null ? String(current.status) : t("unknown");
  };
  const consumption = () => {
    const current = row();
    return current && current.consumptionStatus != null ? String(current.consumptionStatus) : t("unknown");
  };
  const canTest = () => {
    const current = row();
    return !!(current && current.diagTestEnabled && current.csModulatorId != null && current.csModulatorId !== "");
  };

  return (
    <Modal title={t("{name} · diagnostics", { name: name() })} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">
          {t("What the appliance reports about itself: whether it answers, whether it draws current, and whether a self-test is allowed.")}
        </p>
        <Show
          when={row()}
          fallback={<p class="empty">{t("No diagnostic record for this appliance yet.")}</p>}
        >
          <div class="device-facts">
            <span class="fact">{t("Type")} <span class="fact-value">{type()}</span></span>
            <span class="fact">{t("connection")} <span class="fact-value">{connection()}</span></span>
            <span class="fact">{t("self-test status")} <span class="fact-value">{rawStatus()}</span></span>
            <span class="fact">{t("consumption")} <span class="fact-value">{consumption()}</span></span>
            <span class="fact">{t("self-test")} <span class="fact-value">{row()?.diagTestEnabled ? t("available") : t("disabled")}</span></span>
          </div>
          <Show when={canTest()}>
            <p class="hint">
              {t("A self-test takes up to a minute; the status updates when it finishes, and Refresh re-reads it.")}
            </p>
          </Show>
        </Show>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.calibrationOpened(props.modal.applianceId))}>{t("Calibrate")}</Button>
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Close")}</Button>
        <Button variant="quiet" onClick={() => props.dispatch(Msg.diagRefreshRequested())}>{t("Refresh")}</Button>
        <Show when={canTest()}>
          <Button variant="primary" onClick={() => props.dispatch(Msg.diagTestRequested())}>{t("Run self-test")}</Button>
        </Show>
      </footer>
    </Modal>
  );
}
