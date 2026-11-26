/* Domain model for the Voltalis client. API payloads enter as unknown and are
 * parsed at the edge; everything below is the shape the UI and update reason about. */

export type SiteId = number;
export type ApplianceId = number;
export type ProgramId = number;
export type PlanningId = number;
export type ManualSettingId = number;
export type QuickSettingId = number;

export type Mode =
  | "NORMAL"
  | "CONFORT"
  | "CONFORTMINUS1"
  | "CONFORTMINUS2"
  | "ECO"
  | "ECOV"
  | "HORS_GEL"
  | "TEMPERATURE";

export type UiMode = Mode | "OFF";
export type ModeClass = "confort" | "eco" | "frost" | "temp";
export type DeviceFilter = "all" | "on" | "off" | "fault";
export type ConsumptionPeriod = "day" | "week" | "month" | "year";
export type Page = "login" | "dashboard";
export type ToastTone = "ok" | "bad";
import type { MessageKey } from "../i18n";
export type ProgType = "USER" | "MANUAL" | "QUICK" | "DEFAULT";
export type ProgramKind = "QUICK" | "USER";
export type OverrideDuration = "1" | "2" | "4" | "8" | "until" | "forever";
export type QuickPreset = "h1" | "h2" | "h3" | "h6" | "h12" | "h24" | "d3" | "d5" | "d7" | "d14" | "d21" | "custom" | "until";
export type SlotField = "from" | "to" | "mode" | "temp";

export interface ModeInfo { readonly v: Mode; readonly label: MessageKey; readonly cls: ModeClass }
export interface OverrideDurationInfo { readonly v: OverrideDuration; readonly label: MessageKey }
export interface QuickDurationInfo { readonly v: Exclude<QuickPreset, "custom" | "until">; readonly label: MessageKey; readonly ms: number }
export interface Site { id: SiteId; name?: string }
export interface LoginDraft { email: string; password: string; token: string }

/* ---------- API resources ---------- */

export interface Programming {
  progType?: ProgType | string;
  progName?: string | null;
  idManualSetting?: ManualSettingId | null;
  idPlanning?: PlanningId | null;
  isOn?: boolean;
  untilFurtherNotice?: boolean | null;
  mode?: Mode | string;
  endDate?: string | null;
  temperatureTarget?: number | string | null;
  defaultTemperature?: number | string | null;
  heatingLevel?: number | string | null;
  applianceType?: string;
  modulatorType?: string;
}

export interface Appliance {
  id: ApplianceId;
  name: string;
  applianceType?: "HEATER" | "WATER_HEATER" | string;
  modulatorType?: string;
  heatingLevel?: number | string | null;
  availableModes?: Mode[];
  programming?: Programming;
}

export interface ManualSetting {
  id: ManualSettingId;
  idAppliance: ApplianceId;
  enabled: boolean;
  isOn?: boolean;
  mode?: Mode | string;
  untilFurtherNotice?: boolean;
  endDate?: string | null;
  temperatureTarget?: number | string | null;
  applianceName?: string;
  applianceType?: string;
  heatingLevel?: number | string | null;
}

export interface QuickApplianceSetting {
  idAppliance: ApplianceId;
  applianceName?: string;
  isOn?: boolean;
  mode?: Mode | string;
  temperatureTarget?: number | string | null;
}

export interface QuickSetting {
  id: QuickSettingId;
  name?: string;
  enabled: boolean;
  untilFurtherNotice?: boolean;
  modeEndDate?: string | null;
  appliancesSettings?: QuickApplianceSetting[];
}

export interface Program { id: ProgramId; name: string; enabled: boolean }
export interface Range {
  from: string;
  to: string;
  mode?: Mode | string;
  temperature?: number | string | null;
  isOn?: boolean;
}
export interface DailyProg { id: number; dayNumber: number; ranges: Range[] }
export interface Planning {
  id: PlanningId;
  idAppliance: ApplianceId;
  nameAppliance?: string;
  applianceType?: string;
  availableModes?: Mode[];
  dailyprogs?: DailyProg[];
}
export interface ProgramDetail {
  id: ProgramId;
  name: string;
  enabled: boolean;
  plannings?: Planning[];
}
export interface ProgramState {
  id?: ProgramId;
  programType?: "USER" | "QUICK" | string;
  programName?: string;
  untilFurtherNotice?: boolean;
  endDate?: string | null;
}

export interface Autodiag {
  csApplianceId: ApplianceId;
  csModulatorId?: number | string | null;
  status?: string;
  consumptionStatus?: string;
  diagTestEnabled?: boolean;
  name?: string;
}

