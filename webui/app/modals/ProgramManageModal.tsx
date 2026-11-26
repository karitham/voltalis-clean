/* One program, three jobs: rename, duplicate, delete. The mode is model state,
   so a stale dialog can never fall back to another form. */
import { Match, Show, Switch } from "solid-js";
import { Msg, humanName, programById } from "../core";
import type { ModalProps } from "../types";
import type { ProgramManageModal } from "../model/types";
import { Button, Field, Modal } from "../components/common";
import { t } from "../i18n";

export default function ProgramManageModal(props: ModalProps<ProgramManageModal>) {
  const program = () => programById(props.model, props.modal.id);
  const planners = () => {
    const open = props.model.data.programDetail;
    if (!open || open.id !== props.modal.id || !Array.isArray(open.plannings)) return 0;
    return open.plannings.length;
  };
  const title = () => {
    const p = program();
    return humanName(props.modal.name || (p ? p.name : "")) || t("Program");
  };
  const deleteText = () => {
    const p = program();
    const count = planners();
    return t("Deleting removes {name}{plannings}. Appliances fall back to the default program{active}. It cannot be undone.", {
      name: title(),
      plannings: count ? (count === 1 ? t(" and the week of 1 appliance") : t(" and the weeks of {n} appliances", { n: count })) : "",
      active: p && p.enabled ? t(", and this is the program that is on now") : "",
    });
  };

  return (
    <Modal title={title()} onClose={() => props.dispatch(Msg.modalCloseRequested())}>
      <div class="modal-body">
        <Switch fallback={
          <p class="muted">
            {t("Rename the program, copy it, or delete it. The weekly plan and its appliances stay attached to this program.")}
          </p>
        }>
          <Match when={props.modal.mode === "duplicate"}>
            <p class="muted">
              {t("The copy starts disabled and carries the same weeks, so next season can be built from this one without touching it.")}
            </p>
            <Field id="programCopyName" label={t("Name for the copy")}>
              <input
                id="programCopyName"
                type="text"
                value={props.modal.copyName}
                onInput={e => props.dispatch(Msg.programManageNameChanged(e.currentTarget.value))}
              />
            </Field>
          </Match>
          <Match when={props.modal.mode === "delete"}>
            <p class="muted">{deleteText()}</p>
          </Match>
        </Switch>
        <Show when={props.modal.mode !== "duplicate" && props.modal.mode !== "delete"}>
          <Field id="programName" label={t("Name")}>
            <input
              id="programName"
              type="text"
              value={props.modal.name}
              onInput={e => props.dispatch(Msg.programManageNameChanged(e.currentTarget.value))}
            />
          </Field>
        </Show>
      </div>
      <footer class="modal-actions">
        <Switch fallback={
          <>
            <Button variant="quiet" onClick={() => props.dispatch(Msg.programManageModeChanged("duplicate"))}>{t("Duplicate…")}</Button>
            <Button variant="danger" onClick={() => props.dispatch(Msg.programManageModeChanged("delete"))}>{t("Delete…")}</Button>
          </>
        }>
          <Match when={props.modal.mode === "duplicate"}>
            <Button variant="primary" onClick={() => props.dispatch(Msg.programDuplicateSubmitted())}>{t("Duplicate")}</Button>
          </Match>
          <Match when={props.modal.mode === "delete"}>
            <Button variant="danger" onClick={() => props.dispatch(Msg.programDeleteConfirmed())}>{t("Delete program")}</Button>
          </Match>
        </Switch>
        <Show when={props.modal.mode !== "edit"}>
          <Button variant="quiet" onClick={() => props.dispatch(Msg.programManageModeChanged("edit"))}>{t("Back")}</Button>
        </Show>
        <Button variant="quiet" onClick={() => props.dispatch(Msg.modalCloseRequested())}>{t("Cancel")}</Button>
        <Show when={props.modal.mode === "edit"}>
          <Button variant="primary" onClick={() => props.dispatch(Msg.programRenameSubmitted())}>{t("Save name")}</Button>
        </Show>
      </footer>
    </Modal>
  );
}
