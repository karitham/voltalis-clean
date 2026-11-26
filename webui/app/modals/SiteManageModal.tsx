/* Rename the current site or make it the default for next sign-in. */
import { Msg } from "../core";
import type { ModalProps } from "../types";
import type { SiteManageModal } from "../model/types";
import { Button, Field, Modal } from "../components/common";
import { t } from "../i18n";

export default function SiteManageModal(props: ModalProps<SiteManageModal>) {
  const submit = () => props.dispatch(Msg.siteNameSubmitted());
  return (
    <Modal title={t("Site")} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">
          {t("The site name appears in the selector. Making it default opens this site the next time you sign in.")}
        </p>
        <Field id="siteName" label={t("Site name")}>
          <input
            id="siteName"
            type="text"
            autocomplete="off"
            value={props.modal.name}
            onInput={e => props.dispatch(Msg.siteNameChanged(e.currentTarget.value))}
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
          />
        </Field>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.siteDefaultRequested())}>{t("Make default")}</Button>
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant="primary" onClick={submit}>{t("Save name")}</Button>
      </footer>
    </Modal>
  );
}
