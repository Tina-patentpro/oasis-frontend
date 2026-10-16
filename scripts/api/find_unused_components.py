#!/usr/bin/env python3
"""
Identify unused OpenAPI components to support Phase 3 cleanup.

Checks `components.schemas`, `components.responses`, and `components.parameters`
in each spec under docs/api and reports definitions that are never referenced via $ref.
"""
from __future__ import annotations

import subprocess
import sys
from collections import defaultdict
from pathlib import Path

try:
    import yaml  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - fallback install
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyyaml"])
    import yaml  # type: ignore

API_ROOT = Path(__file__).resolve().parents[2] / "docs" / "api"
REF_KEY = "$ref"
WATCH_SECTIONS = {"schemas", "responses", "parameters", "requestBodies"}


def collect_refs(node: object, refs: set[str]) -> None:
    if isinstance(node, dict):
        ref = node.get(REF_KEY)
        if isinstance(ref, str):
            refs.add(ref)
        for value in node.values():
            collect_refs(value, refs)
    elif isinstance(node, list):
        for item in node:
            collect_refs(item, refs)


def scan_file(path: Path) -> dict[str, list[str]]:
    raw = path.read_text(encoding="utf-8")
    data = yaml.safe_load(raw)
    if not isinstance(data, dict):
        return {}

    components = data.get("components") or {}
    refs: set[str] = set()
    collect_refs(data, refs)

    unused: dict[str, list[str]] = defaultdict(list)
    for section, definitions in components.items():
        if section not in WATCH_SECTIONS:
            continue
        if not isinstance(definitions, dict):
            continue
        for name in definitions:
            normalized = f"#/components/{section}/{name}"
            if normalized not in refs:
                unused[section].append(name)
    return unused


def main() -> int:
    findings: dict[str, dict[str, list[str]]] = {}
    for spec_path in sorted(API_ROOT.glob("*.yaml")):
        unused = scan_file(spec_path)
        if unused:
            findings[spec_path.name] = unused

    if not findings:
        print("All monitored components are referenced.")
        return 0

    for filename, sections in findings.items():
        print(filename)
        for section, names in sections.items():
            for name in sorted(names):
                print(f"  {section}: {name}")

    return 1


if __name__ == "__main__":
    sys.exit(main())
