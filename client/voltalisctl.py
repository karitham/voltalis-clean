#!/usr/bin/env python3
"""voltalisctl - talk to MyVoltalis without the app. See README.md."""
from __future__ import annotations

import argparse
import getpass
import json
import sys
from pathlib import Path

from voltalis_api import (APIError, DEFAULT_CONFIG, MODES, Client,
                          describe_program)


def emit(value, as_json: bool) -> None:
    if as_json:
        print(json.dumps(value, indent=2, ensure_ascii=False, default=str))
    elif isinstance(value, str):
        print(value)
    elif isinstance(value, list):
        for item in value:
            print(json.dumps(item, ensure_ascii=False, default=str) if isinstance(item, dict) else item)
    elif isinstance(value, dict):
        print(json.dumps(value, indent=2, ensure_ascii=False, default=str))
    elif value is not None:
        print(value)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Control Voltalis radiators and programs over the app's API")
    p.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="credentials file (default: %(default)s)")
    p.add_argument("--site", type=int, help="site id (default: account's defaultSite)")
    p.add_argument("--json", action="store_true", help="machine-readable output")
    p.add_argument("--dry-run", action="store_true", help="print the request instead of sending writes")
    sub = p.add_subparsers(dest="cmd", required=True)

    q = sub.add_parser("login", help="store email/password and obtain a token")
    q.add_argument("--email")
    q.add_argument("--password", help="omit to prompt (or set VOLTALIS_PASSWORD)")
    q.add_argument("--token", help="skip password login, store an existing bearer token")

    sub.add_parser("whoami", help="GET /api/account/me")
    sub.add_parser("sites", help="list sites")
    sub.add_parser("appliances", help="list managed appliances")
    q = sub.add_parser("appliance", help="one appliance, including its current programming")
    q.add_argument("id", type=int)
    sub.add_parser("manual", help="list current manual overrides")
    sub.add_parser("quick", help="list quick settings")

    q = sub.add_parser("mode", help="set a manual override on one appliance")
    q.add_argument("appliance", type=int)
    q.add_argument("mode", choices=MODES)
    q.add_argument("--temperature", type=float, help="required by TEMPERATURE mode")
    q.add_argument("--off", action="store_true", help="manual off (isOn=false, override stays active)")
    q.add_argument("--until", help="ISO local datetime, e.g. 2026-11-26T22:00")
    q.add_argument("--forever", action="store_true", help="until further notice")
    q.add_argument("--setting-id", type=int, help="manual-setting id (looked up by appliance if omitted)")

    q = sub.add_parser("auto", help="hand an appliance back to its weekly schedule")
    q.add_argument("appliance", type=int)
    q.add_argument("--until", help="ISO local datetime; defaults to now")
    q.add_argument("--setting-id", type=int)

    sub.add_parser("programs", help="list programs")
    q = sub.add_parser("program", help="show one program's weekly schedule")
    q.add_argument("id", type=int)
    q.add_argument("--raw", action="store_true", help="print the raw JSON instead")
    sub.add_parser("program-state", help="show active program / override state")
    q = sub.add_parser("program-create", help="create a program, optionally copying another")
    q.add_argument("name")
    q.add_argument("--copy", type=int, dest="copy_from")
    q = sub.add_parser("program-update", help="rename and/or activate a program")
    q.add_argument("id", type=int)
    q.add_argument("--name")
    q.add_argument("--enable", action="store_true")
    q.add_argument("--disable", action="store_true")
    q = sub.add_parser("program-delete", help="delete a program")
    q.add_argument("id", type=int)
    sub.add_parser("program-reset", help="reset programming (the app's own reset action)")
    q = sub.add_parser("dailyprog-write", help="PUT edited daily programs from a JSON file")
    q.add_argument("file", type=Path, help='JSON array of {"id":…,"dayNumber":…,"ranges":[…]}')
    q = sub.add_parser("quick-enable", help="start or stop a quick setting")
    q.add_argument("id", type=int)
    q.add_argument("--disable", action="store_true")
    q = sub.add_parser("raw", help="arbitrary API call, e.g. raw GET /api/site/123/home")
    q.add_argument("method", choices=["GET", "POST", "PUT", "DELETE"])
    q.add_argument("path")
    q.add_argument("--body", help="JSON string or @path/to/file")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    client = Client(site_id=args.site, config_path=args.config)

    if args.cmd == "login":
        if args.token:
            client.token = args.token
            client.save(token=args.token)
            emit({"token_saved": True}, args.json)
            return 0
        email = args.email or client.email or input("Email: ")
        password = args.password or client.password or os_getpass()
        emit(client.login(email, password), args.json)
        return 0

    if not client.token:
        raise SystemExit("not logged in: run `voltalisctl login` or set VOLTALIS_TOKEN")

    try:
        if args.cmd == "whoami":
            emit(client.account(), args.json)
        elif args.cmd == "sites":
            emit(client.sites(), args.json)
        elif args.cmd == "appliances":
            emit(client.appliances(), args.json)
        elif args.cmd == "appliance":
            emit(client.appliance(args.id), args.json)
        elif args.cmd == "manual":
            emit(client.manual_settings(), args.json)
        elif args.cmd == "quick":
            emit(client.quick_settings(), args.json)
        elif args.cmd == "mode":
            setting_id = args.setting_id or find_setting_id(client, args.appliance)
            if not setting_id:
                raise SystemExit(f"no manual setting for appliance {args.appliance}; "
                                 "open the app once or pass --setting-id")
            if args.mode == "TEMPERATURE" and args.temperature is None:
                raise SystemExit("TEMPERATURE mode needs --temperature")
            body = dict(id_appliance=args.appliance, mode=args.mode,
                        enabled=True, is_on=not args.off,
                        temperature=args.temperature, until=args.until,
                        until_further_notice=args.forever)
            if args.dry_run:
                emit({"PUT": f"/api/site/{client.resolve_site()}/manualsetting/{setting_id}", "body": body}, args.json)
            else:
                emit(client.set_manual(setting_id, site=client.site_id, **body), args.json)
        elif args.cmd == "auto":
            from datetime import datetime
            setting_id = args.setting_id or find_setting_id(client, args.appliance)
            if not setting_id:
                raise SystemExit(f"no manual setting for appliance {args.appliance}; pass --setting-id")
            until = args.until or datetime.now().replace(microsecond=0, second=0).isoformat()
            if args.dry_run:
                emit({"PUT": f"/api/site/{client.resolve_site()}/manualsetting/{setting_id}",
                      "body": {"idAppliance": args.appliance, "enabled": False,
                               "untilFurtherNotice": False, "endDate": until}}, args.json)
            else:
                emit(client.back_to_schedule(args.appliance, setting_id, until=until), args.json)
        elif args.cmd == "programs":
            emit(client.programs(), args.json)
        elif args.cmd == "program":
            data = client.program(args.id)
            emit(data if args.raw else describe_program(data), args.json and args.raw)
        elif args.cmd == "program-state":
            emit(client.programming_state(), args.json)
        elif args.cmd == "program-create":
            if args.dry_run:
                emit({"POST": "/api/site/…/programming/program", "body": {"name": args.name,
                     "id": args.copy_from}}, args.json)
            else:
                emit(client.create_program(args.name, args.copy_from), args.json)
        elif args.cmd == "program-update":
            enabled = True if args.enable else False if args.disable else None
            if args.dry_run:
                emit({"PUT": f"/api/site/…/programming/program/{args.id}",
                      "body": {"name": args.name, "enabled": enabled}}, args.json)
            else:
                emit(client.update_program(args.id, name=args.name, enabled=enabled), args.json)
        elif args.cmd == "program-delete":
            if args.dry_run:
                emit({"DELETE": f"/api/site/…/programming/program/{args.id}"}, args.json)
            else:
                emit(client.delete_program(args.id), args.json)
        elif args.cmd == "program-reset":
            if args.dry_run:
                emit({"GET": "/api/site/…/programming/reset"}, args.json)
            else:
                emit(client.reset_program(), args.json)
        elif args.cmd == "dailyprog-write":
            data = json.loads(args.file.read_text() if not str(args.file).startswith("@")
                              else Path(str(args.file)[1:]).read_text())
            if args.dry_run:
                emit({"PUT": "/api/site/…/programming/dailyprog", "body": data}, args.json)
            else:
                emit(client.update_dailyprogs(data), args.json)
        elif args.cmd == "quick-enable":
            if args.dry_run:
                emit({"PUT": f"/api/site/…/quicksettings/{args.id}/enable",
                      "body": {"enabled": not args.disable}}, args.json)
            else:
                emit(client.enable_quick_setting(args.id, not args.disable), args.json)
        elif args.cmd == "raw":
            body = None
            if args.body:
                body = json.loads(Path(args.body[1:]).read_text() if args.body.startswith("@") else args.body)
            if args.dry_run and args.method != "GET":
                emit({args.method: args.path, "body": body}, args.json)
            else:
                emit(client.call(args.method, args.path, body), args.json)
    except APIError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


def find_setting_id(client: Client, appliance_id: int) -> int | None:
    """ appliances[].programming.idManualSetting is the app's own shortcut. """
    for appliance in client.appliances():
        if appliance.get("id") == appliance_id:
            sid = (appliance.get("programming") or {}).get("idManualSetting")
            if sid:
                return sid
    for setting in client.manual_settings():
        if setting.get("idAppliance") == appliance_id:
            return setting.get("id")
    return None


def os_getpass() -> str:
    return getpass.getpass("Password: ")


if __name__ == "__main__":
    raise SystemExit(main())
