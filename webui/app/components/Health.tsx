/* Diagnostics and alerts. Only states a person can act on stay visible; the
   sensor/manager wiring sits behind one collapsed line. */
import { Show } from "solid-js";
import { Msg, humanWords } from "../core";
import { safeText } from "../i18n";
import type { ViewProps } from "../types";
import { Button } from "./common";
import { t } from "../i18n";

export default function Health(props: ViewProps) {
  const rows = () => props.model.data.autodiag;
  const faults = () => rows().filter(row => row.status === "NOK" || row.status === "COMM_ERROR").length;
  const testable = () => rows().filter(row => row.diagTestEnabled && row.csModulatorId != null && row.csModulatorId !== "").length;
  const sensor = () => props.model.data.temperatureSensor;
  const manager = () => props.model.data.energyManager;
  const welcome = () => props.model.data.welcome;
  const alerts = () => props.model.data.rteAlerts;
  const alert = () => alerts()[0] ?? null;
  const message = () => {
    const title = safeText(welcome()?.messageTitle);
    const text = safeText(welcome()?.messageText);
    return title || text ? { title, text } : null;
  };

  return (
    <section class="section section-recessed health" id="health" aria-labelledby="health-title">
      <div class="section-head">
        <h2 class="section-title" id="health-title">{t("System health")}</h2>
        <div class="section-actions">
          <Show when={testable() > 0}>
            <Button variant="quiet" onClick={() => props.dispatch(Msg.diagAllRequested())}>{t("Test all appliances")}</Button>
          </Show>
        </div>
      </div>
      <div class="health-facts">
        <span class="fact"><b class={faults() > 0 ? "fact-value health-bad" : "health-zero"}>{faults()}</b>{faults() === 1 ? t(" fault") : t(" faults")}</span>
        <Show when={welcome()?.notificationsNumber}>
          <span class="fact"><b class="fact-value">{welcome()?.notificationsNumber}</b> {welcome()?.notificationsNumber === 1 ? t("notification") : t("notifications")}</span>
        </Show>
        <Show when={alert()}>
          {current => (
            <span class="fact">
              <b class="fact-value health-bad">{humanWords(current().alertLevel)}</b> {t("grid alert")}
            </span>
          )}
        </Show>
      </div>
      <Show when={message()}>
        {note => (
          <p class="health-note">
            <Show when={note().title}><b>{note().title}</b></Show>
            <Show when={note().text}><span>{note().title ? " " : ""}{note().text}</span></Show>
          </p>
        )}
      </Show>
      <details class="health-details">
        <summary>{t("Technical details")}</summary>
        <div class="health-facts">
          <span class="fact"><b class="fact-value">{testable()}</b> {t("testable")}</span>
          <span class="fact"><b class="fact-value">{sensor()?.hasTemperatureSensor ? t("Linked") : t("Not linked")}</b> {t("temperature sensor")}</span>
          <span class="fact"><b class="fact-value">{manager()?.hasEnergyManager ? t("Connected") : t("Not connected")}</b> {t("energy manager")}</span>
        </div>
      </details>
    </section>
  );
}
