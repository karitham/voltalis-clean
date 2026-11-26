/* Shared primitives. Variants change fill, never geometry. */
import { Show, createMemo } from "solid-js";
import type { JSX } from "@solidjs/web";
import { t } from "../i18n";

interface ButtonProps {
  variant?: "primary" | "secondary" | "quiet" | "danger" | string;
  class?: string;
  disabled?: boolean;
  title?: string;
  pressed?: boolean;
  children?: JSX.Element;
  onClick?: (event: MouseEvent) => void;
}
export function Button(props: ButtonProps) {
  const variant = props.variant ? (props.variant.startsWith("btn-") ? props.variant : "btn-" + props.variant) : null;
  const cls = ["btn", variant, props.class].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      class={cls}
      disabled={props.disabled}
      title={props.title}
      aria-pressed={props.pressed === undefined ? undefined : props.pressed ? "true" : "false"}
      onClick={props.onClick}
    >{props.children}</button>
  );
}

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  title?: string;
  label: string;
  onChange: (checked: boolean) => void;
}
export function Switch(props: SwitchProps) {
  return (
    <label class="switch" title={props.title}>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        aria-label={props.label}
        onChange={e => props.onChange(e.currentTarget.checked)}
      />
      <span />
    </label>
  );
}

interface FieldProps {
  id: string;
  label: string;
  class?: string;
  children?: JSX.Element;
}
export function Field(props: FieldProps) {
  return (
    <div class={["field", props.class].filter(Boolean).join(" ")}>
      <label for={props.id}>{props.label}</label>
      {props.children}
    </div>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children?: JSX.Element;
}
export function Modal(props: ModalProps) {
  return (
    <div class="modal-back" onClick={e => { if (e.target === e.currentTarget) props.onClose(); }}>
      <section class="modal" role="dialog" aria-modal="true" aria-label={props.title}>
        <header class="modal-head">
          <h2>{props.title}</h2>
          <button class="icon-btn" type="button" aria-label={t("Close")} onClick={props.onClose}>×</button>
        </header>
        {props.children}
      </section>
    </div>
  );
}

export function Temperature(props: { value: string }) {
  const parts = createMemo(() => {
    const match = props.value.match(/^([^.,]+)([.,])(\d+)(.*)$/);
    return match ? { whole: match[1], decimal: match[2] + match[3], unit: match[4] } : null;
  });
  return (
    <Show when={parts()} fallback={<>{props.value}</>}>
      {value => (
        <>
          {value().whole}
          <span class="temperature-decimal">{value().decimal}</span>
          <span class="temperature-unit">{value().unit}</span>
        </>
      )}
    </Show>
  );
}

export function Empty(props: { children?: JSX.Element }) {
  return <p class="empty">{props.children}</p>;
}

export function Dot(props: { tone?: string }) {
  return <span class={["dot", props.tone].filter(Boolean).join(" ")} />;
}
