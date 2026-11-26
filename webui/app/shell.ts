/* Impure MVU shell: batching, effects, storage and transport.
 * The core stays pure; this file is the only place that touches the browser.
 */
import { init, update, Msg, STORE, BASE, MIN_INTERVAL_MS, readableError } from "./core";
import type { Effect, HttpEffect, Model, Msg as MsgValue, ResponseMeta } from "./model/types";
import { createDemo } from "./demo";
import { localeCode, t } from "./i18n";

function sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }
function idNumber(value: string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function createShell(commit: (model: Model) => void) {
  let state: Model = init().model;
  let pending: MsgValue[] = [];
  let draining = false;
  let writeTail: Promise<unknown> = Promise.resolve();
  let lastWrite = 0;
  let readsInFlight = 0;
  const readWaiters: Array<() => void> = [];
  const READ_CONCURRENCY = 4;
  const READ_STAGGER_MS = 40;
  const demo = createDemo();

  function getModel(): Model { return state; }

  function dispatch(msg: MsgValue): void {
    pending.push(msg);
    if (draining) return;
    draining = true;
    try {
      /* One commit per drained batch: a burst of async reads paints once. Effects
         that dispatch new messages get their own batch below. */
      while (pending.length) {
        let effects: Effect[] = [];
        let dirty = false;
        while (pending.length) {
          const msg = pending.shift();
          if (!msg) continue;
          const result = update(state, msg);
          if (!result.model) continue;
          if (result.model !== state) { state = result.model; dirty = true; }
          if (result.effects.length) effects = effects.concat(result.effects);
        }
        if (dirty) commit(state);
        runEffects(effects);
      }
    } finally {
      draining = false;
    }
  }

  function runEffects(effects: readonly Effect[]): void {
    const now: Effect[] = [];
    const later: Effect[] = [];
    for (const effect of effects) {
      if (effect.kind === "http" && effect.defer) later.push(effect);
      else now.push(effect);
    }
    now.forEach(runEffect);
    if (later.length) setTimeout(() => later.forEach(runEffect), 0);
  }

  function runEffect(effect: Effect): void {
    switch (effect.kind) {
      case "http": runHttp(effect); return;
      case "store":
        try {
          if (effect.value === null) localStorage.removeItem(effect.key);
          else localStorage.setItem(effect.key, effect.value);
        } catch { /* storage disabled */ }
        return;
      case "toast": dispatch(Msg.toastShown(effect.text, effect.tone)); return;
      case "delay":
        setTimeout(() => dispatch(effect.tags.ok()), effect.ms);
        return;
      case "focus": {
        const el = document.querySelector<HTMLElement>(effect.selector);
        el?.focus();
        return;
      }
      case "scroll": {
        const el = document.querySelector<HTMLElement>(effect.selector);
        el?.scrollIntoView({ behavior: "smooth", block: effect.block });
        return;
      }
      case "demoReset": demo.reset(); return;
    }
  }

  /* Reads are independent and can run together; writes still go one at a time with
     the API's 450 ms spacing, because a burst of writes is what gets throttled. */
  async function withReadSlot<T>(task: () => Promise<T>): Promise<T> {
    if (readsInFlight >= READ_CONCURRENCY) {
      await new Promise<void>(resolve => readWaiters.push(resolve));
    }
    readsInFlight += 1;
    try {
      await sleep(READ_STAGGER_MS);
      return await task();
    } finally {
      readsInFlight -= 1;
      readWaiters.shift()?.();
    }
  }

  function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
    const run = writeTail
      .then(() => {
        const wait = MIN_INTERVAL_MS - (Date.now() - lastWrite);
        return wait > 0 ? sleep(wait) : null;
      })
      .then(() => { lastWrite = Date.now(); return task(); });
    writeTail = run.catch(() => undefined);
    return run;
  }

  async function request(effect: HttpEffect): Promise<{ ok: boolean; status: number; data: unknown }> {
    const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": localeCode() };
    if (effect.method !== "GET") headers["Content-Type"] = "application/json";
    const current = getModel();
    if (effect.auth !== false && current.session.token) headers.Authorization = "Bearer " + current.session.token;
    const init: RequestInit = { method: effect.method, headers };
    if (effect.body !== undefined && effect.body !== null) init.body = JSON.stringify(effect.body);

    async function attempt(n: number): Promise<{ ok: boolean; status: number; data: unknown }> {
      const res = await fetch(BASE + effect.path, init);
      const raw = await res.text();
      let data: unknown = null;
      try { data = raw ? JSON.parse(raw) as unknown : null; } catch { data = raw; }
      if (res.status === 429 && n === 0) {
        const header = Number(res.headers.get("retry-after"));
        await sleep(header ? header * 1000 : 5000);
        lastWrite = Date.now();
        return attempt(1);
      }
      return { ok: res.ok, status: res.status, data };
    }
    return attempt(0);
  }

  function runHttp(effect: HttpEffect): void {
    const meta: ResponseMeta = {
      method: effect.method, path: effect.path, status: null,
      siteId: effect.siteId,
    };
    const current = getModel();
    if (current.session.kind === "demo") {
      meta.status = "demo";
      const payload = demo.api(current, effect.method, effect.path, effect.body);
      dispatch(effect.tags.ok(payload, meta));
      return;
    }
    const run = effect.method === "GET"
      ? withReadSlot(() => request(effect))
      : enqueueWrite(() => request(effect));
    run.then(res => {
      meta.status = res.status;
      if (res.ok) {
        dispatch(effect.tags.ok(res.data, meta));
        return;
      }
      dispatch(effect.tags.fail({ status: res.status, message: readableError(res.data, res.status) }, meta));
    }, err => {
      meta.status = 0;
      const message = t("Network error: {message}", { message: err instanceof Error ? err.message : String(err) });
      dispatch(effect.tags.fail({ status: 0, message }, meta));
    });
  }

  function hydrate(): void {
    const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
    const token = read(STORE.token);
    const email = read(STORE.email) ?? "";
    const site = idNumber(read(STORE.site));
    if (token) dispatch(Msg.sessionRestored(token, email, site));
  }

  return { dispatch, getModel, hydrate };
}
