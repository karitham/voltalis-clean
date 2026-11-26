import type { Model } from "./model/types";
import type { ModalState, Msg } from "./model/types";

export type { Model };
export type Dispatch = (msg: Msg) => void;
export interface ViewProps { model: Model; dispatch: Dispatch }
export interface ModalProps<M extends ModalState = ModalState> extends ViewProps { modal: M }
