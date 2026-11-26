import { Show, Switch, Match } from "solid-js";
import type { ViewProps } from "../types";
import type { BulkModal as BulkModalState, CalibrateModal as CalibrateModalState, CopyDayModal as CopyDayModalState, CopyPlanModal as CopyPlanModalState, RenameApplianceModal as RenameApplianceModalState, SiteManageModal as SiteManageModalState, DiagModal as DiagModalState, NewProgramModal as NewProgramModalState, OverrideModal as OverrideModalState, ProgramManageModal as ProgramManageModalState, QuickConfigModal as QuickConfigModalState, RangeModal as RangeModalState, SlotModal as SlotModalState } from "../model/types";
import OverrideModal from "../modals/OverrideModal";
import SlotModal from "../modals/SlotModal";
import RangeModal from "../modals/RangeModal";
import NewProgramModal from "../modals/NewProgramModal";
import ProgramManageModal from "../modals/ProgramManageModal";
import BulkModal from "../modals/BulkModal";
import CalibrateModal from "../modals/CalibrateModal";
import CopyDayModal from "../modals/CopyDayModal";
import CopyPlanModal from "../modals/CopyPlanModal";
import RenameApplianceModal from "../modals/RenameApplianceModal";
import SiteManageModal from "../modals/SiteManageModal";
import QuickConfigModal from "../modals/QuickConfigModal";
import DiagModal from "../modals/DiagModal";

export default function ModalHost(props: ViewProps) {
  return (
    <Show when={props.model.ui.modal}>
      {modal => (
        <Switch>
          <Match when={modal().kind === "override"}><OverrideModal model={props.model} dispatch={props.dispatch} modal={modal() as OverrideModalState} /></Match>
          <Match when={modal().kind === "slot"}><SlotModal model={props.model} dispatch={props.dispatch} modal={modal() as SlotModalState} /></Match>
          <Match when={modal().kind === "range"}><RangeModal model={props.model} dispatch={props.dispatch} modal={modal() as RangeModalState} /></Match>
          <Match when={modal().kind === "newProgram"}><NewProgramModal model={props.model} dispatch={props.dispatch} modal={modal() as NewProgramModalState} /></Match>
          <Match when={modal().kind === "programManage"}><ProgramManageModal model={props.model} dispatch={props.dispatch} modal={modal() as ProgramManageModalState} /></Match>
          <Match when={modal().kind === "siteManage"}><SiteManageModal model={props.model} dispatch={props.dispatch} modal={modal() as SiteManageModalState} /></Match>
          <Match when={modal().kind === "renameAppliance"}><RenameApplianceModal model={props.model} dispatch={props.dispatch} modal={modal() as RenameApplianceModalState} /></Match>
          <Match when={modal().kind === "copyDay"}><CopyDayModal model={props.model} dispatch={props.dispatch} modal={modal() as CopyDayModalState} /></Match>
          <Match when={modal().kind === "copyPlan"}><CopyPlanModal model={props.model} dispatch={props.dispatch} modal={modal() as CopyPlanModalState} /></Match>
          <Match when={modal().kind === "quickConfig"}><QuickConfigModal model={props.model} dispatch={props.dispatch} modal={modal() as QuickConfigModalState} /></Match>
          <Match when={modal().kind === "bulk"}><BulkModal model={props.model} dispatch={props.dispatch} modal={modal() as BulkModalState} /></Match>
          <Match when={modal().kind === "calibrate"}><CalibrateModal model={props.model} dispatch={props.dispatch} modal={modal() as CalibrateModalState} /></Match>
          <Match when={modal().kind === "diag"}><DiagModal model={props.model} dispatch={props.dispatch} modal={modal() as DiagModalState} /></Match>
        </Switch>
      )}
    </Show>
  );
}
