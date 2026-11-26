#!/usr/bin/env python3
"""Static gate for the committed single-file page: self-contained, no host tokens,
no external assets, no account data from the reverse-engineering capture."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGE = ROOT / "index.html"
BAD = [
    "fonts.googleapis", "fonts.gstatic", "cdn.jsdelivr",
    "unpkg.com", "<script src=", "<link rel=\"stylesheet\"",
    "BEGIN OPENSSH PRIVATE KEY",
]

def main() -> int:
    text = PAGE.read_text()
    problems = [word for word in BAD if word.lower() in text.lower()]
    if 'id="root"' not in text:
        problems.append("missing #root mount")
    if "api.myvoltalis.com" not in text:
        problems.append("missing API base")
    if not re.search(r"<style[ >]", text):
        problems.append("missing inlined style")
    for name in ("manifest.webmanifest", "sw.js", "favicon.svg", "favicon.ico", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png"):
        if not (ROOT / name).exists():
            problems.append(f"missing {name}")
    if not (ROOT.parent / "LICENSE").exists():
        problems.append("missing LICENSE")
    i18n = ROOT / "app" / "i18n.ts"
    catalog = i18n.read_text() if i18n.exists() else ""
    keys = re.findall(r'^\s*"([^"]+)":', catalog, re.M)
    if len(keys) != len(set(keys)):
        problems.append("duplicate translation keys")
    used = set()
    for source in (ROOT / "app").rglob("*.ts*"):
        if source.name == "i18n.ts":
            continue
        used.update(re.findall(r'\bt\("((?:[^"\\]|\\.)*)"', source.read_text()))
    for key in sorted(used - set(keys)):
        problems.append(f"missing French translation: {key}")
    print(f"{PAGE.name} bytes {len(text.encode())} problems {problems}")
    return 1 if problems else 0

if __name__ == "__main__":
    raise SystemExit(main())