export interface Welcome {
  externalTemp: number | null;
  iconName: string;
  systemStatus: string;
  notificationsNumber: number;
  messageTitle: string;
  messageText: string;
}
export interface Savings {
  startDate: string;
  totalKwh: number;
  totalCurrency: number;
  co2Kg: number;
  hasNoProgramming: boolean;
}
export interface Objective { wh: number | null; currency: number | null }
export interface RteAlert { alertLevel: string; from: string; to: string }
export interface Realtime { value: number; unit: string }
export interface Geoloc {
  radius: number | null;
  activatedByUser: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface TemperatureSensor { hasTemperatureSensor: boolean; redirectionLink: string }
export interface EnergyManager { hasEnergyManager: boolean }
export interface ConsumptionPoint {
  timestamp: string;
  totalWh: number;
  totalCurrency: number;
  estimatedWh: number;
  peakWh: number;
  offPeakWh: number;
  temperatureC: number | null;
}
export interface ConsumptionSnapshot {
  period: ConsumptionPeriod;
  anchor: string;
  summary: ConsumptionPoint;
  points: ConsumptionPoint[];
  perAppliance: Array<{ applianceId: number; totalWh: number }>;
}
export interface EnergyState {
  period: ConsumptionPeriod;
  anchor: string | null;
  snapshot: ConsumptionSnapshot | null;
  loading: boolean;
  error: string | null;
}
export interface Account { defaultSite?: Site; otherSites?: Site[] }
export interface LoginResponse { token: string }

export interface ConnectionInfo { text: MessageKey; tone: "ok" | "nok" | "test" | "none" | "error" }
export interface QuickFlag { id: QuickSettingId; enabled: boolean }

/* ---------- model ---------- */

export interface Session {
  kind: "anon" | "live" | "demo";
  token: string;
  email: string;
  siteId: SiteId | null;
  sites: Site[];
}

export interface Data {
  appliances: Appliance[];
  manual: ManualSetting[];
  quick: QuickSetting[];
  programs: Program[];
  programDetail: ProgramDetail | null;
  state: ProgramState | null;
  autodiag: Autodiag[];
  welcome: Welcome | null;
  realtime: Realtime | null;
  geoloc: Geoloc | null;
  temperatureSensor: TemperatureSensor | null;
  energyManager: EnergyManager | null;
  savings: Savings | null;
  objective: Objective | null;
  rteAlerts: RteAlert[];
}

export interface Toast { id: number; text: string; tone: ToastTone }
export interface Selection { aDay: number; aHour: number; day: number; hour: number }
export interface Rect { day1: number; day2: number; hour1: number; hour2: number }

export interface OverrideModal {
  kind: "override";
  applianceId: ApplianceId;
  mode: UiMode;
  duration: OverrideDuration;
  target: string;
}
export interface SlotModal {
  kind: "slot";
  day: number;
  hour: number;
  from: string;
  to: string;
  mode: UiMode;
  temp: number | string;
  isOn: boolean;
}
export interface RangeModal {
  kind: "range";
  day1: number;
  day2: number;
  hour1: number;
  hour2: number;
  mode: UiMode;
  temp: number | string;
}
export interface NewProgramModal { kind: "newProgram"; name: string }
export interface ProgramManageModal {
  kind: "programManage";
  id: ProgramId;
  mode: "edit" | "duplicate" | "delete";
  name: string;
  copyName: string;
}
export interface BulkModal {
  kind: "bulk";
  action: "off" | "resume";
}
export interface CalibrateModal {
  kind: "calibrate";
  applianceId: ApplianceId;
  value: string;
}
export interface SiteManageModal {
  kind: "siteManage";
  name: string;
}
export interface RenameApplianceModal {
  kind: "renameAppliance";
  applianceId: ApplianceId;
  name: string;
}
export interface CopyDayModal {
  kind: "copyDay";
  sourceDay: number;
  targets: number[];
}
export interface CopyPlanModal {
  kind: "copyPlan";
  programId: ProgramId;
  sourceId: PlanningId;
  sourceApplianceId: ApplianceId;
  targets: ApplianceId[];
}
export interface QuickConfigRow {
  idAppliance: ApplianceId;
  name: string;
  isOn: boolean;
  mode: Mode | string;
  temperatureTarget: number | string | null;
}
export interface QuickConfigModal {
  kind: "quickConfig";
  id: QuickSettingId;
  name: string;
  untilFurtherNotice: boolean;
  preset: QuickPreset;
  end: string;
  rows: QuickConfigRow[];
}
export interface DiagModal { kind: "diag"; applianceId: ApplianceId }

export type ModalState =
  | OverrideModal | SlotModal | RangeModal | NewProgramModal | ProgramManageModal
  | SiteManageModal | RenameApplianceModal | CopyDayModal | CopyPlanModal | QuickConfigModal | BulkModal | CalibrateModal | DiagModal;

export interface Ui {
  page: Page;
  modal: ModalState | null;
  sel: Selection | null;
  selectedApplianceId: ApplianceId | null;
  deviceFilter: DeviceFilter;
  loginError: string;
  busy: boolean;
  login: LoginDraft;
  toasts: Toast[];
  toastSeq: number;
  tokenOpen: boolean;
  energy: EnergyState;
}

export interface Model {
  session: Session;
  data: Data;
  ui: Ui;
}

/* ---------- effects and messages ---------- */

export interface ResponseMeta {
  method: string;
  path: string;
  status: number | "demo" | null;
  siteId: SiteId | null;
}
export interface ApiError { status: number; message: string }
export interface HttpTags {
  ok: (payload: unknown, meta: ResponseMeta) => Msg;
  fail: (error: ApiError, meta: ResponseMeta) => Msg;
}

export type Effect =
  | { kind: "http"; method: "GET" | "POST" | "PUT" | "DELETE"; path: string; body: unknown | null; tags: HttpTags; siteId: SiteId | null; defer?: boolean; auth?: boolean }
  | { kind: "store"; key: string; value: string | null }
  | { kind: "toast"; text: string; tone: ToastTone }
  | { kind: "delay"; ms: number; tags: { ok: () => Msg } }
  | { kind: "focus"; selector: string }
  | { kind: "scroll"; selector: string; block: ScrollLogicalPosition }
  | { kind: "demoReset" };

export type HttpEffect = Extract<Effect, { kind: "http" }>;

export type OkMessage<T extends string, P = unknown> = { type: T; payload: P; meta: ResponseMeta | null };
export type ErrMessage<T extends string> = { type: T; error: ApiError; meta: ResponseMeta | null };

export type Msg =
  | { type: "sessionRestored"; token: string; email: string; siteId: SiteId | null }
  | { type: "loginFieldChanged"; field: keyof LoginDraft; value: string }
  | { type: "loginSubmitted" } | { type: "tokenSubmitted" } | { type: "demoRequested" } | { type: "signOutRequested" }
  | { type: "siteChanged"; siteId: SiteId }
  | { type: "siteManageOpened" }
  | { type: "siteNameChanged"; name: string }
  | { type: "siteNameSubmitted" }
  | { type: "siteDefaultRequested" }
  | { type: "applianceSelected"; applianceId: ApplianceId }
  | { type: "applianceRenameOpened"; applianceId: ApplianceId }
  | { type: "applianceRenameNameChanged"; name: string }
  | { type: "applianceRenameSubmitted" }
  | { type: "overrideOpened"; applianceId: ApplianceId }
  | { type: "overrideModeChanged"; mode: UiMode }
  | { type: "overrideDurationChanged"; duration: OverrideDuration }
  | { type: "overrideTargetChanged"; target: string }
  | { type: "overrideSubmitted"; now: number }
  | { type: "autoRequested"; applianceId: ApplianceId; now: number }
  | { type: "slotOpened"; day: number; hour: number }
  | { type: "slotFieldChanged"; field: SlotField; value: string | number }
  | { type: "slotSaveRequested" } | { type: "slotDeleteRequested" }
  | { type: "selectStarted"; day: number; hour: number }
  | { type: "selectExtended"; day: number; hour: number }
  | { type: "selectCommitted" } | { type: "selectCancelled" }
  | { type: "rangeModeChanged"; mode: UiMode }
  | { type: "rangeTempChanged"; value: string | number }
  | { type: "rangeApplied" }
  | { type: "deviceFilterChanged"; filter: DeviceFilter }
  | { type: "planTabSelected"; planningId: PlanningId }
  | { type: "programSwitchRequested"; kind: ProgramKind; id: number; on: boolean }
  | { type: "programEditRequested"; programId: ProgramId }
  | { type: "newProgramOpened" }
  | { type: "newProgramNameChanged"; name: string }
  | { type: "newProgramSubmitted" }
  | { type: "programManageOpened"; programId: ProgramId }
  | { type: "programManageModeChanged"; mode: "edit" | "duplicate" | "delete" }
  | { type: "programManageNameChanged"; name: string }
  | { type: "programRenameSubmitted" } | { type: "programDuplicateSubmitted" } | { type: "programDeleteConfirmed" }
  | { type: "copyDayOpened" }
  | { type: "copyDaySourceChanged"; day: number }
  | { type: "copyDayTargetToggled"; day: number }
  | { type: "copyDaySubmitted" }
  | { type: "copyPlanOpened" }
  | { type: "copyPlanTargetToggled"; applianceId: ApplianceId }
  | { type: "copyPlanSubmitted" }
  | { type: "quickConfigOpened"; quickId: QuickSettingId; now: number }
  | { type: "quickConfigDurationChanged"; preset: QuickPreset; now: number }
  | { type: "quickConfigEndChanged"; value: string }
  | { type: "quickConfigRowOnToggled"; applianceId: ApplianceId; on: boolean }
  | { type: "quickConfigRowModeChanged"; applianceId: ApplianceId; mode: string }
  | { type: "quickConfigRowTempChanged"; applianceId: ApplianceId; value: string }
  | { type: "quickConfigSubmitted"; now: number }
  | { type: "diagOpened"; applianceId: ApplianceId }
  | { type: "diagRefreshRequested" } | { type: "diagTestRequested" }
  | { type: "geolocToggleRequested"; on: boolean }
  | { type: "energyRequested"; period: ConsumptionPeriod; now: number }
  | { type: "energyShifted"; delta: number; now: number }
  | { type: "diagAllRequested" }
  | { type: "refreshRequested" }
  | { type: "quickRestoreRequested" }
  | { type: "calibrationOpened"; applianceId: ApplianceId }
  | { type: "calibrationValueChanged"; value: string }
  | { type: "calibrationSubmitted" }
  | { type: "bulkOpened"; action: "off" | "resume" }
  | { type: "bulkConfirmed"; action: "off" | "resume"; now: number }
  | { type: "modalCloseRequested" }
  | { type: "toastShown"; text: string; tone: ToastTone }
  | { type: "toastDismissed"; toastId: number } | { type: "toastExpired"; toastId: number }
 | { type: "tokenSectionToggled"; open: boolean }
  | { type: "noop" }
  | OkMessage<"loginSucceeded", LoginResponse>
  | OkMessage<"meLoaded", Account>
  | OkMessage<"siteRenamed">
  | OkMessage<"siteDefaulted">
  | OkMessage<"appliancesLoaded", Appliance[]>
  | OkMessage<"manualLoaded", ManualSetting[]>
  | OkMessage<"quickLoaded", QuickSetting[]>
  | OkMessage<"programsLoaded", Program[]>
  | OkMessage<"programStateLoaded", ProgramState | null>
  | OkMessage<"programDetailLoaded", ProgramDetail | null>
  | OkMessage<"applianceRenamed">
  | OkMessage<"overrideApplied">
  | OkMessage<"autoRestored">
  | OkMessage<"slotWritten"> | OkMessage<"slotRemoved"> | OkMessage<"rangeWritten">
  | OkMessage<"autodiagLoaded", Autodiag[]>
  | OkMessage<"programSwitchedOn"> | OkMessage<"programSwitchedOff">
  | OkMessage<"quickSwitchedOn", QuickFlag[]> | OkMessage<"quickSwitchedOff", QuickFlag[]>
  | OkMessage<"programCreated", Program>
  | OkMessage<"programRenamed"> | OkMessage<"programDuplicated"> | OkMessage<"programDeleted">
  | OkMessage<"copyDayWritten">
  | OkMessage<"copyPlanWritten"> | OkMessage<"quickConfigured"> | OkMessage<"diagTestStarted">
  | OkMessage<"welcomeLoaded"> | OkMessage<"realtimeLoaded"> | OkMessage<"geolocLoaded"> | OkMessage<"geolocSaved">
  | OkMessage<"energyLoaded"> | OkMessage<"temperatureSensorLoaded"> | OkMessage<"energyManagerLoaded">
  | OkMessage<"savingsLoaded"> | OkMessage<"objectiveLoaded"> | OkMessage<"rteAlertsLoaded">
  | OkMessage<"calibrationSaved"> | OkMessage<"bulkApplied"> | OkMessage<"quickRestored">
  | OkMessage<"diagAllStarted">
  | ErrMessage<"autodiagFailed"> | ErrMessage<"welcomeFailed"> | ErrMessage<"realtimeFailed">
  | ErrMessage<"geolocFailed"> | ErrMessage<"loginFailed"> | ErrMessage<"meFailed">
  | ErrMessage<"loadFailed"> | ErrMessage<"actionFailed">
  | ErrMessage<"energyFailed">;

export interface UpdateResult { model: Model; effects: Effect[] }
export type MsgFactory = () => Msg;
