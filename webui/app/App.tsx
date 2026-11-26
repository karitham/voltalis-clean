import { Show, createEffect, onSettled } from "solid-js";
import { Msg } from "./core";
import type { ViewProps } from "./types";
import TopBar from "./components/TopBar";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ModalHost from "./components/ModalHost";
import Toasts from "./components/Toasts";

export default function App(props: ViewProps) {
  onSettled(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.dispatch(Msg.modalCloseRequested()); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* A slow refresh keeps temperatures and consumption from going stale. */
  createEffect(
    () => [props.model.ui.page, props.model.session.siteId] as const,
    ([page]) => {
      if (page !== "dashboard") return;
      const timer = setInterval(() => props.dispatch(Msg.refreshRequested()), 60_000);
      return () => clearInterval(timer);
    },
  );
  return (
    <div class="app">
      <TopBar model={props.model} dispatch={props.dispatch} />
      <main class="main">
        <Show when={props.model.ui.page === "login"} fallback={<Dashboard model={props.model} dispatch={props.dispatch} />}>
          <Login model={props.model} dispatch={props.dispatch} />
        </Show>
      </main>
      <ModalHost model={props.model} dispatch={props.dispatch} />
      <Toasts model={props.model} dispatch={props.dispatch} />
    </div>
  );
}
