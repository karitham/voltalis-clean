import { For } from "solid-js";
import { Msg } from "../core";
import type { ViewProps } from "../types";
import { t } from "../i18n";

export default function Toasts(props: ViewProps) {
  return (
    <div class="toasts" aria-live="polite">
      <For each={props.model.ui.toasts}>
        {toast => (
          <button
            type="button"
            class={["toast", toast.tone === "bad" && "toast-bad"].filter(Boolean).join(" ")}
            onClick={() => props.dispatch(Msg.toastDismissed(toast.id))}
          >{t(toast.text)}</button>
        )}
      </For>
    </div>
  );
}
