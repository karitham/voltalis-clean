/* Rename one appliance. The API stores the new name on the site, so the
   appliance list is re-read after the write. */
import { Msg, applianceById } from "../core";
import type { ModalProps } from "../types";
import type { RenameApplianceModal } from "../model/types";
import { Button, Field, Modal } from "../components/common";
import { t } from "../i18n";

export default function RenameApplianceModal(props: ModalProps<RenameApplianceModal>) {
  const appliance = () => applianceById(props.model, props.modal.applianceId);
  const current = () => appliance()?.name || t("this appliance");
  const submit = () => props.dispatch(Msg.applianceRenameSubmitted());

  return (
    <Modal title={t("Rename appliance")} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">
          {t("Give {name} a name you recognise. The new name is saved to your Voltalis account and used throughout this app.", { name: current() })}
        </p>
        <Field id="applianceName" label={t("Appliance name")}>
          <input
            id="applianceName"
            type="text"
            autocomplete="off"
            value={props.modal.name}
            onInput={e => props.dispatch(Msg.applianceRenameNameChanged(e.currentTarget.value))}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
          />
        </Field>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={submit}>{t("Save name")}</Button>
      </footer>
    </Modal>
  );
}
