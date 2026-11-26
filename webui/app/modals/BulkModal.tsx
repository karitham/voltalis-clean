/* Confirm a site-wide appliance action before sending its per-appliance writes. */
import { Msg } from "../core";
import type { ModalProps } from "../types";
import type { BulkModal } from "../model/types";
import { Button, Modal } from "../components/common";
import { t } from "../i18n";

export default function BulkModal(props: ModalProps<BulkModal>) {
  const off = () => props.modal.action === "off";
  return (
    <Modal
      title={off() ? t("Stop all heating?") : t("Resume all schedules?")}
      onClose={() => props.dispatch(Msg.modalCloseRequested())}
    >
      <div class="modal-body">
        <p class="muted">
          {off()
            ? t("This stops heating in every room with a manual setting. Each room keeps its current mode. You can undo this with “Resume all schedules”.")
            : t("This returns every manually overridden room to its schedule.")}
        </p>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button variant={off() ? "danger" : "primary"} onClick={() => props.dispatch(Msg.bulkConfirmed(props.modal.action, Date.now()))}>
          {off() ? t("Stop all heating") : t("Resume all schedules")}
        </Button>
      </footer>
    </Modal>
  );
}
