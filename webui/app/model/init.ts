import type {
  Data, LoginDraft, ModalState, Model, Session, Ui, UpdateResult,
} from "./types";

export function blankData(): Data {
  return {
    appliances: [], manual: [], quick: [], programs: [], programDetail: null, state: null,
    autodiag: [], welcome: null, realtime: null, geoloc: null, temperatureSensor: null, energyManager: null, savings: null, objective: null, rteAlerts: [],
  };
}
export function blankSession(): Session {
  return { kind: "anon", token: "", email: "", siteId: null, sites: [] };
}
export function blankLogin(email = ""): LoginDraft {
  return { email, password: "", token: "" };
}

export function cloneModel(): Model {
  return {
    session: blankSession(),
    data: blankData(),
    ui: {
      page: "login", modal: null, sel: null, selectedApplianceId: null, deviceFilter: "all",
      loginError: "", busy: false,
      login: blankLogin(""), toasts: [], toastSeq: 0, tokenOpen: false,
      energy: { period: "month", anchor: null, snapshot: null, loading: false, error: null },
    },
  };
}

export function init(): UpdateResult {
  return { model: cloneModel(), effects: [] };
}

export function keep(model: Model): UpdateResult {
  return { model, effects: [] };
}
export function setUi(model: Model, patch: Partial<Ui>): Model {
  return { ...model, ui: { ...model.ui, ...patch } };
}
export function setData(model: Model, patch: Partial<Data>): Model {
  return { ...model, data: { ...model.data, ...patch } };
}
export function setModal(model: Model, modal: ModalState | null): Model {
  return setUi(model, { modal });
}
export function patchModal<T extends ModalState>(model: Model, patch: Partial<T>): Model {
  if (!model.ui.modal) return model;
  return setModal(model, { ...model.ui.modal, ...patch } as ModalState);
}

export function loginModel(model: Model, message = ""): Model {
  const email = model.ui.login.email || model.session.email || "";
  return {
    session: blankSession(),
    data: blankData(),
    ui: {
      page: "login", modal: null, sel: null, selectedApplianceId: null, deviceFilter: "all",
      loginError: message, busy: false,
      login: blankLogin(email), toasts: model.ui.toasts, toastSeq: model.ui.toastSeq,
      tokenOpen: false,
      energy: { period: "month", anchor: null, snapshot: null, loading: false, error: null },
    },
  };
}
