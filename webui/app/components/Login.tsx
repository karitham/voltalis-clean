import { Msg } from "../core";
import { t } from "../i18n";
import type { ViewProps } from "../types";
import { Button, Field } from "./common";

export default function Login(props: ViewProps) {
  const login = () => props.model.ui.login;
  const busy = () => props.model.ui.busy;
  return (
    <section class="login">
      <div class="login-intro">
        <h1>{t("Your radiators.")}<br />{t("Your rules.")}</h1>
        <p class="lede">
          {t("Connect with your MyVoltalis account to control heating and weekly schedules.")}
        </p>
        <p class="privacy">
          <strong>{t("Private by design.")}</strong>{" "}
          {t("This page talks to Voltalis straight from your browser. Your token stays in this browser’s local storage — it is never sent to this site’s server.")}
        </p>
      </div>
      <form class="login-form" onSubmit={e => { e.preventDefault(); props.dispatch(Msg.loginSubmitted()); }}>
        <Field id="email" label={t("MyVoltalis email")}>
          <input
            id="email"
            type="email"
            autocomplete="username"
            placeholder="you@example.com"
            value={login().email}
            onInput={e => props.dispatch(Msg.loginFieldChanged("email", e.currentTarget.value))}
          />
        </Field>
        <Field id="password" label={t("Password")}>
          <input
            id="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            value={login().password}
            onInput={e => props.dispatch(Msg.loginFieldChanged("password", e.currentTarget.value))}
          />
        </Field>
        <div class="login-actions">
          <Button variant="primary" disabled={busy()} onClick={() => props.dispatch(Msg.loginSubmitted())}>
            {busy() ? t("Connecting…") : t("Connect")}
          </Button>
          <Button variant="quiet" onClick={() => props.dispatch(Msg.demoRequested())}>{t("Try demo")}</Button>
        </div>
        <details
          class="token-details"
          open={props.model.ui.tokenOpen}
          onToggle={e => props.dispatch(Msg.tokenSectionToggled(e.currentTarget.open))}
        >
          <summary>{t("Already have a token?")}</summary>
          <Field id="tokenInput" label={t("Bearer token")}>
            <input
              id="tokenInput"
              type="password"
              placeholder={t("paste token")}
              value={login().token}
              onInput={e => props.dispatch(Msg.loginFieldChanged("token", e.currentTarget.value))}
            />
          </Field>
          <Button onClick={() => props.dispatch(Msg.tokenSubmitted())}>{t("Use token")}</Button>
        </details>
        {props.model.ui.loginError && <p class="form-error">{t(props.model.ui.loginError)}</p>}
      </form>
    </section>
  );
}
