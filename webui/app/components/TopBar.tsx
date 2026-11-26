import { Show, createSignal, onSettled } from "solid-js";
import { Msg } from "../core";
import { locale, t, toggleLocale } from "../i18n";
import type { ViewProps } from "../types";
import { statusOf } from "../presentation";
import { Button, Dot } from "./common";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function TopBar(props: ViewProps) {
  const status = () => statusOf(props.model);
  const notifications = () => props.model.data.welcome?.notificationsNumber ?? 0;
  const [installEvent, setInstallEvent] = createSignal<InstallEvent | null>(null);

  /* Chrome fires this once the manifest and service worker qualify the page. */
  onSettled(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  });

  const install = async () => {
    const event = installEvent();
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setInstallEvent(null);
  };
  return (
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">V</span>
        <span class="brand-name">Voltalis</span>
        <span class="brand-sub">{t("control")}</span>
      </div>
      <div class="topbar-spacer" />
      <span class="status" title={t(status().text)}>
        <Dot tone={status().dot} />
        <span>{t(status().text)}</span>
      </span>
      <Show when={notifications() > 0}>
        <a
          class="notify-chip"
          href="#health"
          title={notifications() === 1
            ? t("1 notification — view system health")
            : t("{n} notifications — view system health", { n: notifications() })}
          aria-label={notifications() === 1
            ? t("1 notification — view system health")
            : t("{n} notifications — view system health", { n: notifications() })}
        >
          <span class="notify-dot" aria-hidden="true" />
          {notifications()}
        </a>
      </Show>
      <button
        type="button"
        class="lang-btn"
        aria-label={locale() === "fr" ? t("Switch to English") : t("Switch to French")}
        title={locale() === "fr" ? t("Switch to English") : t("Switch to French")}
        onClick={() => toggleLocale()}
      >{locale() === "fr" ? "EN" : "FR"}</button>
      {props.model.ui.page === "dashboard" && props.model.session.sites.length > 1 && (
        <select
          class="site-select"
          aria-label={t("Site")}
          value={props.model.session.siteId ?? ""}
          onChange={e => props.dispatch(Msg.siteChanged(Number(e.currentTarget.value)))}
        >
          {props.model.session.sites.map(site => (
            <option value={site.id}>{site.name || t("This site")}</option>
          ))}
        </select>
      )}
      {props.model.ui.page === "dashboard" && (
        <>
          <button
            type="button"
            class="icon-btn"
            aria-label={t("Refresh data")}
            title={t("Refresh data")}
            onClick={() => props.dispatch(Msg.refreshRequested())}
          >↻</button>
          <Show when={installEvent()}>
            <Button variant="quiet" onClick={install}>{t("Install app")}</Button>
          </Show>
          <Button variant="quiet" onClick={() => props.dispatch(Msg.siteManageOpened())}>{t("Site")}</Button>
          <Button variant="quiet" onClick={() => props.dispatch(Msg.signOutRequested())}>{t("Sign out")}</Button>
        </>
      )}
    </header>
  );
}
