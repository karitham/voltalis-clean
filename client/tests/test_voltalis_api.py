"""Offline tests: no network, no credentials, no writes to a real account."""
import json
import os
import tempfile
import unittest
from pathlib import Path

from voltalis_api import APIError, Client, describe_program

SITE = 42


class FakeTransport:
    def __init__(self, **responses):
        self.responses = responses
        self.calls = []

    def __call__(self, method, path, body=None, params=None, token=None):
        self.calls.append((method, path, body, params, token))
        key = f"{method} {path}"
        if key in self.responses:
            value = self.responses[key]
            if isinstance(value, Exception):
                raise value
            return value
        raise AssertionError(f"unexpected call {key}")


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cfg = Path(self.tmp.name) / "config.json"

    def tearDown(self):
        self.tmp.cleanup()

    def test_login_sends_expected_shape_and_caches_token(self):
        tr = FakeTransport(**{
            "POST /auth/login": {"token": "tok"},
            "GET /api/account/me": {"id": 7, "defaultSite": {"id": SITE}, "otherSites": []},
        })
        c = Client(transport=tr, config_path=self.cfg)
        me = c.login("me@example.com", "test-password")
        self.assertEqual(me["defaultSite"]["id"], SITE)
        self.assertEqual(tr.calls[0][2], {"login": "me@example.com", "password": "test-password"})
        self.assertEqual(tr.calls[0][4], None)
        self.assertEqual(tr.calls[1][4], "tok")
        self.assertEqual(json.loads(self.cfg.read_text())["token"], "tok")
        self.assertEqual(self.cfg.stat().st_mode & 0o777, 0o600)

    def test_site_resolution_and_appliance_reads(self):
        tr = FakeTransport(**{
            "GET /api/account/me": {"defaultSite": {"id": SITE}, "otherSites": []},
            "GET /api/site/42/managed-appliance": [{"id": 11, "name": "salon"}],
            "GET /api/site/42/managed-appliance/11": {"id": 11, "programming": {"mode": "ECO"}},
        })
        c = Client(token="tok", transport=tr, config_path=self.cfg)
        self.assertEqual(c.resolve_site(), SITE)
        self.assertEqual(c.appliances()[0]["name"], "salon")
        self.assertEqual(c.appliance(11)["programming"]["mode"], "ECO")
        self.assertTrue(all(call[4] == "tok" for call in tr.calls))

    def test_manual_override_write(self):
        tr = FakeTransport(**{"PUT /api/site/42/manualsetting/9": {"id": 9, "enabled": True}})
        c = Client(token="tok", site_id=SITE, transport=tr, config_path=self.cfg)
        c.set_manual(9, id_appliance=11, mode="ECO", until="2026-11-26T22:00")
        method, path, body, _, _ = tr.calls[0]
        self.assertEqual((method, path), ("PUT", "/api/site/42/manualsetting/9"))
        self.assertEqual(body, {"idAppliance": 11, "mode": "ECO", "enabled": True, "isOn": True,
                                "untilFurtherNotice": False, "endDate": "2026-11-26T22:00",
                                "temperatureTarget": None})
        with self.assertRaises(ValueError):
            c.set_manual(9, id_appliance=11, mode="NOPE")

    def test_program_write_endpoints(self):
        tr = FakeTransport(**{
            "GET /api/site/42/programming/program": [{"id": 3, "name": "nuit"}],
            "POST /api/site/42/programming/program": {"id": 4, "name": "copie"},
            "GET /api/site/42/programming/program/3": {"id": 3, "name": "nuit", "enabled": True},
            "PUT /api/site/42/programming/program/3": [{"id": 3, "enabled": False}],
            "DELETE /api/site/42/programming/program/3": None,
            "GET /api/site/42/programming/reset": {"ok": True},
            "PUT /api/site/42/programming/dailyprog": [{"id": 5}],
            "PUT /api/site/42/programming/planning/": [{"id": 6}],
        })
        c = Client(token="tok", site_id=SITE, transport=tr, config_path=self.cfg)
        c.programs()
        c.create_program("copie", copy_from=3)
        self.assertEqual(tr.calls[1][2], {"name": "copie", "id": 3})
        c.update_program(3, enabled=False)
        self.assertEqual(tr.calls[3][2], {"name": "nuit", "enabled": False})
        c.delete_program(3)
        c.reset_program()
        c.update_dailyprogs([{"id": 5}])
        c.duplicate_planning({"idSource": 6, "idProgram": 3, "idAppliances": [11]})
        self.assertEqual([c[0] for c in tr.calls], ["GET", "POST", "GET", "PUT", "DELETE", "GET", "PUT", "PUT"])

    def test_back_to_schedule(self):
        tr = FakeTransport(**{"PUT /api/site/42/manualsetting/9": {"id": 9, "enabled": False}})
        c = Client(token="tok", site_id=SITE, transport=tr, config_path=self.cfg)
        c.back_to_schedule(11, 9, until="2026-11-26T12:00:00")
        body = tr.calls[0][2]
        self.assertEqual(body["enabled"], False)
        self.assertEqual(body["untilFurtherNotice"], False)
        self.assertEqual(body["endDate"], "2026-11-26T12:00:00")

    def test_api_error_is_typed(self):
        tr = FakeTransport(**{"GET /api/site": APIError(401, "/api/site", [{"description": "missingtoken"}])})
        with self.assertRaises(APIError) as ctx:
            Client(token="bad", transport=tr, config_path=self.cfg).sites()
        self.assertEqual(ctx.exception.status, 401)

    def test_describe_program(self):
        program = {"id": 3, "name": "nuit", "enabled": True, "plannings": [{
            "idAppliance": 11, "nameAppliance": "salon", "applianceType": "HEATER",
            "availableModes": ["ECO", "CONFORT"], "dailyprogs": [{
                "dayNumber": 1, "ranges": [{"from": "22:00", "to": "23:30", "mode": "ECO",
                                            "temperature": None, "isOn": True}]}]}]}
        text = describe_program(program)
        self.assertIn("Mon 22:00-23:30 ECO", text)
        self.assertIn("appliance 11 salon", text)


if __name__ == "__main__":
    unittest.main()
