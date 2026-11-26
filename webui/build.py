#!/usr/bin/env python3
"""Build the single-file app. Requires Node >=22 and npm; the committed index.html
is the built artifact, so end users never need Node."""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "dist" / "index.html"

def main() -> int:
    if not shutil.which("npm"):
        print("npm is required to rebuild (Node >= 22). The committed index.html still runs.", file=sys.stderr)
        return 2
    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True)
    if not OUT.exists():
        print("build finished without dist/index.html", file=sys.stderr)
        return 1
    target = ROOT / "index.html"
    shutil.copyfile(OUT, target)
    # PWA shell assets sit next to the page so a static host can install it.
    for name in ("manifest.webmanifest", "sw.js", "favicon.svg", "favicon.ico"):
        source = ROOT / "dist" / name
        if source.exists():
            shutil.copyfile(source, ROOT / name)
    icons = ROOT / "dist" / "icons"
    if icons.is_dir():
        shutil.copytree(icons, ROOT / "icons", dirs_exist_ok=True)
    print(f"wrote {target} ({target.stat().st_size} bytes)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
