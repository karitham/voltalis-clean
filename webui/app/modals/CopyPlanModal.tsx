/* Copy one appliance's week into other appliances of the same program. */
import { For, Show } from "solid-js";
import { Msg, hasId, humanName, typeOf } from "../core";
import type { ModalProps } from "../types";
import type { CopyPlanModal } from "../model/types";
import { Button, Modal, Switch } from "../components/common";
import { t } from "../i18n";

export default function CopyPlanModal(props: ModalProps<CopyPlanModal>) {
  const program = () => props.model.data.programDetail;
  const plannings = () => program()?.plannings ?? [];
  const source = () => plannings().find(pl => pl.id === props.modal.sourceId) || null;
  const sourceName = () => {
    const s = source();
    return s ? (s.nameAppliance || t("this appliance")) : t("this appliance");
  };
  const rows = () => props.model.data.appliances
    .filter(a => a.id !== props.modal.sourceApplianceId);
  const targets = () => props.modal.targets || [];
  const count = () => targets().length;
  const intro = () => t("The week of {name} is copied into {program} for each appliance you choose. An appliance that already has a week here has it replaced.", {
    name: sourceName(),
    program: program() ? humanName(program()?.name) : t("this program"),
  });

  return (
    <Modal title={t("Copy this week")} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <p class="muted">{intro()}</p>
        <Show
          when={rows().length}
          fallback={<p class="empty">{t("This site has no other appliance to copy to.")}</p>}
        >
          <div class="program-list">
            <For each={rows()}>
              {appliance => (
                <div class="program">
                  <div class="program-copy">
                    <span class="program-name">{appliance.name || t("Unnamed appliance")}</span>
                    <span class="program-kind">
                      {typeOf(appliance) + (plannings().some(pl => pl.idAppliance === appliance.id)
                        ? t(" · already in this program") : "")}
                    </span>
                  </div>
                  <div class="program-actions">
                    <Switch
                      checked={hasId(targets(), appliance.id)}
                      label={t("Copy to {name}", { name: appliance.name || t("this appliance") })}
                      onChange={() => props.dispatch(Msg.copyPlanTargetToggled(appliance.id))}
                    />
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
      <footer class="modal-actions">
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Button
          variant="primary"
          disabled={count() === 0}
          onClick={() => props.dispatch(Msg.copyPlanSubmitted())}
        >{count() === 1 ? t("Copy to 1 appliance") : t("Copy to {n} appliances", { n: count() })}</Button>
      </footer>
    </Modal>
  );
}
