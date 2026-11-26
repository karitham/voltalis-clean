/* Save a measured room temperature so the appliance sensor can be corrected. */
import { Msg, applianceById } from "../core";
import type { ModalProps } from "../types";
import type { CalibrateModal } from "../model/types";
import { Button, Field, Modal } from "../components/common";
import { t } from "../i18n";

export default function CalibrateModal(props: ModalProps<CalibrateModal>) {
  const appliance = () => applianceById(props.model, props.modal.applianceId);
  const name = () => appliance()?.name || t("this appliance");
  const submit = () => props.dispatch(Msg.calibrationSubmitted());
  return (
    <Modal title={t("Calibrate {name}", { name: name() })} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">
          {t("Enter the temperature you measure in the room. Voltalis uses it to correct this appliance’s sensor offset; it does not change the target temperature.")}
        </p>
        <Field id="measuredTemp" label={t("Measured temperature (°C)")}>
          <input
            id="measuredTemp"
            type="number"
            min="7"
            max="45"
            step="0.5"
            inputmode="decimal"
            value={props.modal.value}
            onInput={e => props.dispatch(Msg.calibrationValueChanged(e.currentTarget.value))}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
          />
        </Field>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={submit}>{t("Save calibration")}</Button>
      </footer>
    </Modal>
  );
}
