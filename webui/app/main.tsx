import { createSignal, flush } from "solid-js";
import { render } from "@solidjs/web";
import { init } from "./core";
import type { Model } from "./types";
import { createShell } from "./shell";
import App from "./App.jsx";
import "./fonts.css";
import "./styles.css";

const initial: Model = init().model;
const [model, setModel] = createSignal<Model>(initial);
const shell = createShell(next => { setModel(next); flush(); });

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root mount");
render(() => <App model={model()} dispatch={shell.dispatch} />, root);
shell.hydrate();

/* Installable shell: the service worker is a no-op on file:// or plain http hosts. */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
