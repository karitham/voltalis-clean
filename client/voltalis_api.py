"""Small client for the API used by the current MyVoltalis web/mobile app.

Reverse engineered from myvoltalis.com's Vue bundle (Nov 2026). No third-party
dependencies. All mutations are explicit methods; nothing writes without being
called. Credentials/tokens stay in a local 0600 config file.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable

BASE = "https://api.myvoltalis.com"
DEFAULT_CONFIG = Path(os.environ.get("VOLTALIS_CONFIG", "~/.config/voltalis/config.json")).expanduser()

# Modes and types as enumerated by the app's generated API client.
MODES = ["NORMAL", "CONFORT", "CONFORTMINUS1", "CONFORTMINUS2", "ECO", "ECOV", "HORS_GEL", "TEMPERATURE"]
APPLIANCE_TYPES = [
    "WATER_HEATER", "HEATER", "HEATING_FLOOR", "AIR_CONDITIONING",
    "REVERSIBLE_AIR_CONDITIONING", "HEAT_PUMP", "REVERSIBLE_HEAT_PUMP",
    "RADIANT_CEILING", "ACCUMULATOR", "BATHROOM_HEATER", "HEAT_PUMP_WITH_ECS",
    "REVERSIBLE_HEAT_PUMP_WITH_ECS", "PROGRAMMABLE_WATER_HEATER",
    "PROGRAMMABLE_ACCUMULATOR", "PROGRAMMABLE_EQUIPMENT",
    "PROGRAMMABLE_HEATING_FLOOR", "UNKNOWN", "OTHER",
]
PROGRAM_TYPES = ["DEFAULT", "USER", "QUICK", "MANUAL"]
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class APIError(Exception):
    def __init__(self, status: int, path: str, payload: Any):
        self.status, self.path, self.payload = status, path, payload
        super().__init__(f"HTTP {status} on {path}: {payload!r}")


def load_config(path: Path = DEFAULT_CONFIG) -> dict:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return {}


def save_config(values: dict, path: Path = DEFAULT_CONFIG) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(values, indent=2, sort_keys=True) + "\n")
    path.chmod(0o600)


class Transport:
    """HTTP transport, swappable in tests."""

    def __init__(self, base: str = BASE, timeout: float = 20.0, min_interval: float = 0.45):
        self.base, self.timeout = base.rstrip("/"), timeout
        self.min_interval = min_interval
        self._last = 0.0

    def __call__(self, method: str, path: str, body: Any = None,
                 params: dict | None = None, token: str | None = None) -> Any:
        # Voltalis enforces HTTP 429; community clients space requests ~500 ms.
        wait = self.min_interval - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.monotonic()
        url = self.base + path
        if params:
            url += "?" + urllib.parse.urlencode(params)
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        for attempt in range(2):
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw = resp.read().decode("utf-8")
                break
            except urllib.error.HTTPError as exc:
                raw = exc.read().decode("utf-8", "replace")
                if exc.code == 429 and attempt == 0:
                    delay = float(exc.headers.get("Retry-After") or 5.0)
                    time.sleep(delay)
                    self._last = time.monotonic()
                    continue
                try:
                    payload = json.loads(raw)
                except ValueError:
                    payload = raw
                raise APIError(exc.code, path, payload) from None
            except urllib.error.URLError as exc:
                raise APIError(0, path, str(exc.reason)) from None
        if not raw:
            return None
        try:
            return json.loads(raw)
        except ValueError:
            return raw


class Client:
    def __init__(self, email: str | None = None, password: str | None = None,
                 token: str | None = None, site_id: int | None = None,
                 transport: Callable | None = None, config_path: Path = DEFAULT_CONFIG):
        cfg = load_config(config_path)
        self.config_path = config_path
        self.email = email or cfg.get("email") or os.environ.get("VOLTALIS_EMAIL")
        self.password = password or cfg.get("password") or os.environ.get("VOLTALIS_PASSWORD")
        self.token = token or cfg.get("token") or os.environ.get("VOLTALIS_TOKEN")
        self.site_id = site_id or cfg.get("site_id") or os.environ.get("VOLTALIS_SITE_ID")
        self.transport = transport or Transport()
        if self.site_id is not None:
            self.site_id = int(self.site_id)

    # -- plumbing ---------------------------------------------------------
    def call(self, method: str, path: str, body: Any = None, params: dict | None = None,
             auth: bool = True) -> Any:
        return self.transport(method, path, body, params, self.token if auth else None)

    def save(self, **values: Any) -> None:
        cfg = load_config(self.config_path)
        cfg.update({k: v for k, v in values.items() if v is not None})
        save_config(cfg, self.config_path)

    def login(self, email: str | None = None, password: str | None = None) -> dict:
        email, password = email or self.email, password or self.password
        if not email or not password:
            raise ValueError("email and password required (flags, config, or VOLTALIS_* env)")
        data = self.call("POST", "/auth/login", {"login": email, "password": password}, auth=False)
        self.token = data["token"]
        self.email = email
        self.save(email=email, password=password, token=self.token)
        return self.account()

    def account(self) -> dict:
        return self.call("GET", "/api/account/me")

    def sites(self) -> list[dict]:
        return self.call("GET", "/api/site")

    def resolve_site(self) -> int:
        if self.site_id:
            return int(self.site_id)
        me = self.account()
        site = me.get("defaultSite") or (me.get("otherSites") or [None])[0]
        if not site:
            raise ValueError("no site in account; pass --site ID")
        self.site_id = int(site["id"])
        return self.site_id

    # -- appliances and overrides -----------------------------------------
    def appliances(self, site: int | None = None) -> list[dict]:
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/managed-appliance")

    def appliance(self, appliance_id: int, site: int | None = None) -> dict:
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/managed-appliance/{appliance_id}")

    def rename_appliance(self, appliance_id: int, name: str, site: int | None = None) -> dict:
        return self.call("PUT", f"/api/site/{site or self.resolve_site()}/managed-appliance/{appliance_id}", {"name": name})

    def set_temperature_sensor(self, appliance_id: int, celsius: float, site: int | None = None) -> dict:
        return self.call("PUT", f"/api/site/{site or self.resolve_site()}/managed-appliance/{appliance_id}/temperature",
                         {"temperatureMeasurement": celsius})

    def manual_settings(self, site: int | None = None) -> list[dict]:
        """Active manual overrides; each has id, idAppliance, mode, isOn, endDate..."""
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/manualsetting")

    def set_manual(self, setting_id: int, *, id_appliance: int, mode: str,
                   enabled: bool = True, is_on: bool = True, temperature: float | None = None,
                   until: str | None = None, until_further_notice: bool = False,
                   site: int | None = None) -> dict:
        """Start/stop a manual override. `until` is an ISO local datetime like 2026-11-26T22:00."""
        if mode not in MODES:
            raise ValueError(f"mode must be one of {MODES}")
        body = {
            "idAppliance": id_appliance,
            "mode": mode,
            "enabled": enabled,
            "isOn": is_on,
            "untilFurtherNotice": until_further_notice,
            "endDate": until,
            "temperatureTarget": temperature,
        }
        return self.call("PUT", f"/api/site/{site or self.resolve_site()}/manualsetting/{setting_id}", body)

    def quick_settings(self, site: int | None = None) -> list[dict]:
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/quicksettings")

    def set_quick_setting(self, setting_id: int, *, appliances: list[dict],
                          until: str | None = None, until_further_notice: bool = False,
                          site: int | None = None) -> dict:
        """appliances: [{'idAppliance': id, 'mode': 'ECO', 'isOn': True, 'temperatureTarget': None}]."""
        body = {"untilFurtherNotice": until_further_notice, "modeEndDate": until,
                "appliancesSettings": appliances}
        return self.call("PUT", f"/api/site/{site or self.resolve_site()}/quicksettings/{setting_id}", body)

    def enable_quick_setting(self, setting_id: int, enabled: bool = True, site: int | None = None) -> dict:
        return self.call("PUT", f"/api/site/{site or self.resolve_site()}/quicksettings/{setting_id}/enable",
                         {"enabled": enabled})

    # -- weekly programs ---------------------------------------------------
    def programs(self, site: int | None = None) -> list[dict]:
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/programming/program")

    def program(self, program_id: int, site: int | None = None) -> dict:
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/programming/program/{program_id}")

    def programming_state(self, site: int | None = None) -> dict:
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/programming/state")

    def create_program(self, name: str, copy_from: int | None = None, site: int | None = None) -> dict:
        body = {"name": name}
        if copy_from is not None:
            body["id"] = copy_from
        return self.call("POST", f"/api/site/{site or self.resolve_site()}/programming/program", body)

    def update_program(self, program_id: int, *, name: str | None = None,
                       enabled: bool | None = None, site: int | None = None) -> list[dict]:
        # The API expects both fields; the app sends the unchanged name when toggling.
        if name is None:
            name = self.program(program_id, site=site)["name"]
        body = {"name": name}
        if enabled is not None:
            body["enabled"] = enabled
        return self.call("PUT", f"/api/site/{site or self.resolve_site()}/programming/program/{program_id}", body)

    def back_to_schedule(self, appliance_id: int, setting_id: int, *, until: str,
                         site: int | None = None) -> dict:
        """Disable a manual override and hand control back to the active program."""
        return self.set_manual(setting_id, id_appliance=appliance_id, mode="NORMAL",
                               enabled=False, is_on=True, until=until, site=site)

    def delete_program(self, program_id: int, site: int | None = None) -> Any:
        return self.call("DELETE", f"/api/site/{site or self.resolve_site()}/programming/program/{program_id}")

    def reset_program(self, site: int | None = None) -> Any:
        # The app uses GET, not POST, for this action.
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/programming/reset")

    def update_dailyprogs(self, dailyprogs: list[dict], site: int | None = None) -> list[dict]:
        """Write whole daily programs. Fetch with program(), edit `dailyprogs`, pass them back."""
        return self.call("PUT", f"/api/site/{site or self.resolve_site()}/programming/dailyprog", dailyprogs)

    def duplicate_planning(self, body: dict, site: int | None = None) -> list[dict]:
        """body: {'idSource': planning_id, 'idProgram': program_id, 'idAppliances': [ids]}."""
        return self.call("PUT", f"/api/site/{site or self.resolve_site()}/programming/planning/", body)

    def energy_manager(self, site: int | None = None) -> dict:
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/energymanager")

    def home(self, site: int | None = None) -> dict:
        return self.call("GET", f"/api/site/{site or self.resolve_site()}/home")


def describe_program(program: dict) -> str:
    """Human-readable weekly schedule from a GET /programming/program/{id} response."""
    lines = [f"#{program.get('id')} {program.get('name')} enabled={program.get('enabled')}"]
    for plan in program.get("plannings", []):
        lines.append(f"  appliance {plan.get('idAppliance')} {plan.get('nameAppliance')} "
                     f"({plan.get('applianceType')}) planning={plan.get('id')}")
        modes = ", ".join(plan.get("availableModes") or [])
        if modes:
            lines.append(f"    available modes: {modes}")
        for day in sorted(plan.get("dailyprogs", []), key=lambda d: d.get("dayNumber") or 0):
            name = DAY_NAMES[day["dayNumber"] - 1] if 1 <= (day.get("dayNumber") or 0) <= 7 else "any"
            for r in day.get("ranges", []):
                temp = f" @{r['temperature']}C" if r.get("temperature") is not None else ""
                lines.append(f"    {name:3} {r.get('from')}-{r.get('to')} "
                             f"{r.get('mode')}{temp} on={r.get('isOn')}")
    return "\n".join(lines)
