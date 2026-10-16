#!/usr/bin/env python3
"""
Utility script to verify required metadata in OpenAPI documents.

Checks:
  1. Every document provides `info.contact`.
  2. Every operation defines `operationId` and `description`.

Returns non-zero exit code when any issue is found to allow integration in CI.
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

API_ROOT = Path(__file__).resolve().parents[2] / "docs" / "api"


def main() -> int:
    missing_contact: list[str] = []
    missing_meta: dict[str, list[tuple[str, str, tuple[str, ...]]]] = {}

    for spec_path in sorted(API_ROOT.glob("*.yaml")):
        data = yaml.safe_load(spec_path.read_text(encoding="utf-8"))

        info = data.get("info") or {}
        if "contact" not in info:
            missing_contact.append(spec_path.name)

        paths = data.get("paths") or {}
        for route, operations in paths.items():
            if not isinstance(operations, dict):
                continue
            for method, operation in operations.items():
                if not isinstance(operation, dict) or method.startswith("x-"):
                    continue
                missing_fields = tuple(
                    field for field in ("operationId", "description") if field not in operation
                )
                if missing_fields:
                    missing_meta.setdefault(spec_path.name, []).append(
                        (method.upper(), route, missing_fields)
                    )

    if not missing_contact and not missing_meta:
        print("All API specs include contact metadata and required operation fields.")
        return 0

    if missing_contact:
        print("Missing `info.contact` in:")
        for name in missing_contact:
            print(f"  - {name}")
        print()

    if missing_meta:
        print("Operations missing metadata:")
        for name, items in missing_meta.items():
            print(f"  {name}")
            for method, route, fields in items:
                field_list = ", ".join(fields)
                print(f"    - {method} {route}: {field_list}")

    return 1


if __name__ == "__main__":
    sys.exit(main())
