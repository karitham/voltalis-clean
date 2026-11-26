/* A new weekly program starts empty; its planning is edited after it is created. */
import { Msg } from "../core";
import type { ModalProps } from "../types";
import type { NewProgramModal } from "../model/types";
import { Button, Field, Modal } from "../components/common";
import { t } from "../i18n";

export default function NewProgramModal(props: ModalProps<NewProgramModal>) {
  return (
    <Modal title={t("New weekly program")} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">{t("An empty program is created; select it to add a week and slots.")}</p>
        <Field id="newName" label={t("Name")}>
          <input
            id="newName"
            type="text"
            placeholder={t("e.g. Hiver")}
            value={props.modal.name}
            onInput={e => props.dispatch(Msg.newProgramNameChanged(e.currentTarget.value))}
          />
        </Field>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={() => props.dispatch(Msg.newProgramSubmitted())}>{t("Create")}</Button>
      </footer>
    </Modal>
  );
}
